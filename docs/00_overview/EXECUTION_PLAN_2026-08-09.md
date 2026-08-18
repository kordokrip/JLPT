# 시스템 복구·확장 실행 계획

기준일: 2026-08-09 KST. 이 문서는 새 노트북에서 프로젝트를 재개하기 위한 **실행 순서**다. 이미 구현된 기능을 다시 만드는 계획이 아니라, 구현 누락·검증 공백·승인 대기 항목을 구분해 원래의 확장 순서로 안전하게 진행하기 위한 기준이다.

현재 구현·데이터 모델은 [현재 상태](CURRENT_STATE.md), 콘텐츠 수와 원본은 [콘텐츠 감사](CONTENT_AUDIT.md), 제품 우선순위는 [로드맵](../ROADMAP.md)을 단일 기준으로 삼는다.

## 결론과 우선순위

먼저 TOPIK owner curriculum의 실제 학습 루프와 Google 음성 재생을 Chromium/WebKit에서 재현 가능하게 검증한다. 그다음 CI를 복구하고, N2 Batch 5 → N1 Batch 4 → TOPIK 다음 batch를 확장한다. 2026-08-09 현재 TOPIK Batch 4까지 완료했으며 다음 실행 대상은 ARCH-01 manifest label ADR이다. R2 발음은 사용하지 않으며 기존 전용 오디오 객체를 삭제한다.

~~~text
0. 로컬 재현성 확보
   -> 1. TOPIK/오디오 E2E 계약 복구
   -> 2. CI와 검증 게이트 복구
   -> 3. N2 Batch 5 (완료)
   -> 4. N1 Batch 4 (완료)
   -> 5. TOPIK Batch 4 이후 (완료)
   -> 6. manifest 이름 부채 정리 (다음)
   -> 7. Google 음성 정책·R2 발음 삭제 검증
   -> 8. 승인된 원격 릴리스
~~~

Batch 3~5는 서로 다른 학습 주제로 병렬 저작할 수 있지만, 이 문서의 **머지·배포 순서**는 위 순서를 따른다. 각 단계는 바로 앞 단계의 완료 기준을 통과해야 다음 단계로 넘어간다.

## 교차검증 방법과 범위

아래 결과는 문서, 소스 코드, 테스트/실행 설정을 각각 대조한 것이다. 원격 D1·R2·Cloudflare 배포는 이 로컬 검사로 판정하지 않는다.

| 대조 축 | 확인한 근거 | 결론 |
| --- | --- | --- |
| 콘텐츠 계획 ↔ seed | `ROADMAP.md`의 N2 Batch 5, N1 Batch 4, TOPIK Batch 4 완료 선언 ↔ `content-manifest.ts`의 `N2-A5`, `N1-A4`, `TOPIK-A4` | 완료 선언은 구현과 일치한다. 다음 실행 대상은 ARCH-01 manifest label ADR이다. |
| TOPIK 진행 계획 ↔ API/UI/schema | `CURRENT_STATE.md` ↔ migration `0021`, `topik-owner-curriculum.ts`, `TopikOwnerAuthoredCurriculum.tsx`, `TopikReview.tsx` | 완료·진행률·FSRS 카드·due·rating은 계정별 서버 데이터로 구현되어 있다. |
| 오디오 정책 ↔ UI/E2E | `CURRENT_STATE.md`, `audio-policy.ts`, owner curriculum UI ↔ `topik-owner-curriculum.spec.ts`, `n2-release-browse.spec.ts` | Google-only DTO·UI·E2E 계약으로 정렬했다. 두 spec은 R2 `/audio/*` 요청이 없고 Google 음성만 선택됨을 검증한다. |
| 로컬 데이터 검사 ↔ 계획 | `verify:fresh.ts`, `seed/verify.ts`, DB 단위 테스트 | 이전 인수 문서 갱신 과정에서 fresh D1 351개 검사와 DB 56개 테스트가 통과했다. fresh verifier는 23개 manifest source를 검사한다. |
| CI 선언 ↔ 저장소 설정 | 루트 `package.json`, `e2e/playwright.config.ts`, `.github/workflows/ci.yml` | PR/push `main` workflow가 `verify:ci`, Markdown 링크 검사, Chromium/WebKit 기능 E2E를 실행한다. Linux 시각 비교는 별도 observer artifact로 보관한다. |
| 새 노트북 실행 ↔ Playwright | `pnpm --dir e2e exec playwright install chromium webkit` | 2026-08-09에 Chromium 1223와 WebKit 2287을 설치했다. 관련 owner-flow E2E 실행은 1단계에서 수행한다. |

`verify:fresh.ts`가 TOPIK Batch 1의 별도 보고서를 만드는 반면 Batch 2~3은 공통 manifest 검사와 DB 단위 테스트로 덮는다. 이는 현재 데이터 무결성 실패가 아니라 보고서 범위의 차이다. 새 batch에서 별도 verifier를 추가할지는, 공통 manifest가 부족한 고유 규칙이 생길 때만 결정한다.

## 미완료·미검증 항목 레지스터

상태는 다음 네 가지로 읽는다.

- **미구현**: 현재 계획에 있지만 관련 batch/기능이 아직 없다.
- **검증 공백**: 구현은 있으나 현재 사용자 흐름을 보장하는 실행 테스트가 없다.
- **결정 필요**: 구현 전에 공개 범위나 호환성 원칙을 확정해야 한다.
- **승인 대기**: 외부 자산·원격 데이터·배포 권한 없이는 진행할 수 없다.

