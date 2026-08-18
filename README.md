# JLPT · TOPIK 개인 학습 PWA

JLPT 일본어와 TOPIK 한국어를 한 계정에서 학습하는 React PWA입니다. 콘텐츠, 진행률, 퀴즈 응답, FSRS 복습, Google 브라우저 음성 상태를 Cloudflare Worker와 D1에 연결합니다.

## 릴리스 기준 — 2026-08-19 KST

운영 상태와 로컬 릴리스 후보를 혼동하지 않습니다.

| 구분 | 현재 기준 |
| --- | --- |
| production D1 | `nihongo-n3-prod-v2`, migration `0000–0023` |
| production Worker | `693837d0-70e0-40b7-9f7e-72487321b6f7` |
| production Pages | `9d8e6460-2e86-477c-8eb8-fc4c41491f4c` |
| production 콘텐츠 | manifest `content-v3-d102868e3d43b9b3c1a4`, TOPIK practice v2 300개 공개, v1 28개 보존·비공개 |
| 로컬 릴리스 후보 | migration `0024–0027`, 활동 API/UI, strict-level `weakest`, release-quality 연결, Google speech 계약 |
| 검토된 로컬 콘텐츠 초안 | `jlpt-n3-practice-v1-2026-08-19` 120문항, `topik-owner-batch5-2026-08-19` 20항목; 모두 미공개 |

`0024–0027`과 신규 콘텐츠 초안은 아직 위 production 기준선에 배포되지 않았습니다. 배포 전후 절차는 [2026-08-19 다음 개발 계획](./docs/00_overview/NEXT_DEVELOPMENT_PLAN_2026-08-19.md)을 따릅니다. 2026-08-09와 2026-08-17의 실제 production 기록과 rollback 기준은 [현재 상태](./docs/00_overview/CURRENT_STATE.md)에 보존합니다.

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

## 2026-08-19 로컬 후보의 핵심 계약

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

2026-08-19 집중 검증에서는 web unit 34파일/86테스트, web production build, Chromium·WebKit의 활동/퀴즈/TOPIK owner E2E 24/24가 통과했습니다. 이 E2E는 Google 일본어·한국어 음성 호출과 `/api/v1/audio/` 요청 0건을 함께 확인합니다. `verify:fresh`는 로컬 disposable D1을 `0000–0027`까지 재구성하지만 원격 write나 배포는 수행하지 않습니다.

문서 탐색은 [docs/README.md](./docs/README.md), 코드 구조는 [PROJECT_CODEBASE_ANALYSIS.md](./PROJECT_CODEBASE_ANALYSIS.md), 실제 상태는 [CURRENT_STATE.md](./docs/00_overview/CURRENT_STATE.md)를 기준으로 합니다.
