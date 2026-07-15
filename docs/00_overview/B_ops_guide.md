# 운영 가이드

기준일: 2026-07-16 KST
범위: 콘텐츠 검증, D1 변경, 테스트, 오디오, 배포

## 1. 운영 source of truth

| 목적 | 경로 |
| --- | --- |
| D1 schema | `packages/db/src/schema.ts` |
| canonical migrations | `packages/db/drizzle-v2/*.sql` |
| 콘텐츠 경로 | `packages/db/src/seed/constants.ts` |
| seed manifest | `packages/db/src/seed/content-manifest.ts` |
| DB verification | `packages/db/src/seed/verify.ts` |
| OpenAPI types | `apps/web/src/types/api.d.ts`, `admin-api.d.ts` |
| audio policy | `packages/shared/src/audio-policy.ts` |
| release gates | `.github/workflows/verify.yml`, `e2e.yml` |

## 2. 현재 운영 콘텐츠

운영 seed는 `docs/01_n5`, `docs/02_n4`, `docs/03_n3`, `docs/04_supplement`의 실제 존재 파일 13개만 사용한다. 과거의 루트 파일명이나 16주 업로드 표는 사용하지 않는다.

| Code | 현재 파일 | parser 결과 |
| --- | --- | ---: |
| 04 | `docs/01_n5/04_vocab.md` | vocab 700 |
| 05 | `docs/01_n5/05_grammar.md` | grammar 55 |
| 03 | `docs/01_n5/03_kanji.md` | kanji 103 |
| 07 | `docs/02_n4/07_vocab.md` | vocab 548 |
| 08 | `docs/02_n4/08_grammar.md` | grammar 98 |
| 06 | `docs/02_n4/06_kanji.md` | kanji 164 |
| 10A | `docs/03_n3/10A_vocab_part1.md` | vocab 1,092 |
| 10B | `docs/03_n3/10B_vocab_part2.md` | vocab 960 |
| 11 | `docs/03_n3/11_grammar.md` | grammar 163 |
| 09 | `docs/03_n3/09_kanji.md` | kanji 275 |
| 12 | `docs/04_supplement/12_example_sentences.md` | sentences 1,100 |
| A | `docs/04_supplement/A_sysprog_vocab_500.md` | sysprog 82 |
| C | `docs/04_supplement/C_self_check_16weeks.md` | curriculum 52 |

파일명 `C_self_check_16weeks.md`는 legacy지만 현재 parser는 52주 기본 계획을 생성한다.

## 3. 콘텐츠 변경 절차

```bash
pnpm -F @nihongo-n3/db seed:diff
pnpm -F @nihongo-n3/db verify:fresh
pnpm typecheck
pnpm test
```

`seed:diff`는 parser 검증만 하고 D1을 변경하지 않는다. production 변경은 `Content and D1 Change Control`의 수동 `migrate` 또는 `seed` operation만 사용한다.

N2/N1 파일이 없거나 provenance가 불완전하면 `CONTENT_PATHS`에 등록하지 않는다.

## 4. D1 변경

일반 table migration은 Drizzle schema에서 생성하고 reviewed SQL을 `drizzle-v2`의 다음 번호로 추가한다. FTS virtual table/trigger만 수동 SQL migration으로 관리한다. 기존 번호를 수정하지 않는다.

로컬:

```bash
pnpm -F @nihongo-n3/db verify:fresh
```

Remote production은 GitHub Environment 승인 후에만 실행한다. prod-v2 전환은 [Blue/Green runbook](./R1_BLUE_GREEN_RUNBOOK_2026-07-15.md)을 따른다.

## 5. 인증 운영

기본 운영 모드는 `app-session`이다.

- password와 Google OAuth가 같은 D1 user/session 모델을 사용한다.
- Google 승인 redirect URI는 `https://nihongo-n3-api.kordokrip.workers.dev/api/v1/auth/google/callback`이다.
- Pages/Worker cross-origin callback은 `/api/v1/auth/complete` bridge token을 사용한다.
- `cf-access`로 바꿀 때는 `CF_ACCESS_AUD`, `CF_TEAM_DOMAIN` secret과 실제 JWT test가 필요하다.
- admin OpenAPI와 회원 관리 route는 admin app session으로 보호한다.

Secret은 `.env`, `.dev.vars`, GitHub/Cloudflare secret에만 두고 commit하지 않는다.

