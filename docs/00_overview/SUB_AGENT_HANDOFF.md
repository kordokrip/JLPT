# Sub Agent 운영 인수인계

## 활성 작업 — 2026-10-13

사용자 범위는 V7+160 전체 검증/네 메뉴/조건부 Production/최종 push다. 아래10월12일 local-only 금지는 이전 세션 이력이다. 현재 원격은0030/Worker aedcbd40/Pages f62a8bdb·main이며 변경하지 않았다. 현재 gate/실행 순서는 [통합 릴리스 기록](LEARNING_COHORT_RELEASE_2026-10-13.md)을 먼저 읽는다.

신규 진입점은 `learning-cohort-release.ts`(5개 원자적 출판/철회), `learning-cohort-target.ts`(정확 대상/clean SHA), `learning-cohort-remote.ts`(stage/publish/verify/withdraw), `run-learning-cohort-local-gates.mjs`(실제 새 전체 gate/합성 보존 drill)이다. 기존 Preview-only 경계는 유지한다. 별도 원격 drill을 최종 Preview와 분리하며 운영 사용자 자료를 복사하지 않는다. family/audio receipt를 AI가 자동 통과로 작성하지 않는다.

helper는 env/점검 모드 필수·오타/중복 거부이고 새 회귀6/6, queue/cron3/3, target3/3을 통과했다. 시각5개는 의도된 UX 확인 후 그5개만 갱신했다. 새 전체 gate/Preview/실제 가족·가청·backup/restore·Production/push는 아직 미실행이다. 코어 음성4파일은 변경하지 않는다.

갱신: 2026-10-12 KST. 운영0030과 로컬0031 후보를 분리한다. iOS 설치 안내는 새 후보 설정의 인라인 region이며 첫 학습을 가리던 배너를 되살리지 않는다(`INC-UI-071`). 과거 순차 실행 내역은 [릴리스 원장](LOCAL_RELEASE_LEDGER.md)과 [과거 상태 스냅샷](../history/CURRENT_STATE_2026-09-25.md)을 따른다.

## 이번 후보의 인수인계 — 공개 금지

10월12일은 **최종 로컬 gate 완료 / 원격 작업 승인 없음**에서 종료했다. cohort04 단위614·4 workspace typecheck·OpenAPI·build·fresh·reviewed E2E44와 실제 fresh/upgrade/reseed·local G0–G4 공개/철회·12종 합성 학습 기록 불변을 확인했다. 두 release의 single UPDATE exact JSON seal과 기존 NULL 보존, D1 depth/Wrangler splitter 회귀를 유지한다. 초기 cohort01–03 실패는 편집하지 않는다. commit·push·Preview·Production은 금지다.

Preview160의 기존17문항 실패와 v2 A/B158/2 실패는 보존한다. 새 v3는 A/B160/160·실제 품질 checker·별도543 draft행/reseed/120 release-audit-question join·쓰기8/듣기8 바인딩을 검사했다. 새160의 원격 공개/control-plane과 가족·가청 검증은 하지 않았다. V7 전용 profile/publisher는 구현됐지만 로컬 통과를 Preview/Production 승인으로 확대하지 않는다.

일반 local ops39/2/0이며 remote51/2/0은10월11일 보존 이력이다. 로컬-only 답변 이후 원격 조회/변경0, HEAD/upstream d626a164 동일·commit/push0이다. 현재 실행 증적은 `.artifacts/learning-v7-release-2026-10-12/cohort04`; 최종 G4는 `g0-g4-local.json`, 중간 preflight는 Preview 진입 근거가 아니다. 비밀 파일/증적 원문은 커밋하지 않는다.

[콘텐츠·가족 UX 기록](CONTENT_LEARNING_UX_UPDATE_PLAN.md)을 먼저 읽는다. 네 메뉴·카탈로그 API·0031 snapshot·철회 guard는 로컬 후보다. v1 A289/B302거부·lookup31/red flag195, v2 대표 실패, v3 정적 대표 승인, v4/v5/v6 전체 실패를 모두 보존한다. 운영 SELECT 공개220개념·급수별20·조회0실패/쓰기0은 선택 증거이지 cue 의미 승인이 아니다. 이후 V7 두440/440과 로컬 staging은 완료했다. 불합격 passed/hash 편집 및 합성 fixture를 실제 의미 승인으로 보고하는 것은 금지다.