| ID | 상태 | 항목 | 근거와 처리 방향 |
| --- | --- | --- | --- |
| ENV-01 | 완료 | Playwright 브라우저 설치 | 2026-08-09에 Chromium 1223와 WebKit 2287 설치를 완료했다. |
| E2E-01 | 완료 | TOPIK complete → due → rating 실제 루프 | deterministic local fixture와 두 계정으로 complete의 idempotent card 생성, due, `good` rating 후 future due, UI 갱신 및 계정 격리를 Chromium/WebKit에서 확인했다. |
| E2E-02 | 완료 | TOPIK Google 음성 | `audio_text_ko`가 있는 두 item은 Google Korean voice만 쓰고, 없는 item은 unavailable을 표시한다. 두 경우 모두 R2 `/audio/*` 요청은 없다. |
| E2E-03 | 완료 | N2/N1 공개 학습 계약 | 실제 공개 범위는 N2-only가 아니라 `n5-n1`이다. E2E가 N2 Batch 4~5, N1 Batch 3~4, grammar/reading 도달 경로와 Google 일본어 음성을 확인한다. |
| CI-01 | 완료(원격 실행 대기) | 자동 검증 workflow | `.github/workflows/ci.yml`이 `verify:ci`, 문서 링크, 로컬 D1 Chromium/WebKit 기능 E2E를 실행하고 trace/screenshot/HTML artifact를 보관한다. GitHub에서 첫 실행은 아직 수행하지 않았다. |
| META-01 | 완료 | 제품 범위 메타데이터 | 루트와 E2E package description, README가 JLPT N5~N1 + TOPIK PWA 범위로 갱신됐다. |
| N2-05 | 완료 | N2 Batch 5 | `N2-A5`가 공공 절차·주민 참여·의견 조정 source, builder, stable ref, Google-only audio binding, manifest와 E2E에 연결됐다. count 계약은 61 row다. |
| N1-04 | 완료 | N1 Batch 4 | `N1-A4`가 학술 논증·비평·정책/사회 현상·추상 관계 source, 공통 builder, manifest, Google-only audio binding, E2E에 연결됐다. count 계약은 61 row다. |
| TOPIK-04 | 완료 | TOPIK 1~6 Batch 4 | `TOPIK-A4`가 1~2급 생활·기초, 3~4급 사회·직장, 5~6급 논증·쓰기·고급 독해 source, owner unit/item, Google-only audio binding, progress/FSRS E2E에 연결됐다. count 계약은 60 row다. |
| ARCH-01 | 완료 | `n2_curriculum` manifest label | ADR-001은 schema v3에서 historical label을 유지한다. 이는 N1/N2 multi-table JLPT batch의 내부 manifest label이며 D1 table이 아니다. |
| AUDIO-01 | 완료 | Google-only 발음과 R2 삭제 | 원격 D1 추적 key 1,956개와 generation log를 삭제했고 재확인 참조 수는 0이다. production Worker의 R2 route/생성 경로는 410이며, migration 0020이 R2 발음 asset/binding 쓰기를 abort한다. |
| REMOTE-01 | 완료 | 원격 migration/seed/deploy | 사용자 승인 후 backup/restore drill, production migration 0020~0021, seed, remote verifier, Worker/Pages deploy와 smoke를 완료했다. 상세 식별자와 rollback은 8단계 실행 기록을 따른다. |

## 단계별 실행 계획

### 0. 로컬 재현성·작업 경계 확정

목표는 기존 dirty worktree를 지우거나 섞지 않고, 새 노트북에서 같은 결과를 낼 수 있는 기준선을 기록하는 것이다. 기존 변경은 사용자 소유로 간주한다.

수행 내용:

1. `git status --short`와 `git diff --check`로 기존 변경과 whitespace 오류를 기록한다. reset, checkout, 대량 포맷팅을 하지 않는다.
2. lockfile 기준 의존성을 설치하고, Chromium과 WebKit browser binary를 설치한다. browser cache 설치는 저장소 내용이나 원격 환경을 바꾸지 않는다.
3. 아래 명령을 순서대로 실행하고, 실패하면 원인·로그 경로·재현 명령을 남긴다.

~~~sh
CI=true pnpm install --frozen-lockfile
pnpm --dir e2e exec playwright install chromium webkit
pnpm -F @nihongo-n3/db verify:fresh
pnpm -F @nihongo-n3/db test
pnpm typecheck
pnpm test
pnpm build
~~~

완료 기준:

- 기존 변경은 보존되고, 새로 발생한 결과물은 ignore 여부 또는 정확한 경로가 기록된다.
- DB fresh, 단위 테스트, typecheck, build의 pass/fail 기준선이 남는다.
- Playwright가 “browser executable 없음” 이전 단계까지는 최소한 통과한다.

2026-08-09 기준선 실행 기록: `CI=true pnpm install --frozen-lockfile`은 변경 없이 완료했고, Chromium 1223·WebKit 2287을 설치했다. `verify:fresh`, DB 테스트(56), 전체 테스트(274), typecheck, production dry-run build가 모두 통과했다. DB 테스트에서 발견한 과거 browser-fallback 기대값 3건은 Google-only 정책의 source metadata·계약으로 갱신한 뒤 재검증했다. 기존 dirty worktree는 보존했으며 reset·checkout·원격 배포는 수행하지 않았다.

### 1. TOPIK 진행률·FSRS·오디오 E2E 계약 복구

