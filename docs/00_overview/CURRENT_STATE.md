# 현재 구현 상태

문서 갱신: 2026-09-07 KST. 아래 Production 기준선과 새 로컬 후보를 구분합니다. 새 노트북에서 상태를 복원할 때 가장 먼저 읽는 운영 기준입니다.

> 2026-08-24 음성 장애를 다시 조사해 같은 언어 fallback 제거뿐 아니라 첫 클릭 전 비동기 voice 대기와 설치형 PWA의 이전 JS 잔존을 확인했습니다. 현재 코드는 click task 안에서 즉시 재생하고 새 service worker가 기존 client를 한 번 갱신하도록 복구했습니다. 실제 배포 상태는 아래 릴리스 기록과 음성 장애 기록을 기준으로 판단합니다.

현재 오류와 배포 차단 조건의 단일 원장은 [오류·회귀 차단 원장](ERROR_LEDGER.md)입니다. 미실행·인프라 실패·mock 결과는 통과로 간주하지 않습니다.

GitHub는 공개 원격에서 **commit·branch·tag 보관** 범위로만 사용합니다. 저장소 Actions는 실행이 차단된 상태로 운영하며, 로컬 검증은 [로컬 CI/CD 운영 기준](LOCAL_CICD_OPERATIONS.md), Cloudflare deployment와 rollback ID는 [로컬 형상관리·릴리스 원장](LOCAL_RELEASE_LEDGER.md)에 기록합니다.

새 작업자와 Sub Agent의 단일 진입점은 [Sub Agent 운영 인수인계](SUB_AGENT_HANDOFF.md)입니다.

운영·버그·리팩터링 추적은 루트 `AGENTS.md`, 프로젝트 스킬 `.codex/skills/project-operations-steward`, [운영관리 runbook](OPERATIONS_MANAGEMENT_RUNBOOK.md)을 단일 절차로 사용합니다. `pnpm ops:status`는 로컬 계약을, `pnpm ops:status:remote`는 Git·Cloudflare Production의 읽기 전용 상태를 JSON artifact로 기록합니다.

## 상태 요약

| 구분 | Production 기준 |
| --- | --- |
| D1 migration | `0000–0027` |
| Worker | `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872` |
| Pages | `https://9cc58a1f.nihongo-n3.pages.dev` (canonical `https://nihongo-n3.pages.dev`) |
| web source SHA | `2bd657e96d8a43c6d28efe414acd468c1abd0861` |
| Worker/content release SHA | `3485c6ef8addda3cd3e209730646c296175cf3c9` |
| 콘텐츠 release | N3 120, TOPIK owner Batch 5 20, historical TOPIK practice v2 300 모두 published |
| release control | quality requirements/links와 G0–G4 production 연결 |
| 다음 증량 후보 | Preview만 published: N2 60, N1 60, TOPIK owner Batch 6 40; Production 미반영 |

## 최신 후속 — 승인된 운영 백업·점검 종료 (2026-09-07)

사용자의 명시적 점검 승인으로 00:21–00:27 KST에 기존 코드의 임시 읽기 전용 Worker232ec50d와 두 Queue 일시정지를 적용했습니다. 코드 etag/runtime/점검 이외 binding은 기존6bbe4bbd와 일치했고 활성 Workflow·release job·Queue backlog는0이었습니다. 새 앱/Pages/콘텐츠/migration은 반영하지 않았습니다.

새 백업 `.artifacts/d1-backups/learning-ux-2026-09-07-pre0028`은65개 테이블·checksum을 확인했습니다. 임시 로컬0028 복원은65개 행 수·56개 trigger·FK0·FTS 일치로 통과했습니다. 새5개 테이블은0행이며 `coversLocalSchema=false`인0027 백업입니다. 백업 후 원래 Worker6bbe4bbd·두 Queue를 복귀했고 별도 원격 확인에서 maintenance=off, health/auth config200, Google설정true와 비인가 activity401을 확인했습니다. 운영 설정도 사전 hash와 일치합니다.

첫 wrapper는 원복 직후 `Maintenance health mismatch`로 exit1이었으며 원인은 미확정입니다. 검증기의 별도 auth envelope 오류(`INC-OPS-058`)를 교정한 postcheck는 exit0이고 최초 실패를 보존합니다. 최종 remote ops는48/2/3으로 기존 미push SHA·TOPIK status·CSP 실패만 남습니다. 최신555fc0c4 사람 가청, release-source 고정 live manifest 및 최종 predeploy는 아직 미완료이며 신규 Production 배포·최종 push를 실행하지 않았습니다. 점검 승인은 가청 확인을 대체하지 않습니다. 다음 배포 시 백업 이후 쓰기가 재개됐음을 고려해 백업 신선도를 다시 확인해야 합니다.

## 이전 후속 — Preview 전용 OAuth 연결 (2026-09-06)

사용자는 운영 OAuth 보존과 Preview 전용 클라이언트 생성·비밀키 다운로드/등록을 명시 승인했습니다. Google Cloud의 새 `JLPT Preview`는 Preview Worker callback 하나만 등록하며 기존 `JLPT` 클라이언트를 수정하지 않았습니다. Preview Worker **`87f8fbf5-97e3-4a99-96cb-3cf607911d48`**을 활성화했습니다. 직전 `b02f3674`와 script etag·runtime·OAuth 두 secret 이외의 versioned binding이 일치하고 앱 source793b671, Pages555fc0c4, D1을 유지합니다. CLI가 Preview의 non-versioned logging 설정도 config에 동기화했으므로 그 사전 값까지 동일하다고 주장하지 않습니다.

