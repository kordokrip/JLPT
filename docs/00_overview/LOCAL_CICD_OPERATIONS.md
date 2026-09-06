# 로컬 CI/CD 운영 기준

최종 점검: 2026-09-07 KST

이 저장소의 릴리스 gate는 GitHub Actions가 아니라 검증된 로컬 명령과 로컬 원장으로 운영한다. GitHub는 commit·branch·tag 보관과 push에만 사용하며 `.github/workflows/ci.yml`은 `workflow_dispatch`와 `if: false`를 유지하는 비활성 placeholder다.

## 진실의 우선순위

현재 명령 결과와 원격 read-only 조회 → 코드·schema·migration·test → [현재 상태](CURRENT_STATE.md) → [오류 원장](ERROR_LEDGER.md) → [로컬 릴리스 원장](LOCAL_RELEASE_LEDGER.md) → 과거 릴리스 기록 순으로 판단한다. 다른 runtime·배포의 증거를 현재 환경의 통과로 바꾸지 않는다.

## 현재 릴리스 — 2026-09-07

Production Worker `c2901280-4c10-4671-bc61-dc262c88c692`, Pages `ce4e5e57-c0fa-4fe5-b268-00458d4e0300`, migration0000–0028을 반영했다. 배포 commit은 `a7d5d87946334fe8c7970b8f124853aaba443955`이며 검증 runtime793b671과 apps/packages/lock tree가 동일하고 정적 파일70개는 Preview와 hash가 일치한다. 콘텐츠 source3485c6e/manifest d102는 보존했고 seed/publication은 하지 않았다. 최종 push는 아직 실행하지 않았다.

로컬458개·fresh0028·전체 브라우저217/30/0, 최종 Preview181/6/0, 최신555 실제 양언어 가청/onend/Network와 predeploy 통과를 각각 기록했다. Production 사후에는 Worker 공개7·auth proxy3·익명 음성 양 엔진2(mock), pinned392·FK/FTS·R2참조0·기존 학습21테이블 hash 보존을 확인했다. Production 실제 Chrome 양언어 onend1/1은 별도 관측이며 새 사람 가청 확인을 의미하지 않는다.

문서/테스트만 후속 변경되어 runtime tree·lock·배포 파일의 동일성이 입증되면 그 runtime의 통과 증거를 유지하고 변경된 문서/도구 gate만 실행한다. 이를 전체 테스트를 새로 실행했다는 보고로 바꾸지 않는다. 코드·의존성·build 설정·실행 환경이 달라지면 관련 gate를 다시 실행한다. 승인·가청·백업은 실제 대상과 시점에 묶으며 이번에 완료된 승인을 다시 미완료로 취급하지 않는다.

## 로컬 파이프라인

| 단계 | 명령 | 차단 기준 | 기록 |
| --- | --- | --- | --- |
| 시작 상태 | `pnpm ops:status` | 실패 1개 이상 | `.artifacts/operations/ops-status-latest.json` |
| 문서 수명주기 | `pnpm docs:check` | 깨진 링크, 필수 문서 누락, 폐기 경로 재등장 | 종료 코드와 변경 요약 |
| API 계약 | `pnpm openapi:check` | source와 생성 타입 불일치 | 종료 코드 |
| 정적·단위·DB | `pnpm typecheck && pnpm test` | 실패·skip 오판 | 종료 코드와 실제 test 수 |
| 빌드·fresh D1 | `pnpm build && pnpm -F @nihongo-n3/db verify:fresh` | migration, FK/FTS, manifest, 음성·품질 계약 실패 | 종료 코드와 manifest |
| 통합 로컬 gate | `pnpm ops:verify` | 위 단계 중 하나라도 실패 | 원장에 후보 SHA와 함께 기록 |
| 브라우저 | `pnpm test:e2e` 또는 영향 spec 명시 | Chromium/WebKit 제품 흐름 실패 | 실행한 project/spec와 pass/skip/fail |
| 원격 확인 | `pnpm ops:status:remote` | Git·Pages·Worker·D1·HTTP 계약 실패 | read-only artifact |

