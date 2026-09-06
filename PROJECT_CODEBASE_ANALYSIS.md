# 개인용 JLPT · TOPIK PWA 코드베이스 분석

최종 점검: 2026-09-07 KST. 새 학습 UX와0028을 Production에 반영했습니다. 검증 runtime793b671과 배포 a7d5d87은 앱/패키지/lock tree가 동일합니다. 로컬458개·E2E217/30/0, Preview181/6/0(시각60개 제외), 실제 Preview 로그인·사용자 양언어 청취, 새 백업/복원과 strict predeploy를 확인했습니다. 사후 DB392/392·기존21테이블 hash 보존·Worker7/auth proxy3·정적70파일 hash가 통과했습니다. 실제 Production Chrome onend각1회와 speech-mock E2E2개는 사람 가청과 구분합니다. [현재 상태](docs/00_overview/CURRENT_STATE.md)에 증적과 배포/후속 Git 상태를 기록합니다.

## Production 기준선

| 상태 | DB/런타임 | 콘텐츠 |
| --- | --- | --- |
| production | D1 `0000–0028`, Worker `c2901280-4c10-4671-bc61-dc262c88c692`, Pages `https://ce4e5e57.nihongo-n3.pages.dev` | 기존 canonical + TOPIK practice v2 300 + N3 120 + TOPIK owner Batch 5 20 published |
| 2026-08-23 콘텐츠 Preview 기록 | 당시 Worker `4c6846d8-7cde-4c2c-916b-533a2db6d76a`; 현재 Preview 배포는 릴리스 원장 참조 | N2 practice 60 + N1 practice 60 + TOPIK owner Batch 6 40 published in Preview only |

Worker/Pages source SHA는 `a7d5d87946334fe8c7970b8f124853aaba443955`, Pages ID는 `ce4e5e57-c0fa-4fe5-b268-00458d4e0300`입니다. 콘텐츠 source SHA는 `3485c6ef8addda3cd3e209730646c296175cf3c9`와 manifest d102를 유지하며 앱 배포 SHA와 혼용하지 않습니다.

## Production 학습 경험

Production에 `0028_learning_experience.sql`로 프로필, 세션, 단계별 결과, revision 기반 메모, 검수된 문제↔개념 링크 다섯 테이블을 추가했습니다. 기존 content/progress/SRS/daily_logs는 보존합니다.

| 계층 | 새 구현 진입점 |
| --- | --- |
| shared 계약 | `packages/shared/src/learning-experience.ts`: ref, profile, session, submission, records, annotations Zod DTO |
| API | `apps/api/src/routes/learning-experience.ts`: 계정×트랙 소유권, 단계 순서, 정답 비노출, 서버 채점·중복 claim·원자적 저장 |
| 콘텐츠 바인딩 | `apps/api/src/lib/study-content.ts`: 같은 급수 due → 새 개념 → 문제 → 지연 retry; 유형별 canonical/owner adapter |
| 공통 저장 | `apps/api/src/lib/learning-effects.ts`: 기존 TOPIK 완료와 JLPT/TOPIK FSRS 효과 재사용. 내부 HTTP 재호출 없음 |
| Web | `Today`, `LearnHub`, `QuestionsHub`, `StudySession`, `LearningRecords`, `features/study`: 다섯 메뉴·재개·메모·실제 기록 |
| 결과 재조회 | `GET /api/v1/quiz/attempts/:id`: 소유한 완료 JLPT attempt만 반환; 이전 route state로 계정 검사를 우회하지 않음 |
| 회귀 | DB upgrade 기존 행 보존, API 계약, 메모 충돌, Chromium/WebKit 전 급수·오프라인·모바일 E2E |

단계 결과와 activity를 합산하지 않고, 최초 응답/재시도/자기평가를 분리합니다. 콘텐츠 문자열 ID를 정수형 FSRS ID로 강제 변환하지 않습니다. `content_learning_links`는 아직 승인 행을 넣지 않았으므로 개념 맞춤 출제를 주장하지 않습니다. 공개 교육 원문·정답·감사 원장을 새 UI 때문에 재시드하지 않았습니다.

`VITE_LEARNING_EXPERIENCE=false`는 이전 홈·탐색용 빌드 옵션이며 전체 backend rollback이 아닙니다. 상세 동작·검증 결과·남은 출시 조건은 [학습 경험 구현 계획](./docs/00_overview/LEARNING_EXPERIENCE_PLAN.md)에 통합했습니다.

## 계층과 데이터 흐름

```text
packages/db source/seed ── fresh D1 / production D1
                                │
packages/shared DTO·FSRS ── apps/api Worker
                                │ JSON API
                           apps/web PWA
                         Query + Dexie queue
```

| 계층 | 주요 책임 |
| --- | --- |
| `apps/web` | 보호 라우트, 퀴즈/owner 학습, 다음 행동, Google speech, 오프라인 활동 큐 |
| `apps/api` | 세션·track guard, 콘텐츠/퀴즈, TOPIK progress·FSRS, 활동 수집·집계 |
| `packages/shared` | 요청/응답 Zod schema, activity event 타입, FSRS 계산 |
| `packages/db` | D1 schema/migration, source/seed plan, release gate, verifier |
| `e2e` | 브라우저별 데이터 바인딩·학습 흐름·R2 요청 차단 검증 |
| 운영 제어 | `AGENTS.md`, `.codex/skills/project-operations-steward`, `scripts/project-ops-status.mjs`, 운영 runbook과 로컬 원장 |

