# 날짜별 변경·릴리스 이력

## 2026-10-26 — 보안 보강·찾아보기 수정 Production 출시

인증/세션·OAuth·CSRF·비밀번호 시도 제한·푸시 SSRF·오프라인 입력/관리자 출력·로그아웃 실패와 찾아보기 탭의 중복 이동을 보완했다. `8d57e1b`의 전체 로컬·Preview·사용자 가청·새77표 백업/복원·predeploy 이후 Worker `bdeec858`/Pages `df4bb452`에 배포하고 사후 gate를 통과했다. README·코드/API 지도·CI/CD·운영/인수인계·현재 상태·오류/릴리스 원장을 실제 배포와 일치시켰다. DB·콘텐츠·음성 코어·FSRS/XP는 유지한다. [검사 수치·실패 보존·검증 제한](SECURITY_HARDENING_2026-10-26.md).

## 2026-10-25 — 문자 학습·반응형 개선 출시 및 정리

문자 설명 열 압축을 수정하고 5자 관찰→회상→구별→재확인 흐름을 추가했다. `6ecc203`을 Preview·양언어 가청·운영 gate 후 Pages `92c6e58b`에 반영했다. [출시 감사](DETAIL_UI_AUDIT_2026-10-25.md)와 [릴리스 원장](LOCAL_RELEASE_LEDGER.md)에 검증 범위를 기록한다. 문서 중복/모순을 정리하고 재생성 산출물·빈 폴더만 복구 가능하게 이동했다. [이동 명세·보존 경계](REPOSITORY_MAINTENANCE_2026-10-14.md).

## 2026-10-14 — QA 계정 재사용·지도 안내 모달

Preview 일반 계정2개와 Keychain 재사용 도구, 운영 가입 E2E 차단, 정확 inventory 단일 삭제 SQL과 회귀 검사를 추가했다. 지도 상시 안내를1회 모달로 교체하고 겹침을 해소했다. UI는 로컬 검증 상태이며 배포되지 않았다. 승인된 운영 테스트36명 정리 결과는 [현재 상태](CURRENT_STATE.md), 상세 검증/보안 경계는 [QA 운영](QA_ACCOUNT_OPERATIONS.md)에 기록한다.

## 2026-10-14 — 운영 문서·모델 비용 기준 정리(미배포)

중복 현재 상태와 오래된 미배포 지시를 통합하고 AGENTS·역할별 프로젝트 TOML·위험별 테스트/짧은 gate를 정리했다. 과거 실패·배포·학습 원본은 보존한다. 앱·DB·Production·push 변경 없음. 정확한 삭제/검증/설정 한계는 [정리 기록](REPOSITORY_MAINTENANCE_2026-10-14.md).

## 2026-10-14 — 개인화 및 최종 UI 페이스리프트 배포

계정 사진·디자인·예약 알림·통계를0033/호환 Worker로 출시한 뒤 UI-only 페이스리프트를 Pages4d0589d0/web0b9e354에 반영했다. Worker69cffaa1/0033은 유지했다. 검증 수치·사람 관찰 유예·PWA 갱신 보류·복귀 대상은 [최종 UI 기록](UNIFIED_FRONTEND_DESIGN_2026-10-14.md)과 [현재 상태](CURRENT_STATE.md)에 구분한다. 아래 항목은 당시 시점의 이력이다.

## 2026-10-14 — 학습 지도 UI 운영 배포

- 지도·레슨·완료 화면과 기존 학습/복습/기록을 연결하고 오프라인·계정 전환·이전 링크 회귀를 수정했다.
- web887d2b2 / Pages2c0fea8d. Worker·D1·콘텐츠·음성 코어는 유지했다.
- 단위772, 기존브라우저287+정책제외30, 로컬44, 새Preview44, PWA24, 두 학습자·가청 확인을 거쳤다. 새74표 백업/복원·점검 해제 뒤 Pages-only 배포 및 사후 검사를 완료했다.
- 운영 점검기 실패/복구와 비용을 늘린 반복 작업을 숨기지 않고 [상세 릴리스](LEARNING_MAP_RELEASE_2026-10-14.md)에 기록했다.

갱신: 2026-10-12 KST. 날짜별 제품·운영 변경 요약이다. 전체 ID·실행 명령·실패/rollback은 [릴리스 원장](LOCAL_RELEASE_LEDGER.md), 현재 상태는 [CURRENT_STATE](CURRENT_STATE.md)를 따른다.

