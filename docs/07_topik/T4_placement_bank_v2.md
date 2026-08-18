# TOPIK I Placement V2 QA Bank

- 기준일: 2026-08-09 KST
- 상태: repository의 v2 placement source. remote release 여부는 문서가 아닌 D1 release contract로 확인
- 저작: 프로젝트 자체 저작
- 범위: 듣기 12문항, 읽기 12문항
- 최종 검토일: 2026-07-20
- 작성 검수: JLPT-TOPIK Study original-content review
- 2차 언어 검수: JLPT-TOPIK Study Korean and Japanese-language QA
- 라이선스: `LicenseRef-nihongo-n3-topik-original`

## 목적

이 문제은행은 영어·한국어·일본어 설명을 사용하는 TOPIK I 입문 학습자의 현재 기초를
확인하기 위한 짧은 배치 진단이다. 공식 TOPIK 점수를 예측하거나 공식 시험을 재현하지
않는다. 일본어 해설은 한국어 원문의 문법·어휘 근거를 보존하고, 자연스러운 일본어
학습 용어로 별도 검수한다.

## 저작 원칙

1. 공식 기출 문항, 정답, 듣기 음원을 복제하지 않는다.
2. 듣기 대본과 읽기 문항은 일상적인 초급 한국어 상황을 바탕으로 자체 저작한다.
3. 공개 문제 DTO에는 정답과 해설을 포함하지 않는다. 제출 뒤에만 채점 결과를 반환한다.
4. 이 placement v2 API는 `audio_script_ko`가 있는 listening question에 Google 음성 DTO를 반환하고, 재생 텍스트가 없으면 unavailable을 반환한다. R2 audio key와 browser fallback은 사용하지 않는다.
5. 결과는 `starter`, `foundation`, `ready` 학습 밴드이며 공식 급수 판정이 아니다.

## 검증 계약

| 항목 | 기준 |
| --- | ---: |
| 듣기 | 12 |
| 읽기 | 12 |
| 보기 수 | 문항당 4 |
| 빈 prompt/정답/해설 | 0 |
| 빈 일본어 prompt/해설 | 0 |
| 중복 ID/prompt | 0 |
| 서로 다른 2개 검수 역할 | 100% |
| 정답 index 범위 오류 | 0 |
| 정답 위치 분포 | 1~4번 각 6문항 |

문항 본문과 정답은 `packages/db/src/seed/topik-placement-bank-v2.ts`가 단일 소스다.
manifest는 이 문서 checksum과 문항 checksum을 결합해 content version을 생성한다.
