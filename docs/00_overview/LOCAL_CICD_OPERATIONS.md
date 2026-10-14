# 로컬 CI/CD 운영 기준

## 2026-10-14 UI 배포 실행 — 후속 후보 검증 중

사용자가 Production·push를 승인했다. 앱839188a/검토한 E2E1fdc15a는 원격 branch에 push했고 Preview94884c8a에 배포했다. 로컬834단위·fresh/OpenAPI/typecheck/build 통과, 기존 브라우저 최초270통과/21실패/30정책 제외 후 정확 실패키 재검증으로291통과를 확인했다(한 번의 전체 green 실행이 아님). 시각30·PWA24·고정 source canonical392 통과. Preview 실기능은31/32, WebKit TOPIK1 시작1건 시간초과·해당 동일 조건3회 재검사 통과이나 원인은 미확정이다. INC-UI-117의 초기 catalog 로딩 중 시작 버튼 위치 경합을 방어하고 새 후보를 검증한다. 실제 Chrome ko/ja 정상 종료·재생 중 network0은 확인했으나94884c8a 사람 가청 답변은 아직 없다.

현재0033/77표 운영 백업·정확 복원·행 비교·FK0 통과. Worker69cffaa1과 queues를 원복해 점검 해제/학습 저장 재개했다. 신규 migration·콘텐츠 write0, Production Pages는07bc33c4 유지. UI 복귀 대상은07bc33c4 Pages이며 Worker69cffaa1·DB0033·정상 학습 기록은 유지한다. 아래 미push/미백업 문장은 이전 시점 이력이다. 증거: `.artifacts/operations/ui-facelift-release-2026-10-14/`; 실패 artifact는 편집하지 않는다.

최신 출시: 동일 clean78ee09a의 기존 gate를 반복하지 않고 새74표 운영 backup/정확0032 restore→0033 upgrade·predeploy 후 Worker69cffaa1/Pages07bc33c4 배포. 사후392canonical·7smoke·87asset/route·auth proxy 통과. 실기기 수신·가족 관찰은 사용자 명시 유예이며 가상 pass 금지. 운영 문서 후속 커밋과 runtime SHA를 구분한다. [증적·복귀](UNIFIED_FRONTEND_DESIGN_2026-10-14.md). 아래 pending은 이전 시점이다.

개인화 자동 검증 후속: Preview44/44, 개인화4항목(최초 한국어2통과·일본어2시간초과→120초 제한으로 해당2개 통과), 구 Pages9f046cc6/신 Worker78ee09a 호환3/3 완료. 실패 artifact는 수정하지 않았다. 실수신·사람 가청·가족 확인은 미접수이며 운영 점검/백업/배포/push는 미실행. 재개 지점은 [통합 실행 기록](UNIFIED_FRONTEND_DESIGN_2026-10-14.md) 최상단이다.

현재 검증 후보78ee09a의 clean aggregate828단위/로컬44와 기존 브라우저291+정책 제외30, PWA24 통과. Preview3dee006a가 배포됐다. 실제 푸시 요청 수락을 수신으로 표시하지 않는다. 원격11급수/개인화/구 UI 호환성 및 사용자 확인 뒤 운영 gate를 수행한다. [동일 후보 증적](UNIFIED_FRONTEND_DESIGN_2026-10-14.md)을 재사용하되 이전 후보 통과로 대체하지 않는다.

개인화 출시 후속(2026-10-14): 테스트는 반드시 `VITE_ACCOUNT_PERSONALIZATION_ENABLED=true`로 실행한다. flag-off250 통과만으로 활성화를 승인하지 않는다. 새 백업0033/77표와 명시적0032 원본 복원→0033 upgrade, delayed scheduledTime 및 독립 RFC8291 복호화 회귀를 포함한다. Preview 실푸시는 분리된 VAPID 키/일치하는 frontend 공개키를 사용하고 실제 수신과 HTTP 수락을 별도 기록한다. 기존 전체 브라우저의 구 계정 details 선택자는 새 dialog 계약으로 교체하되 기능 assertion과 실패 이력을 보존한다.

