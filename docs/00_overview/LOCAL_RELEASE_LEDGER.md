# 로컬 형상관리·릴리스 원장

## 2026-10-14 — 개인화 활성화 후보 검증 진행

현재 사용자 조건부 Production/push 승인. 시작local39/2/0, 새remote51/2/0. 첫 feature-on verify:ci는 web249통과/1실패(기존 status 선택자 충돌)로 중단했으며 수정 후web250을 통과했다. 독립 검토로0033 백업 프로필 누락, cron 실제시각 사용, Web Push HKDF 확장 카운터 중복을 발견했다. 예약 슬롯 fail-first2→수정2통과, 표준 push fail-first3실패/2통과→수정5통과를 별도 보존했다. 운영 변경/새 Preview/실수신/새 가청/최종 push는 아직 미실행이며 최종 gate 결과는 후속으로 기록한다.

## 2026-10-14 개인화 구현 — 로컬 후보, 미배포

사용자 후속 구현 승인: 한자 포함 5종 최적화 아이콘·프로필 사진·계정 테마/예약·학습 인사이트를 추가했다. `0033`은 계정/사진/발송 claim의 additive 변경이며 새 Worker와 Pages를 함께 검증해야 한다. 콘텐츠/채점/FSRS/XP/음성 코어 변경 없음. 로컬 실패·수정·통과와 미완료 gate는 [통합 설계 기록](UNIFIED_FRONTEND_DESIGN_2026-10-14.md)에 모은다. commit/push·Preview·Production·원격 DB 변경 없음. 아래 디자인-only와 Pages-only 문장은 이전 단계 이력이다.

## 2026-10-14 전 페이지 UI 통합 — 디자인 단계

기존 Superdesign 지도에서 대표6화면을3묶음으로 확장한다. 디자인 기준/생성 요청/route 적용 계약만 작성하며 앱·Worker·DB·Production·commit/push는 변경하지 않는다. 상세 상태와 시안은 [설계 기록](UNIFIED_FRONTEND_DESIGN_2026-10-14.md)을 따른다. 기존 지도 릴리스 결과와 신규 시안의 합격 여부를 구분한다.

## 2026-10-14 지도 UI 배포

코드887d2b2를 feature/topik-product-expansion에 일반 push하고 새Preview9f046cc6의44검사/실사용/가청을 확인했다. 새74표 백업·0032 복원·점검 해제·predeploy 이후 Pages2c0fea8d에 배포했다. Worker71e71638와 콘텐츠/기록은 유지한다. 운영 점검기 실패01–03·복구 및 최종04 결과는 [상세 릴리스](LEARNING_MAP_RELEASE_2026-10-14.md)에 보존한다. 아래 미배포 상태는 이전 이력이다.

지도94a04ff/딥링크 테스트71f39de 로컬 고정. remote push/배포 미실행. PWA 현재 운영 전환은 previous-root로 분리하고 legacy 회귀를 보존했다. 집중4+4 통과는 기존 빌드 재사용이며 새 전체 PWA 통과로 간주하지 않는다.

## 2026-10-13 지도 기능 연결·이벤트 교차검증 — 배포 준비 중

독립 Agent 검토로 오프라인/quick 진입 누락·대기 저장의 계정 전환 경합·딥링크 필터 유실을 발견해 수정한다(INC-UI-107–109). 첫 전체 브라우저279/30정책제외/8실패와 원격 최초7403→별도 전체51/2/0을 보존한다. 상세 새 검사/배포 상태는 [지도 통합 기록](LEARNING_MAP_UX_2026-10-13.md)을 따른다. 기존 Production과 learner data는 유지하며 새 후보의 전체 게이트 전에는 배포 완료로 기록하지 않는다.

## 2026-10-13 학습 지도·연결 화면 구현 — 로컬, 미배포

사용자 후속 요청에 따라 한국·일본 장식 이미지를 제작하고 지도·레슨·완료 화면을 기존 API에 연결한다. [학습 지도 기록](LEARNING_MAP_UX_2026-10-13.md)에 새 로컬 검사 결과를 기록한다. 앱 프런트엔드는 변경하지만 DB·콘텐츠·음성 코어·Production·Git commit/push는 변경하지 않는다. 아래37486f8 운영 릴리스와 구분한다.

## 2026-10-13 최종 후보37486f8 실행

최종16:20:53 KST 운영 배포·점검 해제 완료. Pages `6b8b8a19`, Worker `71e71638`, source37486f8, D10032, 신규600문항/220레슨이다. runtime-only 재개에서 read-only verifier/13표 보존·정적파일·canonical proxy·실제 Chrome ko/ja onend/HAR0·HTTP smoke7/7·queue 원복을 통과했다. 아래 Pages preflight 중단은 보존된 선행 사건이며 현재 상태가 아니다. 최종 문서 커밋은 runtime 재배포 없이 같은 branch로 push한다.

코드 후보 `37486f888399f6297b3c95f25e16afcbecc0b5b1`를 원격 feature branch에 일반 push했다. 같은 후보의718단위·기존265/30정책제외·reviewed44·Preview44·PWA24를 통과했고 최종Preview494f4ff9에서 두 학습자 동선과 양언어 가청을 확인했다. 별도 실제 호환 복귀·72표 백업/복원과 새 predeploy 후 운영0031/0032 및5개 release600문항/220레슨 공개/검증을 완료했다.13개 기존 학습표 hash·FK/FTS와 고정 canonical392검사도 통과했다.

Pages 업로드 직전 private runner의 기본 proxy 오탐으로 기존 Pages를 유지한 채 중단했다. 새로운 runtime-only continuation으로 이어가며 DB 재출판하지 않는다. 전체 배포 완료는 Pages/실제Chrome/점검·queue 복원/최종 문서 push 뒤에만 기록한다. 상세 현재 상태·시각·실패 및 성공 증적은 [통합 릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md)의 최상단을 따른다.

### 보존된 이전 릴리스 이력

최신 재개: b773420의718단위/reviewed44/all-five 로컬 gate는 통과했으나 기존295는 개발 manifest4실패(261pass/30policy skip)였다. INC-PWA-101 설정을 분리한 뒤 manifest/공유 진입 회귀8/8을 통과했다. 새 clean 후보의 전체 검사를 이어간다. PWA 실제 갱신24/24와 이 개발 manifest 회귀는 별개이며 운영·음성 코어는 변경하지 않았다.

2026-10-13 재개 검증: **INC-PWA-100의 검사 동기화 결함을 수정했고 새 실제 빌드 PWA 24/24가 통과했다**(`pwa-update-2026-10-13/cohort-MUoLPj`, exit0). 구 active의 상태를 새 SW 활성화로 오인한 조기 재진입을 없애고, installed 및 정확한 새 versionId의 activated를 확인한다. CDP에서 구 version의 redundant와 새 bundle/양언어 모달을 독립 교차 확인했다. 강제 활성화·캐시 삭제·검사 제외·timeout 확대는 하지 않았다. 아래22/24는 보존된 이전 실패 이력이다. 이 통과는 격리 PWA 전환 검사이며 새 전체 release/Preview/복귀/가족/가청/backup/predeploy를 대체하지 않는다. 나머지 게이트를 이어서 실행하며 아직 Production·push는 하지 않았다.

2026-10-13 추가 후속: 양언어 업데이트 모달·단일 탭/최종 reload guard·실제 빌드 PWA 검사·dual-SHA Preview 읽기 전용 verifier를 로컬 구현했다. 최초20unit/일반12browser 후 독립 반증을 보강했고 최신24browser는22통과/2실패(Chrome 최초032전환)로 보존했다. 운영/Preview 쓰기·원격push·콘텐츠 재시드·음성 코어 변경0. 새 코드는 미커밋 작업 후보이며 이전0adb/145 SHA로 새 검증을 주장하지 않는다. [최신 릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md).

종료 실제6명령(cohort04)은 OpenAPI/typecheck/전체716unit/build/음성source/fresh0032 exit0, 문서915paths/73MD/1092links·lifecycle/36DBrefs·diffcheck 통과다. dirty 후보 검사이며 정식clean release gate가 아니다. ops39/2/0과 PWA 최초전환2실패를 함께 기록한다. Git commit/push와 원격 runtime/DB 변경을 하지 않았다.

