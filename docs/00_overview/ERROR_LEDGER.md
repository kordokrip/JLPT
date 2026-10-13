# 오류·회귀 차단 원장

## 2026-10-13 지도 배포 전 통합 검증

- `INC-UI-107` — 새 지도에서 기존 current 세션의 로컬 복원과 일반 quick 시작이 누락됐다. 독립 소스 대조 후 cold-offline 재개·빈 목록/전량 완료 quick 버튼 회귀 3개가 실제 실패했다(기존 8개 통과). UI에서 서버 수락 세션을 scope별 보존하고 일반 quick 진입을 복구한다. 기존 학습 E2E의 API 직접 생성 우회도 실제 버튼 시작으로 교체한다. 수정/새 전체 검증 전 Production은 차단한다.
- `INC-UI-108` — 기존 프로필/메모 저장 mutation이 오프라인 대기 중 계정 전환 후 실행되면 현재 계정으로 이전 계정의 입력을 보낼 수 있었다. 독립 모의 transport에서 A 메모가 B 계정 요청으로 전달되는 반례를 재현했다(원격 쓰기0). 클릭 당시 scope를 API 실행 전과 성공 반영 전에 검사하는 회귀/수정을 진행한다. 실제 운영 사용자 데이터 혼입으로 단정하지 않는다.
- `INC-UI-109` — 이전 questions 링크의 급수/영역은 통합 화면 URL까지 보존되지만 자유 연습 링크에서 유실됐다. 중간 URL만 확인하던 테스트를 실제 선택·요청까지 확장하고 allowlist 기반 전달을 적용한다. 잘못된 급수를 다른 급수로 출제하는 fallback을 추가하지 않는다.
- 최초 원격 읽기 전용 상태는 50/2/1로 D1 R2 조회 Cloudflare7403 실패였다. 설정 변경 없는 별도 전체 재실행은51/2/0이다. 최초 실패는 보존하며 운영 발음 장애로 해석하지 않는다.

## 2026-10-13 학습 지도 구현의 회귀 차단

- `INC-UI-105` — 네 메뉴 모드의 목적지4개/고정5열 불일치를 소스에서 확인했다. 실제 목적지 수에 맞는 동일 너비 열과 두 트랙 회귀를 추가했다. 최종 실행 결과는 [학습 지도 기록](LEARNING_MAP_UX_2026-10-13.md)에 기록한다.
- 신규 지도는 공통 start-request 키를 재사용하지 않고 레슨ID·버전·모드·급수별 요청 ID를 보존한다. 조회 실패를 복습0/세션없음으로 간주하지 않는다. 세션 제목은 ID와 버전이 모두 일치해야 하며, 완료와 다음 복습은 서버 수락/조회 상태로 판단한다.
- Superdesign 합성 완료 시안의 추정 XP를 제거하고 합성 수치 고지를 추가했다. 시안 수치나 이전 가청을 실제 앱 검증 증거로 사용하지 않는다. 음성 코어 수정은 없다.
- `INC-UI-106` — 구현 중 독립 검토에서 StrictMode effect 재실행 후 mounted=false가 남아 시작 성공 뒤 이동을 막는 문제와, 오프라인 대기 mutation이 새 계정 클로저로 실행될 수 있는 반례를 확인했다. effect setup을 복구하고 클릭 당시 expectedScope를 mutation 변수에 고정했다. 새 실제 컴포넌트 회귀7개에서 StrictMode 시작·늦은 응답·paused start/close 차단을 확인했다. 운영 배포 전 로컬 후보에서 발견한 결함이며 운영 데이터 손상으로 보고하지 않는다.

## 2026-10-13 운영 전환 후속

후속 결론: INC-OPS-104 수정은 새 runtime-only continuation에서 실제 통과했다.16:20:53 KST Pages6b8b8a19/Worker71e71638·점검off·queue 원복·smoke7/7·새 운영Chrome 양언어 onend/HAR0으로 배포 종료. 검사기의 실패 run은 수정하지 않았다. 일반 프로필의 구 entry 로딩은 새 후보 증거에서 제외했고 별도 실제 시크릿 Chrome에서 새 entry를 확인했다.

- `INC-OPS-102` — maintenance 버전 생성 직후 목록 첫 항목을 새 버전으로 간주한 private operator의 식별 오류. CLI가 반환한 정확한 UUID를 직접 조회하고 코드·비점검 binding 불변을 검사하도록 수정했다. 첫 실패는 보존하며 실제 기존 앱 코드 변경으로 해석하지 않는다.
- `INC-OPS-103` — D1의 현재 opaque Time Travel bookmark 차이를 곧바로 논리 데이터 쓰기로 간주해 유효한 백업/복원 후 중단했다.72개 백업 테이블과 실제 행·컬럼/DDL 비교는 모두 일치했다. 후속은76개 논리 테이블·DDL·ledger의 불변을 직접 검사하고 bookmark는 진단값으로만 남긴다. 내부 bookmark 변경 원인은 확정하지 않는다. 이전 run 실패와 실제 백업/복원 성공 artifact를 각각 보존한다.
- `INC-OPS-104` — Pages private runner가 운영 `API_ORIGIN` 명시 설정 및 immutable Production URL의 API200을 잘못 요구했다. 실제 계약은 canonical host의 운영 Worker 기본값과 immutable API503이다. 운영 canonical 인증200/후보SHA/Google 활성·Worker read-only를 독립 확인했다. Pages 업로드 전 실패로 기존 Pages는 변경되지 않았다. 새 continuation은 immutable 정적 바이트 검증과 canonical API 검증을 분리하며 원래 실패·승인·출판 원장은 수정하지 않는다.
- `INC-PWA-100/101`, `INC-QUIZ-098` 후속 — 후보37486f8의 실제 빌드 PWA24/24, 기존 E2E265/30정책제외/0실패, 새 Preview 레슨44/44 및 별도 전체 호환 복귀 연습을 통과했다. 아래 이전 불합격 수치는 그 당시 실행 이력이다.

