# JLPT 워크스페이스 통합 분석 보고서

기준일: 2026-05-28 KST  
대상 경로: `/Users/sungho-kang/Desktop/JLPT`  
직접 수정 범위: 이 문서(`docs/PROJECT_ANALYSIS_2026.md`)만 해당

이 보고서는 현재 로컬 워크스페이스의 실제 파일 상태를 기준으로 A-Z 진척도, 기존 분석과의 불일치, 바로 실행 가능한 개선 항목을 정리한다. 앱 코드, DB, 인프라 설정은 변경하지 않았다.

---

## 1. Executive Summary

### 1-1. 현재 구조 요약

현재 워크스페이스는 학습용 마크다운만 있는 폴더가 아니다. 실제 구조는 `apps/web`, `apps/api`, `packages/db`, `packages/shared`, `packages/content`, `.github/workflows`, `docs`를 포함한 pnpm 모노레포다.

확인된 주요 구성:

- 프론트엔드: `apps/web`의 React + Vite + PWA 앱
- 백엔드: `apps/api`의 Cloudflare Workers + Hono + OpenAPI 라우트
- DB/시드: `packages/db`의 Drizzle 스키마, 마이그레이션, Markdown 파서, D1 시드 파이프라인
- 공유 계약: `packages/shared`의 타입, Zod 스키마, FSRS 래퍼
- 콘텐츠 메타 패키지: `packages/content`
- 원천 문서: `docs` 하위의 JLPT N5-N3 학습 자료와 운영 문서
- CI/CD: `.github/workflows` 하위 7개 워크플로

### 1-2. 이전 분석 대비 핵심 정정

이전 분석 또는 기존 문서에 남아 있던 일부 판단은 현재 파일 상태와 맞지 않는다.

| 항목 | 기존/이전 판단 | 현재 확인 결과 | 판정 |
|---|---|---|---|
| 워크스페이스 성격 | 학습 마크다운 중심 구조로 앱 코드가 없거나 부차적 | 실제로 앱, API, DB, 공유 패키지, CI가 있는 모노레포 | 정정 필요 |
| 콘텐츠 변경 감시 | `content-update.yml`이 루트 md만 감시 | 현재 `docs/**/*.md`와 `packages/db/drizzle/**`를 감시 | 리스크 제거 |
| 전체 타입체크 | 콘텐츠 패키지 설정 누락으로 실패한다는 과거 판단 | `packages/content/tsconfig.json` 존재, `pnpm -r typecheck` 통과 | 정정 완료 |
| FSRS 구현 위치 | API/web 내부 구현체로 해석 | `apps/api/src/lib/fsrs.ts`, `apps/web/src/lib/fsrs-client.ts`는 `packages/shared/src/fsrs.ts` 재수출 | 정정 필요 |
| FSRS 개인화 | 구현 완료처럼 보일 수 있음 | `FSRS_OPTIMIZER_URL` 없으면 최적화 스킵, weight 검증은 FSRS-6 21개 기준으로 강화됨 | 부분완료 |
| 운영 문서 경로 | 루트 md 파일명 전제 | 실제 원천은 `docs/...` 하위 | 후속 정리 필요 |

### 1-3. 종합 판단

기술 구현의 골격은 상당히 진행되어 있다. 웹앱, API, DB 스키마, 시드 파이프라인, PWA/오프라인 기반, CI 파일은 실제로 존재한다. 현재 가장 큰 병목은 기능 부재보다 OpenAPI 명세 누락 라우트, 일부 운영 문서의 구식 경로, FSRS 개인화 서비스 미연결, 일부 보고서의 기준일/상태 불일치다.

---

## 2. Evidence Snapshot

### 2-1. 명령 기반 근거

