# Workers Logpush -> R2 운영 설정

기준일: 2026-07-15 KST

대상 Worker: `nihongo-n3-api`

대상 버킷/prefix: `nihongo-n3-reports/logs/workers/`

이 문서는 Workers의 구조화 application log를 R2에 보존하고 release별 장애를 판정하는 유일한 설정 기준이다. 코드 준비, 원격 설정, 실제 object 수신은 서로 다른 완료 조건이다.

## 1. 현재 상태

| 항목 | 상태 | 완료 증거 |
| --- | --- | --- |
| PII 없는 구조화 request/auth/D1 log | 코드 구현·로컬 검증 | API 90 tests, route parameter/query/canary secret 비노출 회귀 |
| Worker `logpush = true` | **preview 원격 검증 완료** | `nihongo-n3-api-observability-preview`, production은 미변경 |
| R2 30일 lifecycle | **원격 적용·검증 완료** | 2026-07-15 `nihongo-n3-worker-logs-30d`, prefix `logs/workers/` |
| account-level Logpush job | **원격 적용·검증 완료** | preview job `1790981`, enabled, `error_message=null` |
| R2 Logpush object | **preview 원격 검증 완료** | `logs/workers/observability-preview/`, `.log.gz` 20개 확인 |
| 3종 threshold detector | **preview 원격 검증 완료** | Worker별 saved query 3개, ops 8 tests |
| 5분 Cloudflare Worker runner | **preview 원격 검증 완료** | `*/5 * * * *`, 2026-07-15 08:00 UTC 자동 실행 증거 |
| alert delivery | **preview 원격 검증 완료** | 25개 5xx, detector 발화, webhook 수신, R2 alert object 4개 |

TD-13의 코드와 원격 delivery chain은 preview에서 검증 완료했다. production Worker는 변경하지 않았으며, production 연결은 공통 릴리스 관문과 Environment 승인을 별도로 통과해야 한다.

## 2. 최소 권한

두 자격증명을 분리한다. 값은 `.env` 또는 CI/Cloudflare secret에만 두고 Git에 저장하지 않는다.

| 자격증명 | 권한 | 범위 |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | `Logs Write`, `Workers Observability Write`, 설정 조회 시 `Notifications Read` | 해당 account |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Object Write | `nihongo-n3-reports`만 |
| Worker `OBSERVABILITY_API_TOKEN` | Workers Observability query 최소 권한 | 해당 account의 telemetry query만 |

운영 조회자는 Cloudflare account의 읽기 전용 역할 또는 별도 bucket-scoped Object Read 키를 사용한다. Logpush 쓰기 키를 조사·다운로드 용도로 재사용하지 않는다.

필수 환경 변수 이름:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME=nihongo-n3-reports
WORKER_NAME=nihongo-n3-api
LOGPUSH_PREFIX=logs/workers
```

값 없는 저장소 템플릿은 루트 `.env.example`이다. 실제 값은 Git에서 제외된 `.env.local`, Worker secret 또는 승인된 CI Environment에만 둔다.

Wrangler 로그인 OAuth에는 Logs/Observability/Notifications API 권한이 포함되지 않을 수 있다. `wrangler whoami`가 성공해도 전용 토큰이 없으면 설정 API는 HTTP 403을 반환한다.

## 3. Logpush job

먼저 비밀값이 마스킹된 payload를 확인한다.

```bash
pnpm ops:logpush -- --dry-run
```

적용과 검증:

```bash
pnpm ops:logpush -- --apply
pnpm ops:logpush -- --verify-only
```

스크립트는 `workers_trace_events`의 실제 필드 목록을 API로 확인한 뒤 job을 생성하거나 같은 이름의 job을 갱신한다. R2 destination은 현재 규격인 다음 형식을 사용한다.

```text
r2://nihongo-n3-reports/logs/workers/{DATE}?account-id=...&access-key-id=...&secret-access-key=...
```

### 보존 필드

```text
EventTimestampMs, EventType, Outcome, Logs,
ScriptName, ScriptVersion, CPUTimeMs, WallTimeMs
```

다음 필드는 저장하지 않는다.

| 제외 필드 | 이유 |
| --- | --- |
| `Event` | 실제 request URL, header 등 source event가 포함될 수 있음 |
| `Exceptions` | raw message/stack에 입력값이나 외부 응답이 섞일 수 있음 |
| IP/header/user-agent 필드 | 직접 또는 간접 식별 위험 |

application `console.*`도 객체형 allowlist 필드만 기록한다. 이메일, 사용자 ID, 실제 URL/query, raw error message/stack을 로그에 추가하지 않는다.

## 4. 보존 기간과 접근 제어

raw Worker log는 30일 보존 후 삭제한다. lifecycle은 버킷 전체가 아니라 `logs/workers/` prefix에만 적용한다. 같은 버킷의 `reports/`와 `backups/`에는 영향을 주지 않는다.

```bash
pnpm exec wrangler r2 bucket lifecycle add \
  nihongo-n3-reports \
  nihongo-n3-worker-logs-30d \
  logs/workers/ \
  --expire-days 30 \
  --force