현재 개인화 구현은 [실행 원장](UNIFIED_FRONTEND_DESIGN_2026-10-14.md)의 계정 API/0033/프런트엔드 검사 대상이다. 로컬 영향 검사 후 `openapi:check`, `typecheck`, `test`, flag-on `build`, `verify:fresh`, audio contract를 실행한다. 브라우저는 `VITE_ACCOUNT_PERSONALIZATION_ENABLED=true pnpm -F @nihongo-n3/e2e exec playwright test account-personalization.spec.ts --project=chromium --project=webkit --reporter=line`로 별도 격리 DB를 사용한다. 이 자동 검사는 실제 푸시/Google 로그인/가청/Preview 검증을 대신하지 않는다. 과거 앱 테스트를 새 구현 통과로 쓰지 않는다. GitHub Actions는 변경하지 않았다.

2026-10-14 실제 완료 gate는 [지도 UI 릴리스](LEARNING_MAP_RELEASE_2026-10-14.md)를 따른다. 동일 후보의 통과 결과를 다시 실행하지 않고 SHA·증거 hash로 연결한다. UI-only 배포에는 콘텐츠 재공개·migration을 하지 않는다. D1 provider 내부 테이블 직접 조회 금지, 생성 FTS는 복원 검사로 확인한다. 점검 전환/복귀는 실제 health 반영을 확인하며10220은 증명된 자기 점검 버전 및 변경 secret이 MAINTENANCE_MODE 하나일 때만 복귀 확인한다. GitHub Actions는 계속 비활성이다.

현재 운영처럼 업데이트 동의 UI가 있는 빌드는 PWA collector `--previous-root=<clean 운영 source>`로 검사한다. `--legacy-root`는 동의 UI 이전 자동 업데이트 앱 전용이며 null seen-release 회귀를 유지한다. 둘을 혼용하지 않는다(`INC-OPS-110`). 새 후보 전체 검증은 진행 중이다.

## 지도 배포 후보의 후속 gate

2026-10-13 기능 연결 전수 검증·조건부 배포가 승인됐다. [지도 통합 검증](LEARNING_MAP_UX_2026-10-13.md)에 초기 실패와 수정 후 최종 후보 검사를 분리한다. 새 공개 콘텐츠는 없으므로 운영 migration/stage/publish를 반복하지 않는다. Preview의 앱 후보와 Worker 코드는 대조하고, Production 변경은 필요한 프런트엔드로 제한한다. 기존37486f8 Pages를 새 UI의 복귀 대상으로 실제 조회한다. UI 회귀 때문에 기존600문항/220레슨을 철회하거나 정상 학습 DB를 복원하지 않는다.

## 학습 지도 프런트엔드 gate — 2026-10-13

현재 [학습 지도 개편](LEARNING_MAP_UX_2026-10-13.md)은 사용자 요청에 따른 로컬 프런트엔드 구현이다. 지도 우선순위·오류/빈 목록·intent 재전송·네 열 메뉴·버전 일치 제목·완료 기록을 검사한다. `VITE_LEARNING_MAP_ENABLED=false` 빌드는 기존 화면 복귀 수단이며 DB 복원/재시드를 하지 않는다. typecheck·전체 단위·build·영향 E2E·음성 계약·docs:catalog·docs:check·diff check·ops:status 결과를 구분해 기록한다. `.superdesign/tmp`, init, website는 Git에서 제외하며 디자인 계약·재개 상태·최종 장식 이미지는 보존한다. 새 Preview와 실제 두 학습자/가청 확인은 로컬 mock으로 대체하지 않는다.

## 현행 gate — 2026-10-13 후보37486f8

동일 clean 후보의 단위718·OpenAPI/typecheck/build/fresh0032·reviewed44, 기존 E2E265통과/기존정책30제외/실패0, 실제 빌드 PWA24/24, 최종 Preview44/44를 확인했다. Preview494f4ff9의 두 학습자 동선·ko/ja 사용자 가청과 실제 Chrome onend/HAR의 R2·legacy0도 연결했다. 정확한 출판·배포 상태는 [통합 릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md)의 최상단을 따른다. 아래 이전 후보의 미완료 수치를 현재 gate로 읽지 않는다.

실행 계약은 `로컬 → Preview → 별도 실제 철회/호환 Worker·Pages 복귀 → 현재 schema 백업/복원 → predeploy → migration/호환 Worker → draft/검증 → 원자적 공개 → verifier → Pages → 실제 브라우저/HTTP smoke → 점검 해제·queue 복원`이다. GitHub Actions는 비활성 placeholder를 유지한다. 현재0031/0032는 이미 적용되어 수정 대상이 아니다.

