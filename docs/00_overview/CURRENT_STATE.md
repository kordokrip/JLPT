# 현재 구현 상태

기준일: 2026-08-24 KST. 새 노트북에서 상태를 복원할 때 가장 먼저 읽는 production 운영 기준입니다.

> 2026-08-24 음성 장애를 다시 조사해 같은 언어 fallback 제거뿐 아니라 첫 클릭 전 비동기 voice 대기와 설치형 PWA의 이전 JS 잔존을 확인했습니다. 현재 코드는 click task 안에서 즉시 재생하고 새 service worker가 기존 client를 한 번 갱신하도록 복구했습니다. 실제 배포 상태는 아래 릴리스 기록과 음성 장애 기록을 기준으로 판단합니다.

현재 오류와 배포 차단 조건의 단일 원장은 [오류·회귀 차단 원장](ERROR_LEDGER_2026-08-23.md)입니다. 미실행·인프라 실패·mock 결과는 통과로 간주하지 않습니다.

GitHub는 공개 원격에서 **commit·branch·tag 보관** 범위로만 사용합니다. 저장소 Actions는 실행이 차단된 상태로 운영하며, 자동 CI/CD 대신 로컬 검증 종료 코드와 Cloudflare deployment ID를 [로컬 형상관리·릴리스 원장](LOCAL_VERSION_CONTROL_AND_RELEASE_LEDGER_2026-08-23.md)에 기록합니다.

CI/CD 비사용 운영 기준은 [Git 무료 모드 운영 매뉴얼](GIT_FREE_MODE_OPERATING_MANUAL_2026-08-23.md)에 정리했습니다.

운영·버그·리팩터링 추적은 루트 `AGENTS.md`, 프로젝트 스킬 `.codex/skills/project-operations-steward`, [운영관리 runbook](OPERATIONS_MANAGEMENT_RUNBOOK.md)을 단일 절차로 사용합니다. `pnpm ops:status`는 로컬 계약을, `pnpm ops:status:remote`는 Git·Cloudflare Production의 읽기 전용 상태를 JSON artifact로 기록합니다.

## 상태 요약

| 구분 | Production 기준 |
| --- | --- |
| D1 migration | `0000–0027` |
| Worker | `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872` |
| Pages | `https://9cc58a1f.nihongo-n3.pages.dev` (canonical `https://nihongo-n3.pages.dev`) |
| web source SHA | `2bd657e96d8a43c6d28efe414acd468c1abd0861` |
| Worker/content release SHA | `3485c6ef8addda3cd3e209730646c296175cf3c9` |
| 콘텐츠 release | N3 120, TOPIK owner Batch 5 20, historical TOPIK practice v2 300 모두 published |
| release control | quality requirements/links와 G0–G4 production 연결 |
| 다음 증량 후보 | Preview만 published: N2 60, N1 60, TOPIK owner Batch 6 40; Production 미반영 |

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

## 2026-08-23 다음 증량 Preview

- `jlpt-n2-practice-v1-2026-08-23`: 60문항, quality link 60, Preview published.
- `jlpt-n1-practice-v1-2026-08-23`: 60문항, quality link 60, Preview published.
- `topik-owner-batch6-2026-08-23`: 3–6급 40항목, quality link 40, Preview published.
- N2/N1은 4개 모드×15, 모드별 난이도 1–5×3, 전체 정답 위치 `15/15/15/15`입니다.
- TOPIK Batch 6은 급수별 10, 5영역×2이며 선택형 정답 위치는 급수별 `2/2/2/2`입니다. listening 8개만 `google-browser` binding을 가집니다.
- Preview 기준 TOPIK owner는 1–6급 각각 30개, 급수·영역별 6개입니다.
- Preview의 release-quality link `60/60/40`, G0–G4 `5/5/5`, release job `6/6/6`, FK 0, idempotent reseed를 확인했습니다.
- 실제 Batch 6 item으로 `완료 → progress → FSRS card → review log → activity event`를 원격 Preview에서 대조했습니다.
- Preview Worker `4c6846d8-7cde-4c2c-916b-533a2db6d76a`; Pages는 UI 변경이 없어 재배포하지 않았습니다.
- 직전 Preview Worker `0de3eaeb-b44c-4eda-b333-e75c639e39a1`은 rollback 대상으로 보존했습니다.

상세 증적은 [2026-08-23 다음 콘텐츠 증량 릴리스 기록](NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md)에 있습니다.

## 브라우저 음성 정책

발음은 Google 브라우저 음성을 우선하고, 없으면 같은 언어의 기기 음성을 사용합니다. 한국어에는 `ko-*`, 일본어에는 `ja-*`만 허용합니다. R2 발음 수집·생성·저장·조회·재생·fallback은 금지합니다. production의 R2 pronunciation 참조는 0이며 legacy `/api/v1/audio/*`와 관리자 생성 경로는 `410 Gone`입니다. Production speech contract는 `ready|unavailable`만 기록하고 실제 음성 binary를 저장하지 않습니다. report/evidence R2는 발음 경로가 아닙니다.

