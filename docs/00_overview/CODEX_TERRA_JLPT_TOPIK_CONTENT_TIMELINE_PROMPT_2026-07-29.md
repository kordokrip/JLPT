# Codex 5.6 Terra 실행 프롬프트 — 개인용 JLPT·TOPIK 콘텐츠 확장

> 작성일: 2026-07-29 (KST)
> 목적: N2 실콘텐츠를 즉시 시작하여 N1, TOPIK 1~6까지 실제 PWA 학습 경로로 완성한다.
> 적용 범위: 로컬 코드·콘텐츠·검증을 우선한다. 원격 D1/R2/Workers AI 호출과 배포는 해당 단계의 명시 승인 뒤에만 한다.

## 이 문서를 사용하는 방법

아래의 **실행 프롬프트 전체**를 Codex 5.6 Terra에게 그대로 전달한다. Terra는 한 번에 모든 원격 작업을 실행하지 않는다. 각 단계에서 실제 결과와 다음 단계에 필요한 승인만 간결히 보고하고, 명시된 승인값이 없으면 로컬 작업까지만 진행한다.

이 문서는 이전의 release gate, 공개 서비스 승인, Preview Google OAuth, 사람 검수자 구성 문제를 해결하려는 문서가 아니다. 이 앱은 개인 학습용이다. 따라서 콘텐츠 품질·저작권·실제 학습 경로에 집중하며, 사람 검수자·공개 발행·OAuth 변경을 완료 조건으로 만들지 않는다.

---

## 실행 프롬프트 시작

당신은 Codex 5.6 Terra다. `/Users/sungho-kang/Desktop/JLPT`의 일본어·한국어 학습 PWA를 분석하고 구현한다.

### 1. 최우선 목적과 작업 원칙

최우선 목적은 다음 순서이며, 부수적인 릴리스 절차나 인증 인프라 문제로 이 목적을 바꾸거나 지연시키지 마라.

1. **JLPT N2 실학습 콘텐츠**(어휘·문법·한자·예문·독해·청해)를 데이터베이스 학습 테이블에 넣고, 실제 PWA에서 학습 가능하게 만든다.
2. 같은 구조로 **JLPT N1**을 완성해 N5~N1을 모두 학습 가능하게 만든다.
3. **TOPIK 1~6급**의 자체 저작 학습 콘텐츠를 데이터베이스 학습 테이블에 넣고, 실제 PWA에서 급수별로 학습 가능하게 만든다.
4. 정상 학습 화면의 발음은 웹 음성합성에 의존하지 않고, 라이선스가 확인된 웹 음원 또는 Cloudflare Workers AI TTS로 생성하여 R2 기반 오디오로 통일한다.

이 서비스는 개인용·비상업용이다. 그러나 다음은 반드시 지켜라.

- 공식 JLPT/TOPIK 기출 문항, 정답, 지문, 음원 또는 이를 변형한 콘텐츠를 복사·다운로드·삽입하지 않는다.
- 학습용 설명, 예문, 독해, 청해 대본, 문제, 선택지와 해설은 자체 저작한다.
- 외부 어휘·표기·사전 정보는 라이선스, 출처 URL, 취득 시각, attribution 조건을 기록할 수 있는 경우만 사용한다.
- 개인용이라는 이유로 라이선스·출처·개인정보·secret 보호 원칙을 생략하지 않는다.
- 기존의 대규모 미커밋 변경은 사용자의 작업이다. `git reset`, `git checkout --`, stash, 대량 삭제, 기존 local D1 삭제를 하지 않는다.
- 기존 immutable v1/v3 release artifact는 수정하거나 재사용하여 상태를 덮어쓰지 않는다. 이 작업의 성공 기준은 개인용 콘텐츠 기능이며, 과거 release gate 통과가 아니다.

### 2. 이 작업에서 하지 않을 일

다음은 현재 목적과 무관하므로, 콘텐츠 작업을 막지 않는 한 건드리지 말고 완료 조건으로 삼지 마라.

- reviewer/author sign-off, 공개 release gate, G0~G5, production publish 승인 절차
- Preview Google OAuth 활성화, 관리자 bootstrap, 사용자 생성·삭제·수정
- Cloudflare secret 값을 출력·저장소 기록·로그 기록·채팅 입력으로 요구
- unrelated Pages/Worker 배포, Cloudflare 제품 신규 구독, AI 기능 확장
- official test material 수집이나 원문 복제

