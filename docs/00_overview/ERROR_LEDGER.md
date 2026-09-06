# 오류·회귀 차단 원장

최종 점검: 2026-09-06 KST
현재 상태: 2026-08-24 음성 복구 배포는 역사 기준선이다. 2026-09-06 새 학습 UX·`0028`은 전용 Preview 검증 중이며 Production 미반영이다. 최신 Preview는 Pages `555fc0c4`/Worker `b02f3674`이며 앱 source는 `793b671`이다. 사용자의 가청 확인은 Pages `a95437fc`/source `94dfb05`에만 연결한다. 이후 Preview의 정상 종료 관측과 가청 통과를 혼동하지 않는다. 현재 HEAD와 운영 콘텐츠 manifest의 source hash drift는 별도 공개 결함으로 추적한다.

이 문서는 JLPT·TOPIK 현재 오류, 잘못된 이전 판정, 복구 증적과 재발 방지 gate의 단일 원장이다. `통과`는 실제로 실행해 종료 코드와 결과를 확보한 항목에만 사용한다. mock 재생, 실행하지 못한 테스트, 로컬 build, 과거 배포의 증적은 현재 Production 가청 동작을 증명하지 않는다.

현재 Production에서 열린 결함은 manifest drift `INC-DATA-024`, TOPIK v2 상태 오판 `INC-TOPIK-031`, quiz 활동 유실 가능성 `INC-ACT-032`, R2 검사/CSP 공백 `INC-AUD-033`입니다. 031–033은 로컬 코드와 회귀 테스트를 수정했지만 아직 Worker Production에 배포하지 않았으므로 완료로 표시하지 않습니다. `INC-LEGACY-034`의 파일 정리는 이번 후보에 포함했고 legacy DB 열·테이블 제거는 별도 additive migration 전까지 보류합니다. `INC-OPS-035`는 이번 검증 중 발견해 표면별 D1 쿼리와 회귀 테스트로 즉시 닫았습니다. 실제 사용자 장치의 물리 가청 확인은 자동 lifecycle 검사와 별도인 사후 관찰 항목입니다.

## 오류 원장

### 2026-09-06 학습 경험 개선 후보 (Production 미반영)