`/auth/config`는 google_enabled=true이며 Google 시작302가 확인됐습니다. 실제 Chrome에서 Google 계정 선택→Preview callback→branch alias 학습 홈 복귀와 홈 재조회 로그인 유지를 확인했습니다. TOPIK 선택→로그아웃→`track=topik-ko` Google 재로그인→TOPIK 홈도 통과했습니다. 독립 D1 비교는 연결 계정1명, id/role/google_sub/email 및 FSRS 설정 hash 동일, 의도한 track만 변경됨을 확인했습니다. 로컬 인증 회귀14개도 exit0이나 provider mock과 실제 SSO 증거는 구분합니다. 최종 원격187개는 **181 pass / 6 로컬 fixture skip / 0 fail**,23.3분·exit0입니다. 시각60개는 별도 제외하며 이전 전체 실패를 덮어쓰지 않습니다. Google 연결 Preview 계정의 학습 테이블17개는 비어 있어 실제 기존 비어 있지 않은 이력 보존 증거로 확대하지 않습니다.

최신555fc0c4의 native Network 기록 중 새로고침→일본어/한국어 정상 종료 각1회도 확인했습니다. sanitized HAR14개 HTTPS 요청은 모두 동일 Preview origin/200, UI의 추가2개는 확장 리소스이며 R2/legacy audio 요청0입니다. Console은 preload 경고2·오류0입니다. 새 URL의 사람 청취 답변은 대기하며 과거 가청 답변을 재사용하지 않습니다. 증적은 `stability-preview-actual-audio-network.json`, `stability-chrome-network.har`입니다(운영 artifact의 learning-experience 날짜 prefix).

사용자는 최종 테스트 통과 후 Production 배포·최종 push를 승인했습니다. 아직 Production 변경·최종 push는 실행하지 않았습니다. 새 backup/restore와 점검 시간 승인, 최종 gate가 필요합니다. 최신 Production 읽기 전용은48 pass/2 warn/3 fail이며 기존 Worker6bbe4bbd/Pages9cc58a1f, Google 설정true·R2참조0·legacy410을 재확인했습니다. 실패는 미push SHA차이와 기존 TOPIK status/CSP입니다. pending migration은0028 하나이고 release job의 대기/처리/승인/재시도는0이나 실제 Queue/Workflow 활성은 미확인입니다. live manifest 자체를 이 점검에서 검증했다고 표시하지 않습니다. 아래 b02f3674/SSO503/음성 network 미확인 기록은 수정 전 이력입니다.

## 2026-09-06 학습 경험 후보 — Preview 검증 중, Production 미반영

상세 설계·API·DB·검증 범위는 [매일 이어지는 학습 경험](LEARNING_EXPERIENCE_PLAN.md)에 통합합니다. 출발 HEAD는 `cb064e19dd3645076c7f17f7e82deddaee5ae4cc`, 후보 `94dfb052c5ff73caaa70692f1d023bdaae439c8f`는 feature branch에 commit/push하고 전용 Preview에 반영했습니다. Production은 위 기준선을 유지합니다.

