# 현재 구현 상태

## 최신 상태 — 2026-10-13 Production 배포 완료

운영 runtime source는 `37486f888399f6297b3c95f25e16afcbecc0b5b1`이다. 운영 D1은0032까지 적용됐고 신규5개 release600문항·220레슨을 공개·검증했다. 기존 학습13표 보존·FK/FTS·고정 canonical392검사 통과. 07:20:53 UTC(16:20:53 KST) 사후 smoke7/7·점검 해제·두 queue 원복을 완료했다. Production은 `6b8b8a19-239c-4289-b570-f0ac5fd3fdd4`이며 Worker는 `71e71638-aff1-44c5-a242-f1e276052413`다. 이후 문서 전용 Git 커밋은 runtime source와 구분한다. 전체 증적은 [통합 릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md)의 최상단을 따른다.

실제 운영 Chrome에서 새 `/assets/index-CqR4vd4s.js`를 확인한 뒤 ko/ja 각1회 onend·HAR10건 모두200·R2/legacy0을 기록했다. 기존 앱 탭의 구 캐시를 새 후보 증거로 쓰지 않고 별도 시크릿 창에서 확인했으며 사용자 탭/학습 기록은 보존했다. 운영 사람 가청을 새로 확인했다고 주장하지 않는다. 한국어·일본어 업데이트 모달을 배포했으며 구032 최초 전환 시 모든 앱 탭/창을 닫고 다시 열어야 할 수 있다.

새 후보 검사는 단위718·기존 E2E265통과/정책30제외/실패0·reviewed44·Preview44·실제 빌드 PWA24/24다. Preview494f4ff9의 두 학습자 동선·양언어 가청을 사용자 확인했고 실제 Chrome onend/Network R2·legacy0을 기록했다. 아래 구 후보의 미완료·미push 문장은 보존된 당시 이력이다.

### 보존된 이전 진행 이력

최신 재개: b773420의718단위/reviewed44/all-five 로컬 gate는 통과했으나 기존295는 개발 manifest4실패(261pass/30policy skip)였다. INC-PWA-101 설정을 분리한 뒤 manifest/공유 진입 회귀8/8을 통과했다. 새 clean 후보의 전체 검사를 이어간다. PWA 실제 갱신24/24와 이 개발 manifest 회귀는 별개이며 운영·음성 코어는 변경하지 않았다.

2026-10-13 재개 검증: **INC-PWA-100의 검사 동기화 결함을 수정했고 새 실제 빌드 PWA 24/24가 통과했다**(`pwa-update-2026-10-13/cohort-MUoLPj`, exit0). 구 active의 상태를 새 SW 활성화로 오인한 조기 재진입을 없애고, installed 및 정확한 새 versionId의 activated를 확인한다. CDP에서 구 version의 redundant와 새 bundle/양언어 모달을 독립 교차 확인했다. 강제 활성화·캐시 삭제·검사 제외·timeout 확대는 하지 않았다. 아래22/24는 보존된 이전 실패 이력이다. 이 통과는 격리 PWA 전환 검사이며 새 전체 release/Preview/복귀/가족/가청/backup/predeploy를 대체하지 않는다. 나머지 게이트를 이어서 실행하며 아직 Production·push는 하지 않았다.

2026-10-13 최신 후속: 양언어 PWA 업데이트 모달과 dual-SHA 읽기 전용 Preview 검증을 로컬 구현했다. 실제 빌드 갱신 검사22/24 통과·Chrome 최초 구 버전 전환2실패로 **Production 차단 유지**다. 새 Preview/전체 복귀/가족/backup/predeploy도 미완료다. 운영·현재a49 Preview·콘텐츠·학습 기록은 변경하지 않았다. 상세는 [통합 릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md)의 ‘추가 요청’을 따른다. 아래0adb clean 결과는 이 새 미커밋 후보의 결과가 아니다.

## 2026-10-13 활성 후보 — Preview 공개·음성 확인, Production 차단

