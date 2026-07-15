# Production 회원 데이터 정리 계획

기준일: 2026-07-16 KST

상태: **backup dry-run 완료 / production 실행 전**

## 1. 목적과 원칙

운영 D1의 테스트 회원과 그 학습·세션 데이터를 제거하되 실제 회원 2명의 계정과 기록은 보존한다. 실제 이메일, 비밀번호 hash, Google subject, IP, user agent는 보고서와 GitHub log에 출력하지 않는다.

삭제는 사용자 수만 줄이는 작업이 아니다. 테스트 회원이 소유한 세션, SRS 카드와 복습 로그, 퀴즈 기록, 자기진단, push 구독, OAuth bridge token을 함께 제거하고 테스트 회원 또는 user ID가 없는 test-domain `login_events`를 정리해야 한다. 보존 회원과 연결된 이벤트, 사용자와 무관한 `google_start` 및 미분류 보안 감사 이벤트는 보존한다.

## 2. 교차검증 결과

근거는 2026-07-15 02:32 UTC에 생성된 `nihongo-n3-prod` backup이다. 이 자료는 현재 실시간 DB가 아니므로 삭제 실행 근거로 사용할 수 없고 규모 확인용으로만 사용한다.

| 구분                    | 수량 | 판정                                   |
| ----------------------- | ---: | -------------------------------------- |
| 전체 회원               |   67 | backup 기준                            |
| 보존 회원               |    2 | `ko***@gmail.com`, `no***@icloud.com`  |
| 테스트 회원 후보        |   65 | `example.com` 64, `nihongo-n3.local` 1 |
| 비인식 도메인 삭제 후보 |    0 | 안전 조건 통과                         |

연관 데이터 영향:

| 테이블               | 전체 | 보존 | 삭제 후보 | 미분류 보존 |
| -------------------- | ---: | ---: | --------: | ----------: |
| `users`              |   67 |    2 |        65 |           0 |
| `auth_sessions`      |  102 |   27 |        75 |           0 |
| `login_events`       |  161 |   34 |        95 |          32 |
| `srs_cards`          |   20 |   10 |        10 |           0 |
| `review_logs`        |   15 |    7 |         8 |           0 |
| `quiz_attempts`      |   85 |   12 |        73 |           0 |
| `self_check`         |    1 |    0 |         1 |           0 |
| `daily_logs`         |    0 |    0 |         0 |           0 |
| `push_subscriptions` |    0 |    0 |         0 |           0 |
| `oauth_login_tokens` |    0 |    0 |         0 |           0 |

`login_events`의 미분류 32건은 사용자 ID가 없는 `google_start` 31건과 미분류 `login_failed` 1건이다. 회원 정리와 직접 연결되지 않으므로 삭제하지 않는다.

독립 SQL 집계와 `d1:users:cleanup` backup dry-run이 모두 회원 `67 / 2 / 65`와 동일한 연관 row 수를 반환했다. PII 최소화 plan hash는 `.artifacts/user-cleanup/backup-dry-run-2026-07-16.json`에 보존했다. 같은 백업의 local restore drill은 migration 7개와 일반 테이블 23개를 복원한 뒤 row count, SHA-256, FTS parity, FK 검사를 통과했다.

## 3. 현재 차단 조건

- 루트 `.env.local`의 `CLOUDFLARE_API_TOKEN`, `OBSERVABILITY_API_TOKEN`은 값이 존재하지만 Cloudflare verify endpoint에서 모두 `Invalid API Token`이다.
- 따라서 최신 production 회원 inventory와 remote dry-run을 아직 만들 수 없다.
- GitHub Actions는 최신 PR SHA에서도 billing lock으로 runner가 시작되지 않는다.
- 현재 backup은 24시간 실행 유효기간을 넘길 수 있으므로 새 backup이 필수다.

토큰 값은 로그나 문서에 출력하지 않는다. 필요한 권한은 대상 account의 D1 Read이며, 실제 실행용 승인 runner에는 D1 Edit가 별도로 필요하다.

## 4. 안전장치

`pnpm -F @nihongo-n3/db d1:users:cleanup`은 다음을 강제한다.

