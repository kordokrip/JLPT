# nihongo-n3 리팩토링·기술부채·릴리스 통합 시계열

기준일: 2026-07-18 KST

기준 브랜치: `release/2026-07-18-integration`

운영 판정: 로컬 release candidate 검증 완료, production 변경 보류

## 1. 결론

프로젝트의 처음 목적은 한국어 사용자가 JLPT N5~N3 콘텐츠를 반복 학습하고, 퀴즈·복습·통계·오디오를 하나의 PWA에서 사용하는 것이었다. 이후 인증, 관리자, 오프라인 동기화, 콘텐츠 provenance, D1 이전, 관측성, LearningTrack이 추가됐지만 핵심 목적은 바뀌지 않았다. 현재 통합 후보는 기능 추가보다 다음 세 가지를 우선한다.

1. 사용자·트랙·세션·콘텐츠 데이터가 섞이지 않는 계약을 만든다.
2. 코드가 아니라 migration, manifest, OpenAPI, 브라우저 테스트와 운영 증거로 릴리스를 판정한다.
3. 미검수 N2/N1, 미승인 오디오, 미출시 TOPIK 문제은행을 완성 기능처럼 노출하지 않는다.

현재 코드는 배포 후보 수준의 로컬 관문을 통과했다. 다만 GitHub `production` Environment에 최소권한 Workers·Pages·D1 write·Backup token이 없고 `nihongo-n3-prod-v2` Blue/Green이 실행되지 않았으므로 Workers, Pages, D1/R2 production 변경은 아직 시작할 수 없다. 이번 배포의 안전한 시작점은 통합 브랜치 push, PR, 동일 SHA 원격 필수 체크 실행이다.

## 2. 시계열

| 기간 | 구현·리팩토링 | 교차검증과 판정 |
| --- | --- | --- |
| 5/24~5/29 | Markdown 자료를 React/Vite PWA, Hono Worker, D1/R2, shared/db/content package를 가진 pnpm 모노레포로 전환 | 실제 workspace가 문서 전용이라는 과거 분석을 폐기 |
| 5/29~5/31 | 일본어 발음 UX, i18n, responsive navigation, PWA, 자연 일본어 검색, Cloudflare 설정 정리 | 모바일·WebKit API 접근과 Pages/Workers 경로 확인 |
| 6/1~6/3 | browser voice, Audio QA, VOICEVOX adapter, 청해 퀴즈와 제출 schema, 한국어 자기진단 | provider fallback과 퀴즈 모드 E2E 추가 |
| 6/4~6/10 | N3 연습 콘텐츠, 문자 암기·발음, 로그인·회원가입·관리자, Google OAuth bridge, 브랜드/PWA manifest 보강 | 로그인·로그아웃·재로그인과 OAuth 시작 route를 회귀 테스트로 고정 |
| 6/15~6/29 | service worker API 우회, R2 kana audio, 단일 발음·대표 단어·손글씨 퀴즈, dependency/backup workflow 정리 | PWA share target, API 404, 발음 중복, GitHub workflow 실패 원인을 분리 |
| 7/8 | 인증, 콘텐츠 sync, user×track local scope, 모바일 UX를 운영 기준으로 안정화 | Chromium/WebKit menu·responsive·offline 회귀 확대 |
| 7/14~7/16 R1 | canonical D1, runtime DDL 제거, Blue/Green/backup/restore, public/admin OpenAPI, generated types, read-only guard, JSON observability, 승인형 CI 도입 | billing failure와 코드 failure를 구분하고 SHA `8047e57d9c9f`에서 Audit·CodeQL·Verify·E2E 성공 확인 |
| 7/15~7/16 R2 기반 | immutable R2 key, Google batch 승인 gate, Audio QA 30문장, 13개 source provenance와 seed ledger, 동음이의어 30쌍 공개 | manifest/FTS/FK/중복/필수값 통과. 오디오 4,954건은 숨기지 않고 warning/strict gate 유지 |
| 7/16~7/17 | N2/N1 후보를 WIP에 격리하고 DB 분포 기반 release gate, content version invalidation, 레벨 단일 소스 도입 | `AUTO` 2,674 + `EN` 1,931 잔존으로 후보 4,605건 운영 제외. 기본 seed에서 N2/N1 비노출 확인 |
| 7/17 | Quiz·Review·Stats를 view/hook/logic/type feature module로 분리 | 분리 전 snapshot을 고정하고 account×track hook 의존을 유지 |
| 7/17~7/18 R3 기반 | TOPIK T1 ADR, track-aware server key/schema, 별도 provenance, 자체 저작 placement 12문항 추가 | public seed/API/CTA에서 숨긴 채 local D1에서 빈 필드·정답·중복·FK·checksum 0건 검증 |
| 7/18 통합 | 위 변경을 R1 위에 순차 통합하고 auth session probe 경쟁 조건, D1 batch verifier, Quiz test isolation을 보강 | `verify:ci`, TOPIK verifier, Chromium 69, WebKit 55를 다시 실행해 통과 |