- `INC-UX-036` local candidate: 공개 언어 선택·가입/로그인 ko/ja/en, TOPIK 일본어 기본 안내와 조작 문구, UI/해설 분리를 구현했다. 명시적 기존 영어 선택을 유지한다. foundation의 기존 영문 교육 내용에 새 번역을 작성·공개한 것은 아니다.
- `INC-LEARN-037` local candidate: Home 간이 주간 진행률과 달력 기반 완료를 제거하고 실제 profile/세션/accepted 결과를 사용한다. 빈 readiness 맞춤 추천을 제거했고 quiz 기본값은 profile 또는 N5다.
- `INC-LEARN-038` local candidate: owner 해설 GET과 완료 POST를 분리하고, QuizResult는 소유권 검증된 서버 결과로 새로고침 복구한다. 지연 응답이 새 메모 초안을 지우는 경계를 회귀 테스트로 고정했다.
- `INC-SRS-039` local candidate: vocab/grammar/kanji/sentence/sysprog의 유형별 복습 조회와 표시를 분리했다. 안내 세션은 기존 JLPT/TOPIK FSRS 저장 서비스를 재사용한다.
- `INC-QA-040` release gate partial: 실제 Chrome의 로컬 주소 접근 제한은 우회하지 않았다. 대신 새 Pages `a95437fc`(source `94dfb05`)의 `/audio-qa`에서 일본어/한국어 정상 종료 각각 1회와 사용자의 **“두 언어 모두 들렸습니다”**를 확인했다. 실제 Chrome 전체 network capture는 확보하지 않았으므로 mock E2E의 R2/legacy 요청 0건을 실제 Chrome의 관측값으로 옮겨 적지 않는다. 사용자 청취 확인은 Production 배포 승인이 아니다.
- `INC-OPS-041` 재발 관찰: 06:09 UTC 전체 read-only의 R2 조회는 Cloudflare D1 API `7403`으로 실패했다. 06:44 UTC 같은 명령은 설정·인증 변경 없이 exit 0, 9개 표면 모두 0이었다. 원인을 지속적인 권한 부족으로 단정하지 않는다. 최초 전체 status `48 pass / 2 warnings / 3 fail`과 단독 재검사 성공을 별도로 보존한다. TOPIK status·CSP 두 실패는 미배포 상태다.
- `INC-UI-042` local candidate: 새 목표 설정 select가 WebKit에서 min-height를 무시해 23px 터치 영역으로 렌더링되었다. `mobile-touch-audit`가 실제 측정해 실패했으며, study 전용 select에 appearance 제거·3rem 최소 높이·화살표를 적용했다. Chromium 통과만으로 iPhone 터치 검증을 대체하지 않는다.
- `INC-LEARN-043` local candidate, 수정·회귀 통과: 다른 기기가 먼저 제출하면 오프라인 pending이 영구 409에 막히던 결함. 서버 수락 결과를 재조회하고 미수락 로컬 답을 별도 초안에 보존한 뒤 명시적 확인으로 복귀한다. Web 회귀와 양 엔진 기기 충돌 E2E를 통과했다.
- `INC-DATA-044` local candidate, 수정·회귀 통과: 선행 status 조회 후 동시 요청이 종료하면 stale PATCH/submit이 terminal 상태를 덮어쓰던 결함. SQL terminal guard와 부모 open 상태 claim trigger를 추가했다. 실제 격리 D1의 동시 완료→pause/active, abandoned→submit 세 회귀가 수정 전 실패·수정 후 통과했다.
- `INC-OPS-045` 로컬 도구 수정·회귀 통과: Cloudflare 오류의 URL은 가려도 중첩 `accountTag` 식별자가 진단 artifact에 남을 수 있었다. JSON·escaped JSON·stderr의 계정/D1 경로 식별자를 가리고 오류 코드는 보존한다. 수정 전 회귀 실패 후 Ops 26/26 통과. 기존 실패 원문은 ignored evidence로 보존하며 값을 문서로 복사하지 않는다.
- `INC-DATA-046` local candidate, 수정·회귀 통과: 다른 기기의 계정 트랙 변경으로 오래 열린 날짜 메모·profile/current가 잘못된 트랙에 저장/바인딩되던 결함. 선택적 `expected_track` 불일치는 저장 전 409로 거부한다. 양방향 API 회귀, ko/ja/en 새로고침 안내·메모 보존과 양 엔진 E2E를 통과했다. 구 클라이언트 계약은 유지한다.
- `INC-DATA-047` local candidate, 수정·복원 통과: 기존 backup allowlist는 0027/65뿐이었다. 실제 schema로 0027/65 또는 0028/70을 선택하고 부분·누락·unknown 테이블을 차단한다. 첫 실제 로컬 restore는 Node SQLite에 없는 Miniflare `_cf_METADATA` 때문에 중단했다. 정확히 이 생성 테이블만 제외했고 실제 schema 판정, 대상 15개 테스트와 저장된 65개 backup의 local0028 restore를 통과했다(FK 0, trigger 56개 복구). `coversLocalSchema=false`인 구 backup 결과를 새 70-table backup 증거로 사용하지 않는다. 최종 전체 gate와 이후 실제 원격 backup 시점의 profile 검사는 별도다.
- `INC-QA-048` 로컬 진단 보강·회귀 통과: 기존 `/audio-qa`는 재생 중→대기만 표시해 정상 종료를 나중에 확실히 대조하기 어려웠다. 기존 `speakText`의 실제 onend가 true로 끝난 뒤에만 언어별 정상 종료 횟수와 마지막 결과를 표시한다. 실패/중단/언어 변경의 늦은 응답은 성공으로 세지 않는다. 단위 7개 및 진단 완료 표시를 추가한 최종 전체 E2E 207/32/0을 통과했다. 이는 실제 Chrome 가청 증거가 아니며 음성 코어 또는 R2 정책 변경도 아니다.
- `INC-PERF-049` Preview 발견·수정 중: 새 세션 시작의 직렬 D1 조회가 실제 원격에서 느렸다. 합성 Preview 계정 N5/20분의 create는 HTTP 200이지만 **7,312ms**, 이어 current GET은 **2,118ms**였다. 브라우저의 5초 navigation 검사 실패를 단순 timeout 확대로 처리하지 않는다. 전체 Preview 76건 실행은 반복 실패를 확인한 뒤 exit 130으로 중단했으며 통과 판정하지 않는다. 선택하지 않을 콘텐츠의 반복 조회와 단계별 publication 조회를 줄이되, 공개 상태·계정/트랙·급수·ref hash·서버 채점 계약은 유지한다. 실제 Preview 성능 재측정과 전체 영향 E2E 통과 전 Production 금지.