## 2026-10-13 V7+160 통합 후보 — Preview 완료, 복귀 실패로 Production 차단

최종후속: 코드/문서21파일을 관련범위만 안전커밋 `0adbfc07afaa0bfcad87faf2fc6d2306a8fb2214`으로고정했다(사전staged경로/비밀실제값일치0·diffcheck). 같은cleanSHA의 cohort02 단위675(OpenAPI/typecheck/build/음성source/fresh0032 포함6명령exit0), 기존퀴즈·FSRS Chromium/WebKit26/26·skip/fail/flaky0·retries0. 26개음성은mock이다. local40/1/0, remote51/1/1·exit1은원격branch미push만이며운영장애가아니다. 현코드의전체295/레슨44/Preview/가족/실청취/전체rollback/backup/predeploy는아직이다. Production·원격push0,음성코어변경0. 후속결과문서는코드후보와별도로기록한다.

후속 승인/실행: 직전032 source에 quiz출판guard/내부version/queue점검을 추가한 별도 clean `f3caa61a3160dd5f69f56b17ae0a3c55a0211807`과 local branch `release/quiz-compat-2026-10-13`을 고정했다. 호환API200/typecheck/build 통과. root에는 동일quiz수정/0032/정확backupupgrade를 적용했고 초기dirty전체674·fresh 등6gateexit0, 동시회귀추가뒤API215·DB19를 확인했다. root의 성공200/철회409·410 OpenAPI 및 생성 타입도 실제계약에맞췄다.

격리fd38에만0032 적용→13표 기존행 hash불변→호환Worker read-only/off→retired submit409×2/detail410×2·canonical/기록/FSRS200·기존card/review보존·FK0→직접public0→호환Worker read-only 순으로 확인했다. 구Pages88ec97bd를 유지했다. 이는 terminal-withdrawn 원장의 제한회귀이며 신규전체복귀gate가아니다. 새candidate전체Preview/가족/backup/predeploy/Production/원격push는아직이다. 실패원본과 현재a49Preview/운영032source를 유지한다.

후속 실행: 로컬c21d39a/a49b076 두 commit·동일a49 clean worktree를 고정했다. 최종local-cohort03 단위649/OpenAPI/typecheck/build/fresh·reviewed44/44·기존 기록12종 upgrade/reseed/공개/철회 보존 통과, 전체 기존 E2E265pass/30기존policy skip/0fail. 이전 실행 실패를 보존했다.

후속 문서/source10파일은 미커밋이다. 문서900paths/73Markdown/1069relative links/lifecycle/DBrefs·diffcheck 통과. local ops39/2/0; remote ops50/2/1·exit1의 유일한 실패는 승인된 배포 게이트 미충족으로 아직push하지 않은 locala49/origind626 차이다. remote 전체 통과로 기록하지 않는다.

실제 dedicated Preview0031/Worker b1fd8bdf/Pages96c8594a에5개600문항/220레슨/600품질링크/56ko speech를 atomic publish·verify했다. 구 실패160은 문항/기록 보존 후 Preview 비공개다. 원격전체44는 최신18pass/1fail/25미실행·timeout exit1로 미완료다. 같은 배포 native Chrome ko/ja각2 onend·재생구간HAR0·**현재 사용자 두 언어 가청 확인**, audio predeploy exit0. 가족 실제동선은 사용자 답변 ‘아직 확인하지 않았습니다’로 not-run이다.

격리 fd38bf8d DB에 합성 퀴즈를 준비하고5개 철회/공개0→실제 구032Worker→구032Pages88ec97bd→격리off 순으로 복귀했다. 철회된 퀴즈 submit200/활동+3·completed detail200/정답 반환으로 **복귀 실패(INC-QUIZ-098)**다. canonical N3 submit/records200·quiz3행/FK0 범위만 확인했다. 격리 Worker는 다시read-only/5release withdrawn이다. 운영에 쓰거나 운영 학습을 중지하지 않았다. Production source/IDs/settings는 후속read-only 조회에서도 동일하다. 운영 backup/restore/predeploy/배포와 Git 원격push는0이다. 구 Worker 그대로 복귀 요건을 호환guard Worker로 바꾸는 사용자 결정을 요청했다. 상세 시계열/증적은 [통합 릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md)이다.

아래 내용은 이번 세션의 **초기 실행 이력**이며 ‘아직미실행’ 표현을 최신 Preview 상태로 해석하지 않는다.

현재 세션 사용자는 전체 검증·조건부 Production·최종 push를 승인했다. 이전191개 변경과 failed/frozen artifact를 보존했다. 시작 ops39/2/0. 운영 및 Preview ledger31/latest0030/0031=0을 실제 SELECT로 확인(쓰기0), Worker aedcbd40/Pages f62a8bdb/source032b50dd/Production branch main을 재조회했다.

- 유지보수 helper: 필수 검증 함수 부재의 fail-first1실패→초기5/5. 독립 probe의 잘못된 env가 Production 기본값으로 향하는 P1을 교정한 최신6/6이며 split/unknown/duplicate/constructor 거부다.
- background guard: queue의 점검 무시를 최초1실패/2통과로 재현, 교정 후3/3. 실제 queue pause/workflow 종료는 별도다.
- strict target: Node3/3, 실제TOML Production/Preview 및 cross-target 반례 독립 검증. 최초 잘못된 Vitest 명령은 exit1이며 제품 테스트 실패와 구별한다.
- 시각5개: 네 메뉴/빠른 학습/계정 설정 통합을 실제 이미지와 대조한 뒤 Chromium 해당5개만 baseline 재생성,5/5·44.3초·exit0. 비교 허용값·마스킹·전역 skip 변경0. 이전 실패 스크린샷을 보존하며 전체295 gate는 아직 아니다.
- 운영 backup helper에 exact schema restore→0031 upgrade→원래 열의 행 hash 대조를 추가했다. 새 운영 백업/실제 복원은 아직 미실행이다.

통합 native 후속: 신규23/23·기존V719/19·API208/208, 실제 새 로컬Wrangler의 bound final SQL 변조 거절/공개0→정상600/220 공개→5개 철회/FK0을 확인했다. 독립 두P1(candidate/phase/DB 변조·NULL draft 부분 적재)의 원래 반례 재검증도 exit0/공개0이다. 해당 로컬 operator gate는 합성 회귀이며 원격 공개 허가로 재사용하지 않는다. 최신0031 SHA는 `9dbbc23715c4fd78454ef712b8dc67ae84af511aa15b4182b5a0ae3068c65d33`다. 원격 CLI는 현재 candidate의 complete600/220 local summary/drill을 추가 검증하며 과거/부분/변조 증적 차단1/1, 실제TOML을 포함한 target4/4다.

5개 통합 의미 봉인/출판/철회와 CLI는 구현 중이며 전체 새 gate·commit/Preview·가족/실제 Chrome·원격 복귀·현 backup/restore·Production·push는 아직 완료하지 않았다. 상태와 실패 대응은 [통합 릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md)에 기록한다. 음성 코어4파일 diff0, 운영 OAuth 변경0.

최종 문서 점검: 2026-10-12 KST

## 2026-10-12 정식 V7 출판 경계·Preview160 v3 — 로컬 검증·문서화만

현재 사용자 지시는 **로컬 검증·문서화까지만**이다. 안전 커밋, push, 새 Preview, 운영 migration/seed, Worker/Pages 배포를 실행하지 않는다. 음성 코어는 변경하지 않고 Google 우선·동일 언어 설치 음성 fallback·ko/ja·R2 발음 금지를 유지한다.