- 오늘/학습/문제/복습/기록과 한 번 눌러 시작·세션 재개를 구현했습니다. 공개 화면·가입/로그인·TOPIK 조작 안내는 ko/ja/en으로 분리하고 명시적인 기존 언어 선택은 보존합니다.
- 새 migration `0028_learning_experience.sql`은 프로필, 세션, 단계 결과, 메모, 검수된 문제↔개념 링크 다섯 테이블만 추가합니다. 기존 공개 콘텐츠, FSRS, progress, daily_logs는 재시드·초기화하지 않습니다.
- `/learning/profile`, `/study/sessions`, `/learning/records`, `/learning/annotations`, 유형별 `/learning/content/:type/:id`, 소유권 검사 후 `/quiz/attempts/:id` 결과 조회를 추가했습니다. 공통 TOPIK 완료·FSRS 저장 서비스를 기존 route와 안내 세션이 공유합니다.
- 해설 열기만으로 TOPIK owner 완료를 기록하지 않습니다. 단계 최초 응답/재시도/학습 완료/복습 평가를 분리하고 서버 채점·원자적 batch·재전송 중복 방지·계정×트랙 격리를 적용합니다.
- 브라우저 음성 코어와 같은 언어 fallback은 보존합니다. 듣기 대본은 응답 전 화면에 표시하지 않지만 브라우저 합성을 위해 API에 text가 필요합니다. R2와 legacy audio 재생 요청은 사용하지 않습니다.
- `VITE_LEARNING_EXPERIENCE=false`로 이전 홈/탐색으로 빌드할 수 있습니다. additive DB는 유지합니다. 전체 Worker/Pages 회귀는 이전 버전으로 되돌리며 이 플래그만으로 모든 수정이 취소된다고 간주하지 않습니다.
- 독립 교차검토로 동시 종료·기기 간 pending/트랙 충돌과 backup 누락을 수정했습니다. `94dfb05` 기준선 gate는 Ops 26, DB 126, Web 113, API 157 및 fresh `0000–0028` 통과입니다. 성능 수정 후 최신 API 162 결과는 아래 후속 후보에 분리합니다. 기존 65개 backup의 실제 local0028 restore도 FK 0으로 통과했습니다. 새 학습 테이블까지 포함한 backup은 70개 profile로 별도 검사합니다.
- `/audio-qa` 정상 종료 관측까지 포함한 로컬 전체 브라우저는 `207 passed / 32 skipped / 0 failed`, exit 0입니다. 실제 Chrome 새 Preview에서 양 언어의 정상 종료 표시를 확인했고 사용자가 **“두 언어 모두 들렸습니다”**라고 가청을 확인했습니다. 이는 해당 Pages 후보의 증거이며 Production 완료 판정은 아닙니다.
- Preview D1 `0028`, Pages `a95437fc-8411-4151-9519-ab0d8fb92905`(source94dfb05)는 유지합니다. 성능 후속 Worker는 `6f0c0e41-1978-42a5-8e3a-3276ed3f1c63`(source0b20e39)입니다. 직전 Worker1fec0907에서 smoke21개 통과·관리자 인증1개 미실행이었으며 후속 검사는 별도로 기록합니다. 기존 콘텐츠 집계·공개 상태·quality link는 보존했고 FK 0입니다.
- 원격 학습 E2E에서는 세션 시작 지연을 발견했습니다(`INC-PERF-049`: create 7,312ms, current GET 2,118ms). 전체 실행을 중단하고 API 조회를 최적화하는 중이며 Preview 전체 gate 또는 Production 완료로 표시하지 않습니다.
- 성능 후속 후보는 API-only read batch와 불필요한 hydrate 제거를 적용했습니다. 독립 검토에서 발견한 ID namespace 두 경계를 fail-first 3개로 수정했으며 전체 Ops26/DB126/Web113/API162·fresh D1 및 로컬 E2E207 pass/32 skip/0 fail을 다시 통과했습니다. Preview 후속 단일 표본은 N5 create/current882/338ms, TOPIK1 814/355ms였습니다. 원격 전체 영향 E2E는 별도 검사 중이며 단일 표본을 성능 보장으로 표시하지 않습니다.
- 후속 원격 검사에서 자유 SRS가 서버due를 기기시각으로 다시 필터링하는 clock-skew 결함(`INC-SRS-051`)을 발견해 Web 수정 중입니다. 원격 나머지72건은32 pass/3 skip/3 fail/34 not-run이었으며 전체통과가 아닙니다. 함께 실패한 mock records는 interception0을 재현하고 해당fixture만SW차단하여2건을 통과했습니다. 상세 재현·계측·최신 후보는 계획/오류원장에 기록합니다.
- 마지막 Production 전체 read-only 재검사는 `49 passed / 2 warnings / 2 failed`, exit1입니다. 실패는 여전히 Production 미반영 TOPIK status/CSP입니다. 06:09 UTC 최초 검사의 R2 7403은 후속 검사에서 재발하지 않았고 9개 표면 참조는 0입니다. 단발 실패의 원인은 미확정으로 보존합니다.

### 배포된 Preview: 복습 카드·검증 경계

기기 시각 차이로 서버 due 카드가 숨는 결함(`INC-SRS-051`), 카드 양면 접근성/키보드 충돌(`INC-SRS-053`)을 수정했습니다. 같은 언어 음성 엔진·API·DB schema·FSRS 날짜·공개 콘텐츠는 변경하지 않습니다. mock 기록 화면의 SW interception과 긴 세션의 개별 요청5초 계측도 독립 검토했습니다. 최신 전체 로컬 gate는 **Ops26 / DB126 / Web126 / API162 = 440개**, OpenAPI·typecheck·build·fresh0000–0028·FK/FTS·품질/control-plane 모두 exit0입니다(`srs-accessibility-full-gate.log`). 전체 브라우저는 **211 pass / 30 시각-baseline 정책 skip / 0 fail**, exit0입니다(`srs-accessibility-final-e2e.log`).

commit/push한 source `5311ab72c2aafa001fb436e50cd1335d775c81b4`를 Pages **`d51a81ed-2561-4900-899f-022b99d67679`**에 배포했습니다. Worker0b20e39/6f0c0e41과 D1은 유지하며 추가 migration/seed는 없습니다. 원격78건은 **73 pass / 4 fixture skip / 1 fail**, exit1입니다. WebKit의 SW access-control 오류(`INC-PWA-056`)는 후속3회 진단에서 재발하지 않았지만 원인 미확정이며 전체 통과로 바꾸지 않습니다. 직전 Pages rollback은 a95437fc입니다.

09:37–09:39 UTC 실제 Chrome Native DevTools 관측에서 양언어 각1회 정상 종료, R2/legacy audio 요청0을 확인했습니다. Network 전체18개 중 sanitized HAR의 HTTPS16개는 모두 해당 Preview origin/200이고 나머지2개는 확장 프로그램 리소스입니다. Console에는 SW/module preload 경고6개·오류0개가 있어 이전 관측의 warn/error0과 분리합니다. d51a81ed의 사람 가청 확인은 대기 중입니다. 사용자의 “두 언어 모두 들렸습니다”는 질문에 명시된 a95437fc/source94dfb05에만 연결합니다.

### 안정성 수정본 최초 Preview 반영 이력 — OAuth 연결 전

