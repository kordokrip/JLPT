# JLPT · TOPIK 코드·DB·API 구조

갱신: 2026-10-13 KST. Production0032·네 메뉴·신규600문항/220레슨 배포 완료. 현재 배포 결과는 [CURRENT_STATE](docs/00_overview/CURRENT_STATE.md), 폴더별 전체 파일은 [자동 지도](docs/00_overview/PROJECT_FILE_CATALOG.md)를 본다.

현행 출판은 `learning-cohort-remote.ts`의 정확 대상 `stage/publish/verify/withdraw`,5개 release 원자적 공개/철회와0032 퀴즈 guard를 사용한다. 기존 Preview-only 도구는 운영 우회 진입점으로 쓰지 않는다. 퀴즈 버전 snapshot·철회 차단, 세션/FSRS 보존, 한국어·일본어 PWA 모달을 검증했다. 운영 proxy는 canonical host 기본 Worker 연결과 immutable API503을 구분한다. 운영 단위718·기존265/정책30제외·Preview44·PWA24·13표 보존·canonical392·smoke7의 증거는 [최종 기록](docs/00_overview/LEARNING_COHORT_RELEASE_2026-10-13.md)을 따른다. 아래 신규 후보 절은10월12일 설계/검증 이력이다.

## 신규 레슨 후보

10월12일 로컬 후보는 기존 `content_learning_links`에 세 nullable JSON seal과 publisher trigger를 추가하고, V7 두 release를 단일 UPDATE exact-match 후에만 공개할 수 있게 한다. 새 테이블은 없고0031은74개를 유지한다. Preview-only CLI와 정식 G0–G4 profile을 구현하고 최종 cohort04 단위614·typecheck/build·fresh/upgrade/reseed·E2E44·actual local공개/철회를 통과했다. 12종 합성 학습 표 hash 불변도 확인했지만 실제 사용자 DB 검증이나 원격 출시는 아니다.

`lib/learning-lessons.ts`와 shared 계약은 공개 카탈로그·정확 급수 typed ref·개념 연결 직접 조회를 담당한다. `0031_learning_lessons.sql`은 레슨2테이블·세션 binding과 불변/철회 쓰기 guard를 추가한다. `studyContentVersionInput`은 시각을 제외한 정렬 JSON으로 환경간 row version을 일치시킨다. quick의 예정 homophone 복습도 우선한다.

Web는4메뉴·LearnHub의 추천/자유 연습/자료·TOPIK 단원 URL·일본어 기초 안내로 통합한다. QuestionsHub는 호출자를 통합한 뒤 제거하고 기존 URL은 query를 보존해 redirect한다. feature flag가 꺼지면 기존 TOPIK progress 화면은 유지한다.

보존된 v1 신규440문항은 두 독립 검수/실DB 연결 실패로 미공개다. `seed/learning-path-draft.ts`는 해당 v1 draft만 계획하며 실제 strict lookup이 실패하면 쓰지 않는다. `ops/learning-path-readiness.ts`는 v1 hash의 두 리뷰·lookup·명백한 반복/번역/정답 노출을 차단한다. 후보 backup은74-table profile이며 운영72개를 대체했다고 보고하지 않는다. [구현/차단 기록](docs/00_overview/CONTENT_LEARNING_UX_UPDATE_PLAN.md)을 따른다.

출판 진입점은 `ops/learning-path-reviewed-release.ts`(exact frozen/review/G0–G4), `learning-path-reviewed-publish.ts`(control/publication/withdraw), `learning-path-preview-target.ts`(전용DB·content-only mirror), `learning-path-preview.ts`(단계·완료drill guard)다. `scripts/run-learning-v7-local-gates.mjs`는 실제 로컬 receipt를 수집하며 중간 preflight를 최종 성공으로 쓰지 않는다. D1 depth100·설치Wrangler splitter 회귀도 유지한다. 별도160 v3의 quality/native draft adapter는 쓰기8/청해8 다국어·대본·speech binding과 release/audit/question version을 연결한다. 음성 코어·운영 OAuth·commit/push·새Preview·Production은 변경하지 않았다.

## Production 기준선

D1 `0000–0032`, Worker `71e71638-aff1-44c5-a242-f1e276052413`, Pages `https://6b8b8a19.nihongo-n3.pages.dev` / ID `6b8b8a19-239c-4289-b570-f0ac5fd3fdd4`다. 앱 source는 `37486f888399f6297b3c95f25e16afcbecc0b5b1`, canonical 콘텐츠 source는 `3485c6ef8addda3cd3e209730646c296175cf3c9` / manifest `content-v3-d102868e3d43b9b3c1a4`다.10월13일 새로 pinned392/392와 별도600문항/220레슨 verifier를 실행했다.16:20:53 KST 점검off·queue원복 완료다.

## 실행 계층

| 계층 | 진입점·역할 |
| --- | --- |
| Web/PWA | `apps/web/src/main.tsx`·`App.tsx`, React route와 ko/ja/en, TanStack Query·Zustand·Dexie |
| 학습 UI | `pages/Today`, `StudySession`, `LearningRecords`, `LearnHub`; `features/study`, `features/learning` |
| API/Worker | `apps/api/src/index.ts`·`app.ts`, Hono/OpenAPI route·인증·track guard·Queue/Workflow/jobs |
| API 계약 | `packages/shared/src/api-schemas.ts`·`learning-experience.ts`; API export와 web 생성 타입 |
| DB | `packages/db/src/schema.ts`, `drizzle-v2/0000–0032` 운영, source parser·seed·fresh verifier |
| 브라우저 | `e2e/playwright.config.ts`, Chromium/WebKit·모바일 실제 D1/API 흐름과 mock 음성 회귀 |
| 로컬 운영 | `scripts/project-ops-status.mjs`·`deploy-worker-with-release.mjs`·문서/음성 검사 |