전체 배포 상태는 [통합 릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md)의 최상단을 따른다. 아래는 보존된 이전 기록이다.

- `INC-PWA-101` — 전체 기존 E2E에서4개 엔진의 `/manifest.webmanifest`가 JSON 대신 개발 SPA HTML을 반환했다(b773420:261pass/30skip/4fail). `VITE_PWA_DEV_SW=false`를 VitePWA devOptions.enabled에도 연결해 manifest route까지 비활성화한 설정 결함이다. devOptions의 manifest 제공은 유지하고 등록 차단은 기존 main.tsx 조건으로 분리한다. 실제 Production 빌드 manifest 결함이나 음성 장애로 확대하지 않는다. 기존 실패 원본은 final2 clean worktree `.artifacts/existing-e2e01.*`에 보존하며 수정 후 새 후보 전체 gate를 실행한다.

2026-10-13 재개 검증: **INC-PWA-100의 검사 동기화 결함을 수정했고 새 실제 빌드 PWA 24/24가 통과했다**(`pwa-update-2026-10-13/cohort-MUoLPj`, exit0). 구 active의 상태를 새 SW 활성화로 오인한 조기 재진입을 없애고, installed 및 정확한 새 versionId의 activated를 확인한다. CDP에서 구 version의 redundant와 새 bundle/양언어 모달을 독립 교차 확인했다. 강제 활성화·캐시 삭제·검사 제외·timeout 확대는 하지 않았다. 아래22/24는 보존된 이전 실패 이력이다. 이 통과는 격리 PWA 전환 검사이며 새 전체 release/Preview/복귀/가족/가청/backup/predeploy를 대체하지 않는다. 나머지 게이트를 이어서 실행하며 아직 Production·push는 하지 않았다.

- `INC-PWA-100` — **로컬 최초 전환 gate 실패/운영 미반영**. 새 양언어 업데이트 모달은 일반 갱신·IDB 합성 큐 보존·다른 탭·활성화 중 이동20개를 통과했다. 독립 검토에서 직접 reload/경합을 찾아 단일 탭·최종 경로/mutation guard로 보강했다. 구032→신버전 재진입 WebKit2개는 통과했으나 Chrome PC/모바일은 구 bundle을 열어2실패(전체22/24·exit1)다. cache에 구/새 index가 있고 종료 후 window client0도 관찰했다. 원인은 미확정이며 실제 사용자 학습 유실 또는 운영 오류를 재현한 것은 아니다. 과거12/12 통과를 최초 전환 통과로 확대하지 않고 새 Preview/Production/push를 차단한다. 원본 `pwa-update-2026-10-13/cohort-fUjZqk`와 모든 최초 실패를 보존한다. [릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md).

## 2026-10-13 통합 배포 — Preview 반영, Production 차단

0adbfc0 후속확인: clean675단위와existingquiz/FSRS E2E26/26을새로통과했다. 호환f3caa61의격리409/410·기존200·보존회귀도통과다. 미push외운영변경은없다. 신규전체Preview/복귀gate·가족·실제새후보가청·backup/predeploy를아직통과하지않았으므로아래failed원본과운영미반영상태를보존한다.

- `INC-QUIZ-098` 승인 후속 — **수정·격리 회귀 확인 완료/운영 미반영**. version snapshot·typed ID·정확 급수/모드·공개 판정과0032 snapshot/완료/REPLACE/write guards를 추가했다. API precheck후철회는 D1 batch 전체 취소/409, 상세410·NULL legacy summary보존이다. 동시서로다른답변은1claim/1activity set이다. 현재API215/호환API200/DB19 통과. old032 기반 호환f3caa61을 fd38에 적용해 retired409×2/410×2·13표 hash보존·canonical/기록/FSRS200·FK0을 재확인했다. 원래 실패를 편집하지 않았다. 새후보 전체 복귀/Preview·가족·backup/Production은 아직이며 이 제한된회귀를전체P1운영closed로 표시하지 않는다.

- `INC-QUIZ-098` — **P1/미해결**. 실제 별도 원격5 release 철회/공개0→구 Worker032b50dd→구 Pages88ec97bd→격리 점검off에서, 철회된 pending JLPT 퀴즈 submit200·활동3→6과 completed detail200·정답 반환을 재현했다. canonical N3 submit200/records200/quiz3행 유지/FK0은 확인했으나 전체 학습 기록 보존 통과는 아니다. 원인은 generic quiz가 저장된 questions_json의 공개 여부를 다시 검사하지 않는 것이다. 현재a49와 구032의 해당 코드가 같고0031 study_steps guard는 quiz_attempts에 적용되지 않는다. 정확 구 Worker SELECT를 DB trigger만으로 막을 수 없어 호환 복귀 정책 변경을 요청했다. 후보 API 수정/0032·재검증 전 Production 차단. 재현 원본 `drill-rollback-quiz-result-cohort01.json`은 passed=false로 보존하고 격리 Worker는 read-only로 다시 잠갔다. 독립 Astra 검토도 실패 판정을 확인했다. 운영 장애나 운영 쓰기 발생을 뜻하지 않는다.
- `INC-QA-099` — **원격 전체 gate 미완료**. Preview E2E CJS loader의 import.meta.url 실패를 경로만 교정했다. actual44 후속 cohort03은31pass/13미실행·suite timeout, cohort04는18pass/1fail/25미실행·suite timeout으로 모두 exit1이다. trace에 약993.65초 호출 공백과 응답 미수집 register가 있으나 서버 원인·노트북 sleep은 미확정이다. 미실행/실패를 통과로 바꾸거나 timeout만 확대하지 않는다. 안정된 실행 환경과 최종 새 후보에서 전수 검사를 다시 해야 한다.