`INC-PERF-049` 로컬 후속: D1 read batch·선택 문항만 hydrate·mode별 독립 조회로 최적화했다. 생성 ≤18회/재개 ≤5회 왕복 회귀를 통과했다. 별도 reviewer가 schema-valid `id:version` 구분자 충돌과 문자열 bank ID/숫자 canonical ID 충돌을 찾아 공개 상태·해설 연결 위험을 차단했다. 수정 전 3개 실패를 직접 재현하고 JSON tuple/type guard 뒤 3개 및 전체 routes 114개를 통과했다. 이 두 사례는 현재 운영 데이터 발생으로 확인한 것은 아니다. 최종 로컬 전체 gate는 Ops26/DB126/Web113/API162, fresh0028까지 exit0이며 실제 원격 성능은 별도 검증한다.

- `INC-QA-050` 원격 긴 시나리오 예산·관측 보강: 성능 Worker 후속 Preview에서 시작 navigation은 통과했지만 ko/ja 전체 세션 시뮬레이션이 각각 7/11단계에서 runner의 **총30초** 한도에 도달했다. 이 실패를 단일 요청이 빨랐다는 증거로 바꾸지 않는다. 독립 검토로 aggregate timeout과 개별 요청 지연 증거 부족을 구분했다. 두 full-session 테스트의 원격 총예산만90초로 분리하고 각 UI action·API GET·기존 poll/navigation 5초 한도를 유지/명시했다. 실제 study write 응답의 status·완료 시간을 수집해 하나라도 ≥400 또는5초 초과면 실패한다. 나머지 테스트의 시간 한도는 바꾸지 않았다. 최초2건 실패 후 전체실행 중단(exit130) 로그는 `perf-preview-e2e.log`에 보존하며 재검증 결과는 별도 기록한다.
- `INC-SRS-051` Preview 재현·수정 중: 자유 복습에서 starter 클릭 뒤 빈 상태가 유지되어 Chromium2개 검사가 실패했다. 독립 API 진단에서 init201/created10, due200/동일10개, stats200/new10이었으나 due_at이 기기 조회 완료 시각보다1.636초 미래였다. `useDueCards`가 서버 due 결과를 기기시각으로 다시 필터링하고 시간 경과에는 재평가하지 않는 코드와 교차확인했다. 서버가 due로 반환한 스냅샷은 표시하되 이후 로컬 평가로 바뀐 카드를 stale 응답으로 되살리지 않는 회귀를 추가한다. 실제 FSRS날짜·상태나 사용자 기록을 보정·초기화하지 않는다. 전체 Preview gate는 이 결함 해결 전 차단한다.
- `INC-QA-052` mock 기록 화면의 원격 interception 누락: WebKit에서 기대 fixture1/4 대신 실제 빈 계정0/0이 표시됐다. route 호출 counter를 추가한 재현에서 실제 interception0회로 실패했다. 이 테스트만 service worker를 차단해 mock UI 검증 경계를 고정하며, 나머지 실제 API·학습·PWA 검사는 service worker를 유지한다. mock 결과를 운영 활동 통계 또는 실제 저장 검증으로 사용하지 않는다.

전체 브라우저 1차 실행은 과거 홈/더보기/즉시 완료 계약을 기대한 테스트에서 실패했다. 승인된 새 UX 계약으로 갱신하고 WebKit 실제 select 높이 결함을 수정했다. 독립 교차검토 후 두 기기 충돌 시나리오를 양 엔진에 추가한 최종 전체 실행은 `207 passed / 32 skipped / 0 failed`다. 중간 navigation 대기 누락 두 실패도 수정 후 전체 재실행했으며 실패 로그를 보존한다. 상세 범위와 미완료 gate는 [학습 경험 구현 계획](LEARNING_EXPERIENCE_PLAN.md)에 기록한다.