pnpm exec wrangler r2 bucket lifecycle list nihongo-n3-reports
```

- public R2 domain과 `r2.dev`는 활성화하지 않는다.
- Logpush 키는 Object Write만 허용한다.
- 운영자 조회는 최소권한 Object Read 역할로 제한한다.
- `.artifacts/observability`에는 원시 event를 저장하지 않고 집계와 마스킹된 설정만 저장한다.

## 5. 알림 판정

Cloudflare Notifications의 공개 alert type은 Workers structured log에 대한 임의 임계값 정책을 제공하지 않는다. 특히 `workers.dev` endpoint에 zone HTTP Traffic alert를 대신 연결하면 다른 지표를 감시하게 되므로 사용하지 않는다.

Cloudflare Workers Observability에 세 saved query를 만들고 동일 판정 코어를 사용하는 runner가 webhook으로 전달한다.

```bash
pnpm ops:alerts -- --dry-run
pnpm ops:alerts -- --apply
pnpm ops:alerts -- --verify-only
```

승인된 Worker 배포 전에 다음 이름을 송신 Worker secret으로 설정한다. 환경을 생략하면 production에 쓰므로 preview에서는 반드시 `--env observability-preview`를 붙인다. 값은 명령 출력, 문서, artifact에 남기지 않는다.

```bash
pnpm exec wrangler secret put CLOUDFLARE_ACCOUNT_ID
pnpm exec wrangler secret put OBSERVABILITY_API_TOKEN
pnpm exec wrangler secret put OBSERVABILITY_ALERT_WEBHOOK_URL
pnpm exec wrangler secret put OBSERVABILITY_ALERT_WEBHOOK_TOKEN  # webhook이 bearer 인증을 요구할 때만
```

직접 운영 HTTPS endpoint는 별도 수신 Worker가 제공한다.

```text
https://nihongo-n3-observability-receiver-preview.kordokrip.workers.dev/__ops/alerts/cloudflare
```

- 외부 전달은 위 HTTPS endpoint와 bearer token을 사용한다.
- Cloudflare 내부 전달은 송신 Worker의 `OBSERVABILITY_ALERT_RECEIVER` service binding을 우선 사용한다. 공개 네트워크 재진입과 같은 Worker 자기 호출을 피하기 위한 경로다.
- 수신 Worker의 `OBSERVABILITY_ALERT_WEBHOOK_TOKEN`도 별도 runtime secret이다.
- 수신 payload는 64 KiB 이하 집계 JSON만 허용하며 PII 형태의 key/value를 거부한다.
- 수신 증거는 `alerts/observability/YYYY/MM/DD/<sha256>.json`에 불변 object로 저장하고 `latest.json`은 최신 포인터로만 사용한다.
- `/__ops/evidence/r2`는 preview canary 인증이 있을 때 object metadata만 반환한다. 원문 secret이나 Logpush payload는 반환하지 않는다.

| 경보 | 판정 |
| --- | --- |
| 5xx | 최근 5분 `http_request` 중 status >= 500 비율이 1% 초과 |
| auth failure trend | 최근 5분 5건 이상이며 직전 55분의 5분 환산 평균 대비 3배 이상 |
| D1 error | 최근 5분 `d1_error` 1건 이상 |

전달 대상은 secret `OBSERVABILITY_ALERT_WEBHOOK_URL`로 관리한다. 보고서에는 URL 전체가 아니라 host와 설정 여부만 기록한다. webhook 인증이 필요하면 `OBSERVABILITY_ALERT_WEBHOOK_TOKEN`을 별도 secret으로 둔다.

saved query는 탐지 정의이며 스스로 주기 실행되지는 않는다. API Worker의 `*/5 * * * *` Cron이 `packages/shared/src/observability-core.mjs`의 동일 판정 코어로 telemetry를 조회하고 alert가 발화하면 webhook을 호출한다. `setup-alerts.mjs --verify-only`는 세 saved query뿐 아니라 배포된 cron, 필수 Worker secret **이름**, 내부 receiver service binding을 확인한다.

Workers Observability telemetry query는 현재 `view: "events"`를 최상위 request 필드에 요구하며 응답 event 배열은 `result.events.events`에 있다. sender와 운영 스크립트는 이 envelope를 공통 정규화한다. 잘못된 위치의 `view` 또는 `result.events`를 배열로 간주하면 실제 5xx가 있어도 0건으로 오판하므로 회귀 테스트로 고정한다.

2026-07-15 preview에서 Cron, runtime secret 이름, service binding, saved query 세 개를 원격 재조회했다. production 배포본에는 아직 이 cron과 관측 secret이 없으며 release gate를 통과하기 전에는 적용하지 않는다.

## 6. 배포 후 30분/24시간 확인

```bash
pnpm ops:observe -- \
  --base-url=https://nihongo-n3-api.kordokrip.workers.dev \
  --window=30m \
  --release-sha=<DEPLOYED_SHA> \
  --fail-on-alert

