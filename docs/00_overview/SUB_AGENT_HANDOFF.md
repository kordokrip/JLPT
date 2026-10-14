# Sub Agent 운영 인수인계

## 2026-10-14 UI 배포 실행 — 후속 후보 검증 중

사용자가 Production·push를 승인했다. 앱839188a/검토한 E2E1fdc15a는 원격 branch에 push했고 Preview94884c8a에 배포했다. 로컬834단위·fresh/OpenAPI/typecheck/build 통과, 기존 브라우저 최초270통과/21실패/30정책 제외 후 정확 실패키 재검증으로291통과를 확인했다(한 번의 전체 green 실행이 아님). 시각30·PWA24·고정 source canonical392 통과. Preview 실기능은31/32, WebKit TOPIK1 시작1건 시간초과·해당 동일 조건3회 재검사 통과이나 원인은 미확정이다. INC-UI-117의 초기 catalog 로딩 중 시작 버튼 위치 경합을 방어하고 새 후보를 검증한다. 실제 Chrome ko/ja 정상 종료·재생 중 network0은 확인했으나94884c8a 사람 가청 답변은 아직 없다.

현재0033/77표 운영 백업·정확 복원·행 비교·FK0 통과. Worker69cffaa1과 queues를 원복해 점검 해제/학습 저장 재개했다. 신규 migration·콘텐츠 write0, Production Pages는07bc33c4 유지. UI 복귀 대상은07bc33c4 Pages이며 Worker69cffaa1·DB0033·정상 학습 기록은 유지한다. 아래 미push/미백업 문장은 이전 시점 이력이다. 증거: `.artifacts/operations/ui-facelift-release-2026-10-14/`; 실패 artifact는 편집하지 않는다.

최신 후속: **v6는 승인됐고 로컬 앱에 적용했다.** frontend258·양엔진각90+32+12 합성UI 검증 통과. [통합 문서 최상단](UNIFIED_FRONTEND_DESIGN_2026-10-14.md)의 화면군별 관찰 한계를 읽는다. 다음은 실제 상세 화면 확인이지 backend/DB/음성/배포 도구 재작업이 아니다. 기존dirty/실패 로그를 보존하고 새 유료 시안·재승인·무관한 전체gate 반복을 하지 않는다. Production/push 미실행. 아래 ‘검토 대기/앱 미적용’은 이전 조사 이력이다.

현재 과업: **UI/UX만**. `INC-UI-116`과 [통합 디자인 문서 최상단](UNIFIED_FRONTEND_DESIGN_2026-10-14.md)을 먼저 확인한다. Superdesign대표시안v6은 검토 대기이고 앱 미적용. 다음은 승인 후 공통 레이아웃/페이지군 UI 수정이며 backend·DB·음성·배포 재작업이 아니다. 기존 전체 gate를 반복하지 말고 실제 화면 겹침/잘림 회귀를 먼저 확보한다. 34라우트 코드 감사와12조합 시안 검사를 전 페이지 기능/시각 검증으로 합산하지 않는다.

최신: 운영runtime78ee09a·Pages07bc33c4·Worker69cffaa1·D10033/77표 배포 완료. 점검off/queue 정상, 콘텐츠600/레슨220·기존 학습행 보존. [통합 실행 최상단](UNIFIED_FRONTEND_DESIGN_2026-10-14.md)을 먼저 읽고 통과한 동일 후보 gate를 반복하지 않는다. 실기기 푸시 수신·가족 관찰은 사용자 요청으로 사후 확인이며 재질문을 배포 차단으로 삼지 않는다. UI 복귀는 Pages2c0fea8d+새 호환 Worker 유지. 아래 pending/미push는 이전 이력이다.

최신: 후보78ee09a·활성 Preview3dee006a 배포 완료. 단위828/전체 브라우저291+정책 제외30/로컬44/PWA24/원격11급수44/개인화4항목/구 UI 호환3 통과. 개인화는 최초2통과+일본어30초 timeout2를120초로 제한 재실행하여2통과한 두 실행이며 실패 원본 보존. 실수신/사람 가청/가족 확인은 미접수. 이후 현 운영 backup/restore/predeploy→0033→호환 Worker→Pages→smoke→push 순서만 남는다. [통합 실행 기록](UNIFIED_FRONTEND_DESIGN_2026-10-14.md)을 먼저 읽고 통과한 동일 후보 gate를 반복하지 않는다. Production·원격 push 미실행.

