# 운영관리 runbook

갱신: 2026-10-26. 현재 식별자/미확인 항목은 [CURRENT_STATE](CURRENT_STATE.md), 모델 배정은 [AGENTS](../../AGENTS.md), 테스트 선택은 [CI/CD](LOCAL_CICD_OPERATIONS.md)에만 둔다.

## 작업 시작

작업 트리와 현재 상태를 확인하고 `pnpm ops:status`를 실행한다. 전체 원장 대신 관련 오류/릴리스 항목만 검색한다. 현재 원격 사실이 필요할 때만 `pnpm ops:status:remote`. 기존 dirty 파일을 reset/checkout/stash하지 않는다.

## 장애·리팩터링

1. 재현 증거와 실제 영향 범위를 잡는다. [오류 원장](ERROR_LEDGER.md)의 기존 ID를 찾고 없으면 추가한다.
2. 해당 회귀 테스트를 먼저 고정한다. source와 호출자/실행 결과를 교차검증한다.
3. 동작 수정과 구조 정리를 분리한다. 기존 API·학습 기록·계정/트랙 격리·FSRS·XP·음성 계약을 보존한다.
4. 영향 검사 후 결과/남은 위험을 기록한다. 배포는 별도 전체 gate다.

## 인증·보안 변경 운영

- `google_account_link`는 이메일만 같은 비연결 계정의 자동 병합을 막은 상태다. 기존 비밀번호 로그인으로 안내하고 운영 DB의 Google 식별자를 임의 연결하지 않는다. `google_state`는 로그인부터 다시 시작하며 state/cookie 검사를 끄지 않는다.
- 429는 일시 제한이다. Retry-After를 따르고 영구 계정 잠금으로 설명하지 않는다. 로그아웃 네트워크/서버 실패는 다시 시도하며 성공으로 숨기지 않는다.
- 기존 푸시 키가 padded Base64라는 이유로 구독을 삭제하거나 재등록시키지 않는다. 제공자/인코딩 호환성을 먼저 확인한다. 검증 거부를 우회하는 임의 URL allowlist는 추가하지 않는다.
- 보안 런타임 복귀는 이전 Worker의 방어 부재도 함께 되돌린다. 정확한 Worker/Pages ID와 재노출 위험을 기록하고, 정상 학습 행을 백업으로 덮어쓰지 않는다. 배포 중 구형 OAuth 진행 상태만 재시작이 필요할 수 있다.
- 상세 사건은 [보안 보강 기록](SECURITY_HARDENING_2026-10-26.md), 오류 원장의 `INC-SEC-129`로 추적한다.

## 안전한 정리 절차

테스트 계정은 [QA 계정 운영](QA_ACCOUNT_OPERATIONS.md)의 Preview 고정 2개를 재사용한다. 운영 회원 삭제는 정확 ID 허용목록·현재 전체 백업/복원·로컬 삭제 연습·원격 사후 대조를 요구하며, 결과 불확실 시 점검을 해제하지 않는다.

- 이름/나이/ignored 여부만으로 삭제하지 않는다. import·lazy route·package CLI·SQL/migration·seed/parser·문서/증적 참조를 검사한다.
- 코드가 사용되지 않는다는 증명이 없으면 남긴다. 테스트·시각 기준선은 제품 보호 기능이지 임시 파일이 아니다.
- `.wrangler`에는 학습 DB가 있을 수 있다. `.artifacts`에는 운영 백업·복귀·불합격 리뷰가 있다. 둘 다 일괄 삭제 금지.
- 증거 없는 .DS_Store 등 재생성 파일은 정확한 경로를 확인한 뒤 저장소 밖 휴지통으로 옮기고 복원 위치를 기록한다.
- 과거 날짜별 오류/릴리스/콘텐츠 증거는 역사적 기록으로 유지한다. 현재 안내의 중복 문단은 통합하고 이전 원문은 Git 기준 SHA로 추적한다.
- DB가 읽는 학습 Markdown은 일반 문서 정리가 아니다. 별도 source release 없이 수정하지 않는다.
- `pnpm docs:catalog`와 `pnpm docs:check`로 이동/삭제 후 경로를 검사한다.

## 릴리스·복귀

기존 배포 도구와 `content-release-automation`을 사용한다. 현재 승인·Preview·backup/restore·rollback·predeploy 없이는 Production write 금지. schema가 바뀌면 실제 schema 전체 백업과 기존 기록 upgrade 검증을 수행한다.

배포 실패 시 승인된 정확한 복귀 대상으로 돌아간다. 콘텐츠 철회가 필요한 릴리스는 공개0 확인을 먼저 한다. UI-only 복귀에서 정상 학습 기록을 되돌리지 않는다. DB 복원은 데이터 손상 확인과 이후 쓰기 유실 범위를 검토한 경우만 한다.

마지막에 local status·변경 요약·실패/미실행·운영 변경 여부를 기록한다. [릴리스 원장](LOCAL_RELEASE_LEDGER.md)은 실제 배포 때만 추가하고 문서 정리는 [변경 이력](CHANGELOG.md)에 남긴다.