## Production 데이터 모델

| migration | 모델과 불변 조건 |
| --- | --- |
| `0024_learning_activity_events.sql` | `(user_id,event_id)` 고유 이벤트. 원문/개인정보 대신 track, level, section, content ID, 정오답, FSRS rating, speech outcome, 시각만 저장 |
| `0025_jlpt_practice_questions.sql` | 자체 저작 JLPT 정적 문제은행. 버전, 공개 상태, 3개 언어 prompt/choice/explanation, listening script를 관리하고 기본 미공개 |
| `0026_release_quality_links.sql` | `content_release_quality_requirements`와 `content_release_quality_audit_links`. 완전하고 승인된 audit 링크 집합 없이는 공개 차단 |
| `0027_google_speech_contract.sql` | `content_speech_bindings`: provider `google-browser`, state `ready|unavailable`. legacy `content_audio_bindings`는 한 호환 릴리스 동안 보존하되 신규 insert 차단 |
| `0028_learning_experience.sql` | learning profile·study sessions/steps·annotations·content links. 기존 콘텐츠/학습 이력 보존, 새 백업70-table profile |

`0025`는 뒤 migration의 테이블을 참조하지 않습니다. release-link 의존 trigger는 `0026`이 관련 테이블을 만든 뒤 설치하므로 fresh migration 순서가 유효합니다.

## 활동·퀴즈·학습 연결

클라이언트는 Dexie 4의 로컬 schema version 6 큐에 활동 이벤트를 먼저 기록합니다. flush 실패 시 항목을 보존하고, 다음 온라인 전환/앱 재개 때 동일 `event_id`로 재전송합니다. 서버의 `(user_id,event_id)` 고유 키가 중복을 흡수하며 queue는 계정×트랙으로 격리됩니다.

- `POST /api/v1/activity/events`: 1–100개 batch, 인증 track과 이벤트 track이 다르면 거부, `{accepted, duplicates}` 반환
- `GET /api/v1/activity/summary?window=7d|30d`: totals와 track/level/section/mode groups 반환
- 퀴즈 제출은 질문별 `quiz_answered`, TOPIK owner 완료는 `content_completed`, FSRS 평가는 `review_rated`를 해당 데이터 변경과 같은 서버 transaction에서 기록
- speech playback은 `speech_attempted`와 `played|unavailable|error`만 기록

퀴즈 생성의 `strategy`는 선택 사항입니다. `random`은 기존 요청에 필드를 추가하지 않아 호환성을 유지합니다. `weakest`는 최근 30일 오답/복습을 우선하지만 요청한 급수 내부에서만 고르며, 데이터가 없거나 부족해도 다른 급수로 fallback하지 않습니다. N3 `kanji_reading`/`listening`과 N2/N1 네 모드는 공개·검토된 정적 bank를 우선합니다. N2/N1에서 16–20개를 요청하면 정적 15개 뒤를 같은 급수 canonical 항목으로만 채우고, 정답과 listening 정답 번역은 제출 전에 노출하지 않습니다.

TOPIK 대시보드는 서버 due, 미완료 owner 목록, 30일 activity summary를 합쳐 `due review → incomplete owner → weakest area`의 고정 순서로 하나의 다음 행동을 만듭니다.

2026-08-30 감사에서 발견한 TOPIK status legacy v1 조회와 quiz activity 부분 성공을 수정했고, 2026-09-07 Worker에 반영했습니다. 결과+activity의 원자성과 완료 attempt 재제출409는 같은 runtime의 로컬/Preview 테스트로 검증했습니다. Production에는 학습 테스트 데이터를 쓰지 않았으며 status의 TOPIK I/II·쓰기 활성은 실제 사후 응답으로 확인했습니다.

## 콘텐츠와 release control

production은 JLPT N2 Batch 1–5(583행), N1 Batch 1–4(286행), TOPIK owner Batch 1–5(140 unit/140 item), TOPIK practice v2 300문항을 제공합니다. TOPIK Batch 5는 1·2급만 확장합니다.

2026-08-19 콘텐츠 release는 별도 source와 deterministic builder에서 생성되어 production에 반영됐습니다.

- `jlpt-n3-practice-v1-2026-08-19`: 한자 읽기 60 + 듣기 60, 각 모드 정답 위치 `15/15/15/15`, quality link 120개, published
- `topik-owner-batch5-2026-08-19`: 급수별 10개, 다섯 영역 각 2개, 총 20개, quality link 20개, published. 듣기 4개만 `audio_text_ko`와 Google speech binding을 가짐
- 두 독립 adversarial review artifact가 140개 전체의 정답·해설을 대조했고 release gate가 이를 실제 publication과 연결