이 단계는 기능 추가보다 **현재 기능이 실제 사용자 흐름으로 작동함을 증명**하는 단계다. owner curriculum과 public practice/release lifecycle을 혼합하지 않는다.

수행 내용:

1. deterministic local D1 fixture를 준비한다. 적어도 하나의 owner item은 `audio_text_ko`를 가져 Google DTO를 반환해야 한다.
2. 두 개의 독립 계정을 만든 뒤 첫 계정에서 해설 확인/complete를 수행하고, progress와 생성된 FSRS card를 확인한다. 둘째 계정에서 첫 계정의 완료·due·review 기록이 보이지 않아야 한다.
3. 첫 계정의 due 목록에서 card를 찾고 `again`, `hard`, `good`, `easy` 중 대표 rating(최소 `good`)을 적용한다. next state, `due_at`, review log, UI cache invalidation을 확인한다.
4. Google item의 재생에서 R2 요청이 없고 Google 음성만 선택되는지 확인한다. `audio_text_ko`가 없는 항목은 unavailable로 남는 별도 사례도 유지한다.
5. N2/N1 E2E의 공개 범위를 문서와 실제 track 정책으로 결정한다. N2 Batch 4~5와 N1 Batch 1~4가 사용자 화면에서 보여야 한다면 이를 검증하고, 의도적으로 비공개라면 그 이유와 API gate를 테스트에 명시한다. 오래된 “N2 1~3만” 및 “browser speech 0회” 기대값을 무비판적으로 유지하지 않는다.
6. Chromium과 WebKit을 각각 명시적으로 실행한다. 모바일은 현재 menu/PWA 중심이므로 owner flow의 모바일 범위는 별도 결정 전까지 확대 주장하지 않는다.

완료 기준:

- `complete → due → rating`의 HTTP 응답과 화면 상태가 같은 계정에서 연결된다.
- 두 계정 사이에 owner progress/FSRS가 누출되지 않는다.
- Google 음성과 unavailable 경로가 각각 정책대로 검증된다.
- Chromium과 WebKit의 관련 spec이 모두 통과한다.
- fixture가 public TOPIK bank, private release claim, 원격 D1/R2를 변경하지 않는다.

2026-08-09 1단계 실행 기록: `topik-owner-curriculum.spec.ts`와 `n2-release-browse.spec.ts`를 local D1에서 Chromium·WebKit으로 실행해 통과했다. owner spec은 Google Korean voice, unavailable item, answer/해설 비노출, complete → due → `good` rating, 두 계정의 progress/FSRS 격리를 검증한다. N2/N1 spec은 track status의 실제 공개 범위 `n5-n1`, N2 Batch 4~5와 N1 Batch 3~4의 vocab·grammar·reading 도달 경로, Google 일본어 음성, `/api/v1/audio/` 요청 0건을 검증한다. UI의 R2 QA 후보 비교 화면은 Google 음성 확인 화면으로 교체했고, legacy audio prefetch는 네트워크를 만들지 않는 호환 no-op으로 바꿨다. local fresh D1 report는 현재 26개 source의 모든 blocking check가 통과했고, DB 56, web 79, API 126 테스트와 typecheck도 통과했다.

### 2. CI·문서·메타데이터 게이트 복구

수행 내용:

1. `.github/workflows/`에 실제 workflow를 추가하고, `playwright.config.ts`의 존재하지 않는 workflow 주석을 해당 파일과 맞춘다.
2. PR 기준 job에는 `pnpm openapi:check`, typecheck, DB test, web/API test, build, disposable local D1 `verify:fresh`를 넣는다. 이미 정의된 `pnpm verify:ci`를 기준으로 중복 명령을 최소화한다.
3. E2E는 browser install 후 Chromium과 WebKit을 명시한 matrix 또는 분리 job으로 실행한다. 실패 시 trace, screenshot, HTML report를 artifact로 보관한다. 실제 Cloudflare credential이나 원격 D1/R2 secret을 요구하지 않는다.
4. 루트와 E2E package description, README/문서 링크를 현 제품 범위로 고친다. CI가 새 문서를 검증 대상으로 인식하도록 relative Markdown link 검사도 추가한다.
5. 시각 회귀는 OS별 baseline을 섞지 않는다. Linux에서 비교 실패하면 expected/actual/diff artifact를 남기고, 검토된 baseline만 별도 변경으로 반영한다. 기능 E2E의 필수 gate를 시각 baseline 불일치 때문에 우회하거나 자동 승인하지 않는다.

완료 기준:

- pull request에서 local-only CI가 재현 가능하고 remote credential 없이 실행된다.
- browser artifact와 verifier report가 실패 시 회수된다.
- CI 정의, package metadata, 문서의 설명이 JLPT N5~N1 + TOPIK 범위와 일치한다.

2026-08-09 2단계 실행 기록: `.github/workflows/ci.yml`에 PR/push `main`용 local-only verification job과 Chromium/WebKit 기능 E2E matrix를 추가했다. `pnpm docs:check`는 README와 `docs/`의 46개 Markdown 파일, 41개 relative link를 확인한다. 루트/E2E package metadata와 README를 N5~N1 + TOPIK 범위로 맞췄고, config 주석도 실제 workflow 경로로 교체했다. 로컬에서 `verify:fresh`의 blocking check 0건, DB 56, web 79, API 126, ops 8, typecheck, build, Chromium E2E 91, WebKit E2E가 모두 통과했다. 현재 macOS에서 변경된 화면 6개는 visual baseline을 갱신하고 실제 렌더링을 육안 확인했다. 이 노트북에는 Docker/Linux renderer가 없어 Linux baseline을 추측해 쓰지 않았다. 대신 CI의 `visual-baseline-observer`가 Linux expected/actual/diff artifact를 보관한다. Linux baseline은 해당 artifact 검토 후 명시적으로 반영할 때까지 observer 결과로만 다루며, 기능 E2E gate는 계속 필수다.

