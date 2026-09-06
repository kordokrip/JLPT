# 매일 이어지는 개인 학습 경험

기준일: 2026-09-06 KST. 상태: 전용 Preview 검증 중. UX `94dfb05`는 최종 로컬 통합 gate 및 전체 E2E 통과 후 commit/push·Preview 배포했다. 실제 양언어 재생 종료·사용자 가청을 확인했다. 원격 시작 지연은 수정·재검증 중이며 Production 미반영이다.

## 승인된 제품 계약

- 휴대폰 중심, 기본 20분. 한국어 안내 JLPT N5–N1 / 일본어 안내 TOPIK 1–6급 모두 지원한다.
- 오늘 / 학습 / 문제 / 복습 / 기록의 공통 탐색. 기존 URL과 자유 학습을 보존한다.
- 예정 복습(5분) → 새 개념 이해·회상(7분, 최대 5개) → 문제 적용(6분) → 재확인·기록(2분). 시간은 권장치이며 중단·재개 가능하다.
- UI·해설·대상 언어는 분리하고 기존 명시적 설정을 보존한다.
- 해설 열람 ≠ 완료 ≠ 정답 ≠ 기억. 세션 최초 응답·재시도·FSRS 자기평가는 별도 기록한다. 개념/복습의 해설 열람(`revealed`)은 저장하지만 문제 힌트 사용량 계측은 아직 구현하지 않았다.
- 현재 공개 콘텐츠만 사용. Preview N2/N1/Batch 6 신규 공개, 기존 콘텐츠 재시드, 실제 사용자 기록 초기화는 하지 않는다.
- Google 우선 동일 언어 browser speech, ko-* / ja-*만 허용. R2 발음 전 경로 금지. 음성 코어의 첫 클릭 동기 호출 계약은 변경하지 않는다.

## 구현 순서와 계약

1. 기존 상태·문서·manifest 기준선 확인. INC-UX-036–INC-SRS-039 회귀 기록.
2. additive D1에 learning profile, study sessions/steps, annotations, 검수된 content links 추가.
3. 인증 계정×트랙 API: learning/profile, study/sessions, learning/records, learning/annotations. 서버 채점·중복 제출 방지·소유권 검증.
4. 공통 오늘/학습 지도/단계별 플레이어/기록을 연결. 기존 quiz·TOPIK·FSRS 계약과 서비스를 재사용.
5. 로컬 단위·API·fresh/upgrade·브라우저 → Preview → 실제 음성·사람 가청 → 승인·backup/rollback → Production.

## 데이터 원칙

- ref는 track + type + 원래 ID + version. 문자열 문제 ID를 정수 SRS 카드로 변환하지 않는다.
- 정적 문제 오답은 세션 기록으로 재연습하고, 검수된 개념 연결만 기존 FSRS에 안내한다.
- 선택·메모는 기기에 저장 가능하나 서버 채점 전 동기화 완료로 표시하지 않는다.
- 모든 학습 결과와 activity는 같은 batch로 기록하고 식별자로 중복 집계를 막는다.
- 과거 기록의 미수집 정보는 unknown으로 남긴다. 합격 확률·공식 쓰기 점수·장기 암기 성공을 추정하지 않는다.

## 검증과 인수인계

전 급수, 계정/트랙 격리, 초안 차단, strict-level, 정답 비노출, 중단/재개, idempotency, 실패 rollback, 기록 분모, 언어, 유형별 복습, Chromium/WebKit, PWA와 음성 gate를 검사한다. 실제 실행 결과와 미실행 release gate는 구현 종료 때 별도 기록한다.

## 현재 구현 상세

### 화면·언어

