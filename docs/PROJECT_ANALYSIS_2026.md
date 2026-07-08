# JLPT 워크스페이스 통합 분석 보고서

기준일: 2026-07-08 KST
대상 경로: `/Users/sungho-kang/Desktop/JLPT`

이 문서는 현재 워크스페이스의 실제 구조와 최근 P0/P1/P2 작업 결과를 기준으로 한다. 과거 보고서의 루트 Markdown 전제, Figma Make 산출물 혼재 판단, `packages/content` 설정 부재, FSRS 구현 위치 오인, OpenAPI wrapper 과소평가를 현재 상태 기준으로 정정한다.

## 1. Executive Summary

현재 `JLPT`는 학습용 Markdown 폴더가 아니라 운영 가능한 pnpm 모노레포다.

| 영역 | 실제 기준 |
| --- | --- |
| 프론트엔드 | `apps/web` React/Vite PWA |
| 백엔드 | `apps/api` Cloudflare Workers + Hono + OpenAPIHono |
| DB | `packages/db` Drizzle schema, D1 migration, seed parser |
| 공유 계약 | `packages/shared` FSRS, DTO, audio policy |
| 콘텐츠 메타 | `packages/content` 문서 경로/메타데이터 |
| 문서 | `docs` 학습 콘텐츠, 운영 문서, 분석 보고서 |
| CI/CD | `.github/workflows` audit, CodeQL, deploy, backup, E2E |

최근 개선으로 P1의 DTO drift, IndexedDB stale content, multi-user local data mixing, TTS provider 혼선을 코드 차원에서 줄였다. P2에서는 대형 페이지 컴포넌트 4개를 feature module로 분리해 테스트와 UI 변경 비용을 낮췄다.

## 2. Evidence Snapshot

최근 검증 기준:

- `pnpm -F @nihongo-n3/web typecheck` 통과
- P1 검증 당시 `pnpm typecheck`, API unit, Web unit, E2E, API build, Web build 통과
- API production smoke: `/health`, `/api/v1/content/version`, `/` 정상 응답 확인
- Web production smoke: `https://nihongo-n3.pages.dev/` HTTP 200 확인

현재 구조상 중요한 source of truth:

| 목적 | 파일 |
| --- | --- |
| 콘텐츠 경로 | `packages/db/src/seed/constants.ts` |
| diff seed | `packages/db/src/seed/seed-diff.ts` |
| 프론트 DTO 정규화 | `packages/shared/src/content-dto.ts` |
| 오디오 정책 | `packages/shared/src/audio-policy.ts` |
| 로컬 DB/session 분리 | `apps/web/src/lib/db.ts`, `apps/web/src/stores/auth-store.ts` |
| 콘텐츠 cache invalidation | `apps/web/src/lib/content-cache.ts`, `apps/api/src/routes/sources-oa.ts` |
| 대형 페이지 feature 분리 | `apps/web/src/features/*` |

## 3. A-Z Progress Matrix

| 영역 | 상태 | 근거 | 다음 액션 |
| --- | --- | --- | --- |
| Architecture | 완료 | apps/packages/docs/CI가 분리된 pnpm workspace | 기능별 ownership 문서화 |
| Backend API | 부분완료 | OpenAPIHono 적용, wrapper 리스크 정리 진행 | generated client 도입 검토 |
| Content | 완료 | N5-N3 콘텐츠와 보조 문서가 `docs` 하위에 있음 | 품질 QA 자동화 |
| Database | 완료 | Drizzle schema, D1 migration, seed parser 존재 | N2 확장 시 source row 추가 |
| Edge Infra | 완료 | Workers, Pages, D1, R2 운영 구조 | secret rotation 절차 문서화 |
| Frontend | 완료 | React PWA, i18n, IDB, E2E 존재 | 핵심 화면 UX polish 지속 |
| Governance Docs | 부분완료 | 본 문서, ROADMAP, status report 갱신 | archive 정책 추가 |
| Hooks/State | 완료 | content cache, SRS, auth namespace 적용 | generated API hook 검토 |
| i18n | 부분완료 | ko/ja/en 리소스 존재 | 신규 feature 문자열 점검 |
| Jobs | 부분완료 | TTS/FSRS/push/report cron 존재 | provider 실패율 관측 |
| Knowledge Assets | 완료 | docs 학습/운영 문서 유지 | 중복 문서 archive |
| Logging | 부분완료 | admin/log routes 존재 | 운영 로그 dashboard 개선 |
| Migration/Seed | 완료 | full seed/diff seed 존재 | `selfCheck` seed 정책 유지 명시 |
| Notifications | 부분완료 | push route와 cron 존재 | 실제 VAPID 운영 검증 |
| Offline/PWA | 완료 | Dexie, SW, sync queue 존재 | mobile WebKit 회귀 유지 |
| Parser | 완료 | vocab/grammar/kanji/sentences parser 분리 | parser fixtures 추가 |
| Quality | 완료 | type/unit/e2e 기준 존재 | CI billing/account 상태 분리 감시 |
| Release | 부분완료 | deploy workflows 존재 | dirty deploy 방지 정책 |
| Security | 부분완료 | app session, Access mode, rate limit | OAuth redirect env 검증 자동화 |
| TTS | 부분완료 | audio policy와 provider fallback 존재 | R2 고정 오디오 품질 확정 |
| UX | 부분완료 | Home/Review/Browse 개선, P2 컴포넌트 분리 | 시각 regression 기준 확대 |
| Versioning | 완료 | root manifest와 package boundaries 정리 | release note 자동화 |
| Workflow | 부분완료 | GitHub Actions 7개 | billing lock과 workflow failure를 코드 실패와 분리 |
| Experimental | 부분완료 | FSRS optimizer 외부 URL 의존 | optimizer 운영 여부 결정 |
| Yet-to-fix | 부분완료 | legacy 문서/스크린샷/임시 산출물 존재 | archive/cleanup pass |
| Zenith | 진행중 | N2, 추천, 오디오 QA 로드맵 존재 | P3/P4 단계화 |

