# 전 페이지 학습 지도 디자인 통합·개인화 — 2026-10-14

## 최종 운영 배포 — 2026-10-14

- 사용자 확인: Preview3dee006a의 양언어 가청 확인 접수. 실제 기기 푸시 수신과 본인/가족 직접 관찰은 후속 지시로 **배포 후 확인 항목**으로 전환했으며 관찰 통과로 기록하지 않는다.
- 후보: clean `78ee09a5ddec3254454fe14f174c03e5051f90d0`. 코드·선행 문서f3dc1c3를 feature/topik-product-expansion에 일반 push했다. Preview/Production은 같은 소스에 각각의 VAPID 공개키만 다르게 빌드하고82파일씩 봉인했다. OAuth/VAPID private rotation 없음.
- 백업: `personalization-release-2026-10-14/production-0032-backup-personal-20261014-01`. 운영74표·schema/ledger·보조 OAuth/sequence 보존. 정확0032 복원→0033/77표, 기존74표 행 hash 불변·FK0. 백업 전후 불변·점검off·queue2개 원복 확인.
- 배포: predeploy→0033→Worker `69cffaa1-996d-42a7-9080-13c526203e86`→canonical392→Production branch main Pages `07bc33c4-2245-4d83-a84c-646f29052f1f`. 개인화 flag on. 기존600문항/220레슨 재시드/공개 변경 없음.
- 사후: canonical392/392·Worker smoke7/7·asset/route87/87·인증 proxy 통과. 실제 Chrome에서 양언어 모달의 명시적 새로고침→새 프로필·기존 활성 세션 표시 및 ko/ja 각1회 onend 확인. 운영 Network HAR·사람 가청을 새로 확인한 것은 아니다. 같은 소스 Preview Network R2/legacy0·사용자 가청 증거와 분리한다.
- 자동 검사는 아래828단위·기존291/정책30제외·로컬44·Preview44·개인화 최초2+재실행2·구 UI 호환3·격리 PWA24 증거를 재사용했다. 소스가 바뀌지 않은 전체 검사는 반복하지 않았다.
- 도구 실패: predeploy가 주석의 `[vars]`를 오인→실제 헤더 파서·6회귀로 수정. migration 첫 호출 root tsx 부재로 실행 전 중단→DB package script로0033만 적용. Worker secret 비교는 점검 MAINTENANCE_MODE의 secret→명시 plain_text off 전환을 오탐→Google/VAPID secret 보존·health off·정확 version을 read-only 재확인. 앱 후보 재수정/재배포 없음. 운영 status 최초4실패는 문서의 이전 Pages/Worker/source/ledger 기준과 새 배포의 차이로 원본 보존.
- UI 복귀: Pages `2c0fea8d-a995-4ceb-9106-a7ba444ace82`만 복귀하고 **새 호환 Worker·0033 데이터 유지**. 구 hourly Worker 단독 복귀는 새 알림 opt-out을 무시할 수 있어 금지. backend 장애는 cron 중지 후 호환 복구를 판단한다. 데이터 손상 없이 D1 전체 복원/콘텐츠 철회하지 않는다.

증적: `.artifacts/operations/personalization-release-2026-10-14/`의 production-predeploy/migration/worker/pages/assets/smoke JSON, canonical-post.json, acceptance-current.json. 비밀키·백업 원문·사용자 자료는 Git 제외. 아래 pending/미배포 문장은 당시 이력이다.

## 배포 전 자동 검증·중단 이력

**최종 자동 검증:** 아래 Preview11급수44/44 통과. 개인화 최초 실행은2통과/2시간초과이며, 일본어8테마 검사2개만 같은 assertion으로120초 제한 재실행하여2/2 통과(72.2초)했다. 구 Pages9f046cc6→새 Worker78ee09a에서 guided session/FSRS·퀴즈 모드 API·선택지 제출/결과3/3 통과(52.8초). 두 개인화 실행을 하나의 단일4/4 실행으로 표시하지 않는다. 코드 수정 없이 실행 제한만 원격 환경에 맞췄다.