코드 후보 `0adbfc0`를 clean 커밋으로 고정하고 같은SHA의 새 검사에서 전체단위675·OpenAPI/typecheck/build/음성source/fresh0032 및 Chromium/WebKit 기존퀴즈·FSRS26/26을통과했다. 음성mock/부분E2E이며 새후보전체295/레슨44·Preview·가족/실청취/전체복귀·backup/predeploy는미완료다. local40/1/0, remote51/1/1의1실패는미push만이다. 호환복귀R=`f3caa61`이며 운영/source032·기존Preview/a49는변경하지않았다. 정식G0–G4/Production 통과로 확대하지않는다.

후속 사용자 승인을 받아 직전032 기반 호환 Worker `f3caa61`과 trigger-only0032를 구현했다. 현재 API215/호환 API200/DB19 통과, fd38 격리환경의 retired submit409/detail410·canonical/기록/FSRS조회200·13표 거부요청 hash불변 및 기존card/review 보존을 확인했다. 격리만0032/호환Worker 적용 후read-only로 잠갔다. 운영0030과 Preview0031/a49는 그대로다. **이 제한된 회귀 확인은 새후보 전체 rollback/Preview44/가족/backup/predeploy 완료가 아니다.** 정확한 최신 증적은 [통합 릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md)의 ‘승인 후속’이다. 아래 P1 실패/정책 변경 제안은 최초 이력으로 보존한다.

사용자 승인 범위는 V7 440문항/220레슨 + 별도160 v3 + 네 메뉴 UX의 검증·조건부 Production·최종 일반 push다. 아래10월12일 로컬-only는 보존 이력이다. Production은0030/Worker `aedcbd40`/Pages `f62a8bdb`/source032b50dd/branch `main`을 유지한다. 운영 OAuth·canonical·기존 학습 기록에는 쓰지 않았다. Preview만0031/Worker `b1fd8bdf`/Pages `96c8594a`/sourcea49b076으로 갱신하고600문항/220레슨을 공개·검증했다. 구 실패160은 원본을 보존하면서 Preview 공개에서 제외했다.

5개 release coordinator의 statement-atomic 출판/철회·nullable 의미 봉인과 strict-target `stage/publish/verify/withdraw`를 구현 중이다. Worker helper는 env/점검 모드 필수·오타/중복 거부·배포 후 SHA/모드 대조를 추가했고 회귀6/6이다. queue/cron 점검3/3, strict target3/3을 확인했다. 기존5시각 차이는 승인된 네 메뉴/빠른 학습/설정 통합과 화면을 대조해 그5개 baseline만 재생성(5/5)했다. 허용값·마스킹·검사 삭제는 변경하지 않았다. 이는 최종 전체 gate가 아니다.

최종a49 local-cohort03 단위649·fresh/upgrade/reseed·reviewed44/44 및 기존 E2E265pass/30기존시각policy skip/0fail을 확인했다. 하지만 원격44 suite는 두 번 timeout으로 미완료이고 최신18pass/1fail/25미실행이다. 실제 격리 복귀는5개 철회/공개0→구 Worker→구 Pages 후 철회 JLPT 퀴즈 제출200/활동+3/정답조회200이 재현되어 **실패(INC-QUIZ-098)**다. 구 Worker SELECT는 DB trigger만으로 차단할 수 없어 호환 rollback 정책 변경을 제안했다. 기존 학습 전체 무충돌을 입증한 상태가 아니다.

같은96c8594a native Chrome ko/ja 각2 onend, 재생구간 Network R2/legacy0과 **현재 사용자 두 언어 가청 확인**은 완료·audio predeploy exit0이다. 가족 실제 N3/TOPIK3·4 동선은 사용자 답변대로 미확인이다. 실제72-table backup/restore·전체predeploy·Production·원격push는 미실행이다. 로컬 commit c21d39a/a49b076 두 개와 clean 후보를 보존했다. 운영 학습은 정상 기존 릴리스를 유지하며 점검하지 않았다. 상세 시계열은 [통합 릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md). 음성 코어4파일 diff0이다.