현재 Preview600/220 공개/verifier와 같은 배포 Chrome ko/ja onend·재생구간 Network0·현재 사용자 가청 확인은 완료다. **가족 동선은 현재 사용자 답변대로 미확인**이며 현schema backup/restore·전체predeploy·Production·원격push는 미실행이다. 최신 시계열은 [통합 릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md). 아래 구현 중 표기는 최초 실행 이력이다.

- `INC-QA-097` — clean worktree 첫 실행은 `/tmp`/`/private/tmp` 출력 경로 차이로 테스트 전 거부됐다. 다음 실행의 단위는 과거 TOPIK v2 증적 미연결로 Ops32·DB252통과/1실패·나머지 미실행이었다. 역사 증적 경로만 연결한 후 전체648·typecheck/OpenAPI/build/fresh D1·44레슨 E2E·V7 local drill은 통과했다. 그러나 통합 collector가 command gate에 `artifact` 대신 `path`를 써600 공개 전에 exit1로 차단됐다. prerequisite와 command gate를 분리하는 helper/회귀를 추가해 수정한다. 첫 실패·후속 실패를 보존하며 새 전체 게이트 완료 전 원격 반영하지 않는다.

- `INC-OPS-094` — Worker 배포 helper가 `MAINTENANCE_MODE`를 전달하지 않아 config의 `off`로 점검을 암묵 해제할 수 있다. 소스와 유지보수 HTTP/cron 경로를 교차 확인했고 신규 회귀는 필수 검증 함수 부재로 실패했다. 명시적 `off|read-only` 전달과 배포 후 SHA/모드 확인을 추가해 helper5/5를 통과했다. queue handler도 점검을 무시해 최초 회귀1실패/2통과였다. 점검 중 batch 전체를 defer하는 guard를 추가했다. 실행 중 workflow 종료와 원격 queue pause는 별도 확인하며 HTTP 점검만으로 백업 안전을 주장하지 않는다.
- `INC-RELEASE-095` — 기존 정식 출판은 V7 두 release만 다루며 별도160 v3는 draft adapter뿐이다. 5개 통합 출판·의미 봉인·철회 및 실제 원격 복귀 검증이 없으므로 현재 Production 공개는 차단한다. 기존 실패 리뷰/원장은 수정하지 않는다.
- `INC-RELEASE-095` 구현 후속 — 독립 검토가 준비 후 candidate SHA/phase/대상 DB 변경과 기존 NULL-cohort V7 draft의 부분 적재 후 구 publisher 우회를 재현했다. 최종 UPDATE에 실제 검증한 source5/gate25/job30/preview5를 고정하고 stage 첫 문장에서 기존 draft를 opt-in했다. 같은 두 반례의 독립 재검증은 모두 차단/문항·레슨·감사 공개0이며, 정상5개 공개600/220→철회0도 통과했다. 동일 버전의 미감사 추가 문항 수량도 차단했다. 신규23·기존V719·API208 및 실제 새 로컬Wrangler의 공개 거부/성공/철회/FK0을 확인했다. 합성 operator gate를 사용한 회귀이며 실제 원격·Production 증거는 아니다.
- `INC-OPS-096` — 독립 검토가 Worker helper에서 split `--env topik-preview` 또는 오타 옵션이 무시되어 기본 Production으로 향하는 P1을 무쓰기 probe로 재현했다. unknown/split/duplicate 거부와 필수 명시적 env를 추가하고 package deploy script는 `--env=production`을 고정했다. 실제 원격 오배포가 발생한 증거는 아니다.

이번 사용자는 V7+160 전체 검증·Production·최종 push를 조건부 승인했다. 새 후보의 실제 가족 관찰·Chrome 양언어 종료/가청/Network0 및 전체 게이트 전에는 운영 쓰기를 하지 않는다.

## 2026-10-12 출판 계약 후보 — 로컬 교정·검증 완료, 운영 미반영

- `INC-RELEASE-089` — 독립 검토가 마지막 두 release의 stage/publish 사이 race로 불완전 콘텐츠가 공개될 수 있는 P1을 발견했다. 단일 UPDATE exact JSON seal로 교정했고 같은 반례 거부·공개0, JLPT mirror 포함 actual440 roundtrip3/3을 확인했다. 최종 cohort04 단위614/E2E44·정식local 공개/재실행/철회까지 통과했다. 운영에는 미반영이다.
- `INC-CONTENT-090` — Preview160 v2는 A/B 각각158/2·`passed=false`로 보존한다. 별도 v3는 두 결함만 수정해 A/B 각각160/160 승인했지만 완전 맹검은 주장하지 않는다. 새 버전/hash/review를 유지하고 이전 실패를 편집하지 않는다.
- `INC-DATA-091` — 별도160 v3 portable export가 `reviewers` 대신 `reviews`를 내보내 cohort01 자동 검사160건 실패했다. 또 DB adapter가 쓰기8건의 다국어 rubric/sample key와 듣기8건 `audio_text_ko`를 누락했다. 실제 Python validator 회귀·항목별 API 필드/대본/grade-X/speech binding 검사를 추가해 교정했다. 독립 실제0031 DB join120·쓰기8/듣기8·reseed/FK/rollback·기존 사용자 보존 통과. 동결본·리뷰는 편집하지 않았고 원격 반영하지 않았다.
- `INC-DB-092` — cohort02 실제 D1 API3건이 expression depth100 초과로 실패했다(native SQLite 한도1000). AND 그룹을 나눈 뒤 API205통과했으나 cohort03 Wrangler0031 import는 `=CASE`/`<>CASE` splitter 누락으로 trigger END가 분리되어 `incomplete input`·fresh/E2E 시작 실패했다. 비교/봉인/원자성을 보존한 IIF·정적 job 매핑·RAISE WHERE와 설치Wrangler splitter 회귀로 교정했다. 실제 새 로컬32migrations·FK0, 최종 cohort04 fresh·DB225/API205·E2E44 통과. 실패01–03/임시 DB를 보존하고 native 통과만으로 D1/CLI 적합성을 주장하지 않는다.
- `INC-QA-093` — 중간 local G4 이후 공개/철회 drill 실패 시 앞선 G4가 Preview 진입 근거로 남는 P1을 독립 검토에서 발견했다. preflight와 최종 report를 분리하고, 실제160 draft543행/reseed·V7 공개/재실행/철회·12종 합성 학습 표 hash 불변 뒤에만 complete G4를 생성한다. Preview CLI가 exact cohort/manifest·drill artifact hash·완료 상태를 원격 접근 전에 강제한다. preflight/잘못된 cohort/실패 표식 차단 회귀2/2·독립 재검토와 최종 실제 local drill 통과. operator attestation을 암호학적 실행 증명으로 확대하지 않는다.

