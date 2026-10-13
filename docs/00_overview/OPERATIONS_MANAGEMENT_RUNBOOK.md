# 운영관리·버그·정리·릴리스 runbook

2026-10-14 지도 UI 운영 기준은 [최종 릴리스 기록](LEARNING_MAP_RELEASE_2026-10-14.md)이다. Pages2c0fea8d/source887d2b2, Worker71e71638/source37486f8, D10032를 구분한다. UI 회귀 복귀 대상은 이전Pages6b8b8a19이며 정상 콘텐츠/학습 기록을 철회하지 않는다. 점검기 오류INC-OPS-111은 실패와 실제 복구를 별도 기록했고, 최종74표 백업/복원/점검 해제 뒤 배포했다. 무관한 추가 리팩터링 없이 확인된 실패 범위만 수정한다.

PWA 현 운영 전환 검사는 `node scripts/run-pwa-update-gates.mjs --previous-root=<현재 운영 clean source>`를 사용한다. `--legacy-root`는 자동 업데이트 구버전용이며 두 경로를 별개로 검사한다. UI-only 복귀는 콘텐츠 철회 없이 직전 Pages 복귀다. 새 후보 gate 완료 전 운영 변경 금지.

## 지도 UI 배포의 복귀 범위

현재 사용자가 기존 기능 전수 연결·독립 검증 후 배포를 조건부 승인했다. 이번에는 DB/schema/콘텐츠/음성 코어 변경이 없다. 새 UI 결함의 기본 복귀는 **실제 조회한 직전 정상 Pages(37486f8 기준선)**이며 운영 Worker와 학습 기록을 유지한다. 아래5개 release 철회 절차는 콘텐츠 공개 결함에 대한 과거 cohort 릴리스 절차로, UI-only 회귀에 기계적으로 적용하지 않는다. 새 Preview·실사용/가청·backup/restore·rollback/predeploy 필수 게이트는 유지한다.

## 새 UI 작업의 경계 — 2026-10-13

[학습 지도 개편](LEARNING_MAP_UX_2026-10-13.md)은 이미지 개선과 연결 화면 구현 요청을 받아 로컬 구현으로 진행했다. Superdesign 합성 화면을 실행 중인 앱/DB/가청 검증으로 기록하지 않는다. `VITE_LEARNING_MAP_ENABLED=false`로 기존 화면에 복귀할 수 있으며 재시드·음성 코어 수정은 하지 않는다. 기존 운영 기준선은 아래 현행 규칙대로 유지한다. 새 Production은 별도 Preview/실사용/가청 및 현재 승인 gate 전에는 수행하지 않는다.

## 현행 운영 규칙 — 2026-10-13

최신 실측 상태와 배포 ID는 [CURRENT_STATE](CURRENT_STATE.md), 실행 순서·실패 원본은 [통합 릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md)의 최상단을 따른다. 아래 이전 후보의 차단·미실행 문장은 당시 이력이며 현재 상태로 재사용하지 않는다.

- 이미 적용된0031/0032와 공개된 cohort의 원본 승인 hash를 수정하거나 재적재하지 않는다. 출판 원장과 후속 runtime 배포 증적을 분리한다.
- 현재 schema0032는0031의74-table coverage에 출판 guard trigger를 추가한다. 다음 백업은 현재 schema를 다시 조회해74개 대상·ledger·trigger·FK/FTS와 별도 내부 sequence 복구 필요성을 확인한다. 이전72-table 백업은 전환 전0030의 증거다.
- Worker 생성 응답의 정확한 version UUID를 조회한다. 목록 첫 항목을 방금 생성된 버전으로 추정하지 않는다. D1 opaque bookmark 변화는 쓰기의 증거가 아니며 원본 컬럼/행·DDL·ledger를 직접 비교한다.
- Pages의 canonical `nihongo-n3.pages.dev`는 `API_ORIGIN` 미설정 시 코드에 고정한 운영 Worker로 연결한다. immutable Production URL의 API503은 의도된 격리다. immutable 정적 파일 hash, canonical API/인증/SHA를 각각 검사한다. Preview는 전용 API 설정을 계속 요구한다.
- 실제 공개 결함 시 신규5개 release 철회 → 공개0 확인 → 호환 Worker `f3caa61` → 이전 Pages `032b50dd` 순서다. 데이터 손상이 없으면 additive schema와 정상 학습 기록을 보존한다. 실패한 검증기의 오탐 수정은 별도 새 증적으로 기록하며 원래 failed를 고치지 않는다.
- 업데이트 모달은 한국어·일본어로 새로고침 동의를 받는다. 학습/로그인/메모 중·다른 앱 탭이 있을 때 갱신을 보류한다. 구032 앱의 최초 전환은 앱 탭/창을 모두 닫고 재진입해야 할 수 있다. 강제 캐시 삭제나 무조건 reload를 복구 절차로 쓰지 않는다.