`CI=true`는 도구의 비대화식 동작과 reporter 선택에만 사용할 수 있다. GitHub Actions 실행을 의미하지 않는다. E2E는 격리된 로컬 Worker와 Vite 서버를 기본으로 사용하며 `E2E_REUSE_EXISTING_SERVER=1`은 호출자가 해당 프로세스의 checkout과 build를 확인한 경우에만 허용한다.

## 변경 유형별 추가 gate

### 학습 경험 `0028` 회귀 계약

- `pnpm -F @nihongo-n3/db exec node --import=tsx --test src/ops/learning-experience-migration.test.ts`: 0000–0027 upgrade 전후 기존 테이블 행 비교, FK, 단계 중복 claim rollback.
- `pnpm -F @nihongo-n3/api exec vitest run src/__tests__/routes.test.ts`: 전 급수 profile/session, 실패 원자성, 소유권/track, 정답 비노출, 결과 재조회, withdrawn 세션 종료, 메모 CAS.
- `pnpm -F @nihongo-n3/e2e exec playwright test learning-experience.spec.ts learning-activity.spec.ts topik-owner-curriculum.spec.ts quiz-modes.spec.ts srs-review.spec.ts --project=chromium --project=webkit --reporter=line`: 실제 격리 D1 기반 학습 흐름과 mock speech를 구분한다.
- 전체 E2E와 시각 baseline도 새 다섯 메뉴에 맞게 검증한다. snapshot 갱신은 UI를 직접 검토한 뒤 수행하며 실패/skip을 통과로 바꾸는 수단으로 쓰지 않는다.
- 로컬 `VITE_LEARNING_EXPERIENCE=false pnpm -F @nihongo-n3/web build`는 화면 복귀용 별도 build 검증이다. false 빌드를 Preview/Production에 자동 반영하지 않는다.
- 로컬 자동 E2E는 disposable D1을 사용한다. 승인된 전용 Preview 검증은 Preview에만 별도 합성 QA 계정을 만들 수 있으며 실제 사용자 계정을 사용하거나 Production에 테스트 기록을 만들지 않는다. test DB/snapshot을 Production backup이라고 부르지 않는다. Preview에 있는 미출시 콘텐츠 160개를 UX 배포 목적으로 Production publication하지 않는다.
- 원격 Preview에서 세션 생성·재개 소요 시간을 별도로 측정한다. 로컬 D1에서 빠르다는 이유로 원격 성능을 통과 처리하지 않으며, 직렬 호출 수 예산 회귀와 실제 동일 환경 재측정을 함께 기록한다. API-only 수정은 검증한 Pages를 재배포하지 않고 Worker source만 갱신할 수 있지만 두 source를 원장에 구분한다.
- ko/ja full-session 두 테스트는 원격에서만 총90초를 허용한다(`INC-QA-050`). 여러 학습·재시도·FSRS를 합친 전체 실행 예산이며, 개별 UI action/API GET/poll/navigation과 실제 study write 응답5초 검사를 완화하지 않는다. 쓰기 응답의 HTTP status·latency를 attachment로 남기고 실패한 초기30초 실행도 보존한다. 이 예외를 다른 짧은 시나리오에 전역 적용하지 않는다.
- 기기 간 동시 요청: 완료 후 stale pause/active, abandoned 후 submit, 다른 기기의 먼저 수락된 답과 오프라인 pending, 계정 트랙 변경 후 날짜 메모를 검사한다. expected_track 409는 명시적 reload를 안내하고 미수락 초안을 보존한다.
- 시계 차이: 기기 시각을 서버보다1분 느리게 고정한 실제 IndexedDB E2E에서 starter10장·평가·reload를 검사한다. 서버due 스냅샷/로컬 변경 보존 hook단위7개와 별개다. SRS 음성 검사는 로딩 상태 때문에 skip하지 않고 카드 준비를 기다린다. mock 기록 화면의 SW차단은 해당파일에만 한정하며 interception counter를 반드시검사한다.
- 복습 카드 양면: 앞면에서 숨긴 답/발음 버튼이 접근성 tree나 Tab에 노출되면 실패한다. 실제 뒤집기 후 발음 클릭과 포커스된 버튼의 Enter/Space를 검사하며 전역 단축키가 이를 가로채면 차단한다. CSS 회전만으로 조작 차단을 가정하지 않는다(`INC-SRS-053`).
- backup/restore는 실제 schema로 0027/65와 0028/70 profile을 구분한다. `coversLocalSchema=false`인 구 65개 snapshot을 새 학습 데이터까지 포함한 backup으로 표기하지 않는다. 실제 Miniflare `_cf_METADATA`를 포함한 목록 판정과 과거 65개 backup의 local0028 restore는 통과했다. 기존 transfer·사용자 정리 도구의 65-table 기본 계약은 0028에서 아직 사용할 수 없다.
- 기존 기능 안정성: authStore 실패/성공·설정 v6 rehydrate, 비어 있지 않은 양 트랙 기록의 upgrade, 실제 UI 설정→profile PUT/GET→reload를 함께 검사한다. 프로필 GET 지연·실패, PUT 실패와 늦은 응답의 계정/트랙 변경도 포함한다. 조회 지연 E2E는 실제 Worker/D1 응답의 전달만 늦추며 payload를 만들지 않는다.
- Google 버튼의 설정 표시는 `/auth/config`와 href/aria-disabled를 대조한다. 비활성 anchor에 link role이 없는 것은 정상이나, 실제 OAuth start 503은 별도 실패다. OAuth bridge의 Google 응답 mock과 실제 provider 로그인은 별도 gate다. Preview 설정 준비 없이 운영 OAuth secret을 복사하지 않는다. 최신 결과는 학습 경험 계획의 Preview OAuth 후속과 릴리스 원장을 따른다.