최종 증적은 `.artifacts/learning-v7-release-2026-10-12/cohort04`이고 **로컬 phase만** 통과다. 음성 핵심4파일 diff0·mock 범위를 유지한다. 새 Preview·실제 Chrome/가족/사람 가청·현 schema backup/restore·Production·commit/push는 이번 사용자 범위 밖이며 실행하지 않았다.

## 2026-10-11 레슨 후보 — 당시 판정 보존 이력, 운영 미반영

- `INC-OPS-088` — 최종 remote 첫 실행은 stale catalog와 Cloudflare7403 R2 read-only 조회로49/2/2·exit1이었다. catalog 갱신 뒤 전체 재실행51/2/0·exit0을 확인했다. 최초 실패를 삭제하지 않으며 원격 mutation·배포·push는0이다. local은39/2/0이며 dirty171과 알려진 manifest drift만 경고다.
- `INC-CONTENT-083` — v6 실패를 보존하고 V7 A/B 각각440/440 승인·readiness exit0/failures0을 확인했다. local staging200/240문항·220레슨은 비공개이며 Production 공개 승인이 아니다.
- `INC-CONTENT-085` — Preview160 별도 독립 검수는 A143/17, B144/16(승인/반려), 모두 `passed=false`다. 자동 quality160/160과 혼합하지 않고 원본 보존·공개 금지한다.
- `INC-QA-086` — bootstrap 실패01 metadata, 02 owner, 04 track_srs_settings 기본 owner/jlpt/null1행을 보존한다. 교정 뒤 E2E05 desktop/mobile Chromium/WebKit44/44·exit0이다. 실제 가족·음성·Preview 증거가 아니다.
- `INC-RELEASE-087` — 10월11일에는 V7 정식440/220 profile/G0–G4/publisher/verifier가 없었다. 10월12일 guarded path를 구현했고 cohort04로 정식local 공개/철회까지 검증했다. 개발·로컬 검증의 누락은 해소했으나 새 Preview·가족/실제 음성·현schema backup/restore·Production 승인/배포는 미완료다. test-only published fixture는 여전히 출판 증거가 아니다.
- `INC-QA-084` — reviewed local verifier/E2E 준비에서 SQL bind·legacy PK·잘못된 column·TOPIK unit prefix와 빈 배열을 보존으로 잘못 판정할 수 있는 경로를 교정했다. verifier는 DB 전체 review/preflight를 먼저 수행하고 새 임시 SQLite에서 fresh0031 및 non-empty0030→0031+legacy records reseed를 검사한다. E2E launcher도 reviewed env preflight를 `rm`보다 먼저 실행한다. test-only `INITIAL` published fixture와 `publication_gate_evidence:false`는 G0–G4 또는 Production 공개 증거가 아니다.
- `INC-CONTENT-082` — v5 전체 의미 검수 최종 A426승인/14거부·cue7, B432/8·cue1, 합집합14문항/8cue로 실패했다. 과제에 없는 쓰기 조건·문법의 복수 해석·학습실 예약/개장 시각 충돌·한국어 cue와 접속 설명을 별도 v6에서 교정했다. v5 failed/draft/source/inventory는 보존하고 실제 readiness exit1/4차단을 기록했다. 당시 v6 검수로 넘겼으며 후속 v6 실패와 V7 상태는 `INC-CONTENT-083`에 별도로 보존한다.
- `INC-QA-081` 버전 후속 — v6 확장 과정에서 shared v5 실패 문구가 달라져 기존 회귀1개가 실패했다. 기존 v5 문구를 보존하고 v6만 분기한 뒤 v4/v5/v6/snapshot 전용10/10과 독립6/6을 확인했다. 버전 라벨/동일 bytes 실행/patch provenance/EEXIST 반례는 차단한다. 저장소 저작 코드 실행이지 적대적 JS sandbox는 아니다.

