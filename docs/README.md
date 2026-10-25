# JLPT · TOPIK 문서 안내

갱신: 2026-10-25. 현재 배포·미확인 사항은 [현재 상태](00_overview/CURRENT_STATE.md) 한 곳에서 관리한다. 시작 때 모든 문서를 읽지 않는다.

| 목적 | 문서 |
| --- | --- |
| 변경별 테스트·배포 gate | [CI/CD 기준](00_overview/LOCAL_CICD_OPERATIONS.md), [짧은 실행표](00_overview/LOCAL_CICD_MANAGEMENT.md) |
| 운영·복구·안전한 정리 | [runbook](00_overview/OPERATIONS_MANAGEMENT_RUNBOOK.md) |
| 반복 테스트 계정·안전한 회원 정리 | [QA 계정 운영](00_overview/QA_ACCOUNT_OPERATIONS.md) |
| 모델·인수인계 | [AGENTS](../AGENTS.md), [인수인계](00_overview/SUB_AGENT_HANDOFF.md) |
| 오류 재현·실패 이력 | [오류 원장](00_overview/ERROR_LEDGER.md): 해당 ID만 검색 |
| 계정·요청 보안 보강 후보 | [2026-10-26 보안 검증](00_overview/SECURITY_HARDENING_2026-10-26.md) |
| 날짜별 변경·릴리스 | [변경 이력](00_overview/CHANGELOG.md), [릴리스 원장](00_overview/LOCAL_RELEASE_LEDGER.md) |
| 최신 UI·계정·통계 설계/배포 | [통합 UI 기록](00_overview/UNIFIED_FRONTEND_DESIGN_2026-10-14.md) |
| 세부 페이지 반응형·문자 연습 개선 | [2026-10-25 후보·Preview UI 감사](00_overview/DETAIL_UI_AUDIT_2026-10-25.md) |
| 공개 600문항·220레슨 출판 | [콘텐츠 릴리스](00_overview/LEARNING_COHORT_RELEASE_2026-10-13.md) |
| 콘텐츠 수·출처·검수 | [감사](00_overview/CONTENT_AUDIT.md), [원본 지도](00_overview/00_source_map.md), [품질 계약](00_overview/QUESTION_BANK_QUALITY_PIPELINE.md), [출처](ATTRIBUTIONS.md) |
| 다음 개발 | [로드맵](ROADMAP.md) |
| 구조·파일 찾기 | [코드 분석](../PROJECT_CODEBASE_ANALYSIS.md), [폴더 역할](00_overview/PROJECT_INVENTORY.md), [자동 파일 지도](00_overview/PROJECT_FILE_CATALOG.md) |
| 문서·폴더 정리와 설정 검증 | [유지보수 기록·2026-10-25 후속](00_overview/REPOSITORY_MAINTENANCE_2026-10-14.md) |

## 보존과 역할

- `01_n5`~`07_topik`은 seed/checksum 입력이다. 오래된 v1도 참조가 있으면 삭제하거나 문구를 고치지 않는다.
- 날짜 없는 운영 안내는 현재 기준이다. 날짜별 release/incident/maintenance와 `history`는 당시 증거이며 현재 작업 지시가 아니다.
- 실패 리뷰·출처 hash·배포/복귀 증거를 새 성공으로 덮어쓰지 않는다. 상세 이력은 원장에 두고 현황 문서에 반복 복사하지 않는다.
- 문서/설정 정리: `pnpm docs:catalog`, `pnpm docs:check`, `git diff --check`, 해당 설정 검증, 시작/끝 `pnpm ops:status`. 전체 앱/DB/E2E는 위험 또는 배포에 맞춰 선택한다.
- 음성은 동일 언어 Google 우선·설치 음성 fallback, ko/ja만 허용한다. R2 발음 경로는 금지한다.
