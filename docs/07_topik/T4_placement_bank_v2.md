# TOPIK I Placement V2 QA Bank

- 상태: preview release candidate, production 미출시
- 저작: 프로젝트 자체 저작
- 범위: 듣기 12문항, 읽기 12문항
- 최종 검토일: 2026-07-19
- 작성 검수: JLPT-TOPIK Study original-content review
- 2차 한국어 검수: JLPT-TOPIK Study Korean-language QA
- 라이선스: `LicenseRef-nihongo-n3-topik-original`

## 목적

이 문제은행은 영어 설명을 사용하는 TOPIK I 입문 학습자의 현재 기초를 확인하기 위한
짧은 배치 진단이다. 공식 TOPIK 점수를 예측하거나 공식 시험을 재현하지 않는다.

## 저작 원칙

1. 공식 기출 문항, 정답, 듣기 음원을 복제하지 않는다.
2. 듣기 대본과 읽기 문항은 일상적인 초급 한국어 상황을 바탕으로 자체 저작한다.
3. 공개 문제 DTO에는 정답과 해설을 포함하지 않는다. 제출 뒤에만 채점 결과를 반환한다.
4. 듣기 고정 음원이 승인되기 전에는 명시적인 한국어 브라우저 음성 fallback만 사용한다.
5. 결과는 `starter`, `foundation`, `ready` 학습 밴드이며 공식 급수 판정이 아니다.

## 검증 계약

| 항목 | 기준 |
| --- | ---: |
| 듣기 | 12 |
| 읽기 | 12 |
| 보기 수 | 문항당 4 |
| 빈 prompt/정답/해설 | 0 |
| 중복 ID/prompt | 0 |
| 서로 다른 2개 검수 역할 | 100% |
| 정답 index 범위 오류 | 0 |
| 정답 위치 분포 | 1~4번 각 6문항 |

문항 본문과 정답은 `packages/db/src/seed/topik-placement-bank-v2.ts`가 단일 소스다.
manifest는 이 문서 checksum과 문항 checksum을 결합해 content version을 생성한다.