- `INC-AUTH-054`: 로그인/가입 뒤 트랙 변경 실패 시 실제 서버 트랙을 유지합니다.
- `INC-LEARN-055`: 완료·중단된 세션의 원래 생성 request_id 재전송이 다른 최신 세션을 반환하지 않게 수정했습니다.
- `INC-SET-057`: 프로필 GET 로딩/실패를 미설정으로 오인하지 않고, 늦은 저장 응답을 원래 계정·트랙에만 연결합니다.
- 독립 Agent 검토·fail-first·단위·실제 DB/API/UI 연동으로 교차검증했습니다. 최신 `settings-final-full-gate.log`는 **Ops26 / DB126 / Web139 / API167 = 458개**, OpenAPI·typecheck·build·fresh0000–0028·FK/FTS·품질/control-plane exit0입니다. 전체 `settings-final-local-e2e.log`는 **217 pass / 30 시각 기준 정책 skip / 0 fail**, exit0입니다.
- 기존 데이터 보존은 양 트랙 사용자 설정·진행률·FSRS·일지·퀴즈·활동이 비어 있지 않은 upgrade fixture로 검사했습니다. OAuth bridge는 실제 local Workers/D1을 쓰지만 Google token/userinfo만 mock이므로 실제 SSO 로그인 증거가 아닙니다.
- 같은 Preview Google 검사 **2 pass / 2 fail**: 비활성 버튼 표시는 정상, 실제 OAuth start는 양 엔진503입니다. Preview 전용 callback/secret은 미설정이며 로컬 값은 Production callback입니다. 임의 복사하거나 실제 SSO를 통과 처리하지 않았습니다.
- 수정본을 로컬 commit `793b671a5c7503017041bbaee4e8de7edb492e20`으로 고정하고 전용 Preview Worker **`b02f3674-6a59-47c8-818a-2397bcd295fd`**, Pages **`555fc0c4-24cc-49de-b846-38aee2f59b31`**에 반영했습니다. 두 source 모두793b671이고 deploy exit0입니다. 추가 migration/seed·Production 변경·최종 push·삭제는 없습니다. Git 원격은5311ab7을 유지합니다.
- 새 Preview Worker smoke **21 pass / 0 fail / 관리자 positive1 미실행**, D1 migration0028·FK0입니다. 독립 실제 HTTP 검사에서 A세션 중단→B새세션→A요청 재전송은 원래 A를 반환하고 current는 B를 유지했습니다. 일반 JLPT/TOPIK 설정의 PUT/GET/reload도 양 엔진 모두 통과했습니다.
- auth/settings 첫14건은 **11 pass / 3 fail**입니다. 2개는 SSO503, 1개는 지연 테스트의 WebKit interception0입니다. 지연 테스트에만 SW 제어를 적용한 뒤 실제 설정·테마 양 엔진 **14 pass / 0 skip / 0 fail**, exit0입니다. 앱/SW source와 배포는 바꾸지 않았고 실제 SSO 실패도 그대로입니다.
- 새555fc0c4의 첫 실제 Chrome 관측은 `cgWindowNotFound`/`Debugger unattached`로 중단됐지만, 10:06 UTC 후속에서 새 탭에 연결해 일본어·한국어 정상 종료 각1회와 탭 콘솔 warn/error0을 확인했습니다. native Network 수집은 여전히 `cgWindowNotFound`여서 요청 수는 미확인입니다. `stability-preview-actual-audio.json`의 strict gate는 가청/확인자/R2·legacy 요청 수 4개 누락으로 exit1입니다. 사용자의 “두 언어 모두 들렸습니다”는 질문에 연결된 a95437fc에만 기록하며 새 후보에 옮겨 쓰지 않습니다.
- 새 Preview의 PC·모바일 원격 기능187건은 **178 pass / 6 로컬 fixture skip / 3 fail**,23.6분·exit1입니다(`stability-preview-full-functional.log`). 실패는 Google SSO start503 두 건과 자연 일본어 번역 fixture 우회 한 건입니다. 시각 suite60건은 이 원격 명령에서 제외했으며 로컬 시각 결과와 구분합니다. 양 엔진·양언어 전체 세션4건은 저장 실패/pending0, 최대 write3,428ms로 통과했습니다. 전 급수 재개·계정/트랙 격리·오프라인 복귀·퀴즈·복습·설정·메뉴 검사를 포함합니다.
- 자연 검색의 mock 누락을 counter0 fail-first로 재현한 뒤 해당 테스트만 SW 제어·요청 계약 검사로 교정했습니다. 원격 양 엔진4개가 통과했고 앱 runtime/source793b671은 유지합니다. 최초 전체178/6/3과 이 부분 통과를 합쳐 전체 gate 통과로 쓰지 않습니다.
- 별도 root 로컬 재검사4개도 통과했고, 독립 Agent가187개 수집/집계·실패 metadata와 Preview health/source를 대조했습니다. 전용 D1 후검사는 FK0·migration0028 적용1회·읽기 전용(rows_written0)입니다. 전체 로컬217개는 자연 검색 테스트 제어 수정 전 결과이며 후속 부분4개와 분리합니다.
- Preview 전용 OAuth 설정/실제 SSO, 최종 source의 실제 음성 증거, 새 Production backup/restore와 릴리스 gate가 남았습니다. 마지막 Production 전체 remote status는 **48 pass / 2 warn / 3 fail**, exit1: 의도적으로 아직 push하지 않은 Git SHA 차이와 기존 Production TOPIK status/CSP입니다. Preview 기능 검사187건과 별개의 집계입니다.

