# 로컬 형상관리·릴리스 원장

최종 점검: 2026-09-07 KST

이 문서는 GitHub 유료 CI/CD 기능에 의존하지 않고 JLPT·TOPIK의 형상, 검증, 배포와 rollback을 관리하는 운영 원장이다. 코드·테스트·Cloudflare 원격 결과와 다른 내용이 있으면 실제 명령의 종료 코드와 원격 deployment ID가 우선하며, 같은 변경에서 이 문서를 바로잡는다.

## 최신 릴리스 — 2026-09-07 개인 학습 UX Production

| 항목 | 실행 결과 |
| --- | --- |
| 승인 | 사용자 조건부 Production·최종 push 승인, 임시 백업 점검 승인, 최신555 양언어 실제 청취 확인 |
| 배포 source | `a7d5d87946334fe8c7970b8f124853aaba443955`; 검증 runtime `793b671a5c7503017041bbaee4e8de7edb492e20`과 apps/packages/lock tree 동일 |
| Worker | `c2901280-4c10-4671-bc61-dc262c88c692`, deploy exit0, 관측 RELEASE_SHA=a7d5d87 |
| Pages | `ce4e5e57-c0fa-4fe5-b268-00458d4e0300`, main Production, deploy exit0, canonical `https://nihongo-n3.pages.dev` |
| DB | additive0028 하나 적용,29개 ledger/pending0. 콘텐츠 seed/publication 없음; content source3485/manifestd102 유지 |
| 보존 | 백업65개·복원65개/FK0, 배포 직전/0028 직후 기존21개 테이블 행 수·전체 열 hash 동일, 새5개0행 |
| 선행 gate | 동일 runtime 로컬458개·E2E217/30/0, Preview181/6/0(시각60개 별도 제외), 실제 SSO·음성 strict/predeploy pass |
| 사후 검사 | content verifier392/392, FK0·FTS 일치, R2참조0, Worker7/auth proxy3, 실제 운영에서 정적70개 파일 hash 일치 |
| 음성 | 사용자555 가청확인; Production 실제 Chrome 양언어 onend각1. 익명 Chromium/WebKit2개 speech mock pass·R2/legacy0. Production 사람 청취/native HAR 재수집은 아님 |
| 정책 교정 | 실제 TOPIK status=topik-i-ii/쓰기true, CSP media-src 'none', 기존 운영 OAuth callback/secret binding 유지 |
| rollback | Worker `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872`, Pages `9cc58a1f-4772-4129-b90d-c819ca20d700`; 데이터 손상 없으면0028/학습 기록 보존 |
| 형상 후속 | 배포 후 문서와 로컬 ops0027 고정 검사만 수정. 앱 재배포 대상이 아닌 별도 후속 commit으로 최종 push 결과를 기록 |

증적: `.artifacts/operations/learning-production-2026-09-07-*`, `production-postdeploy-pinned-2026-09-07.json`, `production-postmigration-learning-preservation-2026-09-07.json`. 원문 backup/HAR/계정 자료는 ignored 영역에 보존하며 Git 제외입니다. `INC-OPS-059`는 ops의 이전 migration0027 하드코딩을 fail-first3개로 고정 후 기준선 범위/ledger count 검증으로 교정했습니다(전용11개 통과). 운영 앱 결함이나 DB rollback 사유가 아닙니다.

postdeploy gate checker는 exit0/통과입니다. 최종 push 전 remote ops는50 pass/2 warn/1 fail이며 유일한 실패는 아직 동기화하지 않은 Git SHA입니다. TOPIK status/CSP/DB/Worker/Pages는 모두 통과했습니다. 문서64개/84링크·lifecycle·diff check와13개 변경 파일 독립 검토도 통과했습니다. ops의 count/latest 검사는 중간 migration 이름 전체를 검사하지 않으며 pending/unknown0은 별도 pinned ledger 조회 증거입니다.

이하 배포 전 이력의 미완료·가청 대기·원격 SHA는 당시 기록입니다. 같은 검증 runtime을 문서 commit마다 재배포하거나 전체 gate를 반복하지 않습니다.

## 이전 작업 — 운영 백업·점검 종료, 신규 릴리스 배포 전