원격 작업 승인 또는 콘텐츠 라이선스가 부족하면, 그 작업만 보류한다. 대신 자체 저작 콘텐츠·스키마·로컬 검증·PWA 구현을 계속한다.

### 3. 현재 상태를 먼저 재확인할 것

먼저 읽기 전용으로 아래 파일과 현재 `git status --short`, `git diff --check`, 관련 `package.json` scripts를 조사한다. 아래 상태는 2026-07-29의 기준 정보이며, 코드와 충돌하면 **현재 코드가 진실**이다. 차이가 있으면 문서 끝의 실행 기록에 차이를 남기고 안전하게 계획을 갱신한다.

| 영역 | 현재 확인된 상태 | 구현상 의미 |
| --- | --- | --- |
| 기본 JLPT seed | `packages/db/src/seed/content-manifest.ts`와 `constants.ts`는 운영 seed가 N5~N3 중심이다. | N2/N1 fixture가 있어도 `seed:local`/운영 manifest에 자동 포함되지 않는다. |
| 레벨 release 모델 | `packages/shared/src/jlpt-levels.ts`에는 `foundation-only`, `n5-n3`, `n5-n1`만 있다. | N2만 준비된 기간을 정확히 보이려면 `n5-n2` 상태를 설계·구현해야 한다. |
| N2 fixture | `docs/05_n2/01_self_authored_local_fixture.md`, `n2-local-fixture.ts`에 N2 자체 저작 최소 slice가 있다. | 이는 시작점이며, 단순 fixture/E2E mock을 "N2 완성"으로 보고하지 않는다. |
| N3 보존 | `0018_preserve_existing_jlpt_levels.sql`은 기존 N5~N3 한자의 레벨 변경을 막고, `対`를 N3 prerequisite로 참조한다. | N2 콘텐츠를 넣어도 기존 N3 데이터를 N2로 재분류하면 안 된다. |
| 콘텐츠·오디오 계약 | `0017_content_source_audio_and_owner_curriculum.sql`은 source asset, stable ref, R2 audio binding, TOPIK owner-authored unit/item을 추가한다. | 콘텐츠 및 오디오 provenance를 이 계약에 맞춰 저장·검증한다. |
| TOPIK UI/API | `topik-owner-curriculum.ts`, `TopikOwnerAuthoredCurriculum.tsx`와 grade-1 local fixture가 있다. | 1급 2 item fixture를 전체 TOPIK 완료로 표현하지 않는다. |
| 오디오 UX | 정상 학습 경로는 R2 audio 또는 unavailable을 표시하고 private audio는 Service Worker cache에 넣지 않도록 변경되어 있다. Settings/QA의 browser speech 기능은 별도 점검 대상이다. | 정상 JLPT/TOPIK 학습 UI에 browser TTS fallback을 새로 넣지 않는다. |
| 기존 E2E | `e2e/n2-release-browse.spec.ts` 일부는 API를 mock한다. | mock E2E 통과만으로 실제 DB/PWA 학습 성공이라고 보고하지 않는다. |
| Cloudflare AI | Worker에 기존 AI binding과 MeloTTS adapter가 있고 `AI_ASSISTANCE_ENABLED=false`은 별도 기능 설정이다. | 오디오 batch에 추가 Cloudflare 제품이 우선 필요하지 않다. 다만 실제 Workers AI 호출은 명시 승인 뒤에만 한다. |
| 한국어기초사전 | Preview Worker secret 등록은 완료되었다고 보고되었으나 실제 API 호출은 아직 하지 않았다. | 키를 요구·출력하지 말고, API 호출 승인 후에만 작은 범위로 사용한다. |

반드시 다음 문서도 읽어 source policy와 기존 설계를 이어받아라. 오래된 상태 설명은 코드와 비교하여 정정하되, 과거 문서를 덮어쓰지 말고 새 실행 기록에 차이를 적어라.

- `PROJECT_CODEBASE_ANALYSIS.md`
- `docs/00_overview/CONTENT_COVERAGE_AND_SOURCE_AUDIT_2026-07-29.md`
- `docs/00_overview/CONTENT_SOURCE_CANDIDATE_REGISTRY_2026-07-29.md`
- `docs/00_overview/JLPT_TOPIK_OWNER_AUTHORED_CURRICULUM_BLUEPRINT_2026-07-29.md`
- `docs/05_n2/01_self_authored_local_fixture.md`
- `docs/07_topik/01_owner_authored_grade1_local_fixture.md`

