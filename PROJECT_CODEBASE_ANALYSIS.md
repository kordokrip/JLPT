# JLPT · TOPIK 코드·DB·API 지도

갱신: 2026-10-25. 개인·가족용 모노레포로 분리된 마이크로서비스/새 운영 플랫폼을 추가할 필요는 없다. 인증·계정 격리·오프라인/재전송·채점·출판 원자성은 작은 앱에서도 높은 위험이다.

## 마지막 완료 배포 기준

D1 `0000–0033`/77표. Worker `69cffaa1-996d-42a7-9080-13c526203e86`, source `78ee09a5ddec3254454fe14f174c03e5051f90d0`. Pages `https://92c6e58b.nihongo-n3.pages.dev`, ID `92c6e58b-f01f-47c6-b1e5-9df9762d3ab8`, web source `6ecc203ddce31fe373ed17527dafad25f615463e`. 콘텐츠 source `3485c6ef8addda3cd3e209730646c296175cf3c9` / manifest `content-v3-d102868e3d43b9b3c1a4`. [현재 상태](docs/00_overview/CURRENT_STATE.md).

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

## 콘텐츠·음성·운영

600문항/220레슨은 공개 완료다. `learning-cohort-remote.ts`의 stage/publish/verify/withdraw와 정확한5개 release 계약을 사용한다. 실패 초안과 Preview-only 도구를 새 공개 우회에 사용하지 않는다. [원본 지도](docs/00_overview/00_source_map.md), [감사](docs/00_overview/CONTENT_AUDIT.md).

Web audio·google-browser-speech·useKoreanAudio는 같은 언어 Google 우선/fallback과 ko/ja 제한을 공유한다. R2/서버 발음 금지, legacy410. Vite injectManifest의 src/sw.ts와 pwa-update가 캐시·알림·업데이트를 처리한다. mock/onend는 사람 청취 증거가 아니다.

[테스트 선택](docs/00_overview/LOCAL_CICD_OPERATIONS.md)은 변경 위험별이다. source/설정이 바뀌지 않은 영역의 전체 검사를 개발 매번 반복하지 않으며 최종 배포 필수 gate는 유지한다.
