# 개인용 JLPT · TOPIK PWA 코드베이스 분석

기준일: 2026-08-19 KST. 이 문서는 코드·schema·route·test를 기준으로 한 현재 구조 지도입니다. production 기준선과 로컬 릴리스 후보는 별도 상태입니다.

## 배포 경계

| 상태 | DB/런타임 | 콘텐츠 |
| --- | --- | --- |
| production 기준선 | D1 `0000–0023`, Worker `693837d0-70e0-40b7-9f7e-72487321b6f7`, Pages `9d8e6460-2e86-477c-8eb8-fc4c41491f4c` | canonical 6,501행, TOPIK practice v2 300 공개 |
| 로컬 후보 | migration `0024–0027`, 대응 shared/API/web 구현과 테스트 | N3 120문항, TOPIK owner Batch 5 20항목; review artifact 존재, publication state는 draft/unpublished |

로컬 후보는 아직 production에 반영되지 않았습니다. 아래 설명에서 “구현됨”은 로컬 코드 상태를 의미합니다.

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

## 로컬 신규 데이터 모델

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

퀴즈 생성의 `strategy`는 선택 사항입니다. `random`은 기존 요청에 필드를 추가하지 않아 호환성을 유지합니다. `weakest`는 최근 30일 오답/복습을 우선하지만 요청한 급수 내부에서만 고르며, 데이터가 없거나 부족해도 다른 급수로 fallback하지 않습니다. N3 `kanji_reading`/`listening`은 공개·검토된 정적 bank가 생기면 우선 활용하도록 연결되어 있습니다.

TOPIK 대시보드는 서버 due, 미완료 owner 목록, 30일 activity summary를 합쳐 `due review → incomplete owner → weakest area`의 고정 순서로 하나의 다음 행동을 만듭니다.

## 콘텐츠와 release control

production은 JLPT N2 Batch 1–5(583행), N1 Batch 1–4(286행), TOPIK owner Batch 1–4(120 unit/120 item), TOPIK practice v2 300문항을 제공합니다.

로컬 초안은 별도 source와 deterministic builder에 있습니다.

- `jlpt-n3-practice-v1-2026-08-19`: 한자 읽기 60 + 듣기 60, 각 모드 정답 위치 `15/15/15/15`, 3개 언어 prompt/explanation, 모두 `is_published=0`
- `topik-owner-batch5-2026-08-19`: 급수별 10개, 다섯 영역 각 2개, 총 20개. 듣기 4개만 `audio_text_ko`와 Google speech binding을 가짐
- 두 독립 adversarial review artifact가 140개 전체의 정답·해설을 대조하지만 draft 필드 자체는 release 실행 전까지 pending/unpublished로 유지

기존 TOPIK v2 300 audit을 release control plane에 역사적으로 연결하는 backfill script도 로컬에 있습니다. production 실행은 `--publish`와 명시적 환경 guard가 필요하며 아직 적용되지 않았습니다.

## 음성 불변 조건

모든 발음은 Google 브라우저 음성만 사용합니다. 신규 speech binding에는 R2 key나 URL이 없습니다. legacy `/api/v1/audio/*` 요청은 `410`, web prefetch는 네트워크 없는 no-op이며 E2E는 `/api/v1/audio/` 요청이 0인지 감시합니다. report/evidence R2 버킷은 발음과 별도입니다.

## 검증 상태와 남은 위험

2026-08-19 로컬 집중 검증 결과는 web unit 34파일/86테스트, web production build, Chromium·WebKit 활동/퀴즈/owner E2E 24/24 통과입니다. API route test는 event idempotency·track mismatch·strict-level weakest를, DB test는 migration order·release link·140개 review coverage·Google-only 계약을 고정합니다.

아직 남은 릴리스 위험은 다음과 같습니다.

- `0024–0027` upgrade를 production snapshot 사본과 preview D1에서 다시 확인해야 합니다.
- 역사적 TOPIK v2 release/evidence backfill은 production에서 아직 0인 control-plane 기록을 채우므로 백업과 dry-run이 필요합니다.
- 신규 140개 초안은 review artifact가 있어도 release link, G0–G4, preview, production 승인 전에는 공개할 수 없습니다.
- 배포 뒤 실제 사용량이 N3 응답 50건, TOPIK 완료 10건, FSRS 복습 5건에 도달해야 다음 콘텐츠 증량을 판단할 수 있습니다.

실행 순서는 [NEXT_DEVELOPMENT_PLAN_2026-08-19.md](./docs/00_overview/NEXT_DEVELOPMENT_PLAN_2026-08-19.md)를 따릅니다.
