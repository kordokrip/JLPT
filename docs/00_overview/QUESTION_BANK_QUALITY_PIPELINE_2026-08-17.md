# JLPT·TOPIK 문제은행 품질 파이프라인

기준일: 2026-08-17 KST. 이 문서는 현재 코드·fresh D1·preview·production 교차 검증과 검사 artifact를 기준으로 한다. v2의 원격 release gate는 모두 통과했고 production 반영까지 완료됐다.

## 완료한 교정

- 영상에서 확인한 TOPIK practice v1의 객관식 24개 전부 `answer_index=0` 결함을 회귀 검사로 고정했다.
- 자체 저작 TOPIK practice v2를 300개 만들었다. TOPIK I 듣기·읽기와 TOPIK II 듣기·읽기는 각 60개 4지선다이며, 각 영역의 정답 위치는 정확히 `15/15/15/15`다. TOPIK II 쓰기 60개는 서술형이라 정답 index가 없다.
- v2 seed는 v1 행을 삭제하지 않고 `is_published=0`으로 전환한 뒤 v2만 공개한다. runtime API도 `bank_version=v2`만 반환한다.
- 새 `content_quality_audits` ledger는 evidence SHA-256, validator version, 자동 검사, 작성·독립 검수자, release state를 기록한다. `approved`/`published`는 통과한 자동 검사와 서로 다른 두 검수자의 signed 판정 없이는 DB trigger가 거부한다.
- JLPT 정적 독해는 seed 후 level·immutable row id 순서로 올바른 선택지를 0→3 위치로 회전한다. 지문·질문·해설·정답 의미는 바꾸지 않는다. 동적 JLPT 퀴즈도 한 요청 안에서 같은 회전 규칙을 사용한다.

## 교차 검증 결과

새 D1에 migration 0000~0023, 전체 canonical seed, TOPIK v2 seed를 순서대로 적용했다. 읽기와 placement/practice를 읽기 전용 validator로 다시 대조한 결과는 다음과 같다.

| 범위 | 객관식 수 | 정답 위치 | 결과 |
| --- | ---: | --- | --- |
| JLPT N1 독해 | 20 | 5 / 5 / 5 / 5 | 통과 |
| JLPT N2 독해 | 38 | 10 / 10 / 9 / 9 | 통과 |
| JLPT N3 독해 | 10 | 3 / 3 / 2 / 2 | 통과 |
| TOPIK v2 선택형 전체 | 240 | 60 / 60 / 60 / 60 | 통과 |
| TOPIK v2 네 선택형 영역 | 각 60 | 각 15 / 15 / 15 / 15 | 통과 |

전수 artifact는 `.artifacts/db/question-bank-quality-full-fresh-2026-08-17.json`, TOPIK 전용 fresh verifier 결과는 `.artifacts/db/topik-practice-v2-verification-2026-08-17.json`에 생성한다. placement v2까지 함께 seed한 최종 fresh D1은 객관식 332개, 실패 0건을 확인했다. artifact는 재실행 산출물이며 source-of-truth는 아니다.

## 역할과 source 경계

1. **Source curator**는 라이선스·URL·취득 시각·hash·attribution이 검증된 언어 사실만 intake artifact로 기록한다.
2. **Item author**는 그 사실을 바탕으로 새 문항·지문·선택지·해설을 작성한다.
3. **Adversarial reviewer**는 정답 유일성, 오답의 비중복, 번역과 해설의 대응을 독립적으로 확인한다.
4. **Release steward**는 모든 artifact와 test가 통과했을 때만 D1/Worker/Pages release를 실행한다.

외부 사전·코퍼스·공식 사이트는 표기·읽기·뜻과 공개 시험 구조를 확인하는 데만 쓴다. 공식 JLPT/TOPIK 문항·정답·지문·음원 및 상용 교재 문항은 가져오지 않는다.

## 프로젝트 스킬

- `.codex/skills/learning-source-intake` — fact-only source intake와 라이선스/attribution/hash 검증
- `.codex/skills/question-bank-quality` — 다국어 필드, 중복, 정답 위치, 두 reviewer, R2 금지 검사
- `.codex/skills/content-release-automation` — local → preview → backup/restore → remote verifier → production → smoke/rollback evidence gate

각 스킬에는 역할 메타데이터, 결정적 검사 스크립트, reference 계약이 있다. release skill은 증적을 검사할 뿐 단독으로 production 변경을 승인하지 않는다.

## 발음 정책

발음은 브라우저의 Google 음성만 사용한다. R2는 발음 데이터의 수집·생성·저장·재생·fallback 대상이 아니며, v2 listening 행의 `audio_r2_key`는 항상 `NULL`이다. report/evidence 용도와 무관한 R2 버킷은 이 발음 정책의 삭제 대상이 아니다.

## 2026-08-17 production release 결과

- D1 `nihongo-n3-prod-v2`: migration 0022~0023, canonical seed, TOPIK placement v2와 practice v2 적용 완료
- practice: v2 300문항 공개, historical v1 28문항은 보존·비공개
- JLPT static reading: N1 `5/5/5/5`, N2 `10/10/9/9`, N3 `3/3/2/2`
- Worker: `nihongo-n3-api` version `693837d0-70e0-40b7-9f7e-72487321b6f7`; Pages static deployment는 변경하지 않고 기존 production을 유지
- 보호: `.artifacts/d1-backups/topik-v2-2026-08-17/manifest.json` backup과 23-table restore drill 통과
- 배포 뒤: TOPIK verifier, R2 pronunciation reference 0, Worker 7/7 smoke, Pages auth proxy smoke 통과

## release gate 순서

1. source intake, 자체 저작, 자동 validator, 서로 다른 두 reviewer artifact를 확인한다.
2. full fresh D1, API/web test, Chromium·WebKit E2E, Google-only/R2=0 검사를 통과한다.
3. preview D1 verifier를 통과한다.
4. D1 backup과 restore drill, 이전 Worker/Pages version을 rollback plan에 기록한다.
5. migration 0022~0023, canonical seed, TOPIK v2 seed를 원격에 적용한 뒤 remote verifier·API/Pages smoke를 통과한다.
6. 하나라도 실패하면 production 반영을 중단하고 직전 D1 backup과 Worker/Pages version으로 되돌린다.