| 시계열 | 확인 결과 |
| --- | --- |
| V7 정식 계약 | 기존 실제 V7 동결본·두440승인을 다시 바이트/hash 검증하는 전용 profile, G0–G4 연결, 상태·수량 검증기, 전용 Preview-only adapter를 구현했다. Preview 명령 자체는 실행하지 않았다. |
| publish race 교정 | 적재/제어 상태 준비 후 문항을 바꾸어도 최종 공개가 진행되는 P1을 독립 검토에서 재현했다. 기존 `content_learning_links`에 nullable 원본 JSON seal 3열을 추가하고 UPDATE/DELETE/REPLACE 보호·최종 공개 SQL 재검사를 적용했다. 첫 실패 증적을 보존하고 9종 콘텐츠 변조·두 release 원자성 회귀18/18과 독립 재현 차단을 확인했다. 적용 대상0031은 아직 원격 미적용 후보다. |
| 별도160 새 버전 | 기존 불합격과 새 v2 A/B 각158승인·2반려를 보존했다. 별도 v3에서 쓰기 과제/rubric 불일치와 문법 계산의 누락 전제 2문항만 고쳤고 실제 A/B 각160/160 승인·finding0이다. N2/N1/TOPIK의 release/audit/question version을 각각 suffix로 분리해 DB 고유키·join을 맞췄다. 전수 맹검·실제 가청·외부 공개의 증거는 아니다. |
| cohort01 실패 | 루트 tsx 의존성이 없는 실행은 artifact 생성 전 실패했다. 설치된 DB workspace launcher로 전환한 첫 수집에서 generic 품질 JSON이 `reviews`를 내보내 `reviewers` 정확2 계약에160건 실패했다. 원본 log/receipt/summary-failed 보존. |
|160 어댑터 교정 | 쓰기8건을 실제 API의 다국어 rubric/sample key로 연결하고 듣기8건의 `audio_text_ko` 누락과 stable ref 급수 tag를 수정했다. 동결본/의미 리뷰는 편집하지 않았다. 실제 Python checker 포함 회귀5/5 및 독립 실제0031 메모리 DB의120 join·쓰기8/듣기8·reseed/rollback/기존 사용자 보존/FK0을 확인했다. |
| cohort02 실패 | 전체 검사 중 D1 API3/205가 expression depth100 초과로 실패했다. 네이티브 SQLite depth1000 통과만으로 D1 적합성을 입증하지 못했다. 조건 비교를 보존하면서 AND 그룹을 분리한 뒤 실제 API205/205와 출판 회귀18/18을 재확인했다. |
| cohort03 실패 | 단위613/0/0(Ops29/DB224/Web155/API205), OpenAPI/typecheck/build/음성 source 계약은 통과했다. 그러나 Wrangler의0031 SQL 분리에서 `incomplete input`으로 fresh와 E2E 서버 시작이 실패했다. 브라우저0이며 전체 gate 통과가 아니다. 실패 격리 DB `nihongo-n3-db-verify-pfTKww`와 원본 로그를 보존한다. |
| 수집기 경계 | 중간 G4 뒤 공개/철회 drill이 실패해도 Preview가 중간 report를 수락하는 경계를 교정했다. `g0-g4-local-preflight.json`은 내부 drill 전용이다. 최종 G4는 실제 공개/재시드/철회·12종 합성 기록 hash 불변 후에만 생성하고, Preview CLI가 완료 표식·동일 cohort/manifest hash·543 draft행·결과를 강제한다. 전용2/2와 독립 재검토 통과. |
| Wrangler 교정 | 설치4.103 splitter가 `=CASE`/`<>CASE`를 놓쳐 trigger의 END를 분리하는 원인을 확인했다. SELECT RAISE WHERE·IIF·정적 job 매핑으로 조건을 보존해 수정했다. fail-first 분할 회귀1실패를 보존하고 수정 후19/19, 실제 API205/205, 새 로컬 Wrangler32개 migration/latest0031/FK0을 확인했다. |
| 최종 cohort04 | 실제 runner exit0. 전체 단위 **614/0/0**(Ops29/DB225/Web155/API205), OpenAPI·typecheck4 workspace·build(dry-run)·음성 source 계약·fresh D1·local gate checker 모두 exit0. 새로운 격리 Worker의 desktop/mobile Chromium/WebKit **44/44, skipped/flaky/failed0**이며11급수×20레슨 API 제출/재전송/FSRS/기록과 급수별 대표1레슨 UI 저장 제출·중단·재개다. 전체220화면 인간 검수나 실제 소리 증거는 아니다. |
| 실제 local release drill | 신규 격리 SQLite에서 V7 440문항/220레슨/880entries/440links·audits/48speech를 정식 local G0–G4 공개→idempotent replay→withdraw 했다. 별도160 v3는120JLPT+40TOPIK/160audits·links/8speech 등543행을 draft로 두 번 적재했다. 12종 합성 학습 표 전체 행 hash는 그대로다. 실제 사용자의 DB·원격에는 적용하지 않았다. |

현재 로컬 전체 gate는 **cohort04**로 통과했다. `summary.json`, `g0-g4-local.json`, `actual-fresh-upgrade-reseed.json`, `actual-local-release-and-withdraw.json`, 실제 command receipt/log·E2E JSON을 `.artifacts/learning-v7-release-2026-10-12/cohort04`에 보존한다. 이 G4는 local phase만 증명한다. `.artifacts/learning-v7-release-2026-10-12/cohort01–03` 실패 원본은 덮어쓰지 않는다. 이번 read-only Preview ledger 조회는0030까지31건·0031=0·rows_written0이었으며 사용자 로컬-only 답변 이후에는 원격 명령을 실행하지 않았다. 로컬 일반 ops는 catalog 갱신 후39/2/0이다. **새 Preview·가족·실제 Chrome onend/사람 가청/Network·현 schema backup/restore·Production은 미실행**이다. 별도160의 신규 원격 control-plane/publication도 미실행이다. commit/push 없이 HEAD/upstream `d626a16425a9a09a63b0af65928b51fd564c2834`를 유지한다.

종료 점검: 파일 지도887paths·Markdown72/relative1045·lifecycle13active/7retired/36DBrefs·diff check 통과. 일반 ops39pass/2warning/0fail이며 dirty191개 보존과 기존 `INC-DATA-024`만 경고다. 저장소 관리 대상+이번 증적959파일의 실제KRdict key 문자열 일치0/비밀 출력0, 기존160 v2 두 raw review SHA/`passed=false`도 재확인했다. 음성 코어4파일 diff0이다. 보조 문서 실행은 모델 capacity로 시작하지 못해 주 에이전트가 직접 갱신했다. 다른 모델로 바꿨다고 주장하지 않는다.

## 2026-10-11 보존 이력 — v7 두 독립 의미 승인·실제 로컬 검증 완료

v5 최종 A426/14·B432/8(합집합14문항/8cue), v6 최종 A438/2·B439/1(합집합2문항/0cue)은 불합격으로 보존한다. 실제 v6 readiness exit1/4차단. 새 v7에서 해당 쓰기2문항의 rubric/해설만 교정하고 새 동결 CLI exit0을 확인했다. 공개220개념·86 source 사실·원문·선택지·답 위치·예시는 보존했다.

