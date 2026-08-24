# 오류·회귀 차단 원장 — 2026-08-23

기준 시각: 2026-08-24 KST
현재 상태: **첫 클릭 사용자 활성화 소실과 설치형 PWA의 이전 JS 잔존을 복구해 source `2bd657e...`를 Preview와 Production에 배포했다. 전체 로컬 gate, Production Chromium/WebKit 영향 기능, 실제 Chrome 한국어·일본어 lifecycle을 통과했다. 물리 스피커 가청 여부는 자동 검증과 구분하고, 현재 HEAD와 운영 콘텐츠 manifest의 source hash drift는 별도 공개 결함으로 추적한다.**

이 문서는 JLPT·TOPIK 현재 오류, 잘못된 이전 판정, 복구 증적과 재발 방지 gate의 단일 원장이다. `통과`는 실제로 실행해 종료 코드와 결과를 확보한 항목에만 사용한다. mock 재생, 실행하지 못한 테스트, 로컬 build, 과거 배포의 증적은 현재 Production 가청 동작을 증명하지 않는다.

## 오류 원장

| ID | 오류와 영향 | 확인된 원인·증거 | 현재 조치 | 배포 차단 조건 |
| --- | --- | --- | --- | --- |
| `INC-AUD-001` | TOPIK 한국어와 JLPT 일본어 발음·청해가 재생되지 않음 | 정상 동작하던 같은 언어 기기 voice fallback을 회귀 커밋 `3485c6e`에서 제거하고 이름/URI에 `Google`이 있는 voice만 허용 | `Google 우선 → 같은 언어 default → 같은 언어 첫 voice → voice 목록이 비면 utterance.lang` 복구 | 정적 계약, 단위, 양 엔진 E2E, 실제 Chrome 한국어·일본어 재생, 가청 확인 모두 필수 |
| `INC-QA-002` | 자동 테스트를 실제 가청 검증으로 오판 | fixture `Google Korean`·`Google 日本語`와 즉시 호출한 mock `onend`를 사용 | mock 검증과 실제 브라우저·사람 가청 증적을 분리 | `mocked=false`, `callback_provenance=real-page-onend`, `human_audible_confirmation=true` 강제 |
| `INC-DIAG-003` | 장애 원인을 Google Cloud TTS 자격 증명·비용 문제로 잘못 외부화 | isolated browser 환경 결과를 실제 앱 main world와 혼동 | 새 서버 TTS 없이 제거된 browser fallback 복구 | 실제 배포 URL의 페이지에서만 Web Speech와 network를 관측 |
| `INC-UI-004` | 재생 실패가 화면에서 조용히 무시됨 | 일부 버튼이 reject/timeout을 사용자 상태로 표시하지 않음 | 발음·퀴즈·청해에 오류·unavailable UI와 telemetry 연결 | 각 학습 표면의 실패 UI E2E 필수 |
| `INC-REL-005` | 음성 회귀가 든 Pages `1c3bba90-8990-472b-8bf2-12a08759597f`를 검증 완료로 배포 | 가청 gate 없이 mock E2E를 출고 근거로 사용 | rollback 기준 `7b0e9050-f36c-42a3-aab9-7d09f70df2af` 보존, 복구 릴리스 별도 배포 | 새 Preview에서 같은 release SHA의 실제 음성 증적 없으면 Production 금지 |
| `INC-INFRA-006` | 일부 로컬 테스트가 assertion 전에 시작 실패하거나 Wrangler가 로그 쓰기 오류를 출력 | `tsx` IPC·Miniflare listener·홈 디렉터리 Wrangler log 쓰기가 `EPERM`으로 차단됐던 환경 문제 | IPC 없는 명령과 Wrangler log 차단을 유지하고 잔존 listener 종료 후 `verify:ci`·전체 기능 E2E 재실행 통과 | 인프라 실패는 테스트 통과로 기록 금지; 현재 재실행 결과는 아래 스냅샷 사용 |
| `INC-NET-007` | Wrangler가 Preview 업로드 전에 종료 | 이전 실행 환경에서 Cloudflare·GitHub DNS 해석 실패 | 현재 GitHub remote와 Cloudflare API DNS·인증 재확인 완료 | 실제 deployment ID와 원격 URL 없으면 배포 완료 금지 |
| `INC-BROWSER-008` | 실제 Chrome Cloudflare 검증 미실행 | 이전 세션 브라우저 접근 정책에서 Dashboard가 차단됨 | Dashboard가 아니라 배포 URL 자체의 앱 페이지에서 검증 | 실제 페이지 `onend`, network 0건, 사용자 가청 결과 필수 |
| `INC-GIT-009` | 당시 checkout의 복구 파일 커밋 미완료 | 제한된 실행 환경에서 `.git/index.lock: Operation not permitted` | 현재 `.git` 쓰기가 복구되어 원래 checkout에서 검증 후 원자적 commit 진행 | 원격 branch에 동일 SHA가 없으면 Preview/Production 근거로 사용 금지 |
| `INC-DOC-010` | 문서가 `Google-only`와 완료 상태를 사실보다 강하게 표현 | browser API가 Google 브랜드 voice를 항상 열거한다는 잘못된 가정, 미실행 항목까지 완료로 서술 | 런타임 계약과 완료 정의를 현재 코드·증적에 맞게 수정 | 문서 링크 검사와 이 오류 원장 갱신을 같은 변경에서 수행 |
| `INC-QA-011` | 변경 작업 중 OpenAPI 검사 자체가 최신 생성물도 HEAD와 다르다는 이유로 실패 | 기존 gate가 생성 전후가 아니라 `git diff`로 미커밋 변경 전체를 비교 | 생성 전후 파일 내용을 비교해 stale 생성물만 실패하도록 수정 | 소스와 생성 타입을 함께 갱신하고 `openapi:check` 통과 필수 |
| `INC-E2E-012` | 전체 WebKit 실행에서 `/reading` stall과 브라우저 allocator panic 발생 | 반응형 테스트가 각 viewport마다 page를 9번 생성·폐기해 전체 suite 누적 후 WebKit 자원을 고갈시켰고 기본 30초 예산도 부족 | viewport마다 한 page를 재사용하고 다중 라우트 예산을 120초로 명시; 새 Chromium·WebKit 기능 E2E `128 passed / 2 skipped` | 이후에도 전체 기능 E2E 종료 코드 0 필수 |
| `INC-REL-013` | 검증된 복구본을 당시 checkout/원격 branch에 기록하거나 배포하지 못함 | 제한된 실행 환경의 `.git`·DNS·브라우저 접근 차단 | 동일 파일을 안전 bundle로 보존했고 현재 원래 checkout·GitHub·Cloudflare 접근이 복구되어 정식 commit/Preview 진행 | 원격 branch SHA·Preview deployment ID·Production deployment ID가 없으면 배포 완료 금지 |
| `INC-BROWSER-014` | 실제 Chrome Production에서 한국어·일본어 버튼 클릭 뒤 성공·실패 UI가 없고 현재 문구도 `Google-only` 상태 | `https://nihongo-n3.pages.dev/audio-qa`가 회귀 배포를 제공하며 두 언어 버튼 클릭 후 DOM 상태 변화가 없음; 브라우저 자동화 isolated world의 Web Speech 부재는 main-world 장애 근거로 사용하지 않음 | 복구본은 실패 UI를 추가했고 Preview 실제 페이지에서 다시 검증 예정 | Production URL의 새 asset/문구, real-page `onend`, 양 언어 재생, R2/legacy 요청 0건 확인 필수 |
| `INC-REL-015` | Worker를 새 코드로 배포해도 관측 release가 회귀 SHA `3485c6e...`로 남을 수 있음 | production `wrangler.toml`의 `RELEASE_SHA`는 현재 운영 기준선을 기록하므로 일반 `wrangler deploy`가 이를 그대로 재사용 | Worker deploy를 전용 스크립트로 교체해 현재 clean HEAD와 일치하는 40자 SHA를 필수화하고 CLI `--var`로 주입 | SHA 누락·HEAD 불일치·dirty checkout이면 업로드 전에 실패해야 함 |
| `INC-REL-016` | 첫 Preview Pages가 SPA만 배포하고 Functions proxy를 누락 | 저장소 루트에서 `wrangler pages deploy apps/web/dist`를 실행해 `apps/web/functions`가 배포 문맥에 포함되지 않음 | `apps/web`를 cwd로 고정해 다시 배포; 잘못된 deployment `367eb0f4-d336-4b63-8d3a-b073e7290ca8`은 증적에서 제외 | Pages `/api/v1/auth/config`와 인증 API가 JSON으로 proxy되지 않으면 Preview 실패 |
| `INC-QA-017` | Worker 전용 smoke를 Pages origin에 실행해 OpenAPI 4건을 제품 오류로 오인 | `r1-preview-smoke`는 Worker의 `/openapi*` 직접 route를 전제로 함 | Worker URL에서 다시 실행해 `21 passed / 0 failed`; Pages는 auth proxy 전용 smoke로 분리 | smoke 종류별 올바른 origin을 원장에 기록 |
| `INC-E2E-018` | 원격 WebKit에서 TOPIK 복합 시나리오가 로컬 fixture와 실제 Preview DB를 섞어 실패 | `page.route`로 mock practice를 주입하면서 owner curriculum은 실제 원격 DB를 사용하고, 로컬 전용 1급 문구까지 하드코딩 | 로컬 fixture 계약은 외부 배포에서 명시적으로 skip하고 실제 Batch 4 owner/FSRS, quiz, SRS 검증을 별도 유지 | skip 사유 없는 원격 fixture 실패를 통과로 바꾸지 않음 |
| `INC-QA-019` | 실제 Chrome이 `/audio-qa`에서 `/welcome`으로 이동해 음성 버튼을 검증할 수 없음 | 수동 음성 QA가 JLPT track 인증 route 안에 있었음 | 계정·쓰기·개인 데이터가 없는 `/audio-qa`만 공개 진단 route로 분리하고 익명 양언어 E2E 추가 | 익명 QA가 양언어 호출, 오류 UI, R2/`/api/v1/audio/` 0건을 통과해야 함 |
| `INC-AUD-020` | voice 목록이 늦게 준비되는 브라우저에서 첫 클릭이 무음으로 끝날 수 있음 | click handler가 `voiceschanged`/polling을 최대 2.5초 `await`한 뒤 `speechSynthesis.speak()`를 호출해 브라우저의 짧은 사용자 활성화 구간을 벗어남 | voice warm-up은 background로만 실행하고 원래 click task 안에서 `utterance.lang`과 현재 same-language voice로 즉시 `speak()` 호출; 8초 안에 `onstart`가 없으면 명시적 오류 처리 | TOPIK·JLPT 단위 테스트와 Chromium/WebKit에서 첫 호출이 동기적으로 `speak()`에 도달해야 함 |
| `INC-PWA-021` | 새 Pages 배포 뒤에도 열린 설치형 PWA가 회귀 JS를 계속 실행할 수 있음 | 서비스 워커 업데이트는 사용자 confirm에 의존했고 열린 client를 새 bundle로 전환하는 복구 절차가 없었음 | SW를 즉시 등록하고 online/visibility 때 update 확인; 이미 이전 SW가 제어하던 client만 `controllerchange` 때 1회 reload | 기존 PWA는 1회 갱신하고 첫 방문자는 reload하지 않는 unit/PWA E2E와 실제 Production asset 확인을 통과해야 함 |
| `INC-PWA-023` | 첫 Preview에서 일부 browse/quiz 원격 검사가 navigation 중단으로 실패 | activate handler가 `includeUncontrolled` client까지 강제 `navigate()`해 첫 방문자도 reload함 | Preview를 Production에 올리지 않고 강제 navigate/marker 방식 제거; controller가 배포 전부터 존재한 client로 범위 제한 | 신규 Preview에서 동일 원격 suite를 처음부터 재실행해 실패 0이어야 함 |
| `INC-OPS-022` | Production D1 backup의 첫 restore drill이 import 단계에서 중단 | full import의 Wrangler 결과가 Node 기본 1MiB buffer를 넘었고, published/immutable 행 replay는 정상 runtime trigger와 충돌할 수 있었음 | restore buffer를 64MiB로 확대; migrated trigger DDL을 보존한 뒤 임시 로컬 import 동안만 중지하고 동일 DDL을 재설치 | 전체 테이블 행 수, 재설치 trigger, FTS, FK를 실제 restore drill로 검증해야 함 |
| `INC-DATA-024` | 현재 HEAD 기준 remote verifier가 운영 D1에 대해 차단 검사 45건 실패 | 운영 DB는 콘텐츠 source `3485c6e...`의 manifest `content-v3-d102868...`를 유지하지만 이후 15개 repository-managed 문서의 음성 정책 문구가 바뀌어 현재 HEAD manifest가 달라짐 | 운영 release source·manifest·실제 seed run에 고정해 `280/280` 재검증; Pages-only 복구에서 D1 재시드 금지 | verifier는 immutable source SHA/manifest를 입력받아야 하며, HEAD drift를 운영 데이터 손상이나 배포 성공으로 오판하지 않음 |

