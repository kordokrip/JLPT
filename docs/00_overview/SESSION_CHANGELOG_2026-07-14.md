# 기술부채 리팩토링 세션 변경 기록

분석 시작: 2026-07-14 KST
구현·재검증: 2026-07-15 KST
브랜치: `refactor/tech-debt-r1`
배포: 실행하지 않음

## 1. 작업 격리

검수되지 않은 N2/N1 변경은 `wip/n2-n1-content-2026-07-14`에 commit `1ae2401`로 보존했다. R1은 이전 정상 HEAD에서 별도 branch로 시작했다. 누락된 N2/N1 원본을 생성됐다고 가정하지 않았고 `AUTO`/`EN` 자료를 운영 seed에 넣지 않았다.

## 2. R1 변경

### D1

- `packages/db/drizzle-v2/0000`~`0006` 추가
- Drizzle 일반 table과 FTS SQL migration 소유권 분리
- runtime OAuth DDL 제거
- source manifest row/checksum 검증 추가
- category 선행 seed, parser 의미 헤더/빈 뜻 검증 추가
- validation-only `seed-diff`로 변경
- Blue/Green, backup, restore drill, migration guard 도구 추가
- read-only cutover middleware 추가

### API 계약·인증

- auth/track route OpenAPI 명세 추가
- public/admin OpenAPI 분리와 generated types 추가
- runtime route coverage 테스트 추가
- Google OAuth state에 learning track 저장
- cross-origin bridge token callback 통합 테스트 추가
- admin OpenAPI 보호 테스트 추가
- app-session / cf-access guardrail 테스트 유지

### CI·관측성

- `Required Verification` workflow 추가
- content push의 자동 production migration/seed 제거
- production 변경은 workflow_dispatch + Environment approval로 제한
- E2E D1을 독립 persist directory에서 migrate/seed/verify
- PII 없는 JSON request/release log 추가

## 3. R2 변경

- 공개 audio route를 R2 read-only로 전환
- R2 -> Japanese browser fallback 정책 통합
- Google 전체 batch approval gate 추가
- content/provider/model/version hash immutable key 추가
- 30문장 QA에 Google 후보 및 평가 저장 추가
- kana v2 script를 `문자。대표 단어` 한 번 재생으로 변경
- 동음이의어 public 노출 보류
- 코드·콘텐츠·오디오·시각 자산 attribution 분리
- 52주 기본 과정과 16주 추천 조건 구현

실제 Google batch와 R2 업로드는 실행하지 않았다. fresh DB 기준 `audio_r2_key` 4,954건이 비어 있다.

## 4. R3 foundation 변경

- `LearningTrackId = 'jlpt-ja' | 'topik-ko'`
- users/oauth_states track migration
- track status API
- 첫 접속 학습 언어 선택
- TOPIK foundation-only route
- user×track IndexedDB, localStorage, React Query namespace
- track switch API와 session restore
- Chromium account×track isolation E2E

TOPIK 문제은행·채점·추천은 구현하지 않았다.

## 5. 검증 기록

| 명령/검사 | 결과 |
| --- | --- |
| package typecheck 5종 | PASS |
| API test | 78 PASS |
| Web test | 33 PASS |
| API Wrangler dry-run | PASS |
| Web PWA build | PASS |
| dependency audit high | 0 known vulnerabilities |
| fresh D1 migrate | 7/7 PASS |
| manifest/checksum/row | 13 sources PASS |
| FTS parity | vocab 3,300 / sentences 1,112 PASS |
| FK/required/duplicate | 0 PASS |
| Playwright Chromium | 65 PASS |
| Playwright WebKit | 51 PASS, Chromium 전용 시각 회귀 14 SKIP |
| `pnpm verify:ci` | PASS |
| R2 audio strict gate | EXPECTED FAIL, 4,954 missing만 blocking |
| GitHub required Actions | BLOCKED pending billing resolution |

## 6. 구현 중 발견해 추가 수정한 회귀

1. session user query가 `learning_track`을 반환하지 않아 새로고침 시 JLPT로 되돌아갈 수 있던 문제
2. CI E2E에서 Google test credentials가 없어 OAuth start가 503이 되던 문제
3. E2E가 기존 `.wrangler` DB에 의존해 migration ledger 충돌이 나던 문제
4. 위험한 partial diff seed가 source column이 없는 table을 삭제하려던 문제
5. Wrangler 일반 vars에 secret 성격의 빈 키가 남아 있던 문제
6. OpenAPI production server URL과 16주 summary가 현재 기준과 다르던 문제
7. 청해 API가 `audio_r2_key`가 없어도 존재하지 않는 legacy R2 경로를 만들어 페이지 로드 404를 발생시키던 문제
8. E2E가 현재 12개월/52주 과정과 R2-first 정책 대신 과거 16주/browser-first 문구를 요구하던 문제
9. 관측 로그가 route template이 아닌 실제 path를 기록해 path parameter를 노출할 수 있던 문제