## 현재 활성 실행 — 개인화 release

새 사용자 요청은 테스트·활성 Preview·실푸시·가청·릴리스 검증 후 Production/push까지 조건부 승인한다. 운영 baseline은 유지 중. 새 INC-REL-114/INC-PUSH-115와 통합 디자인 문서 최상단을 우선한다. 백업0033/77표·원본0032 명시 복원·scheduledTime·RFC8291 독립 수신자 회귀를 추가했다. Preview 전용 VAPID private 파일은 `.artifacts` 보호 경로에만 두며 Git에 넣지 않는다. 이전813/60을 새 활성화 전체 gate로 쓰지 않는다. 새 과업을 추가하지 말고 남은 release gate만 완료한다.

## 다음 작업 — 개인화 구현 검증·출시 준비

[최신 구현·검증 계약](UNIFIED_FRONTEND_DESIGN_2026-10-14.md)의 로컬 결과와 남은 출시 조건부터 읽는다. 후속 승인으로 계정 API·0033·개인화 UI를 구현했으며 원격/commit/push는 하지 않았다. 새 기능은 `VITE_ACCOUNT_PERSONALIZATION_ENABLED=true`에서만 활성화한다. 기존 콘텐츠/학습 저장/음성 코어는 유지한다. Terra는 계정 UI, Astra 하위 작업은 집계/독립 검토를 담당했고 이제 파일 소유권은 부모에게 반환됐다. 이전 경합 4건과 후속 구독 계정전환 2건을 보정했다. 다른 세션은 변경을 되돌리거나 기존 실패 artifact를 수정하지 않는다. 35 route/11급수 전체와 실제 Preview/기기 검증이 남으며 이전772/287/44를 새 후보 통과로 쓰지 않는다.

## 현재 인계 — 2026-10-14

지도 UI887d2b2/Pages2c0fea8d 배포 완료. [최신 릴리스](LEARNING_MAP_RELEASE_2026-10-14.md)부터 읽는다. Worker71e71638·D10032·콘텐츠/음성 코어는 보존한다. 앱 단위772/브라우저287+정책30/로컬44/Preview44/PWA24와 두 학습자/가청 확인을 새 후보에 연결했다. 운영 점검기의 실패01–03을 반복 성공으로 덮지 않았고04의74표 백업/복원·점검 해제 뒤 배포했다. 같은 검사를 다시 수행하거나 운영 도구를 새로 설계하기 전에 현재 증적을 확인한다. 아래 미완료 지시는 이전 시점 이력이다.

지도 후보94a04ff, test71f39de 이후 기존 기능 전체285/30/2와 reviewed44 실패 원본 보존. 딥링크 exact locator 수정 후4/4; reviewed 완료 노드는 같은 제목이 있으므로 첫 노드의 순서+정확한 이름을 검사한다. PWA previous-root/legacy-root 분리(현재운영/구자동). 새 전체 gate·Preview·실제 관찰·배포는 후속이며 과거 증거로 대체하지 않는다.

## 최신 요청 — 지도 통합 검증 후 조건부 Production

사용자가 서브에이전트를 활용한 기능·바인딩·이벤트 교차검증과 통과 후 배포를 요청했다. [지도 통합 기록](LEARNING_MAP_UX_2026-10-13.md)의 INC-UI-107–109와 최종 후보 결과부터 확인한다. 초기 실패를 지우지 않는다. UI 변경을 이유로 기존0031/0032·600문항/220레슨의 migration/공개를 재실행하지 않는다. 새 Preview의 가족/가청은 이전494f4ff9 확인과 별개다. Pages-only 회귀는 직전 정상 Pages로 복귀하며 현재 정상 Worker·DB는 보존한다.

## 현재 작업 — 승인 방향의 지도·레슨·완료 구현

[학습 지도 기록](LEARNING_MAP_UX_2026-10-13.md), `.superdesign/design-system.md`, `.superdesign/resume.json`을 먼저 읽는다. 사용자는 이미지 개선 후 레슨·완료 화면 구현을 요청했다. 같은 Superdesign 프로젝트/방향을 이어 쓰며 전체 초기화/기준 시안 유료 재생성을 반복하지 않는다. 네 메뉴·기존 API/DB/학습 기록·음성 코어를 보존하고 UI flag false로 기존 화면에 복귀한다. 아래 운영 릴리스 완료와 새 UI의 로컬 검사/미배포 상태는 별개다.