- Welcome의 한국어/日本語/English 선택은 명시적 사용자 설정으로 보존한다. 명시적 선택이 없는 신규 사용자에게만 JLPT→한국어, TOPIK→일본어를 제안한다. 설정 storage v7은 기존 명시적 영어 설정을 덮어쓰지 않는다.
- 오늘에서 계정×트랙 목표 급수, 해설 언어, 10/20/30분 권장량, IANA timezone을 저장한다. 기존 사용자도 서버 프로필이 없으면 한 번 설정한다. 기존 퀴즈 최고 급수를 학습 목표로 추정하지 않는다.
- 공통 다섯 메뉴와 계정 메뉴를 모바일·PC에 적용했다. 기존 browse/quiz/reading/review/stats/settings/curriculum/characters/self-check 및 TOPIK URL은 유지한다.
- TOPIK owner·foundation·practice 진입을 분리하고 owner/practice/foundation에서 한 항목/한 단원을 표시한다. 기존 `?section=...#topik-practice` 링크도 문제 풀이로 연결한다.
- TOPIK 조작 문구는 일본어에서도 표시된다. 기존 foundation의 영어 설명이나 기존 JLPT 한국어 뜻에 새 교육 번역·예문·연상 이미지를 생성한 것은 아니다. 새 교육 콘텐츠는 별도 독립 검수 후 추가한다.
- 간이 주간 완료율과 달력 경과를 학습 완료로 표현하던 부분을 제거했다. 기존 52주 계획은 자유 학습의 선택적 장기 계획으로 보존한다.

### 세션 흐름

`같은 급수의 due FSRS → 미학습 개념(최대 5) → 오답 재연습/같은 수준 문제 → 지연 재확인 → 기록`

- due가 많으면 신규 개념을 최대 2개로 줄이고 이유를 표시한다. 권장 20분은 강제 타이머가 아니다. 기록 시간은 화면이 보이는 동안 측정한 활동 시간이며 객관적인 집중 시간으로 해석하지 않는다.
- JLPT 기존 vocab/grammar/kanji/sentence와 TOPIK 공개 owner를 사용한다. 유형별 같은 숫자 ID를 혼동하지 않는다. 기존 sysprog 복습도 별도 adapter를 사용한다.
- 새 개념은 뜻 확인→가리기→자가 기억 평가→명시적 제출로 완료한다. 새로운 항목은 기존 FSRS 흐름의 new 카드로 등록되고, 예정 복습 단계의 rating은 실제 schedule/review log를 갱신한다. 새 개념 자기평가를 이미 실행한 FSRS 복습으로 집계하지 않는다.
- JLPT static/canonical 문제는 같은 급수에서만 생성한다. TOPIK practice는 시험 구조상 I(1–2)/II(3–6) 공통 문제이며 급수별 진단 또는 학습 개념 맞춤 문제라고 부르지 않는다.
- 미공개 bank/withdrawn owner는 세션 생성/재조회/제출에서 차단한다. 철회된 세션은 `410`으로 알리고 명시적 `abandoned` 종료 후 새 세션을 시작할 수 있다. 기존 결과 행은 삭제하지 않는다.
- 틀린 choice는 다른 미제출 항목이 남았을 때 꼬리의 retry 단계로 추가한다. 마지막 문제 오답은 다음 세션 재연습 후보가 된다. retry 정답은 최초 정답률·기존 quiz activity에 다시 더하지 않는다.
- 듣기 첫 응답 전 UI에서 대본·번역·정답을 숨긴다. 브라우저 TTS 때문에 일본어/한국어 text 자체는 API payload에 존재하므로 감독형 시험의 보안 모델이 아니다.
- 쓰기는 작성문, 자체 저작 sample/rubric을 비교한다. 공식 점수·합격 판정·추정 실력을 반환하지 않는다.

### DB·API 계약

`0028_learning_experience.sql`의 다섯 테이블은 기존 테이블을 대체하지 않는다.

| 테이블 | 키·주요 제약 |
| --- | --- |
| `learning_profiles` | 사용자×트랙 PK; 트랙/급수 CHECK; 해설 언어·하루 분량·timezone |
| `study_sessions` | UUID; 사용자×트랙×request ID unique; 열린 active/paused 세션 하나; completed/abandoned 보존 |
| `study_steps` | session×ordinal unique; public/solution JSON 분리; request ID claim trigger; phase·정오답·평가·활동 시간·제출 시각 |
| `learning_annotations` | 사용자×트랙×content/day×ref; revision CAS; 최대 1,000자 |
| `content_learning_links` | 문제 ref×개념 ref; SHA-256와 서로 다른 reviewer; draft/approved |

