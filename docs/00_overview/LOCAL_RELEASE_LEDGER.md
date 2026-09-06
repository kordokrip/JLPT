# 로컬 형상관리·릴리스 원장

최종 점검: 2026-09-06 KST

이 문서는 GitHub 유료 CI/CD 기능에 의존하지 않고 JLPT·TOPIK의 형상, 검증, 배포와 rollback을 관리하는 운영 원장이다. 코드·테스트·Cloudflare 원격 결과와 다른 내용이 있으면 실제 명령의 종료 코드와 원격 deployment ID가 우선하며, 같은 변경에서 이 문서를 바로잡는다.

## 2026-09-06 개인 학습 UX 로컬 후보

| 항목 | 상태 |
| --- | --- |
| candidate | learning-experience-2026-09-06; Preview 검증 중, INC-PERF-049 미해결 |
| source | `feature/topik-product-expansion`, `94dfb052c5ff73caaa70692f1d023bdaae439c8f` commit/push |
| schema | 전용 Preview에 `0028` 하나 적용; Production은 `0027` 유지 |
| content | 공개 bank 재시드/변경 없음, Preview 160개 신규 공개 없음 |
| 94dfb05 기준선 검증 | backup·음성 진단 포함 gate Ops 26 / DB 126 / Web 113 / API 157, exit 0. Playwright 207 pass/32 skip/0 fail, exit 0. 문서 64/81 및 diff check 통과. 후속 성능 후보 API162와 분리한다. [실행 기록](LEARNING_EXPERIENCE_PLAN.md#2026-09-06-검증-기록) |
| 실제 음성 | 새 Preview 양 언어 정상 종료 표시, 사용자의 “두 언어 모두 들렸습니다” 확인. 실제 Chrome 네트워크 상세 관측은 별도이며 자동 mock E2E로 대체 표기하지 않음 |
| remote read-only | 06:09 UTC 전체 48 pass / 2 warnings / 3 fail; 06:44 UTC 같은 R2 verifier 단독 재검사는 9개 표면 모두 0, exit 0. 전체 재집계는 아님 |
| Preview/Production | Preview Worker `1fec0907-914d-4a82-9e87-92dcf6beb723`, Pages `a95437fc-8411-4151-9519-ab0d8fb92905`; Production 미반영 |
| backup/restore | 과거 65-table backup → local0028 실제 restore exit 0, FK 0, trigger 56; coversLocalSchema=false. 새 Production backup 아님 |
| Git | 후보 commit/push 완료, tag 없음; Pages Git integration 없음, GitHub Actions 비활성 유지 |
| rollback | additive 데이터를 보존하고 이전 Worker/Pages 복귀; 화면 옵션 `VITE_LEARNING_EXPERIENCE=false` |

이 후보를 출시 완료로 표시하지 않는다. 기존 Production ID와 rollback 이력은 아래에 보존한다.

Preview Worker smoke 21/0, 관리자 positive 검사 1개 미실행. Preview 콘텐츠 집계의 before/after 일치·FK 0·schema profile0028 확인. 원격 E2E76건은 세션 시작이 5초 기준을 반복 초과해 exit130으로 중단했다. 합성 Preview 계정에서 실제 create200/7,312ms, current200/2,118ms를 확인해 `INC-PERF-049`로 수정 중이다. 직전 Preview Worker `0d17ba30-b7ea-4879-9e99-e9c3a7ebb8ee`, 같은 branch Pages `885aae1f-d308-4453-b3c6-881999410ec0`를 복귀 기준으로 보존한다.

최종 Production read-only는 49 pass/2 warnings/2 fail, exit1이었다. 미배포 TOPIK status/CSP만 실패하며 앞선 R2 7403은 재발하지 않았다. 실제 Chrome 전체 network capture는 미확보다. 사용자 청취 확인은 이 Pages의 가청 증거이며 Production 배포 승인이 아니다.

성능 후속 API 후보는 생성≤18/재개≤5 D1 왕복 예산, ID/version tuple과 static/canonical 타입 분리를 적용했다. 독립 검토 지적 3 fail을 수정한 뒤 Ops26/DB126/Web113/API162와 fresh D1, 전체 로컬 E2E207 pass/32 skip/0 fail(exit0)을 통과했다. 이 후속 후보는 Worker-only Preview 대상으로 형상 고정하며 Pages94dfb05는 유지한다. 원격 배포 ID/사후 결과는 실제 실행 후 추가한다.

후속 Worker source0b20e39는 commit/push 및 Preview `6f0c0e41-1978-42a5-8e3a-3276ed3f1c63` 배포를 완료했다. N5 create/current882/338ms·TOPIK1 814/355ms 단일표본을 확인했다. 후속 원격 나머지72건은32 pass/3 skip/3 fail/34 not-run(exit1): SRSclock-skew2건과mockrecords1건을 발견해차단했다. 현재Web clock-skew수정중이며 Production은변경하지않는다. 긴세션계측의최종4건도별도재검증한다.

## 복습 후속 후보

후속 Web 후보는 `INC-SRS-051/053` 수정과 E2E 증거 경계를 포함한다. source 전체 gate는440개(Ops26/DB126/Web126/API162), fresh0028까지 exit0이다. 최종 로컬 E2E는211 pass/30 시각-policy skip/0 fail, exit0이다. API는 현재 Preview Worker0b20e39를 유지하고 추가 migration/seed 없이 Pages만 교체한다. 실제 Pages ID와 원격 E2E 결과 확보 전까지 릴리스 상태는 검증 중이다.

## GitHub 사용 범위 (유지)

- 저장소: 공개 `kordokrip/JLPT`
- 용도: commit, branch, tag와 원격 백업
- GitHub Actions: 정책상 실행 금지 (`workflow_dispatch`는 문서 보관용 비상 호출만 허용)
- 자동 CI/CD, Actions artifact/cache, Actions 기반 Cloudflare 배포: 사용하지 않음
- `.github/workflows/ci.yml`: 실행 job을 `if: false`로 잠궜고, 배포·검증의 실질 근거는 로컬 MD 원장 사용
- Cloudflare 배포와 검증: 승인된 로컬 터미널에서만 실행

공개 저장소의 표준 GitHub-hosted runner는 공식 정책상 무료지만, 이 프로젝트는 형상관리와 릴리스 판정을 분리하기 위해 사용하지 않는다. GitHub 상태 badge나 workflow 결과를 릴리스 통과 증거로 사용하지 않는다.

## 로컬 형상관리 규칙

1. 변경 전에 `git status --short`, 현재 branch, HEAD와 원격 동기화 상태를 기록한다.
2. 사용자 변경을 reset, checkout, stash 또는 삭제하지 않는다.
3. 문서·코드·데이터·테스트를 하나의 원자적 commit으로 고정한다.
4. commit 후 `git show --check`, `git status --short`, `git rev-parse HEAD`를 기록한다.
5. 원격에는 검증된 commit과 명시적 tag만 push한다. 강제 push는 금지한다.
6. release tag는 `release/YYYY-MM-DD/<scope>` 형식을 사용한다.
7. 비밀값, `.env*`, D1 backup 원문, 실제 사용자 데이터와 Wrangler 인증 정보는 Git과 이 문서에 기록하지 않는다.

### GitHub 무료 계정 사용 원칙 (현재 운영 모드)

- 원격 Git은 최소 범위만 사용한다: **commit, branch, tag** 생성 및 `push` 동기화.
- PR, PR 기반 자동 검증, Actions 배포/배포 게이트는 사용하지 않는다.
- 로컬 형상기록이 최우선이다. 모든 release gate 결과(로그, 증거 경로, 배포 ID, rollback target)는 반드시 아래 항목에 md로 즉시 기록한다.
- Git 장애/권한 이슈가 있어 remote 반영이 지연되면, 로컬 원장에 `remote_sync_status: failed`로 남기고, 네트워크 복구 후 동일 SHA 기준으로 재동기화한다.

## 로컬 검증 순서

~~~sh
pnpm ops:verify
pnpm -F @nihongo-n3/e2e test:chromium
pnpm -F @nihongo-n3/e2e test:webkit
# 콘텐츠 변경에만 추가
pnpm -F @nihongo-n3/db question:quality
~~~

이후 Chromium·WebKit 영향 E2E를 실행한다. mock `onend`는 실제 가청 증거가 아니며, Preview URL에서 Chrome의 한국어·일본어 `real-page-onend`, 사용자 가청 확인과 `/api/v1/audio/`·R2 발음 요청 0건을 별도로 기록한다.

## 릴리스 기록 필드

각 릴리스는 다음 항목을 빠짐없이 남긴다.

| 항목 | 필수 값 |
| --- | --- |
| release | 날짜와 범위 |
| source | branch, 40자 Git SHA, tag |
| local gates | 각 명령의 종료 코드와 검사 개수 |
| audio | 한국어·일본어 callback, 가청 확인, R2/legacy 요청 수 |
| D1 | database, migration, manifest, backup, restore drill |
| Worker | 이전 version, 새 version/deployment, rollback version |
| Pages | 이전 production deployment, Preview deployment, 새 production deployment |
| smoke | Worker, auth proxy, Pages, remote DB/FK/FTS 결과 |
| status | draft, preview, published, rolled_back 중 하나 |

### 운영 설정 갱신(로컬-only SCM)

- SHA: `2fb05b321c33c8bd885703393ef82785c2012052`
- 범위: `.github/workflows/ci.yml` 실행 비활성화, CI/CD 회피 문서 추가
- 적용 내용: GitHub Actions 실질 게이트 배제. 현재 기준은 `LOCAL_CICD_OPERATIONS.md`로 통합

## 2026-08-23 음성 복구 1차 Preview — 2026-08-24 최종 릴리스로 대체

| 항목 | 현재 값 |
| --- | --- |
| release | `audio-recovery-2026-08-23` |
| source branch | `feature/topik-product-expansion` |
| 안전 복구 bundle ref | `4108edbd1f4c87b38963a904b1dd9d62ac9fcc2f`; 작업 유실 방지용, 정식 release SHA 아님 |
| 정식 source commit/tag | 1차 `a427af8c963660d9ebfdbec8c7cacf5e9858f749`; 익명 QA 후속 SHA/tag는 최종 gate 후 기록 |
| Actions | repository `enabled=false`; 자동 CI/CD 중단 |
| local gates | `verify:ci` exit `0`; Ops `18/18`, DB `112/112`, Web `90/90`, API `131/131`, fresh D1 완료 |
| browser gates | 전체 데스크톱·모바일·시각 E2E `171 passed / 32 skipped / 0 failed`; 익명 음성 QA 포함 영향 기능 `14/14`; 1차 Preview 실제 기능 `32 passed / 8 skipped / 0 failed` |
| Preview Worker | `48b49518-f374-4c59-a652-f73d136689f3`, release `a427af8...`, smoke `21/21` |
| Preview Pages | 유효 `7de4c852-82c1-4c24-a787-e504174702ea`; 잘못된 `367eb0f4-d336-4b63-8d3a-b073e7290ca8`은 Functions 누락으로 제외 |
| Production | 당시 회귀 Pages 유지; 이 1차 단계에서는 미배포 |
| status | `superseded`; 아래 2026-08-24 최종 릴리스 참조 |

이 표는 1차 Preview의 역사 기록입니다. 실제 Production 결과는 아래 2026-08-24 표가 현재 기준이며, 과거 빈 값이나 `미확인`을 성공으로 해석하지 않습니다.

## 2026-08-24 첫 클릭·PWA 추가 복구

| 항목 | 최종 값 |
| --- | --- |
| release | `audio-first-click-pwa-recovery-2026-08-24` |
| source branch | `feature/topik-product-expansion` |
| source commit/tag | `2bd657e96d8a43c6d28efe414acd468c1abd0861`, `release/2026-08-24/audio-recovery`, 원격 push |
| 변경 범위 | Pages web만 변경; D1 schema/data와 Worker 변경 없음 |
| 원인 | voice 준비 `await`로 사용자 활성화 소실 가능; 열린 설치형 PWA가 이전 JS 유지 |
| local gates | OpenAPI `72/12`, Ops `18/18`, DB `112/112`, Web `93/93`, API `131/131`, typecheck/build/fresh D1/content/audio contract 종료 코드 `0` |
| browser gates | 음성·PWA 영향 Chromium/WebKit `50 passed / 2 skipped`; 전체 데스크톱·모바일·시각 `171 passed / 32 skipped`, 실패 `0` |
| Preview | `d53c3b4f-0c51-4a2b-9cc8-e5f35edcf5a0`; 실제 Chrome 양언어 lifecycle 정상, console error `0` |
| Production | `9cc58a1f-4772-4129-b90d-c819ca20d700`; source `2bd657e...`; asset `assets/index-DprkUCgI.js` |
| Production browser gates | Chromium/WebKit 음성 `2/2`; 영향 기능 `44 passed / 8 skipped / 0 failed` |
| actual Chrome after deploy | 일본어·한국어 각각 클릭 0.3초·2.8초 뒤 `재생 중`, `onend` 정상 종료, alert·console error `0`; 물리 가청은 자동 판정하지 않음 |
| audio/R2 smoke | `/audio-qa` `200`, `/api/v1/audio/test` `410`, 원격 R2 발음 참조 합계 `0` |
| D1 safety | `.artifacts/d1-backups/audio-first-click-pwa-2026-08-24`; SHA-256 manifest와 `65` regular tables restore drill 통과 |
| D1 remote verifier | release source `3485c6e...`·manifest `content-v3-d102868...` 고정 `280/280`; 현재 HEAD 직접 비교는 문서 hash drift로 차단 45건 실패(`INC-DATA-024`) |
| rollback Pages | `485b9f00-a8b1-4bbb-9001-a238651fb212`, source `b8d41acb1cbd77da1a428ade0d07c27c910f84e3` |
| Worker | 변경 없음 `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872` |
| status | `published` |

Pages 복구 배포에는 D1/Worker write가 없었습니다. 현재 HEAD manifest drift를 없애려고 운영 D1을 재시드하지 않았고, 운영 콘텐츠 source에 고정한 verifier 결과와 HEAD drift를 함께 보존합니다.

1차 Preview `efbc8db5-f9fd-444d-8d27-d433372002aa`는 신규 client까지 강제 reload해 원격 browse/quiz를 중단시켰으므로 폐기했습니다. Production에는 반영하지 않았고 rollback은 필요하지 않았습니다. 후속 Preview `d53c3b4f-0c51-4a2b-9cc8-e5f35edcf5a0`에서 기존 controller가 있는 PWA만 reload하는 계약을 검증한 뒤 Production에 반영했습니다.

## 2026-08-24 운영관리 기준선

| 항목 | 값 |
| --- | --- |
| release | `operations-steward-baseline-2026-08-24` |
| source branch/tag | `feature/topik-product-expansion`, `release/2026-08-24/operations-steward` |
| pre-change synchronized HEAD | `951c19f70fbf1ef40a1b11fecdfd3387239cc51f` = origin |
| 변경 범위 | `AGENTS.md`, `project-operations-steward` 스킬, 운영 runbook, status/verify 명령과 테스트, 현재 상태·분석·감사·로드맵·릴리스 문서 동기화 |
| local status | `37 passed / 2 known warnings / 0 failed`; warning은 dirty worktree와 `INC-DATA-024` |
| remote read-only | `47 passed / 2 known warnings / 0 failed`; Pages/Worker/D1 migration/HTTP·auth JSON/R2 참조 0 확인 |
| full local gate | Ops `23/23`, DB `112/112`, Web `34 files / 93`, API `8 files / 131`, OpenAPI `72/12`, typecheck, build, fresh D1 `0000–0027`, 음성 provenance 6개, FK/FTS, content contract/control plane 모두 exit `0` |
| local fresh manifest | `content-v3-d091a7c5a9a6f17d7078`; Production manifest `content-v3-d102868e3d43b9b3c1a4`와의 차이는 `INC-DATA-024`로 유지하며 Production을 재시드하지 않음 |
| cleanup | `.DS_Store` 3개, source 없는 legacy `apps/d1-backup` dependency/cache, 검증 후 재생성 가능한 web `dist`·Playwright report/test-results를 `/Users/sunghokang/.Trash/JLPT-cleanup-2026-08-24-ops`로 이동; Production backup/recovery/release/intake/quality artifact 보존 |
| Production | D1·Worker·Pages write/deploy 없음; 기존 `9cc58a1f` Pages와 Worker `6bbe4bbd` 유지 |
| independent acceptance | 1차 검토의 Wrangler `--yes`, auth body, 음성 provenance, current-HEAD 원격 alias 지적을 모두 교정. 최종 독립 재감사에서 전체 gate, backup 65개 checksum, restore `passed=true`/FK 0, recovery patch·bundle checksum을 확인하고 commit 차단 결함 `0` 판정 |
| status | 전체 local/remote gate와 독립 acceptance 완료; 이 기준선을 commit/tag/push로 형상 고정 |

## 2026-08-30 저장소 최신화와 런타임 계약 교정

| 항목 | 값 |
| --- | --- |
| scope | 활성 문서 영구 경로, 로컬 CI/CD·Sub Agent handoff, TOPIK v2 status, quiz/activity 원자성, R2 전수 gate/CSP, legacy source 정리 |
| pre-change source | branch `feature/topik-product-expansion`, HEAD/origin `3a1dedfde1dd68ba6f9c6ed3fe451709c5d2a650` |
| pre-deletion cross-check | DB source 36개 직접 문서 참조, seed checksum, Git 추적, 전체 `rg` 참조를 확인; TOPIK v1 source·ADR·incident·release evidence 보존 |
| deleted/retired | 중복 Git 매뉴얼 1개, OA 이전 미등록 route 5개, canonical migration 밖의 구 migrate 파일 4개; 활성 원장 3개는 내용 보존 rename |
| focused tests | docs lifecycle/links, Ops `24/24`, DB `114/114`, Web `93/93`, API `134/134`, OpenAPI `72/12`, audio/CSP contract 통과 |
| full local gate | `pnpm ops:verify` exit `0`; typecheck, build, fresh D1 migration `0000–0027`, seed, FK/FTS, manifest, provenance, content contract/control-plane 통과 |
| browser E2E | Chromium/WebKit 전체 `171 passed / 32 skipped / 0 failed`, exit `0`; 한국어·일본어 browser speech와 R2/audio endpoint 요청 0 계약 포함 |
| Production read-only | source push 뒤 `50 passed / 1 known warning / 2 failed`; v2 300 공개·R2 9개 표면 실제 참조 합계 0. 현재 Worker의 `placement-v2` status와 R2 허용 CSP만 실패해 `INC-TOPIK-031`, `INC-AUD-033` 미배포 상태 |
| Production mutation | 없음. D1 `0000–0027`, Worker `6bbe4bbd`, Pages `9cc58a1f` 유지 |
| cleanup | 교차검증 뒤 재생성 가능한 build/Wrangler tmp/이전 CI·E2E report와 비어 있는 미등록 package 껍데기 61MB를 `/Users/sunghokang/.Trash/JLPT-cleanup-2026-08-30-maintenance`로 이동; 복구 가능 |
| verifier correction | 첫 원격 전수 검사에서 compound SELECT 한도를 발견(`INC-OPS-035`); 표면별 count로 수정 후 DB `114/114`, Production 9개 표면 합계 0 재통과 |
| independent acceptance | 첫 검토가 완료 quiz 재제출 시 attempt/activity 불일치를 발견해 commit을 차단; 409·guarded update·재제출 회귀 테스트로 교정. 핵심 음성/TOPIK/quiz/activity E2E는 Chromium/WebKit `38 passed / 2 intentionally skipped / 0 failed` |
| commit/push | main source `58b0ae153a548f942c07b16132eaf9f66beb24f5`; `origin/feature/topik-product-expansion` push 성공·동기화 확인. 이 행을 추가하는 follow-up 문서 commit도 같은 branch에 push |
| final clean status | main source 기준 local `40 passed / 1 known warning / 0 failed`; remote `50 passed / 1 known warning / 2 failed` |
| status | `versioned-and-pushed`; Production release는 두 원격 계약 실패와 `INC-DATA-024` 때문에 차단 유지 |

## 오류·rollback 연결

- 모든 오류와 배포 차단 조건: [오류·회귀 차단 원장](ERROR_LEDGER.md)
- 음성 직접 원인과 실제 Chrome 판정: [TOPIK Google 음성 장애 기록](TOPIK_GOOGLE_SPEECH_INCIDENT_2026-08-23.md)
- 전체 Production 기준선: [현재 상태](CURRENT_STATE.md)
- 콘텐츠 증량과 G0–G4: [N2·N1·TOPIK 증량 릴리스](NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md)
