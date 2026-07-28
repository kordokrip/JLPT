# Codex Terra 실행 프롬프트 — TOPIK I Owner-private Phase 1

아래 블록은 템플릿이 아니라 소유자가 확인한 **실제 실행 입력값**이다. 다음 Codex는 이 값의 재입력을 요구하거나 `OWNER_DATE=YYYY-MM-DD`처럼 placeholder로 치환하지 않는다.

```text
RELEASE_MODE=owner_private_production
OWNER_REF=author-ksh
OWNER_DATE=2026-07-29
OWNER_CLAIM_METHOD=authenticated_admin_session
OWNER_CLAIM_APPROVED=yes
OWNER_ATTESTATION_SELF_AUTHORED=yes
OWNER_ATTESTATION_NO_OFFICIAL_TOPIK_MATERIAL=yes
OWNER_ATTESTATION_PRIVATE_USE_ONLY=yes
OWNER_ATTESTATION_ALL_FOUR_ITEMS_SELF_REVIEWED=yes
PRIVATE_RELEASE_COMMIT_APPROVED=yes
PRIVATE_RELEASE_COMMIT_SHA=
```

## 다음 Codex 5.6 Terra에 그대로 전달할 프롬프트

```text
작업 경로: /Users/sungho-kang/Desktop/JLPT
브랜치: feature/topik-product-expansion

위 문서 최상단의 KEY=value 실행 입력 블록은 소유자가 확인한 실제 값이다. 템플릿이 아니며 Phase 0에서 누락값으로 다시 요구하지 않는다. 이 작업은 공개 서비스가 아닌 owner-private production release다. 독립 reviewer sign-off는 필요하지 않다.

먼저 아래 문서를 모두 읽는다.
- docs/00_overview/CODEX_TERRA_TOPIK_I_OWNER_PRIVATE_PHASE1_EXECUTE_NOW_2026-07-29.md
- docs/00_overview/CODEX_TERRA_TOPIK_I_OWNER_PRIVATE_PRODUCTION_PROMPT_2026-07-29.md
- docs/00_overview/TOPIK_I_RELEASE_GATE_ASSESSMENT_2026-07-28.md
- docs/00_overview/CONTENT_RELEASE_CONTROL_PLANE_2026-07-27.md
- apps/api/wrangler.toml
- apps/api/src/routes/topik-practice.ts 및 auth/session middleware
- packages/db/drizzle-v2/0012_content_release_contract.sql~0015_ai_learning_assistance_foundation.sql

## 이번 실행 권한과 경계

1. Phase 0 read-only preflight, Phase 1의 private access 구현, local D1/API/PWA tests, artifact 생성, 그리고 테스트가 모두 PASS일 경우 이번 변경에 한정한 narrow clean commit 생성이 승인됐다.
2. `PRIVATE_RELEASE_COMMIT_APPROVED=yes`가 있으므로 Phase 1 PASS 뒤 관련 candidate/migration/API/PWA/test/runbook 파일만 stage/commit한다. 기존 대규모 dirty worktree, unrelated file, `.artifacts`, secret은 절대 stage/commit하지 않는다.
3. 이번 실행에는 Cloudflare remote D1/R2/Pages/Worker read/write, preview deploy, production deploy, backup export, production publish 권한이 없다. 테스트 PASS가 deployment 권한을 뜻하지 않는다. Phase 1 종료 시 실제 clean commit SHA와 필요한 remote approval 값만 보고한다.
4. v1(`topik-i-self-authored-preview-v1`)은 immutable로 보존한다. reviewer field를 signed로 바꾸거나 public `human_reviewed`/`published` lifecycle, public G0~G5 gate, `operatorOnlyPublishInstruction()`을 약화·우회하지 않는다.
5. owner-private 콘텐츠는 별도 private-publication record와 authenticated server-side owner claim으로만 제공한다. request body·CLI argument·client storage에서 user ID를 받지 말고, 이후 production에서 admin session의 `c.get('userId')`로 one-time claim하도록 구현한다.

## 실행 절차

1. `git status --short`, `git diff --check`, `git rev-parse HEAD`를 수행하고 branch/HEAD/dirty file summary를 보고한다. diff check가 PASS이고 위 실행 입력이 존재하면 Phase 0은 PASS다. reviewer, owner user ID, URL, Cloudflare token, maintenance window를 요구하며 BLOCKED로 끝내면 안 된다.
2. 기존 private-production prompt의 Phase 1을 수행한다. public lifecycle과 분리된 forward-only private publication/access schema, owner-only SQL predicate, owner admin-session claim endpoint, immutable/withdrawal/kill-switch, PWA cache isolation을 구현한다.
3. fresh disposable local D1 migration/seed와 relevant API/DB/PWA tests를 실행한다. 최소 negative test는 non-admin claim, request-body user-ID injection, wrong-account/no-session/wrong-track, changed manifest, duplicate claim, withdrawn release, public-route leakage, cache account switch, public human-review gate preservation이다.
4. `pnpm verify:ci`, relevant candidate/contract/control-plane verifier, API tests, Chromium/WebKit core E2E, `git diff --check`를 새로 실행한다. 기존 결과 재사용 금지다.
5. 하나라도 실패하면 remote 호출·commit 없이 `BLOCKED` 또는 failed test와 minimal fix 결과를 보고한다. 모든 테스트가 PASS면 이번 owner-private release에 필요한 tracked 파일만 narrow clean commit으로 만든다.
6. final report에 v1 preserved 여부, 새 release ID/source SHA/manifest SHA, test 결과, artifact path/hash, 실제 clean commit SHA, 그리고 Phase 2~4에 필요한 실제 값만 적는다. secret·cookie·email·raw owner ID는 보고하지 않는다.

최종 상태는 `PHASE_1_PASS_AWAITING_REMOTE_DEPLOY_APPROVAL` 또는 `BLOCKED`여야 한다. 이번 실행에서 Cloudflare 원격 변경이나 production publish는 하지 않는다.
```

## Production 배포는 Phase 1 결과 뒤에만

Phase 1이 `PHASE_1_PASS_AWAITING_REMOTE_DEPLOY_APPROVAL`로 끝나면, 다음 프롬프트에는 실제 clean commit SHA와 함께 preview URL, maintenance window, D1/R2/backup 및 production deploy 권한을 넣는다. backup export와 forward migration은 운영 데이터에 영향을 줄 수 있으므로 창 시간을 발명하지 않는다.
