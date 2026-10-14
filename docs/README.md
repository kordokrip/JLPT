# JLPT · TOPIK 문서

현재 작업: [입체형 UI·계정 개인화 구현](00_overview/UNIFIED_FRONTEND_DESIGN_2026-10-14.md). 사진·계정 설정·알림·연간 기록 API/화면과 additive0033을 로컬 구현했다. 새 Preview·원격 DB·배포·commit/push는 하지 않았다. 이전 시안/Pages-only 문장은 이력으로 구분한다.

최신 운영은 [2026-10-14 지도 UI 릴리스](00_overview/LEARNING_MAP_RELEASE_2026-10-14.md)다. web887d2b2/Pages2c0fea8d, Worker·DB·콘텐츠는 기존 기준선을 유지한다. 아래10월13일 이하의 미배포 문장은 보존 이력이며 현재 판정으로 사용하지 않는다.

최신 작업 — 2026-10-13: 운영 V7+160 배포는 완료 상태이며, 아래 미배포 문장은 보존된 이전 이력이다. 새 작업은 [학습 지도 UI/UX 개편](00_overview/LEARNING_MAP_UX_2026-10-13.md)의 이미지 개선과 지도·레슨·완료 화면 로컬 구현이다. **프런트엔드를 변경했고 DB·콘텐츠·음성 코어·Production은 변경하지 않았다.** 새 로컬 검사와 운영 기준선은 [현재 상태](00_overview/CURRENT_STATE.md)에서 구분한다.

2026-10-13 후속: 호환 Worker 복귀 변경 승인 뒤 quiz철회guard/0032를 구현해 currentAPI215·호환API200·DB19와 격리409/410·기존학습200·기록hash보존을 확인했다. 현재 운영·a49Preview는변경하지않았다. 이는제한회귀이며새후보전체Preview/rollback/가족/backup/predeploy전Production·push차단은유지한다. 최신세부사항은 [통합 릴리스 기록](00_overview/LEARNING_COHORT_RELEASE_2026-10-13.md)의 승인 후속부터읽는다.

현재 작업 갱신: **2026-10-13**. 사용자가 V7+별도160 전체 검증·조건부 Production·최종 push를 승인했다. a49 local649/reviewed44/기존265pass+30policy skip, Preview600문항/220레슨과 같은 배포 실제 음성·현재 사용자 가청 확인은 완료다. **구Worker 복귀의 철회 퀴즈 P1·원격 전수 미완료·가족 동선 미확인으로 Production/push는 차단**이다. 운영0030/기존릴리스를 유지한다. [통합 릴리스 기록](00_overview/LEARNING_COHORT_RELEASE_2026-10-13.md)이 이번 실행 순서·실제 증적·다음 결정이다. 아래10월12일 local-only는 이전 세션 이력이며 새 승인 범위를 제한하지 않는다.

갱신: 2026-10-12 KST. 운영은9월25일 `0029–0030` 릴리스와 기존 콘텐츠를 유지한다. V7 440문항/220레슨·정식 출판 계약과 별도160 v3를 로컬에서 검증했다. 최종 cohort04 단위614·desktop/mobile Chromium/WebKit44·fresh/upgrade/reseed·격리 공개/철회가 통과했다. 사용자 지시에 따라 로컬 검증·문서화까지만 진행하며 커밋·push·새 Preview·Production은 실행하지 않았다. 실패 이력과 새 결과는 [릴리스 원장](00_overview/LOCAL_RELEASE_LEDGER.md)에서 구분한다.

공식 웹10개와 API5표제어로 사전 증적 부족을 해소했다. source06은86records·220 exact lookup 실패0·source failures0이다. v4/v5/v6 실패를 보존하고 V7은 question/choices/index/sample/cue를 유지한 채 rubric2건과 현지화 해설만 교정했다. A/B 각각440/440 승인, readiness exit0·failures0이며 local staging은200 JLPT·240 TOPIK 문항/220레슨을 비공개 적재했다. 실제 사용자 DB·Preview·배포 완료는 아니다.

## 먼저 읽을 문서

