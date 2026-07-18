# nihongo-n3 현재 변경·검증·배포 통합 현황

기준 시각: 2026-07-18 15:01 KST

코드 기준: `main` `27c379fbeb1c7b6c818ee5c356906c8d9e9c901c` + Backup 후보 `3232fb6011f6132fbb5cbe6784ee4349468b77d9`

비교 기준: WIP 보존점 `1ae2401` 이후

작성 목적: 구현, 검증, Git 병합, Cloudflare 운영 배포를 같은 의미로 혼용하지 않고 현재 상태를 한 문서에서 판단한다.

## 1. 현재 결론

프로젝트는 Markdown 자료 묶음이 아니라 React/Vite PWA, Hono Worker API, D1/R2, OpenAPI, Drizzle migration, Chromium/WebKit E2E를 가진 pnpm 모노레포다. 7월 14일 이후 R1 기술부채 정상화, 콘텐츠 provenance, 동음이의어, N2/N1 release gate, 화면 feature module, TOPIK 비공개 기반, Cloudflare native D1 백업까지 코드와 검증 체계가 크게 확장됐다.

다만 현재 상태는 다음 세 층으로 나뉜다.

| 층 | 판정 | 근거 |
| --- | --- | --- |
| 저장소 코드 | 통합 완료 | PR #35가 `main`에 merge, R1/R2 기반과 TOPIK T1~T3 포함 |
| 검증 | 통과 | local/remote Audit, CodeQL, type/unit/build, fresh D1, Chromium/WebKit 통과 |
| 운영 앱 배포 | 일부 미반영 | API production은 2026-07-07, Pages production은 2026-07-08 버전 |
| 운영 백업 | 검증 완료 | Cloudflare Workflow, R2 25 objects, restore drill, 30일 lifecycle 확인 |
| 운영 DB 전환 | 미실행 | `nihongo-n3-prod-v2`가 없고 기존 `nihongo-n3-prod`만 존재 |

따라서 `main`에 병합된 최신 기능이 모두 `nihongo-n3.pages.dev`와 API Worker에 배포됐다고 판단하면 안 된다. 현재 운영에 확실히 추가된 최신 인프라는 D1 Backup Worker/Workflow이며, 앱/API/D1 Blue/Green 전환은 별도 승인 관문이 남아 있다.

## 2. 변경 규모와 범위

`1ae2401..3232fb6` Git 범위의 변경은 297개 파일이다.

| 변경 유형 | 파일 수 |
| --- | ---: |
| 추가 | 133 |
| 수정 | 154 |
| 삭제 | 10 |
| 합계 | 297 |

| 영역 | 변경 파일 수 | 핵심 성격 |
| --- | ---: | --- |
| `apps/api` | 47 | OpenAPI, 인증, 오디오, track, 관측성, maintenance |
| `apps/web` | 96 | feature module, cache/track 격리, 페이지·i18n·오디오 |
| `apps/d1-backup` | 6 | Cloudflare Workflow 기반 D1→R2 백업 |
| `packages/db` | 53 | canonical migration, manifest, seed/verifier, Blue/Green/restore |
| `packages/shared` | 10 | DTO, JLPT level, track, audio/study/observability 계약 |
| `e2e` | 29 | auth, track 격리, N2 gate, responsive, visual regression |
| `.github/workflows` | 8 | Audit, CodeQL, verify, E2E, deploy, backup, D1 change control |
| `scripts` | 9 | preview smoke, Logpush, alert, post-deploy observe |
| `docs/00_overview` | 24 | runbook, ADR, 정책, 기술부채, 시계열 |

삭제 10개에는 현행 문서로 대체된 구 문서와 운영 범위에서 제외한 미검수 N2/N1 후보 파일이 포함된다. N2/N1 파일 삭제를 콘텐츠 출시 완료로 해석하지 않는다.

## 3. 시계열 진행 내역