- `INC-CONTENT-080` — v4 동결 전체 의미 검수 불합격. 최종 A319/121, B318/122(승인/거부), 합집합 137문항·13개념. 정답 번호 해설·모호성·청해 근거·쓰기 숨은 채점 조건·고급 오답·개념 번역/문법 결함을 기록했다. readiness 실제 exit1이며 실패 원본을 보존하고 새 v5로 수정한다. 구조0·사전 부족0을 의미 통과로 보고하지 않는다.
- `INC-QA-081` — draft adapter 독립 검토가 승인 전 DB 파일 쓰기, 복합키 INSERT OR IGNORE의 충돌 은폐, transaction 밖 대조·counts 덮어쓰기를 발견했다. preflight를 파일 생성 전으로 옮기고 tmpdir/new/wx·복합키 정확 비교·BEGIN IMMEDIATE·counts 병합으로 수정했다. 합성 fixture로 실패/비공개/rollback을 검증하며 실제 불합격 콘텐츠 staging은 금지한다.
- `INC-SOURCE-075` 후속 — `.env.local`의key 위치안내후공식API에서남은5표제어취득, source06의86record/lookup0/source failures0을확인해 **출처부족해소**. 이로써새440/220/220 동결은완료했지만두의미검수/실제DB공개는아니다. 아래14→4개부족과timeout은과거실패로보존한다.
- `INC-QA-078` API후속 — API ID/basis/transport를삭제해도잔여api_request가legacy로통과하고expected_origin삭제도허용하는반례를독립검토에서발견. API표식하나라도남으면전체provenance필수,원어/locator검사·actualsense_order/first-returned-sense범위를명시해교정했다. API01/source05를편집하지않고API02/source06으로새증적생성. 부모API2회귀와독립반례차단통과,rawHTTP SHA와웹projection SHA구분/키비출력보존.
- `INC-OPS-079` — 최종통합fresh의TOPIKpractice local Wrangler실행이`other side closed`로exit1(원인미확정). 기존workspace/log를보존한뒤동일격리DB의별도33checks exit0과새격리DB의전체fresh0000–0031 exit0을확인했다. 운영오류/권한문제로단정하거나첫실패를통합통과로고치지않는다.

- `INC-SOURCE-075` 취득 전 이력 — KRdict bounded HTML 취득 실패와 source01/02의 14개 부족, 웹 보충 후 source04의 4개 개념/5표제어 부족은 원본 보존한다. native HTTP timeout을 API 권한 문제나 표제어 부재로 단정하지 않는다. 후속 공식 API 취득으로 source06 부족 0은 별도 증적이며 과거 실패를 수정하지 않는다.
- `INC-QA-076` — 독립 검토가 source gate에서 key/locator만 맞추면 개념 급수·읽기·canonical version·owned URL/hash/value 변조가 통과하는 반례와 최종 수집 파일 TOCTOU 덮어쓰기를 재현했다. trusted inventory SHA·개념→원본 파일·immutable release SHA/file hash·정확 structured identity/value/locator를 대조하고 최종 저장에도 `flag:wx`를 적용했다. 부모 회귀와 독립 재검토에서 이전6개 identity 반례 차단을 확인했다. 기존 후보01/failed artifact는 그대로 보존, 새 후보02 역시 source14부족으로 차단한다. 이는 로컬 gate 교정이며 전체 문항 의미 승인이나 운영 수정/배포가 아니다.
- `INC-QA-077` — intake 구조 validator에 끝 `/` 없는 output을 주면 URL 상대 경로가 부모 디렉터리로 해석되어 파생 record/report가 지정 폴더 밖에 생성됐다. 기존 실패/동결 원본은 변경하지 않았고 최초 파생 결과/로그를 보존했다. output을 directory URL로 정규화·기존 디렉터리 재사용 차단·exclusive record/report 저장으로 교정했으며 경로 회귀와 새 구조 검사를 별도 실행했다. 내부 증적 도구의 문제를 앱/Production 장애로 보고하지 않는다.
- `INC-QA-078` — 새 source/freeze/readiness 도구의 독립 검토에서5경로를 재현했다: 웹 증적 hash_basis를 삭제해 검증 우회, 현재 seed와 과거 SHA 혼합, leaf 디렉터리 생성 경합, 원래 selection을 둔 채 뜻/fact/파생hash 동시 변조, 문자열 `"false"`를 승인으로 취급. 웹 provenance 표식 보존 검사·Git archive의 고정 seed 실행·non-recursive leaf mkdir+wx·selectedConceptIdentity 정확 대조·literal true/정규 reviewer ID 검사로 교정했다. 관련 부모12개 회귀와 독립 반례 재검토를 통과했다. 후보04는 source미완성으로 실제freeze exit1·출력폴더0이다. 이는 로컬 검증 도구의 교정이며 신규440의 의미 승인/운영 장애/배포 완료가 아니다.
- `INC-DATA-072` — 운영 canonical 정수 ID와 fresh parser seed ID가 달라 실제 개념을 ID만으로 대조하면 실패했다(N3 確認1605/1573). 새 계약은 정확 급수/자연키/읽기·뜻을 유일하게 대조하고 환경별 실제 row ID/version을 사용한다. 공개220개념 운영 SELECT0실패·0쓰기와 canonical seed 대조0실패, 다른 급수/다른 뜻 대체 차단 회귀를 통과했다. 실제 신규 레슨 전체 staging/upgrade 완료를 뜻하지 않는다.
- `INC-CONTENT-073` — 새 대표 v2의 `확인를`·`습관를` 조사 오류와 문법 접속 학습 안내 부족을 독립 검수에서 발견했다. A/B 모두 문항12개 정답은 승인했으나 대표 전체 `passed=false`로 보존했다. 별도 v3의 삼언어 개념 안내 교정 후 A/B 각각12/12·개념 지적0으로 **정적 대표 계약만** 승인했다. 전체440/실제 화면/배포는 아직 차단한다.
- `INC-SOURCE-074` — 새 수집에서 `準備する`를 사전 명사 `準備`와 구별하지 못한 실패, `맑음` 학습형/`맑다` 표제어·무일본어 표제어 처리와 한국어기초사전 시간 초과를 확인했다. 명시적 lemma alias·suru-noun 제약·exact 표제어·동형어 읽기/무번역 보존 회귀4개를 통과하고 공급자별 bounded 수집을 분리했다. EDRDG27/177 수집·구조 검증27개는 통과, KRdict 재취득은 미완료이며 해당 실패 로그/기존 취득시각을 보존한다. 출처 범위를 대표/공급자/전체은행으로 구분하며 전체 intake로 확대하지 않는다.
- `INC-OPS-041` 후속 재발 — 10월11일 새 전체 read-only는 R2 발음 D1 참조 조회의 Cloudflare7403으로50/2/1·exit1이었다. 설정/인증 변경 없이 동일 전체 명령 재실행은51/2/0·exit0, 참조0을 확인했다. 두 로그를 따로 보존하며 원인은 미확정이다. 영구 권한 부족이나 학습 앱 장애로 단정하지 않고, 재실행 성공을 첫 실패 삭제/새 콘텐츠 공개/가청 증거로 확대하지 않는다.

