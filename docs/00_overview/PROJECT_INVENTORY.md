# 프로젝트 폴더와 파일 관리

갱신: 2026-10-10 KST. 전체 경로는 [자동 파일 지도](PROJECT_FILE_CATALOG.md), 구현은 [코드 분석](../../PROJECT_CODEBASE_ANALYSIS.md), 운영 배포는 [현재 상태](CURRENT_STATE.md)를 기준으로 한다.

| 폴더 | 들어 있는 내용 | 정리 기준 |
| --- | --- | --- |
| `apps/web/src/pages` | 오늘·학습·문제·복습·기록, 계정과 TOPIK 화면 | `App.tsx`의 route·lazy import 확인 |
| `apps/web/src/features` | 퀴즈·청해·문자·TOPIK owner·학습 세션 | 화면 호출자와 공유 훅 확인 |
| `apps/web/src/components` | 공통 UI·발음·SRS 카드 | import와 재사용 경로 확인 |
| `apps/web/src/lib`, `hooks`, `stores`, `i18n` | API, Dexie, 음성, 동기화, 상태, ko/ja/en | 계정×트랙 격리와 오프라인 기록 보존 |
| `apps/web/src/sw.ts` | 활성 injectManifest Service Worker와 Push 처리 | `vite.config.ts`가 사용하는 실행 파일 |
| `apps/web/public`, `functions` | 브랜드/PWA 자산, Pages API proxy | manifest·HTML·CSS·proxy 참조 확인 |
| `apps/api/src/routes` | Hono/OpenAPI API와 호환 wrapper | `app.ts` 등록·wrapper 연결 확인; `*-oa`와 legacy 구현이 함께 쓰이는 경우 보존 |
| `apps/api/src/lib`, `middleware` | 채점·FSRS·학습 효과·보상·알림·인증·정책 | 활성 호출자와 거래 원자성 보존 |
| `apps/api/src/jobs`, `workflows` | FSRS 최적화·관찰 알림·콘텐츠 릴리스 | Worker entrypoint와 Wrangler binding 확인 |
| `packages/shared` | Zod DTO, FSRS, 트랙·활동·학습·음성 계약 | Web/API 공통 계약 |
| `packages/db/src/schema.ts` | Drizzle 데이터 모델 | SQL migration과 실제 DB가 우선 |
| `packages/db/drizzle-v2` | `0000–0030` migration 31개와 snapshot 8개 | 기존 DB 재현·복원에 필요하므로 전체 보존 |
| `packages/db/src/seed`, `content` | deterministic parser/builder, 자체 저작·출처·독립 리뷰 | 콘텐츠 hash·manifest·review 증적 보존 |
| `packages/db/src/ops` | fresh/upgrade·품질·release·backup/restore 검증 | package CLI와 테스트가 직접 실행하는 파일 포함 |
| `e2e` | Chromium/WebKit·모바일 흐름 및 시각 기준 | 회귀 테스트·snapshot은 운영 기능의 보호 장치 |
| `scripts` | 로컬 CI/CD·음성·관찰·배포·문서 검사 | `package.json` 호출자와 CLI 진입점 확인 |
| `docs/00_overview` | 현재 운영 계약·오류·릴리스·구현 기록 | 현재 안내를 우선; 날짜별 결과는 해당 시점의 증적 |
| `docs/history` | 현재 문서에서 분리한 과거 상태 | 현재 작업 지시로 사용하지 않음 |
| `docs/01_n5`–`07_topik` | seed가 읽는 학습 원문·fixture·v1 provenance | 버전이 오래돼도 parser와 checksum 입력이면 보존 |
| `.codex/skills`, `AGENTS.md` | 후속 Agent 작업 절차 | 운영·출처·품질·릴리스 계약 |
| `.github/workflows` | 비활성 Actions placeholder | `workflow_dispatch`, `if: false` 유지 |

재생성 가능한 `dist`, `playwright-report`, `test-results`, `.DS_Store`, `*.tsbuildinfo`는 참조·증적 보존 여부를 확인한 뒤 저장소 밖 휴지통으로 옮긴다. `node_modules`는 현재 실행 의존성이므로 일반 정리 때 제거하지 않는다.

`.wrangler`는 로컬 D1 상태를 포함하므로 cache 전체처럼 취급하지 않는다. `.artifacts`의 D1 백업·release/rollback·복구 bundle·source intake·quality/reviewer 자료는 보존한다. `.env*`, `.dev.vars`, 사용자 데이터와 증적 원문은 Git에서 제외한다.

새 파일·삭제·이동 후 `pnpm docs:catalog`를 실행한다. `pnpm docs:check`의 파일 지도 검사가 누락과 오래된 목록을 차단한다. 현재 폴더 구조는 package/import/배포 경로를 유지하며, 폴더 이동은 호출자·경로 수정과 영향 검사를 함께 수행한다.
