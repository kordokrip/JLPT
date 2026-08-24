# 개인용 JLPT · TOPIK PWA 코드베이스 분석

기준일: 2026-08-24 KST. 이 문서는 현재 Production, 검증이 끝난 Preview 후보, 로컬 코드·schema·route·test를 구분한 구조 지도입니다.

## Production 기준선

| 상태 | DB/런타임 | 콘텐츠 |
| --- | --- | --- |
| production | D1 `0000–0027`, Worker `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872`, Pages `https://485b9f00.nihongo-n3.pages.dev` | 기존 canonical + TOPIK practice v2 300 + N3 120 + TOPIK owner Batch 5 20 published |
| preview candidate | Preview Worker `4c6846d8-7cde-4c2c-916b-533a2db6d76a` | N2 practice 60 + N1 practice 60 + TOPIK owner Batch 6 40 published in Preview only |

Worker/content source SHA는 `3485c6ef8addda3cd3e209730646c296175cf3c9`, 현재 Pages source SHA는 `b8d41acb1cbd77da1a428ade0d07c27c910f84e3`입니다.

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

## Production 데이터 모델

| migration | 모델과 불변 조건 |
| --- | --- |
| `0024_learning_activity_events.sql` | `(user_id,event_id)` 고유 이벤트. 원문/개인정보 대신 track, level, section, content ID, 정오답, FSRS rating, speech outcome, 시각만 저장 |
| `0025_jlpt_practice_questions.sql` | 자체 저작 JLPT 정적 문제은행. 버전, 공개 상태, 3개 언어 prompt/choice/explanation, listening script를 관리하고 기본 미공개 |
| `0026_release_quality_links.sql` | `content_release_quality_requirements`와 `content_release_quality_audit_links`. 완전하고 승인된 audit 링크 집합 없이는 공개 차단 |
| `0027_google_speech_contract.sql` | `content_speech_bindings`: provider `google-browser`, state `ready|unavailable`. legacy `content_audio_bindings`는 한 호환 릴리스 동안 보존하되 신규 insert 차단 |

`0025`는 뒤 migration의 테이블을 참조하지 않습니다. release-link 의존 trigger는 `0026`이 관련 테이블을 만든 뒤 설치하므로 fresh migration 순서가 유효합니다.

## 활동·퀴즈·학습 연결

클라이언트는 활동 이벤트를 Dexie v6 큐에 먼저 기록합니다. flush 실패 시 항목을 보존하고, 다음 온라인 전환/앱 재개 때 동일 `event_id`로 재전송합니다. 서버의 `(user_id,event_id)` 고유 키가 중복을 흡수하며 queue는 계정×트랙으로 격리됩니다.

- `POST /api/v1/activity/events`: 1–100개 batch, 인증 track과 이벤트 track이 다르면 거부, `{accepted, duplicates}` 반환
- `GET /api/v1/activity/summary?window=7d|30d`: totals와 track/level/section/mode groups 반환
- 퀴즈 제출은 질문별 `quiz_answered`, TOPIK owner 완료는 `content_completed`, FSRS 평가는 `review_rated`를 해당 데이터 변경과 같은 서버 transaction에서 기록
- speech playback은 `speech_attempted`와 `played|unavailable|error`만 기록

퀴즈 생성의 `strategy`는 선택 사항입니다. `random`은 기존 요청에 필드를 추가하지 않아 호환성을 유지합니다. `weakest`는 최근 30일 오답/복습을 우선하지만 요청한 급수 내부에서만 고르며, 데이터가 없거나 부족해도 다른 급수로 fallback하지 않습니다. N3 `kanji_reading`/`listening`과 N2/N1 네 모드는 공개·검토된 정적 bank를 우선합니다. N2/N1에서 16–20개를 요청하면 정적 15개 뒤를 같은 급수 canonical 항목으로만 채우고, 정답과 listening 정답 번역은 제출 전에 노출하지 않습니다.

TOPIK 대시보드는 서버 due, 미완료 owner 목록, 30일 activity summary를 합쳐 `due review → incomplete owner → weakest area`의 고정 순서로 하나의 다음 행동을 만듭니다.

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
- Preview에서는 세 release와 G0–G4, 실제 TOPIK 완료→progress→FSRS→activity transaction을 검증했습니다. 음성 회귀 복구 릴리스가 Production에 반영되기 전까지 신규 콘텐츠도 Production에는 반영하지 않았습니다.

## 음성 불변 조건

모든 발음은 Google 음성을 우선하고 같은 언어의 브라우저/기기 음성을 사용합니다. click handler는 voice 준비를 `await`하지 않고 같은 task 안에서 즉시 `speak()`를 호출하며, 비동기 voice discovery는 다음 재생을 위해 background에서만 실행합니다. 신규 speech binding에는 R2 key나 URL이 없습니다. legacy `/api/v1/audio/*` 요청은 `410`이며 E2E는 해당 요청이 0인지 감시합니다. report/evidence R2 버킷은 발음과 별도입니다.

## 검증 상태와 다음 관찰

2026-08-19 배포 후 remote DB verifier, TOPIK v2 verifier, question quality 332개/실패 0건, R2 pronunciation 참조 0건을 확인했습니다. 2026-08-24 음성 복구본은 같은 언어 fallback, 첫 클릭의 동기 `speak()`, 기존 controller가 있는 PWA만 1회 갱신, 첫 방문자 무중단과 R2 요청 0건을 회귀 계약으로 고정합니다. 첫 Preview에서 신규 client 강제 reload를 발견해 Production을 중단했고, 수정 뒤 Web `93/93`, 영향 E2E `50 passed / 2 skipped`, 전체 E2E `171 passed / 32 skipped`로 다시 통과했습니다.

다음 운영 판단은 실제 학습 활동을 기준으로 합니다.

- activity summary의 중복률, track 격리, speech error를 7일/30일 창으로 관찰합니다.
- release link 수 120/20/300과 published 상태를 원격 verifier에서 계속 고정합니다.
- Batch 6 Production 반영 뒤 실제 사용량이 N3 응답 50건, TOPIK 완료 10건, FSRS 복습 5건에 도달해야 Batch 7을 판단할 수 있습니다. D+30 미달이면 추가 증량보다 진입 UX를 우선합니다.

현재 운영 상태는 [CURRENT_STATE.md](./docs/00_overview/CURRENT_STATE.md), 후보 배포 재개 순서는 [NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md](./docs/00_overview/NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md)를 따릅니다.