## Production 콘텐츠 (기존 기준선)

manifest `content-v3-d102868e3d43b9b3c1a4`는 26개 source와 canonical 6,501행을 생성합니다.

| 범위 | Production 수량/상태 |
| --- | --- |
| JLPT N5 | 어휘 700, 문법 55, 한자 103 |
| JLPT N4 | 어휘 548, 문법 98, 한자 164 |
| JLPT N3 | 어휘 2,052, 문법 163, 한자 275 |
| 공용/직무/계획 | 예문 1,100, 직무 어휘 82, 주차 계획 52 |
| JLPT N2 | Batch 1–5, 583 canonical행 |
| JLPT N1 | Batch 1–4, 286 canonical행 |
| TOPIK owner | Batch 1–5, 140 unit + 140 item; Batch 5는 1·2급 20개 확장 |
| TOPIK practice | v2 300 공개, v1 28 보존·비공개 |

TOPIK v2 선택형 네 영역은 각각 정답 위치 `15/15/15/15`이고 쓰기 60개는 서술형입니다. 정적 JLPT 독해 분포는 N1 `5/5/5/5`, N2 `10/10/9/9`, N3 `3/3/2/2`입니다.

## Production migration `0024–0027`

- `0024_learning_activity_events.sql`: `(user_id,event_id)` 중복 차단. `content_opened`, `content_completed`, `quiz_answered`, `review_rated`, `speech_attempted`만 저장하고 문제 원문/개인정보는 저장하지 않습니다.
- `0025_jlpt_practice_questions.sql`: 버전형 자체 저작 JLPT bank. 3개 언어 prompt/choice/explanation, 정답 위치, listening script를 보관하며 기본 미공개입니다.
- `0026_release_quality_links.sql`: release별 정확한 audit 요구량과 audit 링크를 추가합니다. 누락·실패·서로 같은 reviewer·다른 버전 링크가 있으면 공개 trigger가 중단합니다.
- `0027_google_speech_contract.sql`: `content_speech_bindings`를 provider `google-browser`, state `ready|unavailable`로 한정합니다. R2 key/asset 필드는 없고 legacy `content_audio_bindings` 신규 insert는 차단됩니다.

release-link trigger는 `0026`에서만 생성되므로 `0025 → 0026` migration 순서가 fresh/upgrade 모두에서 유효합니다.

## 활동 API와 데이터 바인딩

`POST /api/v1/activity/events`는 1–100개 idempotent event batch를 받고 `{accepted,duplicates}`를 반환합니다. 인증된 사용자의 현재 track과 각 event의 `learning_track`이 다르면 거부합니다. `GET /api/v1/activity/summary?window=7d|30d`는 totals와 track/level/section/mode groups만 반환합니다.

웹은 Dexie 4의 로컬 schema version 6에 queue-first로 저장합니다. 처리 중 종료된 항목을 복구하고, offline/실패 시 보존하며, 동일 event ID로 재전송합니다. 큐와 조회 캐시는 계정×트랙으로 격리됩니다. 퀴즈 응답, TOPIK complete, FSRS rating은 서버 데이터 변경과 같은 D1 batch에서 각각 activity event를 기록하며, 어느 문장이라도 실패하면 성공 응답을 반환하지 않습니다.

TOPIK 다음 행동 순서는 `due review → incomplete owner item → weakest area`입니다. `weakest`는 최근 30일 activity를 사용합니다.

## 2026-08-30 로컬 수정 후보 — Production 미배포

- Production read-only 조회에서 TOPIK practice v2 300개는 공개지만 `/tracks/topik-ko/status`가 legacy v1을 조회해 `placement-v2`, TOPIK I만 반환하는 결함을 확인했습니다. 로컬 코드는 v2 다섯 영역 각 60개를 기준으로 `topik-i-ii`, TOPIK I·II와 쓰기를 공개하도록 수정했고 300행 회귀 테스트를 추가했습니다.
- quiz submit의 activity batch 실패를 quiz 결과만 저장하는 성공으로 숨기던 fallback을 제거했습니다. 이제 attempt 결과와 문항별 activity가 함께 반영되지 않으면 500을 반환하며, 완료된 quiz를 다른 답으로 다시 제출하면 409를 반환합니다. guarded update, rollback과 재제출 불변성 테스트가 이를 고정합니다.
- R2 부재 verifier와 purge inventory는 JLPT 열뿐 아니라 TOPIK placement/practice, source asset과 legacy binding까지 집계합니다. immutable legacy metadata가 발견되면 purge 도구는 임의 변조하지 않고 additive D1 purge migration을 요구합니다. API CSP는 `media-src 'none'`이며 server/R2 발음 media origin을 허용하지 않습니다.
- 최종 로컬 gate는 Ops `24/24`, DB `114/114`, Web `93/93`, API `134/134`, OpenAPI `72/12`, build와 fresh D1 `0000–0027`을 통과했습니다. Chromium/WebKit 전체 E2E는 `171 passed / 32 skipped / 0 failed`입니다. 검증 source `58b0ae153a548f942c07b16132eaf9f66beb24f5`를 원격 branch에 push한 뒤 Production read-only 상태는 `50 passed / 1 known warning / 2 failed`이며 두 실패가 바로 미배포 TOPIK status와 CSP입니다. D1의 R2 발음 참조는 확대된 9개 표면 모두 `0`입니다.
- 이 세 변경은 현재 branch의 Worker 후보이며 아직 Production Worker `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872`에 반영하지 않았습니다. Production 상태가 고쳐졌다고 보고하려면 새 승인·Preview·배포·postdeploy status가 필요합니다.

