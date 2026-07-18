# CODEX NEXT 프롬프트 시리즈 (R1 이후)

기준일: 2026-07-15 KST
기준 상태: branch `refactor/tech-debt-r1`, commit `5c25e9f`, production 미배포
대체 문서: `CODEX_REFACTORING_PROMPTS_2026-07-14.md` (W1~W6)는 본 문서로 대체됨. 원본은 `wip/n2-n1-content-2026-07-14` 브랜치에 보존.
교차검증 근거: [TECH_DEBT_2026-07-14.md](./TECH_DEBT_2026-07-14.md)(7/15 재검증판) · [ROADMAP](../ROADMAP.md) · [R1 Blue/Green Runbook](./R1_BLUE_GREEN_RUNBOOK_2026-07-15.md) · [B_ops_guide](./B_ops_guide.md) · [SESSION_CHANGELOG](./SESSION_CHANGELOG_2026-07-14.md) · 실제 코드(`packages/db/package.json` ops 스크립트, `content-manifest.ts`, `tracks.ts`, `App.tsx`)

## 0. 이전 W1~W6 완료 교차검증

R1 구현(136파일, +4,278/−1,131)과 이전 프롬프트를 대조한 결과다. "완료 판정 규칙"에 따라 코드 존재만으로 완료로 표기하지 않는다.

| 이전 | 주제 | 판정 | 근거 |
| --- | --- | --- | --- |
| W1 | N2/N1 파이프라인 검증 | **부분 완료·정책 변경** | 파서 헤더 버그 수정됨(`의미`/`뜻`/`한국어 뜻` 인식 + 빈 뜻 실패), manifest row/checksum·category 선행 seed 도입. 단 N2/N1 콘텐츠 자체는 `wip/n2-n1-content-2026-07-14`(commit `1ae2401`)로 격리 — provenance 미충족 시 seed 금지 정책 확립 (ROADMAP "N2/N1 정책") |
| W2 | 어휘 한국어 뜻 검수 | **미수행** | AUTO/EN 검수 대상 4,605건이 wip 브랜치에 그대로 있음 → N6로 이월 |
| W3 | 레벨 확장 UI | **미수행·순서 재조정** | N2/N1 콘텐츠 미출시 상태에서 UI 노출은 무의미. 콘텐츠 재통합(N6) 이후로 이동 |
| W4 | P0 부채 상환 | **대부분 구현/검증 완료** | TD-01(구현), TD-02~06·09(검증), TD-13·14 신규 식별. 남은 관문: prod-v2 Blue/Green, GitHub required checks, Backup 성공 |
| W5 | 화면 리팩토링·과정 분리 | **부분 완료** | TD-11(52주 기본+조건부 16주) 검증 완료, track 격리로 store/hook 다수 수정. Quiz/Review/Stats feature module 분리는 미수행 → N8로 이월 |
| W6 | 오디오·최종 게이트 | **정책·게이트 구현, 실행 미수행** | R2 read-only·immutable key·approval gate·30문장 QA 도구 구현. 배치 생성 미실행 — fresh DB 기준 `audio_r2_key` 4,954건 공백 → N4 |

## 진행 맵 (상환 우선순위 = TECH_DEBT §상환 우선순위 + ROADMAP 릴리스 순서)

| 단계 | 주제 | 선행 조건 | 대응 부채/릴리스 |
| --- | --- | --- | --- |
| N0 | GitHub billing·required checks 복구 | 없음 (사람 작업 + CODEX 확인) | TD-10 |
| N1 | R1 릴리스 증거 수집·PR 준비 | N0 | TD-14, R1 |
| N2 | prod-v2 Blue/Green 실행 지원 | N1 | TD-01, R1 |
| N3 | 관측성 운영 연결 (Logpush·alerts) | N2 | TD-13 |
| N4 | 오디오 30표본 QA·R2 배치 생성 | N1 (N2와 병행 가능) | TD-08, R2 |
| N5 | 콘텐츠 provenance·동음이의어 출시 | N4 | TD-07, R2 |
| N6 | N2/N1 콘텐츠 재통합 (wip 브랜치) | N1, N5 권장 | N2/N1 정책 |
| N7 | 레벨 확장 UI (N2/N1 노출) | N6 | 구 W3 |
| N8 | 화면 feature module 분리 | 없음 (병행 가능) | 구 W5 잔여 |
| N9 | TOPIK T1~T3 (계약·모델·최소 문제은행) | N2 | TD-12, R3 |