| 확인 항목 | 결과 |
|---|---|
| `pnpm -r typecheck` | 통과 |
| `find docs -type f -name '*.md' -print0 \| xargs -0 wc -l` | 23개 Markdown, 총 15,324 lines |
| `.github/workflows` | 7개: `audit.yml`, `backup-d1.yml`, `codeql.yml`, `content-update.yml`, `deploy-api.yml`, `deploy-web.yml`, `e2e.yml` |
| `git status --short` | 현재 경로에서 실패: `.git` 저장소가 감지되지 않음 |
| `pnpm -F @nihongo-n3/shared exec node -e "import('ts-fsrs').then(m => console.log(m.default_w.length))"` | `ts-fsrs`의 `default_w` 길이 21 확인 |

### 2-2. 콘텐츠 분량

| 파일 | Lines | 역할 |
|---|---:|---|
| `docs/01_n5/03_kanji.md` | 181 | N5 한자 |
| `docs/01_n5/04_vocab.md` | 903 | N5 어휘 |
| `docs/01_n5/05_grammar.md` | 633 | N5 문법 |
| `docs/02_n4/06_kanji.md` | 357 | N4 한자 |
| `docs/02_n4/07_vocab.md` | 790 | N4 어휘 |
| `docs/02_n4/08_grammar.md` | 1,247 | N4 문법 |
| `docs/03_n3/09_kanji.md` | 655 | N3 한자 |
| `docs/03_n3/10A_vocab_part1.md` | 1,451 | N3 어휘 1 |
| `docs/03_n3/10B_vocab_part2.md` | 1,611 | N3 어휘 2 |
| `docs/03_n3/11_grammar.md` | 1,235 | N3 문법 |
| `docs/04_supplement/12_example_sentences.md` | 1,506 | 예문 |
| `docs/04_supplement/A_sysprog_vocab_500.md` | 170 | 직무/시스템 어휘 |
| `docs/04_supplement/02_pronunciation_kana.md` | 287 | 발음/가나 |
| `docs/04_supplement/C_self_check_16weeks.md` | 63 | 16주 자가진단 |
| 기타 운영/분석 문서 | 4,235 | 상태 보고서, 로드맵, 운영 가이드 등 |

### 2-3. 코드/파이프라인 근거

- `packages/db/src/seed/constants.ts`의 `CONTENT_PATHS`는 현재 `docs/...` 하위 경로를 참조한다.
- `packages/db/src/seed/seed-diff.ts`의 `SOURCE_FILE_MAP`은 vocab, grammar, kanji, sentences, sysprog 12개 소스의 변경분 시드를 처리한다.
- `CONTENT_PATHS.selfCheck`는 존재하지만 `SOURCE_FILE_MAP`에는 포함되지 않는다. 현재로서는 의도된 비시드 문서인지 확인이 필요하다.
- `apps/api/src/index.ts`는 `OpenAPIHono` 기반이며 `/openapi.json`, `/api/docs`를 제공한다.
- `apps/api/src/routes/*-oa.ts`는 OpenAPI 래퍼 또는 명세 라우트로 구성되어 있다.
- `apps/api/src/lib/fsrs.ts`, `apps/web/src/lib/fsrs-client.ts`는 FSRS 구현체가 아니라 `@nihongo-n3/shared/fsrs` 재수출 계층이다.
- `apps/api/src/jobs/optimize-fsrs.ts`는 외부 optimizer URL이 없으면 최적화 전체를 스킵한다.
- `apps/api/src/jobs/optimize-fsrs.ts`의 `isValidWeights()`는 FSRS-6 21개 weight와 FSRS-5 19개 legacy weight만 허용한다. 19개 응답은 저장 전 21개로 보정한다.
- Figma Make 관련 커뮤니티 보고에서는 `package.json` 등 로컬 실행 설정이 다운로드에 빠지는 사례가 반복된다. 루트 `package.json`은 현재 `nihongo-n3-monorepo` 운영 manifest로 재정의되었고, Figma 초기 산출물은 `apps/figma-export-archive/`에 격리되었다.
- `@hono/zod-openapi` 공식 패턴은 `createRoute()`로 route를 정의하고 `app.openapi(route, handler)`로 등록하는 방식이다. 기존 Hono 라우트를 `app.route()`로 마운트한 wrapper는 실제 `/openapi.json` 스키마 완성도를 보장하지 않는다.

---

## 3. A-Z Progress Matrix

