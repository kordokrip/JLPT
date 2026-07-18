# ADR-001: TOPIK T1 제품 계약과 데이터 격리

- 상태: 승인됨 (구현용, 출시 승인 아님)
- 결정일: 2026-07-17 KST
- 적용 범위: `topik-ko` LearningTrack T1~T3
- 관련 계획: [TOPIK_PRODUCT_EXPANSION_PLAN_2026.md](TOPIK_PRODUCT_EXPANSION_PLAN_2026.md)

## 배경

현재 앱은 `jlpt-ja`와 `topik-ko`를 한 계정에서 전환할 수 있고, 브라우저 캐시와
IndexedDB namespace는 `user:{id}|track:{track}`으로 분리된다. 그러나 서버 학습
테이블의 자연키는 아직 대부분 `user_id`만 포함한다. 이 상태에서 TOPIK 콘텐츠를
넣으면 한 계정이 트랙을 전환할 때 SRS, 일일 통계, 퀴즈 시도, 자가진단과 sync delta가
섞일 수 있다.

## 결정

### 대상 사용자와 설명 언어

초기 TOPIK 대상 사용자는 한국어를 처음 체계적으로 학습하거나 TOPIK I 진입 수준을
확인하려는 영어 사용 성인 자율학습자다. 문제 지문과 보기에는 한국어를 사용하고,
설명·해설·오류 문구의 기본 언어는 영어로 둔다. 앱 표시 언어 설정은 학습 트랙과
독립적이므로 한국어·일본어 UI 사용자를 차단하지 않는다.

T3의 자체 저작 문제은행은 placement 검증용일 뿐 공식 점수 예측이나 공식 기출 대체가
아니다. 공식 기출문항·음원은 저장하거나 재배포하지 않는다.

### 서버 SRS와 sync 정책

1. 서버가 신뢰하는 트랙 값은 인증 세션의 `users.learning_track`이다. 요청 본문과
   offline operation payload는 트랙을 지정하거나 덮어쓸 수 없다.
2. `srs_cards`, `daily_logs`, `quiz_attempts`, `self_check`의 조회·자연키·delta는
   `(user_id, learning_track)`으로 범위를 한정한다. `review_logs`는 track-scoped
   card를 통해 간접적으로 귀속된다.
3. FSRS 옵션과 개인화 weights는 `(user_id, learning_track)` 설정으로 관리한다.
   기존 `users`의 값은 `jlpt-ja` 설정으로 한 번만 이관한다.
4. TOPIK에 track-aware 학습 API와 검수된 콘텐츠가 공개되기 전에는 TOPIK SRS 초기화,
   복습, JLPT 퀴즈 compatibility route를 활성화하지 않는다. 트랙 전환은 기존 데이터를
   복사·병합·삭제하지 않고, 활성 트랙의 데이터만 읽고 쓴다.
5. sync는 인증된 활성 트랙만 사용해 쓰기와 server delta를 처리한다. 따라서 오래된
   브라우저 큐나 조작된 payload가 다른 트랙에 데이터를 기록할 수 없다.

### Privacy와 retention

- 학습 기록은 계정 단위로 보존하되, 트랙별로 논리 분리한다. 트랙 전환 자체는 삭제
  요청이 아니다.
- 계정 삭제/운영 정리 절차에서는 사용자 FK cascade 및 사용자 정리 도구가 모든
  트랙의 mutable data를 함께 대상으로 한다. 운영자가 특정 트랙만 제거하는 기능은
  T5에서 별도 privacy review 없이 추가하지 않는다.
- placement 정답·해설·문항 메타데이터는 학습 기능 제공과 QA에만 사용한다. PII 없는
  request log에는 route template과 상태만 남기며 문항 답안 본문은 기록하지 않는다.
- 공개 출시 전에는 개인정보처리방침의 TOPIK 데이터 목적·보존·삭제 항목을 별도
  검토하고, 사용자 노출은 해당 검토와 T5 수동 승인을 통과한 뒤에만 허용한다.

## 결과

T2 migration은 track-aware mutable key와 별도 TOPIK source/exam/question schema를
추가한다. T3 문제은행은 manifest와 검증 스크립트로만 준비하며, 아직 public route,
온보딩 CTA, 콘텐츠 상태 API의 `available` 값을 변경하지 않는다.

## 대안과 기각 사유

| 대안 | 기각 사유 |
| --- | --- |
| `users.learning_track`만 전환하고 기존 서버 행을 공유 | 트랙 전환 시 통계·SRS·sync delta가 섞인다. |
| TOPIK 테이블을 JLPT 테이블과 완전히 별도 복제 | 공통 학습 상태 계약이 중복되고 계정 전환 격리 검증이 어려워진다. |
| 콘텐츠와 API를 먼저 공개한 뒤 데이터 모델 보완 | 출시 관문의 account×track leak 0 요구를 만족하지 못한다. |
