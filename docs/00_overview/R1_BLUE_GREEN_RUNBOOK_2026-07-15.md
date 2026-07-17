# R1 D1 Blue/Green 전환 Runbook

기준일: 2026-07-18 KST
대상: `nihongo-n3-prod` -> `nihongo-n3-prod-v2`
상태: 절차와 도구 구현, remote 실행 전

## 금지 사항

- 기존 production `d1_migrations`에 임의 이력을 넣지 않는다.
- 기존 migration SQL을 수정하지 않는다.
- `seed-diff`로 production을 쓰지 않는다.
- billing lock 또는 required check 실패 상태에서 실행하지 않는다.
- `--execute`, `ALLOW_PRODUCTION_CHANGE`, production Environment 승인을 생략하지 않는다.

## 사전 조건

1. 현재 SHA의 Audit, CodeQL, Required Verification, Chromium/WebKit E2E, Backup 성공
2. Cloudflare production backup과 fresh local restore drill 성공
3. `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_WRITE_API_TOKEN`, `CLOUDFLARE_BACKUP_API_TOKEN`, `CLOUDFLARE_WORKERS_API_TOKEN`, `CLOUDFLARE_PAGES_API_TOKEN`이 각 workflow의 GitHub Environment secret에 존재
4. Google OAuth callback, app origin, session secret 확인
5. 담당자와 10~15분 read-only 창 합의
6. 이전 전후 검증 report 보존 위치 확정

## 1. 대상 DB 생성

Cloudflare dashboard 또는 승인된 CLI에서 `nihongo-n3-prod-v2`를 만든다. 반환된 database ID는 cutover 직전 별도 branch에서 `apps/api/wrangler.toml`에 반영한다.

## 2. migration 적용

GitHub `Content and D1 Change Control`을 수동 실행한다.

```text
operation=migrate
database=nihongo-n3-prod-v2
confirmation=APPLY
```

내부 명령은 다음 guard를 요구한다.

```bash
ALLOW_PRODUCTION_CHANGE=migrations \
pnpm -F @nihongo-n3/db exec tsx src/ops/apply-migrations.ts \
  --database=nihongo-n3-prod-v2
```

`d1_migrations`에 9개가 순서대로 기록됐는지 확인한다.

승인 실행이 끝난 뒤 CODEX는 다음 읽기 전용 명령으로 ledger를 검증하고 JSON을 보존한다.

```bash
pnpm -F @nihongo-n3/db migrate:verify -- \
  --database=nihongo-n3-prod-v2 \
  --out=.artifacts/r1-blue-green/migration-ledger.json
```

`0000_schema_convergence.sql`부터 `0008_topik_track_content_and_learning_keys.sql`까지 9개가 누락·추가·순서 차이 없이 일치해야 한다. `0008`의 TOPIK 문제은행은 공개 seed가 아니라 schema와 사용자×트랙 key만 운영 적용하며, 내부 QA bank seed는 별도 출시 승인 전 실행하지 않는다.

## 3. 변경되지 않는 콘텐츠 이전

먼저 dry-run report를 확인한다.

```bash
pnpm -F @nihongo-n3/db d1:transfer -- \
  --source=nihongo-n3-prod \
  --target=nihongo-n3-prod-v2 \
  --phase=content \
  --out=.artifacts/r1-blue-green/content
```

dry-run은 양쪽 DB를 읽기만 하고 `verification-before.json`과 table별 export를 남긴다. count/checksum 차이는 실패 우회 대상이 아니라 승인 전 검토 항목이다.

승인 뒤 실행한다.

```bash
ALLOW_PRODUCTION_CHANGE=blue-green \
pnpm -F @nihongo-n3/db d1:transfer -- \
  --source=nihongo-n3-prod \
  --target=nihongo-n3-prod-v2 \
  --phase=content \
  --replace-target \
  --out=.artifacts/r1-blue-green/content \
  --execute
```

각 일반 table의 source/target row count와 normalized checksum이 일치해야 한다. 실행 전후는 각각 `verification-before.json`, `verification-after.json`에 보존한다. FTS row는 복사하지 않고 target에서 rebuild하며 vocab 3,300, sentences 1,112 기준 수량과 원본 table parity가 모두 일치해야 한다.

## 4. Preview 검증

prod-v2 binding을 사용하는 preview Worker를 배포하고 다음을 확인한다.

- `/health`, `/openapi.json`, `/api/docs`
- vocab/grammar/kanji/sentences 검색
- password register/login/logout/session refresh
- Google OAuth redirect/callback/complete
- admin spec/users 보호
- SRS init/review/sync queue
- read-only 503와 `Retry-After`

자동화 가능한 항목은 prod-v2 preview URL에서 두 모드로 실행한다.

```bash
pnpm r1:preview-smoke -- \
  --base-url=https://<prod-v2-preview-worker> \
  --mode=off \
  --report=.artifacts/r1-preview-smoke/prod-v2-off.json

pnpm r1:preview-smoke -- \
  --base-url=https://<prod-v2-preview-worker> \
  --mode=read-only \
  --report=.artifacts/r1-preview-smoke/prod-v2-read-only.json
```

실제 Google 계정 동의 후 callback/complete와 인증된 admin 성공은 사람이 수행하고 증거 URL·시각을 별도 기록한다. cookie와 secret 값은 report에 넣지 않는다.

## 5. Read-only와 최종 mutable sync

Worker의 `MAINTENANCE_MODE=read-only` preview를 먼저 확인한 뒤 production에 적용한다. 로그인, 회원가입, OAuth callback, sync 등 DB write route가 503인지 확인한다.

그 후 mutable phase를 실행한다.

```bash
ALLOW_PRODUCTION_CHANGE=blue-green \
pnpm -F @nihongo-n3/db d1:transfer -- \
  --source=nihongo-n3-prod \
  --target=nihongo-n3-prod-v2 \
  --phase=mutable \
  --replace-target \
  --out=.artifacts/r1-blue-green/mutable \
  --execute
```

만료·revoked session은 target에서 제거한다. `oauth_states`, `oauth_login_tokens`는 복사하지 않는다.

## 6. Binding 전환

검증 report를 승인한 후 `wrangler.toml`의 DB name/ID를 prod-v2로 바꾸고 production Environment 승인으로 API를 배포한다. 최초 30분은 read-only를 유지한다.

확인 항목:

- 5xx < 1% / 5분
- D1 errors 0
- auth failure 급증 없음
- row count/checksum report 일치
- FTS parity 일치
- password/OAuth/admin/sync smoke 성공

이후 `MAINTENANCE_MODE=off`로 재배포해 쓰기를 재개한다.

## 7. Rollback 원칙

- 쓰기 재개 전에는 Worker binding을 old DB로 되돌릴 수 있다.
- prod-v2에서 쓰기를 재개한 뒤 old DB로 단순 rollback하지 않는다. 양쪽 write divergence가 생기기 때문이다.
- 쓰기 재개 후 문제는 read-only로 전환하고 forward fix 또는 검증된 역이전 계획을 세운다.
- old DB는 read-only로 30일 보존 후 별도 승인을 받아 제거한다.

## 8. 완료 기록

아래 증거를 `.artifacts`와 GitHub run에 보존하고 기술부채/세션 문서를 갱신한다.

- migration ledger
- transfer verification JSON
- backup manifest와 restore drill
- smoke 결과
- 배포 SHA
- 30분/24시간 관측 결과
