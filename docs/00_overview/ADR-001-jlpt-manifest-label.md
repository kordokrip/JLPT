# ADR-001: JLPT specialized batch manifest label 유지

**상태:** Accepted  
**날짜:** 2026-08-09 KST  
**결정자:** 저장소 소유자 / 유지보수 엔지니어

## 맥락

`content-manifest.ts`의 `SeedTable` 값 `n2_curriculum`은 N2뿐 아니라 N1의 자체 저작 multi-table batch에도 쓰인다. 이름은 현재 범위보다 좁지만 D1의 물리 테이블 이름은 아니다. 각 batch는 `vocab`, `grammar`, `kanji`, `sentences`, `reading_passages`, `reading_questions`, stable reference, audio binding에 걸쳐 seed된다.

소비자는 `content-manifest.ts`의 seed definition, `seed/verify.ts`의 batch-owned stable-ref row count, `verify-n2-local-fixture.ts`의 specialized-source 제외, `content-release-contract.test.ts`뿐이다. API route, D1 schema/migration, JLPT/TOPIK 사용자 progress·FSRS record는 이 label을 읽지 않는다. 따라서 이 label을 바꾸기 위해 사용자 학습 이력이나 D1 schema를 migration할 근거는 없다.

## 결정

manifest schema v3에서는 `n2_curriculum` 값을 **역사적 호환 label**로 유지한다. 의미는 “N1/N2 모두에 쓰일 수 있는 multi-table 자체 저작 JLPT batch”이며 D1 table 또는 N2 전용 분류가 아니다.

새 JLPT batch는 이 label을 사용할 수 있으나, 코드 주석과 원본 문서에서 N2 전용이라고 설명하지 않는다. `SeedTable`의 설명을 이 의미로 정정한다. 현재 manifest JSON의 `table` 값, schema version, stable ref, source checksum, seed report와 사용자 SRS/progress는 변경하지 않는다.

## 검토한 선택지

### A. 현 historical label 유지 — 선택

| 기준 | 평가 |
| --- | --- |
| 구현 복잡도 | 낮음 |
| 호환성 위험 | 없음 |
| 운영 비용 | 없음 |
| 표현 정확도 | 이름은 좁지만 주석/ADR로 보완 |

장점: 현재 manifest consumer와 검증 report가 그대로 유지되고, rollback은 문서·주석 revert만으로 가능하다.

단점: 신규 기여자가 이름만 보고 N2 전용으로 오해할 수 있다.

### B. `jlpt_curriculum` 새 label과 v3 compatibility reader 추가

| 기준 | 평가 |
| --- | --- |
| 구현 복잡도 | 중간 |
| 호환성 위험 | 중간 |
| 운영 비용 | manifest consumer를 두 의미로 유지 |
| 표현 정확도 | 높음 |

장점: 새 JSON은 일반 JLPT 범위를 정확히 표현한다.

단점: schema version, verifier, test fixture, report consumer를 동시에 versioning해야 하며 기존 artifact를 해석하는 compatibility reader가 필요하다. 현재 내부 consumer 수와 확장 빈도에서는 이득보다 복잡도가 크다.

### C. storage schema까지 일반화

| 기준 | 평가 |
| --- | --- |
| 구현 복잡도 | 높음 |
| 호환성 위험 | 높음 |
| 운영 비용 | migration·rollback·데이터 검증 필요 |
| 표현 정확도 | 높음 |

장점: 장기적으로 더 일반적인 storage 이름을 쓸 수 있다.

단점: `n2_curriculum`은 물리 테이블이 아니므로 해결할 storage 문제가 없다. 불필요하게 content row ID, stable ref 소유 관계, 사용자 학습 이력의 회귀 위험을 만든다.

## 결과와 rollback 경계

- 새 N1/N2 batch는 동일한 specialized verifier를 사용한다.
- fresh D1은 stable reference 소유 기준으로 batch row count를 검증한다.
- rollback은 ADR와 주석만 되돌리면 된다. D1 migration, seed data 삭제, user progress/FSRS 변경은 없다.
- Option B는 외부 manifest consumer가 생기거나 N3 이하도 동일 multi-table batch model로 전환될 때만 새 ADR로 재검토한다.

## 검증

`pnpm -F @nihongo-n3/db verify:fresh`는 local D1에서 N2-A1~A5와 N1-A1~A4의 source checksum·stable ref·row count를 확인한다. `content-release-contract.test.ts`는 두 레벨이 모두 `n2_curriculum` historical label을 유지함을 명시적으로 회귀 검증한다.