전환 전0030의 실제72-table export/restore 뒤 재시도 시 같은 백업을 사용했다. 재사용은 원본 hash·원래 취득시각·현재72표 원본 행/컬럼 일치와76논리표/DDL/ledger 불변을 새로 검증해 명시했고 새 export/restore라고 보고하지 않았다. 향후0032 백업은74-table coverage이며 내부 sequence 보존을 별도 확인한다.

운영 Pages 검사에서 명시적 API_ORIGIN 유무만으로 drift를 판정하지 않는다. canonical 기본 proxy의 실제200/정확 Worker SHA/Google 설정과 immutable 정적 바이트·API503을 분리한다. 이후 runtime-only 재개는 새 bounded lease와 실패 시 read-only/queue pause를 사용하며 DB migration/stage/publish를 다시 실행하지 않는다.

### 보존된 이전 CI/CD 실행 이력

최신 재개: b773420의718단위/reviewed44/all-five 로컬 gate는 통과했으나 기존295는 개발 manifest4실패(261pass/30policy skip)였다. INC-PWA-101 설정을 분리한 뒤 manifest/공유 진입 회귀8/8을 통과했다. 새 clean 후보의 전체 검사를 이어간다. PWA 실제 갱신24/24와 이 개발 manifest 회귀는 별개이며 운영·음성 코어는 변경하지 않았다.

2026-10-13 재개 검증: **INC-PWA-100의 검사 동기화 결함을 수정했고 새 실제 빌드 PWA 24/24가 통과했다**(`pwa-update-2026-10-13/cohort-MUoLPj`, exit0). 구 active의 상태를 새 SW 활성화로 오인한 조기 재진입을 없애고, installed 및 정확한 새 versionId의 activated를 확인한다. CDP에서 구 version의 redundant와 새 bundle/양언어 모달을 독립 교차 확인했다. 강제 활성화·캐시 삭제·검사 제외·timeout 확대는 하지 않았다. 아래22/24는 보존된 이전 실패 이력이다. 이 통과는 격리 PWA 전환 검사이며 새 전체 release/Preview/복귀/가족/가청/backup/predeploy를 대체하지 않는다. 나머지 게이트를 이어서 실행하며 아직 Production·push는 하지 않았다.

2026-10-13 PWA 후속 gate: `node scripts/run-pwa-update-gates.mjs --legacy-root=<직전 실제 clean source worktree>`로 실제 SW가 있는 두 격리 빌드와 직전 실제 빌드를 검사한다. synthetic build SHA/익명 API/합성 IndexedDB 검사이며 콘텐츠·가청·Production 증거가 아니다. 최신22/24·Chrome 최초 전환2실패로 출시는 차단된다. 일반20개만 통과해도 최초 전환 검사를 제외하고 출시하지 않는다. UI 재배포에는 새 Preview의 가족/실제 음성 증거도 다시 연결한다. 상세 [통합 릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md).

원래 출판과 새 앱 검증은 `learning-cohort-deployment.ts --request=<새 request.json> --output=<새 receipt.json>`의 두 SHA로 분리한다. 실제 GET collector `scripts/capture-learning-cohort-deployment-metadata.mjs --deployment-id=<정확 Preview ID> --output=<존재하지 않는 .artifacts 디렉터리>`는 비밀을 출력하지 않고 DB/Worker/실제 Pages 배포 설정을 봉인한다. request의 currentLocalSummary는 새 all-five collector 요약이며 원래 authorization/failed를 편집하지 않는다. 이 읽기 전용 receipt는 production-predeploy/publication 승인이 아니다.

## 2026-10-13 통합 후보의 추가 절차

마지막코드후보0adbfc0 clean 기준cohort02는675단위/타입/OpenAPI/build/음성source/fresh0032·exit0이며affected UI26/26을확인했다. **이는6local명령/일부기존E2E 결과**이고정식5-release local collector·전체295/레슨44·새Preview/전체복귀/가족/실청취/backup/predeploy는아직이다. 같은SHA/품질hash의새완전gate를다음단계에서생성한다. local40/1/0,remote51/1/1의실패는미push다.