- `INC-CONTENT-066` — 440문항 초안에서 정답 노출·청해 반복·복수 정답·급수/쓰기/교육 번역 결함. 독립 A151/289·B138/302(승인/거부), 각440ID와 개념 지적189로 실패했다. 31개 실제 canonical lookup과 자동 red flag195개도 확인했다. 초안/불합격 artifact를 보존하고 새 버전 재작성·두 재검수 전 DB 공개를 차단한다. 저장 계약용 합성 fixture의220레슨 결과는 의미 연결 승인 증거가 아니다.
- `INC-LEARN-067` — 레슨/release 철회 후 개별 문제는 공개인 경우, 제출 효과 저장 뒤 session DTO가410을 반환할 수 있었다. 독립 소스 검토와 실제 D1 회귀로 교정했다. 쓰기 전 검사·claim/reveal/status trigger로 검사↔claim 경합의 batch 전체를 취소한다. 철회 후 쓰기/XP/FSRS/activity0·abandoned 허용 테스트 및 독립 재검토를 통과했다. 로컬 후보 수정이며 운영 사건으로 단정하지 않는다.
- `INC-SRS-068` — 새 quick의 due 존재 검사에서 homophone이 누락되어 공개 레슨이 예정 복습을 대신할 수 있었다. 기존 세션 due SQL과 대조해 homophone_pairs/동일 급수 조건을 추가했다. 공개 레슨+유일 due homophone의 실제 API 회귀와 독립 재검토를 통과했다.
- `INC-SOURCE-069` — source intake v1이 `先生` 첫 동형어(シーサン/man)를 학습 의도로 잘못 선택할 위험. v1/해당 리뷰는 실패 증적으로 보존하고 읽기별 locator를 갖는 v2(せんせい/teacher 포함)로 분리했다. 54 record 구조 검사는 통과하지만 새 evidence hash에 재검수가 필요하다.
- `INC-QA-070` — 네 메뉴/설정 통합 이후 브라우저 계약이 과거5메뉴·`学習` 버튼·계정 메뉴의 언어 combobox를 계속 요구했다. 세 번째 확장72건은68 pass/4 fail/0 skip으로 보존했다. 실패 DOM과 설정 소스를 대조해 실제 두 언어 선택 button 그룹과 양 트랙 button, 정확 메뉴 이름·화면 폭을 검사하도록 고정했다. 기능 검사를 삭제하거나 timeout을 늘리지 않았고 같은 확장6spec의 최종 양 엔진72 pass/0 skip/0 fail·exit0을 별도 확인했다.
- `INC-UI-071` — 실제 iPhone UA 프로젝트에서 첫 JLPT 프로필 저장을 iOS 설치 팝업이 가렸다. mobile16건14 pass/2 fail/0 skip, 두 실패의 pointer interception/screenshot을 보존했다. 새 UX에서는 설치 기능을 삭제하지 않고 설정의 인라인 region으로 옮기며44px 닫기·1회 보존/standalone·legacy flag-off를 회귀로 고정했다. 설정 button 검사나 학습 저장을 우회하지 않았다. iOS 전용6개·전체 로컬530개와 최신 동일6spec/4project **116 pass/0 skip/0 fail**을 확인했다. 운영에는 미반영이며 콘텐츠 품질 차단과는 별개다.

브라우저 첫50건은48 pass/2 fail/0 skip이었다. 두 실패는 승인된4메뉴와 달리 과거 테스트가5개 링크를 요구한 것이라4개 **정확한 일본어 이름**·설정 진입 계약으로 교정한다. screenshot/오류 문서는 ignored `learning-path-2026-10-11/e2e-first-failure`에 보존한다. 새 재실행 결과는 릴리스 원장에 따로 기록한다.

같은50건의 두 번째 실행도48 pass/2 fail/0 skip이었다. 이번에는 일본어 메뉴의 실제 `学習`과 승인 문구 `学ぶ` 불일치였다. 문구를 수정한 뒤 해당2건만 재검사해2 pass/0 skip/0 fail을 확인했다. 두 번째 screenshot/오류 문서는 `e2e-second-failure`에 보존한다. 부분2건과 이전48건을 합쳐 전체50건 통과로 기록하지 않는다. 최종 별도 실행은 릴리스 원장에 기록한다.

## 2026-10-10 문서·파일 관리 교정

- `INC-DOC-065` — 현재 상태/인수인계에 종료된 배포 전 미완료 지시가 중복되고 CI/CD·수동 파일 지도는0028 기준이었다. 기존 시계열 요약은8월9일 migration을0000–0001로, 8월19일에0028을 포함한 것으로 잘못 기록했다. 코드의0000–0030·릴리스 원장·10월10일 remote52/1/0을 대조해 현재 안내를 재작성하고 과거 상태를 history에 보존했다. 날짜별 migration과 가청 증거 경계를 교정하고 자동 파일 지도·stale 검사를 추가했다. 누락 probe에서 expected/actual exit1, 복구 후 문서71/링크861·전체 로컬492·브라우저18·remote51/2/0을 통과해 로컬 문서 교정을 완료했다. 삭제/후속 검사 결과는 [정리 기록](REPOSITORY_MAINTENANCE_2026-10-10.md)을 따른다.

## 2026-09-25 개인 학습 UX 릴리스 이력