| API (`/api/v1` 기준) | 동작 |
| --- | --- |
| `GET/PUT /learning/profile` | 현재 인증 계정·트랙의 목표와 해설 언어 |
| `GET /study/sessions` | 현재 active/paused 세션 또는 null |
| `POST /study/sessions` | `{request_id: UUID}`로 생성/동일 요청 재사용 |
| `GET/PATCH /study/sessions/:id` | 소유권·트랙 확인 후 재조회, active/paused/completed/abandoned 전환; PATCH의 `current`는 현재 열린 세션 |
| `POST /study/sessions/:id/steps/:stepId/reveal` | 개념·복습 해설만 공개. 문제의 선행 reveal은 409 |
| `POST /study/sessions/:id/steps/:stepId/submit` | request ID, answer/rating, active_ms. 순서 검증·서버 채점·원자적 저장 |
| `GET /learning/records?window=7d\|30d` | 최초/재시도 분리, timezone별 날짜, 급수/영역, 세션 이력·다음 due |
| `GET/PUT /learning/annotations` | 개인 메모/날짜 일지, 충돌 시 409 |
| `GET /learning/content/:type/:id` | 기존 개념 카드의 유형별 데이터. 문제 정답 조회용이 아님 |
| `GET /quiz/attempts/:id` | 완료된 자기 JLPT attempt만 조회; 소유권 없는 route state는 사용하지 않음 |

기존 quiz/TOPIK/SRS/activity/daily_logs 요청·응답은 유지한다. 내부 HTTP 재호출 없이 `learning-effects.ts`를 공유한다. 첫 단계 claim, progress/card/review log, activity, 세션 완료는 D1 batch로 처리하며 실패 시 부분 성공으로 응답하지 않는다. TOPIK 완료/복습은 기존 deterministic event ID를 재사용하고 새 세션 event를 중복 생성하지 않는다.

새 learning/study 클라이언트는 모든 요청에 선택적 `expected_track` query를 넣는다. 다른 기기가 계정의 트랙을 바꿨으면 읽기/쓰기 전에 409로 거부하고 명시적인 새로고침을 안내한다. 파라미터가 없는 기존 클라이언트 계약은 유지한다. 날짜 메모를 다른 트랙으로 조용히 저장하거나 트랙이 다른 응답을 같은 query key에 넣지 않는다.

완료/종료 세션은 SQL UPDATE 시점에도 terminal guard를 적용한다. 단계 claim trigger가 같은 transaction 안에서 부모 세션의 open 상태를 확인하므로, 선행 조회 뒤 다른 기기가 종료해도 progress/FSRS/activity가 일부 저장되지 않는다.

콘텐츠 ref는 URI-encoded `track:type:original-id:version`이다. canonical/owner는 읽은 원행 hash, 정적 bank는 bank version을 사용한다. 문제의 문자열 ID를 숫자 FSRS ID로 변환하지 않는다. `content_learning_links`에는 이번에 approved 링크를 넣지 않았으므로 개념 맞춤 출제를 주장하지 않는다.

### 오프라인·기록

