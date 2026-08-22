# 현재 구현 상태

기준일: 2026-08-23 KST. 새 노트북에서 상태를 복원할 때 가장 먼저 읽는 production 운영 기준입니다.

> 2026-08-23 TOPIK Google 한국어 음성의 첫 클릭 실패를 Production에서 재현했습니다. 코드는 수정하고 로컬 전수 회귀와 Pages preview 검증을 통과했지만 이 문서 상단의 Production Pages에는 아직 반영하지 않았습니다. 원인·운영 집계·검증 범위는 [TOPIK Google 한국어 음성 장애 기록](TOPIK_GOOGLE_SPEECH_INCIDENT_2026-08-23.md)을 따릅니다.

## 상태 요약

| 구분 | Production 기준 |
| --- | --- |
| D1 migration | `0000–0027` |
| Worker | `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872` |
| Pages | `https://7b0e9050.nihongo-n3.pages.dev` |
| source release SHA | `3485c6ef8addda3cd3e209730646c296175cf3c9` |
| 콘텐츠 release | N3 120, TOPIK owner Batch 5 20, historical TOPIK practice v2 300 모두 published |
| release control | quality requirements/links와 G0–G4 production 연결 |

## Production 콘텐츠

manifest `content-v3-d102868e3d43b9b3c1a4`는 26개 source와 canonical 6,501행을 생성합니다.

| 범위 | Production 수량/상태 |
| --- | --- |
| JLPT N5 | 어휘 700, 문법 55, 한자 103 |
| JLPT N4 | 어휘 548, 문법 98, 한자 164 |
| JLPT N3 | 어휘 2,052, 문법 163, 한자 275 |
| 공용/직무/계획 | 예문 1,100, 직무 어휘 82, 주차 계획 52 |
| JLPT N2 | Batch 1–5, 583 canonical행 |
| JLPT N1 | Batch 1–4, 286 canonical행 |
| TOPIK owner | Batch 1–5, 140 unit + 140 item; Batch 5는 1·2급 20개 확장 |
| TOPIK practice | v2 300 공개, v1 28 보존·비공개 |

TOPIK v2 선택형 네 영역은 각각 정답 위치 `15/15/15/15`이고 쓰기 60개는 서술형입니다. 정적 JLPT 독해 분포는 N1 `5/5/5/5`, N2 `10/10/9/9`, N3 `3/3/2/2`입니다.

## Production migration `0024–0027`

- `0024_learning_activity_events.sql`: `(user_id,event_id)` 중복 차단. `content_opened`, `content_completed`, `quiz_answered`, `review_rated`, `speech_attempted`만 저장하고 문제 원문/개인정보는 저장하지 않습니다.
- `0025_jlpt_practice_questions.sql`: 버전형 자체 저작 JLPT bank. 3개 언어 prompt/choice/explanation, 정답 위치, listening script를 보관하며 기본 미공개입니다.
- `0026_release_quality_links.sql`: release별 정확한 audit 요구량과 audit 링크를 추가합니다. 누락·실패·서로 같은 reviewer·다른 버전 링크가 있으면 공개 trigger가 중단합니다.
- `0027_google_speech_contract.sql`: `content_speech_bindings`를 provider `google-browser`, state `ready|unavailable`로 한정합니다. R2 key/asset 필드는 없고 legacy `content_audio_bindings` 신규 insert는 차단됩니다.

release-link trigger는 `0026`에서만 생성되므로 `0025 → 0026` migration 순서가 fresh/upgrade 모두에서 유효합니다.

## 활동 API와 데이터 바인딩

`POST /api/v1/activity/events`는 1–100개 idempotent event batch를 받고 `{accepted,duplicates}`를 반환합니다. 인증된 사용자의 현재 track과 각 event의 `learning_track`이 다르면 거부합니다. `GET /api/v1/activity/summary?window=7d|30d`는 totals와 track/level/section/mode groups만 반환합니다.

웹은 Dexie v6에 queue-first로 저장합니다. 처리 중 종료된 항목을 복구하고, offline/실패 시 보존하며, 동일 event ID로 재전송합니다. 큐와 조회 캐시는 계정×트랙으로 격리됩니다. 퀴즈 응답, TOPIK complete, FSRS rating은 서버 데이터 변경과 같은 transaction에서 각각 activity event를 기록합니다.

TOPIK 다음 행동 순서는 `due review → incomplete owner item → weakest area`입니다. `weakest`는 최근 30일 activity를 사용합니다.

## 퀴즈 전략과 strict-level 규칙

기존 퀴즈 요청/응답은 유지됩니다. `strategy`는 선택적 `random|weakest`이고 기본은 `random`입니다. 웹은 random일 때 해당 필드를 보내지 않습니다. `weakest`는 최근 30일 오답을 우선하되 요청 급수 내부에서만 선택합니다. 풀이 가능한 문제가 부족해도 다른 JLPT 급수로 fallback하지 않고 명시적으로 실패합니다.