### 보존된 이전 운영 이력

최신 재개: b773420의718단위/reviewed44/all-five 로컬 gate는 통과했으나 기존295는 개발 manifest4실패(261pass/30policy skip)였다. INC-PWA-101 설정을 분리한 뒤 manifest/공유 진입 회귀8/8을 통과했다. 새 clean 후보의 전체 검사를 이어간다. PWA 실제 갱신24/24와 이 개발 manifest 회귀는 별개이며 운영·음성 코어는 변경하지 않았다.

2026-10-13 재개 검증: **INC-PWA-100의 검사 동기화 결함을 수정했고 새 실제 빌드 PWA 24/24가 통과했다**(`pwa-update-2026-10-13/cohort-MUoLPj`, exit0). 구 active의 상태를 새 SW 활성화로 오인한 조기 재진입을 없애고, installed 및 정확한 새 versionId의 activated를 확인한다. CDP에서 구 version의 redundant와 새 bundle/양언어 모달을 독립 교차 확인했다. 강제 활성화·캐시 삭제·검사 제외·timeout 확대는 하지 않았다. 아래22/24는 보존된 이전 실패 이력이다. 이 통과는 격리 PWA 전환 검사이며 새 전체 release/Preview/복귀/가족/가청/backup/predeploy를 대체하지 않는다. 나머지 게이트를 이어서 실행하며 아직 Production·push는 하지 않았다.

2026-10-13 후속: PWA 모달 로컬22/24·Chrome 최초 전환2실패(INC-PWA-100)로 운영 배포를 시작하지 않는다. 새 모달은 단일 탭/명시적 동의/직전 경로·mutation 확인을 사용한다. 다른 앱 탭은 닫아야 하며 비-TanStack/background 쓰기의 원자적 안전까지 보장한 것은 아니다. 기존 앱에서 새 안내로의 최초 전환이 검증되기 전 갱신 완료로 공지하지 않는다. 출판 SHA와 앱 SHA는 별도 읽기 전용 검증으로 대조한다. [통합 기록](LEARNING_COHORT_RELEASE_2026-10-13.md)을 우선한다.

현재 실행: 2026-10-13 사용자 승인 통합 후보(V7+160/네 메뉴/조건부 Production·push). INC-QUIZ-098은호환R의제한회귀확인까지완료했다. cleanC0adb의675단위/affected26은통과했지만 **신규전체Preview/복귀·가족·새후보실청취·현backup/predeploy 미완료로 Production/push 차단**이다. [통합 릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md)의 gate 상태를 우선한다. 실제 Production Worker/Pages·0030와 기존Previewa49는보존중이다. 기존10월12일 local-only는과거범위다.

후속 승인: bare old Worker 대신 직전032+철회 guard+queue점검의 호환f3caa61을 준비했고 fd38/0032의 제한된회귀는 통과했다. **복귀는5release 철회→문항/레슨 공개0→검증된 호환Worker→직전Pages→기존기능/기록**이다. full 새후보 rollback 증거가 아직이므로 운영에 실행하지 않는다.0032는5trigger/테이블0·행변경0이며 backup table coverage0031/74와 실제 ledger0032를 구별한다. 새로운 source/증적은불변기존authorization와별도로연결한다.