호환 복귀 변경 승인 후 현재API215/호환API200/DB19 및 작업트리 전체674·OpenAPI/typecheck/build/fresh를 확인했다. 동시성 회귀는 별도 추가 실행이며 sourceclean 최종 gate는 새로 실행한다. 호환f3caa61/0032의 fd38 재검증409/410·기존200·13표 hash보존은 **제한된 회귀PASS**, 전체Productionpredeploy는blocked다. migration0031은수정하지않았고 exact restore 승인 pending set은0031+0032, table coverage는74개다. 실패·pending·기존44 timeout은 그대로보존한다.

현재 판정: a49 local649/reviewed44/기존265pass+30policy skip은 통과했고 실제 Preview600/220도 공개/verifier 통과다. 하지만 실제 구 Worker/Pages 복귀에서 철회 퀴즈 submit/detail200이 재현되어 INC-QUIZ-098 실패다. Preview 전체44 run은 최신18pass/1fail/25미실행으로 exit1이다(INC-QA-099). 같은 Preview 실제 Chrome/현재 사용자 가청·재생구간 R2/legacy0은 완료지만 가족 미확인이다. **운영 점검·백업·전체predeploy·Production·원격push를 시작하지 않는다.**

구 Worker exact rollback 요구의 변경을 사용자에게 제안했다. 이후 API/DB guard는0032에서 개발하고0031을 고치지 않는다. 새 SHA의 stable-host full Preview, 실제 복귀, 가족과 현재 배포의 음성 gate를 각각 연결한다. 음성 gate exit0을 전체 production-predeploy 통과로 사용하지 않는다. 실제 실행/원본 경로는 [통합 릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md)을 따른다.

이번 승인된 범위는 V7+160 전체 및 조건부 Production/push다. 새 collector는 `pnpm -C packages/db exec tsx ../../scripts/run-learning-cohort-local-gates.mjs --output=<새 .artifacts 절대경로>`이고 기존 V7 전체 gate를 새로 실행한 뒤 새 합성 기록 DB에서5개 draft/reseed/공개/replay/철회를 검사한다. 기존614/44를 새 후보의 통과로 계산하지 않는다.

원격 `learning-cohort-remote.ts`는 모든 대상/SHA/config/paths/output을 명시하며 쓰기는 clean 후보와 `ALLOW_LEARNING_COHORT_CHANGE=learning-cohort-600-2026-10-13:<scope>:<SHA>`를 요구한다. 기존 Preview-only 명령은 그대로 Production을 거부한다. authorization과 post-operation receipt를 별도로 보존한다. Worker helper는 명시적 `--maintenance-mode=off|read-only`가 필수이고 package script가 env를 고정한다. split/오타/중복 옵션은 실행 전 실패한다.

새 Preview·별도 원격 복귀·같은 배포의 가족/양언어 실제 청취 후에만 운영 점검을 시작한다. 현재72-table 백업은 `d1:restore-drill --input=<보호 백업 경로> --out=<새 report> --exact-schema-upgrade`로0030 원래 schema 복원→0031만 upgrade→모든 기존 regular table 원래 열 hash/FK를 대조한다. [진행 기록](LEARNING_COHORT_RELEASE_2026-10-13.md)을 먼저 확인한다.

갱신: 2026-10-12 KST. 현재 배포는 [CURRENT_STATE](CURRENT_STATE.md), 실행 이력은 [LOCAL_RELEASE_LEDGER](LOCAL_RELEASE_LEDGER.md), 5/20분 코드 gate와 2/5분 문서 gate는 [짧은 체크리스트](LOCAL_CICD_MANAGEMENT.md)에 둔다.

GitHub는 commit·branch·tag 보관과 승인된 push에 사용한다. `.github/workflows/ci.yml`은 `workflow_dispatch`와 `if: false`를 유지하는 비활성 placeholder다. 릴리스 판정은 로컬 명령·Cloudflare read-only 결과·MD 원장을 사용한다.

## 기본 파이프라인