## 3. 현재 아키텍처 계약

```text
apps/web        React/Vite PWA, Query, Dexie, feature modules
apps/api        Hono/OpenAPIHono Worker, app-session/OAuth/admin/read-only
packages/shared DTO, OpenAPI schema, JLPT level, track, FSRS/audio policy
packages/db     Drizzle schema, 0000~0008 migration, seed/verify/ops
packages/content docs metadata
docs            N5~N3 source, provenance, 운영·제품 문서
e2e             Chromium/WebKit 기능·반응형·격리·시각 회귀
.github         audit, CodeQL, verify, E2E, backup, 승인형 배포
```

데이터 흐름은 `docs -> parser -> manifest -> migration/seed -> D1 -> OpenAPI -> generated types -> Web/IDB`다. production 쓰기는 GitHub Environment 승인과 전용 workflow 외에는 허용하지 않는다.

## 4. 7/18 통합 범위

| 영역 | 포함 | 의도적 제외 |
| --- | --- | --- |
| R1 기반 | OpenAPI, D1 ops, 인증·세션, 관측성, CI, Blue/Green 도구 | prod-v2 생성·binding 전환 |
| 콘텐츠 | N5~N3 13 source provenance, 동음이의어 30쌍 | N2/N1 후보 4,605건 |
| Web | N2/N1 노출 gate, cache invalidation, Quiz·Review·Stats module | 검수 전 N2/N1 사용자 노출 |
| TOPIK | T1 ADR, 0008 schema, server 격리, 내부 12문항 verifier | public API, 채점, 추천, 출시 CTA |
| 오디오 | R2-first와 browser Japanese fallback, batch guard | 사람 청감 전 Google 전체 batch |

## 5. 독립 교차검증

### 정적·계약 관문

| 명령 | 결과 |
| --- | --- |
| `pnpm openapi:check` | public 53 paths, admin 7 paths, generated drift 0 |
| `pnpm typecheck` | web/api/db/shared/content 통과 |
| `pnpm test` | ops 8, DB ops 20, Web 60, API 95 통과 |
| `pnpm build` | Vite PWA와 Wrangler dry-run 통과 |

### 실행·데이터 관문

| 명령 | 결과 |
| --- | --- |
| `pnpm -F @nihongo-n3/db verify:fresh` | migration 9/9, source 13, FTS 3,300/1,112, FK·중복·필수값 0 |
| `pnpm -F @nihongo-n3/db topik:verify` | 내부 12문항, source 1, level 2, 필수값·정답·중복·FK·checksum 0 |
| `pnpm -F @nihongo-n3/e2e test:chromium` | 69/69 통과 |
| `pnpm -F @nihongo-n3/e2e test:webkit` | 55/55 통과, Chromium 전용 시각 14건 의도적 skip |

E2E 범위에는 password/OAuth 시작·재로그인, admin 보호, SRS, sync, 네 퀴즈 모드와 청해 fallback, 통계, PWA/offline, iOS safe-area, 6개 viewport, N2 release gate, TOPIK local/server 격리가 포함된다.

## 6. 데이터 판정

- JLPT 운영 seed: vocab 3,300, grammar 316, kanji 542, sentences 1,112, sysprog 82, curriculum 52.
- manifest: schema v2, provenance 13/13, seed ledger source 13 + derived homophone 1.
- 동음이의어: 검수 30쌍, incomplete/read/source/duplicate/FK 0.
- TOPIK: 자체 저작 12문항은 내부 QA 전용이며 운영 seed에 포함하지 않는다.
- N2/N1: 후보 9개 파일의 검수 태그 4,605건이 남아 manifest와 `CONTENT_PATHS`에 등록하지 않는다.
- 오디오: fresh D1의 immutable R2 key 4,954건이 비어 있다. 이는 R2 완료 차단이며 verifier 기준을 낮추지 않는다.

## 7. 배포 상태와 차단 사유

2026-07-18 repository-level `CLOUDFLARE_PAGES_API_TOKEN`과 `production` Environment의 같은 이름 secret을 등록했다. 토큰 값은 출력하거나 문서화하지 않았으며 Cloudflare token verify와 `nihongo-n3` Pages 프로젝트 조회로 유효성을 확인했다. 나머지 Workers·D1 write·Backup 전용 token은 아직 등록 대기 상태다.

필요한 secret 이름:

- `CLOUDFLARE_WORKERS_API_TOKEN`
- `CLOUDFLARE_PAGES_API_TOKEN`
- `CLOUDFLARE_D1_WRITE_API_TOKEN`
- `CLOUDFLARE_BACKUP_API_TOKEN`

로컬 D1 Read token이나 범용 account token을 이 자리에 재사용하지 않는다. 각 token은 해당 Worker/Pages/D1/R2 권한만 가진 최소권한 token으로 발급한다.

### 최초 통합 SHA 원격 증거