`0027`의 provider `google-browser`와 API의 `kind: "google"`은 데이터/클라이언트 호환용 식별자입니다. 런타임에서 Google 이름을 강제한다는 뜻이 아닙니다. 재생 click에서는 voice 준비를 기다리지 않고 같은 task 안에서 즉시 `speak()`를 호출합니다. 비동기 voice list는 background에서 다음 재생을 위해 준비하며 실제 `onend` 이후에만 `played`를 기록합니다.

Pages `1c3bba90-8990-472b-8bf2-12a08759597f` 배포 당시에는 동일 언어 fallback이 없고 실제 가청 확인도 없었습니다. 그 배포를 검증 완료라고 보고한 판단은 잘못이며, 복구 릴리스는 mock 자동화·실제 Chrome callback·사용자 가청 결과를 구분해 기록합니다.

## 배포 후 검증 기록 — 2026-08-19

- web unit: 34파일, 86테스트 통과
- web production build와 typecheck 통과
- focused Playwright: `learning-activity.spec.ts`, `quiz-modes.spec.ts`, `topik-owner-curriculum.spec.ts`를 Chromium/WebKit에서 24/24 통과
- 브라우저 검증에 Google 우선 동일 언어 일본어·한국어 speech와 `/api/v1/audio/` 요청 0건 포함
- API route tests에 event idempotency/track guard/summary/strict-level weakest 포함
- DB tests에 migration order, release link gate, N3/TOPIK 140개 review coverage, browser-speech/R2 금지 contract 포함
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

### 2026-08-23

- TOPIK/JLPT Google browser voice의 비동기 준비와 재생 종료 telemetry 수정
- Pages `1c3bba90-8990-472b-8bf2-12a08759597f` (`https://1c3bba90.nihongo-n3.pages.dev`)
- web source SHA `595fcd735824116fff6047e9e59f1d6acd90cb46`
- D1 migration/seed와 Worker는 변경하지 않음
- rollback Pages `7b0e9050-f36c-42a3-aab9-7d09f70df2af`; Worker `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872` 유지
- Production 직전 음성 단위 `10/10`, 영향 기능 E2E `44/2/0`, typecheck, OpenAPI, build, fresh D1 통과. 단, 음성 테스트는 mocked voice이므로 실제 가청 재생 증거가 아니며 배포 승인에 사용한 것은 오류였습니다.
- 배포 후 canonical smoke 5회, remote DB/FK, Worker `7/7`, auth proxy, R2 pronunciation 0 통과

### 2026-08-23 다음 콘텐츠 증량 후보

- source final draft SHA `e95d4a7c814a850c770108183328904c85e4ea0bd4588a851ab97e7a5c33c070`
- 서로 결과를 공유하지 않은 Reviewer A/B가 최종 160개 전부 승인
- 레거시 정리 후 로컬 CI: ops 8, DB 112, web 88, API 131, fresh D1, content contract/control plane 통과
- Preview D1/Worker 반영과 원격 품질·거래·Chromium/WebKit 각 14개 E2E 통과
- 음성 회귀 복구 릴리스 전이므로 Production seed와 Worker 배포를 실행하지 않음

### 2026-08-24 형상관리 문서 배포

- Pages `485b9f00-a8b1-4bbb-9001-a238651fb212` (`https://485b9f00.nihongo-n3.pages.dev`)
- source SHA `b8d41acb1cbd77da1a428ade0d07c27c910f84e3`
- GitHub Actions 비활성화와 로컬 형상관리 문서 변경만 포함하며 D1/Worker/음성 런타임은 변경하지 않았습니다.
- 이번 음성 추가 복구의 직전 Production Pages이므로 rollback 대상으로 보존합니다.

### 2026-08-24 음성 추가 복구 — Production 배포 완료

