# Sub Agent 운영 인수인계

최종 점검: 2026-09-06 KST

이 문서는 새 Sub Agent가 과거 대화의 완료 보고를 신뢰하지 않고 현재 저장소를 재구성하기 위한 짧은 진입점이다. 상세 수치와 배포 식별자는 반드시 [현재 상태](CURRENT_STATE.md)와 `pnpm ops:status:remote`에서 다시 확인한다.

## 시작 순서

1. 루트 `AGENTS.md`
2. `docs/README.md`
3. `CURRENT_STATE.md`
4. `ERROR_LEDGER.md`
5. `OPERATIONS_MANAGEMENT_RUNBOOK.md`
6. `LOCAL_CICD_OPERATIONS.md`
7. `LOCAL_RELEASE_LEDGER.md`
8. 작업과 직접 관련된 schema, migration, route, source, test

운영 감사·버그·리팩터링·정리에는 `.codex/skills/project-operations-steward`를 사용한다. 콘텐츠 publication에는 `.codex/skills/content-release-automation`도 읽는다.

## 현재 기준선

| 범위 | 현재 사실 |
| --- | --- |
| Production DB | D1 migration `0000–0027`; canonical과 TOPIK practice v2 300, N3 practice 120, TOPIK owner Batch 5까지 공개 |
| Preview 후보 | N2 60, N1 60, TOPIK owner Batch 6 40; Production 미반영 |
| Pages | Production deployment `9cc58a1f-4772-4129-b90d-c819ca20d700`, source `2bd657e96d8a43c6d28efe414acd468c1abd0861` |
| Worker | `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872`, content source `3485c6ef8addda3cd3e209730646c296175cf3c9` |
| 열린 결함 | `INC-DATA-024`; 로컬 수정·Production 미배포 `INC-TOPIK-031`–`INC-AUD-033`. `INC-OPS-035`는 표면별 R2 query로 수정·검증 완료. current HEAD manifest를 Production truth로 사용하지 말고 release-pinned verifier를 사용 |
| CI/CD | GitHub Actions 비활성; 승인된 로컬 gate와 MD 원장이 release evidence |

## 코드·데이터 지도

### 새 학습 UX Preview 후보

먼저 [LEARNING_EXPERIENCE_PLAN](LEARNING_EXPERIENCE_PLAN.md)의 실제 검증/미실행 표를 읽는다. UX source `94dfb05`는 feature branch에 commit/push하고 전용 Preview에 반영했다. Production 배포로 오인하지 않는다. 원격 세션 시작 지연 `INC-PERF-049`를 추가 수정·재검증 중이다.

별도 Agent 교차검토에서 `INC-LEARN-043`, `INC-DATA-044/046`(다른 기기의 선행 제출·종료·트랙 변경)과 `INC-OPS-045`(진단 식별자 가림), `INC-DATA-047`(0028 backup profile)을 추가해 회귀를 수정했다. 후속 전체 브라우저는 `207 passed / 32 skipped / 0 failed`다. expected_track 불일치 409를 메모 revision 충돌이나 제출 성공으로 바꾸지 않는다. `/audio-qa` 정상 종료 관측 보강(`INC-QA-048`) 이후의 최종 gate는 계획/릴리스 원장의 최신 결과를 확인한다.

Preview D1에 0028만 적용했으며 기존 콘텐츠 집계·공개 상태·quality link가 before/after 일치하고 FK 0이다. Pages `a95437fc-8411-4151-9519-ab0d8fb92905`와 Worker `1fec0907-914d-4a82-9e87-92dcf6beb723`가 source `94dfb05`다. 실제 Chrome의 양언어 정상 종료와 사용자의 청취 확인을 확보했지만 전체 network capture는 없다. Preview E2E는 시작 지연으로 중단했고 전체 통과가 아니다. 직전 Worker `0d17ba30-b7ea-4879-9e99-e9c3a7ebb8ee`/Pages `885aae1f-d308-4453-b3c6-881999410ec0`는 복귀 기준이다. Production에는 어떤 변경도 하지 않았다.