| 단계 | 명령 | 합격 기준 |
| --- | --- | --- |
| 시작·종료 | `pnpm ops:status` | 필수 문서·ID·Actions·음성 계약 일치, fail0 |
| 파일 지도 갱신 | `pnpm docs:catalog` | 현재 Git 관리 대상·새 파일 반영 |
| 문서 검증 | `pnpm docs:check` | 파일 지도·Markdown 링크·수명주기·직접 DB source 참조 일치 |
| API 계약 | `pnpm openapi:check` | 코드와 생성 타입 일치 |
| 전체 로컬 | `pnpm ops:verify` | audio contract·OpenAPI·typecheck·unit·build·fresh D1 exit0 |
| 신규 레슨 공개 준비 | `pnpm -F @nihongo-n3/db content:learning:candidate` | 현재는 대표12 승인/선정220개념 lookup0만 확인, 전체은행 미완료로 exit1 유지 |
| 브라우저 | 영향 spec 또는 `pnpm test:e2e` | 실제 실행한 Chromium/WebKit·모바일 pass/skip/fail 기록 |
| 원격 상태 | `pnpm ops:status:remote` | Git·Pages·Worker·D1·HTTP·TOPIK·CSP·R2 계약 확인 |

fresh D1은 disposable local DB에 후보 migration `0000–0031`을 적용하고 기존 seed·FK/FTS·manifest·음성 provenance·quality·content contract/control-plane을 검사한다. 운영은0030이며 신규 레슨이 seed됐다는 뜻이 아니다. 동일 검사를 바로 다시 실행하지 않는다. `CI=true`는 비대화식 실행 설정이며 GitHub Actions 실행을 뜻하지 않는다.

## 220레슨 후보의 추가 차단 gate

V7 정규 출판 후보는 JLPT/TOPIK 두 release의 question/unit/audio/lesson/cue/ref exact JSON을 단일 UPDATE에서 seal한다. mismatch·R2·partial stage·source/quality/G0–G4 부족과 sealed link UPDATE/DELETE/OR REPLACE를 차단하고 기존 NULL을 유지한다. Preview-only target/CLI 외 경로는 거부한다. 10월12일 cohort04에서 단위614·fresh/upgrade/reseed·G0–G4 local workflow·desktop/mobile E2E44가 모두 통과했다. 초기01–03의 portable/D1 depth/Wrangler splitter 실패는 그대로 보존한다.

재실행은 `pnpm -C packages/db exec tsx ../../scripts/run-learning-v7-local-gates.mjs --output=<저장소 .artifacts 안의 새 절대경로>`다. 설치된 DB workspace launcher를 사용하고 기존 증적 폴더를 덮어쓰지 않는다. 공유 build는 한 번만 수행하고 이후 fresh/E2E는 각각 독립 임시 DB에서 실행한다. 중간 `g0-g4-local-preflight.json`은 내부 drill용이고, 실제160 draft/reseed·V7 공개/재실행/철회·12종 합성 기록 hash 불변 뒤 최종 `g0-g4-local.json`을 생성한다. Preview CLI는 완료 표식·같은 cohort/manifest·실제 drill hash를 강제한다. 이번 사용자 범위에는 commit·push·원격·배포가 없다.

불변 실패 v1/v2를 보존하고 새 버전에서만 작성한다. 대표/공급자 intake 구조 통과를 전체440 승인으로 확대하지 않는다. `learning-path-evidence.test.ts`는 scope·세 hash·정확 ID·두 reviewer 독립 정답·누락/중복·편집된 passed를 검사한다. `learning-path-authoring-structure`는 새 초안의 자동 수량/분포/반복/필드 검사이며 의미 승인과 별개다. 새 full-bank 동결·source·두440/440·red flag0·정확급수 lookup0 이후에만 실제 staging/reseed/fresh/비어 있지 않은 upgrade/11급수 신규 레슨 동선을 검사한다. Preview160은 다른 배치/증적으로 유지한다.

구 `content:learning:structure/readiness`는 실패 v1 전용이며 195 red flag·31 lookup·두 불합격을 보존한다. `content:learning:candidate`도 v3 대표와 전체은행 승인을 구분해 exit1이다. `content:learning:authoring:full`은 v4 전량 구조만 검사한다. source04 부족은 API 취득 전 이력이고 source06은 부족 0이다. 실제 v4 전체 readiness는 두 의미 불합격으로 exit1이다. 새 v5에서만 수정하며 `content:learning:freeze:v5 --output=<새 cohort 절대경로>`는 실패 원본·review bytes·같은 bytes로 실행한 patch hash·새 ID/버전 일치를 검사한다. 새 source는 기존 취득 사실을 재사용했다고 명시하며 새 HTTP 성공으로 표시하지 않는다. 저장 fixture와 의미 승인을 구분한다. [구현 기록](CONTENT_LEARNING_UX_UPDATE_PLAN.md)을 따른다.

