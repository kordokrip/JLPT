# 로컬 CI/CD 운영 기준

최종 점검: 2026-08-30 KST

이 저장소의 릴리스 gate는 GitHub Actions가 아니라 검증된 로컬 명령과 로컬 원장으로 운영한다. GitHub는 commit·branch·tag 보관과 push에만 사용하며 `.github/workflows/ci.yml`은 `workflow_dispatch`와 `if: false`를 유지하는 비활성 placeholder다.

## 진실의 우선순위

현재 명령 결과와 원격 read-only 조회 → 코드·schema·migration·test → [현재 상태](CURRENT_STATE.md) → [오류 원장](ERROR_LEDGER.md) → [로컬 릴리스 원장](LOCAL_RELEASE_LEDGER.md) → 과거 릴리스 기록 순으로 판단한다. 과거 문서나 artifact의 통과 기록은 현재 후보의 통과로 재사용하지 않는다.

## 로컬 파이프라인

| 단계 | 명령 | 차단 기준 | 기록 |
| --- | --- | --- | --- |
| 시작 상태 | `pnpm ops:status` | 실패 1개 이상 | `.artifacts/operations/ops-status-latest.json` |
| 문서 수명주기 | `pnpm docs:check` | 깨진 링크, 필수 문서 누락, 폐기 경로 재등장 | 종료 코드와 변경 요약 |
| API 계약 | `pnpm openapi:check` | source와 생성 타입 불일치 | 종료 코드 |
| 정적·단위·DB | `pnpm typecheck && pnpm test` | 실패·skip 오판 | 종료 코드와 실제 test 수 |
| 빌드·fresh D1 | `pnpm build && pnpm -F @nihongo-n3/db verify:fresh` | migration, FK/FTS, manifest, 음성·품질 계약 실패 | 종료 코드와 manifest |
| 통합 로컬 gate | `pnpm ops:verify` | 위 단계 중 하나라도 실패 | 원장에 후보 SHA와 함께 기록 |
| 브라우저 | `pnpm test:e2e` 또는 영향 spec 명시 | Chromium/WebKit 제품 흐름 실패 | 실행한 project/spec와 pass/skip/fail |
| 원격 확인 | `pnpm ops:status:remote` | Git·Pages·Worker·D1·HTTP 계약 실패 | read-only artifact |

`CI=true`는 도구의 비대화식 동작과 reporter 선택에만 사용할 수 있다. GitHub Actions 실행을 의미하지 않는다. E2E는 격리된 로컬 Worker와 Vite 서버를 기본으로 사용하며 `E2E_REUSE_EXISTING_SERVER=1`은 호출자가 해당 프로세스의 checkout과 build를 확인한 경우에만 허용한다.

## 변경 유형별 추가 gate

- DB·콘텐츠: `question:quality`, `content:contract:verify`, `content:control-plane:verify`, idempotent fresh/upgrade와 source checksum을 확인한다.
- API·데이터 바인딩: OpenAPI 생성 전후 diff, track guard, 정답 사전 노출 금지, progress→FSRS→activity transaction을 확인한다.
- 음성: `pnpm release:verify:audio-contract`, Chromium/WebKit 재생 lifecycle, 실제 배포 Chrome의 한국어·일본어 `onend`, `/api/v1/audio/*` 요청 0건과 Production D1 R2 발음 참조 0건을 서로 분리해 기록한다.
- Production: 현재 세션 승인, 전용 Preview, D1 backup/restore drill, rollback Worker/Pages, predeploy 증적이 모두 있어야 한다. 이 문서나 `ops:*` 명령은 Production write를 자동 승인하지 않는다.

## 형상관리와 증적

1. 시작과 종료에 branch, HEAD, `git status --short`, origin SHA를 확인한다.
2. 사용자 변경을 reset·checkout·stash하지 않는다.
3. 문서·코드·테스트·생성 타입을 하나의 원자적 commit으로 고정한다.
4. `git diff --check`, `git show --check`, 종료 `ops:status`를 통과한 commit만 push한다.
5. release tag는 실제 릴리스 기준선에만 `release/YYYY-MM-DD/<scope>`로 만든다. 문서 정리만으로 Production tag를 만들지 않는다.
6. `.env*`, 사용자 데이터, D1 backup 원문, 인증 정보, `.artifacts` 원문은 push하지 않는다.
7. push 실패 시 로컬 commit SHA와 실패 원인을 [로컬 릴리스 원장](LOCAL_RELEASE_LEDGER.md)에 남기고 같은 SHA만 재시도한다. force push는 금지한다.

## 문서·파일 수명주기

- 활성 운영 문서는 날짜 없는 영구 경로를 사용한다: `CURRENT_STATE.md`, `ERROR_LEDGER.md`, `OPERATIONS_MANAGEMENT_RUNBOOK.md`, `LOCAL_CICD_OPERATIONS.md`, `LOCAL_RELEASE_LEDGER.md`, `SUB_AGENT_HANDOFF.md`.
- 날짜가 붙은 문서는 incident·Preview·release·maintenance 증적처럼 완료 시점이 고정된 기록에만 사용한다.
- `docs/01_n5`–`docs/07_topik`은 seed/parser가 읽을 수 있는 콘텐츠 원본이다. 오래된 버전 번호만으로 삭제하지 않고 코드 참조와 checksum을 먼저 확인한다.
- Production backup, restore drill, recovery bundle, source intake, reviewer/quality evidence는 보존한다.
- `.DS_Store`, `dist`, Playwright report/test-results처럼 재생성 가능한 항목만 참조·보존가치를 확인한 뒤 정리한다.

세부 장애 처리와 배포 절차는 [운영 runbook](OPERATIONS_MANAGEMENT_RUNBOOK.md), 실제 실행 이력은 [로컬 릴리스 원장](LOCAL_RELEASE_LEDGER.md)을 따른다.