1. 기본 동작은 dry-run이다.
2. 보존 allowlist는 정확히 2개 고유 user ID여야 한다.
3. 삭제 후보는 `example.com`, `example.invalid`, `nihongo-n3.local`만 허용한다.
4. 이메일은 마스킹하고 identity fingerprint만 report에 저장한다.
5. remote plan은 60분 뒤 만료되며 변경·신규 회원이 있으면 실행을 중단한다.
6. 24시간 이내 production backup manifest와 users row 수가 일치해야 한다.
7. `ALLOW_PRODUCTION_CHANGE=user-cleanup`과 동적 확인문 `DELETE_<N>_TEST_USERS`가 모두 필요하다.
8. backup 기반 plan은 절대 실행할 수 없고 remote dry-run plan만 실행할 수 있다.
9. 실행 후 보존 계정 fingerprint, 잔여 참조 0, `PRAGMA foreign_key_check`를 검증한다.
10. Cloudflare D1의 다중 statement batch로 삭제를 처리하며 중간 statement 실패 시 전체 작업을 중단한다.

## 5. 실행 순서

### A. 자격 증명과 최신 inventory

1. Cloudflare API token을 새로 만들거나 활성 토큰으로 교체한다.
2. token verify가 `active`인지 값 없이 확인한다.
3. 최신 production backup과 restore drill을 승인된 workflow에서 완료한다.
4. 실제 2명의 마스킹 계정이 `ko***@gmail.com`, `no***@icloud.com`인지 사람이 확인한다.

### B. Remote dry-run

allowlist 파일은 `.artifacts/user-cleanup/`에 두며 commit하지 않는다.

```bash
pnpm -F @nihongo-n3/db d1:users:cleanup -- \
  --database=nihongo-n3-prod \
  --keep-file=.artifacts/user-cleanup/keep-users.remote.json \
  --env-file=.env.local \
  --out=.artifacts/user-cleanup/remote-dry-run.json
```

backup 결과와 최신 remote 결과의 회원 수, 후보 ID fingerprint, 테이블별 삭제 row 수를 비교한다. 차이가 있으면 실행하지 않고 새 plan을 만든다.

### C. 사람 승인 실행

아래 단계는 GitHub `production` Environment에서 사람이 승인한 runner만 수행한다. CODEX가 승인이나 `--execute`를 대신하지 않는다.

```bash
ALLOW_PRODUCTION_CHANGE=user-cleanup \
USER_CLEANUP_CONFIRMATION=DELETE_65_TEST_USERS \
pnpm -F @nihongo-n3/db d1:users:cleanup -- \
  --database=nihongo-n3-prod \
  --plan=.artifacts/user-cleanup/remote-dry-run.json \
  --backup-manifest=.artifacts/d1-backup/manifest.json \
  --out=.artifacts/user-cleanup/execution.json \
  --execute
```

후보 수가 65가 아니면 확인문도 달라져야 한다. 고정 문자열을 재사용하지 않는다.

## 6. 이후 계획

1. **회원 정리:** 최신 remote dry-run, 사람 승인, 삭제 후 사용자 2명·FK 정상 확인.
2. **R1 CI:** GitHub billing lock 해제 후 PR #31의 Audit, CodeQL, Required Verification, Chromium/WebKit을 같은 SHA에서 재실행.
3. **pnpm audit:** Node.js `>=22.13`과 pnpm 11 전환을 별도 검증해 bulk advisory endpoint로 복구.
4. **prod-v2:** R1 merge 뒤 Blue/Green runbook으로 migration 7/7, content/mutable 이전, 30분 read-only 검증.
5. **오디오 R2:** prod-v2 이후 30문장 사람 청감, provider 승인, N5→N4→N3 순차 batch, `verify:remote:audio` 누락 0.
6. **운영 안정화:** 24시간 관측 후 TD-10, TD-14, TD-08 상태를 실제 원격 증거로 갱신.

회원 삭제와 prod-v2 이전을 같은 변경 창에서 동시에 수행하지 않는다. 회원 정리를 먼저 완료하고 검증된 2명만 mutable phase로 이전한다.
