# TOPIK I/II 자체 저작 학습 문제은행 V2

- 기준일: 2026-08-17 KST
- 상태: production 공개 완료. release gate와 원격 verifier·smoke를 통과한 v2만 공개한다.
- 범위: TOPIK I 듣기 60·읽기 60, TOPIK II 듣기 60·읽기 60·쓰기 60 — 총 300문항
- 저작: 프로젝트 자체 저작 (`LicenseRef-nihongo-n3-topik-original`)
- 1차 검수: JLPT-TOPIK Study original-item author review
- 2차 검수: JLPT-TOPIK Study adversarial Korean/Japanese/English QA
- 음성 정책: 듣기 대본은 브라우저 Google 음성 합성용 텍스트일 뿐이다. R2 발음 파일의 생성·저장·재생·fallback은 금지한다.

## 목적과 경계

이 문서는 TOPIK I/II의 공개적인 영역 구성을 학습 흐름으로만 참고한, 개인 학습용
자체 저작 문제은행의 provenance 문서다. 공식 시험 문제, 정답지, 지문, 듣기 음원,
상용 교재의 문항을 복제·수집·저장하지 않는다. 각각의 prompt, 듣기 대본, 선택지,
해설, 쓰기 예시는 프로젝트에서 새로 작성한다.

외부 언어 자료가 필요한 경우에는 표기·읽기·의미 같은 언어 사실과 라이선스
메타데이터만 source-intake 절차로 확인한다. 원문 문장이나 시험형 문제를 이
문제은행으로 가져오지 않는다.

## V2 품질 계약

| 영역 | 유형 | 문항 수 | 정답 위치 |
| --- | --- | ---: | --- |
| TOPIK I 듣기 | 4지선다 | 60 | 0·1·2·3 각 15 |
| TOPIK I 읽기 | 4지선다 | 60 | 0·1·2·3 각 15 |
| TOPIK II 듣기 | 4지선다 | 60 | 0·1·2·3 각 15 |
| TOPIK II 읽기 | 4지선다 | 60 | 0·1·2·3 각 15 |
| TOPIK II 쓰기 | 자유 서술 | 60 | 정답 index 없음 |

`packages/db/src/seed/topik-practice-bank-v2.ts`가 단일 기계 판독 소스다. 이
문서의 SHA-256과 문제 배열의 SHA-256을 함께 manifest에 기록한다. 각 문항은
한국어·일본어·영어 prompt/정답/해설, 고유한 ID·prompt, 서로 다른 두 검수 역할,
유효한 난이도와 선택지 계약을 가져야 한다.

쓰기 문항은 선택지와 정답 index를 갖지 않으며, 한·일·영으로 의미 있는 예시 답안을
제공한다. 듣기 문항은 한글 자체 저작 대본만 가지며 `audio_r2_key`는 항상 `NULL`이다.

## 공개 전 차단 기준

다음 중 하나라도 실패하면 v2는 draft 상태를 유지하고 공개하지 않는다.

1. 다섯 영역이 정확히 각 60문항이며 총 300문항인지
2. 객관식의 네 선택지가 모두 고유하고, 정답 위치가 각 15개인지
3. 필수 한·일·영 필드, 설명과 정답의 대응, 쓰기 예시가 비어 있지 않은지
4. 중복 ID·prompt·R2 키·동일 검수자 쌍이 없는지
5. source evidence hash, validator 버전, 자동 검사, 두 검수 판정, release 상태를 포함한 audit ledger가 생성되는지

v2 seed plan은 같은 track의 v1 `topik_practice_questions`만 `is_published=0`으로
전환한 뒤 v2를 `is_published=1`로 upsert한다. 이 문서는 배포 승인을 대체하지 않으며,
실제 원격 반영과 rollback 증적은 문제은행 품질 파이프라인 문서에서 관리한다.

## 2026-08-17 production 기록

`nihongo-n3-prod-v2`에 migration 0022~0023, canonical seed, placement v2와 이
practice v2 seed를 적용했다. `nihongo-n3-api` Worker version
`693837d0-70e0-40b7-9f7e-72487321b6f7`가 `bank_version=v2`만 반환한다. v1은 보존되나
공개되지 않는다. D1 backup/restore drill, 300문항 원격 verifier, 전체 문제은행 감사,
R2 발음 참조 0건, Worker/Pages smoke가 모두 통과했다.