## 최신 인수인계 — 2026-10-13

**최종 배포 완료:**16:20:53 KST, Pages6b8b8a19/Worker71e71638/source37486f8/D10032. 점검off·두queue원복·smoke7/7·실제 운영Chrome ko/ja onend/HAR0 확인. `production-37486f8-runtime-runtime-20261013-01/result.json`이 최종 성공이며 원래W03failed는 그대로 보존한다. 다음 작업은 재배포가 아니라 D+1/7/30 관찰과 문서 최신 상태 조회다.

이 절과 [통합 릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md)의 최상단을 먼저 읽는다. 아래 후보0adb/a49/b773의 미완료 표기는 보존 이력이다. 현재 코드·원격 branch는37486f8, 운영 D1은0032/신규600문항·220레슨 공개·검증 완료다. Pages 전환과 점검 해제의 완료 여부는 현재 상태 문서의 최신 배포 ID로 확인한다.

- 재실행 금지: 이미 적용한0031/0032, 공개5개 release의 stage/publish, 원본 승인/hash/failed 변경. 기존 사용자 기록·canonical·TOPIK v2·음성 코어를 보존한다.
- 증적: `learning-release-2026-10-13/resume-37486f8`, W02 실제72표 백업/복원, W03 운영 공개/13표 보존, canonical392, 별도r2 전체 호환 복귀. Preview494f4ff9 사용자 가족/가청 확인은 이번 배포에만 연결한다.
- private operator 오류102–104는 앱 장애와 구분한다. exact Worker UUID 조회, opaque bookmark 대신 논리 비교, canonical proxy와 immutable503 분리가 수정 기준이다. 새 runtime-only continuation은 DB 재출판 없이 진행한다.
- 실제 회귀가 생기면5개 철회/공개0 → 호환Worker f3caa61 → 구Pages032, 정상 학습 보존 순서다. 가청은 사람 답변, onend는 브라우저 lifecycle, mock은 로직검사로 각각 구분한다.
- 출시 후 D+1/7/30 두 학습자의 완료·중단·재개·지연 재확인·FSRS·speech를 관찰한다. 월1회 source/부족 영역 점검만 수행하며 자동 콘텐츠 공개는 하지 않는다.

### 보존된 이전 인수인계

최신 재개: b773420의718단위/reviewed44/all-five 로컬 gate는 통과했으나 기존295는 개발 manifest4실패(261pass/30policy skip)였다. INC-PWA-101 설정을 분리한 뒤 manifest/공유 진입 회귀8/8을 통과했다. 새 clean 후보의 전체 검사를 이어간다. PWA 실제 갱신24/24와 이 개발 manifest 회귀는 별개이며 운영·음성 코어는 변경하지 않았다.

2026-10-13 재개 검증: **INC-PWA-100의 검사 동기화 결함을 수정했고 새 실제 빌드 PWA 24/24가 통과했다**(`pwa-update-2026-10-13/cohort-MUoLPj`, exit0). 구 active의 상태를 새 SW 활성화로 오인한 조기 재진입을 없애고, installed 및 정확한 새 versionId의 activated를 확인한다. CDP에서 구 version의 redundant와 새 bundle/양언어 모달을 독립 교차 확인했다. 강제 활성화·캐시 삭제·검사 제외·timeout 확대는 하지 않았다. 아래22/24는 보존된 이전 실패 이력이다. 이 통과는 격리 PWA 전환 검사이며 새 전체 release/Preview/복귀/가족/가청/backup/predeploy를 대체하지 않는다. 나머지 게이트를 이어서 실행하며 아직 Production·push는 하지 않았다.

2026-10-13 최신 후속: PWA 업데이트 모달/dual-SHA verifier가 미커밋 로컬 후보에 추가됐다. actual built24검사22pass/2fail이며 **INC-PWA-100 Chrome 최초032→새 앱 전환**부터 해결한다. 실패 원본/구·새 캐시를 지우거나 skip/timeout 완화로 성공을 만들지 않는다. 일반20pass는 실제 IndexedDB 합성 큐·활성화 중 이동도 검사했으나 사용자 기록/가청 증거가 아니다. 새 Preview/full rollback/가족/새 실제 Chrome·가청/backup/predeploy는 여전히 필요하고 Production/push 금지다. 음성 코어4파일과0031/0032/content은 이 후속에서 변경0이다. source 진입점은 `lib/pwa-update.ts`, `stores/pwa-update-store.ts`, `components/PwaUpdatePrompt.tsx`, `sw.ts`, `ops/learning-cohort-deployment.ts`. [통합 기록](LEARNING_COHORT_RELEASE_2026-10-13.md)의 추가 요청을 먼저 읽는다. 아래 이전 후보/이력은 새 후보 완료 근거가 아니다.