전용 Preview의 넓은 기능 회귀는 아래처럼 Web과 직접 API 주소를 함께 지정한다. `E2E_API_URL`을 생략하면 메뉴 health 검사가 localhost를 조회한다. 2026-09-06 목록 기준 24개 파일·187개 기능 검사이며 로컬 fixture에만 의존하는 TOPIK 6개는 명시적 원격 skip이다. 시각 baseline suite60개는 이 명령에서 제외되므로 원격 시각 검사를 통과했다고 쓰지 않는다. 검색 입력란 부재의 조건부 skip은 별도로 원인을 검토한다. mock 음성/provider/화면 fixture는 실제 외부 서비스 성공 증거가 아니다.

```sh
E2E_BASE_URL=https://555fc0c4.nihongo-n3.pages.dev \
E2E_API_URL=https://nihongo-n3-api-topik-preview.kordokrip.workers.dev \
pnpm -F @nihongo-n3/e2e exec playwright test \
  --grep-invert '핵심 화면 시각 회귀' \
  --project=chromium --project=webkit \
  --project=mobile-chromium --project=mobile-webkit \
  --workers=1 --retries=0 --max-failures=0 \
  --trace=retain-on-failure --reporter=line \
  --output=/Users/sunghokang/JLPT/.artifacts/operations/stability-preview-full-functional-results
```

기존 메뉴 테스트에는 일부 SW access-control 오류를 조건부 제외하는 코드가 있으므로 메뉴 통과만으로 `INC-PWA-056`을 닫지 않는다. `offline.spec.ts` 이름만으로 실제 네트워크 차단을 검증했다고 쓰지 않으며, 실제 pending/reconnect는 학습 세션 테스트에서 확인한다. 자연 일본어 번역 mock은 해당 nested describe만 SW 제어하고 counter1·POST/body·고정 문구/검색/URL을 함께 검사한다. 실제 AI 응답이 흘러들어온 결과를 mock 통과로 인정하지 않는다. 실패한 SSO를 grep/skip으로 제거한 뒤 전체 gate 통과로 표시하지 않는다.

- DB·콘텐츠: `question:quality`, `content:contract:verify`, `content:control-plane:verify`, idempotent fresh/upgrade와 source checksum을 확인한다.
- API·데이터 바인딩: OpenAPI 생성 전후 diff, track guard, 정답 사전 노출 금지, progress→FSRS→activity transaction을 확인한다.
- 음성: `pnpm release:verify:audio-contract`, Chromium/WebKit 재생 lifecycle, 실제 배포 Chrome의 한국어·일본어 `onend`, `/api/v1/audio/*` 요청 0건과 Production D1 R2 발음 참조 0건을 서로 분리해 기록한다.
- Production: 현재 세션 승인, 전용 Preview, D1 backup/restore drill, rollback Worker/Pages, predeploy 증적이 모두 있어야 한다. 이 문서나 `ops:*` 명령은 Production write를 자동 승인하지 않는다.