V7 정식440/220 profile과 전용 G0–G4/publisher/verifier hook은 구현·로컬 검증했다. 기존 Preview160 profile이나 범용 workflow로 대신하지 않는다. 별도160 v3는 다른 hash/리뷰/세 release version·draft 원장으로 관리하고 아직 원격에 반영하지 않았다. local/mock 통과는 실제 가족·소리·Preview 증거가 아니다.

로컬 도구는 `content:learning:freeze:v4 --source=<complete source 절대경로> --output=<새 cohort 절대경로>`와 `content:learning:readiness:v4 --cohort=<그 cohort> --review-a=<독립 A 절대경로> --review-b=<독립 B 절대경로> --output=<새 report 절대경로>`다. 후자는 v5에도 대응한다. freeze는 DB/remote를 변경하지 않고 로컬의 새 leaf만 작성하며 기존 leaf를 덮어쓰지 않는다. readiness는 같은 세 hash/440 ID/두 literal true·cue/lesson 미해결0을 강제한다. 신규 `stage-learning-path-v4.ts`는 readiness 후에만 시스템 임시 디렉터리의 새 `.sqlite` 파일에 draft를 적재하며 원격 플래그를 받지 않는다. 불합격 실제 리뷰 대신 합성 fixture를 CLI에 제공해 콘텐츠 gate를 우회하지 않는다. audit `approved`는 품질 링크를 위한 상태이고 release·문항·레슨 공개를 뜻하지 않는다.

v5 patch 실행은 읽은 동일 TypeScript bytes를 변환·실행하고 source/payload hash를 함께 기록한다. import·주석 사이 dynamic import·외부 capability AST 반례를 차단한다. 신뢰된 저장소 저작 코드 실행이지 적대적 JavaScript sandbox가 아니다. 버전 라벨만 변경하거나 cache된 patch와 새 file hash를 혼합하는 반례는 거부한다.

`e2e/learning-lessons.spec.ts`의 빈 공개 목록 검사는 신규220레슨 증거로 쓰지 않는다. 실제 `e2e/reviewed-learning-lessons.spec.ts`의 cohort04 desktop/mobile44/44는 reviewed mode의11급수×20레슨 API 네 단계·제출/재전송·FSRS·records와 각 급수 대표1레슨 UI 시작/저장/중단/재개를 검사했다. 모든220화면 인간 검수·Preview·가족·실제 소리는 아니다. published runtime fixture는 `publication_gate_evidence=false`다. V6 불합격 리뷰로 bootstrap하는 negative 검사도 유지한다. standalone staging SQLite와 Worker `--persist-to` DB는 다른 대상이다.

source contract 회귀는 `learning-path-full-contract.test.ts`의 급수/읽기/version/URL/hash/value 변조 반례를 포함한다. collector는 성공 record마다 checkpoint하며 최종 intake와 validator 파생 파일도 exclusive-create한다. 기존 취득시각/실패를 보존하고 원래 policy 재사용을 새 HTTP 성공으로 표시하지 않는다. `fullSourceFailures`의 trusted binding은 source 후보 자체의 주장과 별도로 실제 inventory/immutable Git bytes에서 계산한다(`INC-QA-076/077`).

0031의 공개/사용 레슨 불변성, 철회↔claim 원자성, homophone due 우선, 버전 snapshot, nullable 기존 binding을 추가 회귀로 검사한다. 후보 백업은74개 regular tables다. 아래 운영0030/72개 절차와 구 백업 coverage를 혼동하지 않는다.

앱 runtime·설정·의존성 변경이 있으면 영향 검사를 실행한다. 문서만 달라진 동일 runtime의 통과 결과는 source·배포 파일 동일성을 확인해 유지하되 새 테스트 결과로 표시하지 않는다. 증거는 정확한 source/환경/시점에 연결하고 실패·skip·mock·not-run을 구분한다.

## 학습·데이터 회귀