---

## N0 — GitHub billing·required checks 복구 확인

> 결제 정상화 자체는 사람(계정 소유자) 작업이다. CODEX는 복구 후 검증과 기록을 담당한다.

```text
당신은 nihongo-n3 모노레포의 릴리스 엔지니어다. GitHub 계정 billing lock이 해제된
직후 상태다. docs/00_overview/B_ops_guide.md §8과 docs/ROADMAP.md "공통 릴리스 관문"을 먼저 읽어라.

작업:
1. gh CLI 읽기 전용으로 Dependency Audit workflow의 `disabled_manually` 상태를 확인하고
   재활성화하라 (gh workflow enable).
2. branch `refactor/tech-debt-r1`(commit 5c25e9f)을 원격에 push하고, 같은 SHA에서
   Dependency Audit, CodeQL, Required Verification, E2E(Chromium/WebKit), Backup D1→R2를
   실행하라.
3. 각 run의 결론·URL·SHA를 표로 수집하라. billing annotation 실패(run 29348512843,
   29226573527 유형)와 코드 실패를 구분해 기록하라.
4. 전부 성공하면 TECH_DEBT_2026-07-14.md의 TD-10을 '검증 완료'로, TD-14를
   Backup run 증거와 함께 갱신하라. 하나라도 실패하면 부채 상태를 바꾸지 말고
   실패 원인을 SESSION_CHANGELOG에 추가하라.

금지: workflow 파일 수정으로 실패를 우회하는 것. 필수 check를 optional로 바꾸는 것.
production 배포·D1/R2 변경 (이 단계는 검증만).

DoD: 같은 SHA 5개 workflow 성공 링크 + 문서 2곳 갱신 커밋.
```

## N1 — R1 릴리스 증거 수집·PR 준비

```text
nihongo-n3 저장소에서 R1 릴리스 PR을 준비한다. N0의 required checks가 같은 SHA에서
성공한 상태여야 한다.

작업:
1. refactor/tech-debt-r1 → main PR을 생성하라. PR 본문에는 SESSION_CHANGELOG_2026-07-14.md
   §5 검증 기록 표와 N0의 원격 run 링크를 포함하라.
2. 로컬 최종 게이트를 재실행하고 출력 요약을 첨부하라 (B_ops_guide §7):
   pnpm audit --audit-level high && pnpm openapi:check && pnpm typecheck && pnpm test
   && pnpm build && pnpm -F @nihongo-n3/db verify:fresh
   && pnpm -F @nihongo-n3/e2e test:chromium && pnpm -F @nihongo-n3/e2e test:webkit
3. Backup 성공 산출물(테이블별 export, manifest SHA-256, restore drill 결과)을 확인하고
   pnpm -F @nihongo-n3/db d1:restore-drill 로컬 재현 결과를 기록하라 (TD-14 증거).
4. R1_BLUE_GREEN_RUNBOOK_2026-07-15.md "사전 조건" 6개 항목의 충족 여부 체크리스트를
   PR에 첨부하라 (Cloudflare secret 존재 확인은 이름만, 값 출력 금지).

금지: main으로 직접 push. squash 과정에서 migration 파일 순서·내용 변경.
verify:fresh:audio 실패(4,954건)를 이유로 verifier 최소값을 낮추는 것.

DoD: 체크리스트 완비된 PR + TD-14 '검증 완료' 갱신 (Backup 원격 성공 시).
```

## N2 — prod-v2 Blue/Green 실행 지원

