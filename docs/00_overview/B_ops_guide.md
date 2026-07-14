# 운영 가이드

기준일: 2026-07-15 KST
범위: 콘텐츠 검증, D1 변경, 테스트, 오디오, 배포

## 1. 운영 source of truth

| 목적 | 경로 |
| --- | --- |
| D1 schema | `packages/db/src/schema.ts` |
| canonical migrations | `packages/db/drizzle-v2/*.sql` |
| 콘텐츠 경로 | `packages/db/src/seed/constants.ts` |
| seed manifest | `packages/db/src/seed/content-manifest.ts` |
| DB verification | `packages/db/src/seed/verify.ts` |
| OpenAPI types | `apps/web/src/types/api.d.ts`, `admin-api.d.ts` |
| audio policy | `packages/shared/src/audio-policy.ts` |
| release gates | `.github/workflows/verify.yml`, `e2e.yml` |

## 2. 현재 운영 콘텐츠

운영 seed는 `docs/01_n5`, `docs/02_n4`, `docs/03_n3`, `docs/04_supplement`의 실제 존재 파일 13개만 사용한다. 과거의 루트 파일명이나 16주 업로드 표는 사용하지 않는다.

| Code | 현재 파일 | parser 결과 |
| --- | --- | ---: |
| 04 | `docs/01_n5/04_vocab.md` | vocab 700 |
| 05 | `docs/01_n5/05_grammar.md` | grammar 55 |
| 03 | `docs/01_n5/03_kanji.md` | kanji 103 |
| 07 | `docs/02_n4/07_vocab.md` | vocab 548 |
| 08 | `docs/02_n4/08_grammar.md` | grammar 98 |
| 06 | `docs/02_n4/06_kanji.md` | kanji 164 |
| 10A | `docs/03_n3/10A_vocab_part1.md` | vocab 1,092 |
| 10B | `docs/03_n3/10B_vocab_part2.md` | vocab 960 |
| 11 | `docs/03_n3/11_grammar.md` | grammar 163 |
| 09 | `docs/03_n3/09_kanji.md` | kanji 275 |
| 12 | `docs/04_supplement/12_example_sentences.md` | sentences 1,100 |
| A | `docs/04_supplement/A_sysprog_vocab_500.md` | sysprog 82 |
| C | `docs/04_supplement/C_self_check_16weeks.md` | curriculum 52 |

파일명 `C_self_check_16weeks.md`는 legacy지만 현재 parser는 52주 기본 계획을 생성한다.

## 3. 콘텐츠 변경 절차

```bash
pnpm -F @nihongo-n3/db seed:diff
pnpm -F @nihongo-n3/db verify:fresh
pnpm typecheck
pnpm test
```

`seed:diff`는 parser 검증만 하고 D1을 변경하지 않는다. production 변경은 `Content and D1 Change Control`의 수동 `migrate` 또는 `seed` operation만 사용한다.

N2/N1 파일이 없거나 provenance가 불완전하면 `CONTENT_PATHS`에 등록하지 않는다.

## 4. D1 변경

일반 table migration은 Drizzle schema에서 생성하고 reviewed SQL을 `drizzle-v2`의 다음 번호로 추가한다. FTS virtual table/trigger만 수동 SQL migration으로 관리한다. 기존 번호를 수정하지 않는다.

로컬:

```bash
pnpm -F @nihongo-n3/db verify:fresh
```

Remote production은 GitHub Environment 승인 후에만 실행한다. prod-v2 전환은 [Blue/Green runbook](./R1_BLUE_GREEN_RUNBOOK_2026-07-15.md)을 따른다.

## 5. 인증 운영

기본 운영 모드는 `app-session`이다.

- password와 Google OAuth가 같은 D1 user/session 모델을 사용한다.
- Google 승인 redirect URI는 `https://nihongo-n3-api.kordokrip.workers.dev/api/v1/auth/google/callback`이다.
- Pages/Worker cross-origin callback은 `/api/v1/auth/complete` bridge token을 사용한다.
- `cf-access`로 바꿀 때는 `CF_ACCESS_AUD`, `CF_TEAM_DOMAIN` secret과 실제 JWT test가 필요하다.
- admin OpenAPI와 회원 관리 route는 admin app session으로 보호한다.

Secret은 `.env`, `.dev.vars`, GitHub/Cloudflare secret에만 두고 commit하지 않는다.

```bash
wrangler secret put AUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put CF_ACCESS_AUD
wrangler secret put CF_TEAM_DOMAIN
```

## 6. 오디오 운영

공개 audio API는 R2 read-only다. 런타임 요청으로 유료 TTS를 호출하지 않는다.

Google batch에 필요한 secret:

```bash
wrangler secret put GOOGLE_TTS_API_KEY
wrangler secret put AUDIO_BATCH_APPROVAL_TOKEN
```

30문장 QA 승인 후 admin queue를 dry-run하고, 승인된 요청에서만 `execute:true`를 사용한다. 전체 생성 뒤 다음을 통과해야 한다.

```bash
pnpm -F @nihongo-n3/db verify:remote:audio
```

자세한 정책은 [오디오 정책](./audio-tts-provider-policy-2026-07-07.md)을 참조한다.

## 7. 배포 전 로컬 관문

```bash
pnpm audit --audit-level high
pnpm openapi:generate
pnpm typecheck
pnpm test
pnpm build
pnpm -F @nihongo-n3/db verify:fresh
pnpm -F @nihongo-n3/e2e test:chromium
pnpm -F @nihongo-n3/e2e test:webkit
```

생성된 OpenAPI type을 commit한 뒤 `pnpm openapi:check`가 clean tree에서 통과해야 한다.

## 8. CI와 배포

필수 workflow:

- Dependency Audit
- CodeQL Security Analysis
- Required Verification
- E2E Tests (Chromium/WebKit)
- Backup D1 Database -> R2

GitHub billing annotation으로 job이 시작되지 않은 실패는 코드 실패와 구분하되, 성공으로 간주하지 않는다. billing을 해결한 뒤 같은 SHA에서 다시 실행한다.

Workers/Pages production deploy는 workflow_dispatch와 `production` Environment approval로만 실행한다. push나 PR은 검증 또는 preview까지만 수행한다.

## 9. 배포 후 관측

최초 30분:

- `/health`, `/openapi.json`, web shell
- password login/logout/session refresh
- Google OAuth start/callback/complete
- content search, quiz, SRS review, sync queue
- admin protection
- 5xx < 1%/5분, D1 error 0

이후 24시간 동안 auth failure, D1 error, latency, release SHA별 회귀를 강화 모니터링한다. 결과를 status report와 session changelog에 반영한다.
