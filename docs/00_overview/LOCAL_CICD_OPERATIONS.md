# 로컬 CI/CD — 변경 위험에 맞는 검증

갱신: 2026-10-26. 개인·가족 앱에 별도 기업형 파이프라인을 추가하지 않는다. GitHub Actions는 비활성 placeholder, 기존 pnpm/script와 로컬 증적을 사용한다. 현재 배포는 [CURRENT_STATE](CURRENT_STATE.md), 역사적 실행은 [릴리스 원장](LOCAL_RELEASE_LEDGER.md)이다.

## 테스트 선택표

| 변경 | 개발 중 필수 | 배포 전 추가 |
| --- | --- | --- |
| 문서·에이전트 지침만 | diff, catalog/links/lifecycle, TOML/설정 검사, ops:status | 앱 배포 불필요 |
| 운영 검사/배포 스크립트 | 위 검사 + test:ops + 변경 스크립트 dry-run/회귀 | 실제 대상·승인·복귀 검증 |
| UI/CSS/일러스트만 | web typecheck·영향 단위·build, 바뀐 화면 Chromium/WebKit·ko/ja·밝음/다크·폭/확대 | 최종 전체 gate·Preview·사용자 확인·기존 운영 gate |
| 상태/조회/제출/오프라인 UI | 위 검사 + API 인자·저장 실패·중복·재개·계정/트랙 전환 | 실제 Preview 해당 흐름 및 전체 회귀 |
| API/인증/FSRS/XP/알림 | shared/API 영향 단위·OpenAPI/typecheck·격리/중복/날짜 경계 | 전체 gate·실제 backend Preview |
| schema/migration/콘텐츠 | 위 검사 + fresh/기존 기록 upgrade·FK/FTS·재시드/철회·학습 보존 | source/독립 리뷰/품질/G0–G4, 현 schema backup/restore |

표는 개발 반복 비용을 제한하며 배포 gate를 면제하지 않는다. 문서만 변경했다면 신규 가청·푸시 수신·전 급수 E2E를 다시 요구하지 않는다. 테스트 삭제·허용 오차 확대·실패 숨기기로 비용을 줄이지 않는다.

## 실행 원칙

- 시작/종료 `pnpm ops:status`; 원격 상태가 판정에 필요한 때만 `pnpm ops:status:remote`.
- 영향 파일/호출자와 테스트를 먼저 정하고 한 checkout에서는 build/test writer를 직렬 실행한다.
- 최종 앱 후보: `pnpm verify:ci`(음성 계약·OpenAPI·타입·전체 단위·build·fresh)와 필수 브라우저/제품 gate를 수행한다.
- 배포 후보와 동일한 feature flags로 build/E2E한다. 개인화 활성 후보는 `VITE_ACCOUNT_PERSONALIZATION_ENABLED=true`로 검사하며 flag-off 결과로 활성 기능을 승인하지 않는다.
- 현재 schema는0033이다. 스크립트가 미래 schema를 지원하는지는 migration 변경 때 검증한다. 오래된0030/0031 수치를 고정 gate로 쓰지 않는다.
- 실패하면 원인/정확한 실패키를 먼저 확인한다. 변경 없는 전체 suite를 이유 없이 반복하지 않는다. 재검사 합산 결과는 단일 전체 green과 구분한다.
- 후보 SHA/콘텐츠 hash/설정/환경/명령/exit/count/skip/증적 경로를 기록한다. 동일 후보의 유효 결과는 링크하고 새 실행이라 부르지 않는다.
- `INC-DATA-024`는 immutable 운영 content source/manifest로 검사한다. HEAD drift 때문에 운영을 재시드하지 않는다.
- Pages HTTP 검사는 canonical의 운영 API 연결과, API_ORIGIN이 없는 비canonical 호스트의503 격리를 구분한다. 격리를 풀어 검사에 맞추지 않는다. verifier 자체의 exclusive 출력 경로와 셸 리다이렉션 로그 경로는 분리한다(`INC-QA-127`).

## 배포 gate — 생략 금지

### 인증·요청 경계 변경의 영향 검사

- OAuth state/bridge 재사용·cookie 결합·Preview 호스트·기존 계정 연결, 공개 가입 역할, production cookie를 검사한다. Google provider mock과 실제 OAuth 시작/완료를 구분한다.
- Worker와 Pages 프록시 각각의 외부 Origin/null/Fetch Metadata 차단 및 정상 요청, IP/계정 제한, 로그아웃401/5xx/계정 전환 경쟁을 검사한다.
- 푸시는 기존 저장 구독을 읽기 전용 대조하고 표준 Base64/Base64url·제공자·redirect 거부를 확인한다. 실제 기기 수신과 발송 수락은 별도다.
- 합성 사용자 수백 명의 로컬 가입은 `isolateLocalAuthClient`로 IP를 분리한다. 실제 계정 제한은 별도 E2E로 유지하며 제품 limiter를 끄거나 한도를 늘리지 않는다. 운영 가입 시험은 금지한다.
- 운영 상태의 branch 검사는 원래 branch에서, 앱 build/deploy는 clean release worktree에서 수행한다. detached checkout 또는 보존 증거 부재 때문에 실패한 진단을 앱 장애로 오판하지 않는다.
- [2026-10-26 후보 증거](SECURITY_HARDENING_2026-10-26.md)를 참조하되 다른 SHA의 통과로 복사하지 않는다. 문서만 달라진 후속 커밋은 runtime source와 구분한다.

### 실행 순서

현재 세션의 명시적 사용자 승인 → clean 후보 SHA 고정 → 최종 로컬 gate → 전용 Preview(해당 기능·기존 학습 회귀) → 실제 Chrome ko/ja lifecycle·사람 가청·Network R2/legacy0 → 현 schema backup/restore와 복귀 대상 → predeploy → 승인 범위 배포 → 사후 verifier/smoke → 점검 해제/저장 확인. 필수 gate 실패 시 다음 단계로 진행하지 않는다.

Preview 검사는 합성 QA 계정·전용 backend·Preview 전용 SSO/VAPID로 격리한다. Production 사용자 학습 기록을 시험용으로 생성하거나 격리 환경에 복사하지 않는다. 운영 OAuth 자격 증명은 유지한다.

사용자가 특정 사람 관찰을 유예하면 해당 항목은 유예로 남긴다. mock·발송 수락·onend를 실제 수신/가청으로 바꾸지 않는다. Pages-only 변경에 Worker/migration/콘텐츠를 끼워 배포하지 않는다. 데이터 손상이 없는 UI 복귀는 이전 Pages + 호환 Worker 유지이며 D1 복원이 아니다.

비밀·사용자 자료·backup 원문·`.artifacts`는 커밋하지 않는다. 커밋/push/Production은 작업의 명시 범위에 따른다. [짧은 체크리스트](LOCAL_CICD_MANAGEMENT.md), [운영 runbook](OPERATIONS_MANAGEMENT_RUNBOOK.md).