**중단 지점:** 새 Preview에서 실제 알림 수신·사람 ko/ja 가청·본인 N3와 가족 일본어 TOPIK3/4 동선 확인을 요청했으나 아직 접수되지 않았다. 따라서 현 운영 점검·backup/restore·0033 적용·Production 배포·원격 push는 시작하지 않았다. 테스트 발송 수락/자동onend를 실수신/가청으로 대신하지 않는다. 사용자 답변 뒤에는 같은 자동 검사를 반복하지 말고 후보/배포 ID가 유지됐는지 확인 후 운영 gate를 이어간다.

### 후속 실측 — 개인화 Preview78ee09a (Production 미변경)

2026-10-14 로컬 후보 `78ee09a5ddec3254454fe14f174c03e5051f90d0`를 별도 clean worktree에서 검증했다. 단위828·OpenAPI/typecheck/build/fresh0033·음성/콘텐츠 계약·로컬 레슨44·G0–G4, 전체 기존 브라우저291통과/30기존 정책 제외/실패0, PWA24를 통과했다. 새 Preview는 [3dee006a](https://3dee006a.nihongo-n3.pages.dev), 배포 ID `3dee006a-b00f-4d32-be1e-e5e27b540443`다. Preview D1만0033으로 올리고 새 Worker/flag-on Pages를 반영했다. 기존600문항·220레슨 read-only verifier 통과, 콘텐츠 재시드 없음.

실제 Chrome에서 동일 Preview의 ko/ja 각각onend1과 재생 중 Network R2/legacy0을 확인했다. 실제 Google 로그인 사진 로딩·기기 알림 구독·테스트 발송 수락도 확인했다. **사람 가청·가족 동선·실제 기기 알림 수신은 아직 접수 전**이며 자동 검사와 구분한다. Google 로그인이 돌아오는 Preview 별칭의 오래된 PWA는 데이터 삭제 없이 재진입→양언어 업데이트 모달→명시 새로고침 후 새 네 메뉴/프로필로 전환됐다. 계정의 정기 알림 예약은 변경하지 않았다.

원격11급수44검사는44통과/제외0/실패0/재시도0(23.1분)이다. 개인화 원격 최초4개 중 한국어 사진·저장·기록2개 통과, 일본어8테마 조합2개는기본30초 제한에 도달했다. 실패 원본을 보존하고 같은 assertion/후보로 일본어2개만120초 제한으로 재실행한다. 구 Pages/신 Worker 호환성·사용자 확인·운영 backup/restore/predeploy는 아직 남아 있다. **Production과 원격 Git push는 미실행**이다. 아래 '미커밋/새 Preview 없음'은 이전 단계 이력이다. 증적은 `.artifacts/operations/personalization-release-2026-10-14/`와 clean 후보의 `.artifacts/personalization-local-final03/`에 보존한다.

후속 운영 점검: local39통과/2경고/실패0(문서7개 dirty와 기존 manifest 경고), remote50통과/2경고/1실패. 원격 실패는 아직 push하지 않은 local78ee09a와 remote9b70e84의 SHA 불일치이며 다른 원격 항목은 통과했다. 원격 전체 통과로 보고하지 않는다. 문서 검사972경로/76문서/1197링크 및 diff whitespace 검사 통과.

### 2026-10-14 활성화 후보 검증 (배포 전)

- feature-on 최종 단위 검사828개(ops33/DB303/web252/API240), OpenAPI/typecheck/audio 계약, fresh0000–0033과 content contract를 통과했다. 실패한 최초 실행은 별도로 보존한다.
- 실제 이전 Pages build→새 build의 PWA 전환24개를 통과했다. 이는 물리 음성·푸시 수신 증거가 아니다.
- 최초 전체 브라우저278통과/30기존 제외/13실패에서 기존 계정 메뉴·상태 선택자와 검토한7개 시각 기준선을 수정했다. 허용 오차·마스킹·검사를 늘리거나 삭제하지 않았다. 최종 전체 브라우저는 실행 중이다.
- INC-PUSH-115: Web Push HKDF info에 중복 counter가 들어가던2줄을 수정했다. RFC8291 알려진 값·독립 수신자 복호화·변조·VAPID 서명5검사가 통과했다. 실제 수신은 새 Preview에서 별도 확인한다.
- INC-REL-114: scheduledTime 기준 예약,0033의77표 백업과0032→0033의74기존표 보존/실제 JPEG BLOB export-import 검사를 추가했다. 운영 스냅샷 복원은 아직 실행하지 않았다.
- 새 Preview/Production/원격 push는 아직 실행하지 않았다. 현재 사용자 승인은 모든 필수 gate 통과 후에만 유효하다. Preview VAPID는 별도 키를 사용하며 운영 키·OAuth는 유지한다.

### 후속 실행 — 활성화 및 조건부 배포 승인

사용자가 이번 세션에서 새 기능의 테스트·Preview·실제 푸시·가청·릴리스 검증 후 Production 및 push를 승인했다. 아직 운영은 변경하지 않았다. 새 feature-on 전체 검사와 독립 검토로 INC-REL-114(0033 백업/복원·예약 지연·기존 테스트 선택자), INC-PUSH-115(표준 Web Push 복호화 실패)를 발견했다. 실패 원본을 보존하고 최소 수정한다. Preview VAPID는 운영 키와 분리하며 운영 OAuth/기존 VAPID는 교체하지 않는다. 테스트 알림 UI는 서비스의 발송 수락만 표시하고 실제 수신은 사용자 확인으로 구분한다.

0033 백업은77표이며 기존0032는74표/profile0031과 실제 migration ledger0032를 구분한다. 현재 release에서는 구65표 user-cleanup/transfer를 실행하지 않는다. UI 복귀는 직전 Pages+0033 호환 Worker 유지가 기본이다. backend 회귀 시에는 알림 예약 중지 또는 custom 제외/발송 원장을 이해하는 호환 Worker를 검증한 뒤 복귀하며 새 테이블·정상 학습 기록은 삭제하지 않는다.

사용자가 후속 **입체형 학습 UI 고도화** 구현을 승인했다. 현재는 로컬 React·계정 API·집계 API·additive migration `0033` 구현 및 검증 단계다. **Production·Preview·원격 D1·commit/push는 이번 변경에서 실행하지 않았다.** 아래 시안 단계의 미구현 문장은 당시 이력이다. 생성 시안의 수치·클릭을 실제 학습 저장 증거로 쓰지 않는다.

운영 기준선은 web887d2b2 / Pages2c0fea8d, Worker71e71638 / source37486f8 / D10032다. 이번 작업은 [지도 릴리스](LEARNING_MAP_RELEASE_2026-10-14.md) 이후의 디자인 확장이며 기존 릴리스를 철회하지 않는다.

## 고정 계약

- 후속 승인으로 계정 사진·설정·알림·읽기 전용 통계 API와 `0033`의 새 3개 테이블을 추가한다. **기존 학습 API·콘텐츠·FSRS·XP·채점·음성 코어는 변경하지 않는다.** 이전 Pages-only 경계는 호환 Worker→Pages 배포로 대체한다. 기존 URL/query와 저장·재개 계약은 보존한다.
- 밝음/다크/system 선택 유지. 아이보리/차콜 배경, JLPT 주홍/TOPIK 청색 강조, 제목28px·본문16px, 카드20px·버튼16px·터치48px를 공통 토큰으로 관리한다.
- `RootLayout`의 넓은 account details/summary를 compact profile trigger와 반응형 dialog로 교체한다. Escape·포커스 복귀·관리자 권한을 보존한다.
- 네 메뉴는 오늘/학습/복습/기록. UI 언어와 학습 언어는 분리하고 영어 지원도 유지한다.
- 청해 첫 응답 전 대본/번역 숨김, 복습 정답 확인과 기억 평가 분리, 서버 수락 전 저장 완료 금지.
- 기록의 최초 응답/재시도·안내 세션/자유 학습은 합산하지 않는다. 응답 없음과0점, 미래 복습과 기한 지남을 구분한다.
- Google 우선·같은 언어 설치 음성 fallback·ko/ja 제한·R2 발음 금지. 디자인 수정으로 음성 코어를 재작성하지 않는다.

## 로컬 구현 — 후속 승인 반영

- `VITE_ACCOUNT_PERSONALIZATION_ENABLED=true`일 때 사진 프로필 패널·계정 설정·연간 기록이 활성화된다. 기본값은 off다. 플래그는 계정 기능을 끄며 공통 CSS·아이콘까지 이전 버전으로 되돌리지는 않는다. 전체 UI 복귀에는 직전 Pages가 필요하다.
- 프로필: 본인 D1 JPEG→Google 사진→이니셜, 자르기/확대/위치 조정/저장/취소/삭제, 모바일 하단·PC 패널, Escape/배경 닫기/포커스 복귀. 계정·요청 세대로 늦은 사진 응답을 차단한다. Google 사진은 다음 Google 로그인에서만 확보하며 직접 사진은 덮어쓰지 않는다.
- 외관: light/dark/system·track/forest/sea/ink 미리보기와 명시 저장. 설정 GET을 계정별 공유 캐시에 모으고 저장 전 취소한다. 기존 명시적 기기 테마의 최초 이관은 `initialize_theme`의 SQL COALESCE로 기존 서버 선택을 덮지 않는다.
- 알림: 기기 권한/구독 상태와 계정의 예약을 분리한다. 예약 저장 전 legacy 07:00/22:00 유지, 저장 후 일별 custom claim으로 전환한다. 15분 cron과 사용자 시간대, 서버 저장 학습일만 사용한다. 확정 실패만 재시도하며 전달 결과가 불명확하면 claim을 보존한다. 실제 푸시 수신 검증은 아직 없다.
- 기록: 권위 있는 저장 원천의 날짜 합집합, 연·월별 학습일, 내부 스크롤 히트맵, 달력/일별 조회, 실제 완료 레슨 제목과 기존 결과 링크. 안내 학습과 겹칠 수 있는 저장 원천 수치를 합치지 않으며 미응답은 정답률을 만들지 않는다. 기존 스트릭/XP/배지/7·30일 기록·메모를 유지한다.
- 공통 UI: 한자 도자기 타일/붓과 실제 `漢` 텍스트, 5종 WebP(192px, 합계42,728bytes), 48–64px 카드 아이콘, 입체 버튼, 공통 반경, 지도 테마 토큰 연결. 원본 PNG를 보존했다. 사용자의 얼굴·이메일은 이미지 생성/외부 디자인 서비스로 보내지 않았다.

### 새 계약

| 대상 | 계약 |
| --- | --- |
| `GET/PUT /account/preferences` | 인증 계정별 부분 UPSERT; enum·15분·IANA 시간대 검증; 선택적 `X-Account-Id` 충돌409 |
| `GET/PUT/DELETE /account/avatar` | 본인 전용, 실제 JPEG 디코드 후256×256 재인코드,128KiB 제한, SVG/잘린 파일/다른 크기 거부 |
| `GET /notifications/subscribe` | 본인의 서버 등록 endpoint만 조회; 기기 구독과 대조 |
| `GET /learning/insights?year=YYYY` | 현재 트랙·프로필 시간대의 실제 학습일·완료 레슨; 최근200개 제한 명시 |
| `GET /learning/insights/day?date=YYYY-MM-DD` | 날짜별 안내/저장 원천 분리; 미래/잘못된 날짜 거부 |
| `0033` | account_preferences/account_avatars/custom_reminder_deliveries만 추가; 기존 학습행 불변 |

모든 새 개인 응답은 private/no-store이며 서비스워커 account/insights 경로도 NetworkOnly다. 사진 원본·R2·공개 사진 URL은 도입하지 않는다. 원격 새 schema 적용 전 새 Worker를 배포하면 안 된다.

### 검증 원장과 남은 출시 조건

이번 로그는 `.artifacts/operations/account-personalization-2026-10-14-sQNILg/`에 보존한다. 아래 최종 결과 절에서 로컬·모의·실제 원격 범위를 구분한다. 첫 전체 단위검사의 Review DOM snapshot 실패는 승인한 공통 Button class 차이였고 해당 diff만 검토·갱신했다. 첫 일본어 E2E는 UI 언어/해설 언어의 동명 버튼을 혼동한 선택자 실패였으며 UI 언어 control로 범위를 고정했다. 실패 로그를 성공으로 수정하지 않는다.

남은 필수 출시 단계: 전체 활성 route 시각/접근성·11급수 reviewed 세션, 같은 후보 Preview·두 학습자 사용성, 실제 Google 재로그인 사진·기기 푸시·양언어 가청/Network, 현 운영 전체 backup/restore·0033 upgrade·복귀·predeploy 및 현재 Production 승인. 과거 지도 배포 결과를 새 후보 증적으로 재사용하지 않는다. 영역별 응답 분포는 기존 records.groups의 최초 응답으로 표시하며 분모/기간/정답률과 기존 표를 보존했다. 전35 route의 디자인 전환은 아직 전수 완료로 판정하지 않는다.

### 로컬 실행 결과

- 단위813통과: ops33 / DB297 / API233 / web250. ops/DB는 초기 전체 실행, API는 최종 서버 변경 후 전체, web은 최종 화면 변경 후 전체 검사다. 서로 다른 실행 로그를 한 번의 단일 gate라고 표현하지 않는다.
- OpenAPI 생성/차이 검사, 4개 workspace typecheck, Worker dry-run과 flag-on Pages build, browser-audio 계약 통과.
- fresh D1은0000–0033·FK·seed/manifest·content/control-plane 통과. 별도0032→0033 upgrade 회귀는 기존 표의 행 보존·사진/설정 제약·발송 claim 중복 방지를 확인했다. 운영 스냅샷 복원이나 원격 upgrade를 대신하지 않는다.
- Chromium/WebKit 집중60개 재실행 통과(시도05): 새 개인화4,11급수 지도22,기존 퀴즈/복습/설정34. 지도22개는 합성 공개 catalog 바인딩이지 실제220레슨 전수 실행이 아니다. 후속 계정 패널 portal 강조색 수정은 개인화4개로 재확인(시도06).
- 개인화 브라우저 검사는 실제 격리 Worker/D1+합성 계정으로 사진 파일 선택/자르기/저장/재조회/삭제·설정 저장·TOPIK 일본어·양테마4강조색·390/768/1440 넘침·200%글자 확대·패널 Escape/포커스를 확인한다. 대비 측정·스크린리더 전수검사나 실제 기기 푸시 수신은 아니다.
- 최종 동결 소스에서 집중 브라우저60/60을 다시 통과했다(`jlpt-personalization-e2e-final.log`,1.6분). portal 테마·응답 분포까지 포함하며 제외/재시도0이다. 변경 source65개 결합SHA256: `c540d16c8eeacea7959c9faa34bf64c72cc5eda8a1b78034411e3bdd494e361e` (apps/packages/e2e 변경 경로+파일 hash, Git commit SHA 아님).
- 최초 통합 브라우저 시도04의39통과/21실패를 보존했다. 무사진 avatar404와 명시 저장 전환 후 구 테마 테스트 동작을 보정했다. 일부 networkidle timeout도 있었으며 단일 원인으로 확정하지 않는다. 수정 후 시도05를 별도로 통과했다.
- 문서/카탈로그969경로·76문서와 ops39통과/2경고/0실패를 확인했다. 경고는 dirty 작업 트리와 기존INC-DATA-024 manifest drift다. 새 remote status는 실행하지 않았다.

복귀는 새 화면 비활성→직전 정상 Pages→0033과 호환되는 직전 Worker/cron 설정을 확인한다. 이전 Worker로 되돌릴 때 custom 예약을 지원하지 못하므로 **hourly/quarter-hour cron과 legacy 제외 정책을 함께 검증**해야 한다. 기존 학습행은 유지하며 D1 전체 복원은 데이터 손상이 확인된 경우에만 판단한다. 새 사진/설정 테이블을 rollback 목적으로 삭제하지 않는다.

## 이전 시안 검토 단위 (이력)

기존 Superdesign 지도 프로젝트를 재사용하며 하나의 스타일로만 확장한다. 비용과 검토량을 줄이기 위해 여섯 대표 화면을 세 개의 연결 시안에 묶는다. 각 시안에 한국어JLPT/일본어TOPIK 및 독립적인 밝음/다크 미리보기 조작을 제공한다. 이 조작은 제품 설정과 구분한다.

1. 공통 헤더·계정 패널 / 학습 허브: 큰 계정 펼침 제거, 목적별 카드, 장기 계획·진단 보조 영역.
2. 복습 / 기록: 회상→정답 확인→평가, 진행률·빈 상태·실패 상태, 실제 집계 범위와 overdue 표시.
3. 자유 문제 / 시작·로그인: 기존 트랙별 가능한 선택만 제공, 큰 홍보 영역 제거, 기존 로고·인증 동작 유지.

시안 생성 요청과 선택한 소스 목록은 `.superdesign/unified-ui-flow.json`에 기록한다. 디자인 기준은 `.superdesign/design-system.md`이며 새 시안 승인을 기존 지도 승인으로 대체하지 않는다.

### 생성 결과와 한계

- [전체 캔버스](https://superdesign.dev/teams/b4c51e76-39fd-4c3c-a90b-069c98104724/projects/c35594fd-cdcb-482d-bee8-c2eb86320771)
- [헤더·계정·학습](https://p.superdesign.dev/draft/95672594-0112-43da-8d4a-784b9d00dbb3)
- [복습·기록](https://p.superdesign.dev/draft/901c9fd9-5fa1-4c4e-9b8f-5155dab3ca38)
- [자유 문제·시작/로그인](https://p.superdesign.dev/draft/9ffad5ce-817b-4800-8d25-742ee4aa404f)

모델은 CLI 현재목록의 `gemini-3.1-pro`이며 생성 응답은 **111.5credits consumed**를 보고했다. 목록의 free tier는 무크레딧 생성을 뜻하지 않았고 추가 생성은 하지 않는다. v1에서 TOPIK/JLPT 선택항목 혼입, 다크모드 누락, dialog 노출/포커스·현지화, 기록 탭 전환 오류를 발견했다. 이는 생성 시안 결함이며 운영 앱의 신규 결함으로 보고하지 않는다. 같은 draft의 직접 HTML 보정은 생성 없이 진행하고 승인 전 앱에 복사하지 않는다.

## 구현·검증 순서

### 일러스트 보강 — 사용자 후속 요청

- 내장 `image_gen`으로 책·회상 카드·듣기·성장 기록의 독자적 일러스트 4종을 생성했다. 도자기 질감과 아이보리·주홍·남청·옥색을 사용하며 로고나 하단 조작 아이콘을 대체하지 않는다.
- 원본 PNG와 프롬프트·SHA-256·Superdesign content URL은 `.superdesign/assets/learning-porcelain-v1/manifest.json`에 저장했다. 각 이미지 1254×1254, alpha 채널 있음. 원본 합계 약4.36MB로 시안용이며 운영 적용 전 표시 크기에 맞춘 최적화가 필요하다.
- 기존 시안에 직접 삽입: 헤더/학습 v4, 복습/기록 v3, 문제/로그인 v4. 별도 Superdesign AI 시안 재생성은 하지 않았다. 기존 draft 버전은 보존한다.
- 한글 `가`·일본어 `あ`는 이미지에 생성하지 않고 실제 텍스트로 표시한다. 일러스트는 빈 alt와 aria-hidden을 사용하고 기존 의미 있는 버튼·링크 명칭을 유지한다.
- 세 시안의 script 블록은 변경 전과 동일하다. Chrome390px에서 한국어 학습·일본어 다크 학습·기록의 이미지 로딩과 가로 넘침 없음 확인. 이는 제한된 시안 QA이며 전 화면 접근성·실제 학습 기능·음성 검증이 아니다.
- 앱 소스·Worker·DB·Production·Git push 변경 없음. 최신 시안 승인을 기다린다.

1. 대표 시안 사용자 확인 → 공통 토큰·Button/Card/Input/Badge/Progress·header/dialog/page-title/state 컴포넌트 구현.
2. 네 메뉴 → 문제·청해·독해·쓰기 → 어휘/문법/한자/문장/문자 → 계획/진단 → 설정/관리자/오류/음성점검의 전체 활성 route에 적용.
3. 각 route에서 실제 호출·필터·이벤트와 로딩/빈 상태/실패 상태를 대조한다. 생성 시안의 예시 콘텐츠를 DB나 앱 데이터로 복사하지 않는다.
4. 영향 단위 검사와 Chromium/WebKit390/768/1440px·ko/ja·밝음/다크·200%확대·키보드·포커스·대비·터치를 검증한다. 허용값 확대나 광범위 시각 마스킹을 하지 않는다.
5. 최종 후보의 기존 전체 회귀·11급수 세션·PWA를 검사한다. 실패 원인을 좁혀 수정하고 변경 없는 영역의 전체 검사를 이유 없이 반복하지 않는다.
6. 같은 Preview에서 두 학습자 동선·실제 Chrome양언어·가청·Network를 확인한다. 기존 운영 gate와 현재 승인을 충족한 뒤 Pages만 배포한다. Worker/DB는 유지하며 화면 flag·직전 Pages로 복귀한다.

## 이번 단계 검사

최종 검토 대상은 헤더/학습 v3, 복습/기록 v2, 문제/로그인 v3다. 직접 HTML 보정 후 다시 가져와 원격 저장 결과를 확인했다. 실제 Chrome 시안에서 계정 패널 열기→Escape 닫기→프로필 포커스 복귀, 문제/로그인 단일 패널 표시, TOPIK 전용 선택과 일본어 네 메뉴를 확인했다. 이는 시안 인터랙션 검사이며 앱의 API·로그인·학습 저장 테스트가 아니다. 로그인 내부 언어 선택 등 일부 제어는 여전히 시각 예시이며 실제 설정 연결은 React 구현 대상이다. 전체 크기/언어/테마 접근성 매트릭스는 미실행이다.

당시 사용자 시안 승인은 대기 중이었다. 이후 현재 구현 계획 승인으로 로컬 구현을 진행했다. 당시 화면 캡처는 무시 경로 `.superdesign/tmp/unified-preview.png`에 보관했다.

독립 route inventory: `App.tsx`에 index/wildcard를 포함한35개 route 선언. public4, shared6(관리자1포함), TOPIK6, JLPT18, fallback1이다. shared learner route 일부는 기존 feature flag로 조건부 렌더링한다. 관리자 role은 route wrapper가 아니라 `AdminUsers.tsx`에서 검사한다. 아래 그룹별 검사는 실행 결과가 아니라 구현 시 적용할 체크리스트다.

| 그룹 | 적용 대상 | 기존 검사 연결 |
| --- | --- | --- |
| Public | welcome/login/register/audio-qa | auth, audio-qa |
| Shared | learn/questions redirect/records/study/settings/admin | learning-experience, learning-map, settings, track-isolation; admin 권한 회귀 보강 |
| JLPT 학습 | review/quiz와 결과·청해/browse와 상세/reading와 상세/characters | srs-review, quiz-modes, vocab-search, n2-release-browse, character-trainer |
| JLPT 보조 | curriculum/self-check 및week/stats/add-word | self-check, stats, menu-smoke; 직접 URL 확인 |
| TOPIK | home/placement/learn/characters/review/progress redirect | topik-product, topik-owner-curriculum, topik-character-trainer |
| 공통 상태 | fallback404/offline/오류/빈 상태/테마·반응형/PWA | offline, responsive-ui, settings-theme, visual-regression, pwa-update |

- 시작 `pnpm ops:status`:40pass/1known-warning/0fail. 작업 트리 clean.
- Superdesign 기존 프로젝트·지도 draft v5 및 로그인 확인. 새로운 원격 배포나 학습 데이터 조회/쓰기 없음.
- 앱 단위/E2E·새 Preview·실제가청·Production gate는 이번 디자인 단계에서 실행하지 않았다. 과거 테스트 수치를 새 시안 구현의 통과로 재사용하지 않는다.