- 승인: 사용자가 운영 백업 동안 잠시 학습 저장을 중지하도록 명시 허용. 최신555fc0c4의 가청 확인은 여전히 미응답.
- 실행: 2026-09-07 00:21–00:27 KST(UTC09-06 15:21–15:27). 기존Worker6bbe4bbd의 코드 etag/runtime/나머지binding 동일을 확인한 점검 전용 버전 `232ec50d-1d78-4cf8-9c40-39f0a7d72dc1`, 임시 deployment `03e2a6a4-9116-4e1e-8904-9334d2c372b2`. 두 Queue를 일시정지하고 backlog/활성Workflow/releasejob0, HTTP 변경·OAuth 시작503을 확인 후 export.
- 백업: `.artifacts/d1-backups/learning-ux-2026-09-07-pre0028`, schema0027/65개. manifest 파일 SHA-256 `1747b2ebfd9af836755e0d3f898454d2e141d0193656342a0e67500b6c280278`, SQL65개 checksum 일치. 사용자 데이터 원문은 Git 제외·보존.
- 원복: deployment `bfa3b03b-b283-4443-8be8-c4c346a69a65`로 기존Worker6bbe4bbd 100% 복귀, 두Queue는 원래 paused=false. non-versioned 설정 hash동일. 최초 wrapper exit1(`Maintenance health mismatch`) 보존; 후속 read-only postcheck는 off/health200/configtrue/비인가activity401과 원복을 확인해 exit0. 별도 검증기 `data.google_enabled` 교정은 INC-OPS-058.
- 복원 drill: 실제 임시 로컬0028에서65개 행 수·56개trigger·FK0·vocab FTS3676/3676·sentences FTS1324/1324·새5개0행, exit0. `coversLocalSchema=false`이며70-table 백업으로 표시하지 않음.
- 독립 교차검토: 별도 Data Preservation Agent가 manifest 구조·SQL65개 SHA-256·restore 행 수를 직접 대조해 exit0. 최초 wrapper 실패와 후속 원복 성공을 분리했고 파일 바이트 hash와 JSON 직렬화 hash의 차이도 확인함.
- 증적: `.artifacts/operations/production-backup-2026-09-07-{baseline,execution,postcheck,restore,ops-remote}.json`, export.log. 최초 실행 helper hash `6d5bdc9465ea6e2bf00c2e243013bf1e264fab2e1a47d915d5426c1772d06212`. 최초 실패와 수정 후 검사를 별도 보존.
- 종료: remote ops48 pass/2 warn/3 fail(미push SHA·기존 TOPIK status/CSP). 신규 앱·Pages·migration·seed·콘텐츠 공개·최종push 없음. Worker6bbe4bbd/Pages9cc58a1f/DB0027 유지. 최신 가청·live release-pinned manifest·최종 gate가 남으며, 쓰기 재개 후 이 백업을 다음 배포 직전 최신본으로 자동 간주하지 않음.

## Preview 포인터 — 안정성 수정본

| 항목 | 실제 상태 |
| --- | --- |
| 앱 source | 로컬 commit `793b671a5c7503017041bbaee4e8de7edb492e20`; 최종 push 전이라 Git 원격은5311ab7 |
| Preview Worker | `87f8fbf5-97e3-4a99-96cb-3cf607911d48`, source793b671, Preview 전용 OAuth 두 secret 추가·활성화 exit0; 직전 b02f3674 |
| Preview Pages | `555fc0c4-24cc-49de-b846-38aee2f59b31`, source793b671, Functions 포함, deploy exit0 |
| Preview D1 | `nihongo-n3-topik-preview`, migration0028·FK0, 추가 migration/seed 없음 |
| 로컬 검증 | gate458개·fresh0028 exit0, 전체 E2E217 pass/30 시각 정책 skip/0 fail |
| 새 Preview 검증 | 이전 전체178 pass/6 fixture skip/3 fail(exit1) 보존, OAuth 연결 후 최종187개181 pass/6 로컬 fixture skip/0 fail,23.3분·exit0(시각60개 별도 제외); 실제 Google 양 트랙 재로그인/계정 연결 보존 확인, Network R2/legacy0 |
| 미해결 gate | 최신555fc0c4 사람 가청 확인, 승인된 점검 시간의 새 Production backup/restore·최종 gate |
| rollback | OAuth 설정만 복귀: Worker `b02f3674-6a59-47c8-818a-2397bcd295fd`; 앱 전체 이전 Preview: Worker `6f0c0e41-1978-42a5-8e3a-3276ed3f1c63`/source0b20e39, Pages `d51a81ed-2561-4900-899f-022b99d67679`/source5311ab7; DB 복원은 기본 조치 아님 |
| Production/정리 | Production 기준선 유지, 콘텐츠 publication·파일 삭제·최종 Git push 없음 |

최초 새 Preview auth/settings는11 pass/3 fail이었다. 실제 SSO503 두 건과 지연 테스트 interception0 한 건을 분리했다. 지연 테스트에만 SW 제어를 적용한 뒤 정확한 `settings-preferences.spec.ts`/`settings-theme.spec.ts` 원격14개를 통과했다. 첫 명령의 `theme-settings.spec.ts` 파일명 오기로 테마8개가 포함되지 않았음을 기록하며 당시14개에 포함됐다고 쓰지 않는다. 앱 runtime은793b671에서 변경하지 않았다.

증적은 `stability-preview-worker-deploy.log`, `stability-preview-pages-deploy.log`, `stability-pages-after.json`, `stability-preview-db-check.json`, `preview-session-replay-793b671.json`, `settings-transport-preview-2026-09-06.log`다(`.artifacts/operations/`의 날짜 prefix 파일). 555fc0c4 음성 관측 중단은 `stability-preview-audio-interrupted.json`에 기록한다. 과거555 이전 HAR·가청은 이 release에 재사용하지 않는다. 최신 remote status48/2/3(exit1)은 미push SHA차이와 기존 Production TOPIK/CSP 실패를 포함한다.