- JLPT 공용 음성과 TOPIK 한국어 음성의 첫 클릭에서 비동기 voice 대기를 제거하고 즉시 `speak()`를 호출합니다.
- 음성 시작 신호가 8초 안에 없으면 실패로 종료해 무한 대기를 막습니다.
- PWA service worker는 즉시 update를 확인하고, 배포 전부터 기존 worker가 제어하던 client만 `controllerchange` 때 1회 reload합니다. 첫 방문자는 초기 설치 때 reload하지 않습니다.
- 1차 Preview `efbc8db5`에서 신규 client까지 강제 reload한 결함을 발견해 Production을 중단하고 위 계약으로 수정했습니다. 수정 뒤 Web `93/93`, 영향 E2E Chromium/WebKit `50 passed / 2 skipped`, 전체 E2E `171 passed / 32 skipped`로 재검증했습니다.
- 최종 Preview는 `d53c3b4f-0c51-4a2b-9cc8-e5f35edcf5a0`, Production은 `9cc58a1f-4772-4129-b90d-c819ca20d700`, source는 `2bd657e96d8a43c6d28efe414acd468c1abd0861`입니다. rollback Pages는 `485b9f00-a8b1-4bbb-9001-a238651fb212`입니다.
- Production 실제 Chrome에서 일본어·한국어 모두 클릭 0.3초와 2.8초 뒤 `재생 중`을 확인하고 `onend` 정상 종료, alert 0건, console error 0건을 확인했습니다. 물리 스피커 가청 여부는 자동 lifecycle 증거와 구분합니다.
- Production 영향 기능은 Chromium/WebKit `44 passed / 8 skipped / 0 failed`입니다. JLPT N1/N2, 퀴즈 4모드, 청해, SRS, TOPIK 첫 한국어 재생·owner→FSRS, PWA·offline을 포함합니다. Production 음성 전용 검사는 `2/2` 통과했습니다.
- 배포 asset은 `assets/index-DprkUCgI.js`, `/audio-qa`와 `/api/v1/auth/config`는 `200`, legacy `/api/v1/audio/test`는 `410`, 원격 R2 발음 참조 합계는 `0`입니다.
- 이 변경은 D1 schema/data와 Worker를 변경하지 않은 Pages 전용 복구입니다.
- Production D1 checksum backup을 만들고 임시 로컬 D1에 `65` regular tables를 복원해 행 수·FTS·FK를 대조했습니다. 첫 drill에서 발견한 output buffer와 immutable trigger replay 문제는 restore 도구에서 수정하고 재실행해 통과했습니다.
- 현재 HEAD로 생성한 새 manifest를 운영 D1에 직접 비교하면 문서 source hash drift 때문에 차단 검사 `45`건이 실패합니다. 운영 콘텐츠 source `3485c6ef8addda3cd3e209730646c296175cf3c9`, manifest `content-v3-d102868e3d43b9b3c1a4`, 실제 운영 seed run에 고정한 remote verifier는 `280/280` 통과했습니다. 운영 D1은 이번 Pages 배포에서 재시드하지 않았고 drift는 `INC-DATA-024`로 추적합니다.

## 다음 단계

음성 복구 Pages 배포는 완료했습니다. 다음 실행은 실제 사용자 장치의 가청 확인과 speech telemetry를 사후 관찰하고, 현재 HEAD 문서 hash와 운영 콘텐츠 manifest를 source SHA에 고정해 검증하도록 verifier 인터페이스를 보강하는 것입니다. 운영 작업은 먼저 `pnpm ops:status`, 구현 종료 후 `pnpm ops:verify`, 배포 전후 `pnpm ops:status:remote`로 증적을 남깁니다. N2/N1/TOPIK 증량 재개 순서와 D+1/D+7/D+30의 `50/10/5` 판정은 [2026-08-23 증량 릴리스 기록](NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md)을 따릅니다.

## 2026-08-23 저장소 정리

- 현재 문서로 대체된 2026-07-29~08-19 이관 안내·완료 실행계획 7개와 잘못 남아 있던 루트 Figma attribution 파일을 제거했습니다.
- TOPIK practice v2와 owner curriculum에 대체된 TOPIK I Preview 후보 전용 문서·JSON·seed·verifier·test를 제거했습니다.
- 호출자가 없던 legacy R2 audio prefetch no-op과 그 전용 테스트를 제거했습니다. learner API의 `/api/v1/audio/*` 및 관리자 음성 생성 `410 Gone` 차단은 유지합니다.
- 로컬 임시 `.m4a` 발음 파일과 Playwright 생성 보고서는 저장소 밖 휴지통으로 이동했습니다. source-of-truth 테스트와 release evidence는 보존했습니다.

## 2026-08-24 운영관리 기준선

- 전담 `project-operations-steward` Sub Agent 스킬과 루트 `AGENTS.md`를 추가해 모든 후속 작업이 현재 상태·오류 원장·runbook·릴리스 원장을 먼저 읽도록 고정했습니다.
- 로컬 상태 명령 `pnpm ops:status`, 전체 로컬 gate `pnpm ops:verify`, 원격 읽기 전용 상태 명령 `pnpm ops:status:remote`를 추가했습니다.
- 원격 상태 명령은 Git branch SHA, Production Pages deployment/source, Worker version, D1 migration, Pages/audio/auth/legacy smoke와 Production D1의 R2 발음 참조 0건을 확인합니다.
- GitHub Actions는 계속 비활성 placeholder이고, 검증 결과는 `.artifacts/operations/ops-status-latest.json`과 history에 저장하되 Git에는 포함하지 않습니다.
- Production backup, recovery, release, source-intake, quality evidence는 보존했습니다. 추적되지 않는 `.DS_Store` 3개, 내용 없는 legacy `apps/d1-backup` 의존성/cache, 검증 후 재생성 가능한 web `dist`와 Playwright report/test-results를 `/Users/sunghokang/.Trash/JLPT-cleanup-2026-08-24-ops`로 이동해 복구 가능하게 정리했습니다.