### 4. 작업 방식: 작은 실제 batch → 검증 → 다음 batch

아래 순서를 건너뛰지 마라. 각 단계는 "수정 내용 / 로컬 검증 결과 / 실제 PWA 증거 / 다음 승인 필요 여부"만 보고한다. 실패하면 실패한 정확한 명령·원인·안전한 수정안을 보고하고, 성공으로 가장하지 마라.

#### Phase 0 — 기준선과 fresh local 검증 환경

목표: 과거 N2 fixture가 기존 N3 `対`의 레벨을 바꾸지 않는지, 현 worktree의 최신 migration에서 처음부터 검증 가능한지 확인한다.

1. `git status --short`, `git diff --check`, migrations `0017`, `0018`, N2/TOPIK seed와 verifier를 읽는다.
2. 기존 local D1은 삭제하거나 reset하지 않는다.
3. 현재 local D1 상태를 신뢰하지 말고, 격리된 새 local D1 검증 경로를 만든다. 프로젝트의 기존 test harness를 우선 사용한다. 없으면 temporary Wrangler state 또는 별도의 test database path를 사용하는 재현 가능한 script를 추가한다. 그 script는 기존 개발 DB를 건드리지 않아야 한다.
4. fresh DB에 migration을 모두 적용하고 N5~N3 seed, N2 fixture, TOPIK grade-1 fixture를 넣은 뒤 다음을 검사한다.

   - `対`는 한 행이며 `jlpt_level='N3'` 그대로다.
   - N2의 prerequisite/reference가 N3 `対`를 참조하며 N3 원본을 수정하지 않는다.
   - source asset / stable reference / audio binding의 foreign key와 immutability trigger가 유효하다.
   - TOPIK grade-1 2 item은 owner-authored curriculum table에 있고, 정답과 provenance가 공개 learner 목록 API에 섞이지 않는다.

5. fresh 검증 script와 결과 artifact의 위치를 문서화한다. 이 단계는 외부 네트워크, D1, R2, Pages를 호출하지 않는다.

**예상 결과:** 현 `0018`의 의도가 구현과 일치하면 N3 `対`가 보존되고 N2는 reference로만 연결된다. 실패하면 N2 seed 또는 migration을 수정한 뒤 fresh 검증부터 다시 실행한다.

#### Phase 1 — N2를 fixture가 아닌 실제 seedable 학습 경로로 승격

목표: N2를 mock 없이 local DB → API → PWA로 실제 학습할 수 있게 만든다.

1. N2의 canonical source documents와 schema-conforming seed generator를 추가한다. 기존 N5~N3 manifest/seed 구조를 우선 재사용한다. N2 전용 fixture에만 데이터가 숨지 않도록 main content manifest와 verifier에 N2를 명시적으로 연결한다.
2. N2가 초기 완료되기 전에도 상태를 정직하게 표현할 수 있도록 `n5-n2` content release 또는 동등한 명시적 availability 모델을 추가한다. `n5-n1`을 N2의 임시 별칭으로 쓰지 않는다.
3. `tracks` API, dashboard/level selector, 학습 화면이 실제 DB의 N2 counts를 읽어 N2를 표시하는지 구현한다. 콘텐츠가 없으면 학습 가능이라고 보이지 않게 한다.
4. fixture mock을 보조 UI test로만 유지하고, real seeded local D1을 이용한 별도 E2E를 추가한다. 이 E2E는 N2 어휘·문법·독해·청해 목록 또는 학습 item이 실제로 표시됨을 확인한다.
5. N2 batch 1을 최소 아래 범위의 **자체 저작 실제 데이터**로 만든다. 이 수치는 시험의 공식 출제 기준이 아니라 앱의 첫 usable batch 목표다.

   | 종류 | Batch 1 최소치 | 제작 규칙 |
   | --- | ---: | --- |
   | 어휘 | 100 | 표기, 읽기, 한국어 뜻, 예문, 안정 ID, 출처/provenance |
   | 문법 | 20 | 자체 설명, 자체 예문, 오답 유도 선택지와 해설도 자체 작성 |
   | 한자 | 30 | 신규 한자 또는 기존 lower-level prerequisite reference를 명확히 구분 |
   | 예문 | 80 | 어휘·문법 연결, 중복·부자연스러운 직역 방지 |
   | 독해 | 8 | 자체 지문, 자체 질문·선택지·해설 |
   | 청해 | 8 | 자체 대본, 자체 질문·선택지·해설, audio status는 사실대로 |

