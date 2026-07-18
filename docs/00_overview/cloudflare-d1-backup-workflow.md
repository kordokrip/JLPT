# Cloudflare D1 백업 Workflow

기준일: 2026-07-18 KST

## 목적과 경계

GitHub Actions의 D1 export 단계가 승인 후에도 Cloudflare API `10000 Authentication error`로 실패해, Cloudflare 안에서 직접 실행하는 백업 경로를 추가했다. 이 경로는 `nihongo-n3-prod`의 canonical 일반 table 23개를 D1 binding으로 읽고 `nihongo-n3-reports` R2 bucket에 table별 SQL, manifest, manifest SHA-256을 저장한다.

- Worker: `nihongo-n3-d1-backup`
- Workflow: `nihongo-n3-d1-backup-workflow`
- public route: 없음 (`workers_dev: false`, fetch는 404)
- 자동 schedule: 없음
- runtime secret: 없음
- 제외: FTS virtual table, OAuth state, 일회용 login token
- 복원 시 재구축: `vocab_fts`, `sentences_fts`

Cloudflare는 D1 REST export를 Workflows가 재시도하고 결과를 R2에 보관하는 패턴을 공식 예제로 제공한다. 이 프로젝트는 해당 REST export가 활성 scoped token에도 인증 `10000`을 반환해, 동일한 Workflows/R2 구조에서 export 단계만 D1 binding의 canonical table dump로 대체했다. D1 Time Travel은 별도의 point-in-time 복구 수단으로 유지한다.

- [D1을 R2에 백업하는 Workflows 예제](https://developers.cloudflare.com/workflows/examples/backup-d1/)
- [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
- [Workflows 재시도와 durable step](https://developers.cloudflare.com/workflows/build/sleeping-and-retrying/)

## 실행 전 조건

1. 배포할 release SHA가 `apps/d1-backup/wrangler.jsonc`의 `RELEASE_SHA`와 일치한다.
2. 운영 API를 read-only 또는 maintenance 상태로 전환했거나 쓰기가 없는 승인된 구간임을 사람이 확인한다.
3. `nihongo-n3-reports`의 기존 Logpush/alert lifecycle을 보존한다.
4. 실행 payload는 `confirmation: "BACKUP"`을 포함한다.
5. Cloudflare 계정 인증정보는 로컬 환경에서만 주입하고 저장소, Worker secret, artifact에 기록하지 않는다.

## 실행과 확인

```bash
pnpm -F @nihongo-n3/d1-backup trigger
pnpm -F @nihongo-n3/d1-backup instances
```

성공 인스턴스 output의 `rootKey`, `files`, `manifestSha256`를 기록한다. 다음 object가 모두 있어야 한다.

```text
<rootKey>/<table>.sql  # 23개
<rootKey>/manifest.json
<rootKey>/manifest.sha256
```

manifest의 table allowlist, row count, 파일 SHA-256을 확인한 뒤 로컬 복원 드릴을 실행한다.

```bash
pnpm -F @nihongo-n3/db d1:restore-drill -- \
  --input=.artifacts/d1-backup-cloudflare
```

복원 드릴은 blank local D1에 canonical migration 9개를 적용하고 23개 table을 복원한 뒤 row count, FK, `vocab_fts`와 `sentences_fts` parity를 검증한다. 빈 table은 빈 SQL 파일과 row count 0의 조합만 허용한다.

## 보존과 권한

- R2 lifecycle: `backups-30d-expiry`
- prefix: `backups/`
- expiration: 30일
- runtime 접근: Worker의 D1/R2 binding만 사용
- 운영자 접근: 배포/수동 trigger에 필요한 Cloudflare 권한만 사용
- 금지: Global API Key 또는 API token을 Worker secret, source, manifest에 저장

30일 보존은 D1 Time Travel과 목적이 다르다. Time Travel은 운영 복구의 1차 수단이고, R2 SQL/manifest는 독립 복원 검증과 감사 증거다.

## 2026-07-18 검증 증거

| 항목 | 결과 |
| --- | --- |
| Workflow instance | `manual-backup-2026-07-18T05-36-28-521` / `complete` |
| R2 root | `backups/workflow/2026-07-18/2026-07-18T05-36-35-908Z` |
| 파일 | table SQL 23개 + manifest 2개 |
| manifest SHA-256 | `487870e112bd3e0ad41466848bf25336d4800b3711ee738013a875af5603df43` |
| release SHA | `27c379fbeb1c7b6c818ee5c356906c8d9e9c901c` |
| restore drill | migration 9/9, 23 table row count, FK, FTS parity 통과 |
| lifecycle | `backups-30d-expiry`, 30일 |

GitHub Backup run [29631932489](https://github.com/kordokrip/JLPT/actions/runs/29631932489)는 Environment 승인과 runner 시작 후 D1 export API 인증 `10000`으로 실패했다. 이는 과거 billing annotation 실패나 프로젝트 테스트 실패가 아니다.