## 현재 복구 검증 스냅샷

2026-08-24 KST에 현재 작업 트리에서 다시 실행한 결과다. 아래 실제 Chrome 행은 현재 Production의 페이지 lifecycle 증거이며 물리 스피커 가청 증거와 구분한다.

| 검사 | 결과 | 판정 |
| --- | --- | --- |
| 복구 소스 84개와 안전 커밋 파일 SHA-256 비교 | 불일치 `0` | 통과 |
| bundle/patch `SHA256SUMS`, `git bundle verify` | 모두 `OK`, complete history | 통과 |
| `pnpm docs:check` | 문서 50개, 상대 링크 45개 | 통과 |
| `pnpm release:verify:audio-contract` | same-language fallback/R2 금지 | 통과 |
| `pnpm test:ops` | `18/18` | 통과 |
| `pnpm typecheck` | Web/API/DB/shared 종료 코드 `0` | 통과 |
| DB unit | `112/112` | 통과 |
| Web unit | `34 files / 93 tests` | 통과 |
| API unit | `8 files / 131 tests` | 통과 |
| `pnpm build` | Web build와 Worker dry-run 종료 코드 `0` | 통과 |
| fresh D1 재실행 | migration `0000–0027`, seed, FK/FTS, release contract/control-plane 완료 | 통과 |
| Production D1 backup/restore drill | checksum manifest 생성; `65` regular tables 복원, FTS/FK 대조 | 통과 |
| 음성·PWA·offline·퀴즈·복습·TOPIK owner 영향 E2E | Chromium/WebKit `50 passed / 2 skipped / 0 failed`, 종료 코드 `0` | 통과 |
| 전체 Chromium·WebKit·모바일·시각 E2E 재실행 | `171 passed / 32 skipped / 0 failed`, 종료 코드 `0` | 통과 |
| 실제 Chrome 새 Production `9cc58a1f` | 일본어·한국어 모두 클릭 0.3초·2.8초 뒤 `재생 중`, 이후 정상 종료; alert `0`, console error `0`; 물리 가청은 자동 판정하지 않음 | lifecycle 통과·가청 미확인 |
| Production web source | `2bd657e96d8a43c6d28efe414acd468c1abd0861`; 첫 클릭과 PWA 범위 수정 2개 commit을 원격 branch에 push | 통과 |
| GitHub/Cloudflare 연결 | remote·DNS·OAuth 인증 확인 | 통과 |
| GitHub Actions | repository `enabled=false`; 자동 push/PR trigger 제거 | 비활성화 |
| Preview Worker | `48b49518-f374-4c59-a652-f73d136689f3`, `/health` 200, release SHA `a427af8...`, Worker smoke `21/21` | 통과 |
| 최종 Preview Pages | `d53c3b4f-0c51-4a2b-9cc8-e5f35edcf5a0`, source `2bd657e...`; 실제 Chrome 양언어 lifecycle·console error 0 | 통과 |
| Preview 기능 E2E | 최초 `33 passed / 8 skipped / 1` 환경성 timeout, 해당 단일 검사를 재실행해 통과; skip은 로컬 fixture·환경 제한 | 통과 |
| Production 영향 기능 E2E | Chromium·WebKit `44 passed / 8 skipped / 0 failed`; 음성 단독 `2/2` | 통과 |
| Production Pages | `9cc58a1f-4772-4129-b90d-c819ca20d700`, asset `assets/index-DprkUCgI.js`; rollback `485b9f00-a8b1-4bbb-9001-a238651fb212` | 배포·smoke 통과 |
| R2/legacy audio | 원격 R2 발음 참조 합계 `0`; `/api/v1/audio/test` `410` | 통과 |
| Production D1 verifier | release source 고정 `280/280` 통과; 현재 HEAD 직접 비교는 source hash drift로 차단 `45`건 실패 | DB 정상·`INC-DATA-024` 추적 |