## 활성 작업 — 2026-10-13

최신C=`0adbfc07afaa0bfcad87faf2fc6d2306a8fb2214` clean코드커밋. 새cohort02 675단위/6local명령exit0·fresh0032, affected26/26 Chromium/WebKit(음성mock)이다. R=`f3caa61`는old032+보호만이며격리철회회귀PASS/read-only. codeC후속문서에는최근결과만추가한다. 이부분검사를정식publicationprofile/G0–G4/newPreview44/fullrollback으로사용하지않는다. 운영0030/032와Preview0031/a49는현재도유지된다. 다음은cleanC의새전체releasegate/Preview·메타데이터분리검증이며family현재not-run·가청증거는a49에만유효하다.

**승인 후속 우선:** 호환복귀정책 변경은 승인돼 수정/격리 회귀까지 완료했다. R=old032기반 f3caa61/별도 local branch/worktree, runtime변경 quiz3+queue defer. C=root 현재quiz수정+0032+backupupgrade+OpenAPI이며 아직 최종source고정이필요하다. API215/R200/DB19, 초기작업트리674·fresh 등통과. fd38에서0032·13표 hash보존·retired409/410·기존N3/records/history/FSRS200·기존card/review보존·public0/FK0이며R read-only다. 제한회귀PASS를새C전체rollback게이트로사용하지않는다.0031 불변/032SHA7cecb1f…/74tablecoverage profile31·ledger32 구별. 이전‘사용자선택대기’는초기이력이다. 새cleanC local/Preview44/별도새전체drill/가족/같은C음성/현backup/predeploy전Production/push금지. 원본a49publishauthorization를새SHA로편집하지않는다.

**최신 인수인계: Production 차단**. a49 최종local649·reviewed44·기존265pass/30policy skip/0fail과 Preview600/220 공개/verifier는 완료다. Preview는0031/Worker b1fd8bdf/Pages96c8594a이며 Production0030/aedcbd40/f62a8bdb/main은 변경하지 않았다. 같은 배포 native Chrome 양언어 종료·현재 사용자 가청·재생구간 R2/legacy0은 통과했고 가족 N3/TOPIK3·4는 미확인이다. 원격44 suite 최신18pass/1fail/25미실행·timeout exit1이다.

INC-QUIZ-098 실제 격리 복귀는5개 철회/공개0→구032 Worker→구032 Pages88ec97bd 후 withdrawn quiz submit/detail200·활동+3으로 실패했다. generic quiz source는 구/새가 같고0031study_steps guard는 quiz_attempts를 보호하지 않는다. DB trigger만으로 구 SELECT 응답을 막을 수 없다. **구Worker exact 복귀에서 철회-aware 호환Worker 복귀로 바꾸는 사용자 선택을 기다린다.** 선택 전 새 runtime/migration 수정·Production/push를 하지 않는다.0031은 Preview/drill 적용 완료로 수정 금지; 후속0032로 분리한다. 격리환경 fd38bf8d/전용Worker/Pages는철회·read-only이며 terminal ledger 재공개 금지다. 정상 기록 삭제나 운영 백업의 격리 복사도 금지다.

root 미커밋 후속은 E2E CJS 로더 경로 교정과 문서다. 런타임 후보SHA a49 및 원본 local/Preview/음성/failed artifact는 불변이다. 로더 교정은 assertion/hash/대상차단을 바꾸지 않았다. 퀴즈 재현 독립 검토는 실패를 확인했지만 전체 learner 보존 통과를 주장하지 않았다. 정확한 증적·다음 결정은 [통합 릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md). 아래는 최초/과거 실행 이력이다.

사용자 범위는 V7+160 전체 검증/네 메뉴/조건부 Production/최종 push다. 아래10월12일 local-only 금지는 이전 세션 이력이다. 현재 원격은0030/Worker aedcbd40/Pages f62a8bdb·main이며 변경하지 않았다. 현재 gate/실행 순서는 [통합 릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md)을 먼저 읽는다.