| Letter | 영역 | 현재 상태 | 근거 | 판정 | 다음 액션 |
|---|---|---|---|---|---|
| A | Architecture | pnpm 모노레포와 앱/API/DB/shared 분리, root manifest 정리 완료 | `pnpm-workspace.yaml`, `apps/*`, `packages/*` | 완료 | Figma archive 유지 여부만 후속 결정 |
| B | Backend API | Hono + OpenAPI 기반 API 구성, wrapper 라우트 명세 공백 존재 | `apps/api/src/index.ts`, `routes/*-oa.ts` | 부분완료 | 모든 라우트를 `createRoute()` + `app.openapi()`로 통일 |
| C | Content Docs | N5-N3 및 보조 자료 충분 | `docs` 23개 md, 15,324 lines | 완료 | 구식 파일명 문서 정리 |
| D | Database | Drizzle 스키마와 마이그레이션 존재 | `packages/db/src/schema.ts`, `drizzle/` | 완료 | 원격 검증 절차 문서화 |
| E | Edge Infra | Workers, D1, R2, Cron 설정 존재 | `apps/api/wrangler.toml` | 완료 | 실제 계정/시크릿 상태는 배포 전 별도 확인 |
| F | Frontend | React PWA 학습 페이지 구성 | `apps/web/src/pages`, `components`, `stores` | 완료 | UX/i18n 잔여 문자열 점검 |
| G | Governance Docs | 문서량은 충분하나 일부 구식 | `B_ops_guide.md`, `ROADMAP.md`, status report | 부분완료 | 경로 기준을 `docs/...`로 통일 |
| H | Hooks/State | TanStack Query, Zustand, Dexie 기반 | `apps/web/src/hooks`, `stores`, `lib/db.ts` | 완료 | 오프라인 충돌 정책 문서화 |
| I | i18n | ko/en/ja 리소스 존재 | `apps/web/src/i18n` | 부분완료 | 화면별 하드코딩 문자열 점검 |
| J | Jobs | TTS, FSRS, report, push cron 존재 | `wrangler.toml`, `apps/api/src/jobs` | 부분완료 | FSRS optimizer 연결 결정 |
| K | Knowledge Assets | 전략, 로드맵, 분석 문서 보유 | `docs/00_overview`, `docs/ROADMAP.md` | 완료 | 최신 보고서 하나를 기준 문서로 지정 |
| L | Logging/Observability | 로그/리포트/Logpush 문서 존재 | `logs*`, `admin*`, `logpush-r2-setup.md` | 부분완료 | 운영 검증 체크리스트 추가 |
| M | Migration/Seed | 전체 시드와 diff 시드 존재, 비시드 문서 정책 주석화 | `seed.ts`, `seed-diff.ts`, `constants.ts` | 완료 | 필요 시 selfCheck 시드 기능은 별도 PR |
| N | Notifications | Push 알림 라우트와 cron 존재 | `notifications.ts`, `wrangler.toml` | 완료 | 실제 VAPID/구독 흐름 검증 |
| O | Offline/PWA | SW, IndexedDB, sync 기반 존재 | `apps/web/src/sw.ts`, `lib/sync.ts` | 완료 | E2E 정기 실행 상태 확인 |
| P | Parser Layer | 콘텐츠별 파서 분리 | `parse-vocab`, `parse-grammar`, `parse-kanji` 등 | 완료 | 파서 결과 카운트 리포트 자동화 |
| Q | Quality | workspace 타입체크 통과 | `pnpm -r typecheck` | 완료 | 빌드/E2E도 같은 보고서 자동 근거로 추가 |
| R | Release CI/CD | 배포/백업/e2e/audit/codeql 워크플로 존재 | `.github/workflows` 7개 | 부분완료 | `.git` 없는 로컬 검증 fallback 추가 |
| S | Security | Access JWT, rate limit, security middleware 존재 | `middleware/auth.ts`, `rate-limit.ts`, `security.ts` | 완료 | 운영 시크릿 주입 상태 확인 |
| T | TTS | provider 계층과 생성 잡 존재 | `lib/tts`, `generate-audio.ts` | 부분완료 | provider별 성공률/비용 정책 정리 |
| U | UX | 주요 학습 루프 화면 구현 | `Home`, `Review`, `Browse`, `Quiz`, `Reading` | 부분완료 | 실제 사용자 흐름 스크린샷 기반 점검 |
| V | Versioning | 패키지 분리와 shared 계약 존재, 루트 manifest 재정의 완료 | `packages/shared`, `package.json`들 | 완료 | lockfile 변경 리뷰 |
| W | Workflow Fit | 콘텐츠 감시는 현재 구조와 대체로 일치, diff fallback 추가 | `content-update.yml`, `seed-diff.ts` | 완료 | CI에서 `--base` 값 정교화 |
| X | eXperimental Risk | FSRS 개인화는 외부 optimizer 의존 | `optimize-fsrs.ts` | 부분완료 | optimizer 서비스 배포 또는 기능 명시적 비활성화 |
| Y | Yet-to-fix | 구식 운영 문서 경로가 일부 잔존, content 메타데이터는 정리됨 | `ROADMAP.md`, `B_ops_guide.md` | 부분완료 | 문서 아카이브/로드맵 정리 |
| Z | Zenith Roadmap | N2/TTS/Auth 확장 방향 존재 | `docs/ROADMAP.md` | 부분완료 | N2 파일 경로 예시를 현재 구조로 갱신 |

