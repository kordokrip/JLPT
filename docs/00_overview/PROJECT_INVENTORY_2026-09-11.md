# 프로젝트 폴더 특성 인벤토리 (2026-09-11 기준)

## Top-level 구성

- `apps/`: 런타임 코드(React PWA + Hono Worker API)
- `packages/`: 공통 스키마/seed/DTO 패키지 및 DB verifier
- `e2e/`: Chromium/WebKit 흐름 테스트 및 음성/네트워크 회귀
- `scripts/`: 운영/검증/배포 보조 스크립트
- `docs/`: 운영·기획·증적 문서
- `root`: 실행/배포 상태·의존 관계를 설명하는 핵심 문서 및 정책

## apps

- `apps/api`: Worker 진입점과 공개 API 라우트 집합
  - `src/routes/*`: 인증·트랙·퀴즈·TOPIK owner/FSRS·음성·activity 등 핵심 API
  - `src/lib/*`: release control, 학습 효과, 콘텐츠 적재/채점/정책 로직
  - `src/middleware/*`: 인증, 보안, 유지보수, rate-limit, 캐시/관측성
  - `src/workflows/*`: 릴리스 워크플로우 보조
  - `src/jobs/*`: 운영 background 작업(알림·FSRS 최적화)
- `apps/web`: 사용자 화면(PWA)
  - `src/pages/*`: 홈/문제/학습/복습/설정/통계/오디오QA/TOPIK/JS 트랙
  - `src/features/*`: 학습/퀴즈/문항/복습/TOPIK/성취도
  - `src/components/*`: 공통 컴포넌트, 오디오 버튼, SRS 카드
  - `src/hooks/*`: API 호출, SRS, 학습 이벤트 큐, 트랙 상태 관리
  - `src/lib/*`: API/동기화/음성 정책/캐시/FSRS 클라이언트
  - `src/stores/*`: auth/settings/UI 상태 관리
  - `src/pages/__tests__`, feature 테스트: 핵심 흐름 회귀 테스트 집합

## packages

- `packages/db`: DB 스키마·마이그레이션·seed·verifier·운영 도구
  - `drizzle-v2/*.sql`: migration 이력(현재 `0000–0028` 기준)
  - `src/schema.ts`: 핵심 테이블 타입
  - `src/ops/*`: content release, quality, verifier, backup/restore, migration ledger
  - `src/seed/*`: JLPT/N1/N2/TOPIK seed 및 품질/리뷰/검증 대상 데이터 생성
- `packages/shared`: API 스키마·FSRS·오디오 계약·공통 타입
  - `src/api-schemas.ts`, `audio-policy.ts`, `learning-experience.ts`, `learning-activity.ts`

## e2e

- 학습 흐름, 설정, 퀴즈, 브라우저 speech 정책, TOPIK/FSRS 경로, 접근성, 네이티브 동작을 검사하는 Playwright spec 집합
- `test-results/`, `playwright-report/`는 증적/디버그 성격이므로 재생성 가능. 커밋 금지.

## scripts

- 로컬 운영 상태/증적 수집기(`project-ops-status.mjs`), DB backup/restore, release 보조 자동화가 포함됨
- 기능 변경 시 `docs:check`, `ops:verify`, audio provenance, content-control 검증 스크립트와 함께 사용

## docs

- 운영 기준: `CURRENT_STATE.md`, `ERROR_LEDGER.md`, `LOCAL_RELEASE_LEDGER.md`, `OPERATIONS_MANAGEMENT_RUNBOOK.md`
- 시계열/계획: `CHANGELOG_TIMELINE_2026-09-11.md`, `ROADMAP.md`
- 학습 경험: `LEARNING_EXPERIENCE_PLAN.md`
- CI/CD 관리: `LOCAL_CICD_MANAGEMENT.md`, `LOCAL_CICD_OPERATIONS.md`
- 콘텐츠/품질: `CONTENT_AUDIT.md`, `CONTENT_SOURCE_REGISTRY.md`, `0*` 정리 문서군, incident/release 증적

## 정리 권장(재생성 가능)

- `.artifacts`, `playwright-report`, `test-results`, `dist`, `node_modules`, `.wrangler`는 증적이나 빌드 산출물 분리 원칙으로 관리
- 추적이 필요한 원천 문서와 migration 파일만 버전관리 대상 유지
- 미사용 코드/테이블 삭제는 아래 조건에서만 수행
  1) 참조 추적(RG + schema + route + 마이그레이션 + migration ledger)
  2) 운영 증거와 합의 문서 두 곳 이상 교차 확인
  3) 대체 루틴/기능이 명시되어 있는 경우

## 현재 파일 기준점(요약)

- 총 추적 대상 파일( `.gitignore` 제외 ): `apps(308) / packages(215) / e2e(89) / scripts(22) / docs(58)`
- `apps`: API+UI의 실체 기능이 분리되어 있어 삭제가 제한됨
- `packages`: verifier와 migration이 release 정책을 제어하므로 임의 축소 위험
- `docs`: 과거 상태/증적 문서도 운영 판단 근거이므로 임의 삭제 전 교차검증 필요