PR: [#35](https://github.com/kordokrip/JLPT/pull/35)

검증 SHA: `4d7e96f7039c881bb04386beb10b361eed075a49`

| Workflow | 결과 | URL |
| --- | --- | --- |
| Dependency Audit | success | [run 29598979614](https://github.com/kordokrip/JLPT/actions/runs/29598979614) |
| CodeQL | success | [run 29598979983](https://github.com/kordokrip/JLPT/actions/runs/29598979983) |
| Required Verification | success | [run 29598980063](https://github.com/kordokrip/JLPT/actions/runs/29598980063) |
| Fresh D1 validation | success | [run 29598979912](https://github.com/kordokrip/JLPT/actions/runs/29598979912) |
| Chromium/WebKit E2E | success | [run 29598979938](https://github.com/kordokrip/JLPT/actions/runs/29598979938) |
| Pages build/preview | build success, preview failure | [run 29598980261](https://github.com/kordokrip/JLPT/actions/runs/29598980261) |

Pages 최초 실패는 billing이나 앱 build가 아니라 Wrangler가 `CLOUDFLARE_PAGES_API_TOKEN`을 받지 못한 운영 설정 실패였다. token 등록 후 같은 run의 실패 job을 재실행해 Preview Deploy가 성공했다. 이 과정에서 긴 branch 이름을 workflow가 직접 URL로 조합한 댓글은 404를 가리키고, Wrangler가 반환한 축약 alias는 200을 반환하는 별도 CI 결함을 발견했다. workflow는 `pages-deployment-alias-url` 출력을 사용하고 해당 URL HTTP smoke 성공 후 댓글을 남기도록 수정했다. Backup은 전용 token과 Environment 승인이 없어 실행하지 않았다. 따라서 Pages preview 관문은 복구됐지만 production release gate 전체는 아직 닫히지 않았다.

### Pages 인증 복구 시점 후보 SHA

검증 SHA: `c24ce81fbbbdc436d4a7acc4b7c5d157eb27c4bd`

| Workflow | 결과 | URL |
| --- | --- | --- |
| Dependency Audit | success | [run 29599509204](https://github.com/kordokrip/JLPT/actions/runs/29599509204) |
| CodeQL | success | [run 29599508794](https://github.com/kordokrip/JLPT/actions/runs/29599508794) |
| Required Verification | success | [run 29599507517](https://github.com/kordokrip/JLPT/actions/runs/29599507517) |
| Fresh D1 validation | success | [run 29599507645](https://github.com/kordokrip/JLPT/actions/runs/29599507645) |
| Chromium/WebKit E2E | success | [run 29599507657](https://github.com/kordokrip/JLPT/actions/runs/29599507657) |
| Pages build/preview | success after credential rerun | [run 29599510828](https://github.com/kordokrip/JLPT/actions/runs/29599510828) |

기존 production API에는 `ops:observe --smoke-only`를 실행해 health·OpenAPI·auth config·vocab·grammar·kanji·sentences 7/7 성공을 확인했고, 기존 Pages origin과 실제 preview deployment/alias는 모두 HTTP 200을 반환했다. 이 결과는 신규 production 배포 완료가 아니라 기존 운영 상태와 preview artifact 검증 증거다.

## 8. 배포 실행 순서

1. 통합 브랜치를 push하고 main 대상 PR을 만든다.
2. 같은 PR head SHA에서 Dependency Audit, CodeQL, Required Verification, Chromium/WebKit E2E를 통과시킨다.
3. production Environment에 네 전용 secret을 등록하고 사람 승인을 구성한다.
4. maintenance window에서 Backup D1→R2와 restore drill을 성공시킨다.
5. `nihongo-n3-prod-v2`에 migration 9/9를 적용하고 Blue/Green dry-run·content/mutable 검증을 수행한다.
6. prod-v2 preview에서 auth/OAuth/admin/SRS/sync/read-only smoke를 통과시킨다.
7. PR을 main에 병합한 뒤 GitHub UI에서 Workers와 Pages workflow_dispatch를 승인한다.
8. 배포 후 30분 smoke와 24시간 release SHA별 5xx/latency/D1/auth 관측을 기록한다.

현재 1~2단계와 Pages preview 인증 복구는 완료됐다. 3단계의 나머지 전용 secret 등록 이후 작업은 GitHub `production` Environment 사람 승인 없이는 실행하지 않는다.

## 9. 다음 부채

1. TD-14 Backup 원격 성공과 R2 object 확인.
2. TD-01 prod-v2 Blue/Green과 30일 old DB read-only 보존.
3. TD-13 production Logpush·alerts 재검증.
4. TD-08 30표본 사람 청감, 승인 batch, 누락 0.
5. N2/N1 provenance·한국어 편집 검수 4,605건 완료.
6. TOPIK T4 public API/Web와 T5 독립 수동 출시.

이 문서는 “코드 통합 완료”, “운영 데이터 전환 완료”, “사용자 기능 출시 완료”를 같은 의미로 사용하지 않는다. 각 단계는 해당 원격 증거가 생긴 뒤에만 완료로 갱신한다.