```bash
wrangler secret put AUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put CF_ACCESS_AUD
wrangler secret put CF_TEAM_DOMAIN
```

## 6. 오디오 운영

공개 audio API는 R2 read-only다. 런타임 요청으로 유료 TTS를 호출하지 않는다.

### 6.1 Secret 범위 확인

Google batch secret은 Pages, preview Worker, 로컬 Vite 환경에 두지 않는다. `nihongo-n3-api`의 승인된 production version에만 둔다. `wrangler secret put`은 즉시 새 Worker version을 만들 수 있으므로 개인 터미널에서 production 기본 대상을 추정해 실행하지 않는다.

값을 출력하지 않고 현재 배포된 secret 이름만 확인한다.

```bash
cd apps/api
pnpm exec wrangler secret list --name nihongo-n3-api --format json
pnpm exec wrangler secret list --name nihongo-n3-api-observability-preview --format json
pnpm exec wrangler secret list --name nihongo-n3-observability-receiver-preview --format json
```

확인 기준:

- 승인 전: 세 Worker 모두 `GOOGLE_TTS_API_KEY`, `AUDIO_BATCH_APPROVAL_TOKEN`이 없어야 한다.
- 승인 후: 두 이름은 `nihongo-n3-api` production version에만 있어야 한다.
- secret 값, 길이, prefix를 명령 출력·artifact·문서에 남기지 않는다.
- GitHub `production` Environment 수동 승인 뒤 runner에서만 값을 전달한다.
- staging이 필요하면 `wrangler versions secret put <NAME> --name nihongo-n3-api`로 version을 만든 뒤, 그 version 배포를 별도 승인한다.

승인 runner에서 설정하는 이름은 다음 두 개다. 실제 값은 GitHub Environment secret에서 stdin으로 전달하고 shell에 `echo`하지 않는다.

```bash
pnpm exec wrangler versions secret put GOOGLE_TTS_API_KEY --name nihongo-n3-api
pnpm exec wrangler versions secret put AUDIO_BATCH_APPROVAL_TOKEN --name nihongo-n3-api
```

2026-07-15 읽기 전용 재조회 결과 production·preview에 두 이름은 모두 없었다. 따라서 Google QA warmup과 전체 batch는 아직 승인되지 않았다.

### 6.2 QA와 batch 순서

1. R1 prod-v2 migration 7/7과 `audio_generation_log.provider`, `content_hash` 컬럼을 먼저 확인한다.
2. `/audio-qa`의 `audio-qa-30-v1` 30문장을 browser, Cloudflare, Google, VOICEVOX 네 후보에서 모두 재생한다.
3. 평가자, device/OS/browser, 실제 voice/model/version, 평가일과 5개 점수를 모두 입력한다.
4. Markdown 내보내기 결과를 review하고 승인 provider와 근거를 기록한다. 한 후보라도 30개가 없으면 승인하지 않는다.
5. `/admin/audio/queue`를 `execute:false`로 조회하고 N5, N4, N3 순서와 pending 수량을 확인한다.
6. 사람의 비용·청감 승인 뒤에만 `execute:true`를 level 하나씩 실행한다. 한 요청은 최대 200건, 일일 총 500건이므로 같은 level의 pending이 0이 될 때까지 승인된 창에서 반복한다.
7. object를 덮어쓰지 않는다. 콘텐츠·provider·model·version이 바뀌면 새 hash key를 만든다.

현재 production D1은 구 스키마라 `audio_generation_log`에 `provider`, `content_hash`가 없다. prod-v2 전환 전에 batch를 실행하면 실패하므로 임시 `ALTER TABLE`로 우회하지 않는다.

전체 생성 뒤 D1 불변 key와 R2 HEAD metadata를 함께 검증한다. `AUDIO_R2_ACCESS_KEY_ID`, `AUDIO_R2_SECRET_ACCESS_KEY`는 `nihongo-n3-audio` Object Read 권한으로만 발급한다. Logpush의 reports 버킷 자격증명과 재사용하지 않는다.

```bash
pnpm -F @nihongo-n3/db verify:remote:audio
```

게이트는 N5~N3의 `vocab`, `kanji`, `sentences` 전부에 대해 Google profile, 16자리 content hash key, R2 존재, provider/model/audio version/content hash/item metadata, `Cache-Control: immutable`을 요구한다. 누락 허용값은 0이다.