## 2026-08-19 Production 콘텐츠 release

- `jlpt-n3-practice-v1-2026-08-19`: 한자 읽기 60, 듣기 60. 각 영역 `15/15/15/15`, quality link 120개, published.
- `topik-owner-batch5-2026-08-19`: 1급 10, 2급 10. 급수별 다섯 영역 각 2개, quality link 20개, published.
- `topik-practice-v2-2026-08-17`: 기존 audit 300개를 historical release에 연결, published.
- 서로 다른 두 adversarial reviewer artifact와 자동 validator 결과가 실제 release-quality link에 연결됐습니다.
- TOPIK listening 4개와 JLPT listening script만 Google 브라우저 음성 대상입니다.

이후 콘텐츠도 fresh schema나 review test만으로 공개하지 않으며 release-quality link, G0–G4, preview, 명시적 production 승인을 요구합니다.

## Google-only 음성 정책

발음은 Google 브라우저 음성만 사용합니다. R2 발음 수집·생성·저장·조회·재생·fallback은 금지합니다. production의 R2 pronunciation 참조는 0이며 legacy `/api/v1/audio/*`와 관리자 생성 경로는 `410 Gone`입니다. Production speech contract는 `ready|unavailable`만 기록하고 실제 음성 binary를 저장하지 않습니다. report/evidence R2는 발음 경로가 아닙니다.

2026-08-23 수정본은 Chromium의 비동기 voice list를 최대 2.5초 기다리고 실제 `onend` 이후에만 `played`를 기록합니다. Production 최근 30일 집계는 TOPIK `played 0 / unavailable 13 / error 0`이므로, 2026-08-19의 fixture 기반 통과 기록만으로 실제 재생 성공을 주장하지 않습니다.

## 배포 후 검증 기록 — 2026-08-19

- web unit: 34파일, 86테스트 통과
- web production build와 typecheck 통과
- focused Playwright: `learning-activity.spec.ts`, `quiz-modes.spec.ts`, `topik-owner-curriculum.spec.ts`를 Chromium/WebKit에서 24/24 통과
- 브라우저 검증에 Google 일본어·한국어 speech와 `/api/v1/audio/` 요청 0건 포함
- API route tests에 event idempotency/track guard/summary/strict-level weakest 포함
- DB tests에 migration order, release link gate, N3/TOPIK 140개 review coverage, Google-only speech contract 포함
- remote DB verifier와 TOPIK v2 verifier 통과
- remote question quality 332개 검사, 실패 0건
- remote R2 pronunciation 참조 0건
- Chromium·WebKit production E2E 통과

같은 release gate는 다음 배포 직전에도 다시 실행해야 합니다.

```bash
pnpm verify:ci
pnpm docs:check
pnpm -F @nihongo-n3/db question:quality
pnpm -F @nihongo-n3/db content:contract:verify
pnpm -F @nihongo-n3/db content:control-plane:verify
```

## Production 릴리스 기록

### 2026-08-09

- D1 migration 0020–0021, manifest `content-v3-d102868e3d43b9b3c1a4`
- Worker `b959a270-7b2a-46a3-83dc-615ed63f730d`
- Pages `9d8e6460-2e86-477c-8eb8-fc4c41491f4c`
- 23-table backup/restore drill, remote FK/FTS/manifest/R2=0, smoke 통과
- rollback Worker `6e3aad0d-1584-44c5-a46a-f54b968ce606`, Pages `c93f86ba-5b0a-47af-bb30-28f38da4a6b1`

### 2026-08-17

- D1 migration 0022–0023, TOPIK practice v2 300 공개, v1 비공개
- backup `.artifacts/d1-backups/topik-v2-2026-08-17`과 restore drill 통과
- Worker `693837d0-70e0-40b7-9f7e-72487321b6f7`; Pages는 2026-08-09 deployment 유지
- remote question verifier, R2=0, Worker/Pages smoke 통과
- rollback Worker `b959a270-7b2a-46a3-83dc-615ed63f730d`

### 2026-08-19

- D1 migration 0024–0027
- Worker `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872`
- Pages `https://7b0e9050.nihongo-n3.pages.dev`
- source SHA `3485c6ef8addda3cd3e209730646c296175cf3c9`
- 세 release의 quality link 120/20/300 및 published 상태 확인
- remote DB/TOPIK verifier, question quality 332/0, R2 pronunciation 0, Chromium/WebKit production E2E 통과

## 다음 단계

[TOPIK_GOOGLE_SPEECH_INCIDENT_2026-08-23.md](TOPIK_GOOGLE_SPEECH_INCIDENT_2026-08-23.md)의 음성 복구·preview·운영 확인을 우선 수행한 뒤 [NEXT_DEVELOPMENT_PLAN_2026-08-19.md](NEXT_DEVELOPMENT_PLAN_2026-08-19.md)의 사후 관찰 순서를 따릅니다. 다음 release도 어느 gate에서든 실패하면 publication을 중단하고 draft를 유지합니다.