| 시점 | 작업 | 결과 |
| --- | --- | --- |
| 5월 말 | 문서 자료를 Web/API/DB/shared/content monorepo로 전환 | PWA와 Workers/D1 기반 형성 |
| 5월 말~6월 초 | i18n, responsive navigation, PWA, 자연 일본어 검색, 오디오 QA | 모바일·WebKit·오프라인 회귀 확대 |
| 6월 | 퀴즈, 청해, 자기진단, 문자 암기·쓰기, 로그인·회원가입·Google OAuth·관리자 | 사용자 기능과 인증 기반 구현 |
| 7/8 | auth/session, user×track local scope, API 연결과 모바일 안정화 | 운영 메뉴·로그인·offline E2E 안정화 |
| 7/14 R1 | canonical D1, OpenAPI generated type, read-only, Blue/Green, CI 신뢰도 | runtime DDL·route/spec drift·open handle 부채 해소 |
| 7/15 관측성 | PII 없는 JSON log, Logpush, alert receiver, canary | preview 5xx 발화·webhook·R2 evidence 검증 |
| 7/15~7/16 오디오 | immutable R2 key, 30문장 QA, Google batch 승인 gate | browser fallback 유지, 전체 batch는 미승인 |
| 7/16 콘텐츠 | 13-source provenance, seed ledger, 동음이의어 30쌍 | manifest·FTS·FK·중복·필수값 gate 통과 |
| 7/16~7/17 N2/N1 | shared N5→N1 계약과 DB 분포 기반 release gate | 검수 태그 4,605건 때문에 N2/N1 운영 제외 |
| 7/17 Web | Quiz·Review·Stats를 view/hook/logic/type으로 분리 | 동작 snapshot 유지, track scope 보존 |
| 7/17~7/18 TOPIK | T1 ADR, track-aware schema, 자체 저작 12문항 verifier | foundation-only, public API/문제 노출 금지 |
| 7/18 통합 | PR #35를 `main`에 merge | main SHA `27c379f` |
| 7/18 백업 | GitHub D1 export `10000` 실패를 Cloudflare Workflow로 대체 | R2 백업·복원·lifecycle 검증 완료 |

## 4. 현재 아키텍처

```text
docs N5~N3/TOPIK QA source
  -> packages/db parser + provenance manifest
    -> Drizzle canonical migrations + seed/verifier
      -> Cloudflare D1
        -> Hono/OpenAPIHono Worker
          -> generated OpenAPI TypeScript types
            -> React/Vite PWA + React Query + Dexie

Cloudflare Workers Observability -> alert receiver/Logpush -> R2
Cloudflare D1 binding -> Backup Workflow -> R2 SQL/manifest -> restore drill
```

| 구성 | 역할 | 현재 계약 |
| --- | --- | --- |
| `apps/web` | React/Vite PWA | 한국어 기본 UI, ja/en 언어팩, offline, responsive |
| `apps/api` | Hono Worker | app-session/OAuth/admin, public/admin OpenAPI |
| `apps/d1-backup` | 비공개 Workflow Worker | D1 binding read, R2 binding write, public route 없음 |
| `packages/shared` | 공통 계약 | DTO, `LearningTrackId`, JLPT level, audio/study policy |
| `packages/db` | 데이터 소유권 | schema, migration, seed, manifest, verify, ops |
| `packages/content` | 콘텐츠 메타데이터 | docs source 경로와 콘텐츠 설명 |
| `e2e` | 운영 회귀 | Chromium/WebKit, auth, PWA, track, responsive |
| `.github/workflows` | 릴리스 관문 | 검증과 승인형 production 변경 |

## 5. 코드 수준 변경 파일

### 5.1 API와 인터페이스

