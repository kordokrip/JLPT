# 로컬 CI/CD 운영 관리 매뉴얼 (서브 Agent 운영용)

최종 갱신: 2026-09-11 KST

GitHub Actions는 실질적 배포 gate가 아니며, 운영의 실질 증빙은 **로컬 gate + read-only remote 상태**입니다. 이 문서는 본 저장소 내 모든 릴리스 변경 시 Sub Agent가 사용할 우선 실행 문서입니다.

## 1) 실행 우선순위

1. 현재 명령 결과(`pnpm ops:status`)
2. 실행 코드/스키마/마이그레이션/테스트
3. [CURRENT_STATE.md](CURRENT_STATE.md)
4. [ERROR_LEDGER.md](ERROR_LEDGER.md)
5. [LOCAL_RELEASE_LEDGER.md](LOCAL_RELEASE_LEDGER.md)

## 2) 문서 연계

- 상태/증적 중심: `docs/README.md`, `CURRENT_STATE.md`
- 오류/차단: `ERROR_LEDGER.md`
- 실행 원장: `LOCAL_RELEASE_LEDGER.md`
- 작업 전용 인수인계: `SUB_AGENT_HANDOFF.md`
- 배포/운영 절차: `OPERATIONS_MANAGEMENT_RUNBOOK.md`
- 시계열 변경 요약: [CHANGELOG_TIMELINE_2026-09-11.md](CHANGELOG_TIMELINE_2026-09-11.md)

## 3) 기본 로컬 배포 파이프라인

### 상태 점검

```bash
pnpm ops:status
git status --short
```

- 실패/경고가 있으면 **원인 분해 후 교정**
- warning `db:manifest-drift`는 `INC-DATA-024`로 추적 중이면 fail-closed 규칙으로 처리

### 코드/스키마 변경 시 게이트

```bash
pnpm ops:verify
pnpm -F @nihongo-n3/db content:contract:verify
pnpm -F @nihongo-n3/db content:control-plane:verify
pnpm docs:check
```

- `fresh 0000–0028`, FK/FTS, migration ledger, release-control contract, question quality, docs 링크 integrity를 모두 한 번에 통과해야 함

### 브라우저/시나리오 검증

```bash
pnpm -F @nihongo-n3/e2e exec playwright test --project=chromium --project=webkit
```

- 시각 suite는 프로젝트 단위 제외 정책과 동일하게 관리. mock 결과와 실제 가청·네이티브 네트워크는 분리 보관

## 4) 릴리스 승인 체크리스트

1. `local gate` 통과
2. preview 또는 대상 환경 E2E 통과
3. D1 backup·restore drill(미래 rollback 대상) 완료
4. `pnpm ops:status:remote`에서 remote 상태 확인
5. production predeploy gate(backup, rollback ID, publish manifest, top-level hash) 통과
6. 승인 요청/수락 후 배포 실행

> 원격 네트워크 장애(예: DNS/연결 불가)로 `ops:status:remote`가 실패하면 무조건 멈춤. 통과로 기록하지 않음.

## 5) 증적 저장 규칙

- 증적 JSON은 `.artifacts/operations` 및 `.artifacts/releases` 아래에 저장하고 Git에 포함하지 않음
- rollback 대상은 `Worker/Pages` id, manifest hash, backup/restore 산출물을 한 묶음으로 기록
- `INC-` 티켓은 해결 전까지 close하지 않음

## 6) 삭제/정리 대상 처리 규칙

- 삭제는 아래 둘 중 하나가 모두 충족되면 수행
  - 실제 참조가 0건(직접 참조·스크립트·route·migration에서 확인)
  - 생산성/가독성에 기여하지 않음이 재현되고 교차검증으로 확인됨
- 증거 없는 추정 삭제 금지
- 실사용 인증/DB 증적/배포 증거는 원래 보관 위치로 이동만 허용

### 이번 실행에서 적용한 삭제 규칙 예시

- `scripts/fsrs-optimizer-service.example.mjs`: `scripts/` 하위에서 오직 예시 파일이며 실제 실행 경로·문서·테스트에서 참조되지 않음을 교차검증 후 삭제.
- 삭제 대상이 `0`개인 상태로 유지된 카테고리: 미참조 SQL/테이블/문서 조각은 운영·재해복구 경로에 직접 사용되는 것으로 판정되어 이번 라운드에서 유지.

## 7) Sub Agent 작업 종료 리포트 기본형

- Confirmed: 현재 실행·코드·상태로 확인한 사실
- Changed: 수정 파일/테이블/API/배포 단위
- Validation: 실행한 명령·pass/skip/fail
- Preserved: 백업/rollback/증거 보존 항목
- Blocked: 현재 미해결 항목
- Next safe step: 즉시 다음 실행 가능한 최소 작업