복귀의 공개0 검사는 원본 DB 문항·레슨뿐 아니라 이미 저장된 quiz_attempts의 제출/정답조회에도 적용해야 한다. 정확 구032 Worker는 이 경로를 막지 않으므로 bare old Worker 복귀를 성공으로 기록하지 않는다. 호환 guard Worker/후속0032 또는 동등 보호 경로는 사용자 결정 후 새 후보·실제 drill로 검증한다. Preview에 적용된0031은 수정 금지다. 실패 terminal 원장 재공개·과거 failed 편집 금지이며 drill Worker는 철회/read-only로 보존한다.

배포 helper는 env/maintenance mode를 명시하고 사후 health의 SHA/모드를 대조한다. split/오타/중복 env는 거부한다. HTTP·cron guard와 queue defer만으로 실행 중 workflow 동결을 증명하지 않는다. 원격 queue pause/기존 workflow 종료와 진행 중 쓰기 종료를 확인한 뒤에만 백업한다. 복귀는5개 철회→문항/레슨 공개0→Worker→Pages→기존 기록/기능이며, 데이터 손상이 없으면 D1 전체 복원을 하지 않는다.

Owner: Project Operations Steward. 갱신: 2026-10-12 KST. 작업 시작/종료·버그·리팩터링·Preview/Production 전후·주간 점검에 적용한다.

현재 값은 [CURRENT_STATE](CURRENT_STATE.md), 오류와 회귀는 [ERROR_LEDGER](ERROR_LEDGER.md), gate는 [LOCAL_CICD_OPERATIONS](LOCAL_CICD_OPERATIONS.md), 날짜별 실행은 [LOCAL_RELEASE_LEDGER](LOCAL_RELEASE_LEDGER.md), 후속 Agent 진입은 [SUB_AGENT_HANDOFF](SUB_AGENT_HANDOFF.md)에 둔다.

## 시작과 판정

`AGENTS.md` → 문서 색인 → 현재 상태 → 오류 원장 → 이 runbook → CI/CD → 릴리스 원장 → 작업 source/schema/test 순으로 읽고 `pnpm ops:status`, Git 상태·HEAD를 확인한다. 진실 우선순위는 현재 명령/원격 조회 → 코드/schema/test → 현재 상태 → 오류/릴리스 → 과거 계획이다.

10월10일 시작은 clean·HEAD d626a16/origin 동일, local40/1/0·remote52/1/0이다. 현재 Production은0030·Worker aedcbd40·Pages f62a8bdb다. 전체 ID는 현재 상태에서 조회한다. 알려진 `INC-DATA-024`는 immutable 콘텐츠 source3485/manifestd102로 관리한다.

## 버그와 리팩터링

재현 URL·시각·영향 → 오류 ID → 최소 fail-first 회귀 → 코드/schema/network/asset 두 경로 대조 → 최소 수정 → 영향/전체 gate → 문서 갱신 순서다. P0 학습 불가·손상, P1 핵심 회귀를 신규 기능·콘텐츠보다 우선한다. 실제 환경의 수정 확인 전에는 closed로 쓰지 않는다.

리팩터링 전 API·DB·typed content ref·진행률·FSRS·음성 계약을 고정한다. 동작 변경과 구조 정리를 구분하고 기존 테스트를 약화하지 않는다. 조회/해설과 완료/정답/FSRS rating을 혼합하지 않으며 실패를2xx로 숨기지 않는다.

기기 충돌·오프라인에서는 원본 ID·request ID·미수락 초안을 보존하고 `expected_track`·revision 충돌을 명시한다. 프로필 loading/error와 configured:false를 구분하며 늦은 응답은 원래 계정×트랙에만 적용한다. 서버due를 기기시계로 다시 걸러 숨기거나 FSRS날짜를 보정하지 않는다. 빈 테이블 비교만으로 기존 학습 데이터 보존을 입증하지 않는다.

## 파일·문서 정리