지연 테스트 제어 범위만 교정한 뒤 전체 로컬 E2E도 `transport-final-local-e2e.log`에서 **217 pass / 30 시각 정책 skip / 0 fail**,3.9분·exit0으로 다시 통과했다. 앱 runtime은793b671이며 후속 test/docs 안전 커밋은 배포 source와 구분한다. docs64개/82상대 링크 및 lifecycle/diff check도 통과했다. 사용자 데이터·backup·HAR 원문은 ignored artifact로 보존하고 source에 포함하지 않는다.

10:06 UTC 실제 Chrome 새 탭에서 양언어 각각 정상 종료1회, voice 목록10/10, 탭 `dev.logs` warn/error0을 확인했다. native Network 수집은 `cgWindowNotFound`로 미확인이므로 R2/legacy 요청 수는 null을 유지한다. `learning-experience-2026-09-06-stability-preview-actual-audio.json`은 release793b671/deployment555fc0c4에만 연결되며 strict gate4개 누락·exit1이다. 사용자 가청 답변의 질문 URL은 a95437fc이므로 최신 후보 확인으로 재분류하지 않는다. 앞선 관측 중단 artifact도 보존한다.

`stability-preview-full-functional.log`는 immutable555fc0c4/source793b671에서 24개 파일·4개 project의187개를 끝까지 실행해 **178 pass / 6 skip / 3 fail**,23.6분·exit1이다. 시각 suite60개는 별도 제외다. 실패는 SSO503 양 엔진2건과 WebKit 자연 검색 fixture 우회1건이며, 최초 전체 결과를 후속 부분 재검사와 합쳐 전체 통과로 바꾸지 않는다. 양언어×양엔진 전체 세션4건은 pending/fail0, 최대 write는 Chromium ko2,950/ja3,428ms, WebKit ko2,568/ja2,579ms다. 실제 Preview 합성 계정의 학습 기록이며 Production 사용량 지표가 아니다.

자연 검색 후속은 mock interception counter1 기대/실제0으로 WebKit fail-first1건·exit1을 재현하고, 해당 사례만 SW 제어 뒤 원격 양 엔진4 pass/0 skip/0 fail·12.2초·exit0을 통과했다. sidebar의 SW 허용 및 원래 문구/검색/URL/시간 한도는 유지한다. `natural-search-fail-first-2026-09-06.log`와 `natural-search-scoped-preview-2026-09-06.log`를 별도 증거로 보존하며 앱/배포 source793b671은 변경하지 않았다.

root의 독립 소스 diff 검토와 로컬 격리 Worker/D1 양 엔진 재검사도 **4 pass / 0 skip / 0 fail**,5.9초·exit0이다(`natural-search-scoped-local-2026-09-06.log`). 전체 로컬217개는 이 테스트 제어 수정 전 결과이며, 수정 후 전체를 다시 실행한 것으로 쓰지 않는다. 앱 runtime은 변경하지 않았으므로 배포/build/fresh458개를 불필요하게 반복하지 않았다.

별도 Agent의 후검사 `learning-experience-2026-09-06-preview-full-postcheck-793b671.json`은187개 고유·연속 index와 `.last-run.json`의3개 실패를 대조했다. Preview health200/source793b671 확인 후 명시한 전용 D1에서 FK0·migration29개·0028적용1회를 조회했다(rows_written0/changed_dbfalse). 조건부 어휘 검색 추가 skip0은 최종skip6과 고정 원격 fixture6개를 대조한 추론임을 artifact에 명시했다. Production에 연결하거나 사용자 원문·인증값을 기록하지 않았다. 이 후속은 테스트/문서만 로컬 형상 보존하며 Production·최종 push·삭제는 하지 않는다.

### Preview OAuth 후속 설정 및 검증

사용자의 기존 운영 OAuth 보존·새 Preview client 생성·JSON 다운로드/Preview secret 등록 승인 후 Google `JLPT Preview`를 생성했습니다. callback은 `https://nihongo-n3-api-topik-preview.kordokrip.workers.dev/api/v1/auth/google/callback` 하나입니다. `wrangler versions secret bulk`로 `GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET`만 추가하고 버전별 코드 etag/runtime/나머지 binding 동일을 확인한 뒤87f8fbf5에100% Preview traffic을 연결했습니다. 앱 source793b671/Pages555fc0c4/D1은 그대로입니다. 이 설정의 rollback은 직전 Worker b02f3674이며 운영 OAuth client를 변경하거나 Preview credential을 운영에 복사하지 않습니다. CLI의 non-versioned logging config 동기화는 사전 원격 snapshot이 없어 이전 값과 동일하다고 주장하지 않습니다.

실제 Chrome에서 JLPT Google 계정 선택→alias 홈·홈 재조회, TOPIK 선택→로그아웃→같은 Google 계정 재로그인→TOPIK 홈을 확인했습니다. 독립 D1 전후20개 SELECT씩은 연결 계정1명·id/role/google_sub/email/FSRS 설정 hash 동일, track만topik-ko입니다. 학습17테이블0행이라는 경계를 명시합니다. `preview-google-preservation-{baseline,after-topik}-2026-09-06.json`과 provider mock 로컬14개 결과를 별도 보존합니다.