2026-09-25 Production 후속: `0029–0030`, Worker `aedcbd40`, Pages `f62a8bdb`를 반영했다. Preview `a2dfacf2`의 사용자 양언어 실제 청취와 Production Chrome 양언어 onend 1/1·재생 중 Network 요청 0을 구분한다. Production 사람 가청 질문은 별도 대기다. 운영 콘텐츠 고정 verifier 392/392·R2 발음 9표면 0·Worker 7/7·auth proxy 3/3·legacy 410을 사후 확인했다. 기존 콘텐츠는 재시드하지 않았고 `INC-DATA-024`는 계속 열려 있다.

- `INC-OPS-063` — 70-table 백업 자체는 exit 0이었으나 점검 해제 직후 wrapper health 검사와 첫 독립 postcheck가 각각 실패했다. 후속 독립 postcheck에서 기존 Worker `c2901280`, maintenance off, auth config 200/Google true, 비인가 activity 401, Queue 2개 원상복구, 설정 hash 동일, checksum 70/70을 확인했다. 원인은 확정하지 않고 최초 실패를 보존한다. 다음 백업도 복귀 직후 HTTP 단일 응답을 유일한 판정으로 쓰지 않고 독립 재확인한다.
- `INC-OPS-064` — 배포 직전 immutable content verifier는 392/392·FK/FTS·R2 0을 통과했지만 복사한 wrapper가 `pending=0`을 요구해 최초 exit 1이었다. 해당 시점에는 정확히 `0029–0030` 두 migration이 예정되어 있었다. 현재 릴리스의 baseline만 `applied=29/latest=0028/pending=[0029,0030]/unknown=0`으로 수정해 재실행 exit 0. 실패한 최초 보고서는 보존했고 DB 결함이나 이미 적용된 migration으로 오진하지 않는다.

- `INC-UX-060` — 새 학습 세션 제출이 기존 스트릭에서 누락될 수 있음. 1차 증거: `/logs/streak`의 `daily_logs` 전용·KST 날짜 집계. 2차 증거: 안내 세션의 수락 결과는 `study_steps`와 `learning_activity_events`에 기록됨. 새 집계는 트랙·프로필 시간대·과거 일지를 함께 검증하며 조회·해설·음성 이벤트는 제외한다.
- `INC-PUSH-061` — TOPIK 일본어 사용자에게 한국어 고정 알림이 전송되고 KST 밖 시간대가 반영되지 않음. 1차 증거: Worker cron의 한국어 상수·고정 UTC 2회. 2차 증거: 프로필 시간대와 UI 언어 선택이 분리되어 있음. 알림 동의, 발송 중복, 실제 수락된 당일 학습 여부를 회귀 검사한다.
- `INC-PUSH-062` — 구독 endpoint 충돌 시 다른 계정이 기존 소유자의 알림 설정을 바꿀 수 있었다. 신규 계정 2개로 fail-first `201`(기대 409)을 확인했다. `ON CONFLICT ... WHERE push_subscriptions.user_id=excluded.user_id`와 변경 행수 검사로 다른 계정의 덮어쓰기를 차단했다. 동일 전용 테스트와 API 전체 `190/190`이 통과했다. 새 후보 원격 검증 전까지 종료 판정은 보류한다.
- 2026-09-25 원격 사전 조회의 D1 검사는 Cloudflare API `7403` 권한 오류로 실패했다. 이후 동일 `ops:status:remote` 재조회는 50 pass/2 warn/1 fail이며 D1 실패는 재현되지 않고 유일한 실패는 미push Git SHA 차이다. 최초 실패를 삭제하지 않으며 이 결과를 새 후보 Preview 검증이나 배포 완료로 확대하지 않는다.

문서 점검: 2026-10-10 KST. 원격 read-only52/1/0에서 기존 배포·정책을 재확인했다. 아래9월25일 가청/전수 결과는 과거 릴리스의 증거이며 이번 정리에서 새로 실행한 결과가 아니다.
현재 상태: 빠른 레슨·보상·알림 `0029–0030`을 Production Worker `aedcbd40`/Pages `f62a8bdb`(배포 source032b50d)에 반영했다. 현 Preview의 사용자 양언어 청취와 실제 Chrome Network/onend를 배포 후보에 연결했으며 Production의 Chrome onend와 사람 가청은 구분한다. 현재 HEAD와 운영 콘텐츠 source3485/manifestd102의 drift는 별도 알려진 문제다.

이 문서는 JLPT·TOPIK 현재 오류, 잘못된 이전 판정, 복구 증적과 재발 방지 gate의 단일 원장이다. `통과`는 실제로 실행해 종료 코드와 결과를 확보한 항목에만 사용한다. mock 재생, 실행하지 못한 테스트, 로컬 build, 과거 배포의 증적은 현재 Production 가청 동작을 증명하지 않는다.

운영의 알려진 미해결은 manifest drift `INC-DATA-024`이며 immutable source로 고정한 과거 사후392개 검사는 통과했습니다. 신규 로컬 레슨 후보의 미해결은 위 `INC-CONTENT-066`과 v2 출처 재검수이며 이를 운영 해결 완료로 표시하지 않습니다. `INC-TOPIK-031`과 `INC-AUD-033`은 기존 Worker 배포 후 실제 status/CSP/R2/legacy 검사를 통과했습니다. `INC-ACT-032`는 같은 runtime의 로컬/Preview 원자성 회귀를 통과해 배포했고, Production에 합성 학습 데이터를 쓰는 검사는 실행하지 않았습니다. `INC-LEGACY-034`의 legacy DB 제거와 승인된 콘텐츠↔개념 연결/새 교육 번역은 후속 범위입니다. 아래 날짜별 후보/실패 기록은 삭제하거나 현재 통과로 덮어쓰지 않습니다.

## 오류 원장

### 2026-09-07 운영 점검 기준선 — INC-OPS-059