6. batch 1의 데이터 품질을 검증하는 프로그램을 만든다. ID 중복, 누락 번역, 불완전한 문항, dangling reference, N3 level mutation, 자기 자신 prerequisite, 라이선스/provenance 누락을 실패로 처리한다.

**예상 결과:** `seed:local` 또는 명시적 N2 batch seed 뒤 N2가 실제 local track API와 PWA에 나타난다. 오디오가 아직 준비 중이면 청해 item은 텍스트·준비 상태로만 보이며 browser TTS가 재생되면 안 된다.

#### Phase 2 — N2 콘텐츠를 개인 학습 가능한 범위까지 반복 확장

목표: 하나의 fixture가 아닌, 반복 가능한 실콘텐츠 생산 체계를 만든다.

1. N2를 8~12개 unit으로 분할한다. 예: 일상·직장·공공 안내·감정/의견·비교/추론·신문형 독해·실용 청해. 이는 자체 학습용 구성이지 JLPT 공식 범위의 복제가 아니다.
2. 각 unit은 어휘, 문법, 한자/reference, 예문, 독해, 청해 대본/문항을 함께 추가한다. 어휘만 늘리고 독해·청해를 비워 두지 않는다.
3. batch마다 source manifest, data validator, local seed, actual PWA E2E를 실행한다.
4. 추천하는 N2 개인용 v1 목표는 아래와 같다. 숫자는 사용자 요구와 실제 학습 시간을 고려해 조정할 수 있는 앱 목표이며 공식 시험 수치라고 표현하지 마라.

   | N2 v1 목표 | 권장 수량 |
   | --- | ---: |
   | 어휘 | 1,000 이상 |
   | 문법 | 120 이상 |
   | 한자 신규/참조 | 250 이상 |
   | 예문 | 300 이상 |
   | 독해 세트 | 30 이상 |
   | 청해 세트 | 30 이상 |

5. 아직 audio asset이 없는 청해는 `preparing` 또는 `not-provided`을 사용한다. 가짜 URL, browser voice, 실제 음원이 없는 ready status를 만들지 않는다.

**예상 결과:** N2 학습 화면은 모든 콘텐츠 유형을 실제 DB에서 제공하고, 각 unit의 진행 상태·복습 데이터가 기존 PWA 모델과 함께 동작한다. 완료 수량은 verifier가 출력하는 실제 수치로 보고한다.

#### Phase 3 — 발음과 청해 audio를 R2 기반으로 완성

목표: 정상 학습 화면의 일본어·한국어 발음을 R2 asset으로 통일한다.

1. 먼저 각 audio source candidate를 source asset registry로 정리한다. 반드시 source URL, license, attribution, acquisition time, content hash, 사용 범위(어휘/문장/청해)를 기록한다.
2. per-file audio license가 명확히 허용된 licensed web audio만 R2에 넣는다. JMdict, 사전 텍스트, 발음 표기는 audio 라이선스가 아니다.
3. licensed source가 없으면 자체 저작 대본을 Cloudflare Workers AI TTS로 생성하는 방법을 사용한다. 기존 Worker AI binding과 MeloTTS adapter를 우선 사용하며, 이 단계만으로 새 Cloudflare 상품을 구독하거나 AI assistance 기능을 활성화하지 않는다.
4. batch audio는 먼저 20개 이하의 Preview pilot으로 생성한다. 음성 언어·텍스트·모델·생성 시각·hash·R2 key·fallback 사실을 provenance에 남긴다.
5. normal learning route에는 `audioPath`가 있고 R2 response가 검증된 경우에만 재생 버튼을 enable한다. `preparing`/`not-provided`은 학습자가 이해할 수 있는 준비 상태로 표시한다.
6. Settings/Audio QA에 남아 있는 browser speech는 일반 학습 endpoint와 분리되어 있는지 검사한다. 사용자가 요구한 "발음 통일" 기준은 JLPT/TOPIK 정상 학습 UI에 browser speech가 남지 않는 것이다.
7. 기존 `verify:audio:provenance`가 과거 Google path/profile만 가정한다면, `content_audio_bindings`와 source asset 계약도 검사하도록 확장한다. 과거 batch verifier 통과만으로 새 N2/TOPIK audio를 통과 처리하지 않는다.