현재555 실제 native Network HAR는14개 HTTPS200/동일origin, UI확장요청2개, R2/legacy0입니다. 새로고침 뒤 양언어 onend각1, Console preload경고2·오류0을 관측했습니다. 새 가청 답변은 대기해 strict gate는2개 누락·exit1입니다. 이전 이력의 가청/네트워크 누락 artifact는 덮어쓰지 않습니다. 사용자 조건부 Production·최종 push 승인은 받았지만 점검 시간·새 backup/restore·최종 gate가 남아 외부 Production/Git은 변경하지 않았습니다.

최종 원격 결과는 `preview-oauth-full-functional-2026-09-06-summary.json`의187개/24spec/4project·181 pass/6 로컬 fixture skip/0 fail·exit0이며 `.last-run.json`의passed/실패빈목록과 교차확인했습니다. 네 전체 세션 쓰기91회는 pending/fail0입니다. root도 원본log의최종집계와 metadata를 대조했습니다. 문서 독립 검토에서 과거b02/SSO503 포인터를 교정했고 docs64/82링크·lifecycle·diff check를 통과했습니다.

Production 최신 읽기 전용48/2/3은 `production-final-readonly-crosscheck-2026-09-06.json`에 있습니다. Worker6bbe4bbd/Pages9cc58a1f 및Google설정true·R2참조0·legacy410을 확인했고 pending은0028 하나입니다. releasejobs18개중진행대기/처리/승인대기/재시도0이나 실제Queue/Workflow활성은unknown입니다. live manifest는 이집계에포함되지 않았습니다. 첫stdout JSON파싱실패 뒤1회수집복구를 구분하고 Production변경은없습니다.

## 2026-09-06 최초 개인 학습 UX 후보 (이하 순차 이력)