### 3. N2 Batch 5 — 사회·공공 서비스·의견 조정

수행 내용:

1. 새 자체 저작 Markdown 원본을 `docs/05_n2/`에 추가한다. 사회적 상호작용, 공공 절차, 의견 조정의 문맥을 포함하고, 공식 JLPT 문항·지문·음원을 복제하지 않는다.
2. Batch 설계 전에 vocabulary, grammar, reading, listening, reading-question의 분포와 canonical row 목표를 문서 안에 명시한다. 목표 수는 임의의 문서 수치가 아니라 builder test와 manifest `expectedRows`의 단일 계약으로 확정한다.
3. `n2-batch5.ts` builder, source asset, stable ref, audio binding, `CONTENT_PATHS`, `content-manifest.ts`, batch unit test를 함께 추가한다. 새로운 의존성을 추가하기 전에 기존 `self-authored-jlpt-batch.ts` 재사용 가능성을 검토한다.
4. 정상 browse/detail, grammar quiz, reading, listening UI에서 해당 source가 실제로 도달하는지 검증한다. Google 음성만 사용하고 R2 요청이 없는지 테스트로 명시한다.

완료 기준:

- 원본·builder·manifest·source asset·stable ref·audio binding의 소유 관계가 모두 존재한다.
- duplicate natural key, provenance, row count, FK 검사를 통과한다.
- `verify:fresh`, DB 테스트, 관련 Chromium/WebKit E2E가 통과한다.
- 콘텐츠 감사·source map·로드맵의 수치와 상태가 같은 변경에서 갱신된다.

2026-08-09 3단계 실행 기록: `N2-A5` source는 `docs/05_n2/06_self_authored_batch_5.md`에 추가했다. `n2-batch5.ts`는 공통 helper를 사용해 source asset, SHA-256, stable ref 55개, Google-only audio binding 49개를 만든다. count는 category 5, vocab 24, grammar 6, kanji 10, listening sentence 12, reading 3, reading question 6, content row 61이다. local fresh D1은 `rows:N2-A5=61`, source 24개, canonical content row 6,380개와 모든 blocking check 통과를 확인했다. Chromium과 WebKit E2E는 `自治体`, `に基づいて`, `証明書の交付を申し込む`, Google Japanese speech, R2 audio endpoint 0건을 확인한다.

### 4. N1 Batch 4 — 학술 논증·비평·정책·사회 현상

수행 내용:

1. `docs/06_n1/`에 Batch 4 원본을 추가한다. 학술적 주장, 관점 비교, 비평, 정책/사회 현상, 추상적 인과·대조 관계를 다루되 공식 기출 자료를 사용하지 않는다.
2. N2 builder를 복사하지 말고 공통 self-authored JLPT batch helper가 level, stable ref, audio role, reading-question을 올바르게 수용하는지 먼저 검토한다.
3. N1 전용 batch builder/테스트/manifest entry를 작성하고, UI/API가 N1 public/hidden 범위 정책과 일치하는지 E2E로 검증한다.
4. ARCH-01 결정을 아직 내리지 않았다면 label을 유지하되, 새 코드에 “N2 전용”이라는 잘못된 의미를 추가하지 않는다.

완료 기준:

- N1 Batch 4가 자기 원본과 명시적 count 계약을 갖는다.
- N1의 공개 여부, browse/quiz/reading/listening 도달 경로, audio 동작이 문서와 테스트에서 한 가지 의미로 정리된다.
- 전체 local verification gate가 통과한다.

2026-08-09 4단계 실행 기록: `N1-A4` source는 `docs/06_n1/04_self_authored_batch_4.md`에 추가했다. `n1-batch4.ts`는 공통 helper를 사용해 source asset, SHA-256, stable ref 55개, Google-only audio binding 49개를 만든다. count는 category 4, vocab 24, grammar 6, kanji 10, listening sentence 12, reading 3, reading question 6, content row 61이다. local fresh D1은 `rows:N1-A4=61`, source 25개, canonical content row 6,441개와 모든 blocking check 통과를 확인했다. Chromium과 WebKit E2E는 `命題`, `に照らして`, `政策評価における視座`, Google Japanese speech, R2 audio endpoint 0건을 확인한다. `n2_curriculum`은 historical manifest label로 유지했고 storage schema·학습 이력은 바꾸지 않았다.

### 5. TOPIK 1~6 Batch 4 이후 — 급수 대역별 선택 폭 확장

수행 내용:

1. Batch 4는 1~2급(생활·기초 문장), 3~4급(사회·직장 문맥), 5~6급(논증·쓰기·고급 독해)의 확장 방향을 따른다. 각 급수에는 vocab, grammar, reading, listening, writing의 균형을 유지한다.
2. owner curriculum 전용 원본·builder·stable unit/item ID·source asset·audio text/binding을 추가한다. practice bank나 공개 release lifecycle 테이블에 넣지 않는다.
3. 해설 확인이 account progress와 idempotent FSRS card 생성으로 이어지고, due/review UI에서 새 item을 처리하는지 API와 E2E로 확인한다.
4. 문항의 답/해설이 목록 API에 새지 않고 solution endpoint 이후에만 노출되는 기존 계약을 유지한다.

