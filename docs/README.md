# JLPT · TOPIK 문서

기준일: 2026-09-06 KST. 이 디렉터리는 학습 원본과 이를 운영하는 기준 문서다. 콘텐츠 수·스키마·API 동작은 문서의 서술보다 코드와 fresh-D1 검증 결과가 우선한다. `0028`과 새 학습 UX는 전용 Preview에서 검증 중이며 기존 Production과 구분한다.

## 먼저 읽을 문서

| 목적 | 문서 |
| --- | --- |
| 현재 구현, 데이터 모델, 운영 명령 | [현재 상태](00_overview/CURRENT_STATE.md) |
| 현재 오류, 잘못된 판정, 강제 배포 차단 gate | [오류·회귀 차단 원장](00_overview/ERROR_LEDGER.md) |
| 운영 Sub Agent, 버그·리팩터링, 로컬 CI/CD와 Cloudflare 추적 | [운영관리 runbook](00_overview/OPERATIONS_MANAGEMENT_RUNBOOK.md) |
| 로컬 gate, GitHub 비활성 정책, 증적 수명주기 | [로컬 CI/CD 운영 기준](00_overview/LOCAL_CICD_OPERATIONS.md) |
| commit·release·rollback 실행 이력 | [로컬 형상관리·릴리스 원장](00_overview/LOCAL_RELEASE_LEDGER.md) |
| 새 Sub Agent의 현재 코드·DB·API 진입점 | [Sub Agent 운영 인수인계](00_overview/SUB_AGENT_HANDOFF.md) |
| 2026-08-23 TOPIK 음성 장애와 수정 검증 | [TOPIK Google 한국어 음성 장애 기록](00_overview/TOPIK_GOOGLE_SPEECH_INCIDENT_2026-08-23.md) |
| 2026-08-23 N2/N1·TOPIK Batch 6 Preview 릴리스 | [다음 콘텐츠 증량 릴리스 기록](00_overview/NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md) |
| 콘텐츠 수와 원본-시드 대응 | [콘텐츠 감사](00_overview/CONTENT_AUDIT.md) |
| 원본 파일과 seed 소유자 | [학습 원본 지도](00_overview/00_source_map.md) |
| 교육 단위와 확장 원칙 | [커리큘럼 설계](00_overview/CURRICULUM_BLUEPRINT.md) |
| 다음 우선순위 | [로드맵](ROADMAP.md) |
| 매일 학습 UX·세션·기록의 구현 계약과 후보 검증 | [학습 경험 구현 계획](00_overview/LEARNING_EXPERIENCE_PLAN.md) |
| 문제은행 품질과 release gate | [JLPT·TOPIK 문제은행 품질 파이프라인](00_overview/QUESTION_BANK_QUALITY_PIPELINE.md) |
| 출처·라이선스·오디오 증적 | [Attributions](ATTRIBUTIONS.md) |

## 문서의 역할

- **01_n5~03_n3, 04_supplement, 05_n2, 06_n1, 07_topik**은 콘텐츠 원본이다. seed parser가 읽는 형식과 항목 본문은 코드 변경 없이 재구성하지 않는다.
- **00_overview**와 이 파일은 운영 문서다. 구현·마이그레이션·검증 명령이 변하면 같은 변경에서 갱신한다.
- 완료된 2026-07-29~08-19 이관 문서는 제거했다. canonical source 말미의 과거 활용 메모는 manifest checksum 입력이므로 별도 source release와 parser 회귀 테스트 없이 제거하지 않는다.
- 날짜 없는 문서는 계속 갱신되는 운영 기준이고, 날짜가 붙은 incident·release·maintenance 문서는 완료 시점의 불변 증적이다. `v1` 콘텐츠 문서도 seed가 직접 읽으면 삭제하지 않는다.

## 최소 검증

~~~sh
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