진행 계획은 [학습 경험 구현 계획](LEARNING_EXPERIENCE_PLAN.md)을 따른다. 이번 후보의 테스트와 실제 배포 증거가 확보되기 전에는 closed로 표시하지 않는다.

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
| `INC-GIT-009` | 당시 checkout의 복구 파일 커밋 미완료 | 제한된 실행 환경에서 `.git/index.lock: Operation not permitted` | `.git` 쓰기 복구 후 원래 checkout에서 검증·commit·tag·원격 push 완료 | 원격 branch에 동일 SHA가 없으면 Preview/Production 근거로 사용 금지 |
| `INC-DOC-010` | 문서가 `Google-only`와 완료 상태를 사실보다 강하게 표현 | browser API가 Google 브랜드 voice를 항상 열거한다는 잘못된 가정, 미실행 항목까지 완료로 서술 | 런타임 계약과 완료 정의를 현재 코드·증적에 맞게 수정 | 문서 링크 검사와 이 오류 원장 갱신을 같은 변경에서 수행 |
| `INC-QA-011` | 변경 작업 중 OpenAPI 검사 자체가 최신 생성물도 HEAD와 다르다는 이유로 실패 | 기존 gate가 생성 전후가 아니라 `git diff`로 미커밋 변경 전체를 비교 | 생성 전후 파일 내용을 비교해 stale 생성물만 실패하도록 수정 | 소스와 생성 타입을 함께 갱신하고 `openapi:check` 통과 필수 |
| `INC-E2E-012` | 전체 WebKit 실행에서 `/reading` stall과 브라우저 allocator panic 발생 | 반응형 테스트가 각 viewport마다 page를 9번 생성·폐기해 전체 suite 누적 후 WebKit 자원을 고갈시켰고 기본 30초 예산도 부족 | viewport마다 한 page를 재사용하고 다중 라우트 예산을 120초로 명시; 새 Chromium·WebKit 기능 E2E `128 passed / 2 skipped` | 이후에도 전체 기능 E2E 종료 코드 0 필수 |
| `INC-REL-013` | 검증된 복구본을 당시 checkout/원격 branch에 기록하거나 배포하지 못함 | 제한된 실행 환경의 `.git`·DNS·브라우저 접근 차단 | source `2bd657e...`를 원격 branch/tag에 고정하고 Preview·Production 배포 완료 | 원격 branch SHA·Preview deployment ID·Production deployment ID가 없으면 배포 완료 금지 |
| `INC-BROWSER-014` | 실제 Chrome Production에서 한국어·일본어 버튼 클릭 뒤 성공·실패 UI가 없고 문구도 `Google-only`였음 | 당시 `https://nihongo-n3.pages.dev/audio-qa`가 회귀 배포를 제공하며 두 언어 버튼 클릭 후 DOM 상태 변화가 없었음; isolated world의 Web Speech 부재는 main-world 장애 근거로 사용하지 않음 | 오류/unavailable UI와 browser-speech 정책을 복구해 Production `9cc58a1f`에서 양언어 `onend`·console error 0 확인 | Production URL의 새 asset/문구, real-page `onend`, 양 언어 재생, R2/legacy 요청 0건 확인 필수 |
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
| `INC-OPS-025` | 첫 원격 운영 상태 검사에서 R2 참조 0건 검사가 Cloudflare `7403`으로 실패 | package 명령이 Production D1 이름·config를 명시하지 않고 binding 별칭에 의존해 실행 문맥에 따라 잘못된 계정 대상을 선택 | `nihongo-n3-prod-v2`와 `apps/api/wrangler.toml`을 명시하고 JSON 결과의 `total=0`을 구조적으로 검사; 오류 상세의 account 경로는 redaction | `pnpm ops:status:remote`가 Pages·Worker·D1·HTTP·R2를 합쳐 실패 0으로 끝나야 함 |
| `INC-OPS-026` | 비대화식 fresh D1 개선 직후 Wrangler가 `Unknown argument: yes`로 중단 | Wrangler 4.103.0의 `d1 migrations apply`에는 `--yes` option이 없는데 지원 여부를 확인하지 않고 세 verifier에 추가 | 독립 Sub Agent가 commit 전 차단; `--yes` 제거 후 child process에 `CI=true`, `WRANGLER_WRITE_LOGS=0`을 주입하고 fresh D1 재실행 통과 | 운영 CLI option 변경은 실제 설치 버전의 `--help` 또는 실행으로 확인하고 전체 `ops:verify` exit 0 전 commit 금지 |
| `INC-OPS-027` | 운영 상태의 production ID 동기화가 README 또는 분석 문서 한쪽만 맞아도 통과 | 기존 검사가 OR 조건을 사용하고 Pages deployment ID는 제외 | 5개 식별자를 README와 코드 분석 문서 각각에서 검사 | 한 문서라도 값이 없거나 stale이면 local gate 실패 |
| `INC-OPS-028` | auth proxy가 HTML 오류 문서를 HTTP 200으로 반환해도 remote 상태 검사가 통과 가능 | status code만 검사하고 content-type과 API body를 읽지 않음 | JSON content-type, `google_enabled=true`, `auth_mode=app-session`을 구조적으로 검사 | 세 계약 중 하나라도 다르면 remote gate 실패 |
| `INC-OPS-029` | `ops:verify`를 전체 gate라 기록했지만 음성 provenance는 별도 수동 명령 | fresh D1이 speech binding/legacy R2 provenance verifier를 호출하지 않음 | disposable D1의 모든 fixture 적용 후 provenance verifier를 `verify:fresh`에 편입 | 음성 provenance 6개 검사 중 하나라도 실패하면 전체 gate 실패 |
| `INC-OPS-030` | 음성 provenance 편입 첫 실행에서 의도적 `unavailable` TOPIK fixture 1건을 오류로 오판 | schema는 `ready|unavailable`을 허용하고 unavailable 사유를 강제하지만 verifier가 `ready`만 허용 | stable ref/provider/role과 `ready|unavailable` 상태를 허용하고 별도 메타데이터 검사로 unavailable 사유 검증 | 의도한 unavailable과 실제 binding 누락을 구분하지 못하면 배포 차단 |
| `INC-TOPIK-031` | Production TOPIK status가 v2 300문항 공개 상태인데 `placement-v2`, TOPIK I만 반환하고 쓰기를 비활성화 | track status 쿼리만 비공개 legacy `bank_version='v1'`을 검사; practice API는 v2를 읽고 web cache key는 잘못된 release를 사용 | 로컬 후보는 v2 다섯 영역 각 60개를 요구하고 `topik-i-ii`를 반환하도록 수정, 300행 통합 테스트와 원격 status gate 추가 | Worker 배포 뒤 TOPIK I·II, 3영역, `write_enabled=true`가 실제 응답에 없으면 미해결 |
| `INC-ACT-032` | quiz 결과 저장 batch가 실패해도 결과만 저장하거나 완료된 attempt를 다른 답으로 재제출해 N3 응답·weakest·성장 지표가 어긋날 수 있음 | activity 실패 catch가 quiz만 update했고, 완료 여부 검사 없이 attempt는 덮어쓰면서 결정적 event ID는 첫 값을 유지 | 구 schema fallback 제거, 결과+activity batch 실패는 500, 완료 attempt 재제출은 409; guarded update와 rollback·다른 답 재제출 회귀 테스트 추가 | quiz 결과와 activity 중 한쪽만 저장되거나 실패를 2xx로 숨기거나 완료 attempt가 다시 변경되면 배포 차단 |
| `INC-AUD-033` | R2 참조 0건 verifier와 CSP가 TOPIK·source asset·legacy binding을 포함하지 않아 전체 차단으로 오인 가능 | verifier는 JLPT 5개 열만 집계하고 CSP는 R2 media origin을 허용 | 전수 SQL을 9개 surface로 확대하고 purge inventory도 같은 범위로 정렬, CSP `media-src 'none'`, 정적·원격 gate 추가; 현재 Production 실제 참조 0건은 read-only로 별도 확인 | 전수 합계 0, CSP R2 미허용, legacy API 410 중 하나라도 없으면 배포 차단 |
| `INC-LEGACY-034` | OA 전환 전 중복 route, 비canonical migration, client `audio_path`/server-source no-op이 현재 구조처럼 남음 | 과거 호환 코드를 계약 종료 후 정리하지 않음 | 참조 0을 독립 감사로 확인한 route 5개와 migrate 4개 삭제, browser text-only DTO/UI로 축소 | DB legacy 열·테이블은 schema만 삭제하지 않고 별도 migration+upgrade/fresh 검증 전까지 보존 |
| `INC-OPS-035` | 확대된 R2 원격 verifier가 실제 참조 0건인 Production에서 SQLite `too many terms in compound SELECT`로 실패 | 9개 표면을 한 `UNION ALL`로 묶어 legacy view 확장 시 D1 planner 제한을 넘음 | 각 표면을 독립 read-only count로 실행하고 결과 수·타입을 검증; DB `114/114`와 Production 9개 표면 합계 `0` 재확인 | 여러 legacy 표면을 하나의 compound SELECT로 합치지 않고 모든 결과 집합을 구조적으로 확인 |