최신 갱신: 2026-10-13 KST. Production0030, Preview/격리0031을 분리하며 이미 적용된0031은 수정하지 않는다. 아래10월12일 이하 수치/범위는 당시 이력이며 현재 승인·Preview 상태가 아니다.

갱신: 2026-10-12 KST. Production 기준선과 로컬0031 후보를 분리한다. 과거 배포 전의 미완료·실패 기록은 [릴리스 원장](LOCAL_RELEASE_LEDGER.md), [오류 원장](ERROR_LEDGER.md), [9월 25일 종료 스냅샷](../history/CURRENT_STATE_2026-09-25.md)에 보존한다.

## 상태 요약

| 구분 | Production 기준 |
| --- | --- |
| D1 migration | `0000–0032` |
| Worker | `71e71638-aff1-44c5-a242-f1e276052413` (maintenance off) |
| Pages | `https://6b8b8a19.nihongo-n3.pages.dev` (canonical `https://nihongo-n3.pages.dev`) |
| web source SHA | `37486f888399f6297b3c95f25e16afcbecc0b5b1` |
| Worker release SHA | `37486f888399f6297b3c95f25e16afcbecc0b5b1` |
| content source SHA | `3485c6ef8addda3cd3e209730646c296175cf3c9` |
| manifest | `content-v3-d102868e3d43b9b3c1a4` |

10월11일 최종 로컬 상태는 **39 pass / 2 warning / 0 fail**이며 경고는 dirty171과 `INC-DATA-024` manifest drift다. 원격 첫 실행49/2/2는 stale catalog와 Cloudflare7403 R2 read-only 조회 실패로 보존한다. catalog 갱신 후 전체 재실행은 **51 pass / 2 warning / 0 fail, exit0**이다. HEAD/upstream은 `d626a16425a9a09a63b0af65928b51fd564c2834`로 같고 commit·push·원격 mutation은0이다. 문서 검사는861 paths·Markdown72·relative links1016·lifecycle active13/retired7·DB refs36이다.

Production은 `f62a8bdb-298e-446a-ab74-7d78ca47efd8`입니다. 2026-10-10 시작 시 로컬 `pnpm ops:status`는 **40 pass / 1 warning / 0 fail**, 원격 읽기 전용 `pnpm ops:status:remote`는 **52 pass / 1 warning / 0 fail**이었다. 원격 Pages·Worker·D1 ledger 31개·TOPIK status·인증 proxy·CSP·R2 발음 참조 0을 다시 확인했다. 경고는 `INC-DATA-024`의 HEAD와 운영 콘텐츠 manifest 차이다. 이번 상태 검사에 콘텐츠 전수 verifier·로그인 후 E2E·사람 가청을 새로 실행한 결과가 포함되지는 않는다.

10월10일 정리 시작 Git은 `feature/topik-product-expansion`, `d626a16425a9a09a63b0af65928b51fd564c2834`로 origin과 같고 깨끗했다. 정리 종료는 로컬39/2/0·원격51/2/0, 로컬492개·fresh0030·브라우저18개 통과였다. 상세는 [정리 기록](REPOSITORY_MAINTENANCE_2026-10-10.md)이다. 10월11일은 이34개 미커밋 변경을 보존한 채 시작했고 로컬39/2/0이었다. 새 후보 검사는 아래와 릴리스 원장을 따른다.

## 2026-10-12 로컬 후보 — 개발·전체 로컬 검증 완료, 원격 공개/배포 안 함

10월11일 V7 SHA와 A/B440/440 승인은 불변이다. V7 정규 G0–G4 profile·Preview-only target/CLI와 0031 미출시 publisher trigger/세 nullable JSON seal을 구현했다. 기존 `content_learning_links`를 사용해 새 테이블 없이0031은74개를 유지한다. 마지막 두 release는 단일 UPDATE에서 question/unit/audio/lesson/cue/ref exact JSON 일치를 강제하고, mismatch·R2·partial stage·source/quality/G0–G4 부족을 차단한다. seal 이후 UPDATE/DELETE/OR REPLACE는 금지하며 기존 NULL은 보존한다.