진입점: API `lib/learning-lessons.ts`, `routes/learning-experience.ts`; Web `features/learning/LearnerLessonLibrary.tsx`, `pages/LearnHub.tsx`; DB `drizzle-v2/0031_learning_lessons.sql`. 구 `seed/learning-path-draft.ts`는 실패v1용이다. `capture-learning-path-v2-baseline.ts`/`learning-path-v2-contract.ts`는 공개 선택/환경별 해석, v2/v3 prototype과 reviews는 보존 정적 증거다. 새 `learning-path-v5-authoring.ts`/`freeze-learning-path-v5.ts`/`learning-content-patch-snapshot.ts`/`learning-path-revision-contract.ts`는 v4 실패 원본과 patch 실행 bytes/hash·새ID/버전을 대조한다. 자동 구조는 의미 승인과 별개다. 공식 API02/source06의 첫반환 sense와 원래 취득시각을 보존하며 새 source derivative를 새 다운로드로 주장하지 않는다.

## 시작 순서

재개 시 현재 사용자의 작업 범위를 먼저 확인한다. 이번에는 로컬 검증·문서화만 승인됐다. 향후 별도 승인된 후보 고정/새 Preview에서 V7과 별도160의 증적을 분리하고11급수 실제 계정 흐름·가족 관찰·Chrome ko/ja onend/사람 가청/Network R2·legacy0을 새 배포에 연결한다. 현 schema backup/restore·rollback·predeploy·현재 Production 승인 전에는 운영 쓰기 금지다. 결함은 새 버전/hash로 수정하고 기존 동결/failed를 편집하지 않는다. 음성 코어를 바꾸거나 mock을 가청으로 보고하지 않는다.

`selected-concepts.json`은 공개 선택 증적이며 cue의 교육 승인이 아니다. `learning-path-v4-authoring.ts`는 220 cue를 결합하며 `learning-path-full-contract.ts`는 개념2/문제2·동일급수·구조·trusted Git/source/identity를 검사한다. 의미·상황 차이·난이도는 독립 reviewer 대상이다. v4는 이미 동결됐으므로 원본 수정 금지다. 신규 draft adapter는 `seed/learning-path-v4-draft.ts`, local-only CLI는 `ops/stage-learning-path-v4.ts`다. 합성 메모리 승인 fixture는 adapter 검사일 뿐 실제 의미 승인이나 staging 증거가 아니다. adapter는 readiness 이전 파일 생성 금지, 시스템 임시 디렉터리의 새 파일 독점 생성, 복합키 충돌 검사, transaction rollback, draft 비공개를 강제한다. 구 v1 seed는 신규 v4에 사용하지 않는다.

루트 `AGENTS.md` → [문서 색인](../README.md) → [현재 상태](CURRENT_STATE.md) → [오류 원장](ERROR_LEDGER.md) → [운영 runbook](OPERATIONS_MANAGEMENT_RUNBOOK.md) → [로컬 CI/CD](LOCAL_CICD_OPERATIONS.md) → [릴리스 원장](LOCAL_RELEASE_LEDGER.md) → 작업 관련 source/schema/test 순으로 읽는다. 운영·버그·정리에는 `.codex/skills/project-operations-steward`, 콘텐츠 출판에는 `content-release-automation`을 추가로 사용한다.

후속 진입점은 `dictionary-web-evidence.ts`, `immutable-learning-content-plan.ts`, `learning-path-v4-source-binding.ts`, `freeze-learning-path-v4.ts`, `report-learning-path-v4-readiness.ts`다. 독립 검토가 검증 우회5경로를 발견해 부모/독립 반례로 교정했다(`INC-QA-078`). 현재 checkout seed로 immutable SHA를 주장하거나 review boolean을 truthiness로 바꾸지 않는다. 새fresh/E2E50개는 기존 학습·미공개 상태/음성mock 검사이며 신규220레슨·실제가청으로 사용하지 않는다.

작업 시작과 종료 `pnpm ops:status`를 실행한다. 현재 배포를 판단할 때는 `pnpm ops:status:remote`를 사용하며, 새 파일·이동·삭제 후 `pnpm docs:catalog && pnpm docs:check`를 실행한다.

## 현재 기준선

