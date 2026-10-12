# 다음 개발·운영 계획

갱신: 2026-10-12 KST. 현재 운영은 9월25일 quick/daily·개인 보상·알림 릴리스다. 구현·배포 값은 [현재 상태](00_overview/CURRENT_STATE.md), 완료된 날짜별 변경은 [CHANGELOG](00_overview/CHANGELOG.md), 실행 증거는 [릴리스 원장](00_overview/LOCAL_RELEASE_LEDGER.md)에 둔다.

## 운영 안정화

1. `INC-DATA-024`: 콘텐츠 SHA·manifest·실제 seed run을 명시하는 표준 원격 검증 인터페이스를 정리한다. 현재 immutable source를 고정해 검증하며 운영 재시드로 HEAD 차이를 지우지 않는다.
2. 현재0030/72-table profile의 새 백업과 restore drill을 마련한다. 9월25일0028/70개 백업은 migration 이후 새 보상/알림 기록을 포함하지 않는다. 운영 export 점검은 해당 작업의 승인·정지 범위를 확인한다.
3. 실제 사용의7/30일 activity·세션·최초 응답·FSRS·speech 결과를 읽기 전용으로 관찰한다. 자동 lifecycle과 사람 가청은 별도 증거다.
4. Legacy DB 열·테이블은 source cleanup과 구분해 별도 migration·upgrade/fresh·backup 검증을 설계한다. 현재 문서 정리로 삭제하지 않는다.

## 개인 학습 UX

오늘에서 한 번 눌러 quick/daily 시작·재개하고 기록을 이해하는 흐름은 출시했다. 다음 개선은 실제 사용의 이탈·중단·오답을 근거로 선정한다. 자유 TOPIK practice의 client activity를 서버 확정 스트릭으로 승격하려면 채점·저장·재전송 계약을 먼저 설계한다.

승인된 문제↔개념 링크와 새 교육 번역·연상 설명은 독립 검수 후 공개한다. 기존 영어 교육 내용을 일본어 조작 UI 번역 완료와 혼동하지 않는다. 학습 진입 시간·실제 재개 성공률·힌트 사용은 아직 추가 계측이 필요한 지표이며 과거 기록에서 추정해 채우지 않는다.

## 콘텐츠 후보

10월12일 V7 정규 publisher/verifier의 최종 local runner(cohort04)는 단위614/E2E44·fresh/upgrade/reseed·local G0–G4 공개/재실행/철회·12종 합성 기록 불변을 통과했다. 별도160 v3도 두160승인·quality·543 draft행/reseed·쓰기8/듣기8 binding을 확인했다. 현재 사용자 범위는 **로컬 검증·문서화뿐**이므로 commit·push·새Preview·Production은 진행하지 않는다.

후속은 별도 승인 범위 확인 → 후보 고정/새Preview에서V7과160의 독립 control-plane/evidence → 실제 계정11급수·가족 동선 → 같은 배포의Chrome ko/ja onend·가청·Network R2/legacy0 → 현schema backup/restore·rollback/predeploy → 현재Production 승인이다. 기존160/v2 및V4–V6의 실패와 cohort01–03 실패는 보존한다. 완전 맹검·가족/가청·실사용자 기록 보존을 local/mock 결과로 주장하지 않는다.

| 후보 | 준비 범위 | 운영 상태 |
| --- | --- | --- |
| JLPT N2 정적 practice v1 | 기존60문항, 4모드×15 | 기존Preview에만 존재·재검수실패/승격금지 |
| JLPT N1 정적 practice v1 | 기존60문항, 같은 계약 | 기존Preview에만 존재·재검수실패/승격금지 |
| TOPIK owner Batch6 | 기존3–6급40항목 | 기존Preview에만 존재·재검수실패/승격금지 |
| 별도 Preview160 v3 | 새N2/N1 각60·TOPIK40, 두승인·품질·local binding/reseed | 로컬 draft, 원격control-plane/publication 미실행 |

현재 공개 canonical N2/N1과 이 정적 문제은행 후보를 구분한다. 첫 증량은 확정 정책에 따라 사용량 임계값과 별개로 품질 gate를 적용하지만, 새 source의 Preview·실제 양언어 음성·backup/restore·G0–G4·승인·postdeploy를 다시 확보해야 한다. 과거 Preview 통과를 새 후보 완료로 옮기지 않는다.

배포 뒤 같은 판정 시점 최근30일 N3 최초 응답50·TOPIK owner 완료10·TOPIK FSRS 복습5를 운영 참고 지표로 집계한다. 미달이 지속되면 Batch7보다 학습 진입·다음 행동 UX를 우선한다. 이 값은 사용자 화면의 개발 목표로 노출하지 않는다. 상세 후보는 [증량 릴리스 기록](00_overview/NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md)을 따른다.

## 개발·릴리스 기준

코드 정리는 호출자·설정·테스트 참조를 교차검증하고 공개 API·학습 데이터·FSRS·음성 계약을 보존한다. 파일 지도는 `pnpm docs:catalog`로 갱신하고 `docs:check`가 stale 목록을 차단한다. 코드 변경과 문서 전용 gate는 [로컬 체크리스트](00_overview/LOCAL_CICD_MANAGEMENT.md)에 분리했다.

새 릴리스는 local gate → Preview → 실제 Chrome·가청·Network → backup/restore → rollback → predeploy → 승인된 변경 → remote verifier/smoke 순서다. 같은 언어 Google 우선·설치 음성 fallback·R2 발음 금지·legacy410을 유지한다. 실패·미실행·skip·mock 결과를 통과로 기록하지 않는다.
