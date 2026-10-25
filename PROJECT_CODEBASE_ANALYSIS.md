# JLPT · TOPIK 코드·DB·API 지도

갱신: 2026-10-26. 개인·가족용 모노레포로 분리된 마이크로서비스/새 운영 플랫폼을 추가할 필요는 없다. 인증·계정 격리·오프라인/재전송·채점·출판 원자성은 작은 앱에서도 높은 위험이다.

## 마지막 완료 배포 기준

D1 `0000–0033`/77표. Worker `bdeec858-143b-456b-8fe2-c8ea1e40d055`, Pages `https://df4bb452.nihongo-n3.pages.dev`, ID `df4bb452-b588-4f57-ba4f-630378d43529`. Worker/web source 모두 `8d57e1b4f177769dd0c0bf2579aa02f9584599d5`. 콘텐츠 source `3485c6ef8addda3cd3e209730646c296175cf3c9` / manifest `content-v3-d102868e3d43b9b3c1a4`. [현재 상태](docs/00_overview/CURRENT_STATE.md).

## 실행 계층

| 계층 | 진입점·역할 |
| --- | --- |
| Web | apps/web/src/main.tsx·App.tsx; React/Vite, ko/ja/en, TanStack Query·Zustand·Dexie |
| 학습 UI | pages/Today·StudySession·LearningRecords·LearnHub, features/study·learning |
| API | apps/api/src/index.ts·app.ts; Hono/OpenAPI, 인증·트랙 guard, jobs/queue/workflow |
| 공유 계약 | packages/shared/src/api-schemas.ts·learning-experience.ts; web 생성 타입 |
| 데이터 | packages/db/src/schema.ts, drizzle-v2/0000–0033, seed/ops/content |
| 검증 | e2e/playwright.config.ts, 각 workspace 단위, scripts 운영 회귀 |

`*-oa.ts` wrapper, Worker/SW/CLI는 실행 설정으로 연결되므로 일반 import가 없다는 이유만으로 삭제하지 않는다.

2026-10-25 출시한 문자 개선은 `features/character-trainer/CharacterLesson` 공통 화면과 `character-copy` 다국어 문구를 사용한다. 5자 관찰·회상·구별·재확인은 기존 기기 진도 저장을 재사용하며 서버 FSRS/XP를 새로 적립하지 않는다. `e2e/detail-responsive.spec.ts`가 세부 라우트·문자 설명 너비를 검증한다. [출시·검증 범위](docs/00_overview/DETAIL_UI_AUDIT_2026-10-25.md).

## 데이터와 저장

| 범위 | 역할 |
| --- | --- |
| users/auth_sessions·track settings | 인증·계정×트랙 격리 |
| canonical·JLPT practice·TOPIK owner/practice | 문제·급수·공개 버전·stable ref |
| learning_activity_events | 이벤트 중복 방지, telemetry와 확정 학습 성과 구분 |
| content releases/quality links/G0–G4 | 검수·불변 hash·출판/철회 |
| profiles/sessions/steps/annotations/links | 목표·버전 고정 세션·서버 채점·메모·검수 개념 연결 |
| study_reward_events | 원본 중복 방지·일일100 XP·스트릭 |
| push deliveries/subscriptions | 언어·시간대·중복 발송 차단 |
| 0031–0032 | 레슨/세션 연결·원자적 공개·철회된 퀴즈 guard |
| 0033 | 계정 preferences/avatar·사용자 지정 알림 원장 |

사진은 인증된 사용자당 D1 한 장, 정규화 JPEG이며 R2 미사용. 과거 audio binding/quiz bank와 적용된 migration은 복원 호환성 때문에 유지한다. UI 정리와 DB 삭제를 섞지 않는다.

## API·바인딩

