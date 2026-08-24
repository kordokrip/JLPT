# JLPT · TOPIK 저장소 운영 지침

이 저장소에서 코드, 데이터, 문서, 테스트, 배포 또는 리팩터링을 다루는 모든 에이전트는 작업을 시작하기 전에 다음 파일을 순서대로 읽습니다.

1. `docs/README.md`
2. `docs/00_overview/CURRENT_STATE.md`
3. `docs/00_overview/ERROR_LEDGER_2026-08-23.md`
4. `docs/00_overview/OPERATIONS_MANAGEMENT_RUNBOOK.md`
5. `docs/00_overview/LOCAL_VERSION_CONTROL_AND_RELEASE_LEDGER_2026-08-23.md`
6. 작업과 관련된 schema, route, source, test

운영 감사, 버그, 리팩터링, CI/CD 추적 또는 릴리스 작업에는 `.codex/skills/project-operations-steward`를 사용합니다. 콘텐츠 배포에는 `.codex/skills/content-release-automation`을 추가로 사용합니다.

## 진실의 우선순위

현재 실행 결과와 원격 read-only 조회 → 코드·schema·migration·test → `CURRENT_STATE.md` → 오류/릴리스 원장 → 과거 계획 문서 순입니다. 과거 문서의 완료 표기만으로 현재 상태를 확정하지 않습니다.

## 변경 규칙

- 기존 작업 트리를 reset, checkout, stash 또는 광범위 삭제하지 않습니다.
- 버그는 재현 증거 → 오류 원장 ID → 회귀 테스트 → 수정 → 영향 테스트 → 문서 갱신 순서로 처리합니다.
- 리팩터링은 외부 API, DB 계약, 학습 진행률, FSRS, 음성 정책을 먼저 고정하고 동작 변경과 구조 변경을 분리합니다.
- 구현·검증 명령·배포 상태가 바뀌면 같은 변경에서 `CURRENT_STATE`, 오류 원장, 운영 runbook과 관련 릴리스 기록을 갱신합니다.
- `.env*`, D1 backup 원문, 인증 정보, 사용자 데이터와 `.artifacts` 원문은 커밋하지 않습니다.

## 음성 불변 조건

발음은 같은 언어의 Google 브라우저 음성을 우선하고, 없으면 같은 언어에 설치된 브라우저/기기 음성을 사용합니다. 한국어는 `ko-*`, 일본어는 `ja-*`만 허용합니다. R2 발음 수집·생성·저장·조회·재생·fallback은 금지하며 legacy `/api/v1/audio/*`는 `410 Gone`을 유지합니다.

## CI/CD와 Production

- GitHub Actions는 비활성 placeholder로 유지합니다. 실제 gate는 승인된 로컬 실행과 문서 원장으로 관리합니다.
- 작업 전후 `pnpm ops:status`를 실행하고, 원격 현재 상태를 확인할 때 `pnpm ops:status:remote`를 사용합니다.
- Production write/deploy는 현재 세션의 명시적 사용자 승인, Preview, D1 backup/restore drill, rollback 대상과 predeploy gate가 모두 있을 때만 수행합니다.
- 실패·미실행·mock 결과를 통과로 기록하지 않습니다. current HEAD manifest drift는 `INC-DATA-024`가 해결되기 전까지 운영 release source에 고정해 검증합니다.

## 산출물 보존과 정리

Production D1 backup, release/rollback 증적, 콘텐츠 intake/quality artifact와 장애 복구 bundle은 보존합니다. `.DS_Store`, build 결과, Playwright report/test-results 같은 재생성 가능한 파일만 참조·보존가치를 확인한 뒤 정리합니다.