자세한 정책은 [오디오 정책](./audio-tts-provider-policy-2026-07-07.md)을 참조한다.

## 7. 배포 전 로컬 관문

도구 기준은 `.node-version`과 루트 `packageManager`가 소유한다.

- Node.js `22.17.0` 이상 (`engines` 최소 `22.13.0`)
- pnpm `11.4.0` 이상
- pnpm 11 build script allowlist는 `pnpm-workspace.yaml`의 `allowBuilds`만 사용한다.

```bash
pnpm audit --audit-level high
pnpm openapi:generate
pnpm typecheck
pnpm test
pnpm build
pnpm -F @nihongo-n3/db verify:fresh
pnpm -F @nihongo-n3/e2e test:chromium
pnpm -F @nihongo-n3/e2e test:webkit
```

생성된 OpenAPI type을 commit한 뒤 `pnpm openapi:check`가 clean tree에서 통과해야 한다.

pnpm 9/10은 종료된 npm legacy audit endpoint 때문에 HTTP 410으로 실패한다. 이를 무시하지 않고 bulk advisory endpoint를 사용하는 pnpm 11.4.0으로 고정한다. `--ignore-registry-errors`나 audit 생략은 허용하지 않는다. 전환 근거는 [pnpm issue #11265](https://github.com/pnpm/pnpm/issues/11265)와 [pnpm 11 변경 사항](https://github.com/orgs/pnpm/discussions/11377)이다.

## 8. CI와 배포

필수 workflow:

- Dependency Audit
- CodeQL Security Analysis
- Required Verification
- E2E Tests (Chromium/WebKit)
- Backup D1 Database -> R2

GitHub billing annotation으로 job이 시작되지 않은 실패는 코드 실패와 구분하되, 성공으로 간주하지 않는다. billing을 해결한 뒤 같은 SHA에서 다시 실행한다.

Workers/Pages production deploy는 workflow_dispatch와 `production` Environment approval로만 실행한다. push나 PR은 검증 또는 preview까지만 수행한다.

## 9. 배포 후 관측

### 9.1 알림 대상과 기준

| 경보 | 기준 | 1차 대상 | 보조 확인 |
| --- | --- | --- | --- |
| 5xx | 1% 초과/5분 | `OBSERVABILITY_ALERT_WEBHOOK_URL` 운영 채널 | Workers Observability 5xx saved query |
| auth failure trend | 5건 이상 + 직전 55분 5분 환산 평균의 3배 이상 | 동일 운영 채널 | auth failure saved query와 로그인 이벤트 |
| D1 error | 1건 이상/5분 | 동일 운영 채널 | D1 Metrics와 `d1_error` saved query |

webhook URL·token과 실제 수신자 주소는 secret으로 관리하며 저장소에 적지 않는다. Cloudflare account Super Administrator는 2차 에스컬레이션 대상이다. 계정 역할 변경 시 primary recipient와 backup administrator가 모두 유효한지 분기별로 확인한다.

Cloudflare Notifications는 Workers structured log 임의 임계값을 직접 제공하지 않는다. `workers.dev`에 zone HTTP Traffic alert를 연결해 완료로 간주하지 않는다. 설정 근거와 제한은 [Logpush/R2 운영 설정](./logpush-r2-setup.md)을 따른다.

세 경보는 Workers Observability saved query와 API Worker의 `*/5 * * * *` Cron이 같은 공통 코어로 판정하고 secret webhook으로 전달한다. saved query만 만든 상태는 알림 구성이 완료된 것이 아니다. `pnpm ops:alerts -- --verify-only`로 cron과 필수 secret 이름을 확인하고 webhook 수신, preview canary까지 검증해야 운영 완료다.

직접 운영 수신 채널은 별도 HTTPS Worker endpoint로 둔다. 외부 시스템은 bearer 인증된 HTTPS endpoint를 사용하고, API Worker는 동일 수신 Worker에 대한 `OBSERVABILITY_ALERT_RECEIVER` service binding을 우선 사용한다. 수신 Worker는 집계 JSON만 `nihongo-n3-reports/alerts/observability/`에 저장하며 이메일, 사용자 ID, 실제 request path/query를 허용하지 않는다. 무인증 alert/evidence 요청은 내용을 노출하지 않는다.

### 9.2 on-call 확인 절차

1. 수신자는 5분 이내 alert의 service, release SHA, window, 판정 수치를 확인한다.
2. `.artifacts/observability`의 같은 시간대 report와 Workers Observability saved query를 대조한다.
3. 5xx는 가장 높은 오류 route template과 직전 release를 비교한다. 실제 path/query를 공유 채널에 붙이지 않는다.
4. auth 급증은 Google/password 구분과 rate-limit 상태를 확인하되 이메일·사용자 ID를 추출하지 않는다.
5. D1 오류는 D1 Metrics, migration ledger, binding 대상 DB를 확인하고 쓰기 route를 필요하면 read-only로 전환한다.
6. 사용자 영향이 지속되면 production Environment 승인권자에게 rollback 또는 read-only 결정을 에스컬레이션한다.
7. 해소 시각, 원인, 조치, release SHA를 SESSION_CHANGELOG와 status report에 남긴다.

분기 1회 또는 알림 경로 변경 직후 preview에서 다음 canary를 실행한다. production에서는 canary secret을 설정하지 않는다.

```bash
pnpm ops:observe -- \
  --base-url=https://<preview-worker> \
  --window=30m \
  --release-sha=<PREVIEW_SHA> \
  --trigger-canary \
  --canary-count=25 \
  --canary-wait-seconds=45
```

HTTP 500 생성, 5xx detector 발화, 운영 채널 webhook 수신 시각을 함께 기록한다. 세 항목 중 하나라도 없으면 alert delivery 장애로 처리한다.

2026-07-15 preview 검증에서는 sender/receiver 분리, runtime secret 이름, service binding, `*/5` Cron을 원격 확인했다. 25/25 canary 500, 5xx detector 발화, direct webhook 202, 자동 Cron webhook 수신, R2 Logpush/alert object 생성까지 통과했다. production Worker는 변경하지 않았으며 production 적용 시 같은 절차를 다시 수행한다.

### 9.3 최초 30분

배포 직후와 30분 시점에 다음을 실행한다.

```bash
pnpm ops:observe -- \
  --base-url=https://nihongo-n3-api.kordokrip.workers.dev \
  --window=30m \
  --release-sha=<DEPLOYED_SHA> \
  --fail-on-alert
```

자동 확인 범위:

- `/health`, `/openapi.json`, auth config
- vocab/grammar/kanji/sentences 공개 route
- release SHA별 5xx 비율과 p50/p95 latency
- auth failure trend, D1 error

수동 확인 범위:

- web shell
- password login/logout/session refresh
- Google OAuth start/callback/complete
- quiz, SRS review, sync queue
- admin protection

### 9.4 24시간

```bash
pnpm ops:observe -- \
  --base-url=https://nihongo-n3-api.kordokrip.workers.dev \
  --window=24h \
  --release-sha=<DEPLOYED_SHA> \
  --fail-on-alert
```

24시간 report에서 release SHA별 5xx·latency, auth failure, D1 error를 직전 안정 release와 비교한다. 결과와 Logpush object 증거는 원시 PII 없이 status report와 SESSION_CHANGELOG에 반영한다.

## 10. 회원 데이터 정리

Production 회원 삭제는 [회원 데이터 정리 계획](./USER_DATA_CLEANUP_PLAN_2026-07-16.md)을 따른다. 관리자 UI나 ad-hoc SQL에서 `DELETE FROM users`를 직접 실행하지 않는다.

필수 순서:

1. 24시간 이내 production backup과 local restore drill 성공
2. 이메일을 마스킹한 remote inventory 생성
3. 실제 회원 user ID 정확히 2개를 allowlist로 사람 확인
4. 비인식 도메인 삭제 후보 0 확인
5. `d1:users:cleanup` remote dry-run report와 plan hash 보존
6. GitHub `production` Environment 승인
7. 동적 확인문과 `--execute`로 정확한 후보 ID만 삭제
8. 보존 회원 2명, 잔여 test reference 0, FK 0 검증

`login_events`는 `users` 삭제 시 `SET NULL`이므로 별도 정책이 필요하다. 후보 user ID에 연결된 이벤트와 user ID가 없는 승인 test-domain 이벤트만 삭제한다. 보존 회원과 연결된 이벤트, user ID가 없는 Google OAuth 시작과 미분류 보안 이벤트는 보존한다.

실행용 token은 D1 Edit 최소권한으로 승인 runner에만 둔다. 로컬 token으로는 remote dry-run까지만 수행하며 token 값, 원문 이메일, IP, user agent를 artifact나 CI log에 남기지 않는다.
