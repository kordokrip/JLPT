# nihongo-n3 프로젝트 상태 보고서

기준일: 2026-07-15 KST
상태: R1 코드 구현·로컬 검증 통과, production 배포 보류

## 현재 상태

| 릴리스 | 코드 | 로컬 검증 | 운영 |
| --- | --- | --- | --- |
| R1 기반 정상화 | 구현 완료 | API/Web/DB/Chromium/WebKit 관문 통과 | prod-v2 미전환 |
| R2 N3 콘텐츠·오디오 | 정책/도구 구현 | 콘텐츠 검증 통과 | 오디오 4,954건 미생성 |
| R3 LearningTrack/TOPIK 기반 | foundation 구현 | Chromium/WebKit 격리 E2E 통과 | TOPIK 콘텐츠 미출시 |

운영 중심은 JLPT N5~N3다. N2/N1은 `wip/n2-n1-content-2026-07-14`에 격리했고, TOPIK은 계정·라우팅·저장소 경계만 제공한다.

## 완료된 변경

- canonical D1 migration 7개와 fresh verification 도입
- 일반 테이블 Blue/Green, backup, restore drill 도구 추가
- runtime DDL 및 remote diff seed 제거
- public/admin OpenAPI 분리와 generated types 추가
- request/release JSON observability와 read-only maintenance 추가
- Google OAuth cross-origin bridge 및 학습 트랙 유지 보강
- account×track IndexedDB/React Query/localStorage namespace 도입
- R2-first audio policy, immutable key, Google batch approval gate 추가
- 52주 기본 과정과 16주 추천 조건 코드화
- CI를 검증과 승인된 production change로 분리

## 최신 검증

```text
pnpm typecheck                         PASS
pnpm -F @nihongo-n3/api test          PASS (78)
pnpm -F @nihongo-n3/web test:run      PASS (33)
pnpm build                             PASS
pnpm audit --audit-level high          PASS (0 known)
pnpm -F @nihongo-n3/db verify:fresh   PASS
pnpm -F @nihongo-n3/db verify:fresh:audio EXPECTED FAIL (4,954 missing)
Playwright Chromium                    PASS (65)
Playwright WebKit                      PASS (51, visual-only 14 skipped)
pnpm verify:ci                         PASS
```

Fresh D1 주요 값:

- migration: 7/7
- vocab: 3,300
- grammar: 316
- kanji: 542
- sentences: 1,112
- sysprog: 82
- curriculum: 52
- FTS parity: vocab 3,300, sentences 1,112
- required fields, duplicates, FK violations: 0
- missing R2 audio keys: 4,954

## 배포 차단

1. GitHub Backup과 CodeQL은 step을 시작하기 전에 billing lock annotation으로 실패하며 Dependency Audit은 수동 비활성 상태다.
2. `nihongo-n3-prod-v2`와 정상 `d1_migrations` ledger를 아직 만들지 않았다.
3. Cloudflare preview 환경 smoke와 production binding 전환 검증이 남았다.
4. R2 오디오 30표본 청감 승인 및 전체 key 생성이 끝나지 않았다.

따라서 이번 상태에서 Workers, Pages, D1 production 변경을 실행하지 않는다.

## 다음 승인 순서

1. 생성 타입 drift 0인 현재 변경을 검토 가능한 commit으로 고정
2. GitHub billing 해제 후 필수 Actions 재실행
3. production environment 승인으로 prod-v2 생성·이전
4. preview 30분 smoke
5. binding cutover 및 24시간 강화 모니터링

세부 내용은 [통합 분석](../PROJECT_ANALYSIS_2026.md), [로드맵](../ROADMAP.md), [Blue/Green runbook](./R1_BLUE_GREEN_RUNBOOK_2026-07-15.md)을 참조한다.
