# Sub Agent 인수인계

갱신: 2026-10-26. 상시 운영 에이전트를 만들지 않는다. 작업이 있을 때만 [AGENTS](../../AGENTS.md)의 역할을 호출한다. 현황은 [CURRENT_STATE](CURRENT_STATE.md), 검증은 [CI/CD](LOCAL_CICD_OPERATIONS.md), 모델 파일은 `.codex/agents/`가 기준이다.

현재 출시 검증은 [세부 UI 감사](DETAIL_UI_AUDIT_2026-10-25.md)에 있다. 배포 source `6ecc203`과 문서 후속 커밋을 구분하고 같은 후보의 유효한 전체 테스트를 이유 없이 재실행하지 않는다. 임시 산출물 복구는 [정리 명세](REPOSITORY_MAINTENANCE_2026-10-14.md)를 따르며, 과거 통과를 새 배포 성공으로 기록하지 않는다.

## 넘길 문맥 — 전체 대화 복제 금지

최신 [보안·찾아보기 릴리스](SECURITY_HARDENING_2026-10-26.md)는 `8d57e1b`, 운영 Worker `bdeec858`/Pages `df4bb452`다. 로컬920·브라우저309/정책제외30·Preview47·사용자 양언어 가청·새77표 backup/restore·predeploy·사후 gate를 완료했다. 다음 작업은 운영 관찰이며 완료된 감사/전체 테스트/배포를 다시 시작하지 않는다. 실제 푸시 수신·Google 제공자 로그인 완료는 별도 미확인 범위다. 같은 후보 증적은 링크하고 새 변경에 필요한 검사만 실행한다. 문서 후속 커밋을 runtime SHA 또는 새로운 운영 배포로 오인하지 않는다.

- 목표와 완료 조건 1~3개
- 허용 파일/책임, 부모·다른 작업자의 소유 파일
- 이미 확인한 사실과 정확한 근거 경로
- 변경 금지 계약 및 미확인 질문
- 실행할 영향 테스트, 결과 형식

기본 0~1개, 독립 작업만 2개. 재위임 금지. 부모는 자식 작업을 반복하지 않는다. 정형 검사는 스크립트 우선. 모호한 설계/보안/삭제 판단은 부모에게 반환한다.

## 코드 진입점

| 범위 | 위치 |
| --- | --- |
| UI/라우트/계정/학습 지도 | apps/web/src/pages, components, features |
| 요청·오프라인·캐시·언어 | apps/web/src/lib, hooks, stores, i18n |
| SW/푸시/업데이트 | apps/web/src/sw.ts, vite.config.ts |
| 인증·채점·FSRS·보상·알림 | apps/api/src/routes, lib, middleware, jobs |
| 타입/계약 | packages/shared |
| schema/migration/seed/검증 | packages/db/src, packages/db/drizzle-v2 |
| 브라우저 회귀 | e2e |
| 운영·배포・문서 검사 | scripts, package.json |

다른 작업자의 변경을 되돌리지 말고 같은 checkout의 build를 동시에 실행하지 않는다. 시험 문제·음성·실사용자 자료를 임의 생성/교체하지 않는다. 개발 테스트와 실제 Preview/사람 가청/운영 증거를 구분한다.

## 보고

결론 → 변경 파일 → 테스트 명령/exit/count → 남은 위험 순으로 짧게 반환한다. raw 로그와 전체 파일 본문은 반복하지 않는다. 하위 모델의 추정으로 실제 운영 완료를 확정하지 않는다.