신규 진입점은 `learning-cohort-release.ts`(5개 원자적 출판/철회), `learning-cohort-target.ts`(정확 대상/clean SHA), `learning-cohort-remote.ts`(stage/publish/verify/withdraw), `run-learning-cohort-local-gates.mjs`(실제 새 전체 gate/합성 보존 drill)이다. 기존 Preview-only 경계는 유지한다. 별도 원격 drill을 최종 Preview와 분리하며 운영 사용자 자료를 복사하지 않는다. family/audio receipt를 AI가 자동 통과로 작성하지 않는다.

helper는 env/점검 모드 필수·오타/중복 거부이고 새 회귀6/6, queue/cron3/3, target3/3을 통과했다. 시각5개는 의도된 UX 확인 후 그5개만 갱신했다. 새 전체 gate/Preview/실제 가족·가청·backup/restore·Production/push는 아직 미실행이다. 코어 음성4파일은 변경하지 않는다.

갱신: 2026-10-12 KST. 운영0030과 로컬0031 후보를 분리한다. iOS 설치 안내는 새 후보 설정의 인라인 region이며 첫 학습을 가리던 배너를 되살리지 않는다(`INC-UI-071`). 과거 순차 실행 내역은 [릴리스 원장](LOCAL_RELEASE_LEDGER.md)과 [과거 상태 스냅샷](../history/CURRENT_STATE_2026-09-25.md)을 따른다.

## 이번 후보의 인수인계 — 공개 금지

10월12일은 **최종 로컬 gate 완료 / 원격 작업 승인 없음**에서 종료했다. cohort04 단위614·4 workspace typecheck·OpenAPI·build·fresh·reviewed E2E44와 실제 fresh/upgrade/reseed·local G0–G4 공개/철회·12종 합성 학습 기록 불변을 확인했다. 두 release의 single UPDATE exact JSON seal과 기존 NULL 보존, D1 depth/Wrangler splitter 회귀를 유지한다. 초기 cohort01–03 실패는 편집하지 않는다. commit·push·Preview·Production은 금지다.

Preview160의 기존17문항 실패와 v2 A/B158/2 실패는 보존한다. 새 v3는 A/B160/160·실제 품질 checker·별도543 draft행/reseed/120 release-audit-question join·쓰기8/듣기8 바인딩을 검사했다. 새160의 원격 공개/control-plane과 가족·가청 검증은 하지 않았다. V7 전용 profile/publisher는 구현됐지만 로컬 통과를 Preview/Production 승인으로 확대하지 않는다.

일반 local ops39/2/0이며 remote51/2/0은10월11일 보존 이력이다. 로컬-only 답변 이후 원격 조회/변경0, HEAD/upstream d626a164 동일·commit/push0이다. 현재 실행 증적은 `.artifacts/learning-v7-release-2026-10-12/cohort04`; 최종 G4는 `g0-g4-local.json`, 중간 preflight는 Preview 진입 근거가 아니다. 비밀 파일/증적 원문은 커밋하지 않는다.

[콘텐츠·가족 UX 기록](CONTENT_LEARNING_UX_UPDATE_PLAN.md)을 먼저 읽는다. 네 메뉴·카탈로그 API·0031 snapshot·철회 guard는 로컬 후보다. v1 A289/B302거부·lookup31/red flag195, v2 대표 실패, v3 정적 대표 승인, v4/v5/v6 전체 실패를 모두 보존한다. 운영 SELECT 공개220개념·급수별20·조회0실패/쓰기0은 선택 증거이지 cue 의미 승인이 아니다. 이후 V7 두440/440과 로컬 staging은 완료했다. 불합격 passed/hash 편집 및 합성 fixture를 실제 의미 승인으로 보고하는 것은 금지다.

진입점: API `lib/learning-lessons.ts`, `routes/learning-experience.ts`; Web `features/learning/LearnerLessonLibrary.tsx`, `pages/LearnHub.tsx`; DB `drizzle-v2/0031_learning_lessons.sql`. 구 `seed/learning-path-draft.ts`는 실패v1용이다. `capture-learning-path-v2-baseline.ts`/`learning-path-v2-contract.ts`는 공개 선택/환경별 해석, v2/v3 prototype과 reviews는 보존 정적 증거다. 새 `learning-path-v5-authoring.ts`/`freeze-learning-path-v5.ts`/`learning-content-patch-snapshot.ts`/`learning-path-revision-contract.ts`는 v4 실패 원본과 patch 실행 bytes/hash·새ID/버전을 대조한다. 자동 구조는 의미 승인과 별개다. 공식 API02/source06의 첫반환 sense와 원래 취득시각을 보존하며 새 source derivative를 새 다운로드로 주장하지 않는다.