---

## 4. Current Workspace Analysis

### 4-1. 콘텐츠 문서

`docs` 하위 콘텐츠는 N5, N4, N3 핵심 학습 자산과 예문/발음/자가진단/직무 어휘를 포함한다. 분량 기준으로는 학습 앱의 원천 데이터로 쓰기에 충분한 규모다.

강점:

- JLPT 레벨별 한자, 어휘, 문법 파일이 분리되어 있다.
- N3 어휘는 `10A`, `10B`로 분할되어 대용량 관리가 가능하다.
- 예문 파일이 1,506 lines로 별도 유지되어 검색/퀴즈/읽기 기능 확장 기반이 있다.

주의:

- `docs/00_overview/B_ops_guide.md`는 예전 파일명과 업로드 표를 포함한다.
- `docs/ROADMAP.md`의 N2 확장 예시는 루트 파일 배치를 전제로 한다.
- `docs/00_overview/project-status-report.md`는 기준일과 일부 상태 판단이 현재 파일 상태와 충돌한다.

### 4-2. 프론트엔드

`apps/web`은 독립 패키지로 구성된 React + Vite + PWA 앱이다. 라우팅, 페이지, UI 컴포넌트, IndexedDB, sync, settings store, i18n 리소스가 존재한다.

완성된 기반:

- 페이지: Home, Review, Browse, BrowseDetail, Curriculum, SelfCheck, Settings, Quiz, QuizListening, QuizResult, Reading, ReadingDetail, Stats
- 로컬 기능: Dexie 기반 DB, offline sync, audio prefetch, FSRS client 재수출
- 품질: `apps/web` typecheck 통과

남은 점검:

- 화면별 하드코딩 문자열과 i18n 적용 범위 확인
- PWA/오프라인 흐름의 실제 브라우저 E2E 결과를 최신 보고서에 자동 반영

### 4-3. 백엔드 API

`apps/api`는 Cloudflare Workers 환경의 Hono API다. `OpenAPIHono` 기반 라우팅과 Scalar UI가 구성되어 있으며, 공개/인증 라우트와 middleware 계층이 분리되어 있다.

완성된 기반:

- `/api/v1` 하위 주요 학습 API 라우트 구성
- `/openapi.json`, `/api/docs` 제공
- CF Access 인증, rate limit, security, cache middleware 존재
- Cron 기반 report, TTS, FSRS optimizer, push 알림 트리거 설정

남은 점검:

- 일부 `*-oa.ts` 파일은 기존 라우트를 단순 `route()`로 마운트하는 래퍼다. 이는 문서화 수준 점검이 아니라 실제 명세 누락 문제로 봐야 한다.
- 운영 단계 API라면 모든 공개/인증 라우트를 `createRoute()` + `OpenAPIHono.openapi()` 패턴으로 통일하고, `/openapi.json`에 request/response schema가 빠지는 라우트가 없도록 해야 한다.
- FSRS optimizer는 외부 URL 미설정 시 스킵하므로, 개인화 기능은 운영 연결 전까지 부분완료다. 또한 weight 검증은 FSRS-6 기준 21개를 강제하거나, 19개 legacy 입력을 21개로 보정하는 호환 정책을 명시해야 한다.

### 4-4. DB/시드 파이프라인

`packages/db`는 Drizzle 스키마, 마이그레이션, 시드, 파서를 포함한다. `CONTENT_PATHS`는 실제 `docs/...` 경로를 사용하며, 전체 시드와 diff 시드가 분리되어 있다.

완성된 기반:

- `seed.ts`: 전체 콘텐츠 재시드
- `seed-diff.ts`: git diff 기반 변경 소스만 DELETE + INSERT
- 파서: vocab, grammar, kanji, sentences, sysprog, curriculum
- 검증 스크립트: `verify`, `verify:remote`

주의:

- `SOURCE_FILE_MAP`은 12개 콘텐츠 소스만 처리한다.
- `CONTENT_PATHS.selfCheck`는 존재하지만 diff 시드 대상은 아니다.
- 현재 로컬 경로에서 `.git`이 감지되지 않아 `seed-diff.ts`의 git diff 기반 검증은 제한된다.
- 이 문제는 단순히 `.git`을 복원하면 끝나는 문제가 아니다. GitHub Actions에서는 checkout 이력으로 정상 동작할 수 있어도, 로컬/배포 전 검증에는 `--files`, `--all`, `--since-manifest` 같은 git 비의존 fallback 경로가 필요하다.

### 4-5. 공유 패키지와 콘텐츠 패키지

`packages/shared`는 타입, 스키마, FSRS wrapper를 제공한다. API와 web이 이 패키지를 단일 진실원으로 참조하는 구조는 적절하다.

`packages/content`는 `tsconfig.json`이 존재하고 typecheck도 통과한다. `src/index.ts`는 현재 `docs/...` 구조 기준의 보조 메타데이터 인덱스로 정규화되었다.

정리 필요:

- 시드 파이프라인 단일 진실원은 계속 `packages/db/src/seed/constants.ts`로 유지
- `packages/content`는 문서 도구, 업로드 가이드, UI 소스 메타 표시용 보조 인덱스로 사용
- `pronunciation_kana`, `self_check_16weeks`는 `seeded: false`로 명시

### 4-6. CI/CD와 인프라

`.github/workflows`에는 배포, 백업, E2E, 보안 스캔 계열 파일이 존재한다. `content-update.yml`은 현재 `docs/**/*.md`를 감시하므로 콘텐츠 경로 변경에 맞게 업데이트된 상태다.

확인된 워크플로:

- `deploy-api.yml`
- `deploy-web.yml`
- `content-update.yml`
- `backup-d1.yml`
- `e2e.yml`
- `audit.yml`
- `codeql.yml`

주의:

- 로컬 워크스페이스에서 `.git`이 없으므로 GitHub Actions 자체는 존재하지만 순수 git 기반 명령은 실패할 수 있다. `seed-diff.ts`는 `--files`, mtime fallback, `--dry-run`을 지원하도록 보강되었다.
- 루트 `package.json`은 `nihongo-n3-monorepo` 운영 manifest로 재정의되었고, Figma Make 산출물은 `apps/figma-export-archive/`로 이동되었다.

---

## 5. Mismatch Register