| 구분 | 사실 |
| --- | --- |
| Production | D1 `0000–0030`, Worker `aedcbd40-6605-44d2-8227-d145a186bef0`, Pages `f62a8bdb-298e-446a-ab74-7d78ca47efd8` |
| 앱 배포 source | `032b50ddfea4051309ae95829520e6309e67a6ff` |
| 콘텐츠 source | `3485c6ef8addda3cd3e209730646c296175cf3c9`, manifest `content-v3-d102868e3d43b9b3c1a4` |
| 기능 | 다섯 메뉴, quick/daily 세션, 기록·메모·FSRS, 서버 학습일 스트릭, 안내 세션 XP, 현지화 opt-in Push |
| 콘텐츠 | N3 정적120·TOPIK practice v2 300·owner Batch5까지 운영 공개; N2 60/N1 60/TOPIK Batch6 40은 Preview만 |
| 10월 10일 시작 | Git `d626a16`·origin 동일·clean; local40/1/0·remote52/1/0 |
| 알려진 경고 | `INC-DATA-024` HEAD와 운영 콘텐츠 manifest 차이. 원격 콘텐츠 검증은 immutable source 고정 |
| 복귀 | 직전 Worker `c2901280`, Pages `ce4e5e57`; 전체 ID는 현재 상태 |
| 현재 백업 계약 | 0030/72 regular table. 9월25일 배포 전 백업은0028/70이며 새 보상/알림 기록을 포함하지 않음 |

## 작업별 파일 지도

| 변경 대상 | 먼저 볼 파일 |
| --- | --- |
| Web route·네 메뉴 후보 | `apps/web/src/App.tsx`, `pages/Today.tsx`, `LearnHub`, `LearningRecords`; 이전 QuestionsHub는 통합 후 제거 |
| 학습 세션·메모·재전송 | `pages/StudySession.tsx`, `features/study`, `lib/learning-experience.ts` |
| 서버 학습·채점·공통 저장 | `apps/api/src/routes/learning-experience.ts`, `lib/study-content.ts`, `lib/learning-effects.ts` |
| XP·스트릭·Push | `apps/api/src/lib/motivation.ts`, `push-reminders.ts`, `routes/notifications.ts`, `apps/web/src/sw.ts` |
| 자유 퀴즈·TOPIK | `routes/quiz.ts`, `lib/quiz-questions.ts`, `routes/topik-owner-curriculum.ts`, `routes/topik-practice.ts` |
| FSRS·기기 시계 차이 | `hooks/useSRS.ts`, `lib/srs-due-snapshot.ts`, API `lib/fsrs.ts` |
| 발음 | `lib/audio.ts`, `lib/google-browser-speech.ts`, `features/topik/useKoreanAudio.ts`, shared `audio-policy.ts` |
| DB·migration·backup | `packages/db/src/schema.ts`, `drizzle-v2`, `src/ops/d1-tables.ts`, `d1-backup.ts`, `d1-restore-drill.ts` |
| 운영·폴더 관리 | `scripts/project-ops-status.mjs`, `generate-file-catalog.mjs`, [인벤토리](PROJECT_INVENTORY.md), [파일 지도](PROJECT_FILE_CATALOG.md) |

## 반드시 지킬 경계

- 계정×트랙×원본 ID·버전으로 바인딩한다. 문자열 문제 ID를 정수 FSRS ID로 강제 변환하지 않는다. 다른 급수 fallback·미공개 콘텐츠 노출·정답 사전 노출을 차단한다.
- 해설 열람·명시적 완료·최초 문제 응답·재시도·FSRS 평가를 별도로 저장한다. 기존 quiz/TOPIK 완료와 안내 세션이 공통 효과 서비스를 쓰며 내부 HTTP 호출로 중복 저장하지 않는다.
- SQL 종료 상태 guard, idempotent claim, annotation revision, `expected_track`과 오프라인 초안 보존을 유지한다. UI 표시·mock 결과만으로 서버 저장 성공을 보고하지 않는다.
- XP는 안내 세션의 서버 수락 결과에 연결된다. 자유 TOPIK practice의 client activity를 서버 확정 학습일로 계산하지 않는다.
- 같은 언어 Google 우선·같은 언어 설치 음성 fallback, ko/ja 제한, click task 즉시 speak·실제 onend 이후 성공을 보존한다. R2 발음 경로는 금지하고 legacy audio는410이다.
- approved 문제↔개념 link는 아직 생성하지 않았다. 개인 맞춤 출제·운영 재개 성공률·사람 가청을 검증 없이 주장하지 않는다.
- Production write/deploy는 Preview·backup/restore·rollback·gate와 해당 작업 승인을 따른다. 문서 정리의 실행 범위에는 원격 DB·배포 변경이 포함되지 않는다.
- migration·학습 source·snapshot·회귀 테스트·백업·quality/reviewer·복구 증적을 보존한다. 삭제는 import 그래프와 전체 참조/실행 설정을 대조한 뒤 수행한다.

종료 기록에는 변경 파일·참조 대조·실행 명령의 exit/pass/skip/fail·미실행 범위를 적고 `CURRENT_STATE`, 오류·운영·릴리스 원장과 파일 지도를 함께 최신화한다.