`*-oa.ts` wrapper가 기존 Hono 구현과 OpenAPI 문서를 연결하는 활성 route도 있다. 이름이 legacy라고 삭제하지 않는다. Worker entrypoint·Service Worker·CLI는 일반 import가 없어도 실행 설정이 직접 사용한다.

## 데이터 모델

| 범위 | 주요 테이블·계약 |
| --- | --- |
| 계정·트랙 | `users`, `auth_sessions`, `track_srs_settings`; 계정×트랙 학습 격리 |
| canonical·문제 | vocab/grammar/kanji/sentences/sysprog, reading passages/questions, `jlpt_practice_questions`, TOPIK placement/practice |
| TOPIK owner | owner unit/item, stable refs, progress, owner FSRS cards/review logs |
| 활동 | `learning_activity_events`(0024), 계정×event ID 중복 방지; 원문/개인정보 저장 없이 메타데이터 집계 |
| 품질·출판 | sources/assets, releases/jobs, G0–G4 evidence, quality audits, requirements/audit links(0026) |
| 음성 | `content_speech_bindings`(0027), provider google-browser/state ready 또는 unavailable. 실제 binary 저장 없음 |
| 학습 경험 | `learning_profiles`, `study_sessions`, `study_steps`, `learning_annotations`, `content_learning_links`(0028) |
| 동기부여 | session mode·`study_reward_events`(0029); 원본 중복 방지·일일100 XP |
| Push | subscription 언어·`push_notification_deliveries`(0030), endpoint×현지 일자×시간대 claim |

기존 legacy 열·`content_audio_bindings`·`quiz_question_bank`는 migration·백업 호환성 때문에 보존한다. 새 출제나 발음 저장에 사용하지 않는다. 제거하려면 별도 additive/upgrade/fresh·restore 검증이 필요하다. 현재0030 backup profile은72개 regular table이며 FTS·transient metadata는 별도 계약으로 처리한다.

## API와 저장 흐름

| API | 서비스·바인딩 |
| --- | --- |
| `/learning/profile` | 계정×트랙 목표·언어·시간대, `expected_track` 충돌 검사 |
| `/study/sessions` | quick/daily·request ID 재전송·open session 재개·terminal SQL guard |
| `/study/sessions/:id/steps/:stepId/submit` | typed ref·공개/급수 검증·서버 채점·결과/활동/FSRS/보상 batch |
| `/learning/records`, `/learning/annotations`, `/learning/motivation` | 실제 기록 분모·annotation revision·서버 학습일·안내 세션 XP |
| `/quiz/generate`, `/quiz/attempts/:id` | random/weakest·strict-level·세션 선택지 회전·소유권 검사 후 완료 결과 조회 |
| TOPIK complete/review | `lib/learning-effects.ts` 공통 저장, progress→card→review log→activity |
| `/activity/events`, `/activity/summary` | 최대100 idempotent client batch·7/30일 집계. client telemetry와 확정 학습 기록을 구분 |
| `/notifications` | opt-in·구독 소유권·현지화·오늘 학습 skip·발송 중복 차단 |

`lib/study-content.ts`는 공개 상태와 같은 급수 typed content adapter를, `lib/learning-effects.ts`는 공통 완료·FSRS 효과를, `lib/motivation.ts`는 서버 기록 집계를 담당한다. 내부 HTTP 재호출로 학습 효과를 중복 처리하지 않는다. 오프라인에서는 pending/초안과 서버 수락 상태를 구분하고 계정·트랙 cache scope를 보존한다.

## 음성·PWA

Web `lib/audio.ts`·`google-browser-speech.ts`와 TOPIK `useKoreanAudio.ts`가 shared audio policy를 사용한다. same-language Google 우선·설치 voice fallback, ko/ja 제한, click task 즉시 speak·onend 뒤 성공을 보존한다. R2/서버 발음 요청은 만들지 않으며 API legacy와 관리자 생성은410, CSP media-src는 none이다.

활성 Service Worker는 Vite injectManifest의 `src/sw.ts`다. 콘텐츠 API cache·push/notificationclick을 처리하고 `lib/pwa-update.ts`가 기존 client의 새 worker 전환을 관리한다. 최초 방문 reload와 이미 제어되는 client update를 구분한다.

## 콘텐츠·미완료·검증

운영은 canonical N5–N1·TOPIK owner Batch1–5, TOPIK practice v2 300, N3 정적120이다. N2 정적60·N1 정적60·TOPIK Batch6 40은 Preview 후보다. 승인된 문제↔개념 link는 아직 생성하지 않았고 기존 교육 영어 내용의 새 번역·진입/재개 성과 계측도 후속 범위다. [원본 지도](docs/00_overview/00_source_map.md)·[감사](docs/00_overview/CONTENT_AUDIT.md)·[로드맵](docs/ROADMAP.md)을 따른다.

`pnpm ops:verify`는 음성 계약·OpenAPI·타입·전체 단위·build·fresh D1의 FK/FTS·manifest·provenance·release contract/control-plane을 검사한다. 브라우저·실제 청취는 별도 증거다. `ops:status:remote`는 읽기 전용이며 Production 콘텐츠 전수 verifier나 실제 SSO 로그인 대신 사용하지 않는다.

이번 정리에서 미사용 API helper3·UI component1·중복SW1을 제거하고 현재 파일 지도 검사를 추가했다. 콘텐츠/마이그레이션·DB 데이터·발음 실행 코어는 보존한다. 변경·검증 결과는 [정리 기록](docs/00_overview/REPOSITORY_MAINTENANCE_2026-10-10.md)에 기록한다.
