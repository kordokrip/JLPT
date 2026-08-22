# JLPT · TOPIK 문서

기준일: 2026-08-23 KST. 이 디렉터리는 학습 원본과 이를 운영하는 기준 문서다. 콘텐츠 수·스키마·API 동작은 문서의 서술보다 코드와 fresh-D1 검증 결과가 우선한다.

## 먼저 읽을 문서

| 목적 | 문서 |
| --- | --- |
| 현재 구현, 데이터 모델, 운영 명령 | [현재 상태](00_overview/CURRENT_STATE.md) |
| 2026-08-23 TOPIK 음성 장애와 수정 검증 | [TOPIK Google 한국어 음성 장애 기록](00_overview/TOPIK_GOOGLE_SPEECH_INCIDENT_2026-08-23.md) |
| 콘텐츠 수와 원본-시드 대응 | [콘텐츠 감사](00_overview/CONTENT_AUDIT.md) |
| 원본 파일과 seed 소유자 | [학습 원본 지도](00_overview/00_source_map.md) |
| 교육 단위와 확장 원칙 | [커리큘럼 설계](00_overview/CURRICULUM_BLUEPRINT.md) |
| 다음 우선순위 | [로드맵](ROADMAP.md) |
| 문제은행 품질과 release gate | [JLPT·TOPIK 문제은행 품질 파이프라인](00_overview/QUESTION_BANK_QUALITY_PIPELINE_2026-08-17.md) |
| 미완료 항목과 시계열 실행 프롬프트 | [시스템 복구·확장 실행 계획](00_overview/EXECUTION_PLAN_2026-08-09.md) |
| 출처·라이선스·오디오 증적 | [Attributions](ATTRIBUTIONS.md) |

## 문서의 역할

- **01_n5~03_n3, 04_supplement, 05_n2, 06_n1, 07_topik**은 콘텐츠 원본이다. seed parser가 읽는 형식과 항목 본문은 코드 변경 없이 재구성하지 않는다.
- **00_overview**와 이 파일은 운영 문서다. 구현·마이그레이션·검증 명령이 변하면 같은 변경에서 갱신한다.
- 날짜가 붙은 과거 조사/프롬프트 문서는 링크 호환을 위해 남긴 이관 안내다. 새 작업의 기준으로 사용하지 않는다.

## 최소 검증

~~~sh
pnpm -F @nihongo-n3/db verify:fresh
pnpm -F @nihongo-n3/db test
pnpm typecheck
pnpm docs:check
~~~

학습 발음은 Google 음성만 사용한다. R2는 발음 저장·재생·fallback에 사용하지 않으며, report/evidence 버킷과는 분리해서 관리한다.
