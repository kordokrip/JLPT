# Sub Agent 운영 인수인계

최종 점검: 2026-08-30 KST

이 문서는 새 Sub Agent가 과거 대화의 완료 보고를 신뢰하지 않고 현재 저장소를 재구성하기 위한 짧은 진입점이다. 상세 수치와 배포 식별자는 반드시 [현재 상태](CURRENT_STATE.md)와 `pnpm ops:status:remote`에서 다시 확인한다.

## 시작 순서

1. 루트 `AGENTS.md`
2. `docs/README.md`
3. `CURRENT_STATE.md`
4. `ERROR_LEDGER.md`
5. `OPERATIONS_MANAGEMENT_RUNBOOK.md`
6. `LOCAL_CICD_OPERATIONS.md`
7. `LOCAL_RELEASE_LEDGER.md`
8. 작업과 직접 관련된 schema, migration, route, source, test

운영 감사·버그·리팩터링·정리에는 `.codex/skills/project-operations-steward`를 사용한다. 콘텐츠 publication에는 `.codex/skills/content-release-automation`도 읽는다.

## 현재 기준선

| 범위 | 현재 사실 |
| --- | --- |
| Production DB | D1 migration `0000–0027`; canonical과 TOPIK practice v2 300, N3 practice 120, TOPIK owner Batch 5까지 공개 |
| Preview 후보 | N2 60, N1 60, TOPIK owner Batch 6 40; Production 미반영 |
| Pages | Production deployment `9cc58a1f-4772-4129-b90d-c819ca20d700`, source `2bd657e96d8a43c6d28efe414acd468c1abd0861` |
| Worker | `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872`, content source `3485c6ef8addda3cd3e209730646c296175cf3c9` |
| 열린 결함 | `INC-DATA-024`; 로컬 수정·Production 미배포 `INC-TOPIK-031`–`INC-AUD-033`. `INC-OPS-035`는 표면별 R2 query로 수정·검증 완료. current HEAD manifest를 Production truth로 사용하지 말고 release-pinned verifier를 사용 |
| CI/CD | GitHub Actions 비활성; 승인된 로컬 gate와 MD 원장이 release evidence |

## 코드·데이터 지도

- `apps/web`: React PWA, Dexie queue, 퀴즈·TOPIK·FSRS UI, Google 우선 동일 언어 browser speech.
- `apps/api`: Cloudflare Worker/Hono, 인증·track guard, 학습 API, OpenAPI source.
- `packages/shared`: Zod API schema, DTO, FSRS와 공통 정책.
- `packages/db`: Drizzle schema, migration `0000–0027`, seed, quality/release verifier.
- `docs/01_n5`–`docs/07_topik`: 코드가 읽는 학습 source-of-truth가 포함된 영역. 삭제 전에 문자열 참조·manifest source·checksum을 대조한다.
- `e2e`: Chromium/WebKit 제품 흐름과 발음의 server/R2 요청 0건 검증.

핵심 데이터 흐름은 `source → deterministic seed → D1 → Worker API → Query/Dexie → UI`다. 사용자 학습 변경은 `quiz/complete → progress 또는 attempt → FSRS → learning_activity_events`의 track 격리를 유지해야 한다.

## 절대 불변 조건

- 발음은 같은 언어의 Google 음성을 우선하고, 없으면 같은 언어의 설치 음성을 사용한다. 한국어 `ko-*`, 일본어 `ja-*` 외 voice를 사용하지 않는다.
- R2 발음 수집·생성·저장·조회·재생·fallback은 금지한다. legacy `/api/v1/audio/*`와 관리자 발음 생성 경로는 `410 Gone`을 유지한다.
- R2 원격 verifier는 9개 표면을 독립 count한다. 이를 compound `UNION ALL`로 합치면 Production legacy view 확장으로 D1 planner 제한을 넘을 수 있으므로 되돌리지 않는다.
- 다른 JLPT 급수나 학습 track으로 fallback하지 않는다. 정답은 제출 전 노출하지 않는다.
- Production write/deploy에는 현재 세션 승인과 Preview, backup/restore, rollback, predeploy gate가 필요하다.
- 실패·미실행·mock 결과를 통과라고 쓰지 않는다. 실제 Chrome lifecycle과 물리 스피커 가청은 별도 증거다.

## 작업 종료 보고 형식

- Confirmed: 현재 명령·코드·원격 조회로 확인한 사실
- Changed: 수정 파일과 계약 영향
- Validation: 실제 실행 명령, 종료 코드, pass/skip/fail
- Preserved: 사용자 변경과 backup/release evidence
- Blocked: 미실행 또는 외부 조건
- Next safe unit: 승인 없이 이어갈 수 있는 최소 다음 작업

작업 종료에는 `pnpm ops:status`를 다시 실행하고, 코드·DB·API·배포 상태가 달라졌다면 현재 상태·오류 원장·runbook·릴리스 원장을 같은 commit에서 갱신한다.