## 4. Current Workspace Analysis

### 4-1. 프론트엔드

`apps/web`은 단순 페이지 모음이 아니라 인증, i18n, PWA, IndexedDB, sync, 오디오, 학습 기능을 포함한 앱이다.

최근 P2 구조:

```text
apps/web/src/features/
├── browse/
├── character-trainer/
├── quiz-listening/
└── self-check/
```

각 feature는 page container, hook, UI component, logic/type/data 파일로 나뉜다. 기존 테스트가 page 내부 구현에 묶이지 않도록 순수 함수 import를 feature logic으로 이동했다.

### 4-2. 백엔드 API

`apps/api`는 Workers API이며 `/api/docs`와 `/openapi.json`을 제공한다. P0에서 wrapper route 명세화와 AI API 보호를 개선했다. 앞으로는 OpenAPI generated client를 도입해 프론트 DTO 수동 drift를 더 줄이는 것이 적절하다.

### 4-3. DB와 콘텐츠

`packages/db`가 D1 schema와 seed의 source of truth다. `packages/content`는 UI/문서 도구용 메타 패키지로 유지한다. 콘텐츠 버전 endpoint와 IDB invalidation이 들어가면서, 기존 사용자가 오래된 IndexedDB 데이터를 계속 보는 위험을 줄였다.

### 4-4. 인증과 로컬 데이터

현재 앱은 자체 session auth를 중심으로 하고 Cloudflare Access는 보호 모드로 분리한다. 프론트 IndexedDB는 userId 기반 namespace를 사용해 같은 기기에서 계정 전환 시 학습 데이터가 섞이는 리스크를 줄였다.

### 4-5. 오디오/TTS

오디오 provider가 많아진 상태에서 중요한 것은 확장성보다 운영 정책이다. 현재는 `packages/shared/src/audio-policy.ts`에서 surface별 우선순위를 정하고, 문자/단어/한자/예문/청해가 같은 정책을 참조한다.

## 5. Mismatch Register

| 이전 불일치 | 현재 처리 |
| --- | --- |
| 루트 Markdown 파일 기준 설명 | `docs/...` 하위 구조 기준으로 문서 교체 |
| `content-update.yml`이 루트 md만 감시한다는 판단 | 현재 `docs/**/*.md` 기준으로 정정 |
| `packages/content/tsconfig.json` 부재 판단 | 존재 및 typecheck 통과 기준으로 정정 |
| FSRS 구현이 API/Web 내부에 있다는 판단 | `packages/shared/src/fsrs.ts` 재수출 구조로 정정 |
| FSRS weight 길이 `>=19` 허용 약점 | 19 legacy 또는 21 FSRS-6 기준으로 보정/검증 |
| Hono wrapper route가 문서상 문제만이라는 판단 | OpenAPI schema 누락 리스크로 분류 |
| `.git` 부재를 단순 복원 문제로 취급 | seed-diff fallback과 GitHub/local 검증 차이로 분리 |
| 루트 `package.json` Figma 산출물 혼재 | 운영 monorepo manifest 기준으로 정리 |

## 6. Priority Action List

### P3

1. OpenAPI generated client 도입 여부 결정
2. API schema와 프론트 DTO의 중복 타입 추가 제거
3. 오디오 품질 dashboard와 provider 실패율 로그 추가
4. PWA mobile visual regression 범위 확대

### P4

1. N2 콘텐츠를 `docs/05_n2` 기준으로 추가
2. 자기진단과 학습 추천을 실제 오답/복습 로그 기반으로 고도화
3. R2 고정 오디오 생성 파이프라인의 QA 승인 단계 추가
4. 오래된 운영 보고서를 `docs/archive`로 이동하거나 상단에 과거 기준 표시

## 7. 배포 전 검증 기준

최종 배포 전에는 아래 명령이 통과해야 한다.

```bash
pnpm typecheck
pnpm -F @nihongo-n3/api test
pnpm -F @nihongo-n3/web test:run
pnpm -F @nihongo-n3/e2e test
pnpm -F @nihongo-n3/api build
pnpm -F @nihongo-n3/web build
```

운영 smoke는 최소 다음 endpoint를 확인한다.

```bash
curl -fsS https://nihongo-n3-api.kordokrip.workers.dev/health
curl -fsS https://nihongo-n3-api.kordokrip.workers.dev/api/v1/content/version
curl -I -fsS https://nihongo-n3.pages.dev/
```