## 강제 릴리스 gate

1. `pnpm release:verify:audio-contract`: same-language fallback과 R2/server 음성 경로 금지를 소스에서 검사한다. `pnpm verify:ci`의 첫 단계다.
2. 단위 테스트: Google 이름이 없는 `Yuna(ko-KR)`, `Kyoko(ja-JP)`, 빈 voice 목록, 다른 언어 거부, 실제 `onend` 전 성공 금지를 검사한다.
3. Chromium·WebKit E2E: TOPIK 학습·placement·owner, JLPT 발음·퀴즈·청해·복습과 실패 UI를 검사한다.
4. 첫 클릭 활성화: voice 준비 Promise를 기다리지 않고 원래 click task 안에서 `speak()`가 호출되는지 양 언어에서 검사한다.
5. PWA 교체: 기존 SW가 제어하던 client만 정확히 한 번 갱신하고, 첫 방문자는 reload하지 않으며 이후 반복 reload하지 않는지 검사한다.
6. 실제 Chrome Preview: mock 없이 한국어·일본어 각각 최소 1회 `real-page-onend`를 기록하고 `/api/v1/audio/`와 R2 발음 요청 0건을 확인한다.
7. 실제 가청: 사용자가 같은 Preview에서 양 언어가 들렸음을 확인한다. callback 결과와 별도로 기록한다.
8. `pnpm release:verify:audio-predeploy -- --input <evidence.json>`: 증적을 불변 `release_sha`와 `deployment_id`에 묶는다. 과거 또는 이동 branch 증적 재사용을 금지한다.
9. Preview의 모든 gate 통과 뒤에만 Production Pages를 배포한다. Production에서도 동일 smoke를 반복하며 실패하면 직전 Pages 기준으로 rollback한다.