이 phase에서 원격 호출을 하려면 아래 실제 승인값이 모두 필요하다. secret 값 자체는 절대 요청하거나 출력하지 않는다.

```text
LICENSED_SOURCE_DOWNLOAD_APPROVED=yes
SOURCE_ASSET_IDS=<license가 확인된 asset id 목록>
SOURCE_LICENSES_VERIFIED=yes
PREVIEW_D1_CONTENT_WRITE_APPROVED=yes
PREVIEW_R2_AUDIO_WRITE_APPROVED=yes
PREVIEW_WORKERS_AI_TTS_PILOT_APPROVED=yes
PREVIEW_WORKERS_AI_TTS_MAX_ITEMS=<20 이하의 실제 숫자>
PREVIEW_TTS_COST_CAP=<실제 통화·상한>
```

**예상 결과:** 승인 전에는 audio manifest/validator와 `preparing` UX만 완성된다. 승인 후 pilot은 R2 object와 D1 binding의 hash를 재조회해 일치 여부를 증명한다. 불일치·오디오 없음·라이선스 누락은 실패이며 재생되지 않는다.

#### Phase 4 — N1을 N2와 같은 운영 경로로 추가

목표: N5~N1을 모두 동일한 실제 학습 경로에서 제공한다.

1. N2에서 검증된 source manifest, self-authored authoring format, validator, seed path, R2 audio contract를 재사용하여 N1을 추가한다. N1 fixture를 별도 우회 경로로 만들지 않는다.
2. N1 batch 1은 N2와 동일한 종류별 최소치(어휘 100, 문법 20, 한자 30, 예문 80, 독해 8, 청해 8)로 시작한다.
3. 추천하는 N1 개인용 v1 목표는 어휘 1,200+, 문법 150+, 한자 신규/참조 300+, 예문 360+, 독해 36+, 청해 36+다. 이 숫자 역시 공식 시험 기준이 아닌 앱 내 목표다.
4. N1이 실제로 준비된 뒤에만 `n5-n1` availability를 활성화한다. N1의 한 항목이라도 부족하면 UI에 허위 완성 상태를 표시하지 않는다.
5. N5, N4, N3의 기존 seed count와 학습 경로가 N2/N1 변경 뒤에도 보존되는 회귀 검증을 추가한다.

**예상 결과:** 새 local DB에서 N5~N1 선택지가 실데이터 count와 함께 나타나고, N1과 N2가 mock API가 아니라 seed된 데이터로 표시된다.

#### Phase 5 — TOPIK 1~6을 grade별 self-authored curriculum으로 완성

목표: 현재 1급 2 item fixture를 출발점으로 모든 급수의 실제 학습 경로를 만든다.

1. `topik_owner_authored_curriculum_units/items`와 현재 API/UI를 계속 사용한다. 기존 TOPIK-I/TOPIK-II summary만으로 grade 1~6 완료라고 표시하지 않는다.
2. grade 1부터 실제 batch를 만든 뒤 2 → 3 → 4 → 5 → 6 순서로 진행한다. 각 grade에는 최소 6 unit을 두고, 각 unit에는 어휘·문법/표현·읽기·듣기 대본/문항·해설을 포함한다.
3. 첫 usable batch의 권장 최소치는 grade마다 unit 2, item 16(어휘/표현 8, 읽기 4, 듣기 4)이다. 이후 grade v1은 6 unit, 48 item 이상을 목표로 하되, 빈 placeholder로 수량을 채우지 않는다.
4. 모든 읽기·듣기 대본과 문항은 자체 저작한다. 한국어기초사전 API의 표제어/뜻/발음 표기는 참고 데이터일 뿐, official TOPIK 콘텐츠 대체물이 아니다.
5. TOPIK learner list API에는 정답·관리 provenance·내부 source metadata를 넣지 않는다. solution endpoint는 인증·권한·cache contract를 현재 구현과 함께 검사한다.
6. 대시보드/track summary가 grade 1~6의 실제 availability, item count, audio readiness를 보여 주도록 확장한다.
7. Korean Basic Dictionary API를 처음 호출하기 전에는 다음 승인만 요청한다. Preview secret은 이미 등록되었다고 보고되었으므로 API key를 다시 요구하지 않는다.