| 위치 | 불일치 | 영향 | 권장 조치 |
|---|---|---|---|
| `docs/00_overview/B_ops_guide.md` | 예전 루트 파일명과 업로드 순서 표 유지 | 운영자가 실제 파일을 찾기 어렵다 | `docs/...` 경로 기준 표로 재작성 |
| `docs/ROADMAP.md` | N2 확장 파일을 루트에 추가하는 예시 | 향후 N2 작업 시 현재 구조와 어긋남 | `docs/05_n2/...` 같은 실제 대상 경로로 갱신 |
| `docs/00_overview/project-status-report.md` | 미래 기준일, 루트 구조 설명, 일부 FSRS 설명 충돌 | 기준 보고서로 쓰기 어렵다 | 최신 요약 또는 본 보고서 링크로 축약 |
| `packages/content/src/index.ts` | 루트 md 위치 설명과 예전 파일명 | 메타데이터 신뢰도 저하 | 해소됨: `docs` 경로 + `seeded` 정책 반영 |
| `packages/db/src/seed/seed-diff.ts` | `selfCheck`는 상수에는 있으나 diff map 제외 | 자가진단 문서 변경 자동 반영 여부 불명확 | 해소됨: 비시드 문서 정책 명시 |
| `apps/api/src/jobs/optimize-fsrs.ts` | FSRS optimizer weights 검증이 `>= 19` | FSRS-6 W[21] 운영에서 잘못된 길이 저장 가능 | 해소됨: 19/21만 허용, 19는 21로 보정 |
| `apps/api/src/routes/*-oa.ts` | 다수 라우트가 기존 Hono 라우트를 `route()`로 래핑 | `/openapi.json`에 request/response schema 누락 가능 | `createRoute()` + `app.openapi()`로 통일 |
| 로컬 워크스페이스 | `.github`는 있으나 `.git` 부재 | `git diff` 기반 검증 제한 | 부분 해소: `--files`, mtime fallback, `--dry-run` 추가 |
| 루트 `package.json` | Figma bundle 이름/의존성이 루트 workspace와 혼재 | 빌드/운영 명령 혼동 가능 | 해소됨: 운영 manifest로 재정의, Figma archive 분리 |

---

## 6. Priority Action List

### P0. 문서 경로 정규화

목표: 운영자와 자동화가 같은 경로 체계를 보도록 만든다.

- `docs/00_overview/B_ops_guide.md`의 파일명 표를 현재 `docs/...` 경로 기준으로 재작성
- `docs/ROADMAP.md`의 N2 예시를 루트가 아닌 `docs` 하위 경로 기준으로 수정
- `docs/00_overview/project-status-report.md`의 기준일과 오래된 구조 설명을 정리
- 금지할 오래된 표현: 루트 md 전제, `03_jlpt_n5_kanji.md` 같은 현재 미존재 파일명, 콘텐츠 패키지 설정이 없다는 과거 판단

### P0. `packages/content` 메타데이터 최신화

목표: 콘텐츠 메타 패키지가 실제 파일 시스템과 일치하도록 만든다.

- `packages/content/src/index.ts`의 설명을 `docs` 하위 구조 기준으로 수정
- 각 항목에 실제 경로를 넣거나, 최소한 `filename`을 현재 파일명으로 변경
- `CONTENT_FILES`가 시드 파이프라인의 단일 진실원이 될지, 문서 인덱스용 보조 자료로 남을지 결정

### P0. OpenAPI 라우트 명세 완성

목표: 운영 API의 `/openapi.json`이 실제 endpoint 계약을 빠짐없이 표현하게 만든다.

- `srs-oa.ts`, `sync-oa.ts`, `sysprog-oa.ts`, `self-check-oa.ts`, `logs-oa.ts`, `quiz-oa.ts`, `reading-oa.ts`, `audio-oa.ts`, `homophones-oa.ts`, `admin-oa.ts`처럼 단순 wrapper인 라우트를 우선 목록화
- 각 endpoint를 `createRoute()`로 request params/query/body와 response schema를 정의
- `app.openapi(route, handler)` 또는 `openapiRoutes()` 등록으로 통일
- 검증 기준: `/openapi.json`의 paths에 모든 운영 endpoint가 있고, 2xx/4xx response schema가 비어 있지 않아야 한다.

### P1. FSRS optimizer 운영 결정

목표: 개인화 FSRS의 현재 상태를 명확히 한다.

