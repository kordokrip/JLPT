# V7·별도160 통합 릴리스 — 2026-10-13

상태: 구현·검증 중. 이 문서의 미실행 항목을 통과로 해석하지 않는다.

## 승인 범위와 보존

사용자가 V7 440문항/220레슨, 별도160 v3, 네 메뉴 UX의 최종 검증·Production·동일 branch의 일반 push를 조건부 승인했다. 기존191개 미커밋 변경·동결본·불합격 리뷰를 보존한다. 과거 로컬-only 범위는 이번 승인 이전 이력이다.

canonical 6,501행·TOPIK practice v2·기존 학습/FSRS/XP/메모와 운영 OAuth를 변경하지 않는다. 음성 코어4파일은 수정하지 않는다. Google 우선·동일 언어 설치 음성 fallback·ko/ja 제한·R2 발음 금지다.

## 새로 확인한 기준선

2026-10-13 KST의 원격 읽기 전용 조회:

| 대상 | 확인 |
| --- | --- |
| Production D1 | `nihongo-n3-prod-v2`, ledger31/latest0030, 0031=0, rows_written0 |
| Preview D1 | `nihongo-n3-topik-preview`, ledger31/latest0030, 0031=0, rows_written0 |
| Production Worker | `aedcbd40-6605-44d2-8227-d145a186bef0`, maintenance off |
| Production Pages | `f62a8bdb-298e-446a-ab74-7d78ca47efd8`, Production branch `main` |
| 실제 앱 source | `032b50ddfea4051309ae95829520e6309e67a6ff` |
| 시작 로컬 ops | 39 pass / 2 warning / 0 fail; dirty191/manifest drift |

원격 baseline은 `.artifacts/operations/learning-release-2026-10-13/baseline-cohort01.json`에 비밀값 없이 보존했다. 이 조회는 새 Preview·가청·가족·배포 증거가 아니다.

## 구현 계약

- `learning-cohort-600-2026-10-13`의5개 release만 공개/철회한다. 기존 Preview-only CLI의 Production 거부는 유지하고 새로운 strict-target CLI를 별도로 둔다.
- coordinator의 단일 UPDATE와 DB trigger cascade로5개를 같은 SQL statement에서 전환한다. 다른 release의 직접 부분 공개는 거부한다.
- 기존 `0031`은 아직 원격 미적용인 것을 확인하고 additive nullable seal/group 열을 보강한다. 이미 적용됐다면 수정 금지·후속 migration으로 분리한다.
- V7과160의 원본 hash/실제 두 리뷰는 각각 유지한다. 출판 authorization과 실행 후 verification receipt는 서로 다른 증적이다.
- `stage/publish/verify/withdraw`는 DB/Worker/Pages·config·candidate SHA를 고정한다. 쓰기는 동일 clean worktree와 scope/SHA token을 요구한다.
- Worker 배포는 `--maintenance-mode=off|read-only`가 필수이고 사후 health의 release/mode를 대조한다. 점검 중 queue는 ack/DB 쓰기 없이 batch를 defer한다. 실행 중 workflow·queue delivery의 실제 동결 확인은 별도 필수다.
- `d1:restore-drill --exact-schema-upgrade`는 백업 schema 그대로 복원한 뒤 승인된0031만 적용하고 기존 모든 regular table의 원래 열 hash를 대조한다. 운영 원문은 로컬 보호 경로에만 둔다.

## 실행 gate와 현재 결과

| gate | 상태 |
| --- | --- |
| helper 점검 모드/SHA/env | 신규 회귀 최초 실패 보존, 최신 교정 후6/6·독립 반례 차단 |
| queue/cron 점검 | 최초1실패/2통과 보존, 교정 후3/3 |
| strict target |4/4; 실제TOML 포함. 최초 명령/테스트 상대경로 실패를 보존하고 교정 |
| 통합5개 semantic seal·원자성·철회 | 신규23/23·기존V719/19·API208/208, 실제 새 로컬D1 실행·독립 두P1 재검증 통과; synthetic operator gate |
| 시각5개 기준선 검토/최종 전체 E2E | 해당5개만 갱신5/5,44.3초/최종 전체 미실행 |
| 최종 전체 gate·fresh/upgrade/reseed | 미실행 |
| 새 Preview600/220 | 미실행 |
| 별도 원격 복귀 연습 | 미실행 |
| 같은 Preview 실제 가족·Chrome/가청/Network0 | 미실행 |
| 현 schema backup/restore·predeploy | 미실행 |
| Production·최종 push | 미실행 |

이전 readiness의235기능 통과와5시각 실패는 원본으로 보존한다. 이전614단위/44레슨 E2E를 새 변경의 통과로 재사용하지 않는다.

원격 레슨 검사 전용 `remote-reviewed-learning-lessons.spec.ts`는 Production URL을 거부하고 같은 SHA의 공개600/220 receipt를 요구한다. 11급수 전체 목록20개와 급수별 대표1레슨의 시작·제출·재전송·중단/재개·FSRS·기록을 검사한다. 이것을 전체220레슨 화면 인간 검수로 보고하지 않는다. 기존 로컬 전수220 API/대표 화면과 가족 관찰을 별도로 유지한다.

## 순서와 실패 대응

최종 scoped commit/clean worktree → 새 local full gate/기존+레슨 E2E → Preview → 별도 합성 원격 복귀 → 새 Preview 가족/실제 Chrome → 원격 branch 일반 push → 승인된 점검/queue·workflow 동결 → 실제72-table backup → exact restore/0031 upgrade → predeploy →0031/호환 Worker →600 draft/검증 →5개 공개 → remote verifier → Pages → smoke → 점검/큐 원상복구 → 문서 후속 push.

복귀 연습 및 실패 시에는 **5개 철회 → 문항·레슨 공개0 확인 → 직전 실제 Worker source 복귀 → 직전 실제 Pages source 복귀 → 기존 기록/기능 확인** 순서다. 레슨만 숨기거나 화면 flag만 끄는 것은 복귀가 아니다. 공개0 미확인 시 구 Worker로 돌아가지 않는다. 데이터 손상이 없으면 additive schema와 정상 학습 기록을 유지하며 D1 전체 백업을 복원하지 않는다.

철회 환경은 `nihongo-n3-learning-rollback-20261013` 전용 DB/Worker와 `nihongo-n3-learning-rollback` Pages로 분리한다. 운영 사용자 백업·OAuth secret은 복사하지 않는다. 아직 이 자원은 생성하지 않았다.

출시 후 D+1/D+7/D+30에는 두 학습자의 완료·중단·재개·지연 재확인·FSRS·speech를 관찰한다. 월1회 source 버전/부족 영역만 점검하며 자동 공개하지 않는다.