- 계정×트랙 key로 세션 snapshot, 진행 위치, 답 초안과 재전송 ID를 localStorage에 보존한다. 기존 Dexie activity queue는 그대로 유지한다.
- 서버 응답 전에는 `동기화 대기 · 아직 완료되지 않음`이며 온라인 복귀 시 같은 ID로 전송한다. localStorage 실패는 명시적으로 알린다. 전체 앱 최초 방문 또는 캐시되지 않은 새 문제의 완전 오프라인 실행을 보장하지 않는다.
- 메모는 기기 저장/서버 저장을 구분한다. 저장 중 추가 입력은 늦은 응답으로 삭제하지 않는다. 다른 기기 충돌 시 서버 내용을 먼저 보여주고 사용자 초안을 보존한 채 명시적으로 다시 저장한다.
- 다른 기기가 같은 단계를 먼저 제출한 409는 최신 서버 결과를 조회해 처리한다. 미수락 로컬 답/평가는 별도 기기 초안으로 보존하고, 학습자가 확인한 뒤에만 pending을 해제한다. 500/오프라인/트랙 불일치를 제출 성공으로 바꾸지 않는다.
- records의 안내 세션 통계와 자유 학습을 포함한 activity 합계는 별도 표시한다. 둘을 더하지 않는다. 기존 기록에 없는 최초/재시도·힌트·집중 여부를 역산하지 않는다.
- 기록의 `최초 응답`은 안내 세션의 `practice` 단계 제출이며 같은 세션의 `retry`와 구분한다. 평생 처음 접한 고유 문항 수가 아니다. 과거 정답 문항도 이후 세션에 다시 출제될 수 있다.
- 현재 완료/중단/재시도와 시각은 저장되지만 홈 진입부터 시작까지 시간, 재개 성공률, 장기 기억 유지율은 완성된 지표가 아니다. 사후 계측 정의와 검증이 남아 있다.

## 릴리스·복귀 실행 순서

1. 최종 로컬 source의 전체 gate와 문서 검사, fresh/upgrade, Chromium/WebKit 기능·시각 검증을 고정한다. 작업 중 HMR이 발생한 실행을 최종 후보 증거로 사용하지 않는다.
2. clean commit/source를 고정한 뒤 전용 Preview에 `0028`만 additive 적용하고 호환 Worker/Pages를 검증한다. 콘텐츠를 재시드하거나 기존 Preview 160개를 Production에 공개하지 않는다.
3. 같은 후보의 실제 Chrome ko/ja 첫 클릭·반복·중단·오류 lifecycle, 사람이 들었다는 확인, PWA 새 asset 활성화를 분리해 기록한다.
4. Production 현재 세션 승인, D1 backup/restore drill, immutable content manifest, Worker/Pages rollback ID를 확보한다. `INC-DATA-024`는 release-pinned verifier로 검사하며 HEAD source에 맞추려고 재시드하지 않는다.
5. `0028 → 호환 Worker → Pages` 순서로 활성화하고 학습·auth·음성·기록 smoke를 재실행한다. 실패 시 이전 Worker/Pages를 사용하고 데이터 손상이 없는 한 D1 전체를 복원하지 않는다.
6. `VITE_LEARNING_EXPERIENCE=false`는 이전 홈/탐색을 빌드하는 화면 복귀 옵션이다. 메모·세션 행 삭제나 전체 backend rollback을 수행하지 않는다.

## 2026-09-06 검증 기록

- 출발 HEAD `cb064e19dd3645076c7f17f7e82deddaee5ae4cc`; branch `feature/topik-product-expansion`. 아래 초기/교차검토 결과는 시계열 증거이며 최신 Preview 결과는 마지막 절을 기준으로 한다.
- DB upgrade: Node SQLite로 0000–0027 기존 테이블 전후 비교, FK, daily_logs/SRS 보존·새 CHECK·중복 claim rollback 통과.
- fresh D1: `0000–0028`, FK/FTS/manifest/출처·콘텐츠 품질·release contract/control-plane 통과. 최종 통합 gate artifact `/var/folders/5z/xfvw93_d0pn3v7b13f_wn3dm0000gn/T/nihongo-n3-db-verify-RUIj0U/artifacts`. 로컬 manifest `content-v3-d091a7c5a9a6f17d7078`는 운영 manifest 대체물이 아니다.
- 새 흐름 초기 영향 E2E는 `56 passed / 2 skipped`였다. 이후 전체 실행에서 과거 홈·더보기·해설 즉시 완료 locator와 영어 fixture 설정 저장 대기를 갱신했다. 이 초기 결과를 최종 변경의 전체 통과로 쓰지 않는다.
- 문서 링크·lifecycle 및 `git diff --check`는 최종 문서 동기화 후 다시 실행해 기록한다.
- 원격 read-only: `48 passed / 2 warnings / 3 failed`. dirty tree/manifest warnings; TOPIK status/CSP 미배포 실패, R2 전수 D1 조회는 Cloudflare `7403`으로 미완료. Production 내용 수정은 하지 않았다.
- 06:44 UTC 독립 재검사에서 같은 `verify:remote:audio:r2` 명령은 설정·인증 변경 없이 exit 0, 9개 표면 모두 0이었다. 앞선 전체 실패 기록은 유지하며 전체 상태 수치를 추정해 바꾸지 않는다. `INC-OPS-041`은 원인 미확정 단발 실패·재발 관찰 상태다. 후속 증거: `.artifacts/operations/remote-r2-recovery-2026-09-06.json`.
- 최초 실제 Chrome 로컬 URL 접근은 저장된 브라우저 설정으로 차단되어 `INC-QA-040`에 기록했다. 제한은 우회하지 않았으며 이후 새 원격 Preview에서 별도 실제 재생·가청 증거를 확보했다(아래 최신 절).
- 최종 명령 결과와 browser pass/skip/fail은 아래 후보 결과에 기록한다.