1. `git ls-files`와 import 그래프, 전체 `rg`, package/config/route/CLI 진입점을 대조한다. import0인 entrypoint·SW·CLI·migration은 삭제하지 않는다.
2. 대체 실행 경로와 테스트·backup·seed/manifest·release 의존성을 확인한다. 날짜·v1·legacy라는 이름만으로 삭제하지 않는다.
3. 미사용 코드와 중복 현재 안내는 제거/통합하되 오류·release/rollback 증적은 보존한다. 과거 상태를 현재 안내에서 분리하면 `docs/history`에 보존한다.
4. 새 파일·이동·삭제 후 `pnpm docs:catalog && pnpm docs:check`를 실행한다. 영구 운영 경로는 유지하고 날짜별 파일은 당시의 실행 증거로 표시한다.
5. 재생성 산출물은 정확한 경로를 확인해 저장소 밖 휴지통으로 이동하고 원래 경로·크기·복구 위치를 정리 기록에 남긴다.

migration/snapshot·학습 원문·intake/quality/reviewer·backup/restore·recovery bundle·회귀 테스트·시각 baseline은 보존한다. `.wrangler`에는 로컬 D1 상태가 있으므로 광범위 cache 삭제를 하지 않는다. `.artifacts`·비밀·사용자 데이터는 Git에서 제외한다. 폴더 기준은 [인벤토리](PROJECT_INVENTORY.md)를 따른다.

## 로컬·원격 검사

10월12일 V7 출판 후보는 Preview-only target과 정규 G0–G4 profile을 사용한다. 최종 cohort04 단위614/E2E44·fresh/upgrade/reseed·actual local 공개/철회와12종 합성 학습 기록 보존을 통과했다. 실행은 설치된 DB workspace에서 `pnpm -C packages/db exec tsx ../../scripts/run-learning-v7-local-gates.mjs --output=<새 .artifacts 절대경로>`다. 기존 증적은 덮어쓰지 않는다. D1 depth100·Wrangler splitter·정확 JSON 봉인/변조/원자성 회귀를 유지한다. 중간 preflight가 아닌 동일 cohort의 complete G4와 hashed drill만 후속 Preview에 사용할 수 있다. 현재 사용자 범위는 로컬 검증·문서화이며 commit·push·Preview·Production은 실행하지 않는다.

로컬0031 레슨 후보는 [콘텐츠·가족 UX 기록](CONTENT_LEARNING_UX_UPDATE_PLAN.md)을 추가로 읽는다. 기존 `content:learning:readiness`는 보존된 실패 v1이며 새 `content:learning:candidate`는 선정 공개220개념/대표v3 범위다. 두 명령 모두 현재 exit1이며 전체440/220레슨 공개 허가가 아니다. v1/v2 불합격 passed/hash는 수정하지 않고 새 버전을 동결한다. 전체 source·두440/440·자동 red flag0·정확급수 조회0 이후에만 실제 신규 콘텐츠 staging/reseed와 레슨 검증으로 진행한다. 현재 불합격/미검수 초안을 운영/Preview에 올리지 않는다. fresh는0031/74-table 후보를 검사하지만 운영은0030/72개다. 철회↔claim은 SQL trigger가 동일 batch 효과를 취소하는지 검사하고 구 세션·FSRS·보상·메모 보존을 확인한다.

V7 reviewed E2E05 desktop/mobile Chromium/WebKit44/44는 통과했다. helper는 default track/settings·credentials/실계정 거부·모든 user_id/auth/종속 records와 삭제0을 실제0000–0031 회귀 포함 독립5/5로 검사한다. V7 전용 두 release ID의 profile/G0–G4/publisher/verifier hook이 없으므로 Preview 승격은 차단한다.

local-only draft adapter는 readiness를 DB 파일 생성보다 먼저 평가하며 시스템 임시 디렉터리의 새 파일만 독점 생성한다. `verify-learning-path-reviewed-local.ts`는 DB 전체 review/preflight 뒤 새 임시 SQLite에서 fresh0031과 non-empty0030→0031+legacy record reseed를 검사한다. `e2e-api-dev.sh`도 reviewed env preflight를 임시 DB 제거보다 먼저 실행한다. DB 대조와 적재는 `BEGIN IMMEDIATE`에 묶고 복합키 레슨·entry·개념 연결 충돌을 오류로 처리한다. 감사 `approved`는 release·문항·레슨 `published`와 다르므로 합성 저장 테스트로 공개를 승인하지 않는다.