| 파일/영역 | 변경 내용 |
| --- | --- |
| `apps/api/src/index.ts` | route mount, 공개/관리자 spec, middleware 순서 정리 |
| `apps/api/src/routes/auth-oa.ts`, `auth.ts` | password/Google OAuth route 명세와 session 흐름 |
| `apps/api/src/lib/auth-session.ts` | session probe 경쟁 조건과 track-aware auth 보강 |
| `apps/api/src/middleware/auth.ts` | admin role과 인증 모드 강제 |
| `apps/api/src/middleware/maintenance.ts` | read-only 시 실제 DB 변경 route를 503 처리 |
| `apps/api/src/routes/tracks.ts` | `/api/v1/tracks/:track/status`와 DB 분포 기반 release gate |
| `apps/api/src/routes/homophones-oa.ts` | 검수 완료 동음이의어 public OpenAPI 활성화 |
| `apps/api/src/routes/audio.ts`, `audio-oa.ts` | R2 read-only, QA/batch 승인, fallback 계약 |
| `apps/api/src/jobs/generate-audio.ts` | provider/model/version/content hash 기반 불변 key |
| `apps/api/src/middleware/observability.ts` | request ID, release, route template, latency JSON log |
| `apps/api/src/jobs/observability-alerts.ts` | 5xx/auth/D1 오류 임계값 판정 |
| `apps/api/src/observability-receiver.ts` | bearer 보호, PII 거부, R2 alert evidence 저장 |
| `apps/api/scripts/export-openapi.ts` | public/admin OpenAPI artifact 생성 |
| `apps/web/src/types/api.d.ts` | public 53-path generated type |
| `apps/web/src/types/admin-api.d.ts` | admin 7-path generated type |

로컬 통합 spec은 public 53 paths, admin 7 paths다. 2026-07-18 공개 운영 API 조회 결과는 48 paths이므로 5-path 차이는 최신 API 통합본이 production Worker에 아직 배포되지 않았음을 의미한다.

### 5.2 프론트엔드와 컴포넌트

| 파일/영역 | 변경 내용 |
| --- | --- |
| `apps/web/src/App.tsx` | auth/track/TOPIK foundation route 구성 |
| `apps/web/src/stores/auth-store.ts` | stale session probe가 최신 로그인/로그아웃을 덮지 않게 차단 |
| `apps/web/src/hooks/useDataScope.ts` | account×track data scope 단일 hook |
| `apps/web/src/hooks/useTrackStatus.ts` | server-derived content release 조회 |
| `apps/web/src/hooks/useContentVersionInvalidation.ts` | content version 변경 시 IndexedDB cache 무효화 |
| `apps/web/src/lib/db.ts`, `local-user.ts` 계열 | user×track namespace 분리 |
| `apps/web/src/lib/api.ts` | generated OpenAPI type 기반 façade |
| `apps/web/src/lib/audio.ts` | 승인된 R2 우선, 일본어 browser voice fallback |
| `apps/web/src/features/quiz/*` | Quiz view/hook/logic/type 분리 |
| `apps/web/src/features/review/*` | Review view/hook/logic/type 분리 |
| `apps/web/src/features/stats/*` | Stats view/hook/logic/type 분리 |
| `apps/web/src/features/character-trainer/*` | 문자/한자 관찰·쓰기·퀴즈와 track scope |
| `apps/web/src/features/quiz-listening/*` | 승인 오디오와 browser fallback 청해 |
| `apps/web/src/features/audio-qa/*` | 30문장 provider 청감 scorecard |
| `apps/web/src/pages/TopikFoundation.tsx` | 비공개 기반 안내 화면, 콘텐츠 출시 아님 |
| `apps/web/src/i18n/{ko,ja,en}.ts` | 레벨·track·상태 UI 번역 |
| `BottomTabBar.tsx`, `SideNav.tsx`, `RootLayout.tsx` | mobile bottom nav/tablet rail/desktop sidebar |

Quiz, Review, Stats는 페이지가 orchestration만 담당하고 hook이 data scope를 소유한다. 기존 동작은 페이지 snapshot과 logic unit test로 고정했다.

