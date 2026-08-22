# JLPT · TOPIK 개인 학습 PWA

JLPT 일본어와 TOPIK 한국어를 한 계정에서 학습하는 React PWA입니다. 콘텐츠, 진행률, 퀴즈 응답, FSRS 복습, Google 브라우저 음성 상태를 Cloudflare Worker와 D1에 연결합니다.

## Production 기준 — 2026-08-23 KST

| 구분 | 현재 기준 |
| --- | --- |
| production D1 | `nihongo-n3-prod-v2`, migration `0000–0027` |
| production Worker | `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872` |
| production Pages | `https://1c3bba90.nihongo-n3.pages.dev` |
| web source SHA | `595fcd735824116fff6047e9e59f1d6acd90cb46` |
| Worker/content release SHA | `3485c6ef8addda3cd3e209730646c296175cf3c9` |
| production 콘텐츠 | TOPIK practice v2 300, JLPT N3 practice 120, TOPIK owner Batch 5 20 모두 published |

2026-08-19 배포에서 `jlpt-n3-practice-v1-2026-08-19`은 120개 quality link, `topik-owner-batch5-2026-08-19`은 20개, historical `topik-practice-v2-2026-08-17`은 300개 link와 함께 published가 되었습니다. 배포 기록과 이후 관찰 계획은 [2026-08-19 실행 계획](./docs/00_overview/NEXT_DEVELOPMENT_PLAN_2026-08-19.md), 과거 rollback 기준은 [현재 상태](./docs/00_overview/CURRENT_STATE.md)에 보존합니다.

## 구조

```text
자체 저작 원본/seed → packages/db → Cloudflare D1
                                      ↓
apps/web React PWA ← apps/api Hono Worker ← packages/shared DTO·FSRS
```

- `apps/web`: TanStack Query, Zustand, Dexie 기반 학습 UI와 오프라인 활동 큐
- `apps/api`: 인증, 트랙 격리, 콘텐츠·진도·FSRS·활동 집계 API
- `packages/shared`: Zod DTO, FSRS, 학습 활동과 퀴즈 계약
- `packages/db`: Drizzle schema, migration, deterministic seed, fresh verifier
- `e2e`: Chromium/WebKit 핵심 학습 흐름과 음성 정책 회귀 검사

## 2026-08-19 production 계약

- `POST /api/v1/activity/events`: 최대 100개 이벤트를 idempotent batch로 수신합니다. 브라우저는 Dexie에 먼저 저장한 뒤 계정×트랙 범위에서 재전송합니다.
- `GET /api/v1/activity/summary?window=7d|30d`: 완료·정답·복습·음성 결과를 트랙/급수/영역/모드별로 집계합니다.
- 퀴즈 생성은 선택적 `strategy: "random" | "weakest"`를 받습니다. 기본 `random` 요청은 기존 wire shape를 유지하며, `weakest`도 요청 JLPT 급수 밖으로 fallback하지 않습니다.
- TOPIK 다음 학습은 `복습 예정 → 미완료 owner 항목 → 최근 30일 취약 영역` 순서입니다.
- `0026`은 문제별 quality audit을 `content_releases`에 연결합니다. 정확한 승인 링크 집합이 없으면 publication trigger가 공개를 차단합니다.

## 오디오 정책

발음은 브라우저의 Google 음성만 사용합니다. R2 발음의 수집·생성·저장·조회·재생·fallback은 금지합니다. 기존 `/api/v1/audio/*`와 관리자 생성 경로는 호환 목적으로 `410 Gone`을 유지합니다. `0027`의 신규 계약은 provider `google-browser`, 상태 `ready|unavailable`만 허용하며 R2 asset/key 필드를 두지 않습니다. report/evidence용 R2는 발음 경로가 아닙니다.

## 로컬 실행과 검증

```bash
CI=true pnpm install --frozen-lockfile
pnpm dev:api
pnpm dev:web

pnpm verify:ci
pnpm docs:check
pnpm -F @nihongo-n3/db question:quality
pnpm -F @nihongo-n3/db content:contract:verify
pnpm -F @nihongo-n3/db content:control-plane:verify
```

2026-08-23 실제 Production에서 TOPIK Google 한국어 음성의 첫 클릭 실패를 재현했습니다. 당시 테스트는 음성 목록이 즉시 준비된 fixture만 사용해 Chromium의 비동기 `voiceschanged` 경합을 놓쳤습니다. 수정본은 Google 한국어 음성을 기다리고 실제 `onend` 이후에만 성공을 기록하며, 단위·전체 기능·Chromium/WebKit 회귀와 Production 사후 검증을 거쳐 Pages에 반영했습니다. 운영 증거와 현재 반영 상태는 [음성 장애 기록](./docs/00_overview/TOPIK_GOOGLE_SPEECH_INCIDENT_2026-08-23.md)을 확인하십시오. `verify:fresh`는 로컬 disposable D1을 `0000–0027`까지 재구성하며 원격 write는 수행하지 않습니다.

문서 탐색은 [docs/README.md](./docs/README.md), 코드 구조는 [PROJECT_CODEBASE_ANALYSIS.md](./PROJECT_CODEBASE_ANALYSIS.md), 실제 상태는 [CURRENT_STATE.md](./docs/00_overview/CURRENT_STATE.md)를 기준으로 합니다.