- 계정·트랙·목표 급수·공개 상태·typed content ref를 검사한다. 미공개 노출·다른 급수 fallback·정답 사전 노출을 허용하지 않는다.
- quick/daily 생성·동시 생성·request ID 재전송·단계 제출·중단/재개·terminal guard·오프라인 pending·기기 충돌을 검사한다. 서버 수락 결과와 미수락 초안을 보존한다.
- 완료·최초 응답·재시도·FSRS rating·해설 열람을 분리한다. quiz/complete/review와 activity 저장은 동일 transaction에서 실패하거나 성공해야 한다.
- 프로필 loading/error와 configured:false를 구분하고 늦은 응답은 원래 계정×트랙 cache에 적용한다. annotation revision과 expected_track 충돌은 성공으로 처리하지 않는다.
- 스트릭은 서버 수락 학습일과 과거 일지·프로필 시간대를 사용한다. XP 원본 중복·일일100 상한, 알림 opt-in·언어·현지07/22·당일 학습 skip·발송 claim을 검사한다.
- fresh뿐 아니라 기존 기록이 들어 있는 upgrade fixture로 진행률·FSRS·일지·attempt·설정 보존을 검사한다.
- SRS는 서버due 스냅샷과 로컬 변경을 대조한다. 기기시계 보정으로 FSRS 날짜를 덮지 않는다. 숨긴 카드 면·키보드·발음·rating 접근성을 검사한다.

## 브라우저·음성

로컬 E2E는 실제 격리 Worker/D1과 Vite를 사용하며 음성 mock·provider mock·화면 fixture는 실제 저장·가청 증거와 구분한다. mock route는 interception counter와 요청 계약을 확인하고 SW 차단은 해당 fixture만 적용한다. 실제 학습·PWA·음성 전역에서 SW를 끄거나 오류를 무시하지 않는다.

Preview 검사는 전용 환경과 합성 QA 계정을 사용하며 Production에 테스트용 학습 기록을 만들지 않는다. 실제 Google SSO는 Preview 전용 client/callback/secret으로 검사한다. origin alias와 immutable Pages의 host-only 쿠키를 공유한다고 가정하지 않는다.

음성 계약은 같은 언어 Google 우선 → 같은 언어 설치 음성 fallback, ko/ja 제한, click task 즉시 speak, 실제 onend 이후 성공이다. 현재 Preview source와 deployment에 한국어·일본어 real-page-onend, 사람 가청, Native Network R2/legacy 요청0 증거를 연결한다. mock onend나 이전 배포 청취를 대신 쓰지 않는다.

```sh
pnpm release:verify:audio-contract
pnpm release:verify:audio-predeploy -- --input <evidence.json>
```

시간·성능 오류를 timeout 확대로 숨기지 않는다. suite 총예산과 개별 요청/동작 예산을 구분하고 최초 실패를 보존한다. 시각 baseline 갱신은 실제 화면 검토 후 진행하며 정책 skip을 pass로 집계하지 않는다.

## 백업·배포

현재0030 백업은72개 regular table profile이다. backup/restore의 `schemaProfile`, `localSchemaProfile`, `coversLocalSchema`, `omittedTableCounts`·checksum·행 수·FK·FTS를 대조한다. 이전0028/70개 백업을 새 보상/알림 기록까지 보존한 것으로 표시하지 않는다. blue/green transfer·사용자 정리의 기본65-table 계약은 새 schema 검증 전 사용하지 않는다.

Production 절차는 clean source → local gate → Preview/실제 Chrome → 승인된 maintenance의 backup/restore → rollback → predeploy → 승인된 D1/Worker/Pages 변경 → postdeploy → 문서·Git 동기화다. gate 실패 시 다음 단계로 가지 않는다. 데이터 손상이 없다면 사용자 기록·additive migration을 보존하고 runtime을 복귀한다. `INC-DATA-024`는 운영 release source와 manifest를 고정해 검증하며 HEAD drift를 숨기기 위해 재시드하지 않는다.

## 증적·파일 관리

JSON/log/HAR는 `.artifacts/operations`와 release 디렉터리에 보존한다. 비밀·개인정보를 MD로 복사하지 않는다. 기존 실패는 후속 성공과 별도 파일로 남긴다. migration·학습 source·recovery·backup·quality/reviewer·시각 기준·회귀 테스트는 정리 cache로 취급하지 않는다.

재생성 산출물은 참조·증적 가치를 확인해 저장소 밖 휴지통으로 이동하고 [파일 인벤토리](PROJECT_INVENTORY.md)와 정리 기록에 대상·복구 위치를 남긴다. 후속 Agent는 [인수인계](SUB_AGENT_HANDOFF.md)를 따른다.