0028 배포 후 로컬 ops 스크립트가 여전히 `latest_name.startsWith('0027_')`만 검사하는 것을 발견했다. 앱 오류가 아니라 운영 판정 결함이다. 동작을 그대로 추출해 fail-first **8 pass/3 fail, exit1**을 확보했고 CURRENT_STATE migration 범위의 마지막 번호·파일명 형식·정수 ledger count를 모두 검사하도록 수정했다. 수정 후 전용 **11 pass/0 fail, exit0**이다. 기준선 누락/불일치는 fail-closed로 유지하며 앱/DB 재배포는 필요 없다. 증적은 `ops-migration-baseline-{fail-first,scoped}-2026-09-07.log`다.

### 2026-09-07 출시 판정과 증거 경계

사후 content392/392·기존21테이블 hash 보존·FK0/FTS·R2참조0·Worker7/auth3·Production70파일 hash를 확인했다. 실제 status는 TOPIK I/II·듣기/쓰기/읽기·쓰기true, CSP는 R2 media 미허용이다. 같은 runtime의 Preview181/6/0과 사용자555 청취 증거로 승인된 후보를 배포했으며 신규 Production 학습 기록을 테스트용으로 생성하지 않았다. 반복 전체 테스트 대신 apps/packages/lock 및 배포70파일 동일성을 증명했다. 아래 후보036–057의 수정은 이번 앱에 포함되지만 단발 인프라 실패의 원인 미확정·시각 suite 제외·실측하지 않은 지표까지 해결됐다고 주장하지 않는다.

### 2026-09-07 백업 점검 — INC-OPS-058

사용자가 운영 백업 중 일시적인 학습 저장 중지를 명시 승인했다. 신규 앱 릴리스와 최신555fc0c4 가청 확인의 승인/증거는 별개다. 백업 전용 ignored helper의 원복 후 검사에서 `/auth/config`의 `{data:{google_enabled}}`를 루트 필드로 읽는 검증기 오류를 독립 검토·운영 source3485c6e와 대조하고 최소 fail-first assertion으로 재현했다. 앱/OAuth 수정 사항은 아니다. 올바른 `data.google_enabled` 검사·fixture assertion·별도 원격 postcheck를 통과했다.

실행 중이던 최초 wrapper의 실제 exit1은 auth 검사에 도달하기 전의 `Maintenance health mismatch`였다. 재배포 전파 지연으로 단정하지 않으며 최초 응답 본문이 없어 원인은 미확정이다. 백업 자체는65개·exit0이고 기존 Worker·Queue 원복 후15:27 UTC 독립 재조회에서 off/health200/configtrue/비인가 activity401·설정 hash동일을 확인했다. 최초 execution artifact를 보존하며 후속 성공으로 덮어쓰지 않는다. 실제 새 백업의 local0028 restore도65개·FK0·FTS일치·새5개0행으로 통과했다. 가청 미확인과 Production 기존 결함은 그대로 열려 있다.

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

## 2026-09-06 Preview OAuth 및 실제 음성 후속

Preview Google SSO503은 별도 승인한 `JLPT Preview` 클라이언트와 Preview Worker secret 두 개를 연결해 해소했습니다. 활성 버전은 `87f8fbf5-97e3-4a99-96cb-3cf607911d48`이며, 이전 b02f3674와 코드 etag·runtime·나머지 versioned binding이 일치합니다. 기존 운영 OAuth 수정·secret 복사·Production 배포는 하지 않았습니다. 실제 Chrome의 JLPT Google 로그인·홈 재조회와 TOPIK 선택 후 같은 계정 Google 재로그인·TOPIK 홈 복귀를 확인했습니다. 별도 D1 읽기 전후 연결 계정1명 및 id/role/google_sub/email·FSRS 설정 hash 동일, track만 topik-ko로 변경돼 통과했습니다. 학습17테이블은 모두 빈 상태이므로 기존 비어 있지 않은 기록 보존으로 확대하지 않습니다. provider mock 로컬14개와 실제 SSO 증거를 분리하며 최종 원격187개는181 pass/6 로컬 fixture skip/0 fail,23.3분·exit0입니다. 시각60개 별도 제외와 이전178/6/3 실패 이력을 보존합니다.

새555fc0c4 실제 Chrome 음성의 Network 관측 누락은 14:36 UTC 이후 후속에서 확보했습니다. reload→양언어 onend 각1회 동안 기록한 HAR14개 HTTPS(모두 동일 Preview/200), UI의 확장 요청2개를 확인했고 R2/legacy audio0입니다. Console의 vendor-state preload 경고2개·오류0개를 숨기지 않습니다. `stability-preview-actual-audio-network.json`의 strict gate는 새 URL 사람 청취/확인자 2개 누락으로 exit1이며, 기존 partial artifact와 이전 URL 가청을 덮어쓰지 않습니다.

도구 측 다운로드 승인 차단, 기본 sandbox DNS 차단, 일부 tab stale/detached 및 브라우저 API JSON 직접 열기 차단은 실제 관측 이력입니다. 사용자의 구체적 다운로드 승인과 허용된 네트워크 실행 후 Preview 연결을 마쳤으며 다른 UI 제어 도구/비공개 API로 우회하지 않았습니다. Chrome Network의 창 단위 읽기도 별도 사용자 승인 후 수행했습니다. Google client secret은 문서·Git에 기록하지 않고 다운로드 파일 권한600으로 제한했습니다.

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

OAuth 연결 전 당시 Google SSO는 별도 **미검증 gate**였다. Pages와 직접 Worker의 `/auth/config`는200·`google_enabled:false`, `/auth/google/start`는503이었다. 콜백/secret 별도 승인 전 비활성 계약과 일치하며 이를 발음 오류나 로그인 성공으로 해석하지 않았다. 현재는 위 Preview OAuth 후속의 실제 provider 로그인·계정 연결 보존 결과를 따른다.

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