### 5.3 DB와 콘텐츠 파이프라인

Canonical migration은 기존 production ledger를 고치지 않고 `packages/db/drizzle-v2`의 별도 9-file chain으로 구성했다.

| migration | 역할 |
| --- | --- |
| `0000_schema_convergence.sql` | 일반 table 기준선 수렴 |
| `0001_fts.sql` | FTS virtual table과 trigger |
| `0002_app_defaults.sql` | 앱 기본값 |
| `0003_self_check_templates.sql` | 자기진단 template |
| `0004_jlpt_n3_practice_content.sql` | N3 연습 콘텐츠 table |
| `0005_learning_track.sql` | 사용자 학습 track |
| `0006_oauth_learning_track.sql` | OAuth state의 track 유지 |
| `0007_content_provenance_homophones.sql` | provenance ledger와 동음이의어 검수 필드 |
| `0008_topik_track_content_and_learning_keys.sql` | TOPIK source/level과 server user×track key |

| 핵심 파일 | 역할 |
| --- | --- |
| `packages/db/src/schema.ts` | Drizzle 일반 table 단일 소유권 |
| `packages/db/src/seed/content-manifest.ts` | 13-source provenance, row/checksum/version 계약 |
| `packages/db/src/seed/seed.ts` | category 선행, seed-run ledger 기록 |
| `packages/db/src/seed/verify.ts` | row/FTS/FK/필수값/중복/provenance 검증 |
| `packages/db/src/seed/homophone-pairs.ts` | 검수 완료 30쌍 |
| `packages/db/src/seed/topik-placement-bank.ts` | 자체 저작 내부 QA 12문항 |
| `packages/db/src/ops/d1-blue-green.ts` | content/mutable phase transfer와 checksum |
| `packages/db/src/ops/d1-user-cleanup.ts` | 사용자 정리 plan/allowlist/승인 gate |
| `packages/db/src/ops/verify-audio-r2.ts` | D1 key와 R2 metadata strict 검증 |
| `packages/db/src/ops/d1-restore-drill.ts` | blank D1 restore, row/FK/FTS parity |

현재 로컬 fresh seed는 migration 9/9, source 13, vocab 3,300, grammar 316, kanji 542, sentences 1,112, FTS parity, FK·중복·필수값 0을 통과한다. production D1은 아직 이 canonical chain으로 전환되지 않았다.

### 5.4 Cloudflare Backup 코드

| 파일 | 역할 |
| --- | --- |
| `apps/d1-backup/src/index.ts` | 23개 canonical table keyset export와 R2 upload |
| `apps/d1-backup/src/backup-core.ts` | confirmation, SQL literal, identifier, SHA-256 |
| `apps/d1-backup/src/backup-core.test.ts` | 입력·SQL escape·hash 회귀 테스트 |
| `apps/d1-backup/wrangler.jsonc` | private Worker, D1/R2/Workflow binding |
| `packages/db/src/ops/d1-tables.ts` | transfer/backup 공통 allowlist |
| `packages/db/src/ops/d1-restore-drill.ts` | 0-row 파일 검증과 전체 복원 |

Workflow runtime에는 Cloudflare API token이나 Global API Key를 저장하지 않는다. D1/R2 binding만 사용한다. 자동 cron도 두지 않았으며 승인된 read-only/maintenance 구간에서 수동 실행한다.

### 5.5 CI, 운영 스크립트, 테스트