- shared 계약: `packages/shared/src/learning-experience.ts`.
- additive DB: `packages/db/drizzle-v2/0028_learning_experience.sql`, Drizzle의 다섯 learning/study 테이블.
- API: `apps/api/src/routes/learning-experience.ts`; `lib/study-content.ts`의 typed content/publication/strict-level, `lib/learning-effects.ts`의 완료·FSRS 공통 batch, `lib/quiz-questions.ts`의 기존 출제 계약.
- 웹: `Today`, `StudySession`, `LearningRecords`, `LearnHub`, `QuestionsHub`; `features/study/StudyComponents.tsx`의 메모 CAS·speech; `i18n/study.ts`의 ko/ja/en 조작 문구.
- 테스트: `learning-experience-migration.test.ts`, API `learning experience contract`, `e2e/learning-experience.spec.ts`, 메모 지연 응답·result 소유권 웹 테스트.
- 콘텐츠↔개념 approved link는 아직 생성하지 않았다. 새 연상문·이미지·문항 생성/공개 작업이 아니므로 기존 문제를 개념 맞춤 출제로 과장하지 않는다.
- `최초 응답`은 세션 `practice` 제출 수이지 평생 처음 접한 고유 문항 수가 아니다. 힌트 사용량·홈 진입→시작 시간·재개 성공률은 아직 구현된 운영 지표가 아니며, `revealed`는 개념/복습 해설 열람만 나타낸다.
- backup/restore는 명시적 0027/65·0028/70 profile이다. 저장된 65개 Production backup의 실제 local0028 restore는 FK 0, trigger 56개 복구, 새 5개 테이블 0행으로 통과했지만 `coversLocalSchema=false`다. 새 Production backup이나 새로운 학습 기록 보존 증거로 바꾸어 쓰지 않는다. 기존 transfer/사용자 정리 도구는 별도 0028 검증 전 사용하지 않는다.
- `VITE_LEARNING_EXPERIENCE`는 build-time 화면 플래그이며 Worker 전체 rollback 대체물이 아니다. `0028`은 이전 Worker가 무시하는 additive 테이블이다.

- `apps/web`: React PWA, Dexie queue, 퀴즈·TOPIK·FSRS UI, Google 우선 동일 언어 browser speech.
- `apps/api`: Cloudflare Worker/Hono, 인증·track guard, 학습 API, OpenAPI source.
- `packages/shared`: Zod API schema, DTO, FSRS와 공통 정책.
- `packages/db`: Drizzle schema, 로컬 migration `0000–0028`(Production은 `0027` 유지), seed, quality/release verifier.
- `docs/01_n5`–`docs/07_topik`: 코드가 읽는 학습 source-of-truth가 포함된 영역. 삭제 전에 문자열 참조·manifest source·checksum을 대조한다.
- `e2e`: Chromium/WebKit 제품 흐름과 발음의 server/R2 요청 0건 검증.

핵심 데이터 흐름은 `source → deterministic seed → D1 → Worker API → Query/Dexie → UI`다. 사용자 학습 변경은 `quiz/complete → progress 또는 attempt → FSRS → learning_activity_events`의 track 격리를 유지해야 한다.

## 절대 불변 조건

- 발음은 같은 언어의 Google 음성을 우선하고, 없으면 같은 언어의 설치 음성을 사용한다. 한국어 `ko-*`, 일본어 `ja-*` 외 voice를 사용하지 않는다.
- R2 발음 수집·생성·저장·조회·재생·fallback은 금지한다. legacy `/api/v1/audio/*`와 관리자 발음 생성 경로는 `410 Gone`을 유지한다.
- R2 원격 verifier는 9개 표면을 독립 count한다. 이를 compound `UNION ALL`로 합치면 Production legacy view 확장으로 D1 planner 제한을 넘을 수 있으므로 되돌리지 않는다.
- 다른 JLPT 급수나 학습 track으로 fallback하지 않는다. 정답은 제출 전 노출하지 않는다.
- Production write/deploy에는 현재 세션 승인과 Preview, backup/restore, rollback, predeploy gate가 필요하다.
- 실패·미실행·mock 결과를 통과라고 쓰지 않는다. 실제 Chrome lifecycle과 물리 스피커 가청은 별도 증거다.

## 작업 종료 보고 형식

- Confirmed: 현재 명령·코드·원격 조회로 확인한 사실
- Changed: 수정 파일과 계약 영향
- Validation: 실제 실행 명령, 종료 코드, pass/skip/fail
- Preserved: 사용자 변경과 backup/release evidence
- Blocked: 미실행 또는 외부 조건
- Next safe unit: 승인 없이 이어갈 수 있는 최소 다음 작업

작업 종료에는 `pnpm ops:status`를 다시 실행하고, 코드·DB·API·배포 상태가 달라졌다면 현재 상태·오류 원장·runbook·릴리스 원장을 같은 commit에서 갱신한다.