## 시작 순서

재개 시 현재 사용자의 작업 범위를 먼저 확인한다. 이번에는 로컬 검증·문서화만 승인됐다. 향후 별도 승인된 후보 고정/새 Preview에서 V7과 별도160의 증적을 분리하고11급수 실제 계정 흐름·가족 관찰·Chrome ko/ja onend/사람 가청/Network R2·legacy0을 새 배포에 연결한다. 현 schema backup/restore·rollback·predeploy·현재 Production 승인 전에는 운영 쓰기 금지다. 결함은 새 버전/hash로 수정하고 기존 동결/failed를 편집하지 않는다. 음성 코어를 바꾸거나 mock을 가청으로 보고하지 않는다.

`selected-concepts.json`은 공개 선택 증적이며 cue의 교육 승인이 아니다. `learning-path-v4-authoring.ts`는 220 cue를 결합하며 `learning-path-full-contract.ts`는 개념2/문제2·동일급수·구조·trusted Git/source/identity를 검사한다. 의미·상황 차이·난이도는 독립 reviewer 대상이다. v4는 이미 동결됐으므로 원본 수정 금지다. 신규 draft adapter는 `seed/learning-path-v4-draft.ts`, local-only CLI는 `ops/stage-learning-path-v4.ts`다. 합성 메모리 승인 fixture는 adapter 검사일 뿐 실제 의미 승인이나 staging 증거가 아니다. adapter는 readiness 이전 파일 생성 금지, 시스템 임시 디렉터리의 새 파일 독점 생성, 복합키 충돌 검사, transaction rollback, draft 비공개를 강제한다. 구 v1 seed는 신규 v4에 사용하지 않는다.

루트 `AGENTS.md` → [문서 색인](../README.md) → [현재 상태](CURRENT_STATE.md) → [오류 원장](ERROR_LEDGER.md) → [운영 runbook](OPERATIONS_MANAGEMENT_RUNBOOK.md) → [로컬 CI/CD](LOCAL_CICD_OPERATIONS.md) → [릴리스 원장](LOCAL_RELEASE_LEDGER.md) → 작업 관련 source/schema/test 순으로 읽는다. 운영·버그·정리에는 `.codex/skills/project-operations-steward`, 콘텐츠 출판에는 `content-release-automation`을 추가로 사용한다.

후속 진입점은 `dictionary-web-evidence.ts`, `immutable-learning-content-plan.ts`, `learning-path-v4-source-binding.ts`, `freeze-learning-path-v4.ts`, `report-learning-path-v4-readiness.ts`다. 독립 검토가 검증 우회5경로를 발견해 부모/독립 반례로 교정했다(`INC-QA-078`). 현재 checkout seed로 immutable SHA를 주장하거나 review boolean을 truthiness로 바꾸지 않는다. 새fresh/E2E50개는 기존 학습·미공개 상태/음성mock 검사이며 신규220레슨·실제가청으로 사용하지 않는다.

작업 시작과 종료 `pnpm ops:status`를 실행한다. 현재 배포를 판단할 때는 `pnpm ops:status:remote`를 사용하며, 새 파일·이동·삭제 후 `pnpm docs:catalog && pnpm docs:check`를 실행한다.

## 현재 기준선

| 구분 | 사실 |
| --- | --- |
| Production | D1 `0000–0030`, Worker `aedcbd40-6605-44d2-8227-d145a186bef0`, Pages `f62a8bdb-298e-446a-ab74-7d78ca47efd8` |
| 앱 배포 source | `032b50ddfea4051309ae95829520e6309e67a6ff` |
| 콘텐츠 source | `3485c6ef8addda3cd3e209730646c296175cf3c9`, manifest `content-v3-d102868e3d43b9b3c1a4` |
| 기능 | 다섯 메뉴, quick/daily 세션, 기록·메모·FSRS, 서버 학습일 스트릭, 안내 세션 XP, 현지화 opt-in Push |
| 콘텐츠 | N3 정적120·TOPIK practice v2 300·owner Batch5까지 운영 공개; N2 60/N1 60/TOPIK Batch6 40은 Preview만 |
| 10월 10일 시작 | Git `d626a16`·origin 동일·clean; local40/1/0·remote52/1/0 |
| 알려진 경고 | `INC-DATA-024` HEAD와 운영 콘텐츠 manifest 차이. 원격 콘텐츠 검증은 immutable source 고정 |
| 복귀 | 직전 Worker `c2901280`, Pages `ce4e5e57`; 전체 ID는 현재 상태 |
| 현재 백업 계약 | 0030/72 regular table. 9월25일 배포 전 백업은0028/70이며 새 보상/알림 기록을 포함하지 않음 |

