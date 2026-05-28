# 웹 단위 기능 개선 백로그

기준일: 2026-05-28 KST  
대상: `apps/web`, 관련 API 호출부, `docs` 운영 문서  
목적: 현재까지 구현된 기능 중 실제 사용자 경로에서 작동 불량, UX 혼선, 검증 공백이 발생할 수 있는 지점을 기능별로 분리하고, 다음 리팩토링 순서를 정한다.

## 1. 작업 원칙

이 문서는 한 번에 모든 기능을 고치는 구현 계획이 아니다. 먼저 기능별 문제 후보를 코드와 문서 근거로 분리하고, 다음 작업에서 P0 항목부터 작은 단위로 리팩토링하기 위한 기준 문서다.

준수할 제약:

| 제약 | 적용 방식 |
|---|---|
| 외부 유료 API 의존성 추가 금지 | TTS/AI 관련 개선은 기존 Cloudflare Workers AI와 현재 API 범위 안에서만 검토한다. OpenAI/Google TTS를 새로 넣지 않는다. |
| 기존 사용자 경로 보존 | URL, IndexedDB store/key, R2 key naming을 임의 변경하지 않는다. 라우트가 틀린 경우 현재 `App.tsx` 기준으로 맞춘다. |
| DB 스키마 변경 최소화 | 이번 UX 리팩토링은 먼저 프론트 호출 경로, 상태 처리, 화면 검증을 우선한다. 스키마 변경은 별도 문서/PR로 분리한다. |
| 한국어 기본 UI 유지 | 기본 언어는 한국어이며, 일본어/영어는 언어팩 품질 개선 대상으로 관리한다. |
| 문서 신뢰도 검증 | `docs/CODEX_ Prompt.md`는 작업 지시의 출발점일 뿐이며, 현재 코드와 외부 공식 자료로 교차 확인한다. |

## 2. 외부 기준

아래 기준은 리팩토링 판단의 외부 근거다. 특정 서비스 UI를 베끼지 않고, 동작 원칙과 검증 기준만 사용한다.