## 퀴즈 전략과 strict-level 규칙

기존 퀴즈 요청/응답은 유지됩니다. `strategy`는 선택적 `random|weakest`이고 기본은 `random`입니다. 웹은 random일 때 해당 필드를 보내지 않습니다. `weakest`는 최근 30일 오답을 우선하되 요청 급수 내부에서만 선택합니다. 풀이 가능한 문제가 부족해도 다른 JLPT 급수로 fallback하지 않고 명시적으로 실패합니다.

## 2026-08-19 Production 콘텐츠 release

- `jlpt-n3-practice-v1-2026-08-19`: 한자 읽기 60, 듣기 60. 각 영역 `15/15/15/15`, quality link 120개, published.
- `topik-owner-batch5-2026-08-19`: 1급 10, 2급 10. 급수별 다섯 영역 각 2개, quality link 20개, published.
- `topik-practice-v2-2026-08-17`: 기존 audit 300개를 historical release에 연결, published.
- 서로 다른 두 adversarial reviewer artifact와 자동 validator 결과가 실제 release-quality link에 연결됐습니다.
- TOPIK listening 4개와 JLPT listening script만 Google 브라우저 음성 대상입니다.

이후 콘텐츠도 fresh schema나 review test만으로 공개하지 않으며 release-quality link, G0–G4, preview, 명시적 production 승인을 요구합니다.

## 2026-08-23 다음 증량 Preview

- `jlpt-n2-practice-v1-2026-08-23`: 60문항, quality link 60, Preview published.
- `jlpt-n1-practice-v1-2026-08-23`: 60문항, quality link 60, Preview published.
- `topik-owner-batch6-2026-08-23`: 3–6급 40항목, quality link 40, Preview published.
- N2/N1은 4개 모드×15, 모드별 난이도 1–5×3, 전체 정답 위치 `15/15/15/15`입니다.
- TOPIK Batch 6은 급수별 10, 5영역×2이며 선택형 정답 위치는 급수별 `2/2/2/2`입니다. listening 8개만 `google-browser` binding을 가집니다.
- Preview 기준 TOPIK owner는 1–6급 각각 30개, 급수·영역별 6개입니다.
- Preview의 release-quality link `60/60/40`, G0–G4 `5/5/5`, release job `6/6/6`, FK 0, idempotent reseed를 확인했습니다.
- 실제 Batch 6 item으로 `완료 → progress → FSRS card → review log → activity event`를 원격 Preview에서 대조했습니다.
- Preview Worker `4c6846d8-7cde-4c2c-916b-533a2db6d76a`; Pages는 UI 변경이 없어 재배포하지 않았습니다.
- 직전 Preview Worker `0de3eaeb-b44c-4eda-b333-e75c639e39a1`은 rollback 대상으로 보존했습니다.

상세 증적은 [2026-08-23 다음 콘텐츠 증량 릴리스 기록](NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md)에 있습니다.

## 브라우저 음성 정책

발음은 Google 브라우저 음성을 우선하고, 없으면 같은 언어의 기기 음성을 사용합니다. 한국어에는 `ko-*`, 일본어에는 `ja-*`만 허용합니다. R2 발음 수집·생성·저장·조회·재생·fallback은 금지합니다. Production R2 pronunciation 참조는 2026-09-06 06:44 UTC 단독 재검사에서 9개 표면 모두 0이었습니다. 같은 날 앞선 7403 실패와 재검사 성공을 `INC-OPS-041`에 함께 보존합니다. legacy `/api/v1/audio/*`와 관리자 생성 경로는 `410 Gone`입니다. Production speech contract는 `ready|unavailable`만 기록하고 실제 음성 binary를 저장하지 않습니다. report/evidence R2는 발음 경로가 아닙니다.

`0027`의 provider `google-browser`와 API의 `kind: "google"`은 데이터/클라이언트 호환용 식별자입니다. 런타임에서 Google 이름을 강제한다는 뜻이 아닙니다. 재생 click에서는 voice 준비를 기다리지 않고 같은 task 안에서 즉시 `speak()`를 호출합니다. 비동기 voice list는 background에서 다음 재생을 위해 준비하며 실제 `onend` 이후에만 `played`를 기록합니다.

Pages `1c3bba90-8990-472b-8bf2-12a08759597f` 배포 당시에는 동일 언어 fallback이 없고 실제 가청 확인도 없었습니다. 그 배포를 검증 완료라고 보고한 판단은 잘못이며, 복구 릴리스는 mock 자동화·실제 Chrome callback·사용자 가청 결과를 구분해 기록합니다.

## 배포 후 검증 기록 — 2026-08-19