완료 기준:

- 새 batch가 여섯 급수와 다섯 영역의 계획된 단위를 갖고, 각 item이 owner-curriculum progress/FSRS와 연결된다.
- Google-only 조건과 unavailable 상태가 섞이지 않는다.
- shared DTO/API test, fresh D1, Chromium/WebKit owner-flow 회귀가 통과한다.

2026-08-09 5단계 실행 기록: `TOPIK-A4` source는 `docs/07_topik/05_owner_authored_grades_1_6_batch_4.md`에 추가했다. `topik-owner-curriculum-batch4.ts`는 6급수 × 5영역에 owner-only unit 30개와 item 30개, stable ref·Google-only audio binding 각 30개를 만든다. local fresh D1은 `rows:TOPIK-A4=60`, source 26개, canonical content row 6,501개, TOPIK owner 120 unit·120 item과 모든 blocking check 통과를 확인했다. Chromium과 WebKit E2E는 실제 6급 `자료 해석` item의 목록 DTO에 답/해설이 없음을, Google Korean speech, R2 audio endpoint 0건, complete → due FSRS 연결을 확인한다.

### 6. ARCH-01 — JLPT manifest label 일반화 결정

이 단계는 신규 콘텐츠를 막는 즉시 장애가 아니다. 다만 N1과 이후 JLPT 확장이 누적되기 전에 기술 부채를 명시적으로 끝낸다.

수행 내용:

1. `SeedTable`의 `n2_curriculum`이 실제 D1 table인지, manifest 분류값인지, 외부 도구가 읽는 호환성 값인지를 조사한다.
2. 세 가지 안을 비교해 ADR을 작성한다: 현 label 유지, 일반 `jlpt_curriculum` manifest label 추가, storage schema까지 일반화. API/seed report/기존 manifest consumer의 호환성 비용을 포함한다.
3. 선택안이 manifest label 변경이면 schema version, migration/compatibility reader, report consumer, 문서와 tests를 한 변경에서 맞춘다. row ID나 사용자 학습 이력을 재작성하지 않는다.

완료 기준:

- 선택·미선택 이유와 rollback 경계가 ADR에 남는다.
- 기존 source checksum, stable ref, fresh D1 및 기존 사용자 SRS가 보존된다.

2026-08-09 6단계 실행 기록: [ADR-001](ADR-001-jlpt-manifest-label.md)은 실제 consumer가 manifest seed, verifier, fixture exclusion, contract test뿐이며 API·D1 schema·사용자 progress/FSRS가 이 label을 읽지 않음을 확인했다. schema v3에서는 `n2_curriculum`을 N1/N2 multi-table JLPT batch용 historical label로 유지한다. 새 `jlpt_curriculum` compatibility reader나 storage migration은 현재 필요하지 않아 채택하지 않았다. rollback은 ADR·주석 revert 범위이고 source checksum, stable ref, D1 migration, 사용자 학습 이력은 변경하지 않는다.

### 7. AUDIO-01 — Google-only 발음과 R2 발음 삭제

발음 제공자는 Google 음성 하나뿐이다. R2에 새 발음 객체를 올리거나 R2를 fallback으로 쓰지 않는다. 이 정책은 `nihongo-n3-audio` 전용 버킷에만 적용하며 report/evidence 버킷은 건드리지 않는다.

수행 내용:

1. 원격 D1의 `audio_r2_key`와 generation log를 읽기 전용으로 집계해 삭제 key와 건수를 확정한다.
2. 확정된 `audio/` key를 `nihongo-n3-audio`에서 삭제하고, 성공 뒤 D1의 legacy R2 key와 생성 log를 해제한다.
3. `/audio/*`와 관리자 R2 생성 경로가 410을 반환하며, Google 음성 외 provider/R2 네트워크 요청이 없는지 확인한다.
4. 삭제한 key 수, 실패 key, D1 참조 수, 실행 시각을 운영 기록에 남긴다.

완료 기준:

- 전용 audio 버킷의 확인된 발음 key와 원격 D1 참조가 0개다.
- R2 발음 endpoint·생성 endpoint가 fail-closed다.
- Google 음성만 UI 정책과 E2E 계약에 남는다.

2026-08-09 실행 기록: `nihongo-n3-audio`에서 D1 참조 key 1,956개를 삭제하고, `vocab`·`kanji`·`sentences`·`reading_passages`의 `audio_r2_key` 및 `audio_generation_log.r2_key`를 정리했다. 이후 dry-run 집계와 production `verify:remote:audio:r2`는 `referenced_keys: 0`, 실패 0이었다. production Worker에도 runtime 차단과 `ASSETS` 바인딩 제거를 반영했다. 또한 migration 0020은 R2 발음 source asset metadata와 `r2-ready` binding 삽입을 D1 trigger로 abort한다. report/evidence 버킷은 계속 범위 밖이다.

### 8. REMOTE-01 — 승인된 원격 릴리스와 관찰

원격 쓰기, production seed, migration, deploy는 이 문서만으로 승인되지 않는다. 변경 범위와 대상 환경을 사용자가 승인한 뒤에만 실행한다.

수행 내용:

1. 읽기 전용 원격 상태 확인과 local seed diff를 먼저 수행한다. 대상 DB, content version, migration ledger, R2 bucket을 명시한다.
2. backup과 restore drill을 성공시킨 뒤, migration/seed를 preview 또는 blue-green 경로에서 검증한다.
3. post-deploy smoke, 로그/알림, rollback trigger를 준비한 후 production cutover를 한다. 원격 검증 결과는 날짜·환경·content version과 함께 기록한다.

완료 기준:

- 원격 적용 전 backup/restore 증적과 승인 기록이 있다.
- 원격 manifest, migration ledger, audio provenance, smoke 결과가 local 계획과 일치한다.
- rollback 기준과 담당자가 명시되어 있다.

2026-08-09 8단계 실행 기록: 사용자가 production D1/R2/production 배포를 명시 승인했다. `nihongo-n3-prod-v2`를 23개 테이블로 backup하고 `.artifacts/d1-backup/2026-08-09-production-v2`에서 restore drill을 통과시켰다. 사전 ledger는 0020~0021 pending임을 확인했고, production에 두 migration을 적용한 뒤 9개 seed chunk를 반영했다. 결과 manifest는 `content-v3-d102868e3d43b9b3c1a4`이며 26 source·6,501 canonical row, `N1-A4=61`, `N2-A5=61`, `TOPIK-A4=60`, FK 0, FTS parity를 원격 verifier로 확인했다. R2 발음 D1 참조 검사와 DB trigger 거부 검증도 통과했다.

이어 `nihongo-n3-api` Worker version `b959a270-7b2a-46a3-83dc-615ed63f730d`와 Pages `main` production deployment `9d8e6460-2e86-477c-8eb8-fc4c41491f4c`를 반영했다. 배포 후 Worker smoke 7/7, auth proxy, legacy audio endpoint `410`, `https://nihongo-n3.pages.dev/` root `200`을 확인했다. rollback trigger는 smoke/auth 실패, API 오류율 상승, manifest/FK/R2 guard 불일치다. 데이터 이상 시 seed를 중지하고 위 backup으로 restore한다. Worker는 직전 `6e3aad0d-1584-44c5-a46a-f54b968ce606`으로 rollback하고, Pages는 직전 production `c93f86ba-5b0a-47af-bb30-28f38da4a6b1`을 dashboard에서 재승격한다. rollback 후 원격 verifier와 smoke를 재실행한다.

## 시계열 실행 프롬프트

아래 프롬프트는 위 순서대로 한 번에 하나씩 사용한다. 각 프롬프트는 기존 dirty worktree를 보존하고, 범위 밖 파일을 수정하지 말 것을 전제로 한다.

### Prompt 0 — 기준선 복구

~~~text
당신은 JLPT/TOPIK 모노레포의 릴리스 엔지니어입니다. 먼저 docs/00_overview/CURRENT_STATE.md,
docs/00_overview/EXECUTION_PLAN_2026-08-09.md, package.json을 읽으세요.

목표: 기존 작업 트리를 절대 reset/checkout하지 않고 새 노트북의 재현 가능한 로컬 기준선을 만드세요.

수행:
1) git status --short와 git diff --check를 기록하고 기존 변경을 사용자 소유로 보존하세요.
2) CI=true pnpm install --frozen-lockfile를 실행하세요.
3) pnpm --dir e2e exec playwright install chromium webkit를 실행하세요.
4) pnpm -F @nihongo-n3/db verify:fresh, pnpm -F @nihongo-n3/db test,
   pnpm typecheck, pnpm test, pnpm build를 순서대로 실행하세요.
5) 각 실패를 제품 결함, 환경 결함, 기존 변경 영향으로 분류해 재현 명령과 로그 경로를 보고하세요.

제약: 원격 D1/R2/배포에 접근하지 말고, 비밀값을 출력하지 말며, 실패를 우회하기 위해 테스트를 약화하지 마세요.
완료 조건: pass/fail 표와 변경하지 않은 파일 범위가 남아야 합니다.
~~~

### Prompt 1 — TOPIK FSRS와 Google 음성 E2E

~~~text
당신은 테스트 우선(full-stack) 엔지니어입니다. docs/00_overview/CURRENT_STATE.md와
docs/00_overview/EXECUTION_PLAN_2026-08-09.md의 E2E-01, E2E-02를 읽고,
apps/api/src/routes/topik-owner-curriculum.ts, apps/web/src/features/topik/curriculum/,
apps/web/src/pages/TopikReview.tsx, e2e/topik-owner-curriculum.spec.ts를 분석하세요.

목표: 실제 local D1에서 TOPIK owner item의 complete -> due -> rating과 Google 음성을
Chromium/WebKit으로 검증하세요.

수행:
1) 먼저 실패하는 E2E를 작성/수정하세요. 두 계정의 progress/FSRS 격리, complete의 idempotency,
   due 카드, good rating 뒤 due_at/review log/UI 갱신을 포함하세요.
2) audio_text_ko가 있는 item이 `kind: google` DTO와 Google Korean speech만 사용하고, R2나
   비-Google browser voice 경로를 호출하지 않는지 검증하세요. audio_text_ko가 없는 item의
   unavailable 사례도 유지하세요.
3) public practice/release 데이터나 원격 리소스를 변경하지 않는 deterministic fixture만 사용하세요.
4) Chromium과 WebKit을 명시적으로 실행하고, 실패하면 trace를 분석해 최소 범위로 고치세요.