| 최신 입력 | SHA-256 / 상태 |
| --- | --- |
| draft | `b1c7dda3b31d4bac030348f882c1786826588df83485a0f5573063a0a41b5871` |
| source | `f7f130d0322271ce5c264d728f423212fc3a37dfaf98d8169ffe7844d7cde2a7` — 기존86 취득 사실 재사용, 새 HTTP 취득 아님 |
| inventory | `85515cb49ac8462875c4863c38083880f426939e8f681d20d26a7e88b5989027` — cue 변경0으로 v6와 같은 bytes/SHA, 승인 상속 아님 |
| 의미 검수 | 같은3hash의 실제440문항/220cue/220레슨을 A/B가 독립 전수 검수해 각각440/440 승인, 미검독·finding0. A rawSHA `db1f4a0f9f174b48a02d730aeb93a2241cd9889770f6bf090e067d2a0a8ff52a`, B `ac0697d587f71816333a1931c181fa254477d72758731e85b150c88781d1d554`. 실제 readiness exit0/failures0/full_bank_ready=true |
| 최신 로컬 검사 | **unit-cohort03.log**의 실제 명령 exit0, 전체 단위588/0/0(Ops29/DB199/Web155/API205). typecheck-cohort04.log의 전체4workspace exit0, OpenAPI83public/12admin·음성 source계약 exit0. Worker dry-run/Web PWA build는 앞선 cohort01 exit0(실제 배포 아님). 별도 reviewed preflight sentinel1/1·shell문법·신규 E2E explicit tsc 통과 |
| 실제 local verifier | actual-local-db-cohort02.json exit0: fresh440/220/880entries/440links·audits/48speech, 재시드 불변/FK0. `/var/folders/5z/xfvw93_d0pn3v7b13f_wn3dm0000gn/T/learning-path-reviewed-9nLPRL` 새 격리 SQLite에서 기존12종 합성 기록 각1행의0030→0031 원래 열 값과 null lesson binding을 보존했다. users·session/step·annotation/activity·JLPT FSRS/review/daily log·TOPIK progress/FSRS/review·reward 포함. 실제 사용자 DB를 열거나 모든 실제 기록 보존을 입증한 것은 아니다. 앞선 cohort01(6종)도 보존 |
| 실제 staging CLI | stage-learning-path-v4.ts에 실제V7+A/B를 제공, exit0/200JLPT+240TOPIK/220lessons/440links/2draftreleases/440approved audits. 새 시스템 임시 `jlpt-reviewed-v7-20261011-cohort01.sqlite`; 원격0·미공개 유지 |
| reviewed E2E 준비 실패 | cohort01 metadata.sqlite를 사용자 D1로 잘못 합산, cohort02 migration0002의 기본owner를 실제 계정으로 오인, cohort04 migration0008의 기본 빈 track_srs_settings를 학습 기록으로 오인해 각exit1/browser0. 실패 DB bzOACZ/kuWFZe/Woa6ie 및 로그를 보존했다. 해시 D1 파일1개 선택, 자격 증명 없는 정확한 기본owner/빈JLPT설정1행만 보존 허용, 모든user_id 표와 종속·인증 기록은 거부하도록 교정. 실제0000–0031 migration 회귀 포함helper5/5와 독립 검토 통과. 기존 행 삭제0 |
| 실제 reviewed E2E | cohort03 desktop22/22 exit0 뒤, 최신helper를 사용한 새 격리 DB의 **cohort05 데스크톱·모바일 Chromium/WebKit44/44 exit0(2.3분)**. 각11급수×20레슨의 실제 Worker 제출·답/해설·재전송·기록·FSRS를 검사하고 급수별 첫1레슨 UI 시작/저장된 제출/중단·재개를 대조했다. 모든20레슨의 화면을 사람이 검토한 증거가 아니며, Preview·가족·실제 음성 재생/가청의 증거도 아니다. 새보고서 e2e-fixture-cohort05.json과 e2e-cohort05.log에 고정 |
| Preview160 별도 의미 재검수 | 같은 별도draft/source/intake hash에서 실제160건 전수 독립 재검수: A143승인/17반려·B144/16, union17문항. 두 passed/full_bank_approval=false, 미검독0. 자동quality160pass로 의미 실패를 덮지 않는다. A rawSHA `3e5cd4765c24c5197e7a1603f62321d267307a7dcb50d89eaa3b267e308b730e`, B `94b50cdc1992ab5bf3204b828140f8f1a3d506e3b6cdc72a7c0d5d68311b7d78`. 기존 Preview 콘텐츠/리뷰는 편집하지 않으며 새 버전으로 교정/재검수 전 승격 금지 |
| QA 공개 상태 | 초기 published-state 로컬 runtime fixture는 `publication_gate_evidence=false`, G0–G4 행을 만들지 않음. 실제 Preview/운영 공개 허가가 아님 |
| 공개 경로 개발 미완료 | V7 두release ID `learning-path-jlpt-lp7-2026-10-11` / `learning-path-topik-lp7-2026-10-11` 전용 profile·G0–G4 증적 연결·guarded Preview seed/publication hook·440/220/880 검증기가 아직 없다. local draft stage·범용 Preview 후보 생성·기존160전용 profile·E2E published fixture로 이를 대체하지 않는다 |
| 미완료 | Preview160 새 버전 교정/두 의미 승인, V7 정식 공개 경로·G0–G4/새Preview/가족/실제Chrome onend·가청/Network·현schema backup/restore·현재Production 승인·배포·push. 현재 로컬 통과는 출시 완료가 아니다 |

v6 전체 단위576/0/0·typecheck는 해당시점 검사다. 최신 v7 로그는 ignored `.artifacts/learning-path-v7-2026-10-11`에 보존한다. local verifier의 SQL 바인딩·legacy 키·신규열 비교·TOPIK unit 접두사·빈 snapshot 오인을 회귀로 보강했다. E2E는 독립 검토에서 실제 target ref·localized 해설/쓰기 예시·저장된 제출 이후 재개 대조를 추가했다. bare E2E tsc는 tsconfig 없음으로 help/exit1, 다음 시도는 Node types 경로 없음/exit2; 기존 DB의 설치된 typeRoots를 명시한 최종 명령이 exit0이다. 제품 오류나 전체 typecheck 실패로 바꾸어 기록하지 않는다.

최종 보안 검사: 저장소와 후보 증적1925파일에서 실제KRdict key 일치0(비밀값 출력0). `.env.local`/`.artifacts`는 버전관리 제외다. 음성 핵심4파일의Git diff0이고 같은 언어Google우선/설치음성fallback 계약을 유지한다. 최초 remote ops는49pass/2warning/2fail(catalog stale·R2읽기전용조회 Cloudflare7403); 이후catalog861paths·Markdown72/relative1016·lifecycle13active/7retired/36DBrefs가 통과했다. 별도 전체 remote-cohort02는 **51pass/2warning/0fail exit0**, 최종 local은 **39pass/2warning/0fail exit0**다. 최초 실패는 그대로 보존하며 원인을 서비스 장애나 영구 권한 문제로 단정하지 않는다. 원격 일반 상태/발음 참조0 검사이며 새 콘텐츠·Preview·가청·배포 gate가 아니다.

종료 형상: dirty171paths를 보존하고 HEAD와upstream은 `d626a16425a9a09a63b0af65928b51fd564c2834`로 같다. commit/push·운영 migration/seed/deploy·OAuth 변경0. 경고는 미커밋 작업과 기존 `INC-DATA-024` manifest drift이며 `INC-RELEASE-087` 신규 출판 경로 개발 미완료는 ops의 일반 상태 pass로 해소되지 않는다.

## 2026-10-11 v5 새 동결 — 최종 불합격 보존 이력

v4 동결/최종 불합격을 편집하지 않고 새 버전으로 저작했다. v4 합집합 거부137문항/13cue를 모두 수정하고 추가 TOPIK8문항을 정리했다. 새 reviewer는 작성에 참여하지 않았으며 이전 리뷰/상호 판정을 공유하지 않는다.