### 교차검토 전 후보 결과 (아래 수정의 최종 통과 증거가 아님)

| 검사 | 실제 결과 | 근거/범위 |
| --- | --- | --- |
| `pnpm ops:verify` | exit 0 | Ops 24, DB 115, Web 97, API 152 통과; OpenAPI public 81/admin 12, typecheck, build, fresh D1 0000–0028 |
| 최종 Web 영향 재검증 | exit 0 | 통합 gate 이후 조작 안내/링크 수정에 대해 typecheck, Web 97개, build 재실행 |
| 화면 복귀 빌드 | false/true 각각 exit 0 | `VITE_LEARNING_EXPERIENCE=false` 확인 후 true 빌드 복구; 원격 반영 없음 |
| 최종 전체 Playwright | exit 0, **203 passed / 32 skipped / 0 failed** | Chromium/WebKit + 두 mobile project; 소스 편집 없이 전체 235건 실행 |
| 시각 검증 | Chromium 30개 baseline 비교 통과 | 다섯 메뉴 변경의 PNG 갱신 후 별도 전체 실행에서 재비교. WebKit screenshot 30건은 기존 Chromium-only 정책으로 제외 |
| 실제 음성 | 미확인 | 자동 speech fixture 성공은 실제 Chrome lifecycle/사람의 청취 증거가 아님 |
| 원격 및 출시 | 차단/미실행 | remote 3 fail, 새 Preview·backup/restore·Production·commit/push 없음 |

최종 전체 브라우저 실행은 격리된 로컬 D1을 사용했다. 자동 음성 fixture, 로컬 전용 콘텐츠 fixture와 원격 실사용 검증은 다르다. 기존 조건부 skip 2건도 통과 수에 더하지 않는다. 모바일 Welcome/Today/TOPIK owner, 태블릿 Today, 일본어 계정 메뉴의 실제 생성 screenshot을 직접 열어 확인했으며 30개 모두를 사람이 가청·화면 검증했다는 뜻은 아니다.

로그는 `.artifacts/operations/learning-experience-2026-09-06-final-gate.log`, `learning-experience-2026-09-06-final-build.log`, `learning-experience-2026-09-06-flag-off-build.log`, `learning-experience-2026-09-06-flag-on-build.log`, `learning-experience-2026-09-06-all-e2e.log`에 보존한다. 원격 실패 원문은 `.artifacts/operations/history/2026-09-06T06-09-30-833Z.json`이다. 이 로그와 실제 사용자 데이터는 Git에 올리지 않는다.

### 별도 Agent 교차검토 및 후속 후보