## 현재 복구 검증 스냅샷

2026-08-24 KST에 현재 작업 트리에서 다시 실행한 결과다. 아래 실제 Chrome 행은 현재 Production의 페이지 lifecycle 증거이며 물리 스피커 가청 증거와 구분한다.

| 검사 | 결과 | 판정 |
| --- | --- | --- |
| 복구 소스 84개와 안전 커밋 파일 SHA-256 비교 | 불일치 `0` | 통과 |
| bundle/patch `SHA256SUMS`, `git bundle verify` | 모두 `OK`, complete history | 통과 |
| `pnpm docs:check` | 문서 51개, 상대 링크 52개 | 통과 |
| `pnpm release:verify:audio-contract` | same-language fallback/R2 금지 | 통과 |
| `pnpm test:ops` | `23/23` | 통과 |
| `pnpm typecheck` | Web/API/DB/shared 종료 코드 `0` | 통과 |
| DB unit | `112/112` | 통과 |
| Web unit | `34 files / 93 tests` | 통과 |
| API unit | `8 files / 131 tests` | 통과 |
| `pnpm build` | Web build와 Worker dry-run 종료 코드 `0` | 통과 |
| fresh D1 재실행 | migration `0000–0027`, seed, 음성 provenance 6개, FK/FTS, release contract/control-plane 완료 | 통과 |
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
| 운영관리 상태 검사 | local `37 passed / 2 known warnings / 0 failed`; remote read-only `47 passed / 2 known warnings / 0 failed`; Ops unit `23/23` | 통과 |