- web unit: 34파일, 86테스트 통과
- web production build와 typecheck 통과
- focused Playwright: `learning-activity.spec.ts`, `quiz-modes.spec.ts`, `topik-owner-curriculum.spec.ts`를 Chromium/WebKit에서 24/24 통과
- 브라우저 검증에 Google 우선 동일 언어 일본어·한국어 speech와 `/api/v1/audio/` 요청 0건 포함
- API route tests에 event idempotency/track guard/summary/strict-level weakest 포함
- DB tests에 migration order, release link gate, N3/TOPIK 140개 review coverage, browser-speech/R2 금지 contract 포함
- remote DB verifier와 TOPIK v2 verifier 통과
- remote question quality 332개 검사, 실패 0건
- remote R2 pronunciation 참조 0건
- Chromium·WebKit production E2E 통과

같은 release gate는 다음 배포 직전에도 다시 실행해야 합니다.

```bash
pnpm verify:ci
pnpm docs:check
pnpm -F @nihongo-n3/db question:quality
pnpm -F @nihongo-n3/db content:contract:verify
pnpm -F @nihongo-n3/db content:control-plane:verify
```

## Production 릴리스 기록

### 2026-08-09

- D1 migration 0020–0021, manifest `content-v3-d102868e3d43b9b3c1a4`
- Worker `b959a270-7b2a-46a3-83dc-615ed63f730d`
- Pages `9d8e6460-2e86-477c-8eb8-fc4c41491f4c`
- 23-table backup/restore drill, remote FK/FTS/manifest/R2=0, smoke 통과
- rollback Worker `6e3aad0d-1584-44c5-a46a-f54b968ce606`, Pages `c93f86ba-5b0a-47af-bb30-28f38da4a6b1`

### 2026-08-17

- D1 migration 0022–0023, TOPIK practice v2 300 공개, v1 비공개
- backup `.artifacts/d1-backups/topik-v2-2026-08-17`과 restore drill 통과
- Worker `693837d0-70e0-40b7-9f7e-72487321b6f7`; Pages는 2026-08-09 deployment 유지
- remote question verifier, R2=0, Worker/Pages smoke 통과
- rollback Worker `b959a270-7b2a-46a3-83dc-615ed63f730d`

### 2026-08-19

- D1 migration 0024–0027
- Worker `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872`
- Pages `https://7b0e9050.nihongo-n3.pages.dev`
- source SHA `3485c6ef8addda3cd3e209730646c296175cf3c9`
- 세 release의 quality link 120/20/300 및 published 상태 확인
- remote DB/TOPIK verifier, question quality 332/0, R2 pronunciation 0, Chromium/WebKit production E2E 통과

### 2026-08-23

- TOPIK/JLPT Google browser voice의 비동기 준비와 재생 종료 telemetry 수정
- Pages `1c3bba90-8990-472b-8bf2-12a08759597f` (`https://1c3bba90.nihongo-n3.pages.dev`)
- web source SHA `595fcd735824116fff6047e9e59f1d6acd90cb46`
- D1 migration/seed와 Worker는 변경하지 않음
- rollback Pages `7b0e9050-f36c-42a3-aab9-7d09f70df2af`; Worker `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872` 유지
- Production 직전 음성 단위 `10/10`, 영향 기능 E2E `44/2/0`, typecheck, OpenAPI, build, fresh D1 통과. 단, 음성 테스트는 mocked voice이므로 실제 가청 재생 증거가 아니며 배포 승인에 사용한 것은 오류였습니다.
- 배포 후 canonical smoke 5회, remote DB/FK, Worker `7/7`, auth proxy, R2 pronunciation 0 통과

### 2026-08-23 다음 콘텐츠 증량 후보

- source final draft SHA `e95d4a7c814a850c770108183328904c85e4ea0bd4588a851ab97e7a5c33c070`
- 서로 결과를 공유하지 않은 Reviewer A/B가 최종 160개 전부 승인
- 레거시 정리 후 로컬 CI: ops 8, DB 112, web 88, API 131, fresh D1, content contract/control plane 통과
- Preview D1/Worker 반영과 원격 품질·거래·Chromium/WebKit 각 14개 E2E 통과
- 음성 회귀 복구 릴리스 전이므로 Production seed와 Worker 배포를 실행하지 않음

### 2026-08-24 형상관리 문서 배포

- Pages `485b9f00-a8b1-4bbb-9001-a238651fb212` (`https://485b9f00.nihongo-n3.pages.dev`)
- source SHA `b8d41acb1cbd77da1a428ade0d07c27c910f84e3`
- GitHub Actions 비활성화와 로컬 형상관리 문서 변경만 포함하며 D1/Worker/음성 런타임은 변경하지 않았습니다.
- 이번 음성 추가 복구의 직전 Production Pages이므로 rollback 대상으로 보존합니다.

### 2026-08-24 음성 추가 복구 — Production 배포 완료