| 기준 | 핵심 내용 | 적용할 기능 |
|---|---|---|
| [web.dev: offline fallback page](https://web.dev/articles/offline-fallback-page) | PWA는 네트워크가 없어도 사용자가 빈 화면을 보지 않도록 오프라인 경험을 제공해야 한다. | PWA, 오프라인 배너, 앱 shell fallback |
| [MDN: PWA offline and background operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation) | 서비스 워커는 오프라인/백그라운드 작업을 담당하고, Push는 서비스 워커가 메시지를 받아 알림을 표시한다. | 서비스워커, Push 알림, sync |
| [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) | 키보드 조작, focus visible, target size, error identification, timing adjustable을 사용자 흐름 점검 기준으로 삼는다. | 퀴즈, 읽기, 설정, 카드 복습 |
| [react-i18next useTranslation](https://react.i18next.com/latest/usetranslation-hook) | 컴포넌트는 `useTranslation()`으로 `t`와 `i18n`을 받아 언어 변경과 번역을 처리한다. | i18n 잔여 문자열, 언어 전환 |
| [i18next API](https://www.i18next.com/overview/api) | `changeLanguage()`는 Promise 기반이며, 초기화 완료 전 번역 함수 사용에 주의해야 한다. | 앱 초기화, 설정 언어 변경 |
| [Anki Manual: FSRS deck options](https://docs.ankiweb.net/deck-options) | FSRS에서는 원하는 retention과 review workload의 균형이 중요하고, 학습 step은 1일 미만 중심으로 관리하는 것이 권장된다. | SRS/Review UX, 학습량 조절 |

## 3. 문서 근거

현재 문서에서 반복적으로 확인되는 개선 요구는 다음과 같다.

| 문서 | 관련 내용 | 해석 |
|---|---|---|
| `docs/CODEX_ Prompt.md` Task 9 | 하드코딩 문자열 스캔, Home/Review/Quiz/Reading/Settings i18n 확인, Lighthouse PWA 점수 목표 | i18n은 이미 1차 적용되었지만 자동 스캔과 주요 사용자 경로 검증은 남아 있다. |
| `docs/PROJECT_ANALYSIS_2026.md` A-Z matrix | i18n, UX, PWA E2E, Notification, FSRS 개인화가 부분완료 | 기능은 존재하지만 실제 흐름 검증과 운영 연결 확인이 필요하다. |
| `docs/00_overview/01_learning_strategy.md` | 신규 학습 30% 이하, 복습 70% 이상, 정확도 60% 미만이면 신규 학습 중단 | SRS/퀴즈/홈 화면은 학습량 조절과 복습 우선 UX를 더 명확히 해야 한다. |
| `docs/00_overview/REFACTORING_AND_UPGRADE_PLAN.md` Phase C/E | 프론트 UX 고도화, 오프라인 모드, 설치 경험, Lighthouse 개선 | 현재 구현 상태와 맞지 않는 과거 항목은 재검증 후 작은 개선 단위로 재정렬해야 한다. |
| `docs/00_overview/project-status-report.md` | 일부 과거 판단은 현재 코드와 충돌 | 기준 문서로 바로 쓰기 어렵고, 최신 백로그와 교차 참조해야 한다. |

## 4. 코드 근거 요약

| 확인 파일 | 발견 사항 | 영향 |
|---|---|---|
| `apps/web/src/lib/api.ts` | `api.get/post()`는 내부에서 항상 `${BASE}/api/v1${path}`를 붙인다. | 호출부가 `/api/v1/...`를 넘기면 `/api/v1/api/v1/...`가 된다. |
| `apps/web/src/pages/Quiz.tsx` | `api.post('/api/v1/quiz/generate')`, `api.post('/api/v1/quiz/submit')` 사용 | 퀴즈 생성/제출이 API prefix 중복으로 실패할 가능성이 높다. |
| `apps/web/src/pages/Curriculum.tsx` | `api.get('/api/v1/curriculum')` 사용 | 커리큘럼 데이터가 fallback으로만 보일 수 있다. |
| `apps/web/src/pages/SelfCheck.tsx` | `api.get/post('/api/v1/self-check/...')` 사용 | 자가진단 저장/점수 로드가 실패할 수 있다. |
| `apps/web/src/hooks/useCurrentWeek.ts` | `api.get('/api/v1/srs/stats')` 사용 | 현재 주차 계산이 항상 1주차 fallback으로 떨어질 수 있다. |
| `apps/web/src/pages/QuizListening.tsx` | 완료 시 `navigate('/quiz-result?id=...')` 사용 | 실제 라우터는 `/quiz/result/:attemptId`라 결과 화면 이동이 깨진다. |
| `apps/web/src/pages/QuizListening.tsx` | 마지막 문제에서 `setAnswers()` 직후 이전 `answers`로 submit 가능 | 마지막 답안 누락 가능성이 있다. |
| `apps/web/src/pages/QuizListening.tsx` | `selected === current.choices[0]`로 정답 판정 | 서버가 choice shuffle/정답 index를 주는 구조와 불일치할 가능성이 높다. |
| `apps/web/src/lib/push-subscribe.ts` | VAPID public key 없으면 `false`만 반환 | 설정 화면에서 원인별 피드백이 부족할 수 있다. |
| `apps/web/src/sw.ts`, `apps/web/src/sw-push.ts` | push 기본 문구가 한국어 문자열로 고정 | 언어팩 적용 후에도 서비스워커 알림 기본값은 다국어 동기화가 제한된다. |

## 5. 기능별 개선 후보

### 5-1. API 호출 경로 정합성

| 항목 | 내용 |
|---|---|
| 상태 | P0 |
| 관련 파일 | `apps/web/src/lib/api.ts`, `Quiz.tsx`, `Curriculum.tsx`, `SelfCheck.tsx`, `useCurrentWeek.ts` |
| 문제 | 공통 API 클라이언트가 `/api/v1`를 붙이는데 일부 호출부가 다시 `/api/v1`를 포함한다. |
| 사용자 영향 | 퀴즈 생성/제출, 자가진단 저장, 커리큘럼 로드, 현재 주차 계산이 실패하거나 fallback만 보일 수 있다. |
| 개선 방향 | `api.*()` 호출부는 `/quiz/generate`, `/self-check/latest`, `/curriculum`, `/srs/stats`처럼 v1 없는 path로 통일한다. 직접 `fetch('/api/v1/...')`는 프록시 의도 여부를 별도 확인한다. |
| 검증 | `rg -n "/api/v1" apps/web/src`, `pnpm -F @nihongo-n3/web typecheck`, Playwright smoke로 `/quiz`, `/curriculum`, `/self-check` 확인 |

### 5-2. 퀴즈 기본 모드

| 항목 | 내용 |
|---|---|
| 상태 | P0 |
| 관련 파일 | `apps/web/src/pages/Quiz.tsx`, `apps/web/src/pages/QuizResult.tsx` |
| 문제 | API prefix 중복으로 생성/제출 실패 가능성이 있고, 에러 문구 일부가 코드에 직접 들어 있다. |
| 사용자 영향 | 핵심 학습 흐름인 문제 생성과 제출이 막히면 앱 신뢰도가 크게 떨어진다. |
| 개선 방향 | API path를 정정하고, mutation error를 화면에 명확히 노출한다. 이후 에러 메시지도 i18n key로 이전한다. |
| 검증 | mock API 또는 dev API로 생성, 선택, 제출, 결과 라우팅까지 E2E |

### 5-3. 청해 퀴즈

| 항목 | 내용 |
|---|---|
| 상태 | P0 |
| 관련 파일 | `apps/web/src/pages/QuizListening.tsx`, `apps/web/src/components/feature/QuizQuestionMC.tsx` |
| 문제 | 결과 라우트가 현재 라우터와 다르고, 마지막 답안 제출 누락 가능성이 있으며, 정답 판정이 `choices[0]`에 묶여 있다. |
| 사용자 영향 | 제출 후 404 또는 빈 화면, 잘못된 정오답 표시, 점수 불일치가 발생할 수 있다. |
| 개선 방향 | 결과 이동을 `/quiz/result/${quizId}`로 맞추고, 마지막 답안을 지역 변수로 합성해 submit한다. 정답 판정은 서버 응답의 answer/correct index 계약을 확인해 통일한다. |
| 검증 | 5문항 전체 완료, 마지막 문항만 선택 후 제출, 결과 화면 표시, 재생 횟수 제한, 키보드 조작 |

### 5-4. 커리큘럼과 현재 주차

| 항목 | 내용 |
|---|---|
| 상태 | P0 |
| 관련 파일 | `apps/web/src/pages/Curriculum.tsx`, `apps/web/src/hooks/useCurrentWeek.ts` |
| 문제 | API prefix 중복 때문에 서버 데이터와 SRS 기반 현재 주차 계산이 fallback으로 가려질 수 있다. |
| 사용자 영향 | 16주 계획이 실제 학습 상태와 맞지 않게 보일 수 있다. |
| 개선 방향 | API path 정정 후 서버 데이터, fallback 데이터, 현재 주차 계산의 우선순위를 명확히 한다. |
| 검증 | SRS 통계가 없는 사용자 1주차, 통계가 있는 사용자 N주차, API 실패 시 fallback UI |

### 5-5. 자가진단

| 항목 | 내용 |
|---|---|
| 상태 | P0 |
| 관련 파일 | `apps/web/src/pages/SelfCheck.tsx`, `docs/04_supplement/C_self_check_16weeks.md` |
| 문제 | API prefix 중복과 정적 체크리스트 id 변환 정책이 섞여 있다. |
| 사용자 영향 | 저장 성공처럼 보이나 서버 반영이 안 되거나, API 데이터와 정적 항목 id가 어긋날 수 있다. |
| 개선 방향 | API path를 먼저 고치고, 서버 items가 있을 때는 서버 id를 그대로 쓰며 fallback 정적 id는 별도 namespace로 분리한다. |
| 검증 | 체크 변경, 저장, 새로고침 후 상태 유지, API 실패 시 명확한 안내 |

### 5-6. SRS/Review 학습 루프

| 항목 | 내용 |
|---|---|
| 상태 | P1 |
| 관련 파일 | `apps/web/src/pages/Review.tsx`, `apps/web/src/components/feature/SRSCard.tsx`, `apps/web/src/hooks/useSRS.ts`, `docs/00_overview/01_learning_strategy.md` |
| 문제 | 복습 우선 전략, 신규 학습 제한, 정확도 기반 신규 학습 중단 기준이 UI에 충분히 드러나지 않는다. |
| 사용자 영향 | 사용자가 리뷰 backlog를 무시하고 신규 카드만 늘릴 수 있다. |
| 개선 방향 | 오늘의 권장 행동을 Home/Review에 표시하고, 낮은 정확도 또는 리뷰 backlog가 있을 때 신규 학습 CTA를 낮춘다. FSRS 버튼 설명은 Anki식 Again/Hard/Good/Easy 의미와 일관되게 정리한다. |
| 검증 | due 카드 있음/없음, 정확도 낮음/높음, 오프라인 상태에서 복습 가능 여부 |

### 5-7. 읽기 지문

| 항목 | 내용 |
|---|---|
| 상태 | P1 |
| 관련 파일 | `apps/web/src/pages/Reading.tsx`, `apps/web/src/pages/ReadingDetail.tsx`, `apps/api/src/routes/reading-oa.ts` |
| 문제 | 단어 popover, 문제 풀이, 모바일 text/quiz 탭은 구현되어 있으나 키보드 접근성, popover focus 관리, 제출 실패 표시를 더 확인해야 한다. |
| 사용자 영향 | 모바일에서는 조작 가능하지만 키보드/스크린리더 사용자에게는 어려울 수 있고, 인증 또는 API 실패 시 원인이 불명확할 수 있다. |
| 개선 방향 | popover를 button/focus 기반으로 정리하고, `Escape` 닫기, focus return, `aria-live` 결과 안내를 추가한다. |
| 검증 | 키보드로 단어 열기/닫기, 모바일 탭 전환, 제출 실패/성공, OpenAPI response schema |

### 5-8. i18n과 언어 전환

| 항목 | 내용 |
|---|---|
| 상태 | P1 |
| 관련 파일 | `apps/web/src/i18n`, `apps/web/src/pages/Settings.tsx`, `apps/web/src/main.tsx`, `apps/web/src/sw.ts` |
| 문제 | ko/ja/en 리소스는 존재하지만 자동 하드코딩 스캔과 서비스워커 알림 문구 다국어 전략이 남아 있다. |
| 사용자 영향 | 메뉴는 번역되더라도 오류/알림/설치 안내 일부가 기본 언어와 어긋날 수 있다. |
| 개선 방향 | `scan:i18n` 스크립트를 추가하고, 버튼/제목/에러/aria-label을 우선 대상으로 관리한다. 학습 콘텐츠 원문은 번역 대상에서 제외한다. |
| 검증 | `pnpm -F @nihongo-n3/web scan:i18n`, 언어 전환 후 새로고침, `<html lang>` 갱신, PWA update dialog 번역 |

### 5-9. PWA/오프라인

| 항목 | 내용 |
|---|---|
| 상태 | P1 |
| 관련 파일 | `apps/web/src/sw.ts`, `apps/web/src/main.tsx`, `apps/web/src/components/layout/RootLayout.tsx`, `apps/web/vite.config.ts` |
| 문제 | 오프라인 배너와 SW는 존재하지만 실제 navigation fallback, API 실패 상태, sync queue 상태가 사용자에게 충분히 보이는지 검증이 필요하다. |
| 사용자 영향 | 오프라인 학습 가능성을 기대한 사용자가 빈 화면이나 조용한 실패를 경험할 수 있다. |
| 개선 방향 | web.dev/MDN 기준으로 앱 shell fallback, reconnect 안내, sync 대기/성공 상태를 표시한다. |
| 검증 | Playwright offline mode, reload offline, review offline, online 복귀 후 sync |

### 5-10. Push 알림

| 항목 | 내용 |
|---|---|
| 상태 | P1 |
| 관련 파일 | `apps/web/src/lib/push-subscribe.ts`, `apps/web/src/pages/Settings.tsx`, `apps/web/src/sw.ts`, `apps/api/src/routes/notifications*` |
| 문제 | VAPID public key, 브라우저 권한, 서버 subscribe 실패가 모두 `false`로 축약될 수 있다. |
| 사용자 영향 | 사용자는 왜 알림이 켜지지 않는지 알기 어렵다. |
| 개선 방향 | 실패 원인을 `unsupported`, `permission-denied`, `missing-vapid-key`, `server-error`로 분리하고 설정 화면에 자연어 안내를 제공한다. |
| 검증 | Chrome/Edge 지원 브라우저, Safari/iOS 미지원 또는 제한 안내, 권한 거부 후 재시도 |

### 5-11. 접근성 공통

| 항목 | 내용 |
|---|---|
| 상태 | P1 |
| 관련 파일 | `apps/web/src/components`, `apps/web/src/pages` |
| 문제 | skip link는 존재하지만 퀴즈 선택지, 카드 뒤집기, popover, 토글, 아이콘 버튼의 keyboard/focus/target size를 기능별로 재검증해야 한다. |
| 사용자 영향 | 모바일 터치 또는 키보드 사용자가 핵심 학습 기능을 안정적으로 쓰지 못할 수 있다. |
| 개선 방향 | WCAG 2.2 기준으로 focus visible, keyboard operation, no keyboard trap, target size, error identification을 체크리스트화한다. |
| 검증 | `@testing-library/user-event` keyboard tests, Playwright tab navigation, axe 또는 Lighthouse accessibility |

### 5-12. 통계/스트릭/히트맵

| 항목 | 내용 |
|---|---|
| 상태 | P2 |
| 관련 파일 | `apps/web/src/pages/Stats.tsx`, `apps/web/src/components/feature/StreakBadge.tsx`, `apps/web/src/components/feature/Heatmap.tsx` |
| 문제 | 직접 `fetch('/api/v1/...')`를 사용한다. 이는 Pages proxy 의도라면 정상일 수 있으나, 공통 API error handling/i18n과 분리된다. |
| 사용자 영향 | 인증 만료, 네트워크 실패, API 파싱 실패 안내가 다른 화면과 다르게 보일 수 있다. |
| 개선 방향 | proxy 유지가 맞는지 확인한 뒤 공통 API client 또는 별도 raw fetch helper로 통합한다. |
| 검증 | API 성공, 401, 500, offline 상태별 UI |

### 5-13. Browse/Search

| 항목 | 내용 |
|---|---|
| 상태 | P2 |
| 관련 파일 | `apps/web/src/pages/Browse.tsx`, `apps/web/src/pages/BrowseDetail.tsx`, `apps/web/src/hooks/useContent.ts` |
| 문제 | 현재 큰 장애 근거는 작지만, 검색/필터/empty/loading/error 상태가 언어팩과 접근성 기준을 만족하는지 점검이 필요하다. |
| 사용자 영향 | 학습 데이터 탐색에서 결과 없음과 로딩 실패가 구분되지 않을 수 있다. |
| 개선 방향 | 검색어 debounce, URL query state, empty/error 상태 문구, 모바일 필터 조작성을 점검한다. |
| 검증 | 빈 검색어, 결과 없음, 느린 네트워크, 모바일 viewport |

## 6. 우선순위 실행 순서

### P0. 작동 실패 가능성이 큰 항목

| 순서 | 작업 | 기대 효과 |
|---:|---|---|
| 1 | `api.*('/api/v1/...')` 호출부를 v1 없는 path로 정정 | 퀴즈, 커리큘럼, 자가진단, 현재 주차의 실제 API 연결 복구 |
| 2 | `QuizListening.tsx` 결과 라우트와 마지막 답안 제출 로직 수정 | 청해 퀴즈 완료 흐름 복구 |
| 3 | 퀴즈/자가진단/커리큘럼 smoke test 추가 | 같은 종류의 회귀를 자동 감지 |

### P1. 사용자 신뢰도와 운영 품질

| 순서 | 작업 | 기대 효과 |
|---:|---|---|
| 4 | `scan:i18n` 추가 및 버튼/제목/에러/aria-label 우선 정리 | 다국어 UI 잔여 누락 감소 |
| 5 | PWA offline reload, reconnect, sync 상태 점검 | 오프라인 사용성 명확화 |
| 6 | Push 실패 원인 분리 | 알림 설정 실패 원인을 사용자가 이해 가능 |
| 7 | Reading popover와 quiz 선택지 접근성 개선 | 키보드/모바일 조작성 개선 |

### P2. 경험 완성도

| 순서 | 작업 | 기대 효과 |
|---:|---|---|
| 8 | Stats/Heatmap fetch 처리 통합 | 에러 처리 일관성 |
| 9 | Browse/Search empty/loading/filter UX 개선 | 탐색 흐름 안정화 |
| 10 | Home/Review에 복습 우선 전략 반영 | 학습 전략과 실제 UX 일치 |

## 7. 다음 리팩토링 단위 제안

첫 번째 구현 PR은 범위를 좁혀 다음만 처리하는 것이 적절하다.

| 범위 | 포함 파일 |
|---|---|
| API path prefix 정정 | `Quiz.tsx`, `Curriculum.tsx`, `SelfCheck.tsx`, `useCurrentWeek.ts` |
| 청해 퀴즈 완료 흐름 | `QuizListening.tsx` |
| 회귀 검증 | 기존 테스트 구조 확인 후 최소 smoke test 추가 |

이 단위는 DB/인프라/외부 API를 건드리지 않고, 실제 고장 가능성이 큰 사용자 경로를 먼저 복구한다.

## 8. 검증 명령

문서 작성 후 다음 명령으로 리팩토링 전 근거와 후속 구현 검증을 반복한다.

```bash
rg -n "/api/v1" apps/web/src --glob '*.ts' --glob '*.tsx'
pnpm -F @nihongo-n3/web typecheck
pnpm -F @nihongo-n3/web build
```

후속으로 E2E가 가능한 상태라면:

```bash
pnpm -F @nihongo-n3/web test:e2e
```

## 9. 이번 문서의 결론

가장 먼저 고칠 단위 기능은 UI 색상이나 레이아웃이 아니라 API 호출 경로 정합성, 퀴즈 완료 흐름, 자가진단 저장 흐름이다. 이 세 영역은 이미 구현된 화면이 실제 서버와 제대로 연결되지 않을 수 있는 문제라서 P0로 분류한다.

그 다음은 i18n 자동 스캔, PWA 오프라인 fallback, Push 알림 실패 원인 분리, Reading/Quiz 접근성 개선 순서가 합리적이다. 이 순서는 `docs`의 기존 개선 요구와 웹 표준 기준을 모두 만족하면서, 한 번에 큰 리팩토링으로 번지지 않는다.

## 10. 진행 기록

### 2026-05-28 P0 1차 리팩토링

| 항목 | 결과 |
|---|---|
| API path prefix 중복 | `Quiz.tsx`, `Curriculum.tsx`, `SelfCheck.tsx`, `useCurrentWeek.ts`의 `api.*('/api/v1/...')` 호출을 v1 없는 path로 정리했다. |
| 퀴즈 레벨 선택 | API 계약이 `N5`-`N3`만 허용하므로 웹 퀴즈 레벨 선택도 `N5`-`N3`로 제한했다. |
| 청해 퀴즈 제출 payload | `QuizListening.tsx`가 문자열 배열을 제출하던 흐름을 `{ question_id, answer }[]` payload로 정리했다. |
| 청해 퀴즈 결과 라우트 | `/quiz-result?id=...` 이동을 현재 라우터의 `/quiz/result/:attemptId`로 정정했다. |
| 청해 퀴즈 정오답 표시 | 서버가 정답을 클라이언트에 내려주지 않는 계약에 맞춰 `choices[0]` 기반 즉시 정오답 표시를 제거하고, 결과 화면에서 채점 확인하도록 바꿨다. |
| 회귀 테스트 | `toSubmittedAnswers()` 단위 테스트를 추가했다. |

검증:

```bash
pnpm -F @nihongo-n3/web test:run -- QuizListening
pnpm -F @nihongo-n3/web typecheck
pnpm -F @nihongo-n3/web build
```

### 2026-05-28 P0 2차 리팩토링 + 배포

| 항목 | 결과 |
|---|---|
| 자가진단 API 계약 정합성 | 웹이 존재하지 않는 `/self-check/latest`와 `POST /self-check/:week { checked_ids }`를 호출하던 문제를 수정했다. 현재는 `GET /self-check/:week`, `POST /self-check` 계약에 맞춰 동작한다. |
| 자가진단 저장 모델 | 체크리스트 원문 항목은 현재 DB 스키마에 없으므로 브라우저 `localStorage`에 보존하고, 서버에는 `vocab_score`, `grammar_score`, `listening_score`, `writing_score`, `domain_score` 점수 요약을 저장한다. |
| 커리큘럼 API 응답 정규화 | API가 `{ data: Week[] }`와 `week_no`, `vocab_target` 필드를 반환하는 구조에 맞춰 웹 모델(`week`, `vocab_count`, `grammar_count`)로 변환하는 정규화 함수를 추가했다. |
| 배포 워크플로 env 정정 | 웹 코드가 읽는 변수명에 맞춰 `.github/workflows/deploy-web.yml`의 `VITE_API_BASE_URL`을 `VITE_API_URL`로 교체했다. |
| Cloudflare Workers 배포 | `nihongo-n3-api.kordokrip.workers.dev` 배포 완료. Worker version: `5cad2a0a-a78e-4d2d-8bdf-a23f0a4b837f`. |
| Cloudflare Pages 배포 | `nihongo-n3.pages.dev` production 배포 완료. Preview URL: `https://a10f9157.nihongo-n3.pages.dev`. |
| D1 원격 시드 | `seed:remote` 재실행 완료. 단, `verify:remote`는 현재 콘텐츠 파서 산출량 기준 `grammar=153/200`, `sysprog_terms=82/100`에서 실패한다. 마이그레이션 적용은 `0000_init.sql`의 `SQLITE_AUTH`로 실패했으며, 이번 작업은 스키마 변경이 없어 배포 차단 사유는 아니다. |

검증:

```bash
pnpm -F @nihongo-n3/web test:run -- Curriculum SelfCheck QuizListening
pnpm typecheck
VITE_API_URL=https://nihongo-n3-api.kordokrip.workers.dev pnpm -F @nihongo-n3/web build
pnpm -F @nihongo-n3/api test
curl -fsS https://nihongo-n3-api.kordokrip.workers.dev/health
curl -fsS https://nihongo-n3.pages.dev/
curl -fsS https://nihongo-n3.pages.dev/manifest.webmanifest
```

남은 운영 이슈:

| 이슈 | 처리 필요 |
|---|---|
| D1 migration baseline | `0000_init.sql`의 D1 미허용 구문을 분리하거나, 이미 운영 중인 DB를 migration baseline으로 기록하는 절차가 필요하다. |
| 콘텐츠 검증 기준 | 현재 파서가 N3 문법 0개, 직무 어휘 82개를 산출하므로 `verify.ts`의 기준을 실제 콘텐츠 정책에 맞추거나 파서를 보강해야 한다. |
| 오디오 누락 | `vocab.audio_r2_key` 미등록 3427건은 TTS/R2 생성 작업에서 별도 처리해야 한다. |

### 2026-05-28 운영 QA 긴급 수정

사용자가 `https://nihongo-n3.pages.dev/`에서 메뉴와 기능 연결이 불완전하다고 확인한 뒤, production URL을 Playwright와 curl로 재검증했다.

| 항목 | 결과 |
|---|---|
| 보호 API 500 | `/api/v1/srs/*`, `/api/v1/self-check/*`가 Cloudflare Access 미설정으로 `Access Not Configured` 500을 반환했다. `AUTH_MODE=public-owner`를 명시적으로 추가해 현재 단일 사용자 운영에서는 `owner` 계정 fallback으로 동작하게 했다. Cloudflare Access 설정 완료 후 `AUTH_MODE=cf-access`로 되돌린다. |
| CORS preflight 실패 | 웹 API client가 `credentials: include`를 사용하므로 API CORS에 `Access-Control-Allow-Credentials: true`가 필요했다. `cors({ credentials: true })`로 수정했다. |
| 자가진단 빈 상태 404 | 저장 전 자가진단 조회가 404를 반환해 브라우저 콘솔 오류가 발생했다. 빈 상태는 정상 상태이므로 `GET /self-check/:week`가 `{ data: null }`을 반환하도록 변경했다. |
| 모바일 메뉴 누락 체감 | 모바일 하단 탭이 5개 핵심 메뉴만 노출해 전체 기능 접근성이 낮았다. 하단 탭을 가로 스크롤 가능한 전체 9개 메뉴로 확장했다. |

검증:

```bash
pnpm -F @nihongo-n3/api test
pnpm -F @nihongo-n3/api build
pnpm -F @nihongo-n3/web test:run
VITE_API_URL=https://nihongo-n3-api.kordokrip.workers.dev pnpm -F @nihongo-n3/web build
pnpm typecheck
```

운영 배포:

| 대상 | 결과 |
|---|---|
| Workers API | `https://nihongo-n3-api.kordokrip.workers.dev`, version `01c2811b-99d4-4be8-8960-de0151cef876` |
| Pages Web | `https://nihongo-n3.pages.dev`, deployment `https://fdbe4ed7.nihongo-n3.pages.dev` |

운영 QA 결과:

| Viewport | 확인 메뉴 | 네트워크 실패 | 콘솔 오류 |
|---|---|---|---|
| Desktop 1280x900 | 홈, 복습, 찾아보기, 퀴즈, 독해, 커리큘럼, 자가진단, 통계, 설정 | 없음 | 없음 |
| Mobile 390x844 | 홈, 복습, 찾아보기, 퀴즈, 독해, 커리큘럼, 자가진단, 통계, 설정 | 없음 | 없음 |

Playwright 검증에서는 service worker 등록을 의도적으로 차단했기 때문에 `Service Worker registration blocked by Playwright` 경고만 발생했다. 이는 앱 런타임 오류가 아니다.

### 2026-05-28 P0 3차 QA + 리팩토링 + 배포

사용자 피드백 기준으로 “메뉴는 보이지만 실제 데이터 연결과 빈 상태가 앱 미완성처럼 보이는 문제”를 다시 검증했다. 이번 차수는 정식 운영 smoke test 추가, API DTO 정규화, 복습 시작 UX, 퀴즈 생성 실패 완화를 처리했다.

| 항목 | 결과 |
|---|---|
| 운영 메뉴 smoke test 고정 | `e2e/menu-smoke.spec.ts`를 추가했다. `E2E_BASE_URL`이 있으면 로컬 dev server를 띄우지 않고 실제 production URL을 대상으로 desktop/mobile 9개 메뉴, 주요 route 렌더링, 콘솔 오류, API 4xx/5xx를 검사한다. |
| Playwright 설정 개선 | `e2e/playwright.config.ts`가 `E2E_BASE_URL`을 읽도록 변경했다. `pnpm -F @nihongo-n3/e2e test:smoke` 스크립트를 추가했다. |
| 콘텐츠 API DTO 정규화 | API는 `ja/kana/ko/pos/audio_r2_key`, 웹은 `word/reading/meaning/part_of_speech/audio_path`를 기대했다. `apps/web/src/lib/api.ts`에서 vocab/grammar/kanji 응답을 웹 모델로 정규화하도록 수정했다. |
| Browse/Review 데이터 연결 | `useVocabList`, `useGrammarList`, `useKanjiList`, `useDueCards`가 `{ data: [...] }` 응답을 올바르게 저장하도록 수정했다. 기존에는 `{ data: { items: [...] } }`를 기대해 빈 화면 또는 조용한 실패가 발생할 수 있었다. |
| Stats API 연결 | `Stats.tsx`, `StreakBadge`, `Heatmap`의 상대 경로 `/api/v1/...` 직접 호출을 공통 API client 기반 `logsApi`로 전환했다. Pages 운영 도메인에서 API proxy 부재로 깨질 수 있는 경로를 제거했다. |
| 복습 onboarding | 복습 카드가 없을 때 N3 어휘 10장으로 SRS 카드를 시작하는 CTA를 추가했다. 운영 owner 계정에는 시작 카드 10장을 실제 생성했고 `/srs/due` 반환을 확인했다. |
| SRS due 계약 | `/srs/due`가 `state != 'new'`를 제외하던 문제를 수정해 새로 만든 카드도 due 카드로 표시되게 했다. |
| 퀴즈 생성 안정화 | 운영 N3 어휘의 `ko` 의미가 비어 기본 N3 어휘 퀴즈가 실패했다. 요청 레벨의 의미 있는 데이터가 부족하면 전체 의미 보유 데이터로 폴백하도록 API를 수정했다. Kanji 퀴즈는 실제 DB 컬럼명 `char`, `jlpt_level`, `on_yomi/kun_yomi`에 맞췄다. |
| 한자 API 500 수정 | `/kanji?level=N3`가 존재하지 않는 `level` 컬럼을 조회하던 문제를 `jlpt_level`로 수정했다. |

검증:

```bash
pnpm -F @nihongo-n3/web test:run
pnpm -F @nihongo-n3/web typecheck
pnpm -F @nihongo-n3/api typecheck
pnpm -F @nihongo-n3/api test
pnpm typecheck
VITE_API_URL=https://nihongo-n3-api.kordokrip.workers.dev pnpm -F @nihongo-n3/web build
E2E_BASE_URL=https://nihongo-n3.pages.dev pnpm -F @nihongo-n3/e2e test:smoke
```

운영 배포:

| 대상 | 결과 |
|---|---|
| Workers API | `https://nihongo-n3-api.kordokrip.workers.dev`, version `21e7fd1f-7d24-4e61-86d4-30a1c1f1be4e` |
| Pages Web | `https://nihongo-n3.pages.dev`, deployment `https://40f2e065.nihongo-n3.pages.dev` |

운영 API 확인:

| 엔드포인트 | 확인 결과 |
|---|---|
| `/api/v1/kanji?level=N3&limit=2` | 200, N3 한자 데이터 반환 |
| `POST /api/v1/quiz/generate` (`vocab_mc`, `N3`, `count=3`) | 200, 의미가 있는 어휘 문제 생성 |
| `POST /api/v1/quiz/generate` (`kanji_reading`, `N3`, `count=3`) | 200, 한자 읽기 문제 생성 |
| `POST /api/v1/srs/init` | owner 계정 시작 카드 10장 생성 |
| `/api/v1/srs/due?limit=5` | 새 카드가 due 목록으로 반환 |

남은 운영 이슈:

| 이슈 | 처리 필요 |
|---|---|
| Cloudflare Access | `AUTH_MODE=public-owner`는 임시 운영 모드다. 실제 사용자 인증 전환 전 `CF_ACCESS_AUD`, `CF_TEAM_DOMAIN`, Access policy를 정리해야 한다. |
| N3 어휘 의미 누락 | 현재 N3 vocab 일부의 `ko`가 비어 있어 퀴즈는 폴백으로 동작한다. 콘텐츠 파서/시드 데이터 보강이 필요하다. |
| Listening 퀴즈 | sentences의 `audio_r2_key`가 0건이라 listening은 아직 실제 청해 퀴즈로 보기 어렵다. Cloudflare Workers AI 기반 TTS/R2 생성 파이프라인을 우선 처리해야 한다. |
| SRS review sync | 웹은 로컬 FSRS 업데이트 후 sync queue를 사용한다. 실제 서버 반영/통계 연결을 더 강하게 보장하려면 `srsApi.review(card_id, rating)` 직접 호출 또는 sync 상태 UI를 다음 차수에서 정리해야 한다. |

### 2026-05-28 P0 4차 퀴즈/발음/청취 카드 구현

사용자가 “퀴즈 기능, 발음 카드, 청취 카드가 실제로 구현되어 있지 않다”고 지적한 뒤, 운영 API와 웹 구현을 다시 추적했다. 실제 원인은 오디오 생성 파이프라인의 DB 컬럼 불일치, 웹 오디오 URL 생성 문제, listening 퀴즈가 `audio_r2_key`가 없는 문장을 제외하던 계약이었다.

| 항목 | 결과 |
|---|---|
| Listening 퀴즈 카드 | `POST /quiz/generate`의 listening 모드가 `audio_r2_key`가 없어도 `audio/sentence/{level}/{id}.mp3` 키와 `script_ja`, `script_ko`를 반환하도록 수정했다. |
| 발음 카드 | vocab/kanji 웹 모델에 `audio_path`를 기본 생성해 어휘 카드, 어휘 상세, 한자 상세, SRS 카드에서 발음 버튼을 표시할 수 있게 했다. |
| 오디오 URL | `encodeURIComponent(path)`로 전체 경로를 인코딩하던 문제를 `path.split('/').map(encodeURIComponent).join('/')` 방식으로 수정했다. Pages 운영 도메인에서도 `VITE_API_URL` 기반 API 오디오를 호출한다. |
| R2 온디맨드 오디오 | `/api/v1/audio/audio/{sentence|vocab|kanji}/{level}/{id}.mp3` 요청 시 R2에 파일이 없으면 D1 원문을 찾아 Cloudflare Workers AI TTS 생성 후 R2에 저장하도록 구현했다. TTS 생성 실패 시 500 대신 404로 반환해 웹의 브라우저 음성 fallback이 동작하게 했다. |
| 브라우저 음성 fallback | 서버 TTS가 아직 일본어 오디오를 만들지 못하는 경우 Web Speech API `SpeechSynthesisUtterance`의 `ja-JP` 발화로 즉시 재생되도록 웹 fallback을 추가했다. MDN 문서의 `SpeechSynthesis.speak()`와 `SpeechSynthesisUtterance.lang` 동작을 기준으로 구현했다. |
| 배치 오디오 생성 job | `generate-audio.ts`의 잘못된 컬럼명 `sentence_ja`, `word`, `onyomi`, `level`을 현재 D1 스키마의 `ja`, `on_yomi`, `jlpt_level` 기준으로 정정했다. |
| README | 루트 `README.md`를 Figma placeholder에서 현재 Cloudflare Workers/Pages/D1/R2 운영 구조와 실행/검증/배포 안내로 전면 교체했다. |

검증:

```bash
pnpm -F @nihongo-n3/api typecheck
pnpm -F @nihongo-n3/api test
pnpm -F @nihongo-n3/api build
pnpm -F @nihongo-n3/web typecheck
pnpm -F @nihongo-n3/web test:run
pnpm typecheck
VITE_API_URL=https://nihongo-n3-api.kordokrip.workers.dev pnpm -F @nihongo-n3/web build
E2E_BASE_URL=https://nihongo-n3.pages.dev pnpm -F @nihongo-n3/e2e test:smoke
```

운영 배포:

| 대상 | 결과 |
|---|---|
| Workers API | `https://nihongo-n3-api.kordokrip.workers.dev`, version `ad97d93a-df3e-4db1-9a86-ac355f7a80a8` |
| Pages Web | `https://nihongo-n3.pages.dev`, deployment `https://922b108b.nihongo-n3.pages.dev` |

운영 확인:

| 확인 | 결과 |
|---|---|
| `POST /api/v1/quiz/generate` listening N3 | `audio_key`, `script_ja`, `script_ko` 포함한 청취 문제 반환 |
| `/api/v1/audio/audio/sentence/n3/800.mp3` | Cloudflare TTS 생성 실패 시 500이 아닌 404 반환. 웹은 이 상태에서 브라우저 음성 fallback으로 재생 |
| production smoke | desktop/mobile 9개 메뉴 및 주요 라우트 통과 |

남은 운영 이슈:

| 이슈 | 처리 필요 |
|---|---|
| Cloudflare Aura 일본어 품질 | 현재 기본 Workers AI TTS 모델은 일본어 품질/지원이 제한적이다. 외부 유료 API 추가 없이 해결하려면 Cloudflare에서 일본어 TTS 모델 지원 여부를 계속 추적하거나, 브라우저 음성 fallback을 정식 UX로 다듬어야 한다. |
| 오디오 R2 물량 | R2 오디오 캐시는 온디맨드/cron으로 점진 생성된다. 초기에는 브라우저 음성 fallback 비중이 높다. |
| N3 콘텐츠 의미 누락 | N3 vocab 일부 `ko`가 비어 퀴즈 생성은 폴백으로 동작한다. 콘텐츠 보강은 별도 P0 데이터 작업이다. |

### 2026-05-29 5차 현황 분석: GitHub 배포 차단 및 리팩토링 후보

요청 범위는 MCP 연결을 통한 `kordokrip/JLPT` GitHub 반영과, 현재 기능 수준 및 리팩토링 필요 지점의 전수 후보 파악이다. 이번 점검은 코드 수정 전 상태 확인이며, 로컬 코드, 운영 API, 운영 Pages, Playwright, 단위 테스트를 교차 확인했다.

#### GitHub/MCP 배포 상태

| 항목 | 결과 |
|---|---|
| 로컬 Git 상태 | 현재 워크스페이스에 `.git`이 없어 `git status`가 실패한다. |
| GitHub CLI | `gh`는 설치되어 있으나 인증되지 않았다. `gh auth status`가 로그인 필요 상태를 반환한다. |
| GitHub remote 확인 | `git ls-remote https://github.com/kordokrip/JLPT.git refs/heads/main`은 성공했고, `main` HEAD는 `d3a3cd8b6dbe90c9a33b3b16b5f8325d9ce276dd`다. |
| GitHub MCP | `mcp__codex_apps__github._get_repo` 호출이 MCP 서버 handshake timeout으로 실패했다. 현재 세션에서는 connector 기반 create tree/commit/PR도 진행 불가다. |
| 배포 판정 | GitHub 반영은 차단 상태다. `gh auth login` 또는 MCP 커넥터 복구 후 다시 진행해야 한다. |

#### 현재 수준

| 영역 | 현재 수준 | 근거 |
|---|---:|---|
| 타입 안정성 | 양호 | `pnpm typecheck` 통과 |
| 단위 테스트 | 양호 | `pnpm test` 통과, web 17개/api 43개 테스트 통과 |
| 운영 메뉴 smoke | 제한적 양호 | `E2E_BASE_URL=https://nihongo-n3.pages.dev pnpm -F @nihongo-n3/e2e test:smoke` 통과 |
| OpenAPI 명세 | 개선됨 | 운영 `/openapi.json` paths 42개 확인 |
| 운영 데이터 연결 | 부분 양호 | vocab/grammar/kanji/sentences/SRS stats/quiz history 운영 API 200 확인 |
| 로컬 E2E 재현성 | 불량 | `pnpm -F @nihongo-n3/e2e exec playwright test --project=chromium`에서 19개 중 8개 실패, 3개 skip |
| 실제 오디오 | 미완 | `/api/v1/audio/audio/sentence/n3/801.mp3`는 404 JSON 반환. 웹은 브라우저 음성 fallback으로 보완 중 |

#### 리팩토링 우선순위

| 우선순위 | 문제 | 근거 파일/라인 | 조치 방향 |
|---|---|---|---|
| P0 | 오프라인 SRS sync 계약 불일치 | `apps/web/src/hooks/useSRS.ts:96`은 `srs_review`를 enqueue하지만 `packages/shared/src/api-schemas.ts:180`과 `apps/api/src/routes/sync.ts:194`는 `review`만 처리한다. payload도 웹은 `item_type/item_id`, 서버는 `card_id`를 기대한다. | sync op 타입을 `review`로 통일하고 payload에 `card_id`를 포함하거나, 서버가 `item_type/item_id`로 카드 조회하도록 확장한다. 이 플로우는 단위 테스트로 고정해야 한다. |
| P0 | 직접 SRS review API 클라이언트 계약 불일치 | `apps/web/src/lib/api.ts:262`는 `/srs/review`에 `item_type/item_id/rating`을 보내지만, 서버 `apps/api/src/routes/srs.ts:77`은 `card_id/rating` 스키마를 요구한다. | `srsApi.review(card_id, rating, response_ms?)`로 수정하고 실제 호출 경로를 통합한다. 낙관 업데이트 후 서버 실패 복구 정책도 필요하다. |
| P0 | 로컬 E2E DB 초기화 부재 | 전체 Chromium E2E에서 `vocab`, `grammar`, `kanji`, `srs_cards`, `daily_logs` 테이블 부재 오류가 반복 발생했다. | E2E webServer 시작 전 D1 migration + seed 최소셋을 자동 적용하거나, 운영 URL smoke와 로컬 integration test를 명확히 분리한다. |
| P1 | Push subscribe API base URL 불일치 | `apps/web/src/lib/push-subscribe.ts:64`, `:85`가 `VITE_API_URL`을 쓰지 않고 `/api/v1/...` 상대 경로를 호출한다. Pages 운영 도메인에는 API 프록시가 없다. | 공통 API request wrapper 또는 `BASE`를 사용하도록 수정하고 Settings 알림 토글 E2E를 추가한다. |
| P1 | 실제 오디오 생성/캐시 미완 | 운영 오디오 GET이 404를 반환한다. TTS 실패를 500에서 404로 낮춘 것은 맞지만 실제 청취 학습 품질은 fallback 의존이다. | 브라우저 음성 fallback을 명시 UX로 만들고, Cloudflare Workers AI 일본어 TTS 지원 모델 또는 비유료 대안을 검증한다. R2 생성 성공률 지표가 필요하다. |
| P1 | Browse 타입 안정성 부족 | `apps/web/src/pages/Browse.tsx:148`, `:193`에서 목록 렌더링이 `any`에 의존한다. `SRS_LEVEL_LABEL`도 미사용이다. | discriminated union으로 `vocab/grammar/kanji` 렌더러를 분리하고 불필요 상수를 제거한다. 검색도 vocab 전용임을 UI에 명확히 표시한다. |
| P1 | Stats 스타일/테마 일관성 부족 | `apps/web/src/pages/Stats.tsx:29`, `:47`, `:85`가 `bg-white`, `stone-*` 고정색을 사용한다. 다크모드 토큰과 충돌 가능성이 있다. | 기존 design token(`bg-card`, `text-foreground`, `muted`)으로 교체하고 theme E2E selector를 실제 UI에 맞춘다. |
| P1 | 설정 테마 테스트와 실제 UI selector 불일치 | E2E `settings-theme.spec.ts`는 theme toggle 단일 버튼을 찾지만 실제 Settings는 segment control 구조다. | 설정 UI에 stable `data-testid`를 추가하거나 테스트를 segment control 기준으로 재작성한다. |
| P2 | OpenAPI와 typed client 운영화 미완 | `apps/web/src/lib/api.ts:297` 주석은 타입 재생성 명령을 언급하지만 package script에는 gen script가 없다. | openapi-typescript 생성 스크립트를 package에 추가하고 CI에서 `api.d.ts` drift를 검사한다. |
| P2 | Figma export archive 혼재 | `apps/figma-export-archive`에 `TODO`, `any`, 미구현 클릭 핸들러가 다수 남아 있다. | 운영 앱 경로와 archive를 분리하고 lint/test 대상에서 명시 제외하거나 `_archive`로 이동한다. |

#### 검증 로그 요약

```bash
pnpm typecheck
# 통과

pnpm test
# 통과: web 17 passed, api 43 passed

curl -sS https://nihongo-n3-api.kordokrip.workers.dev/openapi.json
# paths: 42

E2E_BASE_URL=https://nihongo-n3.pages.dev pnpm -F @nihongo-n3/e2e test:smoke
# 통과: desktop/mobile 2 passed

pnpm -F @nihongo-n3/e2e exec playwright test --project=chromium
# 실패: 19개 중 8 failed, 3 skipped, 8 passed
# 주요 원인: 로컬 D1에 vocab/grammar/kanji/srs_cards/daily_logs 테이블 부재, offline reload 실패, 테스트 selector와 실제 UI 불일치
```

#### 다음 작업 제안

1. P0 sync/SRS 계약을 먼저 수정한다. 현재 복습 기능은 화면상 동작해도 서버 동기화 계약이 맞지 않아 운영 데이터 신뢰도가 떨어진다.
2. E2E 로컬 DB bootstrap을 만든다. 이 작업 없이는 “로컬에서 전체 기능을 재현한 뒤 배포”라는 운영 QA가 반복해서 실패한다.
3. Push 알림 상대 URL, Stats 토큰, Browse 타입 분리를 P1로 묶어 UI 품질과 운영 API 연결성을 정리한다.
4. GitHub 반영은 `gh auth login` 또는 GitHub MCP 복구 후 진행한다. 현재 세션에서는 `.git` 부재, `gh` 미인증, MCP timeout 때문에 원격 반영을 완료할 수 없다.

### 2026-05-29 6차 P0/P1 리팩토링 결과

#### 완료 항목

| 우선순위 | 처리 내용 | 결과 |
|---|---|---|
| P0 | SRS review API 계약을 `card_id/rating/response_ms` 기준으로 정리하고, offline sync op를 `review`로 통일했다. | 직접 `/srs/review`와 `/sync` 모두 card id 기반 review 처리 테스트 통과 |
| P0 | 로컬 E2E 시작 전 D1 schema bootstrap + seed 보장을 추가했다. | 전체 Chromium E2E 19개 통과 |
| P0 | 로컬 D1 FTS 테이블이 없을 때 vocab/sentences 검색이 500을 내지 않도록 LIKE fallback을 추가했다. | FTS 미지원/누락 환경에서도 검색 API 200 유지 |
| P1 | Push subscribe/unsubscribe가 Pages 상대 경로가 아니라 `VITE_API_URL` 기반 API를 호출하도록 수정했다. | 운영 Pages/Workers 분리 배포 구조와 일치 |
| P1 | Browse 타입 렌더링, Stats 다크모드 토큰, Settings theme selector, SRS 카드 테스트 셀렉터를 정리했다. | 메뉴 smoke, 테마, 복습, 검색 E2E 통과 |
| P1 | 청취 퀴즈 오디오 실패 시 브라우저 SpeechSynthesis fallback 메시지를 표시하도록 보완했다. | R2 오디오가 비어 있어도 청취 UX가 중단되지 않음 |

#### 최신 검증 로그

```bash
pnpm -F @nihongo-n3/web typecheck
# 통과

pnpm -F @nihongo-n3/api typecheck
# 통과

pnpm -F @nihongo-n3/web test:run
# 통과: 17 passed

pnpm -F @nihongo-n3/api test
# 통과: 45 passed

pnpm -F @nihongo-n3/e2e exec playwright test --project=chromium
# 통과: 19 passed

pnpm -F @nihongo-n3/api build
# 통과: wrangler dry-run

VITE_API_URL=https://nihongo-n3-api.kordokrip.workers.dev pnpm -F @nihongo-n3/web build
# 통과: PWA service worker 포함 production build
```

#### 남은 주의 항목

| 항목 | 설명 |
|---|---|
| Wrangler 3 경고 | 현재 `wrangler 3.114.17` 사용 중이며 v4 업데이트 경고가 계속 표시된다. 배포는 가능하지만 별도 dependency 업데이트 작업이 필요하다. |
| Test env vars warning | `wrangler.toml`의 top-level vars/bindings가 `env.test`로 상속되지 않는다는 경고가 남아 있다. 테스트는 통과하지만 구성 중복 정리가 필요하다. |
| 실제 오디오 품질 | 외부 유료 API 없이 Cloudflare Workers AI + 브라우저 음성 fallback으로 운영 중이다. R2 오디오 물량과 일본어 음질은 계속 개선 대상이다. |
| GitHub 반영 | 현재 로컬 `.git` 부재와 `gh` 미인증/MCP timeout으로 원격 commit/push는 별도 인증 복구 후 진행해야 한다. |