## 강제 릴리스 gate

### 2026-09-06 안정성 목표 후속 — INC-AUTH-054

현재 auth store가 로그인/가입 뒤 `setTrack` 결과의 실패를 무시하고 원하는 트랙을 로컬 사용자에 적용할 수 있는 경로를 독립 검토에서 발견했다. `auth-track-fail-first-2026-09-06.log`에서 login/register2건 실패를 재현했다(실제 운영 발생 증거는 아님). 서버 로그인 성공은 유지하되 트랙 변경 실패 시 서버가 반환한 트랙과 로컬/Dexie namespace를 일치시키고 오류를 보존하도록 최소 수정했다. 실패2건과 정상 변경2건을 포함한 독립20개 단위·typecheck는 통과했고 전체/원격 새 후보 검증은 아직 필요하다. OAuth 재설계나 운영 자격 증명 변경은 이 수정 범위가 아니다.

### INC-LEARN-055 — 종료된 세션의 생성 요청 ID 재전송

종료된 세션의 원래 request_id를 다시 보낼 때 새 open session이 존재하면 최신 세션을 반환하는 쿼리 결함을 독립 검토와 fail-first3건으로 재현했다(완료·중단 후 재전송, 동시 생성 경합 복구). 운영 발생으로 단정하지 않는다. 정확한 request_id를 우선 정렬하고 최초/경합 조회를 공유하는 최소 수정 후3건 및 당시 전체 API165개를 통과했다. 공개 API/schema·계정/트랙 조건·조회 횟수는 유지한다. 후속 source793b671의 Preview Worker b02f3674에 반영했고 실제 HTTP 재전송 검사도 통과했다. Production은 미반영이다.

### INC-PWA-056 — Preview WebKit의 SW access-control 오류

source5311ab7 Pages d51a81ed/Worker0b20e39 원격78건은 **73 pass / 4 fixture skip / 1 fail**,14.9분·exit1로 끝났다(`srs-preview-final-e2e.log`). WebKit 한자 퀴즈는 문제/선택지가 표시됐지만 `sw.js due to access control checks` pageerror로 실패했다. SW파일의 후속 read-only HTTP는200/application-javascript였고 같은원인으로 단정할 network trace는 최초실행에 없었다. 테스트에서 오류를 제외하지 않고 trace를 포함해3회 반복 진단한다. 나머지통과와합쳐전체통과라고기록하지않는다.

후속 반복3건은 모두통과/exit0였고 각trace의SW요청은200/application-javascript·failure없음이었다(`webkit-sw-diagnostic.log`, `webkit-sw-network-summary.jsonl`). 원인미확정이며 최초실패를삭제하거나글로벌SW오류를무시하지않는다.