| 항목 | 상태 |
| --- | --- |
| candidate | learning-experience-2026-09-06; Preview 검증 중, INC-PERF-049 미해결 |
| source | `feature/topik-product-expansion`, `94dfb052c5ff73caaa70692f1d023bdaae439c8f` commit/push |
| schema | 전용 Preview에 `0028` 하나 적용; Production은 `0027` 유지 |
| content | 공개 bank 재시드/변경 없음, Preview 160개 신규 공개 없음 |
| 94dfb05 기준선 검증 | backup·음성 진단 포함 gate Ops 26 / DB 126 / Web 113 / API 157, exit 0. Playwright 207 pass/32 skip/0 fail, exit 0. 문서 64/81 및 diff check 통과. 후속 성능 후보 API162와 분리한다. [실행 기록](LEARNING_EXPERIENCE_PLAN.md#2026-09-06-검증-기록) |
| 실제 음성 | 새 Preview 양 언어 정상 종료 표시, 사용자의 “두 언어 모두 들렸습니다” 확인. 실제 Chrome 네트워크 상세 관측은 별도이며 자동 mock E2E로 대체 표기하지 않음 |
| remote read-only | 06:09 UTC 전체 48 pass / 2 warnings / 3 fail; 06:44 UTC 같은 R2 verifier 단독 재검사는 9개 표면 모두 0, exit 0. 전체 재집계는 아님 |
| Preview/Production | Preview Worker `1fec0907-914d-4a82-9e87-92dcf6beb723`, Pages `a95437fc-8411-4151-9519-ab0d8fb92905`; Production 미반영 |
| backup/restore | 과거 65-table backup → local0028 실제 restore exit 0, FK 0, trigger 56; coversLocalSchema=false. 새 Production backup 아님 |
| Git | 후보 commit/push 완료, tag 없음; Pages Git integration 없음, GitHub Actions 비활성 유지 |
| rollback | additive 데이터를 보존하고 이전 Worker/Pages 복귀; 화면 옵션 `VITE_LEARNING_EXPERIENCE=false` |

이 후보를 출시 완료로 표시하지 않는다. 기존 Production ID와 rollback 이력은 아래에 보존한다.

Preview Worker smoke 21/0, 관리자 positive 검사 1개 미실행. Preview 콘텐츠 집계의 before/after 일치·FK 0·schema profile0028 확인. 원격 E2E76건은 세션 시작이 5초 기준을 반복 초과해 exit130으로 중단했다. 합성 Preview 계정에서 실제 create200/7,312ms, current200/2,118ms를 확인해 `INC-PERF-049`로 수정 중이다. 직전 Preview Worker `0d17ba30-b7ea-4879-9e99-e9c3a7ebb8ee`, 같은 branch Pages `885aae1f-d308-4453-b3c6-881999410ec0`를 복귀 기준으로 보존한다.

최종 Production read-only는 49 pass/2 warnings/2 fail, exit1이었다. 미배포 TOPIK status/CSP만 실패하며 앞선 R2 7403은 재발하지 않았다. 실제 Chrome 전체 network capture는 미확보다. 사용자 청취 확인은 이 Pages의 가청 증거이며 Production 배포 승인이 아니다.

성능 후속 API 후보는 생성≤18/재개≤5 D1 왕복 예산, ID/version tuple과 static/canonical 타입 분리를 적용했다. 독립 검토 지적 3 fail을 수정한 뒤 Ops26/DB126/Web113/API162와 fresh D1, 전체 로컬 E2E207 pass/32 skip/0 fail(exit0)을 통과했다. 이 후속 후보는 Worker-only Preview 대상으로 형상 고정하며 Pages94dfb05는 유지한다. 원격 배포 ID/사후 결과는 실제 실행 후 추가한다.

후속 Worker source0b20e39는 commit/push 및 Preview `6f0c0e41-1978-42a5-8e3a-3276ed3f1c63` 배포를 완료했다. N5 create/current882/338ms·TOPIK1 814/355ms 단일표본을 확인했다. 후속 원격 나머지72건은32 pass/3 skip/3 fail/34 not-run(exit1): SRSclock-skew2건과mockrecords1건을 발견해차단했다. 현재Web clock-skew수정중이며 Production은변경하지않는다. 긴세션계측의최종4건도별도재검증한다.

## 복습 후속 후보

후속 Web 후보는 `INC-SRS-051/053` 수정과 E2E 증거 경계를 포함한다. source 전체 gate는440개(Ops26/DB126/Web126/API162), fresh0028까지 exit0이다. 최종 로컬 E2E는211 pass/30 시각-policy skip/0 fail, exit0이다. API는 현재 Preview Worker0b20e39를 유지하고 추가 migration/seed 없이 Pages만 교체한다. 실제 Pages ID와 원격 E2E 결과 확보 전까지 릴리스 상태는 검증 중이다.

- source `5311ab72c2aafa001fb436e50cd1335d775c81b4`: clean checkout commit/push 완료.
- Pages `d51a81ed-2561-4900-899f-022b99d67679`, immutable `https://d51a81ed.nihongo-n3.pages.dev`, source5311ab7, deploy exit0. Functions 포함, feature branch Preview다.
- Worker `6f0c0e41-1978-42a5-8e3a-3276ed3f1c63`/source0b20e39 유지; DB migration/seed write 없음. Production Pages9cc58a1f도 그대로다.
- rollback: 직전 Pages `a95437fc-8411-4151-9519-ab0d8fb92905`/source94dfb05. SRS-only Pages 교체이므로 Worker/D1 복원은 기본 조치가 아니다.
- 실제 Chrome: 양언어각1회 onend표시·warn/error0, 청취질문 대기·network 미확보. strict predeploy는4개누락(human, confirmed_by, R2/legacy counts)으로exit1, 통과가 아니다. 증적 `srs-preview-actual-audio.json`, 이전사용자확인은별도artifact보존.
- 원격 최종78건은 immutable d51a81ed에서 **73 pass / 4 fixture skip / 1 fail**, exit1로 종료했다(`srs-preview-final-e2e.log`). SW access-control 단발 오류의 후속3회 진단은 모두 통과했지만 최초 전체 실패는 보존한다.

### 안정성 수정본의 최신 검증 (미배포)

HEAD5311ab7 위의 작업 트리에서 INC-AUTH-054·LEARN-055·SET-057을 수정하고 기존 데이터 upgrade, 설정 persist와 OAuth bridge 검사를 보강했다. `settings-final-full-gate.log` **458개(Ops26/DB126/Web139/API167)**·fresh0000–0028까지 exit0, `settings-final-local-e2e.log` **217 pass / 30 시각 정책 skip / 0 fail**,3.8분·exit0이다. 이 결과는 d51a81ed에 아직 없는 수정본의 로컬 증거다. 추가 commit/push·Preview/Production 배포·삭제는 하지 않았다.

같은 d51a81ed의 Google 설정 표시 검사는2개 통과했지만 실제 OAuth start는503으로2개 실패했다(`sso-config-crosscheck.log`, exit1). Preview OAuth callback/secret을 준비하지 않고 운영 값을 복사하지 않는다. 실제 Google 로그인과 새 Production backup/restore는 미완료다.

09:39 UTC 후속 Native Chrome 관측은 양언어 onend1/1·R2/legacy 요청0이다. sanitized HAR `srs-chrome-network.har`는16개 HTTPS 요청(모두 같은 Preview origin/200)을 포함한다. Network UI18개 중2개는 확장 리소스다. Console의 SW/module preload 경고6개는 별도 관찰이며 WebKit 실패 원인으로 단정하지 않는다. `srs-preview-actual-audio-network.json`의 strict gate는 사람 가청/확인자2개 누락으로 **exit1**이다. 앞선4개 누락 artifact를 수정해 지우지 않고 보존한다. a95437fc의 사용자 확인을 d51a81ed에 옮기지 않는다.

## GitHub 사용 범위 (유지)

- 저장소: 공개 `kordokrip/JLPT`
- 용도: commit, branch, tag와 원격 백업
- GitHub Actions: 정책상 실행 금지 (`workflow_dispatch`는 문서 보관용 비상 호출만 허용)
- 자동 CI/CD, Actions artifact/cache, Actions 기반 Cloudflare 배포: 사용하지 않음
- `.github/workflows/ci.yml`: 실행 job을 `if: false`로 잠궜고, 배포·검증의 실질 근거는 로컬 MD 원장 사용
- Cloudflare 배포와 검증: 승인된 로컬 터미널에서만 실행

공개 저장소의 표준 GitHub-hosted runner는 공식 정책상 무료지만, 이 프로젝트는 형상관리와 릴리스 판정을 분리하기 위해 사용하지 않는다. GitHub 상태 badge나 workflow 결과를 릴리스 통과 증거로 사용하지 않는다.

## 로컬 형상관리 규칙

1. 변경 전에 `git status --short`, 현재 branch, HEAD와 원격 동기화 상태를 기록한다.
2. 사용자 변경을 reset, checkout, stash 또는 삭제하지 않는다.
3. 문서·코드·데이터·테스트를 하나의 원자적 commit으로 고정한다.
4. commit 후 `git show --check`, `git status --short`, `git rev-parse HEAD`를 기록한다.
5. 원격에는 검증된 commit과 명시적 tag만 push한다. 강제 push는 금지한다.
6. release tag는 `release/YYYY-MM-DD/<scope>` 형식을 사용한다.
7. 비밀값, `.env*`, D1 backup 원문, 실제 사용자 데이터와 Wrangler 인증 정보는 Git과 이 문서에 기록하지 않는다.

### GitHub 무료 계정 사용 원칙 (현재 운영 모드)

- 원격 Git은 최소 범위만 사용한다: **commit, branch, tag** 생성 및 `push` 동기화.
- PR, PR 기반 자동 검증, Actions 배포/배포 게이트는 사용하지 않는다.
- 로컬 형상기록이 최우선이다. 모든 release gate 결과(로그, 증거 경로, 배포 ID, rollback target)는 반드시 아래 항목에 md로 즉시 기록한다.
- Git 장애/권한 이슈가 있어 remote 반영이 지연되면, 로컬 원장에 `remote_sync_status: failed`로 남기고, 네트워크 복구 후 동일 SHA 기준으로 재동기화한다.

## 로컬 검증 순서

~~~sh
pnpm ops:verify
pnpm -F @nihongo-n3/e2e test:chromium
pnpm -F @nihongo-n3/e2e test:webkit
# 콘텐츠 변경에만 추가
pnpm -F @nihongo-n3/db question:quality
~~~

이후 Chromium·WebKit 영향 E2E를 실행한다. mock `onend`는 실제 가청 증거가 아니며, Preview URL에서 Chrome의 한국어·일본어 `real-page-onend`, 사용자 가청 확인과 `/api/v1/audio/`·R2 발음 요청 0건을 별도로 기록한다.

## 릴리스 기록 필드

각 릴리스는 다음 항목을 빠짐없이 남긴다.

| 항목 | 필수 값 |
| --- | --- |
| release | 날짜와 범위 |
| source | branch, 40자 Git SHA, tag |
| local gates | 각 명령의 종료 코드와 검사 개수 |
| audio | 한국어·일본어 callback, 가청 확인, R2/legacy 요청 수 |
| D1 | database, migration, manifest, backup, restore drill |
| Worker | 이전 version, 새 version/deployment, rollback version |
| Pages | 이전 production deployment, Preview deployment, 새 production deployment |
| smoke | Worker, auth proxy, Pages, remote DB/FK/FTS 결과 |
| status | draft, preview, published, rolled_back 중 하나 |

### 운영 설정 갱신(로컬-only SCM)

- SHA: `2fb05b321c33c8bd885703393ef82785c2012052`
- 범위: `.github/workflows/ci.yml` 실행 비활성화, CI/CD 회피 문서 추가
- 적용 내용: GitHub Actions 실질 게이트 배제. 현재 기준은 `LOCAL_CICD_OPERATIONS.md`로 통합

## 2026-08-23 음성 복구 1차 Preview — 2026-08-24 최종 릴리스로 대체

| 항목 | 현재 값 |
| --- | --- |
| release | `audio-recovery-2026-08-23` |
| source branch | `feature/topik-product-expansion` |
| 안전 복구 bundle ref | `4108edbd1f4c87b38963a904b1dd9d62ac9fcc2f`; 작업 유실 방지용, 정식 release SHA 아님 |
| 정식 source commit/tag | 1차 `a427af8c963660d9ebfdbec8c7cacf5e9858f749`; 익명 QA 후속 SHA/tag는 최종 gate 후 기록 |
| Actions | repository `enabled=false`; 자동 CI/CD 중단 |
| local gates | `verify:ci` exit `0`; Ops `18/18`, DB `112/112`, Web `90/90`, API `131/131`, fresh D1 완료 |
| browser gates | 전체 데스크톱·모바일·시각 E2E `171 passed / 32 skipped / 0 failed`; 익명 음성 QA 포함 영향 기능 `14/14`; 1차 Preview 실제 기능 `32 passed / 8 skipped / 0 failed` |
| Preview Worker | `48b49518-f374-4c59-a652-f73d136689f3`, release `a427af8...`, smoke `21/21` |
| Preview Pages | 유효 `7de4c852-82c1-4c24-a787-e504174702ea`; 잘못된 `367eb0f4-d336-4b63-8d3a-b073e7290ca8`은 Functions 누락으로 제외 |
| Production | 당시 회귀 Pages 유지; 이 1차 단계에서는 미배포 |
| status | `superseded`; 아래 2026-08-24 최종 릴리스 참조 |

이 표는 1차 Preview의 역사 기록입니다. 실제 Production 결과는 아래 2026-08-24 표가 현재 기준이며, 과거 빈 값이나 `미확인`을 성공으로 해석하지 않습니다.

## 2026-08-24 첫 클릭·PWA 추가 복구

| 항목 | 최종 값 |
| --- | --- |
| release | `audio-first-click-pwa-recovery-2026-08-24` |
| source branch | `feature/topik-product-expansion` |
| source commit/tag | `2bd657e96d8a43c6d28efe414acd468c1abd0861`, `release/2026-08-24/audio-recovery`, 원격 push |
| 변경 범위 | Pages web만 변경; D1 schema/data와 Worker 변경 없음 |
| 원인 | voice 준비 `await`로 사용자 활성화 소실 가능; 열린 설치형 PWA가 이전 JS 유지 |
| local gates | OpenAPI `72/12`, Ops `18/18`, DB `112/112`, Web `93/93`, API `131/131`, typecheck/build/fresh D1/content/audio contract 종료 코드 `0` |
| browser gates | 음성·PWA 영향 Chromium/WebKit `50 passed / 2 skipped`; 전체 데스크톱·모바일·시각 `171 passed / 32 skipped`, 실패 `0` |
| Preview | `d53c3b4f-0c51-4a2b-9cc8-e5f35edcf5a0`; 실제 Chrome 양언어 lifecycle 정상, console error `0` |
| Production | `9cc58a1f-4772-4129-b90d-c819ca20d700`; source `2bd657e...`; asset `assets/index-DprkUCgI.js` |
| Production browser gates | Chromium/WebKit 음성 `2/2`; 영향 기능 `44 passed / 8 skipped / 0 failed` |
| actual Chrome after deploy | 일본어·한국어 각각 클릭 0.3초·2.8초 뒤 `재생 중`, `onend` 정상 종료, alert·console error `0`; 물리 가청은 자동 판정하지 않음 |
| audio/R2 smoke | `/audio-qa` `200`, `/api/v1/audio/test` `410`, 원격 R2 발음 참조 합계 `0` |
| D1 safety | `.artifacts/d1-backups/audio-first-click-pwa-2026-08-24`; SHA-256 manifest와 `65` regular tables restore drill 통과 |
| D1 remote verifier | release source `3485c6e...`·manifest `content-v3-d102868...` 고정 `280/280`; 현재 HEAD 직접 비교는 문서 hash drift로 차단 45건 실패(`INC-DATA-024`) |
| rollback Pages | `485b9f00-a8b1-4bbb-9001-a238651fb212`, source `b8d41acb1cbd77da1a428ade0d07c27c910f84e3` |
| Worker | 변경 없음 `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872` |
| status | `published` |

Pages 복구 배포에는 D1/Worker write가 없었습니다. 현재 HEAD manifest drift를 없애려고 운영 D1을 재시드하지 않았고, 운영 콘텐츠 source에 고정한 verifier 결과와 HEAD drift를 함께 보존합니다.

1차 Preview `efbc8db5-f9fd-444d-8d27-d433372002aa`는 신규 client까지 강제 reload해 원격 browse/quiz를 중단시켰으므로 폐기했습니다. Production에는 반영하지 않았고 rollback은 필요하지 않았습니다. 후속 Preview `d53c3b4f-0c51-4a2b-9cc8-e5f35edcf5a0`에서 기존 controller가 있는 PWA만 reload하는 계약을 검증한 뒤 Production에 반영했습니다.

## 2026-08-24 운영관리 기준선

| 항목 | 값 |
| --- | --- |
| release | `operations-steward-baseline-2026-08-24` |
| source branch/tag | `feature/topik-product-expansion`, `release/2026-08-24/operations-steward` |
| pre-change synchronized HEAD | `951c19f70fbf1ef40a1b11fecdfd3387239cc51f` = origin |
| 변경 범위 | `AGENTS.md`, `project-operations-steward` 스킬, 운영 runbook, status/verify 명령과 테스트, 현재 상태·분석·감사·로드맵·릴리스 문서 동기화 |
| local status | `37 passed / 2 known warnings / 0 failed`; warning은 dirty worktree와 `INC-DATA-024` |
| remote read-only | `47 passed / 2 known warnings / 0 failed`; Pages/Worker/D1 migration/HTTP·auth JSON/R2 참조 0 확인 |
| full local gate | Ops `23/23`, DB `112/112`, Web `34 files / 93`, API `8 files / 131`, OpenAPI `72/12`, typecheck, build, fresh D1 `0000–0027`, 음성 provenance 6개, FK/FTS, content contract/control plane 모두 exit `0` |
| local fresh manifest | `content-v3-d091a7c5a9a6f17d7078`; Production manifest `content-v3-d102868e3d43b9b3c1a4`와의 차이는 `INC-DATA-024`로 유지하며 Production을 재시드하지 않음 |
| cleanup | `.DS_Store` 3개, source 없는 legacy `apps/d1-backup` dependency/cache, 검증 후 재생성 가능한 web `dist`·Playwright report/test-results를 `/Users/sunghokang/.Trash/JLPT-cleanup-2026-08-24-ops`로 이동; Production backup/recovery/release/intake/quality artifact 보존 |
| Production | D1·Worker·Pages write/deploy 없음; 기존 `9cc58a1f` Pages와 Worker `6bbe4bbd` 유지 |
| independent acceptance | 1차 검토의 Wrangler `--yes`, auth body, 음성 provenance, current-HEAD 원격 alias 지적을 모두 교정. 최종 독립 재감사에서 전체 gate, backup 65개 checksum, restore `passed=true`/FK 0, recovery patch·bundle checksum을 확인하고 commit 차단 결함 `0` 판정 |
| status | 전체 local/remote gate와 독립 acceptance 완료; 이 기준선을 commit/tag/push로 형상 고정 |

## 2026-08-30 저장소 최신화와 런타임 계약 교정

| 항목 | 값 |
| --- | --- |
| scope | 활성 문서 영구 경로, 로컬 CI/CD·Sub Agent handoff, TOPIK v2 status, quiz/activity 원자성, R2 전수 gate/CSP, legacy source 정리 |
| pre-change source | branch `feature/topik-product-expansion`, HEAD/origin `3a1dedfde1dd68ba6f9c6ed3fe451709c5d2a650` |
| pre-deletion cross-check | DB source 36개 직접 문서 참조, seed checksum, Git 추적, 전체 `rg` 참조를 확인; TOPIK v1 source·ADR·incident·release evidence 보존 |
| deleted/retired | 중복 Git 매뉴얼 1개, OA 이전 미등록 route 5개, canonical migration 밖의 구 migrate 파일 4개; 활성 원장 3개는 내용 보존 rename |
| focused tests | docs lifecycle/links, Ops `24/24`, DB `114/114`, Web `93/93`, API `134/134`, OpenAPI `72/12`, audio/CSP contract 통과 |
| full local gate | `pnpm ops:verify` exit `0`; typecheck, build, fresh D1 migration `0000–0027`, seed, FK/FTS, manifest, provenance, content contract/control-plane 통과 |
| browser E2E | Chromium/WebKit 전체 `171 passed / 32 skipped / 0 failed`, exit `0`; 한국어·일본어 browser speech와 R2/audio endpoint 요청 0 계약 포함 |
| Production read-only | source push 뒤 `50 passed / 1 known warning / 2 failed`; v2 300 공개·R2 9개 표면 실제 참조 합계 0. 현재 Worker의 `placement-v2` status와 R2 허용 CSP만 실패해 `INC-TOPIK-031`, `INC-AUD-033` 미배포 상태 |
| Production mutation | 없음. D1 `0000–0027`, Worker `6bbe4bbd`, Pages `9cc58a1f` 유지 |
| cleanup | 교차검증 뒤 재생성 가능한 build/Wrangler tmp/이전 CI·E2E report와 비어 있는 미등록 package 껍데기 61MB를 `/Users/sunghokang/.Trash/JLPT-cleanup-2026-08-30-maintenance`로 이동; 복구 가능 |
| verifier correction | 첫 원격 전수 검사에서 compound SELECT 한도를 발견(`INC-OPS-035`); 표면별 count로 수정 후 DB `114/114`, Production 9개 표면 합계 0 재통과 |
| independent acceptance | 첫 검토가 완료 quiz 재제출 시 attempt/activity 불일치를 발견해 commit을 차단; 409·guarded update·재제출 회귀 테스트로 교정. 핵심 음성/TOPIK/quiz/activity E2E는 Chromium/WebKit `38 passed / 2 intentionally skipped / 0 failed` |
| commit/push | main source `58b0ae153a548f942c07b16132eaf9f66beb24f5`; `origin/feature/topik-product-expansion` push 성공·동기화 확인. 이 행을 추가하는 follow-up 문서 commit도 같은 branch에 push |
| final clean status | main source 기준 local `40 passed / 1 known warning / 0 failed`; remote `50 passed / 1 known warning / 2 failed` |
| status | `versioned-and-pushed`; Production release는 두 원격 계약 실패와 `INC-DATA-024` 때문에 차단 유지 |

## 오류·rollback 연결

- 모든 오류와 배포 차단 조건: [오류·회귀 차단 원장](ERROR_LEDGER.md)
- 음성 직접 원인과 실제 Chrome 판정: [TOPIK Google 음성 장애 기록](TOPIK_GOOGLE_SPEECH_INCIDENT_2026-08-23.md)
- 전체 Production 기준선: [현재 상태](CURRENT_STATE.md)
- 콘텐츠 증량과 G0–G4: [N2·N1·TOPIK 증량 릴리스](NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md)