제약: R2 또는 비-Google browser fallback을 추가하지 말고, 목록 API에 답/해설을 추가하지 마세요.
완료 조건: 두 브라우저에서 관련 E2E가 통과하고, 정책과 테스트의 문구가 일치해야 합니다.
~~~

### Prompt 2 — N2/N1 공개 계약과 CI

~~~text
당신은 테스트 인프라 엔지니어입니다. docs/ROADMAP.md, docs/00_overview/CURRENT_STATE.md,
e2e/n2-release-browse.spec.ts, e2e/playwright.config.ts, package.json, .github/workflows/를 읽으세요.

목표: 현재 콘텐츠 범위(N2 Batch 1~5, N1 Batch 1~4)와 공개 정책을 테스트로 명확히 하고,
원격 credential 없이 실행되는 CI 게이트를 만드세요.

수행:
1) N2 B4~5와 N1 B1~4가 실제 사용자 화면에서 공개되어야 하는지 API/route/문서 근거로 결정하세요.
   비공개라면 이유와 gate를 테스트에 명시하고, 공개라면 낡은 “N2 1~3만/N1 없음” 기대값을 바꾸세요.
2) Google 음성과 unavailable을 표면별 audio policy에 맞춰 E2E에서 확인하세요. R2 또는
   비-Google browser fallback이 호출되지 않는지도 확인하세요.
3) .github/workflows에 CI를 추가하세요. verify:ci와 Chromium/WebKit E2E를 실행하고 실패 시
   Playwright report/trace/screenshot을 artifact로 보관하세요.
4) playwright config의 workflow 주석, package description, 필요한 docs 링크를 실제 구현과 맞추세요.

제약: remote D1/R2, production deploy, secret을 사용하지 마세요. 기존 테스트를 삭제해 통과시키지 마세요.
완료 조건: workflow 파일이 실제 존재하고, 로컬과 CI의 검증 명령이 문서화되어야 합니다.
~~~

### Prompt 3 — N2 Batch 5

~~~text
당신은 JLPT N2 콘텐츠 엔지니어입니다. docs/00_overview/CURRICULUM_BLUEPRINT.md,
docs/05_n2/, packages/db/src/seed/n2-batch4.ts, packages/db/src/seed/self-authored-jlpt-batch.ts,
packages/db/src/seed/content-manifest.ts를 먼저 읽으세요.

목표: 사회·공공 서비스·의견 조정과 독해·청해 밀도를 다루는 자체 저작 N2 Batch 5를 추가하세요.

수행:
1) 공식 JLPT 문항/정답/지문/음원을 복제하지 않는 Markdown 원본을 작성하고, 분야별 row 분포와
   canonical row 목표를 명시하세요.
2) source asset, stable ref, audio binding, builder, CONTENT_PATHS, manifest entry, unit test를 함께 추가하세요.
3) 원본 hash, natural key, row count, FK, provenance를 확인하고 fresh local D1을 검증하세요.
4) browse/detail, grammar, reading, listening의 실제 도달 경로와 audio policy를 E2E로 확인하세요.
5) docs의 콘텐츠 감사, source map, 로드맵을 코드 결과에 맞춰 갱신하세요.

제약: source metadata나 외부 라이선스를 추측해 채우지 말고, R2 발음 asset을 생성·활성화하지 마세요.
완료 조건: 새 batch의 원본-코드-DB-UI-문서 계약이 한 변경 안에서 검증되어야 합니다.
~~~

### Prompt 4 — N1 Batch 4

~~~text
당신은 JLPT N1 콘텐츠와 데이터 모델 엔지니어입니다. docs/00_overview/CURRICULUM_BLUEPRINT.md,
docs/06_n1/, packages/db/src/seed/n1-batch3.ts, packages/db/src/seed/content-manifest.ts를 읽으세요.

목표: 학술적 주장·비평·정책/사회 현상·추상 관계를 다루는 자체 저작 N1 Batch 4를 추가하세요.

수행:
1) 원본의 학습 단위와 canonical row 분포를 명시하세요.
2) 공통 JLPT batch helper를 우선 재사용하고, source asset/stable ref/audio binding/manifest/test를 함께 구현하세요.
3) N1 공개 여부에 맞는 API/UI/E2E를 작성하세요.
4) historical n2_curriculum manifest label은 별도 ADR 전에는 의미를 바꾸지 말고, 새 코드에 N2 전용 가정을 추가하지 마세요.
5) fresh D1, DB tests, typecheck, 관련 E2E와 문서 동기화를 완료하세요.

제약: 사용자 학습 이력을 마이그레이션하거나 원격 데이터를 변경하지 마세요.
완료 조건: N1 Batch 4의 수량·출처·도달 경로가 모두 재현 가능해야 합니다.
~~~

### Prompt 5 — TOPIK Batch 4 이후

~~~text
당신은 TOPIK owner curriculum의 full-stack 엔지니어입니다. docs/00_overview/CURRICULUM_BLUEPRINT.md,
docs/07_topik/, packages/db/src/seed/topik-owner-curriculum-batch3.ts,
apps/api/src/routes/topik-owner-curriculum.ts를 읽으세요.

목표: TOPIK 1~6의 다음 owner-authored batch를 급수 대역별 확장 방향에 맞게 추가하고,
account progress와 FSRS review에 연결하세요.

수행:
1) 1~2급 생활·기초 문장, 3~4급 사회·직장 문맥, 5~6급 논증·쓰기·고급 독해의 방향으로
   vocab/grammar/reading/listening/writing 단위를 설계하세요.