- `INC-LEARN-043`: 미수락 pending 409 복구. Web 회귀가 수정 전 1 fail/1 pass였고 서버 수락 확인·로컬 초안 보존 후 통과했다.
- `INC-DATA-044`: 동시 완료 후 stale pause/active와 동시 abandoned 후 submit 세 경우를 실제 격리 D1에서 모두 실패로 재현했다. SQL terminal guard·claim trigger 수정 뒤 세 경우가 통과했다.
- `INC-DATA-046`: 양방향 계정 트랙 변경 뒤 날짜 메모 오저장 두 경우를 실패로 재현했다. expected_track guard와 localized reload 안내·메모 보존으로 수정했다.
- `INC-OPS-045`: 중첩 Cloudflare account 식별자가 진단 로그에 남는 회귀를 재현하고 가림 처리를 보강했다. Ops 26개 통과. 오류 코드와 원본 실패 증거는 유지한다.
- 후속 전체 gate: `.artifacts/operations/learning-experience-2026-09-06-reviewed-gate.log`는 Ops 26 / DB 115 / Web 106 / API 157 및 fresh D1까지 exit 0이었다. 이는 이후 backup profile 보강 전 결과다.
- 최종 UI/API 전체 Playwright: `.artifacts/operations/learning-experience-2026-09-06-final-reviewed-e2e.log`, **207 passed / 32 skipped / 0 failed**, exit 0. 새 기기 충돌/트랙 변경 두 시나리오를 양 엔진에 추가한 239건이다. 중간 실행은 테스트가 navigation 완료 전에 session ID를 읽어 두 건 실패했고, URL 전환·응답 상태를 기다리도록 고친 뒤 전체를 다시 실행했다. 중간 실패 로그(`learning-experience-2026-09-06-reviewed-e2e.log`)도 보존한다.
- `INC-DATA-047`: 실제 저장된 65-table 백업의 로컬 restore는 첫 실행에서 중단됐다. Node SQLite에는 없는 Miniflare 생성 테이블 `_cf_METADATA` 때문에 허용 목록 비교가 실패했으며, 모든 앱 테이블이 존재함을 실제 schema metadata로 확인했다. 정확히 이 시스템 테이블만 제외했고 실제 restore 재실행은 exit 0이었다. 알 수 없는 앱 테이블은 계속 실패시킨다.
- 실제 legacy restore: `.artifacts/operations/learning-experience-2026-09-06-legacy-restore-final.json`, `passed=true`, profile `0027`, local profile `0028`, 65개 행 수·FTS 일치, FK 0, trigger 56개 재설치. 새 5개 테이블은 모두 0행이며 `coversLocalSchema=false`다. 2026-08-24에 저장한 과거 backup의 upgrade 호환 검증이지 새 Production predeploy backup은 아니다. 첫 실패 로그도 보존한다.
- backup 프로필/manifest/path 대상 테스트 15개는 두 schema의 보존, FK 순서, 누락/중복/부분/알 수 없는 테이블 및 안전하지 않은 파일명 차단을 포함한다. 현재 `d1:backup`/`d1:restore-drill`만 0028을 지원하도록 확장했다. 다른 blue/green transfer·사용자 정리 도구는 기존 65-table 기본 계약이므로 0028 환경에서 사용하지 않는다.

### Preview 준비 기준선 (아직 배포 결과 아님)

- 전용 D1 `nihongo-n3-topik-preview`: migration 28개(`0000–0027`), FK 0. N1/N2 각 60·N3 120 및 TOPIK practice v2 300은 기존 Preview 공개 상태이며 재시드하지 않는다.
- 이전 활성 Worker `0d17ba30-b7ea-4879-9e99-e9c3a7ebb8ee`, deployment `940565dc-9e54-4d31-807a-a602758b8a9a`.
- 같은 feature branch 이전 Pages `885aae1f-d308-4453-b3c6-881999410ec0`, source prefix `d26e9e6`. Preview `API_ORIGIN`은 전용 `nihongo-n3-api-topik-preview.kordokrip.workers.dev`를 가리킨다.
- read-only D1 Time Travel bookmark는 `.artifacts/operations/learning-experience-2026-09-06-preview-bookmark.json`에 보존한다. 이 값은 Production backup이 아니며 영구 보존 backup으로 간주하지 않는다.

### 최종 고정 후보 — backup·음성 진단 포함