- JLPT 공용 음성과 TOPIK 한국어 음성의 첫 클릭에서 비동기 voice 대기를 제거하고 즉시 `speak()`를 호출합니다.
- 음성 시작 신호가 8초 안에 없으면 실패로 종료해 무한 대기를 막습니다.
- PWA service worker는 즉시 update를 확인하고, 배포 전부터 기존 worker가 제어하던 client만 `controllerchange` 때 1회 reload합니다. 첫 방문자는 초기 설치 때 reload하지 않습니다.
- 1차 Preview `efbc8db5`에서 신규 client까지 강제 reload한 결함을 발견해 Production을 중단하고 위 계약으로 수정했습니다. 수정 뒤 Web `93/93`, 영향 E2E Chromium/WebKit `50 passed / 2 skipped`, 전체 E2E `171 passed / 32 skipped`로 재검증했습니다.
- 최종 Preview는 `d53c3b4f-0c51-4a2b-9cc8-e5f35edcf5a0`, Production은 `9cc58a1f-4772-4129-b90d-c819ca20d700`, source는 `2bd657e96d8a43c6d28efe414acd468c1abd0861`입니다. rollback Pages는 `485b9f00-a8b1-4bbb-9001-a238651fb212`입니다.
- Production 실제 Chrome에서 일본어·한국어 모두 클릭 0.3초와 2.8초 뒤 `재생 중`을 확인하고 `onend` 정상 종료, alert 0건, console error 0건을 확인했습니다. 물리 스피커 가청 여부는 자동 lifecycle 증거와 구분합니다.
- Production 영향 기능은 Chromium/WebKit `44 passed / 8 skipped / 0 failed`입니다. JLPT N1/N2, 퀴즈 4모드, 청해, SRS, TOPIK 첫 한국어 재생·owner→FSRS, PWA·offline을 포함합니다. Production 음성 전용 검사는 `2/2` 통과했습니다.
- 배포 asset은 `assets/index-DprkUCgI.js`, `/audio-qa`와 `/api/v1/auth/config`는 `200`, legacy `/api/v1/audio/test`는 `410`, 원격 R2 발음 참조 합계는 `0`입니다.
- 이 변경은 D1 schema/data와 Worker를 변경하지 않은 Pages 전용 복구입니다.
- Production D1 checksum backup을 만들고 임시 로컬 D1에 `65` regular tables를 복원해 행 수·FTS·FK를 대조했습니다. 첫 drill에서 발견한 output buffer와 immutable trigger replay 문제는 restore 도구에서 수정하고 재실행해 통과했습니다.
- 현재 HEAD로 생성한 새 manifest를 운영 D1에 직접 비교하면 문서 source hash drift 때문에 차단 검사 `45`건이 실패합니다. 운영 콘텐츠 source `3485c6ef8addda3cd3e209730646c296175cf3c9`, manifest `content-v3-d102868e3d43b9b3c1a4`, 실제 운영 seed run에 고정한 remote verifier는 `280/280` 통과했습니다. 운영 D1은 이번 Pages 배포에서 재시드하지 않았고 drift는 `INC-DATA-024`로 추적합니다.

## 다음 단계

음성 복구 Pages 배포는 완료했습니다. 다음 실행은 실제 사용자 장치의 가청 확인과 speech telemetry를 사후 관찰하고, 현재 HEAD 문서 hash와 운영 콘텐츠 manifest를 source SHA에 고정해 검증하도록 verifier 인터페이스를 보강하는 것입니다. 운영 작업은 먼저 `pnpm ops:status`, 구현 종료 후 `pnpm ops:verify`, 배포 전후 `pnpm ops:status:remote`로 증적을 남깁니다. N2/N1/TOPIK 증량 재개 순서와 D+1/D+7/D+30의 `50/10/5` 판정은 [2026-08-23 증량 릴리스 기록](NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md)을 따릅니다.

## 2026-08-23 저장소 정리

- 현재 문서로 대체된 2026-07-29~08-19 이관 안내·완료 실행계획 7개와 잘못 남아 있던 루트 Figma attribution 파일을 제거했습니다.
- TOPIK practice v2와 owner curriculum에 대체된 TOPIK I Preview 후보 전용 문서·JSON·seed·verifier·test를 제거했습니다.
- 호출자가 없던 legacy R2 audio prefetch no-op과 그 전용 테스트를 제거했습니다. learner API의 `/api/v1/audio/*` 및 관리자 음성 생성 `410 Gone` 차단은 유지합니다.
- 로컬 임시 `.m4a` 발음 파일과 Playwright 생성 보고서는 저장소 밖 휴지통으로 이동했습니다. source-of-truth 테스트와 release evidence는 보존했습니다.

## 2026-08-24 운영관리 기준선

- 전담 `project-operations-steward` Sub Agent 스킬과 루트 `AGENTS.md`를 추가해 모든 후속 작업이 현재 상태·오류 원장·runbook·릴리스 원장을 먼저 읽도록 고정했습니다.
- 로컬 상태 명령 `pnpm ops:status`, 전체 로컬 gate `pnpm ops:verify`, 원격 읽기 전용 상태 명령 `pnpm ops:status:remote`를 추가했습니다.
- 원격 상태 명령은 Git branch SHA, Production Pages deployment/source, Worker version, D1 migration, Pages/audio/auth/legacy smoke와 Production D1의 R2 발음 참조 0건을 확인합니다.
- GitHub Actions는 계속 비활성 placeholder이고, 검증 결과는 `.artifacts/operations/ops-status-latest.json`과 history에 저장하되 Git에는 포함하지 않습니다.
- Production backup, recovery, release, source-intake, quality evidence는 보존했습니다. 추적되지 않는 `.DS_Store` 3개, 내용 없는 legacy `apps/d1-backup` 의존성/cache, 검증 후 재생성 가능한 web `dist`와 Playwright report/test-results를 `/Users/sunghokang/.Trash/JLPT-cleanup-2026-08-24-ops`로 이동해 복구 가능하게 정리했습니다.
