# TOPIK I/II 자체 저작 학습 문제은행 V1

- 기준일: 2026-08-09 KST
- 상태: repository practice source. remote 공개 여부는 content release contract와 runtime query로 결정
- 저작: 프로젝트 자체 저작
- 범위: TOPIK I 듣기 6·읽기 6, TOPIK II 듣기 6·쓰기 4·읽기 6
- 작성 검수: JLPT-TOPIK Study self-authored content review
- 2차 언어 검수: JLPT-TOPIK Study Korean and Japanese-language QA
- 최종 검토일: 2026-07-20
- 라이선스: `LicenseRef-nihongo-n3-topik-original`

## 목적과 경계

이 문제은행은 일본인 학습자를 포함한 한국어 학습자가 TOPIK I/II의 **영역 구성**에 맞춰
기초·중급 학습을 연습하도록 만든 자체 저작 콘텐츠다. 국립국제교육원 시험의 공식 점수
판정, 기출문항, 정답지, 듣기 음원을 재현하거나 대체하지 않는다.

공개 시험 구조 참고: [Study in Korea TOPIK 안내](https://www.studyinkorea.go.kr/eng/plan/examAndKoreanStudy.do).
TOPIK I는 듣기·읽기, TOPIK II는 듣기·쓰기·읽기 영역으로 모델링한다. 이 문서는 형식
참고의 출처만 기록하며, 개별 문항은 모두 프로젝트에서 새로 작성했다.

## 검수 계약

| 항목 | 기준 |
| --- | ---: |
| TOPIK I 듣기 / 읽기 | 6 / 6 |
| TOPIK II 듣기 / 쓰기 / 읽기 | 6 / 4 / 6 |
| 빈 한국어·일본어·영어 prompt/해설 | 0 |
| 객관식 보기 | 문항당 4개 |
| 쓰기 문항 | 정답 index 없음, 자체 작성 예시·자기 점검 기준 있음 |
| 중복 ID/prompt | 0 |
| 서로 다른 2개 검수 역할 | 100% |
| 공식 기출·정답·음원 복제 | 0 |

문항 본문, 해설, 듣기 대본은 `packages/db/src/seed/topik-practice-bank.ts`가 단일
기계 판독 소스다. 이 문서 checksum과 문항 checksum을 합쳐 content version을 생성한다.
공개 API는 정답을 제외한 문제만 반환하고, 해설 확인 요청 뒤에만 자체 저작 정답·해설을
반환한다.