- 외부 optimizer 서비스를 배포하고 `FSRS_OPTIMIZER_URL`/`FSRS_OPTIMIZER_TOKEN`을 설정
- 또는 개인화 최적화를 비활성 기능으로 문서화하고 기본 FSRS 스케줄러만 운영
- optimizer 응답 weight 길이는 현재 `>= 19`만 검사하므로 FSRS-6 W[21] 기준 `length === 21`을 기본 정책으로 강화
- 과거 19개 weight 입력을 받기로 결정한다면 `>= 19 && <= 21` 허용만으로 끝내지 말고, 저장 전 21개로 보정하거나 거부하는 호환 정책을 코드와 문서에 명시

### P1. 루트 package manifest 재정의

목표: Figma Make 산출물 흔적과 운영 모노레포 루트 역할을 분리한다.

- 루트 `package.json`의 `name`을 `nihongo-n3`로 변경
- `private: true` 유지
- `packageManager: "pnpm@9.x"` 명시
- 루트 scripts는 workspace 운영 명령 중심으로 재구성
- Figma Make 관련 의존성과 `_design`/초기 산출물의 관계는 별도 문서 또는 하위 패키지로 분리

### P1. seed-diff fallback 추가

목표: GitHub Actions뿐 아니라 로컬/수동 운영에서도 변경분 시드를 검증 가능하게 만든다.

- 현행 git diff 기반 흐름은 유지
- `.git`이 없거나 `git diff`가 실패하면 즉시 skip하지 않고 사용자가 명시한 파일 목록을 처리하는 `--files=a.md,b.md` 옵션 추가
- 운영자가 확실성을 원할 때 실행할 수 있는 `--all` 또는 기존 `seed:remote` 경로를 문서화
- fallback 사용 시 처리 대상 소스와 SQL 생성 수를 로그로 명확히 출력

### P1. 기준 보고서 체계 정리

목표: 상태 보고서가 서로 충돌하지 않게 만든다.

- `docs/PROJECT_ANALYSIS_2026.md`를 현재 기준 A-Z 보고서로 지정
- `docs/00_overview/project-status-report.md`는 상세 역사 문서로 둘지, 짧은 최신 요약으로 줄일지 결정
- 정기 갱신 명령 목록을 보고서 하단에 유지

### P2. 검증 자동화 보강

목표: 보고서 근거를 수동이 아니라 반복 가능한 결과로 만든다.

- `pnpm -r typecheck`
- `pnpm -F @nihongo-n3/web build`
- `pnpm -F @nihongo-n3/api build`
- `pnpm -F @nihongo-n3/db verify`
- E2E 실행 결과
- Markdown 파일 수와 line count

---

## 7. Revalidation Checklist

이번 문서 교체 후 다시 확인해야 하는 명령:

```bash
pnpm -r typecheck
```

```bash
find docs -type f -name '*.md' -print0 | xargs -0 wc -l
```

```bash
rg -n "루트|jlpt_n|content-update|SOURCE_FILE_MAP|FSRS|tsconfig" docs packages apps .github
```

품질 기준:

- 이 문서에는 현재와 반대되는 판단을 남기지 않는다.
- `content-update.yml`은 현재 `docs/**/*.md`를 감시한다고 기록한다.
- `packages/content/tsconfig.json`은 존재하며 전체 typecheck가 통과한다고 기록한다.
- FSRS API/web 파일은 구현체가 아니라 shared 재수출이라고 기록한다.
- 앱 코드가 없다는 식의 요약은 사용하지 않는다.

---

## 8. Final Assessment

현재 워크스페이스의 실질 진척도는 높다. 학습 콘텐츠, 웹앱, API, DB, 시드 파이프라인, OpenAPI, PWA, CI/CD가 모두 존재하고 `pnpm -r typecheck`도 통과한다.

다만 운영 신뢰도를 더 높이려면 OpenAPI wrapper 라우트 명세화와 오래된 운영 문서 아카이브가 다음 우선순위다. 루트 manifest, content 메타데이터, FSRS weight 검증, seed-diff 로컬 fallback은 1차 정리되었다.
