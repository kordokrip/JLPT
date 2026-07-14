# TOPIK 한국어능력시험 제품 확장 계획

기준일: 2026-07-15 KST
현재 단계: LearningTrack foundation, 콘텐츠 미출시

## 목표와 비목표

목표는 한 계정에서 일본어 JLPT와 한국어 TOPIK 중 학습 트랙을 선택하되, 진도·복습·퀴즈·오프라인 데이터가 섞이지 않는 구조를 만드는 것이다.

현재 R3 foundation은 트랙 선택과 격리만 제공한다. TOPIK 문제은행, 공식 점수 예측, 레벨 판정, 학습 추천은 아직 제공하지 않는다.

## 현재 구현

- shared `LearningTrackId`
- user와 OAuth state의 learning track
- `/api/v1/tracks/:track/status`
- first-entry track selection
- TOPIK foundation-only page
- user×track query/IDB/localStorage namespace
- JLPT compatibility route guard

## 설계 원칙

1. UI 언어와 학습 언어를 분리한다.
2. TOPIK 학습 콘텐츠는 한국어이고 초기 설명 언어는 영어를 기본 후보로 둔다.
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

### T1: 제품 계약 확정

- 대상 사용자와 설명 언어 결정
- TOPIK level, section, skill taxonomy 설계
- 트랙 전환 시 서버 SRS/sync 정책 결정
- privacy와 retention 검토

### T2: 데이터 모델

- track-aware content source와 exam level schema
- TOPIK vocab/grammar/reading/listening content table 또는 공통 polymorphic 모델 결정
- track-aware server SRS, attempt, assessment key
- source manifest, license, reviewer 상태

### T3: 최소 검수 콘텐츠

- placement test를 검증할 수 있는 최소 문제은행
- 정답·해설·난이도·출처 이중 검수
- 한국어 학습자 대상 표현 자연성 검수
- 수량보다 provenance와 오류율을 gate로 사용

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

R1과 R2가 안정화되기 전 TOPIK 문제은행 개발을 production branch에 섞지 않는다. foundation code는 경계를 검증하기 위한 것이며 사용자에게 완성된 TOPIK 과정으로 홍보하지 않는다.
