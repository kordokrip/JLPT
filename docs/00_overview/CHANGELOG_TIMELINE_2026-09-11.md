# JLPT·TOPIK 시계열 변경 이력 (2026-08-09 ~ 2026-09-11)

최종 정리 일시: 2026-09-11 KST

목표: 2026년 8월 이후 현재 기준선에 영향을 준 핵심 변경만 날짜순으로 정리하고,
배포/문서/증거 상태를 한 번에 볼 수 있게 하는 운영용 이력입니다.

## 시계열 요약

| 날짜 | 범위 | 요약 변경 | 증거 상태 |
| --- | --- | --- | --- |
| 2026-08-09 | Production | migration `0000–0001` 기본 수립, 최초 배포 기준선 설정 | Production Worker/Pages/rollback, 백업·rollback 기록 보존 |
| 2026-08-17 | Production | migration `0022–0023`, TOPIK practice v2 300 공개 및 v1 비공개 전환, rollback 대상 갱신 | TOPIK 상태 계산/노출 정합성 gate 및 Production DB verifier 통과 |
| 2026-08-19 | Production | `0024` 활동 이벤트, `0025` 정적 JLPT 문제은행, `0026` release quality 링크, `0027` Google speech 계약, `0028` 학습 경험 기반 스키마 반영 | Production 배포 기준선 생성, `N3 120`, `TOPIK owner Batch5 20`, `TOPIK practice v2 300` published 유지 |
| 2026-08-23 | Preview | N2/N1 각 60문항, TOPIK owner Batch 6(3–6급) 40문항 생성 및 독립 reviewer/validator/quality link 검증 완료, Preview 공개 | Preview worker/Pages source, release job/quality job, FK 및 reseed 일관성 기록 |
| 2026-08-24 | 운영/문서 | 저장소 정리 및 Git-free 운영 절차 정착, 음성 장애 재조사 후 Google 우선 브라우저 음성 재생복구 | `verify:fresh` 및 R2 발음 0건 확인, `verify:remote:audio:r2` 통과 기록 |
| 2026-09-06 | Preview 후보 | `094dfb05` 기준 학습경험 후보(0028 포함 후보) 검증, Preview OAuth 연결/SSO 실제 점검, 160개 콘텐츠는 Preview 한정 공개 | `181 pass/6 skip/0 fail`, OAuth bridge+실사용자 가청 증거 분리 보관 |
| 2026-09-07 | Production / 로컬 CI | 운영 백업·restore drill, TOPIK 상태 교정, R2 발음 0건 유지, 0028 학습경험 정책 반영, Production 가청/음성 정책 사후 확인 후 배포 반영 | `c2901280` Worker, `ce4e5e57` Pages, 39+ artifact 정합성 지점 보존 |
| 2026-09-11 | 로컬 상태 점검 | `pnpm ops:status` 재확인(40/1/0), `pnpm ops:status:remote` 재확인(40/1/11, 네트워크/DNS 실패로 remote read-only 미확인) | 로컬 기준선은 `c2901280/ce4e5e57` 유지, `INC-DATA-024`는 지속 경고로 관리 |
| 2026-09-11 | 운영 정리/정비 | 시계열 문서·CI/CD 운영 문서·전체 파일 인벤토리 정리, `scripts/fsrs-optimizer-service.example.mjs` 무참조 확인 후 삭제 | `pnpm ops:status` `40/1/0`, `docs:check` 통과, 삭제 파일 교차참조 0건 확인 |

## 상태 기준선(현재 운영 반영)

- Migration: `0000–0028`
- Worker: `c2901280-4c10-4671-bc61-dc262c88c692`
- Pages: `https://ce4e5e57.nihongo-n3.pages.dev` (canonical `https://nihongo-n3.pages.dev`)
- web/Worker source: `a7d5d87946334fe8c7970b8f124853aaba443955`
- content source: `3485c6ef8addda3cd3e209730646c296175cf3c9` / manifest `content-v3-d102868e3d43b9b3c1a4`
- 콘텐츠 공개: TOPIK practice v2 300, JLPT N3 practice 120, TOPIK owner batch5 20, 추가 배치(N2/N1/3–6)는 Preview 공개만

## 이번 파일과 매핑되는 운영 원장/계획 문서

- 실행 이력: [LOCAL_RELEASE_LEDGER.md](LOCAL_RELEASE_LEDGER.md)
- 실시간 상태: [CURRENT_STATE.md](CURRENT_STATE.md)
- 오류 차단/원인: [ERROR_LEDGER.md](ERROR_LEDGER.md)
- 운영 Runbook: [OPERATIONS_MANAGEMENT_RUNBOOK.md](OPERATIONS_MANAGEMENT_RUNBOOK.md)
- 학습 경험 계획: [LEARNING_EXPERIENCE_PLAN.md](LEARNING_EXPERIENCE_PLAN.md)
- 다음 실행 계획: [ROADMAP.md](../ROADMAP.md)

## 교차검증 기록

1. 본 이력은 동일 날짜의 운영 실행 내역을 `CURRENT_STATE.md` → `LOCAL_RELEASE_LEDGER.md` → `ERROR_LEDGER.md` 순으로 대조해 작성했습니다.
2. 2026-09-11 재점검에서는 `pnpm ops:status` 결과와 현재 기준선 문서 ID(source/Worker/Pages/migration)를 동일하게 맞춘 뒤 반영했습니다.

## 다음 확정 작업 구간(현재 기준)

- **기능 추가/리팩터링**: Production 새 변경은 로컬 gate → Preview/실기기 검증 → backup·restore drill → production gate 순서를 모두 통과한 뒤 처리
- **사용성 관찰**: 30개 사용자 세션 또는 D+30 분석에서 `복습→미완료→취약영역` 다음행동 경로, 세션 중단/재개 성공률을 우선 지표로 추가 확인
- **콘텐츠 증량 판단**: N3 50/ TOPIK 완료 10/ FSRS 복습 5가 선행 지표이며, 미달 시에는 증량보다 UX 보강 우선