| 실행 | 실제 결과·범위 |
| --- | --- |
| v5 authoring/freeze | 440문항/220개념/220레슨, 구조/정답 위치 red flag0. 공개 정체성·급수·개념·답 위치 보존, 새 lp5 문항/레슨 ID. 실제 `content:learning:freeze:v5` exit0, frozen-cohort-01 새 leaf 독점 생성 |
| draft SHA | `abb1f01eb13cb3218f5395a7a1d31e54ff56c85c512786bda33fad363bc456d3` |
| source SHA | `13f6dfe17602b12a53815c41ff55b945739ab656aa367445d77c0f8fc0144583` — source06의86사실 재사용, acquisition_reused=true. 새 HTTP 취득 아님; 실제 동일 bytes 실행 patch/source/payload hash 연결 |
| inventory SHA | `163ffb9de5b1ba0fb10b25e2e34ec527fce4dc5ed63c2f1fa7cf34eca8c5ab71` |
| 독립 의미 검수 | 최종 A426승인/14거부·cue7, B432/8·cue1. 합집합14문항/8cue 불합격, 실제 readiness exit1/4차단 |
| 최신 전체 단위 | `pnpm test` exit0, **574pass/0fail/0skip**: Ops29/DB185/Web155/API205. v5와 snapshot/버전/ordinal/저장·비어 있지 않은 upgrade 회귀 포함. 합성 리뷰 fixture는 실제 의미 승인 아님 |
| 최신 type/build | `pnpm typecheck` 모든4workspace exit0. `pnpm build` Worker dry-run/Web PWA exit0. 실제 배포 아님. 로그는 `.artifacts/learning-path-v5-2026-10-11`에 분리 보존 |
| adapter 교차 검토 | 승인 전 파일 생성·충돌 은폐·transaction/counts 교정 후6저장 회귀 통과. 실제 failed v4 리뷰를 준 stage CLI exit1이고 DB 파일 없음 확인. 버전 라벨/patch cache·주석 사이 dynamic import 반례를 독립 검토로 발견·고친 뒤 AST 회귀 통과. 신뢰된 저장소 코드 실행이며 hostile JS sandbox 아님 |
| E2E 범위 재확인 | 기존50개는 canonical/grade1 fixture와 빈 레슨 목록 검사. 신규220레슨 실행 아님. 실제 승인 bank를 Wrangler temporary persistence에 연결하는 adapter/11급수 레슨 E2E는 후속 |
| 미실행 | v5 두440/440승인·실제 신규 draft staging/reseed/fresh/nonempty upgrade/11급수 레슨·Preview160별도·G0–G4/새Preview/가족/실제Chrome/가청/Network·현schema backup/restore/현재Production승인·배포·push |

아래 v4 검수/사전 취득과 v5 검사 수는 보존 이력이다. v5 실패는 v6, v6 실패는 v7에서만 수정했다. 정상 학습 기록·음성 코어·운영 OAuth·원격 Git을 변경하지 않았다.

## 2026-10-11 공식 API 취득·v4 동결 — 두 의미 불합격 보존

앞선source04의4개부족을현재상태로재사용하지않는다. 사용자가 `.env.local`의 `krdict_API_KEY` 위치를알려준뒤값을비노출로읽고공식API취득을실행했다. 운영/음성코어/원격Git 변경은없다.

| 실행 | 실제 결과·범위 |
| --- | --- |
| 공식API | 봉지59344/변경變更14470/민원실57365/분리21086/배출排出58441, HTTP200·정확표제어/원어entry확인. XML/예문/음원/키는저장하지않고응답SHA+짧은언어사실저장 |
| provenance 교정 | API01/source05는보존. 독립검토가API표식을일부지워legacy로우회하는반례와첫definition의범위문제를발견했다. 모든API표식에서전체provenance를필수화하고actual sense_order/first-returned-sense를명시한API02/source06을새로취득. 고유sense승인주장없음 |
| source06 | records86·public concepts220·exact lookup0실패·source failures0·full_bank_source_complete=true. source SHA `850e8fbbfdad827d8db3920bb972f045924819cc3aaa9d7dacb5e0c15426c376`, 스킬구조86/86 exit0. 두의미승인아님 |
| 실제동결 | `content:learning:freeze:v4` exit0, fresh `frozen-cohort-01`에440문항/220개념/220레슨. draft `b51c2934f9f80f4939f28ab4ca7c3bd5839274250cfd2343ce7cda21560c21c1`, inventory `5489bd9df91d2e097ddd5edd713b7bcab71aaddb09cf84db65b230dbf4a319e0`; unpublished/DBwrites0 |
| 독립의미검수 | 같은 세 hash의 440/220/220 실제 검독. 최종 A319 승인/121 거부·개념 지적12, B318/122·개념 지적8, 두 passed=false. 합집합 문항137/개념13. A 중간320/120은 최종으로 사용하지 않음. readiness 실제 exit1/4차단. 새 v5 수정 중이며 승인/실제 staging 아님 |
| API도구교차검증 | API/projection회귀2개와독립우회반례검사exit0. frozen+checkpoint8파일의실제key값match0, `.env.local`/`.artifacts` Gitignore확인. API정상경로키비출력·원문미저장확인 |
| 마지막통합실패 | `verify:ci`는단위561/typecheck/OpenAPI/build통과후fresh TOPIKpractice local실행에서exit1. Wrangler로그는`other side closed`이며원인미확정. 실패workspace `nihongo-n3-db-verify-WRnNHj`/기존로그보존. 이를통합통과로보고하지않음 |
| 독립재확인 | 같은실패격리DB에서TOPIKpractice별도재실행33checks/exit0. 이어새격리workspace `nihongo-n3-db-verify-y3s3go`의전체fresh0000–0031/contentcontract/control-plane exit0. 운영DB가아니고실제새440staging도아님; 첫실패를지우지않음 |
| 초기도구명령오류 | root cwd의tsx미설치로combined출력첫생성이실패하고후속candidate는ENOENT. packages/db cwd에서새출력생성후재실행. 기존source/draft/키파일변경없음 |

아래561 검사는 API 코드 추가 전 범위다. 최종 전체검사/문서 수는 별도로 추가한다. 실제 리뷰 파일 SHA는 A `9598342a7688ee2878c9f6b5ed5cb117b3e1121ee66ccfd68b5f597d511c47ed`, B `f3c7d9a76d8728b53843e5b061e7bf9920d7080da64fa36fb5974ff662e698be`다. 이후는 새 v5 수정/동결/두440 승인→실제 staging·reseed·fresh·nonempty upgrade·11급수 신규 레슨→Preview160 별도→G0–G4/새 Preview/가족·실제 음성→backup/restore/현재 Production 승인 순서다.

## 2026-10-11 사전 웹 증적 보충·동결 도구 — API 취득 전 보존 이력

시작local39/2/0, HEAD/origin `d626a16425a9a09a63b0af65928b51fd564c2834`, 기존121개 변경을 보존했다. 본 후속은 로컬 출처 보충/검증 도구이며 운영 read-only 재조회·음성 코어·OAuth·migration/seed/publication·Worker/Pages·commit/push는 실행하지 않았다. 요청한 순서2–6 전체 완료가 아니다.

| 순서·실행 | 실제 결과·범위 |
| --- | --- |
| 공식 사전 증적 | official entry에서 안녕/부모님/공책/아침/맑다/대중교통/연결하다/문제/분석/비평10개 확인. `krdict-web-facts-cohort-01.json`에짧은 표제어/품사/뜻·URL/조건/취득시각/확인reference/transport 저장. SHA는verified-fact-projection-v1이며 원시HTTP응답hash 아님 |
| 남은 source | 후보03/04에4개 개념/5표제어: 봉지, 변경(變更), 민원실, 분리+배출(排出). timeout과 다른표제어/동형어/예시 검색 결과를 보존하고 누락사실을 추정하지 않음. full_bank_source_complete=false/full_bank_ready=false/의미 승인0 |
| 최신 candidate04 | 고정Git archive의원래seed로220exact lookup0실패·원본17파일hash 대조, records81/구조검사81/81 exit0. SHA `c598dd60f7a1afdb98e426d5e551d27961e40e65bccd33a54f407742db8705be`. 전체 source gate는exit1. candidate01–03 불변 |
| 로컬 구현 | 웹fact projection/provenance 검증, immutable seed plan·source binding, full freeze/readiness CLI·원래 public selection identity·세hash·literal true 두review·독점생성. 자동승인/DB write 없음 |
| 독립 교차검토 | hash 표식삭제/현재seed+과거SHA혼합/leaf경합/selection 뜻+fact+파생hash 동시변조/문자열 false 승인 반례5경로 발견·교정. 부모 관련12회귀 exit0, Astra 최종기존 반례차단 재확인. `INC-QA-078`; 문항 의미검수와 별개 |
| 실제 negative freeze | source03/04 각각exit1 complete-source 차단. `blocked-freeze-cohort-01/02` 디렉터리 모두없음. 가짜freeze/review/artifact 생성으로 다음단계를통과시키지않음 |
| 전체 단위/계약 | 최종 `pnpm test` exit0, **561pass/0fail/0skip**: Ops29/DB172/Web155/API205. 별도Web155/API205 요약도확인. 앞선558/555검사는과거중간결과로구분 |
| typecheck·계약·build | typecheck·OpenAPI83public/12admin·음성source계약 통과, Worker **dry-run**/WebPWA build exit0. 처음freeze/readiness fixture literal widening 타입오류를수정하고재실행한결과이며 실제배포아님 |
| fresh DB | 새격리tmp에서0000–0031·기존seed/FK/FTS/manifest/contentcontract/control-plane exit0. 기존canonical+합성계약의검사이며 새440/220 실콘텐츠 staging/reseed/nonemptyupgrade가아님 |
| 영향 E2E | learning-lessons/learning-experience/menu-smoke/audio-qa의Chromium/WebKit **50pass/0fail/0skip**, 기존공개학습11급수·세션/재전송/복습/기록·미공개빈목록·기존링크. 음성은mock이며 실제새220레슨/Chrome/가족/사람청취/Network증거가아님 |
| 문서·종료 | catalog811paths·Markdown72/relative links970·lifecycle13active/7retired/36DB refs·diff check exit0. 종료local39pass/2warning/0fail, dirty132paths/기존INC-DATA-024. 현재 HEAD/origin 동일; 기존작업/실패review/출처hash 보존 |
| 미실행 | full-bank 실제freeze/두독립440/440·실제draftstaging/reseed/nonemptyupgrade/11급수새레슨세션·Preview160별도검수·G0–G4·새Preview/가족관찰/실제Chrome onend·가청/Network·현schema backup/restore/rollback/predeploy/현재Production승인·배포·push |