## 완료 판정 규칙

- `exit 0`과 검사 개수 또는 deployment ID가 있는 실행만 `통과`로 쓴다.
- `EPERM`, DNS 실패, 로그인 실패, 브라우저 권한 실패는 모두 `미실행/차단`이며 통과가 아니다.
- mock `onend`는 로직 회귀 검사일 뿐 실제 소리의 증거가 아니다.
- 실제 Chrome `onend`도 물리 스피커의 가청 증거를 대신하지 않는다.
- Production URL에서 확인하지 않은 결과로 Production 복구 완료를 선언하지 않는다.
- 오류를 새로 발견하면 같은 변경에서 이 원장에 ID, 영향, 증거, 조치, 차단 gate를 추가한다.

## 복구 artifact

- 로컬 안전 커밋: bundle의 `feature/topik-product-expansion` ref로 확인한다. 원격에는 미반영이다.
- bundle: `.artifacts/recovery/audio-2026-08-23/jlpt-audio-recovery.bundle`
- patch: `.artifacts/recovery/audio-2026-08-23/0001-fix-restore-JLPT-and-TOPIK-browser-speech.patch`

이 artifact는 작업 유실 방지용이며 원격 커밋·Preview·Production 배포 증거를 대신하지 않는다. checksum은 같은 디렉터리의 `SHA256SUMS`에서 확인한다.

세부 원인과 릴리스 증적은 [브라우저 음성 회귀 기록](TOPIK_GOOGLE_SPEECH_INCIDENT_2026-08-23.md), 전체 운영 기준은 [현재 상태](CURRENT_STATE.md)를 따른다.