## 7. 원격 CI 확인

2026-07-15 KST에 `gh`로 최근 원격 실행을 읽기 전용 확인했다. Backup run `29348512843`과 CodeQL run `29226573527`은 runner step이 하나도 시작되지 않았고 `The job was not started because your account is locked due to a billing issue.` annotation으로 실패했다. Dependency Audit workflow는 `disabled_manually` 상태였다.

## 8. 배포 결정

production 배포를 수행하지 않았다. 로컬 Chromium/WebKit matrix는 통과했지만 GitHub billing lock, 원격 required Actions, prod-v2, R2 audio gate가 충족되지 않았기 때문이다. 다음 세션은 [Blue/Green runbook](./R1_BLUE_GREEN_RUNBOOK_2026-07-15.md)의 승인 조건에서 재개한다.

## 9. 후속 계획 문서 갱신 (2026-07-15, R1 분석 후속)

R1 구현 내역을 runbook·ROADMAP·ops guide·코드(ops 스크립트, content-manifest, tracks API)와 교차검증한 뒤 계획 문서를 재작성했다.

- [CODEX_NEXT_PROMPTS_2026-07-15.md](./CODEX_NEXT_PROMPTS_2026-07-15.md) 신규 — 구 W1~W6 완료 판정 표와 N0~N9 시계열 프롬프트. 상환 우선순위(TD-10→01→14→13→08→07→12)와 릴리스 순서(R1→R2→R3)에 정렬. `--execute`·Environment 승인은 사람 게이트로 명시.
- [N2_N1_REINTEGRATION_PLAN_2026-07-15.md](./N2_N1_REINTEGRATION_PLAN_2026-07-15.md) 신규 — wip 브랜치 격리 콘텐츠의 재통합 전제 조건(rebase·provenance·검수 태그 0)과 R1 이후 무효가 된 구 가이드 커맨드 대비표.
- 구 `CODEX_REFACTORING_PROMPTS_2026-07-14.md`, `N2_N1_CONTENT_UPDATE_GUIDE.md`는 wip 브랜치 보존본을 역사 문서로 취급하고 현행 브랜치에 복원하지 않는다.

## 10. GitHub 필수 workflow 재검증 (2026-07-15 KST)

`refactor/tech-debt-r1`의 HEAD와 원격 branch가 모두 `5c25e9f959228b48e007a2a4d8c24d809bbf661c`임을 확인했다. `Dependency Audit`은 실행 전에 `disabled_manually`였으며 `gh workflow enable` 후 `active`로 전환했다.