2) owner curriculum 원본, source asset, stable unit/item ID, audio text/binding, builder, manifest, tests를 추가하세요.
3) complete -> due -> rating을 local D1과 Chromium/WebKit에서 검증하세요.
4) 답/해설이 list DTO에 노출되지 않는지와 account isolation을 회귀 테스트로 유지하세요.
5) 콘텐츠 감사, source map, roadmap을 실제 row count로 갱신하세요.

제약: practice bank, 공개 release lifecycle, 공식 TOPIK 문제를 owner curriculum에 섞지 마세요.
완료 조건: 새 item은 계정별 progress/FSRS와 오디오 정책에 정확히 연결되어야 합니다.
~~~

### Prompt 6 — JLPT manifest label ADR

~~~text
당신은 데이터 아키텍트입니다. docs/00_overview/CURRENT_STATE.md의 ARCH-01과
packages/db/src/seed/content-manifest.ts, packages/db/src/seed/verify.ts, manifest consumer를 읽으세요.

목표: N1이 n2_curriculum manifest label을 재사용하는 기술 부채에 대해 호환 가능한 결정을 내리세요.

수행:
1) label의 실제 소비자와 D1 storage schema를 목록화하세요.
2) 유지, 일반 jlpt_curriculum label 추가, storage 일반화 세 안의 호환성/rollback 비용을 ADR로 비교하세요.
3) 선택안을 구현한다면 manifest schema version, compatibility reader, verifier/tests/docs를 같은 변경에서 갱신하세요.
4) stable ref, source checksum, 기존 사용자 SRS/진행률을 변경하지 않는지 fresh D1으로 입증하세요.

제약: 이름만 일괄 치환하거나 사용자 데이터를 재작성하지 마세요.
완료 조건: 선택 근거와 rollback 경계가 문서와 테스트로 남아야 합니다.
~~~

### Prompt 7 — Google-only 발음과 R2 삭제

~~~text
당신은 발음 정책과 Cloudflare R2 정리 담당 엔지니어입니다.
docs/00_overview/CURRENT_STATE.md와 EXECUTION_PLAN_2026-08-09.md의 AUDIO-01을 먼저 읽으세요.

목표: 발음은 Google 음성만 사용하게 하고 R2 발음 저장·재생·생성·fallback을 제거하세요.

수행:
1) `nihongo-n3-audio`만 대상으로 원격 D1의 audio_r2_key와 audio_generation_log를 읽기 전용으로 집계하세요.
2) 정확히 확인된 `audio/` key만 삭제하고, 성공 후 legacy key와 generation log를 정리하세요.
3) `/audio/*`와 관리자 R2 생성 경로가 410으로 fail-closed인지, UI/DTO가 Google 또는 unavailable만 내보내는지 확인하세요.
4) 삭제 전후 key 수·실패 key·D1 참조 수·실행 시각을 기록하세요.

제약: report/evidence 등 다른 R2 버킷은 절대 삭제하지 말고, R2에 새 발음 객체를 생성하지 마세요.
완료 조건: 확인된 R2 발음 객체와 참조가 0이며 Google-only 테스트가 통과해야 합니다.
~~~

### Prompt 8 — 승인된 원격 릴리스

~~~text
당신은 Cloudflare D1/Workers 릴리스 엔지니어입니다. 사용자가 대상 환경·변경 범위·배포 권한을
명시적으로 승인한 경우에만 시작하세요. docs/00_overview/EXECUTION_PLAN_2026-08-09.md의 REMOTE-01과
packages/db의 backup/restore/blue-green 도구를 먼저 읽으세요.

목표: 검증된 콘텐츠와 migration을 원격에 안전하게 적용하고 관찰·rollback을 준비하세요.

수행:
1) 읽기 전용으로 migration ledger, remote manifest, content version, 그리고 발음용 R2가
   비활성·참조 0 상태인지 확인하세요. report/evidence 버킷은 별도 범위로 유지하세요.
2) local seed diff를 검토하고 backup과 restore drill을 성공시키세요.
3) preview/blue-green에서 migration/seed/remote verifier/smoke를 통과시킨 뒤 승인된 cutover만 수행하세요.
4) post-deploy 관찰, 알림, rollback trigger, 실제 환경·시간·content version을 기록하세요.

제약: 대상 DB를 추측하지 말고, backup/restore 증적 없이 원격 migration/seed/deploy를 실행하지 마세요.
완료 조건: 승인, backup, remote verifier, smoke, rollback 기준이 모두 기록되어야 합니다.
~~~

## 매 단계 공통 검증 명령

콘텐츠·DB·API·웹 변경 후에는 최소한 아래를 실행한다. 발음은 Google 음성만 허용하며,
R2 내구성 오디오 요건은 적용하지 않는다.

~~~sh
pnpm -F @nihongo-n3/db verify:fresh
pnpm -F @nihongo-n3/db test
pnpm typecheck
pnpm test
pnpm build
pnpm -F @nihongo-n3/e2e test:chromium
pnpm -F @nihongo-n3/e2e test:webkit
~~~

문서 변경 후에는 [문서 인덱스](../README.md)의 링크, 콘텐츠 감사의 수치, `content-manifest.ts`의 source count/expectedRows를 서로 다시 대조한다. 정책·수량·원격 상태 중 하나라도 근거 없이 바뀌면 해당 단계는 완료로 표시하지 않는다.