pnpm ops:observe -- \
  --base-url=https://nihongo-n3-api.kordokrip.workers.dev \
  --window=24h \
  --release-sha=<DEPLOYED_SHA> \
  --fail-on-alert
```

도구는 `/health`, OpenAPI, auth config, vocab/grammar/kanji/sentences 공개 route를 확인하고 Workers Observability API에서 구조화 event만 추출한다. 산출물은 `.artifacts/observability/*.json`이며 release SHA와 route template별 request count, 5xx, p50/p95 latency만 포함한다.

### preview 5xx 발화 검증

`/__ops/canary/5xx`는 `ENVIRONMENT=preview`이고 preview Worker에만 둔 `OBSERVABILITY_CANARY_TOKEN`이 일치할 때만 500을 반환한다. production과 무인증 요청은 404다. secret은 query string이 아니라 `X-Observability-Canary` header로 전달하며 로그에 저장하지 않는다.

```bash
pnpm ops:observe -- \
  --base-url=https://<preview-worker> \
  --window=30m \
  --release-sha=<PREVIEW_SHA> \
  --trigger-canary \
  --canary-count=25 \
  --canary-wait-seconds=45
```

기본 25건은 telemetry 조회 상한 2,000건 안에서 1% 임계값을 안정적으로 넘기기 위한 preview 전용 표본이다. 이 명령은 canary HTTP 500, 최근 5분 5xx detector 발화, webhook 전달 세 조건이 모두 확인돼야 성공한다. production URL을 대상으로 실행하지 않는다.

## 7. 원격 완료 증거

1. `pnpm ops:logpush -- --verify-only`가 enabled job과 빈 `error_message`를 기록한다.
2. R2 console 또는 bucket-scoped read key로 `logs/workers/<DATE>/...` object의 key/size/LastModified를 확인한다.
3. object를 한 건 내려받아 `Event`, header, 실제 URL/query가 없고 구조화 `Logs`만 있는지 확인한다.
4. preview 전용 canary 5xx를 위 명령으로 한 번 발생시키고 5분 이내 detector와 webhook 수신을 확인한다.
5. canary report, 수신 시각, release SHA를 SESSION_CHANGELOG에 기록한다.

원시 object 또는 secret은 문서와 Git commit에 첨부하지 않는다.

### 2026-07-15 preview 증거

| 증거 | 결과 |
| --- | --- |
| sender Worker | `nihongo-n3-api-observability-preview`, version `247ff8f7-bdbc-4a29-959e-7055eaaeeb52` |
| receiver Worker | `nihongo-n3-observability-receiver-preview`, version `65110623-59d3-456d-8699-29928a25f48d` |
| smoke | `/health` 등 7/7 PASS, release `4a54d718c58f42aeef2c573d6e3889bc86fad456` |
| canary | 25/25 HTTP 500, 5xx detector `fired=true` |
| direct delivery | `alerts_delivered=true`, receiver 202 |
| automatic Cron delivery | source `worker-cron`, generated `2026-07-15T08:00:33.615Z`, received `08:00:34.272Z` |
| R2 Logpush | `logs/workers/observability-preview/` 아래 `.log.gz` 20개 확인 |
| R2 alert evidence | `alerts/observability/2026/07/15/` 아래 불변 JSON 4개 확인 |

집계·metadata 증거는 `.artifacts/observability/preview-canary-service-binding.json`, `cron-alert-evidence.json`, `preview-r2-logpush-evidence-final.json`, `preview-r2-alert-evidence-final.json`에 로컬 보존한다. 이 경로는 Git에서 제외되고 파일 권한은 `0600`이다.

## 8. 근거

- Cloudflare Workers Logpush: <https://developers.cloudflare.com/workers/observability/logs/logpush/>
- R2 destination: <https://developers.cloudflare.com/logs/logpush/logpush-job/enable-destinations/r2/>
- Workers Trace Events fields: <https://developers.cloudflare.com/logs/logpush/logpush-job/datasets/account/workers_trace_events/>
- Workers structured logs: <https://developers.cloudflare.com/workers/observability/logs/workers-logs/>
- R2 lifecycle: <https://developers.cloudflare.com/r2/buckets/object-lifecycles/>
- Workers Observability query API: <https://developers.cloudflare.com/api/resources/workers/subresources/observability/subresources/telemetry/methods/query/>