다음은남은5표제어의공식exact 증적→새candidate05 이상→새full-bank3hash 동결→두독립440검수이다. 최신상세/정확hash는 [콘텐츠·가족 UX 기록](CONTENT_LEARNING_UX_UPDATE_PLAN.md), 열린source와도구교정은 [오류 원장](ERROR_LEDGER.md)을따른다. 과거자료/실패flag를편집해완료를만들지않는다.

## 2026-10-11 v4 전량 작성 후속 — source14개 부족으로 순서2 중단

시작 local39/2/0, HEAD/origin `d626a16425a9a09a63b0af65928b51fd564c2834`, 기존111개 변경을 보존했다. 이 후속은 로컬 작성/운영 도구 교정이며 Production read-only 재조회도 실행하지 않았다. 음성 코어·운영 DB·Worker·Pages·OAuth·commit/push는 변경하지 않았다. 아래550개는 새 실행이며 이전543개·브라우저116개 결과를 합산하지 않는다.

| 순서·실행 | 실제 결과·범위 |
| --- | --- |
| 나머지320 자체 저작 | JLPT N5/N4/N2/N1 및 TOPIK1/2/5/6 각40 완료. 기존N3/TOPIK3/4와 합쳐440문항/220cue. 각 파일 자동 구조/타입 확인은 의미 승인 아님 |
| 전량 자동 구성 | `content:learning:authoring:full` exit0: 11급수40문항/20개념/20레슨, 총440/220/220; 청해98고유/쓰기48; 답 분포 JLPT각10/10/10/10·TOPIK각8/8/8/8, flags0. snapshot `e2bd4a55…`. 실제DB 적재0·전체은행 동결false·의미 승인0 |
| KRdict 취득 실패 | 첫전체 민원실조회 실패(exit1, 앞선 성공 record는 메모리 소실로 artifact 아님), checkpoint run02 정책조회 실패/03 안녕조회 실패. 최초 로그·원래policy 재사용 시각/hash 보존. API 접근 권한/앱 장애가 원인이라고 단정하지 않음 |
| 출처 후보01/02 | 71record/220개념, actual memory canonical lookup0, source gate **exit1**: exact 사전 개념14개 미검증. 후보01 `8b50e47a…` 불변, 새02 `09a5d11c…`에도 full_bank_source_complete=false/full_bank_ready=false/remote_write0 |
| 출처 구조 검사 | 새02 intake 스킬 검사71/71 exit0. 처음 output URL의 끝 `/` 누락으로 파생 결과가 부모에 생성되어 최초 결과/로그를 보존하고 정규화·불변 output 수정 후 별도 `source-candidate-02-structure-retry/report.json`에서71/71 재확인. 새로운 source 다운로드·source14완성·전체 문항 승인이 아님 |
| 독립 gate 검토 | source key만 맞는 변조와 최종 output TOCTOU 발견→trusted inventory/source/file/개념identity 대조·exclusive-create 교정→Astra 검토에서 이전6개 변조 반례 모두 차단 확인. 의미440검수와 별개, 파일 수정/DB/remote 없는 독립 검토 |
| 전체 테스트 | 최종 `pnpm test` **550pass/0fail/0skip**, Ops29/DB161/Web155/API205, exit0. 새로운7개 회귀 포함. 앞선549개 검사와 구 source 실패를 별도 log로 보존 |
| TypeScript | 첫전체는 source validator의 optional evidence narrowing3개로 exit2. 누락 evidence를 명시적 실패/continue로 고친 뒤 최신 `pnpm typecheck` exit0. 초기 `typecheck-final.log`와 최종 `typecheck-verified.log` 분리 |
| 음성·보존 | browser audio source contract exit0, 음성 핵심3파일 Git diff0. source01·v3 intake/inventory·기존 intakev2의 SHA 일치, v1/v2리뷰는 false·v3대표만true·first120 snapshot 유지. source 계약 검사≠실제 가청/새 Preview 증거 |
| 문서·로컬 종료 | catalog799paths·Markdown72/상대링크955·lifecycle13active/7retired/36DB refs·diff check exit0. 최초 문서 검사는 합성 테스트가 존재하지 않는 source 문서를 가리켜 exit1; 실제 존재하는 문서 경로로 fixture만 수정하고 source contract3/3·동일 문서 명령 재실행 exit0. 종료local **39pass/2warning/0fail**, dirty121paths·기존INC-DATA-024 경고이며 HEAD/origin d626a16 유지 |
| 미실행 | full-bank freeze/두440의미리뷰·실제draft staging/reseed/fresh/nonempty upgrade·11급수 신규레슨 세션/재전송/복습/기록·Preview160재검수·G0–G4·새 Preview/가족/Chrome/가청/Network·현schema backup/restore/rollback/predeploy/현재Production승인·배포·push |

source14목록·정확SHA·다음순서는 [콘텐츠·가족 UX 기록](CONTENT_LEARNING_UX_UPDATE_PLAN.md), 오류는 `INC-SOURCE-075`, `INC-QA-076/077`이다. `.artifacts/learning-path-v4-2026-10-11`의 첫120/전체작성/source01/02/수집실패/검증로그를 보존한다. 이 후속으로 v4 의미 전체 통과·전 단계 완료·공개를 보고하지 않는다. 다음은 source14취득→새 candidate03 이상→전체새 hash 동결→두 독립440/440이다.

## 2026-10-11 순서 고정 후속 — 공개 개념·대표 승인·첫120 작성, 전체 공개 차단

시작 local39/2/0, HEAD/origin `d626a16425a9a09a63b0af65928b51fd564c2834`, 이전86개 미커밋 변경을 보존했다. 기존 v1 440초안/불합격, source v1/v2와 v2 대표 실패 JSON의 passed/hash를 편집하지 않았다. 새 대표 v3와 전체은행 작성용 v4를 별도로 만들었다. 원격은 조회만 했으며 migration/seed/공개/Worker/Pages/OAuth/음성 코어/commit/push는 변경하지 않았다.

