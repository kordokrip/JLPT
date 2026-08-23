# JLPT·TOPIK 자체 저작 커리큘럼 설계

기준일: 2026-08-23 KST. 레벨·급수 표기는 학습 난이도 안내이며, 공식 어휘 목록·기출 문제·합격 판정을 뜻하지 않는다.

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
| N2 | Production canonical Batch 1~5; Preview 정적 문제은행 60 | 정적 bank 공개 뒤 실제 오답·복습 지표로 다음 batch 결정 |
| N1 | Production canonical Batch 1~4; Preview 정적 문제은행 60 | 정적 bank 공개 뒤 실제 오답·복습 지표로 다음 batch 결정 |

새 JLPT batch는 source hash가 바뀌는 Markdown 원본과 dedicated builder의 count 계약을 함께 갱신한다.

## TOPIK 1~6 범위

Production owner curriculum은 Batch 1~5의 140 unit과 140 item입니다. Preview의 Batch 6 40개를 포함하면 각 급수 30개, 급수·영역별 6개로 균형화됩니다. owner curriculum은 공개 TOPIK practice v2 300문항과 별도입니다.

| 급수 | 현재 학습 초점 | 확장 방향 |
| --- | --- | --- |
| 1~2 | 생활·기초 문장 | 어휘 폭, 짧은 대화·안내 |
| 3~4 | 사회·직장 문맥 | 정보 연결, 의견·문단 |
| 5~6 | 논증·고급 독해·쓰기 | 관점 비교, 정밀 표현, 긴 담화 |

해설 확인은 완료 상태와 새 FSRS 카드를 만들고, 이후 due queue에서 again/hard/good/easy 평가를 받는다. 이 과정은 계정 데이터이며 디바이스 local flag가 아니다.

## 출시와 검증 원칙

1. 콘텐츠를 자체 저작하고 공식 시험 자료 비복제를 확인한다.
2. source asset, stable ref, audio binding과 hash를 만든다.
3. 자동 validator와 서로 독립된 두 reviewer의 일치 판정을 받는다.
4. release-quality link와 G0–G4를 만들고 fresh D1 verifier와 단위 테스트를 통과한다.
5. 웹에서 목록, 해설, 완료, due, review, Google 음성과 unavailable을 확인한다.
6. Preview와 실제 Chrome 음성 gate를 통과한 뒤 명시적으로 승인된 Production만 배포한다.