`pnpm ops:verify`는 상태 → audio contract → OpenAPI → typecheck → unit → build → fresh D1을 실행한다. fresh0000–0031은 기존 seed·FK/FTS·manifest·provenance·content contract/control-plane을 포함한다. 다음에는 변경 표면 Chromium/WebKit·모바일 검사를 실행한다. 콘텐츠 변경은 source·두 reviewer·validator·quality links·G0–G4를 추가한다.

`pnpm ops:status:remote`는 Git·Pages/source·활성 Worker·D1 ledger31/최신0030·public/audio QA·auth proxy JSON·Google 설정·legacy410·TOPIK v2 status·CSP·R29표면 참조0을 읽기 전용으로 확인한다. 이것을 로그인 후 기능 전수·실제 가청·콘텐츠 전수 검사로 보고하지 않는다.

각 실행의 source·환경·명령·exit·pass/skip/fail/not-run을 `.artifacts/operations`와 MD 원장에 남긴다. 실패 후 재검사가 성공해도 최초 실패와 미확정 원인을 보존한다. Cloudflare 계정 식별자·비밀·개인정보는 진단 문서에서 가린다.

## 음성·Preview OAuth

same-language Google 우선 → 설치 voice fallback, ko/ja 제한, click task 즉시 speak, onend 뒤 성공이 불변 계약이다. R2 발음 전 경로는 금지하고 legacy audio와 관리자 생성은410이다. 현재 Preview source/deployment별 실제 Chrome lifecycle·Native Network R2/legacy0·사람 청취를 각각 확보하고 strict audio evidence gate를 실행한다. mock/과거 배포 결과를 대신 쓰지 않는다.

Preview OAuth는 별도 `JLPT Preview` client를 사용한다. callback은 `https://nihongo-n3-api-topik-preview.kordokrip.workers.dev/api/v1/auth/google/callback`, 앱 alias는 `https://feature-topik-product-expans.nihongo-n3.pages.dev`다. 운영 자격 증명을 복사하지 않으며 secret은 출력·문서·Git에 남기지 않는다. CLI는 apps/api cwd·config·env를 명시하고 실제 provider 로그인·home 재조회·트랙 변경·연결 보존을 검사한다. alias와 immutable Pages의 host-only 쿠키 공유를 가정하지 않는다.

## 백업·Production

현재0030 backup은72-table profile을 명시한다. export 전/후 schema·checksum, restore의 schemaProfile/localSchemaProfile/coversLocalSchema/omittedTableCounts·행 수·FK/FTS·trigger를 대조한다. 9월25일0028/70개 백업은 새 보상·알림 기록을 포함하지 않는다. 구65개 기본 transfer·user cleanup은0030 검증 전 사용하지 않는다.

운영 export 점검은 승인된 저장 정지 범위·기존 Worker/Queue 설정·활성 Workflow/release job/backlog를 먼저 확인한다. 단순 HTTP read-only로 background 정지를 가정하지 않는다. 오류/신호 시 child 종료와 원래 Worker·Queue·non-versioned 설정 복귀를 검증한다. 원복 직후 단발 HTTP 실패와 후속 독립 확인은 별도로 기록한다. auth Google 값은 `data.google_enabled`다.

배포는 clean source → local full gate → 전용 Preview/실제 브라우저 → backup/checksum/restore → rollback 기록 → predeploy → 승인된 D1/Worker/Pages 변경 → source-pinned remote verifier/smoke → 문서/Git 순서다. 데이터 손상 없으면 D1 전체 restore 대신 runtime을 복귀한다. 문서-only HEAD 변경은 runtime tree·배포 파일 동일성에 근거해 이미 통과한 앱 검사를 유지하되 새 결과라고 보고하지 않는다.

## 종료

`pnpm docs:catalog`·`docs:check`·`ops:status`·`git diff --check`와 영향 gate를 확인한다. Changed·Validation·Preserved·미실행·다음 작업을 간결히 보고하고 현재 상태·오류·runbook·릴리스 원장·파일 지도를 함께 갱신한다. 커밋·push·Production은 해당 작업 범위를 확인하며 폴더 정리만으로 새 운영 배포를 만들지 않는다.