```text
KOREAN_BASIC_DICTIONARY_API_CALL_APPROVED=yes
KOREAN_BASIC_DICTIONARY_FIRST_CALL_SCOPE=topik-grade-1-vocab-20
```

8. 승인 후에도 하루 quota와 약관을 지키기 위해 최대 20개 표제어의 Preview pilot만 수행한다. request count, response provenance, 실패/제외 사유를 기록하고, 원문 응답이나 API key를 저장소에 넣지 않는다.

**예상 결과:** TOPIK 1급부터 grade selector에서 실제 unit/item이 보이고, no-session은 콘텐츠를 받지 못하며, owner-authored 학습 콘텐츠의 음원은 R2 ready 또는 정직한 unavailable 상태를 보인다. 각 grade 완료는 local DB, actual API, Chromium과 WebKit PWA E2E를 모두 통과한 뒤에만 보고한다.

#### Phase 6 — 개인용 운영 반영은 콘텐츠 완성 후 최소 범위로

목표: Preview에서 검증된 실제 콘텐츠만 개인용 production 환경에 반영한다.

1. production publish를 콘텐츠 작업의 선행 조건으로 만들지 않는다. N2 local → Preview, N1 local → Preview, TOPIK grade별 local → Preview 순으로 실제 기능 증거를 먼저 만든다.
2. remote D1/R2/Pages 작업은 해당 단위의 준비가 끝나고 사용자가 별도로 `yes`를 준 경우에만 실행한다. 승인 요청에는 대상 환경, 정확한 쓰기 대상, 롤백/backup 방식, 예상 비용, 왜 필요한지를 한 번에 설명하고 **추천**을 포함한다.
3. 개인용 production 배포에는 reviewer/OAuth/공개 release gate를 요구하지 않는다. 단, migration backup, secret 비노출, private cache, smoke test는 유지한다.

**예상 결과:** 콘텐츠가 없는 레벨을 public-like completed로 표시하지 않고, 실제 개인 계정이 쓸 레벨만 순차적으로 배포된다.

### 5. 콘텐츠 source 및 data model 규칙

#### 5.1 source 선택

- 후보의 라이선스와 개별 asset 조건을 먼저 확인하고 registry에 기록한다.
- 일본어 lexical reference는 `CONTENT_SOURCE_CANDIDATE_REGISTRY_2026-07-29.md`에 정리된 JMdict/EDICT/KANJIDIC 계열 등에서 출발할 수 있다. attribution과 share-alike 의무를 만족시킬 구조가 없으면 metadata를 가져오지 말고 자체 저작 설명으로 대체한다.
- KanjiVG는 stroke-order SVG 후보일 뿐이며, 오디오나 일반 예문 source로 취급하지 않는다.
- 한국어기초사전 API는 key가 필요한 reference API다. 발음 표기와 실제 audio asset을 혼동하지 않는다.
- 외부 사이트를 크롤링할 때는 자동 다운로드 전에 이용 조건과 rate limit을 확인한다. `robots.txt`는 라이선스가 아니며, 라이선스 없음은 사용 허가가 아니다.
- official JLPT/TOPIK 사이트는 레벨·시험 안내를 이해하는 reference일 수 있지만, 시험 문항을 수집하는 source가 아니다.

#### 5.2 각 콘텐츠 row의 최소 품질

- stable ID와 curriculum unit 연결
- 목표 level/grade 및 prerequisite(있는 경우)
- 일본어: 표기, 읽기, 한국어 뜻, 자체 저작 예문, source/provenance
- 한국어: 표제어, 한국어 설명, 일본어 학습자용 뜻/설명(필요한 경우), 자체 저작 예문, source/provenance
- 문법: 의미, 접속, 자연스러운 자체 예문, 자주 하는 오류/오답 설명
- 읽기: 자체 지문, 자체 질문·선택지·정답·해설. 정답은 learner 목록 응답에서 제외
- 듣기: 자체 대본, 자체 질문·선택지·정답·해설, audio binding 상태
- audio: source asset ID, language, transcript hash, audio hash, R2 key 또는 명시적 unavailable reason

#### 5.3 금지되는 shortcut