| 목적 | 문서 |
| --- | --- |
| 현재 구현, 데이터 모델, 운영 명령 | [현재 상태](00_overview/CURRENT_STATE.md) |
| 빠른 레슨·개인 XP·스트릭·알림의 9월25일 릴리스 | [개인 학습 UX 변경 기록](00_overview/PERSONAL_LEARNING_UX_2026-09-25.md) |
| 날짜별 릴리스·수정·정리 이력 | [시계열 변경 이력](00_overview/CHANGELOG.md) |
| 현재 오류, 잘못된 판정, 강제 배포 차단 gate | [오류·회귀 차단 원장](00_overview/ERROR_LEDGER.md) |
| 운영 Sub Agent, 버그·리팩터링, 로컬 CI/CD와 Cloudflare 추적 | [운영관리 runbook](00_overview/OPERATIONS_MANAGEMENT_RUNBOOK.md) |
| 로컬 gate, GitHub 비활성 정책, 증적 수명주기 | [로컬 CI/CD 운영 기준](00_overview/LOCAL_CICD_OPERATIONS.md) |
| Sub Agent 전용 로컬 CI/CD 관리 | [로컬 CI/CD 관리 매뉴얼](00_overview/LOCAL_CICD_MANAGEMENT.md) |
| commit·release·rollback 실행 이력 | [로컬 형상관리·릴리스 원장](00_overview/LOCAL_RELEASE_LEDGER.md) |
| 새 Sub Agent의 현재 코드·DB·API 진입점 | [Sub Agent 운영 인수인계](00_overview/SUB_AGENT_HANDOFF.md) |
| 프로젝트 폴더 역할·보존·정리 기준 | [프로젝트 인벤토리](00_overview/PROJECT_INVENTORY.md) |
| 2026-08-23 TOPIK 음성 장애와 수정 검증 | [TOPIK Google 한국어 음성 장애 기록](00_overview/TOPIK_GOOGLE_SPEECH_INCIDENT_2026-08-23.md) |
| 현재 전체 파일 지도·자동 갱신 | [PROJECT_FILE_CATALOG.md](00_overview/PROJECT_FILE_CATALOG.md) |
| 이번 코드·문서 삭제와 교차검증 | [2026-10-10 정리 기록](00_overview/REPOSITORY_MAINTENANCE_2026-10-10.md) |
| 현재 안내에서 분리한 과거 배포 전 상태 | [9월25일 종료 스냅샷](history/CURRENT_STATE_2026-09-25.md) |
| 2026-08-23 N2/N1·TOPIK Batch 6 Preview 릴리스 | [다음 콘텐츠 증량 릴리스 기록](00_overview/NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md) |
| 콘텐츠 수와 원본-시드 대응 | [콘텐츠 감사](00_overview/CONTENT_AUDIT.md) |
| 원본 파일과 seed 소유자 | [학습 원본 지도](00_overview/00_source_map.md) |
| 교육 단위와 확장 원칙 | [커리큘럼 설계](00_overview/CURRICULUM_BLUEPRINT.md) |
| 다음 우선순위 | [로드맵](ROADMAP.md) |
| 매일 학습 UX·세션·기록의 구현 계약과 후보 검증 | [학습 경험 구현 계획](00_overview/LEARNING_EXPERIENCE_PLAN.md) |
| 220레슨·440문항·네 메뉴 후보와 품질 차단/다음 실행 | [콘텐츠·가족 UX 구현 기록](00_overview/CONTENT_LEARNING_UX_UPDATE_PLAN.md) |
| 문제은행 품질과 release gate | [JLPT·TOPIK 문제은행 품질 파이프라인](00_overview/QUESTION_BANK_QUALITY_PIPELINE.md) |
| 출처·라이선스·오디오 증적 | [Attributions](ATTRIBUTIONS.md) |

## 문서의 역할

- **01_n5~03_n3, 04_supplement, 05_n2, 06_n1, 07_topik**은 콘텐츠 원본이다. seed parser가 읽는 형식과 항목 본문은 코드 변경 없이 재구성하지 않는다.
- **00_overview**와 이 파일은 운영 문서다. 구현·마이그레이션·검증 명령이 변하면 같은 변경에서 갱신한다. 날짜별 incident·release 기록은 당시 증적이며 현재 미완료 지시로 읽지 않는다.
- **history**는 현재 상태에서 분리한 과거 문서다. 현재 배포와 작업 순서는 `CURRENT_STATE`가 우선한다.
- 완료된 2026-07-29~08-19 이관 문서는 제거했다. canonical source 말미의 과거 활용 메모는 manifest checksum 입력이므로 별도 source release와 parser 회귀 테스트 없이 제거하지 않는다.
- 날짜 없는 문서는 계속 갱신되는 운영 기준이고, 날짜가 붙은 incident·release·maintenance 문서는 완료 시점의 불변 증적이다. `v1` 콘텐츠 문서도 seed가 직접 읽으면 삭제하지 않는다.

## 최소 검증

~~~sh
pnpm docs:catalog
pnpm docs:check
pnpm ops:verify
pnpm -F @nihongo-n3/db content:next:quality
pnpm -F @nihongo-n3/db verify:audio:provenance
~~~

운영 기준선 점검은 다음 명령을 사용합니다.

~~~sh
pnpm ops:status
pnpm ops:status:remote
~~~

학습 발음은 같은 언어의 Google 브라우저 음성을 우선하고, 없으면 같은 언어의 기기 음성을 사용한다. R2는 발음 저장·재생·fallback에 사용하지 않으며 report/evidence 버킷과 분리한다.