### Preview OAuth 최종 검증 단위

2026-09-06 사용자 승인으로 별도 Google client와 Preview secret 두 개를 연결했습니다. Worker87f8fbf5는 앱source793b671/Pages555fc0c4를 유지합니다. API bridge2+Web proxy/authStore12는 exit0이나 Google provider mock입니다. 실제 Chrome JLPT 로그인·홈 재조회와 TOPIK 재로그인, 별도 D1 identity/FSRS 설정 hash 전후 일치를 분리해 기록했습니다. 최종187개는 `preview-oauth-full-functional-2026-09-06-*`의 새 증적 경로에서181 pass/6 로컬 fixture skip/0 fail,23.3분·exit0으로 종료했습니다. 시각60개는 별도 제외이며 이전178/6/3 결과를 덮어쓰지 않습니다.

같은 Pages의 실제 Network/HAR에서 양언어 onend1/1·R2/legacy0을 확보했습니다. 당시 사람 확인 대기였던 `stability-preview-actual-audio-network.json`의 strict gate2개 누락·exit1은 이력으로 보존합니다. 이후 최신555의 사용자 양언어 가청 답변을 별도 `learning-experience-2026-09-07-preview-audio-confirmed.json`에 연결해 strict gate를 통과했습니다. 운영 점검 승인·새65-table backup/restore·신선도 대조·최종 predeploy도 완료한 뒤 배포했습니다. 65-table 백업을0028 이후70-table 백업으로 표현하지 않습니다.

## 형상관리와 증적

1. 시작과 종료에 branch, HEAD, `git status --short`, origin SHA를 확인한다.
2. 사용자 변경을 reset·checkout·stash하지 않는다.
3. 문서·코드·테스트·생성 타입을 하나의 원자적 commit으로 고정한다.
4. `git diff --check`, `git show --check`, 종료 `ops:status`를 통과한 commit만 push한다.
5. release tag는 실제 릴리스 기준선에만 `release/YYYY-MM-DD/<scope>`로 만든다. 문서 정리만으로 Production tag를 만들지 않는다.
6. `.env*`, 사용자 데이터, D1 backup 원문, 인증 정보, `.artifacts` 원문은 push하지 않는다.
7. push 실패 시 로컬 commit SHA와 실패 원인을 [로컬 릴리스 원장](LOCAL_RELEASE_LEDGER.md)에 남기고 같은 SHA만 재시도한다. force push는 금지한다.

## 문서·파일 수명주기

- 활성 운영 문서는 날짜 없는 영구 경로를 사용한다: `CURRENT_STATE.md`, `ERROR_LEDGER.md`, `OPERATIONS_MANAGEMENT_RUNBOOK.md`, `LOCAL_CICD_OPERATIONS.md`, `LOCAL_RELEASE_LEDGER.md`, `SUB_AGENT_HANDOFF.md`.
- 날짜가 붙은 문서는 incident·Preview·release·maintenance 증적처럼 완료 시점이 고정된 기록에만 사용한다.
- `docs/01_n5`–`docs/07_topik`은 seed/parser가 읽을 수 있는 콘텐츠 원본이다. 오래된 버전 번호만으로 삭제하지 않고 코드 참조와 checksum을 먼저 확인한다.
- Production backup, restore drill, recovery bundle, source intake, reviewer/quality evidence는 보존한다.
- `.DS_Store`, `dist`, Playwright report/test-results처럼 재생성 가능한 항목만 참조·보존가치를 확인한 뒤 정리한다.

세부 장애 처리와 배포 절차는 [운영 runbook](OPERATIONS_MANAGEMENT_RUNBOOK.md), 실제 실행 이력은 [로컬 릴리스 원장](LOCAL_RELEASE_LEDGER.md)을 따른다.