| Workflow | Run | 결론 | SHA | 분류 |
| --- | --- | --- | --- | --- |
| Dependency Audit | [29383425422](https://github.com/kordokrip/JLPT/actions/runs/29383425422) | failure, canary 재실행도 동일 | `5c25e9f9592` | runner step 미시작, billing annotation |
| CodeQL Security Analysis | [29383426508](https://github.com/kordokrip/JLPT/actions/runs/29383426508) | failure | `5c25e9f9592` | runner step 미시작, billing annotation |
| E2E Tests (Chromium/WebKit) | [29383428226](https://github.com/kordokrip/JLPT/actions/runs/29383428226) | failure | `5c25e9f9592` | 두 matrix job 모두 미시작, billing annotation |
| Backup D1 Database -> R2 | [29383429640](https://github.com/kordokrip/JLPT/actions/runs/29383429640) | failure | `5c25e9f9592` | export job 미시작, billing annotation; R2 변경 없음 |
| Required Verification | run 미생성 | dispatch 거부 | `5c25e9f9592` | `verify.yml`이 기본 branch에 없어 GitHub API가 HTTP 404 반환 |

네 개의 생성된 run은 모두 `The job was not started because your account is locked due to a billing issue.` annotation으로 종료됐다. 이는 기존 run `29348512843`, `29226573527`과 같은 외부 계정 차단 유형이며 checkout이나 프로젝트 명령이 실행되지 않았으므로 코드 실패로 분류할 수 없다. 잠금 해제 전파 가능성을 확인하려고 60초 후 Audit run을 한 번 재실행했으나 같은 annotation이 재현됐다.

Required Verification은 workflow를 수정해서 우회하지 않았다. GitHub의 수동 dispatch는 workflow가 기본 branch에 등록돼 있어야 하므로, 현재 branch에만 존재하는 `verify.yml`은 `gh workflow run verify.yml --ref refactor/tech-debt-r1`로 실행할 수 없었다. TD-10은 `외부 차단`, TD-14는 `구현 완료`를 유지하며 production 배포와 D1/R2 변경은 수행하지 않았다.

## 11. prod-v2 Blue/Green 사전 점검과 자동화 보강 (2026-07-15 KST)

`R1_BLUE_GREEN_RUNBOOK_2026-07-15.md`만을 절차 기준으로 원격 상태를 읽기 전용 확인했다.

| 점검 | 결과 |
| --- | --- |
| `nihongo-n3-prod-v2` | BLOCKED, D1 목록에 없음 |
| migration workflow | BLOCKED, default branch는 구 자동 변경 workflow이며 승인형 workflow는 R1 branch에만 존재 |
| GitHub `production` Environment | BLOCKED, Environment와 Cloudflare Environment secret 이름 없음 |
| 같은 SHA required Actions | BLOCKED, current-SHA Audit `29383879798`도 runner 시작 전 billing annotation |
| Worker Google secret 이름 | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 확인, 값 미출력 |
| report 보존 | `.artifacts/r1-blue-green`, `.artifacts/r1-preview-smoke` 준비 |

기존 production을 변경 없이 조회한 content/FTS 수량은 다음과 같다.

| 항목 | production | fresh 기준 | 판정 |
| --- | ---: | ---: | --- |
| vocab / vocab_fts | 3,427 / 3,427 | 3,300 / 3,300 | 127건 drift, 이전 승인 전 조사 필요 |
| sentences / sentences_fts | 1,112 / 1,112 | 1,112 / 1,112 | 일치 |
| categories | 0 | seed category 생성 | drift |
| curriculum_weeks | 16 | 52 | drift |

구현·검증 변경:

- D1 transfer dry-run도 table별 count/checksum을 계산하고 `verification-before.json`을 남긴다.
- 사람 승인 실행 후 `verification-after.json`, FTS 원본 parity와 3,300/1,112 기준을 함께 판정한다.
- `migrate:verify`가 remote `d1_migrations`를 7개 migration 파일과 순서까지 읽기 전용 비교한다.
- preview smoke가 공개 조회, password session, admin 보호, SRS, sync, OAuth 오류 경로, read-only 503/`Retry-After: 900`을 JSON으로 보존한다.
- smoke 중 FTS `MATCH`에 문장 부호가 들어오면 500이 발생하는 결함을 발견해 literal query helper와 회귀 테스트를 추가했다.

검증 결과는 API 80 tests, `pnpm verify:ci`, 로컬 preview off 21/21, read-only 17/17 PASS다. 실제 Google consent callback/complete, 인증된 admin 성공, prod-v2 migration/transfer, binding 전환, 30분 관측은 사람 실행과 원격 인프라가 없어 미수행이다. `--execute`, Environment 승인, production 배포·D1/R2 변경은 수행하지 않았다.

## 12. TD-13 관측성 preview 운영 연결 검증 (2026-07-15 KST)

PII 없는 Workers JSON log를 Logpush/R2와 운영 알림에 연결하기 위한 코드·문서·로컬 검증을 완료하고 Cloudflare 원격 상태를 교차 확인했다.

| 점검 | 결과 | 증거/판정 |
| --- | --- | --- |
| R2 보존 정책 | PASS | `nihongo-n3-worker-logs-30d`, `logs/workers/`, 30일 원격 재조회 |
| route template·canary secret 비노출 | PASS | API 90 tests, PII/path parameter 회귀와 receiver payload 거부 테스트 |
| 3종 threshold 판정 | PASS | ops 8 tests, saved query 3개와 공통 판정 코어 |
| 5분 alert runner | **preview 원격 PASS** | `*/5 * * * *`, 08:00 UTC 자동 Cron delivery |
| 전체 로컬 verify | PASS | OpenAPI 52/7, package typecheck, ops 8/Web 33/API 90 tests, Worker/PWA build |
| OpenAPI drift | PASS | public 52 paths, admin 7 paths |
| production 공개 smoke | PASS | `/health` 등 7/7; 현재 배포본은 `X-Release` 미설정 |
| dependency audit high | BLOCKED | npm legacy audit endpoint HTTP 410; 취약점 판정이 아니며 ignore하지 않음 |
| account-level Logpush job | PASS | 새 job 생성, enabled, `error_message=null`, R2 destination 비밀값 redacted 검증 |
| Observability saved query | PASS | 5xx/auth failure/D1 error 3개 원격 생성 |
| preview Worker Logpush | PASS | `nihongo-n3-api-observability-preview`, job `1790981`, `error_message=null` |
| preview alert Cron/secrets | PASS | runtime secret 이름, `*/5` Cron, receiver service binding 원격 확인 |
| production 연결 | GATED | 기존 Worker 미변경; required checks와 Environment 승인 후 별도 적용 |
| Logpush/Observability/Notifications API | PASS | account-owned token active, 관련 4개 API HTTP 200 |
| R2 Logpush object | PASS | `logs/workers/observability-preview/` `.log.gz` 20개 metadata 확인 |
| preview 5xx alert canary | PASS | 25/25 HTTP 500, detector fired, direct delivery 202 |
| Cron webhook/R2 evidence | PASS | generated `08:00:33.615Z`, received `08:00:34.272Z`, alert object 4개 확인 |

직접 운영 HTTPS 수신 endpoint는 별도 receiver Worker로 분리했다. 외부 호출은 bearer 인증을 사용하고 sender Worker는 내부 service binding을 우선한다. 수신 데이터는 PII가 없는 집계로 제한하고 R2에는 content hash 기반 불변 object로 남긴다. 초기 same-Worker public fetch 실패와 Observability API envelope 오판을 발견했으며 각각 receiver/service binding 분리, top-level `view`와 `result.events.events` 정규화로 수정했다.

preview end-to-end 증거가 확보되어 TD-13을 `검증 완료 (preview E2E)`로 변경했다. production release gate와 Environment 승인을 건너뛰지 않았고 production Worker와 D1은 변경하지 않았다. preview에는 전용 token 자동 발급 권한 부족으로 기존 account control token을 임시 사용했으며 production 전 최소권한 토큰 교체가 필수다.

## 13. TD-08 오디오 상환 사전 구현과 원격 차단 확인 (2026-07-15 KST)

R2 read-only 원칙을 유지하면서 QA·batch·검증 경로를 교차검증했다.

| 점검 | 결과 |
| --- | --- |
| production batch secret 이름 | `GOOGLE_TTS_API_KEY`, `AUDIO_BATCH_APPROVAL_TOKEN` 모두 없음, 값 미출력 |
| preview batch secret 이름 | 두 preview Worker 모두 없음 |
| QA 후보 | Cloudflare 30/30, Google 0/30(400), VOICEVOX 0/30(404), browser는 평가 device 의존 |
| production D1 batch schema | `audio_generation_log.provider`, `content_hash` 없음 |
| production 오디오 대상 | N5~N3 vocab 3,427 + kanji 546 + sentences 1,112 = 5,085 |
| 새 불변 key 일치 | 0/5,085 |
| strict remote gate | EXPECTED FAIL, 오디오 5,085건과 기존 production content drift 14개 blocking |
| API tests | 91 PASS |
| DB verifier tests | 3 PASS |
| fresh D1 gate | PASS, migrations 7/7·manifest/FTS/FK/필수 필드 정상; audio 4,954 WARN |
| fresh D1 strict audio gate | EXPECTED FAIL, audio 4,954건만 blocking |
| Chromium quiz/fallback E2E | 7/7 PASS, `ja-JP` 1회·서버 audio 요청 0 |
| WebKit quiz/fallback E2E | 7/7 PASS, `ja-JP` 1회·서버 audio 요청 0 |

API와 웹 QA 표본을 `audio-qa-30-v1`로 통합하고, 네 provider 120개 평가와 평가자/device/browser/날짜/candidate metadata가 모두 있어야 승인되는 scorecard를 추가했다. admin queue는 N5→N4→N3 level을 강제하고, Google batch secret과 timing-safe approval token 없이 실행되지 않는다. 기존 immutable object 덮어쓰기를 금지하고 provider별 성공 이력과 R2 metadata가 완전히 일치할 때만 D1 key를 채택한다.

`verify:remote:audio`는 NULL만 세던 방식에서 D1 불변 key와 R2 S3 HEAD metadata를 함께 대조하는 방식으로 강화했다. verifier 최소값은 낮추지 않았다. 사람 QA, `--execute`, production secret 설정, D1/R2 쓰기, 배포는 수행하지 않았다. R1 prod-v2 migration 7/7과 네 후보 준비가 선행되지 않아 TD-08은 `진행 중`을 유지한다.