| 파일/영역 | 변경 내용 |
| --- | --- |
| `.github/workflows/audit.yml` | pnpm 11 bulk advisory audit |
| `.github/workflows/codeql.yml` | JavaScript/TypeScript 보안 분석 |
| `.github/workflows/verify.yml` | OpenAPI, type, unit, build, fresh D1 |
| `.github/workflows/e2e.yml` | Chromium/WebKit matrix |
| `.github/workflows/content-update.yml` | validation과 승인형 production change 분리 |
| `.github/workflows/deploy-api.yml` | production Environment 승인형 Worker 배포 |
| `.github/workflows/deploy-web.yml` | Pages preview alias 검증과 production 승인 |
| `.github/workflows/backup-d1.yml` | GitHub D1 export 경로, 현재 API `10000`으로 대체 경로 사용 |
| `scripts/r1-preview-smoke.mjs` | prod-v2 auth/SRS/sync/read-only smoke |
| `scripts/setup-logpush.mjs` | Workers Logpush→R2 설정 |
| `scripts/setup-alerts.mjs` | saved query와 alert cron 검증 |
| `scripts/post-deploy-observe.mjs` | 30분/24시간 health·route·release 집계 |
| `e2e/learning-track-isolation.spec.ts` | account×track local/server 격리 |
| `e2e/n2-release-browse.spec.ts` | DB 분포에 따른 N2/N1 노출 gate |
| `e2e/responsive-ui.spec.ts` | phone/tablet/desktop navigation과 overflow |
| `e2e/visual-regression.spec.ts` | Chromium 기준 핵심 화면 14개 |

## 6. 기능별 현재 상태

| 기능 | 코드 | 검증 | 운영 반영 |
| --- | --- | --- | --- |
| password login/session | 완료 | unit/E2E 통과 | 기존 production 동작, 최신 race fix 미배포 |
| Google OAuth | route/config 완료 | redirect/start E2E 통과 | 최신 callback/session fix 미배포 |
| 관리자 role 보호 | 완료 | 401/403/200 회귀 통과 | 최신 main 기준 미배포 |
| JLPT N5~N3 Browse | 완료 | source/FTS/E2E 통과 | 기존 production 데이터 사용 |
| 동음이의어 30쌍 | 완료 | provenance/FK/OpenAPI/E2E 통과 | 최신 API/DB 미배포 |
| Quiz/청해/Review/Stats | feature module 완료 | snapshot/unit/E2E 통과 | 최신 module 구조 미배포 |
| 문자 암기·쓰기 | 완료 | unit/E2E 통과 | 기존 기능 운영, 최신 scope 보강 미배포 |
| 오디오 R2-first/fallback | 코드 완료 | browser fallback 통과 | 전체 승인 R2 batch 미완 |
| N2/N1 | type/gate만 완료 | 기본 비노출 통과 | 콘텐츠 미출시 |
| TOPIK | T1~T3 foundation | 내부 12문항 verifier/격리 E2E | public 미출시 |
| 관측성 | 코드와 preview 완료 | canary/webhook/R2 확인 | production API 연결 미완 |
| D1 Backup | 완료 | Workflow/R2/restore 통과 | 운영 반영 완료 |
| D1 prod-v2 | 도구 완료 | local dry-run 계열 통과 | DB 미생성·미전환 |

## 7. 검증 결과

### 7.1 로컬

| 관문 | 결과 |
| --- | --- |
| `pnpm audit --audit-level high` | known vulnerability 0 |
| `pnpm openapi:check` | public 53/admin 7, generated drift 0 |
| `pnpm typecheck` | web/api/db/shared/content/d1-backup 통과 |
| `pnpm test` | ops 8, DB 20, Backup 3, Web 60, API 95 통과 |
| `pnpm build` | Vite PWA, API Wrangler, Backup Wrangler dry-run 통과 |
| `pnpm -F @nihongo-n3/db verify:fresh` | migration 9/9, manifest/FTS/FK 통과 |
| Chromium E2E | 69/69 통과 |
| WebKit E2E | 55/55 통과, Chromium-only visual 14 skip |

fresh D1의 오디오 불변 R2 key 4,954건은 warning이며 TD-08 strict gate에서는 실패 대상이다. 이를 숨기기 위해 verifier 기준을 낮추지 않았다.

### 7.2 GitHub 원격