## 작업별 파일 지도

| 변경 대상 | 먼저 볼 파일 |
| --- | --- |
| Web route·네 메뉴 후보 | `apps/web/src/App.tsx`, `pages/Today.tsx`, `LearnHub`, `LearningRecords`; 이전 QuestionsHub는 통합 후 제거 |
| 학습 세션·메모·재전송 | `pages/StudySession.tsx`, `features/study`, `lib/learning-experience.ts` |
| 서버 학습·채점·공통 저장 | `apps/api/src/routes/learning-experience.ts`, `lib/study-content.ts`, `lib/learning-effects.ts` |
| XP·스트릭·Push | `apps/api/src/lib/motivation.ts`, `push-reminders.ts`, `routes/notifications.ts`, `apps/web/src/sw.ts` |
| 자유 퀴즈·TOPIK | `routes/quiz.ts`, `lib/quiz-questions.ts`, `routes/topik-owner-curriculum.ts`, `routes/topik-practice.ts` |
| FSRS·기기 시계 차이 | `hooks/useSRS.ts`, `lib/srs-due-snapshot.ts`, API `lib/fsrs.ts` |
| 발음 | `lib/audio.ts`, `lib/google-browser-speech.ts`, `features/topik/useKoreanAudio.ts`, shared `audio-policy.ts` |
| DB·migration·backup | `packages/db/src/schema.ts`, `drizzle-v2`, `src/ops/d1-tables.ts`, `d1-backup.ts`, `d1-restore-drill.ts` |
| 운영·폴더 관리 | `scripts/project-ops-status.mjs`, `generate-file-catalog.mjs`, [인벤토리](PROJECT_INVENTORY.md), [파일 지도](PROJECT_FILE_CATALOG.md) |

## 반드시 지킬 경계

- 계정×트랙×원본 ID·버전으로 바인딩한다. 문자열 문제 ID를 정수 FSRS ID로 강제 변환하지 않는다. 다른 급수 fallback·미공개 콘텐츠 노출·정답 사전 노출을 차단한다.
- 해설 열람·명시적 완료·최초 문제 응답·재시도·FSRS 평가를 별도로 저장한다. 기존 quiz/TOPIK 완료와 안내 세션이 공통 효과 서비스를 쓰며 내부 HTTP 호출로 중복 저장하지 않는다.
- SQL 종료 상태 guard, idempotent claim, annotation revision, `expected_track`과 오프라인 초안 보존을 유지한다. UI 표시·mock 결과만으로 서버 저장 성공을 보고하지 않는다.
- XP는 안내 세션의 서버 수락 결과에 연결된다. 자유 TOPIK practice의 client activity를 서버 확정 학습일로 계산하지 않는다.
- 같은 언어 Google 우선·같은 언어 설치 음성 fallback, ko/ja 제한, click task 즉시 speak·실제 onend 이후 성공을 보존한다. R2 발음 경로는 금지하고 legacy audio는410이다.
- approved 문제↔개념 link는 아직 생성하지 않았다. 개인 맞춤 출제·운영 재개 성공률·사람 가청을 검증 없이 주장하지 않는다.
- Production write/deploy는 Preview·backup/restore·rollback·gate와 해당 작업 승인을 따른다. 문서 정리의 실행 범위에는 원격 DB·배포 변경이 포함되지 않는다.
- migration·학습 source·snapshot·회귀 테스트·백업·quality/reviewer·복구 증적을 보존한다. 삭제는 import 그래프와 전체 참조/실행 설정을 대조한 뒤 수행한다.

종료 기록에는 변경 파일·참조 대조·실행 명령의 exit/pass/skip/fail·미실행 범위를 적고 `CURRENT_STATE`, 오류·운영·릴리스 원장과 파일 지도를 함께 최신화한다.