독립 검토의 publish race·mirror 누락·중간 G4 수락 경계를 교정했다. D1 expression depth100와 Wrangler CASE splitter 실패도 실제 회귀로 재현·수정했다. 최종 **cohort04**는 단위614/0/0(Ops29·DB225·Web155·API205), OpenAPI·4 workspace typecheck·build(dry-run)·음성 source 계약·fresh D1 모두 exit0이다. 새 격리 Worker의 desktop/mobile Chromium/WebKit **44/44**로11급수×20레슨 API 제출/재전송/기록/FSRS와 급수별 대표1레슨 UI 저장·중단·재개를 확인했다. 전체220화면의 사람이 검토한 결과는 아니다.

실제 별도 fresh/reseed·합성 기록12종의0030→0031 upgrade를 검사했다. 또 새 격리 DB에서 V7 440문항/220레슨의 G0–G4 local 공개→재실행→철회와 기존 합성 학습 표12종의 전체 행 hash 불변을 확인했다. 별도160 v3는543행(문항160·감사160·링크160 등)을 draft로 두 번 적재해 불변을 확인했다. 최종 G4는 drill 뒤 생성하며 중간 preflight만으로 Preview를 실행할 수 없다. 실제 사용자 DB의 모든 기록 보존을 입증한 것은 아니다.

현재 사용자 범위는 **로컬 검증·문서화까지만**이다. commit·push·새 Preview·Production·OAuth 변경0이며, 로컬-only 답변 이후 원격 명령도0이다. 그 이전 첫 Preview ledger read-only는31개·latest0030·0031 count0·write0이었다. 운영 기준선은 보존한다. 실패 cohort01–03과 동결/불합격 리뷰는 원본으로 남겼다. 음성 코어4파일 diff0, 새 실제 Chrome·사람 가청·가족 관찰은 미실행이다. 최신 명령·증적은 [릴리스 원장](LOCAL_RELEASE_LEDGER.md)에 있다.

Preview160은 v2 A/B158/2 실패를 보존한다. 별도 v3에서 그2결함만 수정했고 A/B 각각160/160 승인했다. 완전 맹검은 주장하지 않는다. draft `4934aa390878bd6ac2becd9ec4e930eafb7e72423b98b492430a83b1747ffd6f`, source `c5e2548381420c785909d787e9a316a1cc6057e0fc777702aa4ebfe33db73c66`, manifest `de8b459e06474fc1454b46139e4ab3a65c9692a8ee54a23ea26e702e87b61a9b`이다. 새 외부 상표·라이선스 조사는 하지 않았고 기존 provenance 재사용을 적법성 확정으로 확대하지 않는다.

## 2026-10-11 로컬 후보 — 보존 이력

최신 위치는 v4/v5/v6 불합격을 보존한 뒤 **V7 두 독립 전체 승인·로컬 비공개 staging 완료**다. V7은 rubric2건과 현지화 해설만 교정하고 question/choices/correct index/sample/cue는 불변이다. 기존 세 hash를 유지하며 A/B 각각440/440 승인(raw SHA A `db1f4a0f9f174b48a02d730aeb93a2241cd9889770f6bf090e067d2a0a8ff52a`, B `ac0697d587f71816333a1931c181fa254477d72758731e85b150c88781d1d554`), readiness exit0·`full_bank_ready=true`·failures0이다.

V7 후보 기준 단위588/0/0(Ops29·DB199·Web155·API205), typecheck4 workspace exit0이다. reviewed E2E05는 desktop/mobile Chromium/WebKit44/44·exit0으로 급수별20레슨 실제 Worker API 제출·재전송·records·FSRS와 각 급수 대표1레슨 UI 저장 제출·중단·재개를 확인했다. 실제 가족·음성·Preview 증거는 아니다. 준비 실패01(metadata)·02(owner)·04(settings)는 원본 보존한다. V7 전용440/220 profile과 G0–G4/publisher/verifier hook이 없어 Preview 승격은 차단한다.