통합 PR [#35](https://github.com/kordokrip/JLPT/pull/35)는 2026-07-18 `main`에 merge됐다. Backup source PR [#36](https://github.com/kordokrip/JLPT/pull/36)은 Draft이며 mergeable 상태다.

PR #36 SHA `3232fb6011f6132fbb5cbe6784ee4349468b77d9`에서 다음 check가 모두 성공했다.

| Check | 결과 |
| --- | --- |
| Dependency Audit | success |
| CodeQL | success |
| Fresh D1 Migrate/Seed/Verify | success |
| Required Verification | success |
| Chromium E2E | success |
| WebKit E2E | success |

production D1 변경 job은 입력과 승인이 없으므로 의도적으로 skip됐다.

## 8. 실제 Cloudflare 배포 상태

2026-07-18 15:01 KST에 Cloudflare API와 공개 endpoint를 재조회했다.

| 대상 | 실제 상태 | 판정 |
| --- | --- | --- |
| `nihongo-n3-api.kordokrip.workers.dev` | root/health/OpenAPI/auth config HTTP 200 | 서비스 가동 중 |
| API Worker active version | `1df9b498-8169-41af-bd51-217cd07bab08`, 2026-07-07 배포 | 최신 main 미반영 |
| 운영 public OpenAPI | 48 paths | repository 53 paths와 차이 |
| `/api/v1/tracks/jlpt-ja/status` 익명 요청 | HTTP 401 | 보호 route로 정상, 최신 응답 계약은 인증 smoke 필요 |
| `nihongo-n3.pages.dev` | HTTP 200 | 서비스 가동 중 |
| Pages production | 2026-07-08 deployment `aed81a29...` | 최신 main 미반영 |
| Pages preview | 2026-07-18 두 건 success | 통합 artifact 검증 완료 |
| D1 | `nihongo-n3-prod` 한 개, production backend | prod-v2 미생성 |
| Backup Worker | version `2344c41b...`, 2026-07-18, traffic 100% | 배포 완료 |
| Backup Workflow | `nihongo-n3-d1-backup-workflow` 한 개 | 정상 |
| Observability receiver | preview version `65110623...`, 2026-07-15 | preview 검증, production 미연결 |

### 8.1 Backup 운영 증거

| 항목 | 결과 |
| --- | --- |
| instance | `manual-backup-2026-07-18T05-36-28-521` |
| status | `complete` |
| R2 root | `backups/workflow/2026-07-18/2026-07-18T05-36-35-908Z` |
| object | SQL 23개 + manifest 2개 |
| manifest SHA-256 | `487870e112bd3e0ad41466848bf25336d4800b3711ee738013a875af5603df43` |
| restore drill | migration 9/9, row count, FK, FTS parity 통과 |
| lifecycle | `backups-30d-expiry`, prefix `backups/`, 30일 |
| runtime secret | 0개 |

GitHub Backup run [29631932489](https://github.com/kordokrip/JLPT/actions/runs/29631932489)는 Environment 승인과 runner 시작 뒤 D1 export REST API `10000 Authentication error`로 실패했다. 신규 active scoped token에서도 재현돼 billing 또는 코드 실패와 분리했다. required check를 optional로 바꾸지 않고 Cloudflare binding Workflow와 restore drill을 대체 운영 증거로 사용한다.

## 9. 보안과 비밀정보

- `.env.local`, `apps/web/.env.local`, `.artifacts/`는 Git ignore 상태다.
- 두 env 파일의 비밀값 18개를 변경 diff와 대조한 결과 일치 0건이었다.
- Global API Key는 로컬 Cloudflare 관리 호출에만 사용했고 Worker secret, source, manifest에 저장하지 않았다.
- Backup SQL에는 인증·회원 관련 민감 데이터가 포함될 수 있으므로 R2 bucket 접근을 운영 binding과 승인된 관리자 자격으로 제한한다.
- 문서에는 token 값, 실제 이메일, session ID, OAuth state를 기록하지 않는다.

## 10. 남은 작업과 실행 순서

### P0: 운영 코드와 저장소 수렴

1. PR #36을 검토·merge해 Backup source와 운영 배포 상태를 일치시킨다.
2. `main` 기준 Workers/Pages production 수동 배포를 실행한다.
3. 배포 직후 root, health, OpenAPI 53 paths, auth config, Google OAuth, 주요 content route를 smoke한다.
4. Pages production deployment가 7월 18일 main SHA를 가리키는지 확인한다.

### P0: D1 Blue/Green

1. `nihongo-n3-prod-v2`를 생성한다.
2. canonical migration 9/9를 처음부터 적용한다.
3. content phase count/checksum과 FTS parity를 검증한다.
4. read-only에서 mutable/session final sync를 수행한다.
5. preview Worker로 password/OAuth/admin/SRS/sync/503 smoke를 통과한다.
6. binding 전환 후 30분 smoke, 24시간 관측, old DB 30일 read-only 보존을 수행한다.

### P1: 오디오

1. 네 provider의 동일 30문장 사람 청감표를 완성한다.
2. 승인 provider로 N5→N4→N3 순서의 batch를 수행한다.
3. `verify:remote:audio` 누락 0과 R2 metadata/D1 key 정합을 확인한다.

### P1/P2: 콘텐츠 확장

1. N2/N1 `AUTO` 2,674건과 `EN` 1,931건을 사람 검수하고 provenance를 확정한다.
2. 태그 0건 이후에만 manifest와 `CONTENT_PATHS`에 등록한다.
3. TOPIK T4 public track-aware API와 placement scoring은 별도 검수·승인 릴리스로 진행한다.

## 11. 완료와 미완료의 경계

| 표현 | 이 문서에서의 의미 |
| --- | --- |
| 구현 완료 | 코드와 단위 계약이 존재함 |
| 검증 완료 | 정적 관문과 실행·데이터 관문 통과 |
| main 통합 | GitHub 기본 브랜치에 merge됨 |
| preview 배포 | production과 분리된 Cloudflare artifact 검증 |
| production 배포 | 실제 Pages/Worker/D1 binding이 해당 SHA를 사용함 |
| 콘텐츠 출시 | 검수·provenance·manifest·API·UI가 같은 release에서 활성화됨 |

현재 프로젝트는 코드·검증 관점에서 R1 통합 후보 수준까지 도달했지만, 운영 API/Pages/D1은 아직 최신 main과 완전히 수렴하지 않았다. 다음 배포의 핵심은 기능 추가가 아니라 `main -> production Worker/Pages -> prod-v2 D1`의 순서를 증거와 함께 닫는 것이다.

## 12. 근거 문서와 재현 명령

- [릴리스 로드맵](../ROADMAP.md)
- [기술부채 대장](./TECH_DEBT_2026-07-14.md)
- [세션 변경 기록](./SESSION_CHANGELOG_2026-07-14.md)
- [R1 Blue/Green runbook](./R1_BLUE_GREEN_RUNBOOK_2026-07-15.md)
- [Cloudflare D1 Backup Workflow](./cloudflare-d1-backup-workflow.md)
- [오디오 정책](./audio-tts-provider-policy-2026-07-07.md)
- [TOPIK 확장 계획](./TOPIK_PRODUCT_EXPANSION_PLAN_2026.md)

```bash
git diff --name-status 1ae2401..3232fb6
pnpm audit --audit-level high
pnpm verify:ci
pnpm -F @nihongo-n3/e2e test:chromium
pnpm -F @nihongo-n3/e2e test:webkit
pnpm -F @nihongo-n3/d1-backup instances
```

`.env.local`과 R2 backup SQL은 근거 문서가 아니라 비밀/민감 운영 자료이므로 Git에 포함하지 않는다.