| 순서·실행 | 실제 결과와 범위 |
| --- | --- |
| 공개 개념 확정 | Production SELECT220개·11급수 각20·lookup0실패·쓰기0. 공개 snapshot SHA `40f8d03a…`; 전체 운영 verifier 아님 |
| 환경별 ID 계약 | 운영/fresh 정수 ID 차이를 확인, 정확 급수·자연키·읽기/뜻 유일 일치로 실제 ref/version 사용. 실제 canonical seed220개 조회0실패·다른 급수/다른 뜻 대체 회귀 통과 |
| v2 대표 불합격 보존 | 두 reviewer 각 문항12개 정답 승인, 조사/문법 학습 안내 결함으로 전체 `passed=false`. raw file SHA `0bbb01ec…` 동일 보존 |
| 별도 v3 재검수 | N3/TOPIK3/TOPIK4 각1 대표 레슨·12문항·6개념을 현재 draft/source/inventory hash에서 A/B 독립 승인. 정적 의미/선언 화면 계약이며 실제 화면·전체440·배포 승인 아님 |
| 스킬 검증 | 대표 intake6개 구조 통과; 동일 두 리뷰를 portable question validator에 연결해 대표12개만 통과. quality report SHA `b4062bf5…`, full_bank_approval=false |
| 공급자별 수집 | EDRDG 실제27record/177facts·스킬 구조27개 통과. KRdict 정책 URL2회 제한 재취득은 timeout/exit1, 성공 artifact 없음. 원문/외부 예문/기출/음원 저장 없음; 기존 취득시각을 새 HTTP 수집으로 바꾸지 않음 |
| v4 첫 작성 | N3/TOPIK3/TOPIK4 각40, 총120·cue60·고유 청해26·구체 쓰기16. 자동 구조 flags0, 독립 의미 승인0, 실제 lesson DB0. snapshot SHA `49994420…`; 남은320·전체 intake·220레슨·두440/440 미완료 |
| 새 차단 gate | `content:learning:candidate` **exit1 유지**: v3 대표 통과/새220조회0과 full-bank-only·440/220/220/source/두전체리뷰 미완료를 구분. 과거 실패 readiness/구조 결과와 합산하지 않음 |
| 최신 전체 테스트 | `pnpm test` exit0: Ops29/DB154/Web155/API205, **543 pass/0 fail/0 skip**. 새13개 회귀 포함. `pnpm typecheck`·browser audio source contract exit0. 전체 build/fresh/브라우저를 이번 후속 source로 새로 실행하지 않음; 음성 source 계약은 실제 가청 증거 아님 |
| 문서·로컬 상태 | catalog783paths·Markdown72/상대 링크937·lifecycle13active/7retired/36DB refs·diff check exit0. local39/2/0, 경고는 dirty 형상과INC-DATA-024. 작성 중 catalog stale38/2/1은 재생성으로 교정한 후속 결과와 구분 |
| 운영 read-only 후속 | 첫 전체 `ops:status:remote`는 **50 pass/2 warning/1 fail·exit1**, D1 R2 발음 참조 검사 요청 Cloudflare7403. 설정/인증 변경 없이 같은 전체 명령을 별도 재실행해 **51 pass/2 warning/0 fail·exit0** 확인. `ops-remote.log`와 `ops-remote-retry.log`를 보존하며 원인은 확정하지 않는다. 기존 Worker/Pages/0030 ledger·TOPIK/CSP/legacy410·D1 R2참조0의 상태 검사이지 신규440/실제 음성/Preview 검증이 아님 |
| 아직 미실행 | 나머지320작성·전체은행 동결/두440검수·실제 draft staging/reseed/fresh/nonempty upgrade·11급수 신규 레슨 세션/재전송/복습/기록·Preview160 별도 검수·G0–G4·새 Preview/가족/Chrome/가청/Network·현 schema backup/restore/rollback/predeploy/Production 승인·배포·push |

순서/정확 hash/출처 계약은 [콘텐츠·가족 UX 기록](CONTENT_LEARNING_UX_UPDATE_PLAN.md), 오류는 `INC-DATA-072`·`INC-CONTENT-073`·`INC-SOURCE-074`다. 중간 ID 비교/타입 테스트 실패와 KRdict timeout 로그, 최신 검사 JSON/log는 `.artifacts/learning-path-v{2,3,4}-2026-10-11`에 보존한다. API/브라우저 테스트의 합성 계정·음성 mock을 실제 신규 콘텐츠 플레이/새 사람 청취로 보고하지 않는다. Production은0030/72-table 기준선이며 새0031/74-table 배포/backup 작업은 실행하지 않았다.

## 2026-10-11 콘텐츠·레슨·가족 UX — 로컬 부분 구현, 공개 차단

시작 HEAD/origin `d626a16425a9a09a63b0af65928b51fd564c2834`, local39/2/0과 이전 정리34개 미커밋 변경을 보존했다. 네 메뉴·학습 내 자유 문제·일본어 기초 표시·단원 URL 복귀·카탈로그/레슨 세션 연결을 구현했다. `0031`은 로컬 후보이며 운영 migration/Worker/Pages/OAuth/기존 공개 콘텐츠는 변경하지 않았다. 신규220레슨을 실제 DB에 적재하거나 공개한 상태가 아니다.

| 실행 | 현재 후보의 실제 결과·범위 |
| --- | --- |
| 출처 | v1 54record/236facts 보존, v2 54record/240facts 구조 검사54/54. URL/license/취득 시각/SHA/attribution, 원문·예문·음원 저장 없음. 새 v2 hash에 의미 재검수 필요 |
| 초안 구조 | JLPT200/TOPIK240·레슨 구성220·대본98, 분포/다국어 필드 구조 통과. 문항 의미 승인 아님 |
| 콘텐츠 공개 준비 | **exit1**, lookup31·명백한 red flag195·두 reviewer 불합격 및 최신 source hash 불일치. A151/289·B138/302(승인/거부), 각440ID·개념 지적189 |
| 독립 계약 검토 | 철회 후 저장 효과·homophone due 누락 발견→사전 검사/원자적 SQL guard/동일 급수 homophone 추가→회귀/독립 재검토 통과. `INC-LEARN-067`, `INC-SRS-068` |
| 전체 단위/계약 | iOS 인라인 수정 후 `pnpm test` exit0: Ops29/DB141/Web155/API205, 총530. 합성 저장 fixture220/880/440과 11급수 합성 API 사례를 실제 콘텐츠 승인으로 쓰지 않음. 앞선524개 통과와 새 iOS 전용6개(최초mock 설정 오류5/1→6/0) 결과도 구분 |
| 타입·빌드 | `pnpm typecheck`, `pnpm build` exit0. Worker build는 **deploy --dry-run**이며 원격 배포 아님 |
| fresh/upgrade | fresh0000–0031·기존 seed/FK/FTS/manifest/contract/control-plane exit0. 기존 기록 upgrade·재시드/불변성/트랙 격리/오류 원자성은 로컬 회귀 통과. 신규 초안 전량 seed/fresh는 미실행 |
| OpenAPI·음성 소스 | generate/check exit0(공개83/admin12 paths); browser audio contract exit0. 음성 코어 미변경, 실제 가청 증거 아님 |
| 브라우저 | iOS 수정 후 동일6spec/4project 전체 **116 pass/0 skip/0 fail**,3.0분·exit0, `.last-run.json`의 passed/실패 빈 목록을 대조. 11급수 기존 실제 로컬 시작/저장/재개·양언어 전체 세션/FSRS·오프라인/충돌·네 메뉴/기존URL·반응형·iOS 인라인/44px/닫기·음성mock. 신규220레슨 플레이·실제 가청 검증 아님. 앞선72/0/0·mobile14/2/0은 각각 보존 |
| 문서·상태 | iOS 수정 후 catalog748paths·Markdown72/상대 링크899·lifecycle13active/7retired/36DB refs·diff check exit0. 종료 local39/2/0(exit0), remote read-only51/2/0(exit0). 알려진 경고는 미커밋 형상과INC-DATA-024 |
| 새 릴리스 gate | Preview160 별도 승격 검수·실제220레슨 E2E·G0–G4·새 Preview/가족 관찰/Chrome 양언어 lifecycle·사람 가청/Network·현 schema 백업/복원·predeploy **미실행** |
| 외부 변경 | 신규 migration/seed/publication, Preview/Production deploy, commit/push 없음. 기존 운영0030/72tables·Worker aedcbd40·Pages f62a8bdb 유지 |

중간 브라우저 실패 screenshot/DOM은 ignored `.artifacts/learning-path-2026-10-11/e2e-{first,second,third}-failure`에 따로 보존했다. 옛5메뉴·계정 언어 select·`学習` 버튼 계약을 실제 네 메뉴/설정 언어 button 그룹·양 트랙 선택으로 고정했고 timeout/채점/저장 기준은 낮추지 않았다. 구조 보고/실제 canonical readiness는 같은 ignored 경로의 `quality.json`, `readiness.json`이다. fresh 증적은 `/var/folders/5z/xfvw93_d0pn3v7b13f_wn3dm0000gn/T/nihongo-n3-db-verify-Vc4YgB/artifacts`에 있다.