- `VITE_LEARNING_EXPERIENCE=false` 화면 복귀 빌드: exit 0. 이어 `VITE_LEARNING_EXPERIENCE=true pnpm ops:verify`: exit 0. Ops **26**, DB **126**, Web **39파일/113**, API **8파일/157** 통과. OpenAPI **81/12**, typecheck, Web/Worker build, fresh D1 `0000–0028`, FK/FTS/manifest/출처/품질/control-plane까지 통과했다.
- 로그: `.artifacts/operations/learning-experience-2026-09-06-release-flag-off.log`, `learning-experience-2026-09-06-release-gate.log`. 최종 fresh artifact: `/var/folders/5z/xfvw93_d0pn3v7b13f_wn3dm0000gn/T/nihongo-n3-db-verify-BssrSG/artifacts`.
- `INC-QA-048`: `/audio-qa`는 기존 onend 성공 Promise 이후만 언어별 정상 종료 수를 올린다. 실패/중단/언어 변경의 늦은 응답을 별도 처리하며 클릭 당시 음성 수를 읽기 전용으로 표시한다. 선택 voice 브랜드나 물리 가청을 추정하지 않는다. 음성 코어·저장·R2 계약은 바꾸지 않았다. mock Promise 단위 7개는 수정 전 실패, 수정 후 통과했다.
- 위 코드 고정 후 마지막 전체 E2E는 `.artifacts/operations/learning-experience-2026-09-06-release-e2e.log`, **207 passed / 32 skipped / 0 failed**, exit 0이다. 진단 화면 완료 표시를 포함해 전체 239건을 다시 실행했다. 제외 32건은 통과에 더하지 않는다.
- 최종 문서 검사는 64개 Markdown/81개 상대 링크, lifecycle 9개 active/4개 retired/36개 DB source 참조를 통과했다. `git diff --check` exit 0. 로컬 운영 상태는 39 pass/2 known warnings/0 fail(미커밋 후보, manifest drift)이다.

### 원격 Preview 배포와 실제 확인

- Git source `94dfb052c5ff73caaa70692f1d023bdaae439c8f` commit/push 완료. GitHub Actions는 비활성이고 Pages Git Provider도 연결되지 않아 push로 Production이 바뀌지 않는다.
- 전용 Preview D1 `nihongo-n3-topik-preview`에 migration0028만 적용했다. 29개 migration 및 schema0028/70-table profile, FK 0을 확인했다. 콘텐츠·공개 상태·release 상태·quality link 집계는 적용 전후 동일하다. 신규 콘텐츠 seed/publication은 하지 않았다.
- Worker `1fec0907-914d-4a82-9e87-92dcf6beb723`, Pages `a95437fc-8411-4151-9519-ab0d8fb92905`; 두 source는 `94dfb05`다. Preview Pages API proxy는 전용 Preview Worker로 향한다. Worker smoke **21 pass / 0 fail / 관리자 positive 검사 1개 미실행**이다.
- 실제 Chrome에서 새 `https://a95437fc.nihongo-n3.pages.dev/audio-qa`를 직접 조작해 일본어/한국어 정상 종료 각각 1회를 확인했다. 클릭 시 음성 목록은 각각 10개였으며 이는 실제 선택 voice 브랜드의 증거가 아니다. 사용자가 **“두 언어 모두 들렸습니다”**라고 확인했다. 음성 코어와 Pages source를 고정해 이 증거와 연결한다.
- 실제 Chrome warn/error 로그는 0건이었다. 전체 network capture는 확보하지 않았으므로 실제 Chrome의 R2/legacy 요청 수는 미관측이다. 로컬/원격 자동 E2E의 mock 음성 요청 0 계약은 별도로 기록하며 사람 청취나 실제 Chrome network 결과로 바꾸지 않는다.
- Preview 76건 E2E는 새 세션 navigation의 5초 기준을 반복 초과해 **exit130으로 중단**했다. 합성 QA 계정의 실제 N5/20분 create는 200/7,312ms, current GET은 200/2,118ms였다. `INC-PERF-049`로 API-only 수정·재측정을 진행하며 이 실행은 통과가 아니다. timeout을 확대하지 않는다.
- 위 실행의 artifact prefix는 `.artifacts/operations/learning-experience-2026-09-06-preview-`이며 `migration.log`, `worker-deploy.log`, `pages-deploy.log`, `worker-smoke.json`, `content-baseline.json`, `db-after.json`, `e2e.log`에 증거를 보존했다. 합성 사용자 식별자도 Git 문서에는 기록하지 않는다.
- 최종 Production read-only 재확인은 **49 pass / 2 warnings / 2 fail**, exit1이다(`learning-experience-2026-09-06-production-readonly.log`). 실패는 미배포 TOPIK status/CSP이며 R2 7403 조회 실패는 재발하지 않았다. Production Worker/Pages/D1 기준선은 유지한다. 새 Production 승인·backup/restore·predeploy gate는 미완료다.

