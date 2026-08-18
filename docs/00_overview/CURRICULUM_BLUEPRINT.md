# JLPT·TOPIK 자체 저작 커리큘럼 설계

기준일: 2026-08-09 KST. 레벨·급수 표기는 학습 난이도 안내이며, 공식 어휘 목록·기출 문제·합격 판정을 뜻하지 않는다.

## 공통 단위 계약

각 운영 batch는 자체 저작 원본, source asset, stable reference, 필수 학습 필드, audio text를 가진다. 듣기와 발음은 Google 음성만 사용하며 R2 activation이나 browser fallback을 사용하지 않는다.

| 구성 | 현재 계약 |
| --- | --- |
| 식별 | stable unit/item ID, track, level 또는 target grade |
| 출처 | self-authored source asset 또는 사전 승인된 external asset |
| 학습 | 어휘·문법·문자/표기, 예문, 독해/듣기/쓰기, 확인·해설 |
| 진행 | 계정별 완료 상태와 학습 시각 |
| 복습 | FSRS card, due, rating, review log |
| 오디오 | Google 음성만 사용; R2 binding·activation·fallback은 발음 경로에서 사용하지 않음 |

## JLPT 범위

| 레벨 | 현재 범위 | 다음 확장 주제 |
| --- | --- | --- |
| N5~N3 | manifest 기반 어휘·문법·한자·예문 | 학습 흐름·복습 품질 유지 |
| N2 | 자체 저작 Batch 1~5 | 공공 절차·주민 참여·의견 조정의 밀도를 유지하고 다음 batch는 실제 학습 사용량을 근거로 결정 |
| N1 | 자체 저작 Batch 1~4 | 학술 논증·비평·정책/사회 현상·추상 관계의 밀도를 유지하고 다음 batch는 실제 학습 사용량을 근거로 결정 |

새 JLPT batch는 source hash가 바뀌는 Markdown 원본과 dedicated builder의 count 계약을 함께 갱신한다.

## TOPIK 1~6 범위

각 급수는 vocab, grammar, reading, listening, writing을 Batch 1~4에서 하나씩 보유한다. 총 120 unit과 120 item은 owner-authored curriculum 테이블에 있고, 28문항 practice bank와 별도다.

| 급수 | 현재 학습 초점 | 확장 방향 |
| --- | --- | --- |
| 1~2 | 생활·기초 문장 | 어휘 폭, 짧은 대화·안내 |
| 3~4 | 사회·직장 문맥 | 정보 연결, 의견·문단 |
| 5~6 | 논증·고급 독해·쓰기 | 관점 비교, 정밀 표현, 긴 담화 |

해설 확인은 완료 상태와 새 FSRS 카드를 만들고, 이후 due queue에서 again/hard/good/easy 평가를 받는다. 이 과정은 계정 데이터이며 디바이스 local flag가 아니다.

## 출시와 검증 원칙

1. 콘텐츠를 자체 저작하고 공식 시험 자료 비복제를 확인한다.
2. source asset, stable ref, audio binding과 hash를 만든다.
3. fresh D1 verifier와 단위 테스트를 통과한다.
4. 웹에서 목록, 해설, 완료, due, review 및 audio fallback을 확인한다.
5. remote asset/배포는 별도 승인 뒤에 수행한다.