- 오늘/학습/복습/기록 네 메뉴, 학습 안 자유 문제, TOPIK 일본어 기초 안내와 URL 단원 복귀를 구현했다. `/questions`·TOPIK `/progress`는 query를 보존해 새 위치로 연결한다.
- additive `0031`: 레슨 정의/구성·세션 ID/버전 snapshot, 카탈로그 API·선택 lesson_id·직접 승인 연결 조회. 기존 기록은 null binding으로 보존한다. 백업은 후보0031/74개, 운영0030/72개를 구분한다.
- 보존된 v1 440문항은 reviewer A151승인/289거부·B138승인/302거부, canonical lookup31개·red flag195개로 실패했다. 새 운영 SELECT에서는 정확한 공개220개념(급수별20)을 확정해 lookup0·쓰기0을 확인했다. 환경별 정수 ID는 달라 자연키/정확 급수/읽기·뜻으로 유일하게 조회한다.
- 새 대표 v2의 두 불합격을 보존한 뒤 v3 대표12문항/6개념/3레슨은 **정적 의미·선언 화면 계약만 두 승인**됐다. v4 전수 구조 flags0은 실제 두 의미 불합격을 막지 못했다. 과거 source04의4개 개념/5표제어 부족은 공식 API02/source06으로 해소했다(86record/lookup0/source failures0). 웹10개 SHA는 verified-fact projection이며 원시 HTTP hash가 아니다. 실제 의미 승인과 source 완성을 구분한다.
- 네 메뉴/iOS 후보의 앞선 로컬530개·타입/build·fresh0031·영향 브라우저116개는 당시 source 결과다. 후속 작성/출처/검수 변경의 새 실행 수는 릴리스 원장에 별도로 기록하며 이 과거 결과를 재사용해 전체 통과로 보고하지 않는다. 새 Preview·실제 가청/가족 관찰·현 schema backup/restore·배포는 미완료다.
- 철회된 레슨의 쓰기와 homophone 예정 복습 누락을 독립 검토에서 발견해 원자적 SQL guard·API 사전 검사와 회귀로 수정했다. 운영 발생 증거나 운영 수정 완료를 뜻하지 않는다.
- 새 Preview·가족 관찰·실제 Chrome 가청·0031 현행 백업/복원·G0–G4·Production·push는 미실행이다. 현재 코드 검사 통과를 신규 콘텐츠 품질/출시 완료로 확대하지 않는다.

정확한 계약·출처·실패·시계열·재작성 순서는 [콘텐츠·가족 UX 구현 기록](CONTENT_LEARNING_UX_UPDATE_PLAN.md), 새 실행 수는 [릴리스 원장](LOCAL_RELEASE_LEDGER.md)을 따른다.

첫120개 작성 시점의 과거 검사: 전체 단위/계약543개·typecheck·음성 소스 계약·문서 통과, local39/2/0. remote 첫50/2/1(Cloudflare7403)을 보존한 뒤 같은 전체 재실행51/2/0을 확인했다. 당시 KRdict는 미완료였으나 현재 source06으로 완료됐다. 과거 원격 결과는 신규 레슨 전수 플레이·새 Preview·가족·사람 가청이 아니다.

위543개/원격 결과는 첫120개 작성 시점의 과거 검사다. 전체440개 후속은 원격을 변경·재조회하지 않았으며 최신 로컬 수는 릴리스 원장에 별도 기록한다. source gate의 개념 identity/immutable Git SHA/파일 hash 대조와 수집 증적 exclusive-create를 수정하고 독립 재검토했다(`INC-SOURCE-075`, `INC-QA-076/077`). 기존 실패와 원래 취득시각을 보존한다.

