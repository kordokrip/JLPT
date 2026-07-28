# Codex Terra 프롬프트 — TOPIK I Owner-private Production Release

기준일: 2026-07-29 KST
목적: 일반 공개 서비스가 아닌, 소유자 본인만 사용하는 운영 PWA에 자체 저작 TOPIK I 콘텐츠를 배포한다.

## 이 경로의 정책

이 릴리스는 일반 사용자에게 공개하지 않는다. 따라서 독립 한국어·일본어 검수자 A/B sign-off는 요구하지 않는다. 대신 owner 본인이 자체 저작·공식 TOPIK 비복제·비공개 범위를 확인하고, 서버가 해당 owner의 인증된 계정에만 콘텐츠를 제공해야 한다.

현재 public contract의 `human_reviewed -> preview -> approved -> published`는 일반 공개를 위한 규칙이므로 약화하거나 우회하지 않는다. 특히 다음은 금지다.

- 저자 자신 또는 placeholder를 reviewer A/B의 `signed` sign-off로 기록
- 기존 immutable v1의 source/manifest/evidence 수정
- `published` 상태를 private 용도로 사용하거나 public API query를 바꿔 모든 로그인 사용자에게 노출
- client-side hidden route, URL 난독화, Service Worker cache만으로 접근 제어를 주장

정상 구현은 **새 immutable v2 candidate + 별도 owner-private publication/access record + Worker 서버 측 owner check**다. public lifecycle은 그대로 남고, v2의 `release_state`는 `draft` 또는 `automated_checked`에 머물 수 있다. private publication은 public `published`가 아니다.

## 현재 구현에서 확인된 제약

| 현재 요소                                      | 결론                                                                                                                                                           |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content_releases.release_state = published` | public TOPIK content query가 읽는 상태이며, G0~G4 gate와 human review lifecycle을 요구한다. private 용도로 쓰지 않는다.                                        |
| `0014_content_release_review_signoffs.sql`   | `human_reviewed` 전이에 두 distinct signed reviewer를 요구한다. 변경하지 않는다.                                                                             |
| `topik-practice.ts`                          | 이미 session auth를 요구하지만, 현재 content query는`published` release면 해당 track의 모든 로그인 사용자에게 반환한다. owner-only filter가 추가로 필요하다. |
| `topik_content_items`                        | public publish 이후만 immutable trigger가 있다. owner-private publication 뒤의 update/delete도 별도 trigger로 막아야 한다.                                     |
| v1                                             | reviewer placeholder를 포함한 draft immutable candidate다. 절대 update하지 않고 새 release ID를 만든다.                                                        |

## 소유자가 제공할 입력

owner subject는 프롬프트에 수동 입력하지 않는다. production에서 owner가 자신의 **관리자 인증 세션**으로 one-time claim을 수행할 때 Worker가 `c.get('userId')`를 D1 private-publication record에 저장한다. 이 방식은 실명·이메일·cookie·access token 및 내부 user ID를 prompt·git·R2 증적에 복사하지 않는다.

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

# Phase 1 local work 뒤에만 승인할 값
PRIVATE_RELEASE_COMMIT_APPROVED=no
PRIVATE_RELEASE_COMMIT_SHA=

# Phase 2~4에서 실제 필요할 때만 yes로 바꾼다.
PRIVATE_PREVIEW_REMOTE_ACTIONS_APPROVED=no
PRIVATE_PREVIEW_PAGES_URL=https://<실제-approved-preview>.pages.dev
PRIVATE_REMOTE_D1_READONLY_APPROVED=no
PRIVATE_BACKUP_MAINTENANCE_APPROVED=no
PRIVATE_BACKUP_WINDOW_KST=YYYY-MM-DD HH:MM-HH:MM
PRIVATE_R2_EVIDENCE_WRITE_APPROVED=no
PRIVATE_R2_EVIDENCE_BUCKET=nihongo-n3-content-evidence
PRIVATE_R2_EVIDENCE_PREFIX=evidence/report/v1/<new-private-release-id>/<new-manifest-sha>
PRIVATE_PRODUCTION_DEPLOY_APPROVED=no
PRIVATE_PRODUCTION_PUBLISH_APPROVED=no
PRIVATE_MAINTENANCE_WINDOW_KST=YYYY-MM-DD HH:MM-HH:MM
PRIVATE_POST_DEPLOY_START_KST=YYYY-MM-DD HH:MM
```