```text
R1_BLUE_GREEN_RUNBOOK_2026-07-15.md 를 절차의 유일한 기준으로 삼아 prod-v2 전환을
지원한다. CODEX는 dry-run·검증·기록을 수행하고, --execute 단계와 Environment 승인은
반드시 사람이 GitHub UI에서 수행한다.

작업:
1. runbook 사전 조건 재확인 후, migration 적용을 준비하라:
   GitHub 'Content and D1 Change Control' 수동 실행 파라미터
   (operation=migrate, database=nihongo-n3-prod-v2, confirmation=APPLY)를 안내하고
   실행 후 d1_migrations 7/7 기록을 검증하라.
2. content phase dry-run 리포트를 생성·해석하라:
   pnpm -F @nihongo-n3/db d1:transfer -- --source=nihongo-n3-prod --target=nihongo-n3-prod-v2 --phase=content
   테이블별 row count·normalized checksum 차이를 표로 정리하고 이상 항목을 flag하라.
3. 사람 승인 후 실행되는 content/mutable phase 각각에 대해 전후 검증 JSON을
   .artifacts에 보존하고 FTS rebuild parity(vocab 3,300 / sentences 1,112 기준)를 확인하라.
4. preview Worker(prod-v2 binding) 스모크를 자동화하라: /health, /openapi.json,
   vocab/grammar/kanji/sentences 검색, register/login/logout/session refresh,
   Google OAuth redirect/callback/complete, admin 보호, SRS init/review/sync,
   read-only 503 + Retry-After.
5. binding 전환·30분 read-only·MAINTENANCE_MODE=off 재개까지 runbook 6장 확인 항목을
   체크리스트로 기록하라. 결과를 TECH_DEBT(TD-01, TD-02)와 SESSION_CHANGELOG에 반영하라.

금지 (runbook 금지사항 전문 준수):
- 기존 production d1_migrations에 이력 backfill
- 기존 migration SQL 수정
- seed-diff로 production 쓰기
- ALLOW_PRODUCTION_CHANGE / --execute / Environment 승인 생략
- 쓰기 재개 후 old DB로 단순 rollback

DoD: R1 완료 정의 6항목(ROADMAP) 전부 증거 포함 충족, old DB read-only 30일 보존 설정.
```

## N3 — 관측성 운영 연결 (TD-13)

```text
Workers의 PII 없는 JSON request log(요청 ID·release SHA·route template·latency)는
구현되어 있다. 운영 연결이 남았다. docs/00_overview/logpush-r2-setup.md 와
TECH_DEBT TD-13을 읽어라.

작업:
1. Logpush → R2 보존을 설정하고 (setup 스크립트 scripts/setup-logpush.mjs 검토·갱신),
   보존 기간과 접근 권한을 문서화하라.
2. 알림 3종을 Cloudflare에 구성하라: 5xx > 1%/5분, auth failure 급증 추세, D1 error > 0.
   알림 대상과 on-call 확인 절차를 B_ops_guide §9에 추가하라.
3. 배포 후 30분/24시간 체크리스트(B_ops_guide §9)를 스크립트화하라:
   /health·핵심 route 스모크와 release SHA별 5xx/latency 집계를 출력하는 도구.
4. route template 로깅이 path parameter를 노출하지 않는지 회귀 테스트로 고정하라
   (SESSION_CHANGELOG §6-9 재발 방지).

DoD: 알림 발화 테스트 1회(의도적 preview 5xx), Logpush object 확인, TD-13 '검증 완료' 갱신.
```

## N4 — 오디오 30표본 QA·R2 배치 생성 (TD-08)

```text
audio-tts-provider-policy-2026-07-07.md 와 ROADMAP R2 '남은 일' 7항목을 기준으로
오디오 부채를 상환한다. 공개 route는 R2 read-only이며 런타임 TTS 호출 금지가 원칙이다.

작업:
1. wrangler secret put GOOGLE_TTS_API_KEY / AUDIO_BATCH_APPROVAL_TOKEN 이 승인된
   환경에만 설정됐는지 확인 절차를 문서화하라 (값 출력 금지).
2. AudioQa 화면의 30문장 표본으로 Cloudflare/browser/Google/VOICEVOX를 동일 문장 평가하고
   평가자·device·voice/model·날짜를 청감표에 기록하라.
3. 승인된 provider로 admin queue dry-run → 사람 승인 → execute:true 배치를 레벨 단위
   (N5→N3)로 실행하라. content/provider/model/version hash immutable key 규칙을 준수하라.
4. R2 object metadata와 D1 audio_r2_key 정합을 검증하고 다음을 통과시켜라:
   pnpm -F @nihongo-n3/db verify:remote:audio  (누락 0)
5. 승인 키가 없는 문장에서 fabricated R2 경로 없이 browser Japanese fallback이 동작하는지
   Chromium/WebKit E2E로 확인하라 (legacy 404 회귀 방지, SESSION_CHANGELOG §6-7).

금지: 4,954건 공백을 숨기기 위한 verifier 최소값 하향. QA 승인 전 전체 배치 실행.
kana v2 스크립트 재변경 (문자。대표 단어 1회 재생 정책 유지).

DoD: verify:remote:audio 누락 0, 청감표 커밋, TD-08 '검증 완료' 갱신.
```