최신 source 보충 후속은 동결/준비도 CLI와 immutable archive binding을 추가하고 검증 우회5경로를 교정·독립 반례로 재검토했다(`INC-QA-078`). 새typecheck·OpenAPI·build(dry-run)·fresh0031·로컬 기존 학습 영향 E2E50개가 통과했다. 실제 source04 동결은 exit1이고 출력 폴더0이다. E2E 음성은 mock이며 실제 신규220레슨·Preview/가족/Chrome/가청 검증이 아니다. 최신 전체 검사 수는 릴리스 원장을 따른다. 운영·음성 코어·OAuth·Git 원격 변경 없음.

## 현재 학습 기능

- 운영은 한국어 JLPT·일본어 TOPIK에 **오늘 / 학습 / 복습 / 기록**을 제공하고 자유 문제를 학습 안에 통합한다. ko/ja/en UI와 기존 링크를 유지하며 UI·해설 언어와 학습 대상 언어를 분리한다.
- 트랙별 목표·일일 시간·시간대를 저장하고 `daily` 20분 또는 `quick` 3–5분 세션을 생성·중단·재개한다. 열린 세션·재전송 ID·계정×트랙 소유권을 서버에서 검사한다.
- 개념·복습·문제·지연 재시도·메모를 기록한다. 해설 조회로 완료 처리하지 않으며 최초 응답·재시도·FSRS 기억 평가를 분리한다. 저장 실패와 오프라인 pending은 완료로 표시하지 않는다.
- 서버 수락 행동과 과거 `daily_logs`를 프로필 시간대로 집계해 스트릭을 만든다. 안내 세션 XP는 개념 5·복습 3·최초 문제 응답 3·재시도 1, 원본 중복 방지·일일 100 상한이다. 자유 학습 모든 행동에 XP를 지급하는 구현은 아니다.
- opt-in Push는 구독 언어와 사용자 현지 07/22시를 사용하며 오늘 학습·중복 발송을 검사한다. 활성 Service Worker는 `apps/web/src/sw.ts`다.
- JLPT 퀴즈 `strategy: random|weakest`는 요청 급수 안에서만 생성하고 정답을 제출 전에 노출하지 않는다. TOPIK owner 완료와 FSRS·activity는 공통 D1 batch를 사용한다.
- 공개220레슨은 승인된 문제↔개념 연결과 버전 고정 세션을 사용한다. 연결 없는 자유 출제를 개념 맞춤 문제로 설명하지 않는다. 실제 학습 진입 시간·재개 성공률은 출시 후 관찰한다.

## 데이터·API 계약

| migration | 역할 |
| --- | --- |
| `0000–0023` | 기본 학습·트랙·출처·TOPIK·콘텐츠 release/quality 기반 |
| `0024` | 계정×event ID 활동 중복 방지와 최소 학습 메타데이터 |
| `0025` | 버전형 자체 저작 JLPT 정적 문제은행 |
| `0026` | 기존 품질 감사↔실제 release 링크와 publication 차단 |
| `0027` | `google-browser`, `ready|unavailable` speech binding, legacy audio 신규 insert 차단 |
| `0028` | profile·session·step·annotation·content link 5개 테이블 |
| `0029` | quick/daily mode와 `study_reward_events` |
| `0030` | 알림 언어와 `push_notification_deliveries` |
| `0031` | 레슨 정의·구성, 세션 버전 snapshot, 원자적 cohort 출판과 의미 봉인 |
| `0032` | 철회된 JLPT 퀴즈 제출·조회 보호와 출판 guard trigger |

주요 API는 `/api/v1/learning/profile`, `/study/sessions`, `/learning/records`, `/learning/annotations`, `/learning/motivation`, `/quiz/attempts/:id`다. 기존 quiz·TOPIK·FSRS·activity·daily_logs 계약은 유지한다. `/activity/events`는 최대 100개 idempotent batch와 인증 트랙을 검사한다. `/activity/summary?window=7d|30d`는 집계만 반환한다. 계정별 오프라인 저장과 재전송은 Dexie를 사용한다. 전체 경로는 `apps/api/src/app.ts`와 OpenAPI가 기준이다.