| 날짜 | 범위 | 변경 | 증거·현재 해석 |
| --- | --- | --- | --- |
| 2026-10-12 | 로컬 출판 계약 검증 완료 | V7 G0–G4·exact seal·Preview-only·완료drill guard, race/mirror/D1 depth/Wrangler splitter 교정; 별도160 v3 승인·쓰기/청해binding | cohort04 단위614/E2E44·fresh/upgrade/reseed·local공개/철회·12종합성기록불변. 실패01–03보존. commit·push·새Preview·Production 없음 |
| 2026-10-11 | V7 의미 교정 후보 | rubric2건·현지화 해설만 교정, question/choices/index/sample/cue 불변 | 단위588·typecheck·desktop/mobile reviewed E2E44/44; 전용 publish/verifier hook 부재로 Preview 차단 |
| 2026-10-11 | 공식 API·전체 동결·의미 검수 | 정확 사전 증적 완성(source06/86records), v4 440/220/220 새 동결, 두 전체 독립 검수·draft adapter 보완 | A319/121·B318/122 불합격 보존, 합집합137문항/13개념 새 v5 수정 중. 공개·배포 없음 |
| 2026-10-11 | 사전 증적·로컬 검증 도구 후속 | 공식entry10개 보충, source04 immutable archive binding·새freeze/readiness 도구, 검증 우회5경로 회귀/독립 검토 | 남은4개 개념/5표제어·의미 승인0, 실제freeze 차단/출력0. fresh0031·기존 학습E2E50 통과는 신규220레슨/실제가청/출시 증거 아님 |
| 2026-10-11 | v4 로컬 작성 후속 | 나머지320개를 작성해440문항/220cue/220레슨 구조0실패; source identity/hash·checkpoint·불변 출력 회귀 교정 | 사전 증적14개 부족/의미 승인0으로 동결·staging·Preview·배포·push 차단, 실패 v1/v2/source01/02 보존 |
| 2026-10-11 | 로컬 후보 | 네 메뉴·일본어 기초/단원 URL·0031 레슨/API·typed 연결 조회·철회/homophone 회귀,440문항 초안/두 검수 | 검수/실제 연결 실패로 신규 공개·배포·push 없음; [구현/차단 기록](CONTENT_LEARNING_UX_UPDATE_PLAN.md) |
| 2026-08-09 | Production | N2 Batch5·N1/TOPIK Batch4, migration0020–0021·콘텐츠 manifestd102 | 백업/복원·Worker/Pages·rollback 기록 보존 |
| 2026-08-17 | Production | 0022–0023, TOPIK practice v2 300 공개·v1 비공개, JLPT 독해 답 분포 | release·quality·FK 증거 |
| 2026-08-19 | Production | 0024 활동·0025 정적bank·0026 quality link·0027 speech 계약, N3 120·TOPIK Batch5 20 | 자체 저작·두 review·G0–G4·published |
| 2026-08-23 | Preview | N2 60·N1 60·TOPIK Batch6 40, 독립 리뷰·품질·Preview 공개 | 운영 미공개 후보로 유지 |
| 2026-08-23 | Production 회귀 | Google-only 음성 변경을 mock 테스트 근거로 배포 | 잘못된 판정은 음성 장애/오류 원장에 보존 |
| 2026-08-24 | Production 복구 | 동일 언어 fallback·첫 click 동기 speak·기존 PWA 전환 복구 | 실제 Chrome lifecycle과 사람 가청 구분 |
| 2026-08-30 | 로컬 코드·문서 | TOPIK status·quiz/activity 원자성·CSP/R2 gate 교정, legacy 미등록 source 정리 | 당시 코드 push·운영 미반영; 9월7일 배포에 포함 |
| 2026-09-06 | Preview | 0028 학습 경험·다섯 메뉴·재개/메모·설정/SRS 경계·Preview OAuth | 전 급수 기능·실제 SSO·양언어 Preview 청취, 중간 실패 별도 보존 |
| 2026-09-07 | Production | 0028·학습 UX와 앞선 Worker 교정, Worker c2901280·Pages ce4e5e57 | backup/restore·pinned392·학습21테이블 hash·Chrome lifecycle; 별도 Production 사람 청취 없음 |
| 2026-09-11 | 로컬 문서 | 운영 문서·파일 지도, 미사용 FSRS example 삭제 | local40/1/0; 당시 remote DNS 실패는 미확인으로 기록 |
| 2026-09-25 | Production | 0029–0030, quick/daily·서버 학습일 스트릭·안내 세션 XP·현지화 Push | Worker aedcbd40·Pages f62a8bdb, 실제 Preview 청취·backup70/restore·pinned392·remote52/1/0·push |
| 2026-10-10 | 로컬 유지보수 | 미사용 코드5개·구문서3개 대체, 자동 파일 지도·현재/과거 안내 분리·CI/CD 갱신 | 로컬492·브라우저18·문서/지도 통과, 산출물7MB 휴지통 이동; [정리/검증 기록](REPOSITORY_MAINTENANCE_2026-10-10.md), 운영 DB/배포 변경 없음 |

이번 개정에서 이전 시계열 문서의 8월9일 migration0000–0001 표기는0020–0021로, 8월19일0028 포함 표기는0024–0027로 교정했다. 0028의 실제 운영 반영일은9월7일이다. Production Chrome lifecycle을 새로운 사람 가청 확인으로 쓰던 요약도 실제 증거 경계로 수정했다.
