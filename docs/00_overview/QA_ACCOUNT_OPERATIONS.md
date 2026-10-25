# 재사용 QA 계정과 운영 회원 정리

갱신: 2026-10-14. 일반 개발 테스트는 로컬 격리 DB, 반복 수동 smoke는 전용 Preview 계정 2개만 사용한다. 에이전트/모델마다 계정을 추가하지 않는다.

## 반복 테스트 계정

| 역할 | 고정 이메일 | 트랙 | 권한 |
| --- | --- | --- | --- |
| JLPT | `agent-jlpt@nihongo-n3.local` | `jlpt-ja` | 일반 사용자 |
| TOPIK | `agent-topik@nihongo-n3.local` | `topik-ko` | 일반 사용자 |

대상은 `nihongo-n3-api-topik-preview.kordokrip.workers.dev`로 고정한다. 운영 DB에는 만들지 않는다. 관리자 권한 테스트는 별도 격리 fixture를 사용한다.

```sh
node scripts/qa-accounts.mjs --check
# 최초 1회만, 재실행해도 같은 계정을 로그인한다.
node scripts/qa-accounts.mjs --provision
```

비밀번호는 무작위 생성하고 macOS Keychain 서비스 `org.nihongo-n3.qa.preview`의 `jlpt`/`topik` 항목에 저장한다. 명령 인자·출력·문서·Git·평문 파일에 남기지 않는다. DB에는 기존 salted PBKDF2-SHA256 해시만 저장한다. Keychain 잠금/누락은 우회하지 않는다. 계정 충돌 시 새 계정 생성이나 비밀번호 초기화를 자동 수행하지 않는다.

AI 전용 비밀 보관소가 아니다. 이 Mac의 소유자가 자격 증명을 통제한다. `withQaSession`은 로그인 후 ID·이메일·일반 사용자 권한·트랙을 `/auth/me`로 검증하고, 작업 종료 시 로그아웃한다. 같은 역할 계정의 병렬 변경 테스트는 금지한다.

## 계정 누적 방지

- 기본 Playwright 설정은 Production 및 임의 원격 URL을 실행 전에 거부한다. 로컬 또는 기존 receipt 검증 전용 Preview suite만 허용한다.
- 신규/빈 상태를 요구하는 전수 E2E는 격리 DB를 사용한다. 재사용 계정의 학습 기록을 초기화하여 fresh 상태라고 주장하지 않는다.
- 별도 운영 스크립트에도 정확한 대상 확인이 필요하다. Playwright 설정의 차단이 모든 CLI를 보호한다는 뜻은 아니다.

## 운영 삭제 경계

2026-10-14 조회: 운영 38명 중 명시적으로 확인한 synthetic 36명과 실사용자 2명. 사용자 승인 후 36명 삭제를 완료했고 운영에는 실사용자 2명만 남았다. 운영 UI 배포와는 별개다. [현재 상태](CURRENT_STATE.md).

삭제는 정확한 ID·이메일·권한·인증 방식·생성 시각과 전체 inventory를 고정한다. 단일 DELETE의 materialized guard가 변경을 감지하면 0건 삭제한다. 학습 연관 행은 검증된 FK cascade를 따르고 로그인 감사 이력은 SET NULL로 보존한다. 이메일 도메인 전체 삭제는 하지 않는다.

기존 `d1-user-cleanup.ts` CLI는 구 schema 백업 전제이므로 현재 0033 작업에 그대로 실행하지 않는다. 이번 작업은 현재 77표 백업·복원 후 순수 SQL 생성기 `buildExactUserDeleteSql`과 별도 검토된 일회성 점검 adapter를 사용한다. 복원본에서 같은 삭제를 먼저 실행하고 OAuth 보충 2표까지 총 79표를 운영과 대조한다. 삭제 결과가 불확실하면 점검/queue 정지를 유지하고 재실행하지 않는다.

증적: `.artifacts/operations/qa-account-cleanup-2026-10-14/`. 백업·정확 ID 계획·SQL 원문은 개인 보호 자료이며 Git에 넣지 않는다. 이후 정상 학습이 발생하면 전체 백업을 무조건 복원하지 않고 유실 범위를 먼저 확인한다.

실행 결과: `production-0033-backup-qa-cleanup-20261014-01/restore-drill.json`은 77표/FK0 통과, `cleanup-result.json`은 36삭제/2보존/79표 대조/FK0 통과. `result.json`은 기존 Worker·Pages 유지/queue 복원/점검 해제를 기록한다. 제거된 합성 회원과 연관 테스트 행은 같은 디렉터리의 새 백업으로 복구 가능하다. 로그인 감사 행은 삭제하지 않고 FK 계약에 따라 사용자 연결만 해제했다.

## 안내 모달 회귀

`LearningMap`의 겹치는 상시 안내를 계정·트랙·세션별 1회 모달로 바꿨다. 닫기/나중에/Escape/배경 클릭 후 사라지고, 이어서 이동해도 자동 재표시하지 않는다. 다른 레슨을 명시적으로 누르면 진행 중 학습 안내를 다시 열 수 있다. portal 포커스 제한·복귀와 계정 전환 정리를 지원한다. 실제 학습 저장·FSRS·음성 동작은 변경하지 않는다.

검증: 지도 단위 20/20, QA 도구 8/8, 삭제 계획/정확 SQL 15/15, web typecheck/build. 로컬 합성 API 화면에서 ko/ja × 390/768/1440px의 카드 간격 16px·가로 넘침 없음·닫은 안내 재표시 없음 확인. 실제 운영 UI 배포나 가청 검증으로 간주하지 않는다.

마지막 검사: 운영 도구 단위 41/41(QA 8개 포함), 인증 proxy 3개 통과. `ops:status` 39통과/2경고/0실패, `ops:status:remote` 51통과/2경고/0실패. 경고는 미커밋 작업 트리와 기존 manifest 차이이며 삭제 실패가 아니다. 문서 986경로·78 Markdown·1155 상대 링크 검사 및 diff check 통과. 새 UI 배포·Git commit/push는 실행하지 않았다.