## N5 — 콘텐츠 provenance 강화·동음이의어 출시 (TD-07)

```text
manifest 기반 검증(소스별 row/checksum·FK·중복·필수값)은 구현되어 있다.
남은 것은 provenance QA와 보류된 동음이의어 콘텐츠다.

작업:
1. 13개 seed source 각각에 대해 원천·라이선스·검수자·최종 검토일을 기록하는
   provenance 필드를 content-manifest에 추가하고 검증 항목으로 편입하라.
2. docs/ATTRIBUTIONS.md 의 코드·콘텐츠·오디오·시각 자산 분리 체계와 manifest
   provenance가 상호 참조되도록 연결하라.
3. 동음이의어 출시 조건(ROADMAP)을 충족시켜라: 출처·악센트·예문 검수 30쌍 이상 작성,
   중복·FK 0건, UI와 public OpenAPI 동시 활성화 (현재 public spec에서 숨김 상태 해제).
4. seed 실행마다 content version·source checksum·parser version이 기록되는지 확인하고
   누락 시 보완하라.

DoD: manifest provenance 100%, homophone_pairs ≥ 30 검수 완료 + public route/spec 활성화,
TD-07 '검증 완료' 갱신.
```

## N6 — N2/N1 콘텐츠 재통합 (wip 브랜치)

```text
wip/n2-n1-content-2026-07-14 (commit 1ae2401)에 격리된 N2/N1 콘텐츠(한자 1,599 ·
어휘 4,605 · 문법 265)를 R1 파이프라인 기준으로 재통합한다.
ROADMAP 'N2/N1 정책'이 유일한 게이트 기준이다: 파일 존재 + provenance + 검수 완료
전에는 CONTENT_PATHS/manifest에 등록하지 않는다.

작업 순서 (반드시 이 순서):
1. wip 브랜치를 R1 기준으로 rebase하고, R1에서 변경된 파서 계약과 충돌을 해소하라:
   - 파서 옵션에 naturalKeys 전달 (소스 간 중복 차단)
   - 빈 뜻(ko) 실패 규칙 — N2/N1 어휘는 EN 원문이라도 뜻이 비어 있지 않아야 함
   - 이전 세션의 parse-*.ts 단순 widening diff는 R1 버전으로 대체
2. provenance를 확정하라: tanos(CC-BY)·KANJIDIC2/kanji-data(CC-BY-SA)·한자음 테이블의
   upstream commit/버전을 docs/ATTRIBUTIONS.md와 각 MD 헤더에 기록하라.
3. '검수:AUTO'(2,674건) 검증과 '검수:EN'(1,931건) 한국어 번역을 배치 200건 단위로
   완료하라. 태그 잔존 0이 등록 전제 조건이다. 일본어-한국어 한자어 의미 편차
   (割合→할합류 오변환)에 특히 주의하라.
4. 검수 완료 후에만: CONTENT_PATHS에 9개 경로 등록, content-manifest sourceCatalog와
   buildSeedDefinitions에 N2/N1 정의 추가 (expectedRows: 한자 367/1232,
   어휘 1905/2699, 문법 130/135), sources migration을 drizzle-v2 다음 번호로 추가.
5. pnpm -F @nihongo-n3/db seed:diff → verify:fresh → pnpm typecheck && pnpm test 통과.
6. 로컬 seed 후 레벨별 count를 보고하라. production seed는 별도 승인
   (Content and D1 Change Control workflow)으로만.

금지: 검수 태그 잔존 상태로 manifest 등록. 기존 migration 번호 수정.
wip 브랜치 문서(구 가이드·프롬프트)를 현행 문서 위에 덮어쓰기.

DoD: 검수 태그 0건, verify:fresh에서 N2/N1 포함 manifest 전체 PASS, E2E 회귀 0.
```

## N7 — 레벨 확장 UI (N2/N1 노출)