위 블록의 owner/self-authored/official-material/4-item attestation은 앞서 소유자가 확인한 사실을 실행 값으로 고정한 것이다. 사실과 다르면 `yes`를 유지하지 말고 Codex가 `BLOCKED`로 종료하게 한다.

`OWNER_REF`는 reviewer identity가 아니다. `OWNER_CLAIM_METHOD=authenticated_admin_session`은 authenticated owner session에서 subject를 얻는 방식이며, request body·CLI argument로 임의 user ID를 받는 방식이 아니다. owner가 admin role이 아닌 경우에도 ID를 추정하거나 email lookup을 하지 않는다. 그 경우에만 별도, time-limited bootstrap secret 설계와 새 승인을 먼저 제시하고 멈춘다.

## Codex 5.6 Terra에 그대로 전달할 프롬프트

```text
당신은 운영 중인 JLPT · TOPIK PWA의 principal release engineer다. 이 작업은 공개 서비스가 아닌 owner-private production release다. 독립 검수는 요구하지 않지만, private 콘텐츠가 다른 로그인 사용자나 public endpoint/cache로 새지 않도록 public release보다 엄격한 접근 제어와 검증을 적용한다.

작업 경로: /Users/sungho-kang/Desktop/JLPT
현재 브랜치: feature/topik-product-expansion
입력값: 이 문서 상단의 `KEY=value`만 사용한다. ID, URL, bucket, approval, maintenance window를 추정·발명하지 않는다. secret/token은 출력하지 않는다.

반드시 먼저 읽을 문서:
- docs/00_overview/CODEX_TERRA_TOPIK_I_OWNER_PRIVATE_PRODUCTION_PROMPT_2026-07-29.md
- docs/00_overview/TOPIK_I_RELEASE_GATE_ASSESSMENT_2026-07-28.md
- docs/00_overview/TOPIK_I_RELEASE_PACKAGE_P4_2026-07-28.md
- docs/00_overview/CONTENT_RELEASE_CONTROL_PLANE_2026-07-27.md
- docs/00_overview/CLOUDFLARE_ONLY_OPERATIONS_2026-07-20.md
- docs/00_overview/PRODUCTION_CUTOVER_2026-07-20.md

반드시 읽을 구현:
- apps/api/wrangler.toml, wrangler.jsonc
- apps/api/src/routes/topik-practice.ts 및 auth/session middleware
- packages/db/drizzle-v2/0012_content_release_contract.sql~0015_ai_learning_assistance_foundation.sql
- packages/db/src/seed/topik-i-preview-candidate.ts 및 candidate/contract/control-plane verifier
- packages/shared/src/content-release-control-plane.ts, packages/shared/src/learning-tracks.ts
- scripts/verify-pages-auth-proxy.mjs, scripts/post-deploy-observe.mjs

## 절대 규칙

1. 시작은 read-only다. `git status --short`, `git diff --check`, `git rev-parse HEAD`, input preflight부터 실행한다. 다른 작업의 대규모 dirty file을 reset, checkout, stash, delete, reformat, commit하지 않는다.
2. v1(`topik-i-self-authored-preview-v1`) 및 그 manifest/evidence를 변경하지 않는다. owner metadata 또는 private access가 달라지면 new immutable release ID와 manifest를 만든다.
3. reviewer field를 signed로 만들거나 public human-review trigger를 변경하지 않는다. legacy non-null reviewer column이 private source record에 꼭 필요하면, 실제 사람이 아님을 명확히 나타내는 non-signing sentinel과 `pending` status만 사용하고, public promotion query/trigger가 sentinel을 reviewer로 해석할 수 없음을 automated test로 증명한다. 더 안전한 normalized private-source schema가 가능하면 그것을 우선한다.
4. public `published` 상태, `operatorOnlyPublishInstruction()`, G0~G5 public gate, 일반 public content route의 의미는 변경하지 않는다. owner-private publication은 별도 table/state/endpoint authorization으로 표현한다.
5. owner가 관리자 세션으로 one-time claim할 때 얻은 `c.get('userId')`와 이후 authenticated `c.get('userId')`의 서버 측 비교가 private content 반환의 필수 조건이다. client flag, localStorage, query parameter, Pages URL, UI 숨김은 authorization이 아니다. request body/CLI argument로 owner user ID를 받거나 임의 계정을 claim하는 기능은 만들지 않는다.
6. private release body, answer/explanation, owner user ID, session/cookie/token, raw signature/email/name을 R2 evidence, Queue, Workflow, console, OpenAPI example, cache key, telemetry에 기록하지 않는다. evidence는 ref/date/hash/sanitized result만 쓴다.
7. Time Travel restore, broad SQL UPDATE, destructive Git, production DB delete, old content overwrite는 금지다. private release 오류는 private access withdrawal/kill switch와 새 immutable correction candidate로 해결한다.
8. Cloudflare Pages/Workers/D1/R2 behavior 및 current Wrangler binding은 remote action 직전에 최신 공식 문서와 local config로 재확인한다. account ID, database, Pages origin, R2 bucket을 추정하지 않는다.

## Phase 0 — private go/no-go (항상 read-only)

1. branch/HEAD/diff check/changed files, Wrangler version, production/preview D1/R2 binding, v1 release/source/manifest SHA를 표로 보고한다.
2. 아래 중 하나라도 충족하지 않으면 파일 수정, test, network, Cloudflare 호출 없이 `BLOCKED`로 종료하고 누락 값만 보고한다.
   - `RELEASE_MODE=owner_private_production`
   - `OWNER_REF`, valid `OWNER_DATE`, `OWNER_CLAIM_METHOD=authenticated_admin_session`, `OWNER_CLAIM_APPROVED=yes`
   - 네 owner attestation 모두 `yes`
3. `PRIVATE_RELEASE_COMMIT_*`, remote approval, URL, maintenance window는 later-phase required로 표기한다. 이 값이 없다는 이유로 Phase 1을 막지는 않지만, 현재 단계에서 원격 호출은 금지다.
4. 현재 schema/API가 private release를 `published`와 구분하지 못한다는 사실을 기록한다. reviewer 입력을 요구하거나 생성하는 기존 public prompt로 전환하지 않는다.

## Phase 1 — private release 설계·구현·로컬 검증

Phase 0 통과 후에만 수행한다. 원격 Cloudflare/D1/R2 호출은 하지 않는다.

1. v1을 보존하고 새 immutable owner-private candidate를 만든다. release ID, canonical input/source SHA, manifest SHA, item payload SHA를 기록한다. item body/answer payload hash가 v1과 다르면 content scope 확대이므로 중단하고 별도 QA 범위로 분리한다.
2. **public lifecycle을 약화하지 않는** forward-only private-publication model을 구현한다. 권장 최소 구조는 `content_release_private_publications`처럼 다음을 분리한 table이다.
   - release ID (immutable content candidate FK)
   - owner subject (관리자 인증 session의 current user ID로만 server-side bind)
   - private state (`owner_published`/`withdrawn` 같은 private-only 값)
   - immutable manifest hash 또는 release manifest FK, published/withdrawn timestamps
   - owner attestation ref/date/hash-only evidence pointer
   이 table은 one release to one owner로 시작한다. future multi-user sharing이 필요해도 이번 release에서 invite-all/users-wide 기능을 추정해 추가하지 않는다.
3. forward migration에서 다음을 보장한다.
   - public `content_releases` table, human-review sign-off trigger, G0~G5 public publish gate는 그대로 유지
   - private publication insert/claim은 self-authored source, draft/automated-checked candidate, exact manifest hash, owner session subject, private attestation을 요구
   - non-owner 또는 withdrawn private publication은 API에서 404/403을 받고 body/answer/release existence를 얻지 못함
   - owner-private publication 뒤에는 topik unit/item/source body와 answer payload update/delete가 blocked
   - private access withdrawal/kill switch는 data restore 없이 즉시 owner query를 막음
   - legacy reviewer placeholders are not marked signed and cannot make a private release human_reviewed/published
   - one-time owner claim endpoint는 `adminSessionAuth` 뒤에 두고 owner subject를 request body가 아닌 current session에서만 얻는다. body에는 release ID와 exact manifest SHA만 허용한다. 이미 claimed·withdrawn·hash 불일치인 release는 reject한다.
4. API 및 PWA를 변경한다.
   - TOPIK content/practice/solution 중 새 candidate를 반환할 수 있는 모든 route를 inventory한다.
   - public content는 기존처럼 `release_state='published'`만 반환한다.
   - private candidate는 `appSessionAuth` 뒤에서 current `userId`가 private owner subject와 일치할 때만 반환한다. SQL predicate 안에서 enforce한다; fetch 후 JS filter는 금지다.
   - non-owner 응답은 existence·manifest·prompt·answer를 누출하지 않는다.
   - private endpoint/response에는 shared/intermediate cache를 피하는 header와 PWA account×track×release cache isolation을 적용한다. 기존 service worker가 account 전환 뒤 private response를 재사용할 가능성이 있으면 수정하고 test한다.
   - OpenAPI/UI에는 `owner-private`라고 표시하되 owner user ID와 private content body를 schema example이나 telemetry에 넣지 않는다.
5. fresh disposable local D1에서 full migration과 new seed를 적용하고 아래를 테스트한다.
   - v1 unchanged; new candidate hash/item count/duplicate/FK/blank multilingual field/answer concealment/idempotent seed
   - owner self-authored attestation/provenance 및 4 item scope
   - owner admin-session claim success; non-admin claim, request-body user ID injection, changed manifest, duplicate claim이 모두 실패
   - owner access success; wrong account/no session/wrong track/withdrawn release fails without body
   - public lifecycle still rejects missing/duplicate/pending human sign-off and still requires G0~G4 for `published`
   - private release cannot transition public lifecycle and public route does not list it
   - private published item/unit/source immutability; kill switch/withdrawal immediately hides it
   - Chromium/WebKit core PWA test: account switch, offline cache, service worker cache version, private response non-leakage
6. `pnpm verify:ci`, relevant DB/API tests, candidate/contract/control-plane verifier, Chromium/WebKit core E2E, and `git diff --check`를 fresh result로 실행한다. 실패하면 fix 또는 `BLOCKED`; old PASS를 재사용하지 않는다.
7. reports를 `.artifacts/release-candidates/<new-release-id>/`에 저장하되 release commit에는 포함하지 않는다. report에는 private/public separation test와 exact artifact SHA만 남긴다.
8. all local tests PASS 뒤 `PRIVATE_RELEASE_COMMIT_APPROVED=yes`가 있을 때만 candidate/migration/API/PWA/test/runbook에 한정한 narrow clean commit을 만든다. unrelated dirty files, `.artifacts`, secret은 제외한다. 실제 SHA를 `PRIVATE_RELEASE_COMMIT_SHA`에 기록한다. approval이 없으면 `AWAITING_PRIVATE_RELEASE_COMMIT_APPROVAL`로 종료한다.

## Phase 2 — Preview private-access proof

`PRIVATE_RELEASE_COMMIT_SHA`가 current HEAD와 일치하고 tracked worktree가 clean이며, `PRIVATE_PREVIEW_REMOTE_ACTIONS_APPROVED=yes`와 actual HTTPS preview URL이 있을 때만 수행한다.

1. config/Cloudflare response로 preview Worker/D1/R2/Pages가 production resources와 분리됐는지 확인한다. production resource가 보이면 즉시 중단한다.
2. approved preview deploy 범위에서 Worker/Pages를 배포하고 deployment ID, Worker version, commit SHA, private release ID/manifest SHA를 sanitize해 기록한다.
3. actual preview session으로 owner access 200 및 non-owner/no-session/wrong-track 401/403/404를 확인한다. response body, cookie, token, email, full user ID는 artifact에 쓰지 않는다.
4. Chromium/WebKit에서 Service Worker registration, private cache no-store/isolation, offline fallback, user/account switch stale-content non-leakage를 확인한다. local E2E로 대체하지 않는다.
5. preview auth proxy가 canonical production auth를 대변하지 않는다면 그렇게 기록하고, canonical auth smoke는 별도 명시 승인 없이는 실행하지 않는다.

## Phase 3 — production recovery/evidence preconditions

1. `PRIVATE_REMOTE_D1_READONLY_APPROVED=yes`일 때만 production target/binding을 재확인하고 `wrangler d1 info`와 `wrangler d1 time-travel info`로 read-only evidence를 만든다. report에서 full account/database IDs와 temporary URLs를 제거한다.
2. `PRIVATE_BACKUP_MAINTENANCE_APPROVED=yes` 및 approved maintenance window가 있을 때만 project backup/export와 fresh local restore drill을 실행한다. export downtime 영향을 먼저 보고한다. Time Travel restore는 하지 않는다.
3. `PRIVATE_R2_EVIDENCE_WRITE_APPROVED=yes`일 때만 existing private evidence bucket과 new-release-exclusive prefix를 대조하고 immutable manifest, hash-only verifier reports, sanitized private-access proof, recovery report를 upload한다. raw item/answer/owner identity/session/token은 금지다.
4. remote evidence key/SHA/ETag(가능할 때)/timestamp와 local hash equality를 private evidence ledger에 기록한다.

## Phase 4 — owner-private production deployment and publication

다음 모두 충족할 때만 실행한다: matching clean commit, local PASS, preview private-access PASS, recovery evidence PASS, `PRIVATE_PRODUCTION_DEPLOY_APPROVED=yes`, `PRIVATE_PRODUCTION_PUBLISH_APPROVED=yes`, actual maintenance window.

1. production write 직전에 target Worker/Pages/D1/R2, commit SHA, private release ID/manifest SHA, migration IDs, owner subject 방식, current health baseline을 read-only로 재확인한다.
2. backup evidence 뒤에만 forward D1 migration을 적용한다. public release contract migration/trigger를 drop/recreate/loosen하지 않는다.
3. production Worker/Pages를 deploy한다. newly deployed version이 private-owner SQL predicate와 cache-safe code를 포함하는지 version/commit/route smoke로 확인한다.
4. immutable candidate를 exact idempotent statement로 insert하고, owner가 production Pages에서 관리자 세션으로 one-time claim endpoint를 호출할 수 있게 한다. endpoint는 current session의 subject와 exact release ID/manifest SHA가 match할 때만 owner-private publication record를 `owner_published`로 만든다. `content_releases.release_state='published'` update와 `operatorOnlyPublishInstruction()`은 실행하지 않는다.
5. production owner session/non-owner isolated session으로 접근 제어, no-public-list, answer concealment, cache isolation, withdrawal/kill-switch path를 확인한다. 상태 변경 auth smoke는 actual approval 범위 내에서만 최소 fixture로 실행한다.
6. failure가 있으면 private publication을 expose하지 않는다. 이미 owner에게 노출된 경우 private withdrawal/kill switch를 사용한다. D1 restore, old release mutation, broad delete는 금지다.

## Phase 5 — private post-deploy observation

1. owner가 `PRIVATE_POST_DEPLOY_START_KST`부터 30분 동안 passive observation을 수행한다. health, auth, private owner access, non-owner denial, 4xx/5xx, D1 errors, PWA cache, Worker/Pages version을 T+0/T+5/T+10/T+15/T+30에 확인한다.
2. intentional production 5xx canary는 실행하지 않는다. token/cookie/user identifier를 logs/report에 쓰지 않는다.
3. final report에 `PRIVATE RELEASE PASS` 또는 `BLOCKED`만 기록한다. G2/G5 public-release PASS나 public `published`라고 기록하지 않는다.

## 종료 보고 형식

1. v1 preserved, new private release ID/source SHA/manifest SHA/clean commit SHA
2. private P0 provenance, P1 local integrity, P2 preview isolation, P3 recovery/evidence, P4 production authorization, P5 observation의 PASS/PARTIAL/BLOCKED 및 local/remote artifact hash
3. 실제 원격 명령의 형태/대상/승인 근거와 실행하지 않은 명령/사유 (secret redacted)
4. owner access proof 및 non-owner denial proof의 sanitized result
5. public production publish 여부: 반드시 `NO — owner-private release only`로 명시

최종 원칙: 이 작업에서는 reviewer를 만들거나 public gate를 완화하지 않는다. owner-private access control이 구현·검증되지 않은 상태에서는 production D1/Pages/Worker에 콘텐츠를 publish하지 말고 `BLOCKED`로 종료한다.
```

## 실행 순서

1. 위 입력 블록은 실행 값이다. reviewer나 `PRIVATE_OWNER_USER_ID` 입력은 넣지 않는다. owner는 Phase 4에서 자신의 관리자 세션으로 one-time claim을 수행한다.
2. Phase 1이 public lifecycle을 건드리지 않는 owner-private schema/API/PWA 변경과 local verification을 만든다.
3. narrow clean commit을 승인한 뒤 Preview isolation, D1/R2 recovery evidence, production deployment·private publication을 순서대로 승인한다.
4. private release가 정상이어도 public `published`는 아니다. 나중에 공개하려면 별도 독립 검수와 기존 public G0~G5 release를 새 immutable candidate로 수행한다.