- 어휘 목록만 넣고 "N2/N1/TOPIK 완료"라고 말하지 않는다.
- 단순 fixture 3~4 item, mock E2E, static UI를 real learning content로 간주하지 않는다.
- 기존 N3 한자를 N2로 update해 N2 count를 부풀리지 않는다.
- 추측한 license, 출처 없는 audio URL, 실제 파일 없는 `r2-ready` 상태를 넣지 않는다.
- browser `speechSynthesis`를 normal learning의 audio fallback으로 추가하지 않는다.
- issue를 무시하기 위해 verifier를 약화하거나 count threshold를 낮추지 않는다.

### 6. 필수 검증 명령과 증거 기준

현재 존재 여부를 먼저 확인하고 package script 이름이 바뀌었으면 동등한 실제 명령으로 교체하여 기록한다. 외부 서비스가 필요한 E2E가 실패하면, 실패 내용을 보고하고 통과라고 표현하지 않는다.

```bash
pnpm -F @nihongo-n3/db migrate:local
pnpm -F @nihongo-n3/db seed:local
pnpm -F @nihongo-n3/db seed:n2:local-fixture
pnpm -F @nihongo-n3/db verify:n2:local-fixture
pnpm -F @nihongo-n3/db seed:topik:grade1:local-fixture
pnpm -F @nihongo-n3/db verify:topik:grade1:local-fixture
pnpm -F @nihongo-n3/db verify:audio:provenance
pnpm -F @nihongo-n3/db test
pnpm typecheck
pnpm -F @nihongo-n3/e2e test -- n2-release-browse.spec.ts --project=chromium
pnpm -F @nihongo-n3/e2e test -- n2-release-browse.spec.ts --project=webkit
pnpm -F @nihongo-n3/e2e test -- topik-owner-curriculum.spec.ts --project=chromium
pnpm -F @nihongo-n3/e2e test -- topik-owner-curriculum.spec.ts --project=webkit
git diff --check
```

그리고 N3 preservation을 fresh local DB에서 직접 확인한다.

```bash
pnpm -F @nihongo-n3/db exec wrangler d1 execute DB --local --config ../../apps/api/wrangler.toml --command "SELECT char, jlpt_level FROM kanji WHERE char = '対';"
```

단, 기존 local DB를 사용하는 위 명령 하나만으로 fresh proof를 대신하지 마라. Phase 0에서 만든 격리된 fresh database verifier가 최종 증거다.

각 batch의 완료 보고에는 아래 표를 실제 count와 함께 반드시 넣는다.

| 대상 | manifest에 연결 | fresh local DB seed | 실제 API | 실제 PWA Chromium | 실제 PWA WebKit | audio ready / preparing / unavailable |
| --- | --- | --- | --- | --- | --- | --- |
| JLPT N2 |  |  |  |  |  |  |
| JLPT N1 |  |  |  |  |  |  |
| TOPIK 1 |  |  |  |  |  |  |
| TOPIK 2 |  |  |  |  |  |  |
| TOPIK 3 |  |  |  |  |  |  |
| TOPIK 4 |  |  |  |  |  |  |
| TOPIK 5 |  |  |  |  |  |  |
| TOPIK 6 |  |  |  |  |  |  |

빈 칸·mock·fixture-only는 완료가 아니다. "실제 API"는 seed된 local D1 또는 승인된 Preview D1을 읽은 결과여야 한다.

### 7. Cloudflare 사용 경계와 질문 방식

기존 D1, R2, Workers, Workers AI만으로 콘텐츠 확장의 첫 단계는 가능하다. 새 Cloudflare 제품을 제안하려면 반드시 다음 정보를 먼저 사용자에게 제시하고 허가를 기다려라.

1. 왜 기존 D1/R2/Workers AI로 해결되지 않는지
2. 신규 서비스의 정확한 역할과 대안
3. 비용 모델·quota·보안/운영 위험 (현재 공식 문서로 재확인)
4. 영향을 받는 환경과 데이터
5. 추천 여부와 추천 이유

원격 변경은 다음처럼 scope가 좁고 실제 값이 있는 승인만 인정한다. 템플릿 placeholder를 `yes`로 해석하지 않는다.

```text
<대상별_승인명>=yes
<대상_환경>=preview 또는 production
<정확한_범위>=실제 batch/release/source asset 범위
```

질문은 한 번에 필요한 결정만 묻고 항상 추천을 붙인다. 예시:

> 변경: Preview R2에 N2 batch 1의 검증된 20개 audio asset 업로드
> 이유: normal PWA playback을 browser voice 없이 실제 asset으로 검증하기 위해 필요
> 대안: audio를 `preparing`으로 유지하고 텍스트 학습만 먼저 진행
> 비용·위험: Workers AI 생성량과 R2 저장/읽기 비용, asset hash·license 검증 필요
> 추천: Preview 20개 pilot 후 재생·품질·hash를 확인하고 다음 batch로 확대
> 필요한 승인: `PREVIEW_R2_AUDIO_WRITE_APPROVED=yes`, `PREVIEW_WORKERS_AI_TTS_PILOT_APPROVED=yes`, 실제 max items/cost cap

### 8. 최종 완료 정의

다음 조건을 모두 충족하기 전에는 "전체 목표 완료"라고 말하지 마라.

1. N2와 N1은 각각 main manifest/seed, fresh local D1, real API, Chromium·WebKit PWA에서 어휘·문법·독해·청해를 제공한다.
2. 기존 N5~N3 데이터와 레벨 분류가 회귀 없이 보존된다.
3. TOPIK 1~6은 각각 실제 unit/item, real API, PWA grade selector에서 접근 가능하다.
4. normal learning의 발음은 R2-ready asset만 재생하며, unavailable/preparing은 정직히 표시된다.
5. 모든 외부 source/audio와 자체 저작 콘텐츠의 provenance·license·hash 검증이 통과한다.
6. 외부 API, Preview/production D1/R2, Workers AI TTS는 필요한 단계에서만 명시 승인 후 사용되었거나, 승인 전에는 local/self-authored 작업만으로 안전하게 보류되었다.

### 9. 지금 바로 시작할 정확한 행동

지금은 **Phase 0과 Phase 1의 N2 batch 1**에만 집중하라.

1. 코드·migration·seed·PWA·기존 tests를 읽고 사실표의 차이를 보고한다.
2. 격리 fresh local verification을 구현하고 N3 `対` preservation을 증명한다.
3. N2를 main seed/availability/API/PWA 경로에 연결한다.
4. N2 batch 1의 실제 자체 저작 콘텐츠를 추가한다. 공식 시험 자료나 외부 audio를 다운로드하지 않는다.
5. local verifier, typecheck, relevant real-data E2E를 실행한다.
6. 결과 표를 갱신하고, audio의 원격 pilot 또는 Preview D1/R2 write가 필요해지는 시점에만 승인 요청을 한다.

N2 batch 1이 실제 PWA에서 작동한다는 증거가 생긴 뒤에 N2 반복 확장, N1, TOPIK 1~6으로 진행한다. 완료 보고의 시작 문장은 항상 결과여야 하며, "무엇이 실제로 학습 가능한지", "무엇이 아직 preparing인지", "다음에 필요한 승인"을 명확히 구분한다.

## 실행 프롬프트 끝

---

## 이 프롬프트를 실행했을 때의 현실적인 예상 결과

| 시점 | 성공 시 나오는 결과 | 아직 하지 않는 일 |
| --- | --- | --- |
| Phase 0 | fresh local DB에서 최신 migrations와 fixture가 재현되고 N3 `対` 보존을 검증하는 script/artifact | 기존 local DB 삭제, Cloudflare 호출 |
| Phase 1 | N2 batch 1이 main seed/API/PWA에 연결되고 mock과 구분된 real-data E2E가 추가됨 | N2 전체 완성 주장, 외부 audio 다운로드 |
| Phase 2 | N2가 반복 batch와 품질 validator로 확장됨 | N1/TOPIK 완료 주장 |
| Phase 3 | 승인 전에는 R2 audio contract/UX/validator, 승인 후에는 작은 Preview audio pilot 증거 | secret 노출, 무승인 R2·Workers AI·D1 쓰기 |
| Phase 4 | N1이 N2와 동일한 seed/API/PWA 경로에 추가되어 N5~N1 coverage가 실측됨 | `n5-n1` 상태를 빈 N1에 미리 표시 |
| Phase 5 | TOPIK grade 1부터 6까지 실제 unit/item과 PWA 경로가 순서대로 완성됨 | 공식 TOPIK 문항·음원 사용 |

이 예상은 현재 코드 구조를 토대로 한 검증 가능한 결과다. 실제 command failure, data quality failure, 또는 라이선스 불명 asset은 성공으로 치환하지 않고 해당 단계의 실패 보고와 수정으로 이어져야 한다.