### 원격 시작 지연 후속 후보

- `INC-PERF-049`의 API-only 변경은 canonical full-row hash를 유지한 read batch, 선택하지 않을 문제의 hydrate 제거, 독립 mode 조회, 세션 공개 상태 batch 검사다. 생성 ≤18회/재개 ≤5회 D1 왕복 예산을 회귀 테스트로 고정한다.
- 별도 reviewer가 두 namespace 경계를 발견했다. `id='a:b', version='c'`와 `id='a', version='b:c'`의 문자열 키 충돌 및 static 문자열 ID/canonical 숫자 ID 혼합이다. `perf-regressions-before.log`에서 정확한 3개 fail을 재현했고 tuple key/type guard 뒤 routes114개를 통과했다. 회귀 mock과 실제 DB/실사용 검증은 구분한다.
- `learning-experience-2026-09-06-perf-full-gate.log`: Ops **26**, DB **126**, Web **113**, API **162**, OpenAPI81/12, typecheck/build/fresh0028·FK/FTS/품질·control-plane **exit0**. fresh artifact는 `/var/folders/5z/xfvw93_d0pn3v7b13f_wn3dm0000gn/T/nihongo-n3-db-verify-t3fIa6/artifacts`다. 첫 추가 fixture는 configured 필드 누락으로 typecheck 실패했고 수정 후 이 통합 gate를 다시 통과했다.
- Pages 코드는 바꾸지 않았으며 실제 가청이 확인된 `a95437fc`/`94dfb05`를 유지한다. Worker 수정 후보의 로컬 브라우저·원격 실측은 별도 실행 결과가 있어야 완료로 기록한다.
- 동일한 합성 QA 측정 스크립트를 기존 Preview에서 08:10 UTC에 재실행한 단일 표본은 N5 create/current **2,514/1,075ms**, TOPIK1 **1,573/1,592ms**였다(`preview-performance-before.json`). 최초 N5 7,312/2,118ms와 차이가 있으므로 단일 최악 값만으로 개선율이나 p95를 계산하지 않는다. 첫 측정 스크립트는 GET 경로를 잘못 `/study/sessions/current`로 지정해 404였으며 실제 계약 `/study/sessions`로 바로잡은 위 실행만 성능 비교에 사용한다.
- API 성능·namespace 수정 후 전체 로컬 브라우저 재검증은 **207 passed / 32 skipped / 0 failed**, exit0/3.6분이다(`learning-experience-2026-09-06-perf-local-e2e.log`). 테스트의 navigation 시간 기준과 Pages 코드는 바꾸지 않았다. 소스 검토·회귀·전체 gate를 통과한 Worker만 Preview에 갱신하며 Production에는 적용하지 않는다.

참고 패턴: [뇌새김](https://www.brain-study.co.kr/wm/bbs/board.php?bo_table=notice&wr_id=2053)의 연상·암기장, [WaniKani](https://www.wanikani.com/)의 개념 연결·SRS, [Duolingo](https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo/)의 짧은 학습 경로, [TEUIDA](https://www.teuida.net/en/learn/korean)의 상황별 학습. 광고상의 효과를 본 제품의 검증된 학습 효과로 인용하지 않는다.