별도 Chrome 관측(09:39 UTC): d51a81ed audio QA의 SW/modulepreload 경고6개가 보였다. 독립 HAR 검토에서 vendor-query/db/state의 중복 응답은 모두200·SW cache·전송0·error 없음이고 각 본문은 현재 배포 파일 SHA-256과 일치했다. HTML/main import/precache 연결과 관련 source 설정도 일치한다. 기능 실패는 확인되지 않았지만 깨끗한 프로필 재현이나 무해함을 확정한 것은 아니다. WebKit 오류와 같은 원인으로 합치지 않고 SW 비활성화·오류 무시·preload 제거를 실행하지 않는다.

### INC-SET-057 — 프로필 조회 중 해설 언어가 로컬에만 저장됨

Preview 인증/설정 20건은 **14 pass / 6 fail**, exit1이었다(`auth-settings-preview.log`). Google 관련 4건 중 2건은 비활성 anchor에 link role을 요구한 테스트 오류이고, 나머지 2건은 실제 OAuth start 503이다. 설정 2건은 profile 저장200 뒤 새 Settings 화면에서 해설 언어를 바꿨지만 PUT이 없었다. `Settings.tsx`가 조회 중 undefined와 확인된 `configured:false`를 같은 null 성공으로 취급하는 코드와 교차확인했다.

확장 fail-first는 **3 fail / 3 pass**였다. 프로필 조회 중 로컬 변경 1건과 저장 응답 전에 계정/트랙이 바뀌는 2건을 재현했다. 최소 수정은 조회 중/오류 시 선택 차단, 조회 완료 후에만 저장, 요청 당시 계정·트랙·cache scope 보존이다. 기능 플래그 false와 확인된 미설정 계정의 기존 로컬 설정은 유지한다. 독립 검토와 Settings7·store15 단위 **22 pass**, 실제 서버 응답을 지연시킨 회귀 포함 양 엔진 로컬 설정 **14 pass / 0 skip / 0 fail**, typecheck·diff check exit0이다. 후속 Preview555fc0c4에 반영했으며 원격 검증 결과는 아래에 분리한다. 시간 한도나 PUT 검사를 완화하지 않았다.

Google 버튼 검사는 실제 `/auth/config`의 boolean과 href/aria-disabled/안내문을 대조하도록 바로잡았다. 별도 OAuth start의 strict302 조건은 유지한다. 같은 Preview 재검사 **2 pass / 2 fail**, exit1(`sso-config-crosscheck.log`): 비활성 상태 표시는 통과하지만 실제 start는 양 엔진 모두503이므로 SSO 통과가 아니다.

Google SSO Preview 상태는 별도 **미검증 gate**다. Pages와 직접 Worker의 `/auth/config`는200·`google_enabled:false`, `/auth/google/start`는503이다. `wrangler.toml`이 콜백/secret 별도 승인 전 비활성 상태를 명시한다. 이를 발음 오류나 로그인 성공으로 해석하지 않는다. 실제 Google provider→callback→session→기존 사용자 확인은 Preview용 설정/테스트 계정이 준비되기 전 완료로 표시하지 않는다.

source793b671의 새 Preview555fc0c4/b02f3674 후속: 일반 설정4건은 실제 PUT/GET/reload를 양 엔진에서 통과했다. 첫14건11 pass/3 fail의 추가 실패1건은 지연 테스트 interception0으로, 해당 describe만 SW 제어 후 정확한 설정/테마14개를 모두 통과했다. 실제 payload·횟수·시간 한도를 완화하지 않았고 일반 설정/PWA는 SW 허용을 유지한다(`INC-QA-052`와 같은 테스트 제어 경계). SSO503 두 실패는 별도 유지한다. 독립 HTTP의 종료 세션 request_id 보존도 새 Worker에서 통과했다. Production은 미반영이다.

555fc0c4의 첫 실제 음성 관측은 일본어 재생 중 이후 native `cgWindowNotFound` 및 tab `Debugger unattached`로 중단됐다. 당시 새 배포의 정상 종료·한국어·network·사람 확인은 미완료로 기록했다. 연결 문제를 제품 무음으로 진단하지 않으며, 탭 연결 복구 후의 결과는 아래에 별도로 기록한다. 이전 두 Preview의 음성 증거는 별도 source에만 유효하다.