mobile 최초 실패는 `e2e-mobile-first-failure`에 별도 보존했다. `INC-UI-071`: iPhone Safari의 설치 banner pointer interception이 JLPT 첫 저장을 차단했다. 새 UX는 설치 안내를 설정 안의 정상 문서 흐름으로 이동하며,44px 닫기·dismissal 보존·standalone 제외·flag-off legacy는 유지한다. 테스트에서 미리dismiss/storage를 주입하거나 강제click으로 저장을 우회하지 않았다.

최초 원격 상태 검사는50/2/1로 catalog stale 한 건만 실패했다. catalog 재생성 뒤 정확한 전체 원격 명령을 다시 실행해51/2/0을 확인했다. 원격 read-only 상태 검사를 새 후보 배포/기능 전수/가청 증거로 확대하지 않는다. 로컬 확대 글자390px 일본어 설정 screenshot에서는 네 탭·언어/해설 분리와 설정 조작을 직접 확인했으며 가족 관찰로 대신 쓰지 않는다.

현재 완료 범위와 순서 고정 재작성은 [구현·품질 차단 기록](CONTENT_LEARNING_UX_UPDATE_PLAN.md)을 따른다. **불합격 검수를 승인으로 바꾸거나 다른 급수 fallback/합성 lookup으로 실제 seed gate를 통과시키지 않는다.** 전체 계획 완료·출시 완료로 보고하지 않는다.

## 2026-10-10 로컬 코드·폴더·문서 유지보수

시작 HEAD/origin `d626a16425a9a09a63b0af65928b51fd564c2834`·clean, local40/1/0·remote52/1/0을 확인했다. 미사용 API helper3·Web component1·중복 SW1과 존재하지 않는 PWA asset 등록을 제거하고, 수동 파일 지도·인벤토리·시계열 문서를 영구 경로와 자동 검사로 대체했다. 현재 상태의 과거 순차 기록은 `docs/history/CURRENT_STATE_2026-09-25.md`에 보존했다. 원문·seed95개/migration39개 hash·음성/DB 핵심7파일 동일성, 전체 로컬492개·fresh0030·영향 브라우저18개·문서71/링크861 검사를 통과했다. 재생성 산출물7,050,795 bytes는 저장소 밖 휴지통으로 이동했다. 종료 local39/2/0·remote51/2/0의 경고는 작업 트리/기존 manifest drift다. 실행 범위는 로컬 유지보수이며 새 commit/push·Production 배포/DB write는 하지 않았다. 대상·복구 경로·실행 명령은 [정리 기록](REPOSITORY_MAINTENANCE_2026-10-10.md)을 따른다.

## 2026-09-25 빠른 레슨·개인 보상 — Production 배포 및 Git 동기화

`0029–0030` additive DB, quick/daily 세션, 서버 학습일 스트릭, 안내 세션 XP·성취, opt-in 현지화 Push를 구현했다. Preview source `f8bb1679981844d29cbfdf9283c5343d207b74e8`, Worker `6be32f94-9809-4f16-a1d6-98e21bceac08`, Pages `a2dfacf2.nihongo-n3.pages.dev`에서 실제 사용자 양언어 가청과 학습을 검증했다. 최종 배포 source `032b50ddfea4051309ae95829520e6309e67a6ff`와 Preview source 사이의 변경은 문서 여섯 파일뿐이다. 콘텐츠 재시드·공개 변경은 없었다.

| 항목 | 2026-09-25 확인 결과 |
| --- | --- |
| 승인·음성 | 현 세션의 조건부 Production/push 지시, 동일 Preview 사용자 양언어 청취, Chrome 실제 onend 1/1·재생 중 Network 요청 0, audio predeploy gate exit 0 |
| 로컬·Preview | `pnpm ops:verify` exit 0(fresh `0000–0030`), Preview 전 급수 22/22(이전 동일 runtime), 빠른 레슨 최신 Chromium/WebKit 데스크톱·모바일 8/8, Preview Worker smoke 21/0·관리자/Google positive 2건 manual-required |
| 백업 | `.artifacts/d1-backups/quick-lesson-2026-09-25-pre0029`, `0028` profile 70개·checksum 70/70. 점검 직후 health mismatch와 첫 독립 재확인 실패를 보존; 후속 maintenance off·Worker/Queue 원복·OAuth 200·비인가 쓰기 401·설정 hash 동일 확인 |
| 복원 | 임시 로컬 `0030`에 70개 복원, 기존 행수/FK 0/FTS 일치·신규 보상/알림 2개 테이블 0. `coversLocalSchema=false`인 0028 백업이며 신규 기록의 추후 복구본은 아님 |
| Production D1 | 승인된 `0029–0030`만 적용, migration 31·pending/unknown 0; content source `3485c6e`/manifest `content-v3-d102868e3d43b9b3c1a4` 유지 |
| Worker·Pages | Worker `aedcbd40-6605-44d2-8227-d145a186bef0`; Pages `f62a8bdb-298e-446a-ab74-7d78ca47efd8`/main. source `032b50d`; Functions bundle 포함 |
| 사후 검증 | source-pinned content 392/392, FK/FTS·R2 발음 9표면 0, Worker smoke 7/7, auth proxy 3/3, Pages `/`·`/audio-qa` 200·legacy 410; 실제 Chrome PWA 새 자산 및 양언어 onend 1/1·Network 요청 0. Production 사람 가청은 별도 질문 대기 |
| rollback | 직전 Worker `c2901280-4c10-4671-bc61-dc262c88c692`, Pages `ce4e5e57-c0fa-4fe5-b268-00458d4e0300`; D1은 데이터 손상일 때만 백업 복원 |
| Git | 배포 source `032b50d`와 문서 커밋 `29e0c0a`를 `origin/feature/topik-product-expansion`에 push 완료. 이어진 읽기 전용 원격 검사 `52 passed / 1 known warning / 0 failed` |

predeploy/postdeploy gate는 `.artifacts/operations/quick-lesson-production-{predeploy,postdeploy}-result-2026-09-25.json`에서 모두 `passed=true`다. 자동 392개는 운영 원본을 immutable source에 고정했고 current HEAD manifest drift `INC-DATA-024`를 숨기려고 재시드하지 않았다. `pnpm ops:status:remote`의 배포 직후 실패 5건은 문서 기준선 0028/이전 Worker·Pages와 미push SHA의 불일치였으며, 문서 push 후 재검사에서는 `52 passed / 1 known warning / 0 failed`였다.

이 문서는 GitHub 유료 CI/CD 기능에 의존하지 않고 JLPT·TOPIK의 형상, 검증, 배포와 rollback을 관리하는 운영 원장이다. 코드·테스트·Cloudflare 원격 결과와 다른 내용이 있으면 실제 명령의 종료 코드와 원격 deployment ID가 우선하며, 같은 변경에서 이 문서를 바로잡는다.

## 이전 릴리스 — 2026-09-07 개인 학습 UX Production

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

### Git 동기화 및 종료

검증된 앱 이력과 문서/ops 후속 **`042fbb2b286be907f424a3a18e9d9e7813dc72c4`**를 `origin/feature/topik-product-expansion`에 일반 push해 exit0을 확인했습니다(기존5311ab7 → 042fbb2). 이후 전체 remote ops는 **52 pass / 1 known warning / 0 fail**, exit0이며 로컬은40/1/0·clean입니다. 경고는 기존 `INC-DATA-024`뿐이고 같은 배포의 source-pinned392 검사는 통과했습니다. 증적은 `learning-production-2026-09-07-ops-remote-after-push.json`입니다. 이 종료 기록은 별도 문서 commit으로 같은 branch에 보존하며 앱/Worker/Pages를 다시 배포하지 않습니다. 최종 원격 tip 일치는 ignored `learning-production-2026-09-07-final-git.json`에 기록합니다.

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