```text
N6 완료 후 apps/web에 N2/N1 레벨을 노출한다. track status API의 content_release가
'n5-n3'인 동안은 노출하지 않는다.

작업:
1. /api/v1/tracks/jlpt-ja/status 의 content_release 값에 'n5-n1' 단계를 추가하고
   서버가 실제 DB 레벨 분포로 판정하게 하라 (하드코딩 금지).
2. 'N5'|'N4'|'N3' 리터럴 하드코딩 인벤토리를 만들고 shared 단일 소스 파생으로 교체하라
   (level selector·필터·통계 축·i18n 키 포함, 순서 N5→N1).
3. 콘텐츠 0건 레벨의 empty state를 구현하라 ('준비 중' 카드).
4. user×track IndexedDB 캐시의 content version invalidation이 신규 레벨을 반영하는지
   확인하고, 52주 기본 과정과의 레벨 진행률 표현(누적 vs 레벨별)을 Home에서 재검토하라.
5. 퀴즈 출제 로직 N2/N1 unit test + N2 Browse E2E 스모크를 추가하라.

DoD: pnpm verify:ci + Chromium/WebKit E2E 통과, 하드코딩 인벤토리·교체 결과 표.
```

## N8 — 화면 feature module 분리 (병행 가능)

```text
Browse/CharacterTrainer/QuizListening/SelfCheck의 feature module 패턴(view/hook/logic/type)을
표준으로 Quiz, Review, Stats 3개 화면을 분리한다. R1의 track 격리 수정
(useDataScope, user×track namespace)을 보존해야 한다.

작업:
1. 화면당 별도 PR. 리팩토링 전 현재 동작을 스냅샷 unit test로 고정하라 (동작 변경 0).
2. 로직 추출 시 useDataScope/track namespace 의존을 hook 계층에 유지하라.
3. 시각 회귀 스냅샷 갱신이 필요하면 사유를 PR에 기록하라 (Chromium 전용 14개 시각
   테스트는 WebKit에서 의도적 제외 상태 유지).

DoD: 화면별 pnpm verify:ci + E2E 통과, 추출 모듈 목록과 diff 규모 보고.
```

## N9 — TOPIK T1~T3 (제품 계약·데이터 모델·최소 문제은행)

```text
TOPIK_PRODUCT_EXPANSION_PLAN_2026.md (7/15판)의 T1~T3을 실행한다. foundation
(LearningTrackId 'jlpt-ja'|'topik-ko', /tracks/:track/status, /track/topik-ko 화면,
user×track namespace)은 구현되어 있고 콘텐츠는 미출시다.

작업:
1. (T1) 대상 사용자·설명 언어(영어 기본 후보) 결정을 ADR로 기록하고, 트랙 전환 시
   서버 SRS/sync 정책과 privacy/retention 검토를 문서화하라.
2. (T2) track-aware content source·exam level schema를 설계하라. JLPT와 별도
   manifest/provenance를 갖는 migration을 drizzle-v2 다음 번호로 추가하라.
   서버 학습 table의 JLPT compatibility route 의존을 track-aware key로 확장하라.
3. (T3) placement test 검증용 최소 문제은행을 자체 저작하라. 정답·해설·난이도·출처
   이중 검수, 빈 뜻/정답/해설 0, duplicate/FK/manifest mismatch 0을 게이트로 하라.
4. account×track isolation E2E(e2e/learning-track-isolation.spec.ts)를 서버 데이터
   격리까지 확장하라.

금지: 공식 기출문항·음원 복제. R1/R2 운영 관문 통과 전 production branch에 문제은행 혼입.
출시 관문(플랜 §출시 관문) 미충족 상태의 사용자 노출.

DoD: T1 ADR + T2 migration/manifest + T3 검수 문제은행 + E2E 통과. 출시는 별도 수동 승인.
```

## 공통 운영 원칙 (모든 단계)

1. production 변경은 GitHub `production` Environment 수동 승인 + workflow_dispatch로만. 로컬 성공만으로 배포하지 않는다 (ROADMAP 공통 관문).
2. `--execute`, `ALLOW_PRODUCTION_CHANGE`, approval token이 필요한 명령은 CODEX가 직접 실행하지 않고 dry-run·검증·기록까지만 수행한다.
3. 부채 완료 판정은 TECH_DEBT "완료 판정 규칙"을 따른다 — 정적 관문 + 실행·데이터 관문 + remote 증거.
4. 각 단계 완료 시 TECH_DEBT 상태표·SESSION_CHANGELOG·status report를 같은 커밋에서 갱신한다.
5. 콘텐츠의 single source of truth는 docs/ MD + content manifest다. DB 직접 수정 금지.