## 콘텐츠와 공개 상태

운영 수량의 전수 증거는 2026-09-25 release-source-pinned verifier **392/392**와 [콘텐츠 감사](CONTENT_AUDIT.md)에 있다. 2026-10-10 일반 ops 원격 검사가 이 전수 검사를 새로 실행한 것은 아니다.

| 범위 | 운영 기준 |
| --- | --- |
| JLPT N5 | 어휘 700 / 문법 55 / 한자 103 |
| JLPT N4 | 어휘 548 / 문법 98 / 한자 164 |
| JLPT N3 | 어휘 2,052 / 문법 163 / 한자 275; 정적 한자 읽기·듣기 120 |
| 공용 | 예문 1,100 / 직무 82 / 주차 계획 52 |
| JLPT N2 / N1 | canonical Batch 1–5 583행 / Batch 1–4 286행 |
| TOPIK owner | 기존140 + 별도160 중40 + V7 신규240 = 공개420 unit/item |
| TOPIK practice | v2 300 공개; v1 28 보존·비공개 |
| 신규 공개 | 별도 N2 60 / N1 60 / TOPIK40과 V7 JLPT200 / TOPIK240, 총600문항·220레슨 |

canonical manifest 26개 source·6,501행과 정적 문제은행·reviewed expansion을 혼합 집계하지 않는다. 새 콘텐츠는 source evidence·두 독립 reviewer·validator·quality link·G0–G4·Preview·backup/restore 후 출판한다. 원본 지도는 [00_source_map](00_source_map.md)을 따른다.

## 음성·백업·운영

발음은 같은 언어 Google 브라우저 음성을 우선하고 없으면 같은 언어 설치 음성을 사용한다. 한국어 `ko-*`, 일본어 `ja-*`만 허용한다. click task에서 즉시 `speak()`하고 실제 `onend` 이후 성공을 기록한다. R2 발음 수집·생성·저장·조회·재생·fallback은 금지하며 legacy `/api/v1/audio/*`와 관리자 생성은 `410 Gone`이다.

2026-09-25 Preview `a2dfacf2`의 사용자 양언어 가청·Chrome lifecycle/Network와 Production Chrome onend 각 1회·재생 중 요청 0을 기록했다. Production 사람 가청의 추가 답변은 아직 기록되지 않았다. 이번 정리에서 과거 확인을 새 가청 테스트로 표시하지 않는다.

rollback은 Worker `c2901280-4c10-4671-bc61-dc262c88c692`, Pages `ce4e5e57-c0fa-4fe5-b268-00458d4e0300`이다. 배포 전 백업 `.artifacts/d1-backups/quick-lesson-2026-09-25-pre0029`는 **0028/70개**이며 local0030 restore에서 새 2개 테이블은 0행·`coversLocalSchema=false`였다. 현재0030 새 백업은 **72개 regular table** profile을 선택해야 한다. 데이터 손상이 없으면 additive migration·학습 기록을 보존하고 runtime을 복귀한다.

GitHub Actions는 비활성이고 실제 gate는 로컬 명령과 MD 원장으로 관리한다. 작업 전후 `pnpm ops:status`, 변경 gate는 `pnpm ops:verify`, 원격 현재 상태는 `pnpm ops:status:remote`다. [로컬 CI/CD](LOCAL_CICD_OPERATIONS.md)와 [짧은 체크리스트](LOCAL_CICD_MANAGEMENT.md), [운영 runbook](OPERATIONS_MANAGEMENT_RUNBOOK.md), [Agent 인수인계](SUB_AGENT_HANDOFF.md)를 함께 사용한다.

V7 두440/440 승인·readiness·local 비공개 staging·합성 local DB 검증까지 완료했다. reviewed E2E bootstrap 교정→실제 Worker/E2E→Preview160 새 버전/검수→G0–G4→새 Preview·가족/음성→현 schema 백업/복원·rollback/predeploy→현재 Production 승인 순서를 지킨다. 운영 source·음성 코어는 변경하지 않는다.