- /learning/profile, /learning/lessons, /study/sessions: 목표·공개 카탈로그·quick/daily·재개·idempotent 제출.
- /learning/records, annotations, motivation: 확정 기록·수정 충돌·보상. 최초 응답과 재시도 구분.
- /quiz/generate, attempts: random/weakest·strict-level·정답 비노출·소유권/철회 검사.
- TOPIK complete/review → learning-effects 공통 서비스 → progress/card/review/activity. 내부 HTTP로 중복 저장하지 않는다.
- /account/preferences, /account/avatar, /learning/insights 및 day: 개인화·사진·연간/일별 조회.
- /notifications: opt-in·기기 권한/구독·예약 구분, 시간대·학습 완료 skip·발송 claim.
- 오프라인은 pending과 서버 수락을 구분하며 계정 전환 중 도착한 응답/캐시를 격리한다.

## 운영 보안 코드 계약

다음은 Production에 반영한 `8d57e1b`의 구현이다. 최신 배포 값은 [현재 상태](docs/00_overview/CURRENT_STATE.md)로 확인한다. API·DB 학습 계약과 음성 코어는 바꾸지 않았다.

- `routes/auth.ts`, `lib/auth-session.ts`: 공개 가입은 일반 사용자, Google `sub` 우선 식별과 검증된 이메일, 이메일만 같은 비연결 계정의 자동 병합 금지. OAuth state/bridge는 브라우저 cookie와 결합해 원자적으로 한 번 소비한다. 기존 연결 계정과 비밀번호 로그인은 유지한다.
- `middleware/request-intent.ts`와 Pages `functions/api/[[path]].js`: 프록시가 Origin을 바꾸기 전에 원래 출처를 검증하고 Worker에서도 독립 검사한다. 운영의 Preview Origin 허용으로 문제를 우회하지 않는다.
- `middleware/rate-limit.ts`와 `app.ts`: 인증 진입은 기존 바인딩으로 IP·정규화 계정 hash별 제한, 초과 시429/Retry-After60. 인증·알림 본문16KiB 제한. 영구 잠금/CAPTCHA는 추가하지 않는다.
- `lib/push-subscription.ts`, `lib/push.ts`: 등록과 발송 시 제공자 HTTPS·키 형식/크기를 검사하고 redirect를 거부한다. 기존 padded Base64와 Base64url을 모두 허용하며 재등록/DB 변환은 없다.
- `routes/sync.ts`, `routes/admin.ts`: 오프라인 review 입력과 과거 duration의 숫자 타입을 검증한다. 관리자 HTML은 실행 차단 CSP를 적용한다. 정상 학습 기록을 삭제하지 않는다.
- `stores/auth-store.ts`, `AccountMenu`, `RootLayout`: 로그아웃 실패는 재시도 상태로 남기고401은 로컬 해제한다. 계정 전환 뒤 늦게 도착한 응답이 새 계정을 지우지 않게 한다.
- `features/browse/useBrowse.ts`: 유형 탭은 pathname과 빈 search를 단일 navigate로 갱신한다. 데이터 조회·필터·Back 회귀는 실제 Router 및 브라우저 검사로 유지한다.

발견/검증/제한은 [보안 보강 기록](docs/00_overview/SECURITY_HARDENING_2026-10-26.md)에 통합한다. 이 문서는 모든 의존성·인프라의 취약점 부재를 보증하지 않는다.

## 콘텐츠·음성·운영 계약

600문항/220레슨은 공개 완료다. `learning-cohort-remote.ts`의 stage/publish/verify/withdraw와 정확한5개 release 계약을 사용한다. 실패 초안과 Preview-only 도구를 새 공개 우회에 사용하지 않는다. [원본 지도](docs/00_overview/00_source_map.md), [감사](docs/00_overview/CONTENT_AUDIT.md).

Web audio·google-browser-speech·useKoreanAudio는 같은 언어 Google 우선/fallback과 ko/ja 제한을 공유한다. R2/서버 발음 금지, legacy410. Vite injectManifest의 src/sw.ts와 pwa-update가 캐시·알림·업데이트를 처리한다. mock/onend는 사람 청취 증거가 아니다.

[테스트 선택](docs/00_overview/LOCAL_CICD_OPERATIONS.md)은 변경 위험별이다. source/설정이 바뀌지 않은 영역의 전체 검사를 개발 매번 반복하지 않으며 최종 배포 필수 gate는 유지한다.
