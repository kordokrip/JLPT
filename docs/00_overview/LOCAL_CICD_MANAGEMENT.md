# 커밋 전 짧은 체크리스트

갱신: 2026-10-14. 2/5/20분은 예산 목표이지 성공 조건이 아니다. 시간 만료는 미완료다. 위험과 배포 기준은 [CI/CD 기준](LOCAL_CICD_OPERATIONS.md) 한 곳에서 관리한다.

## B — 문서·운영 정리

**2분, 문서만:** `git diff --name-only` → `git diff --check` → `pnpm docs:catalog` → `pnpm docs:check` → `pnpm ops:status`. 시작 상태도 기록한다. 에이전트 설정은 TOML과 실제 CLI 로딩을 확인하고 환경 장애는 따로 기록한다.

**5분, 운영 스크립트/삭제 포함:** 위 검사 + `pnpm test:ops` + 정확한 삭제 대상의 정적/동적/CLI/문서 참조 검사. 원격 배포값을 바꿀 때만 원격 상태를 조회한다. 앱 소스·의존성·migration 삭제는 B가 아니라 A다.

## A — 코드 변경

**5분, 영향 검사:** diff/문서 검사 + typecheck + 변경 기능 단위/계약. API 계약 변경은 `pnpm openapi:check`, 음성 관련 변경은 `pnpm release:verify:audio-contract`, UI 변경은 해당 build·화면 검사. 전체 통과라고 보고하지 않는다.

**20분, 최종 앱 후보:** `pnpm verify:ci`와 영향 브라우저 Chromium/WebKit. 배포라면 필수 전체 E2E·Preview·backup/restore·rollback·predeploy까지 CI 기준대로 수행한다. 20분에 맞추려고 필수 검사를 생략하지 않는다.

## 기록

변경 파일·명령/exit·pass/fail/skip·후보 SHA·증적·미확인 사항만 남긴다. 같은 로그를 여러 문서에 복사하지 않는다. `git diff --cached --check`로 정확한 파일과 비밀 제외를 확인한다. 이번 요청에 없는 commit/push/deploy는 실행하지 않는다.
