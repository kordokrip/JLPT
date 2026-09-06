# TOPIK Placement Bank v1

- 기준일: 2026-08-09 KST
- 트랙: `topik-ko`
- 상태: v1 compatibility/검증 source; 현재 placement API bank version은 v2
- 콘텐츠 버전: `topik-placement-v1`
- 원천: `nihongo-n3` 자체 저작
- 라이선스: `LicenseRef-nihongo-n3-topik-original` (저장소 내 학습 서비스용)
- 작성 검수: `nihongo-n3 original-content review`
- 2차 언어 검수: `nihongo-n3 Korean-language QA`
- 최종 검토일: 2026-07-17

## 사용 범위

이 자료는 TOPIK I 진입 수준 placement 흐름과 데이터 검증을 위한 최소 문제은행이다.
TOPIK의 공식 문제, 정답지, 음원, 점수 환산표를 복제하거나 대체하지 않는다. 실제
공개 여부는 이 문서의 상태 문구가 아니라 D1 release contract와 API 조회 결과로 결정한다.
현재 placement API는 v2의 listening 12 + reading 12, 총 24개 released question이 있어야
시작한다. 이 v1 source는 12개의 어휘·문법·독해 검증 question을 보존한다.

## 검수 계약

각 문항은 다음 항목을 가진다.

1. 한국어 prompt와 영어 설명
2. 선택지, 정답 index, 난이도, TOPIK section/skill 분류
3. 자체 저작 source code와 작성·2차 검수 역할
4. 빈 뜻·정답·해설, 중복 ID/prompt, FK, manifest checksum 불일치 0건 검증

문항 본문은 실행 가능한 데이터 정의
`packages/db/src/seed/topik-placement-bank.ts`가 단일 소유한다. 이 문서는 출처와
검수 범위를 사람이 검토할 수 있게 고정하는 provenance 문서다.