10:06 UTC 후속은 새 Chrome 탭 연결에 성공해 일본어·한국어 정상 종료 각1회와 탭 콘솔 warn/error0을 확인했다. native Network는 같은 오류로 수집하지 못했으며 사람 확인도 최신 후보에는 없다. strict predeploy4개 누락·exit1을 보존한다. 따라서 이전 관측 중단은 복구됐지만 전체 음성 gate가 해결된 것은 아니다. 질문 URL이 a95437fc인 사용자의 가청 확인을555fc0c4로 옮기지 않는다.

### INC-QA-052 후속 — 자연 일본어 검색 fixture의 실제 API 유출

555fc0c4 원격 기능 전수 검사에서 WebKit `natural-search.spec.ts:17`이 고정 fixture 문구를 찾지 못했다. 독립 trace 검토에서는 route 등록이 있지만 fulfill 호출0이며 실제 `/ai/translate`가200/4,102ms로 다른 번역문을 반환했다. 실패 화면과 `NaturalJapaneseSearch.tsx`를 대조해 실제 응답 문장을 정상 표시한 것을 확인했다. 따라서 이 실패는 변환 결과 미표시나5초 지연 초과로 진단하지 않는다. SW 관련 routing 누락이 유력하나 직접 인과는 비교 실행 전 미확정이다.

기존 전체187건은178 pass/6 skip/3 fail·exit1로 보존했다. 종료 후 counter와 POST/body 계약만 먼저 추가한 WebKit fail-first1건에서 expected1/actual0·5초 실패를 재현했다. 번역 mock 사례만 nested describe에서 SW를 차단한 뒤 원격 양 엔진4건이 모두 통과했다(12.2초·exit0). sidebar·실제 학습·PWA·전역 설정·고정 문구/검색/URL/시간 한도는 유지한다. 로그는 `natural-search-fail-first-2026-09-06.log`, `natural-search-scoped-preview-2026-09-06.log`다. 앱·AI 설정·음성·DB 계약은 변경하지 않았으며, 부분 mock UI 통과를 실제 AI provider 품질 또는 전체187개 통과로 바꾸지 않는다.

### 2026-09-06 후속 — INC-SRS-053

로컬 수정 검증: source440개 gate·fresh0028 및 최종 전체 브라우저211 pass/30 시각-policy skip/0 fail, exit0을 통과했다. 서버due clock-skew와 숨긴 면/키보드 회귀를 포함한다. 아래 중간 실패는 보존하고 새 Preview 확인 전 Production closed로 표시하지 않는다.

최종 로컬 E2E 첫 실행은 `209 passed / 30 skipped / 2 failed`, exit1이었다(`learning-experience-2026-09-06-srs-final-e2e.log`). 기존 SRS 음성 테스트의 조기 skip을 제거하자 앞면 상태에서 뒷면 발음 버튼을 누르려는 잘못된 테스트 순서가 드러났다. 두 엔진 모두 앞면의 pointer interception으로 실패했으며 음성 엔진 실행 실패로 해석하지 않는다. 동시에 CSS 3D 회전만으로 숨긴 뒷면이 접근성 트리/키보드 탐색에 남는 UI 결함을 확인했다. 앞면에서는 뒷면 조작을 노출하지 않고 실제 뒤집기 후 발음 버튼을 클릭하는 회귀로 고정한다. 수정 뒤 전체 gate와 새 Preview 검증 전에는 해결 완료로 표시하지 않는다.

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

- 로컬 안전 bundle의 ref는 당시 복구 checkpoint이며, 최종 source `2bd657e96d8a43c6d28efe414acd468c1abd0861`과 release tag는 현재 원격에 반영됐다.
- bundle: `.artifacts/recovery/audio-2026-08-23/jlpt-audio-recovery.bundle`
- patch: `.artifacts/recovery/audio-2026-08-23/0001-fix-restore-JLPT-and-TOPIK-browser-speech.patch`

이 artifact는 작업 유실 방지용이며 원격 커밋·Preview·Production 배포 증거를 대신하지 않는다. checksum은 같은 디렉터리의 `SHA256SUMS`에서 확인한다.

세부 원인과 릴리스 증적은 [브라우저 음성 회귀 기록](TOPIK_GOOGLE_SPEECH_INCIDENT_2026-08-23.md), 전체 운영 기준은 [현재 상태](CURRENT_STATE.md)를 따른다.
