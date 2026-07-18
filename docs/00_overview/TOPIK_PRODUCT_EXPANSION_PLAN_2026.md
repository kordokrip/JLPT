# TOPIK 한국어능력시험 제품 확장 계획

기준일: 2026-07-17 KST
현재 단계: T1~T3 내부 구현 완료, 콘텐츠 미출시

## 목표와 비목표

목표는 한 계정에서 일본어 JLPT와 한국어 TOPIK 중 학습 트랙을 선택하되, 진도·복습·퀴즈·오프라인 데이터가 섞이지 않는 구조를 만드는 것이다.

현재 R3 foundation은 트랙 선택과 격리만 사용자에게 제공한다. T3 자체 저작 placement
문제은행은 DB schema·manifest·검증에만 존재하며 공개 route, 온보딩 CTA, 채점 결과,
레벨 판정, 학습 추천에는 아직 연결하지 않는다. 공식 점수 예측이나 공식 시험 대체도
제공하지 않는다.

## 현재 구현

- shared `LearningTrackId`
- user와 OAuth state의 learning track
- `/api/v1/tracks/:track/status`
- first-entry track selection
- TOPIK foundation-only page
- user×track query/IDB/localStorage namespace
- JLPT compatibility route guard
- 세션 기반 server SRS·daily log·quiz attempt·self-check·sync delta track 격리
- track-aware FSRS settings 및 optimizer candidate key
- track별 source/exam level/seed run provenance schema
- 자체 저작 TOPIK I placement 12문항과 local D1 manifest verifier

## 설계 원칙

1. UI 언어와 학습 언어를 분리한다.
2. TOPIK 학습 콘텐츠는 한국어이고 초기 설명 언어는 영어를 기본값으로 둔다.
3. 신규 API는 `/api/v1/tracks/:track/...`를 사용한다.
4. 기존 JLPT route는 `jlpt-ja` compatibility façade로 유지한다.
5. 모든 서버·브라우저 cache key에 user와 track을 포함한다.
6. JLPT와 TOPIK은 별도 content manifest와 provenance를 가진다.
7. 공식 시험 문제를 복제하지 않고 자체 저작 또는 적법한 라이선스 자료만 사용한다.

## 시계열 계획

### T0: R1 운영 정상화

- prod-v2 ledger와 CI 필수 체크 완료
- auth/session/OAuth 안정화
- JLPT N5~N3 운영 회귀 0

### T1: 제품 계약 확정 - 완료 (내부 구현)

- [ADR-001](ADR-001-topik-t1-product-contract.md)에 영어 사용 성인 TOPIK I 진입 학습자와
  한국어 prompt/영어 해설 계약을 기록했다.
- server SRS/sync는 인증 세션의 track만 신뢰하며, user×track natural key와 delta
  filter를 강제한다.
- 트랙 전환은 데이터를 복사·병합·삭제하지 않고, account deletion은 모든 track의
  mutable data를 함께 삭제한다. track 단위 삭제는 공개 전 privacy review 없이는 추가하지 않는다.

### T2: 데이터 모델 - 완료 (미출시 schema)

- `0008_topik_track_content_and_learning_keys.sql`은 track-aware mutable key와
  `track_content_sources`, `track_exam_levels`, seed run/source provenance,
  `topik_placement_questions`를 추가한다. `0007` provenance/homophone migration이
  R1 branch에 병합된 뒤 순서대로 적용한다.
- 기존 JLPT compatibility route는 세션 track으로 scope를 한정하고, TOPIK SRS/quiz/reading
  route는 출시 전 `404`로 닫는다.
- TOPIK은 JLPT level alias가 아닌 `TOPIK-I`/`TOPIK-II` exam-level taxonomy를 사용한다.

### T3: 최소 검수 콘텐츠 - 완료 (internal QA bank)

- `TOPIK-PLACEMENT-V1` 12문항은 자체 저작, 작성 검수와 2차 한국어 언어 검수,
  최종 검토일을 갖는다. 공식 기출문항·음원은 포함하지 않는다.
- `pnpm -F @nihongo-n3/db topik:verify`가 fresh local D1에서 row/checksum/FK/빈 필드/
  duplicate/answer index/manifest mismatch를 검증한다.
- 이 문제은행은 공개 seed와 public OpenAPI에 등록하지 않는다. T4에서 별도 API 계약과
  T5 수동 승인까지 통과해야 사용자에게 표시할 수 있다.

### T4: API와 Web

- `/api/v1/tracks/topik-ko/...`
- track-aware generated OpenAPI client
- onboarding, browse, quiz, review, stats의 트랙별 화면
- 영어 설명과 한국어 콘텐츠의 i18n 분리

### T5: 검증과 출시

- 사용자×트랙×계정 조합 E2E
- IndexedDB/cache/sync 격리
- placement 결과 재현성과 추천 기준 QA
- preview 사용자 테스트
- JLPT와 독립적인 수동 승인 릴리스

## 출시 관문

- TOPIK content provenance 100%
- 빈 뜻/정답/해설 0
- duplicate/FK/manifest mismatch 0
- account×track API/IDB/cache leak 0
- Chromium/WebKit E2E 통과
- JLPT 회귀 0
- 공식 명칭과 출처 표시 검토 완료

## 현재 의사결정

R1과 R2 운영 관문, T4 API contract, T5 수동 승인이 모두 끝나기 전에는 TOPIK 문제은행을
production branch의 공개 콘텐츠 seed나 사용자 route에 섞지 않는다. foundation과 T1~T3
코드는 경계를 검증하기 위한 것이며 사용자에게 완성된 TOPIK 과정으로 홍보하지 않는다.
