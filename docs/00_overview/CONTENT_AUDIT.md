# 콘텐츠·출처 현재 감사

갱신: 2026-10-14. 다음 수량은 마지막 완료 출판 증거의 기준선이며 이번 문서 정리에서 원격 DB를 재조회한 수량이 아니다. runtime/schema는 [CURRENT_STATE](CURRENT_STATE.md), 출판 증거는 [2026-10-13 릴리스](LEARNING_COHORT_RELEASE_2026-10-13.md).

| 범위 | 공개 기준 |
| --- | --- |
| canonical manifest | 6,501행; 운영 content source3485c6e/manifestd102 고정 |
| JLPT N3 정적 | 120문항: 한자 읽기60·듣기60 |
| TOPIK practice v2 | 300문항: 선택형240·쓰기60, v1은 비공개 보존 |
| V7 레슨 콘텐츠 | JLPT200 + TOPIK240, 220개념·220레슨 |
| 별도 v3 160 | N2 60·N1 60·TOPIK40 |
| TOPIK owner 합계 | 기존140 + 신규280 =420 |
| 신규 통합 출판 | 5 release·600 품질 링크 |

집계 단위가 다르므로 canonical 행, owner unit/item, 레슨, 문항을 더해 총 문제 수로 표시하지 않는다. 기존 학습 기록·canonical·practice v2는 유지했다.

## 품질과 실패 이력

V7 A/B 각각440/440, 별도 v3 A/B 각각160/160의 동결 hash와 공개 증적을 연결했다. 초기 v1·v4–v6 및 구 Preview160/v2의 실패는 보존하며 새 승인으로 편집하지 않는다. 과거 Preview-only 문구는 당시 상태다. 현재 v3 공개와 혼동하지 않는다.

source06은86records·220 exact lookup 실패0, 공식 웹10개와 API5표제어 증거를 포함한다. 구조/source 통과와 의미 검수는 별도다. 자세한 불합격·수정 과정은 [구현 기록](CONTENT_LEARNING_UX_UPDATE_PLAN.md), [릴리스 원장](LOCAL_RELEASE_LEDGER.md)에 있다.

## 유지할 계약

- 문제·보기·해설·예문·청해 대본은 자체 저작. 외부 사전은 표기·읽기·의미 확인용이며 공식 기출/음원은 적재하지 않는다.
- source URL·취득 시각·hash·attribution·조건과 두 독립 검수는 출판 증거에 연결한다.
- 선택지 중복·정답 유일성·분포·다국어·엄격 급수·청해/쓰기 바인딩·공개/철회 gate를 유지한다.
- 0026 release-quality links와 불변 감사 원장을 보존한다.
- 0027 provider google-browser는 호환 명칭이다. 실제 정책은 Google 우선·동일 언어 설치 voice fallback, ko/ja만 허용·R2 발음 금지.
- 원본 Markdown/parser 변경은 content hash가 바뀌므로 문서 정리에 포함하지 않는다.

## 검증 선택

콘텐츠 변경에만 quality/readiness·source/reviewer·fresh/upgrade/reseed·G0–G4를 수행한다. fresh는 현재0033 로컬 schema/seed 재현이지 의미 승인/원격 출판 증거가 아니다. INC-DATA-024에 따라 운영 canonical과 신규 cohort를 별도로 검증한다. [CI 기준](LOCAL_CICD_OPERATIONS.md), [품질 파이프라인](QUESTION_BANK_QUALITY_PIPELINE.md).
