# 커밋 전 로컬 CI/CD 짧은 체크리스트

갱신: 2026-10-11 KST. 전체 계약은 [로컬 CI/CD 운영 기준](LOCAL_CICD_OPERATIONS.md), 실제 결과는 [릴리스 원장](LOCAL_RELEASE_LEDGER.md)을 따른다. 아래 시간은 목표 예산이며 완료하지 못한 gate를 통과로 표시하지 않는다.

## A — 코드 변경 포함

### 5분: 커밋 전 최소 검사

```sh
git status --short --branch
git diff --check
pnpm docs:catalog
pnpm docs:check
pnpm release:verify:audio-contract
pnpm openapi:check
pnpm typecheck
# 수정한 기능의 실제 단위/계약 테스트를 추가 실행한다.
pnpm ops:status
```

합격: API 생성 타입·정적 타입·문서 지도·음성 계약과 변경 기능 검사가 exit0, diff 오류0. 관련 테스트를 골라 실행했어도 전체 릴리스 gate 통과로 보고하지 않는다.

### 20분: 전체 로컬 gate와 영향 브라우저

```sh
pnpm docs:catalog
pnpm docs:check
pnpm ops:verify
# 예: 실제 변경 표면에 맞춰 spec을 지정
pnpm -F @nihongo-n3/e2e exec playwright test audio-qa.spec.ts pwa.spec.ts \
  --project=chromium --project=webkit --workers=1 --retries=0 --reporter=line
git diff --check
```

합격: 전체 단위·OpenAPI·typecheck·build·후보 fresh D1 `0000–0031`와 해당 브라우저 계약이 exit0(운영은0030 유지). fresh는 음성 provenance·FK/FTS·manifest·content contract/control-plane을 포함한다. 시간 내 종료되지 않으면 완료까지 실행하거나 미완료로 기록한다. 콘텐츠 변경은 source·두 reviewer·validator·G0–G4 gate를 추가한다.

신규220레슨/440문항 후보에는 `pnpm -F @nihongo-n3/db content:learning:readiness`도 필수다. 현재 결과는exit1/공개 차단이며 구조 검사 통과·합성 저장 fixture·불합격 차단 회귀의 통과로 대체하지 않는다. 이를 생략하고 Preview/Production 공개 단계로 넘어가지 않는다.

## B — 문서·운영 정리 전용

### 2분: 문서만 변경

```sh
git diff --name-only
git diff --check
pnpm docs:catalog
pnpm docs:check
pnpm ops:status
```

합격: 내용 변경이 문서에 한정되고 파일 지도·링크·필수 문서·직접 DB source 참조가 일치한다. Git dirty 경고는 작업 파일과 대조하고 `INC-DATA-024`는 원장과 대조한다.

### 5분: 운영 스크립트·삭제 목록 포함

```sh
pnpm test:ops
pnpm release:verify:audio-contract
pnpm docs:check
pnpm ops:status:remote
git diff --check
```

합격: 실행 설정·참조를 다시 대조하고 운영 회귀·원격 식별자 검사까지 exit0. 실행 앱 소스·설정·의존성·migration을 삭제하거나 변경했으면 B만으로 끝내지 않고 A를 적용한다. 원격 조회 실패는 별도 실패로 기록하며 로컬 검사 통과와 혼합하지 않는다.

## 커밋·push·배포 판정

승인된 커밋은 정확한 변경 파일만 stage하고 `git diff --cached --check`·`git show --check`로 확인한다. push 후에는 원격 branch SHA·로컬 SHA·작업 트리와 `ops:status:remote`를 대조한다. 비밀·백업 원문·사용자 데이터·`.artifacts`를 Git에 넣지 않는다.

Production에는 전체 로컬 gate → 전용 Preview·현재 후보 실제 Chrome 양언어 lifecycle/가청/Network → D1 backup·restore drill → rollback → predeploy → 승인된 변경 → postdeploy 순서를 적용한다. 짧은 커밋 gate만으로 배포를 판정하지 않는다. Actions는 비활성 placeholder이며 실제 실행 결과는 로컬 MD/ignored JSON 원장으로 관리한다.