기존 TOPIK v2 300 audit은 historical release `topik-practice-v2-2026-08-17`의 quality link 300개로 production control plane에 연결됐습니다.

2026-08-23 Preview 후보는 별도 source intake와 최종 draft SHA, 서로 독립된 Reviewer A/B 판정, validator 결과를 세 release에 연결합니다.

- `jlpt-n2-practice-v1-2026-08-23`: 60문항, quality link 60
- `jlpt-n1-practice-v1-2026-08-23`: 60문항, quality link 60
- `topik-owner-batch6-2026-08-23`: 3–6급 40항목, quality link 40
- Preview에서는 세 release와 G0–G4, 실제 TOPIK 완료→progress→FSRS→activity transaction을 검증했습니다. 음성 회귀 복구는 2026-08-24 Production Pages에 반영됐지만, 신규 콘텐츠는 새 predeploy·backup/restore·immutable release verifier와 명시적 승인을 다시 확보해야 하므로 Production에는 반영하지 않았습니다.

## 음성 불변 조건

모든 발음은 Google 음성을 우선하고 같은 언어의 브라우저/기기 음성을 사용합니다. click handler는 voice 준비를 `await`하지 않고 같은 task 안에서 즉시 `speak()`를 호출하며, 비동기 voice discovery는 다음 재생을 위해 background에서만 실행합니다. 신규 speech binding에는 R2 key나 URL이 없습니다. legacy `/api/v1/audio/*` 요청은 `410`이며 E2E는 해당 요청이 0인지 감시합니다. report/evidence R2 버킷은 발음과 별도입니다.

## 검증 상태와 다음 관찰

2026-08-19 배포 후 remote DB verifier, TOPIK v2 verifier, question quality 332개/실패 0건, R2 pronunciation 참조 0건을 확인했습니다. 2026-08-24 음성 복구본은 같은 언어 fallback, 첫 클릭의 동기 `speak()`, 기존 controller가 있는 PWA만 1회 갱신, 첫 방문자 무중단과 R2 요청 0건을 회귀 계약으로 고정합니다. 첫 Preview에서 신규 client 강제 reload를 발견해 Production을 중단했고, 수정 뒤 Web `93/93`, 영향 E2E `50 passed / 2 skipped`, 전체 E2E `171 passed / 32 skipped`로 다시 통과했습니다. 최종 Preview `d53c3b4f-0c51-4a2b-9cc8-e5f35edcf5a0`과 Production `9cc58a1f-4772-4129-b90d-c819ca20d700`에서 검증했으며, Production 영향 기능은 Chromium/WebKit `44 passed / 8 skipped / 0 failed`였습니다.

다음 운영 판단은 실제 학습 활동을 기준으로 합니다.

- activity summary의 중복률, track 격리, speech error를 7일/30일 창으로 관찰합니다.
- release link 수 120/20/300과 published 상태를 원격 verifier에서 계속 고정합니다.
- Batch 6 Production 반영 뒤 실제 사용량이 N3 응답 50건, TOPIK 완료 10건, FSRS 복습 5건에 도달해야 Batch 7을 판단할 수 있습니다. D+30 미달이면 추가 증량보다 진입 UX를 우선합니다.

현재 운영 상태는 [CURRENT_STATE.md](./docs/00_overview/CURRENT_STATE.md), 후보 배포 재개 순서는 [NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md](./docs/00_overview/NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md)를 따릅니다.

## 운영관리와 로컬 CI/CD 대체 계층

모든 에이전트는 루트 `AGENTS.md`의 선독 순서와 `.codex/skills/project-operations-steward` 계약을 따릅니다. 운영 상태의 진실 우선순위는 현재 실행/원격 읽기 결과 → 코드·schema·test → `CURRENT_STATE` → 오류·릴리스 원장 → 과거 계획입니다.

- `pnpm ops:status`: 필수 문서, 현재 배포 식별자 5개가 README와 분석 문서 각각에 있는지, package scripts, Actions 비활성, 보존해야 할 로컬 backup/release/recovery 증적, 문서 링크, 음성 계약, Git 상태와 알려진 manifest drift를 확인합니다.
- `pnpm ops:verify`: 상태 검사 뒤 OpenAPI, typecheck, 전체 unit, build, fresh D1을 순서대로 실행합니다. fresh D1은 음성 provenance와 content contract/control plane을 포함합니다.
- `pnpm ops:status:remote`: local/origin SHA, Production Pages·Worker·D1 migration, public/audio QA/legacy smoke, auth proxy 계약, TOPIK v2 release status, CSP R2 media 차단과 D1의 9개 R2 발음 surface 참조 0건을 읽기 전용으로 확인합니다.
- `verify:remote:audio`는 `INC-DATA-024`가 열린 동안 fail-closed입니다. 운영 콘텐츠는 immutable release source/manifest verifier로만 판정하고 R2 부재는 target이 명시된 `verify:remote:audio:r2`로 별도 확인합니다.
- 결과 JSON은 `.artifacts/operations/`에 보존하고 Git에 커밋하지 않습니다. Production write/deploy는 이 계층의 자동 동작이 아니며 기존 승인·Preview·backup/restore·rollback 절차를 요구합니다.
