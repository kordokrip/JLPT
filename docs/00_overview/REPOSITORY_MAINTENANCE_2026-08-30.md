# 저장소 최신화·문서 정리 기록 — 2026-08-30

상태: 로컬 검증 완료, commit·push 전. Production은 변경하지 않았고 현재 Worker의 TOPIK status/CSP 두 결함은 배포 전까지 열린 상태다.

## 삭제 전 교차검증

| 후보 | 참조·역할 확인 | 결정 |
| --- | --- | --- |
| `ERROR_LEDGER_2026-08-23.md` | 코드/seed 입력이 아닌 활성 운영 원장. AGENTS·status script·운영 문서가 참조 | 내용을 보존해 `ERROR_LEDGER.md`로 영구 이름 전환 |
| `LOCAL_VERSION_CONTROL_AND_RELEASE_LEDGER_2026-08-23.md` | 코드/seed 입력이 아닌 활성 append-only 원장 | 내용을 보존해 `LOCAL_RELEASE_LEDGER.md`로 영구 이름 전환 |
| `GIT_FREE_MODE_OPERATING_MANUAL_2026-08-23.md` | runbook·릴리스 원장과 중복. DB/API/seed/test 직접 참조 없음 | `LOCAL_CICD_OPERATIONS.md`로 필요한 규칙 통합 후 삭제 |
| `QUESTION_BANK_QUALITY_PIPELINE_2026-08-17.md` | 현재 N2/N1·TOPIK Batch 6까지 적용되는 활성 계약이며 코드/seed 직접 참조 없음 | 내용을 보존해 `QUESTION_BANK_QUALITY_PIPELINE.md`로 영구 이름 전환 |
| `T3_placement_bank_v1.md` | `topik-placement-bank.ts`가 source path/checksum으로 직접 사용 | 보존 |
| `T7_topik_i_ii_practice_bank_v1.md` | `topik-practice-bank.ts`가 비공개 v1 보존 seed의 source path/checksum으로 직접 사용 | 보존 |
| `NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md` | 아직 Production 미반영인 Preview 후보의 G0–G4·rollback 증적 | 보존 |
| `TOPIK_GOOGLE_SPEECH_INCIDENT_2026-08-23.md` | 음성 장애의 원인·잘못된 판정·회귀 gate 증적 | 보존 |
| `apps/web/dist` | Git ignored, web build로 재생성 가능, source/rollback 증적 아님 | 최종 검증 후 정리 |

확인 방법은 `rg` 전체 참조 검색, `git ls-files --stage`, seed source path 확인, Markdown link 검사, fresh D1 계약을 사용했다. 단순히 날짜나 `v1`이 있다는 이유로 파일을 삭제하지 않았다.

## 최신화 범위

- 활성 운영 문서의 영구 경로와 문서 수명주기 도입
- Sub Agent 진입 문서와 로컬 CI/CD gate 정리
- API 설명에서 폐기된 R2 기반 서비스 표현과 legacy audio cache 의미 제거
- DB migration `0000–0027`, activity API, 정적 문제은행, Google browser speech 계약을 현재 코드 기준으로 재대조
- 문서 링크와 폐기 경로 재등장을 자동 차단하는 lifecycle 검사 추가
- TOPIK v2 release-status 오판과 quiz/activity 부분 성공을 회귀 테스트로 재현·수정
- R2 참조 검사를 TOPIK·source asset·legacy binding까지 확대하고 CSP R2 media origin 제거
- 참조 0인 OA 이전 route 5개, 비canonical migration 4개와 client server-audio 호환 인자 제거

## 보존 범위

- 사용자 선행 변경 `docs/00_overview/00_source_map.md`
- Production D1 backup, restore drill, release/rollback, recovery bundle
- 콘텐츠 intake, 두 reviewer 판정, question-quality artifact
- 역사적 incident/release/ADR와 DB seed가 읽는 콘텐츠 원본

## 최종 증적

- `pnpm docs:check`: 활성/폐기/DB 문서 참조 수명주기와 Markdown 링크 통과
- `pnpm ops:verify`: exit `0`; Ops `24/24`, DB `114/114`, Web `93/93`, API `134/134`, OpenAPI `72/12`, typecheck/build/fresh D1 `0000–0027` 통과. API `134`번째 재제출 회귀 테스트는 독립 검토 차단 지적 뒤 추가해 별도 API/typecheck로 재통과했다.
- `pnpm --filter @nihongo-n3/e2e test`: Chromium/WebKit `171 passed / 32 skipped / 0 failed`, exit `0`
- Sub Agent 재검증: 동시 tmp cleanup으로 오염된 첫 실행은 폐기하고 안정화 뒤 핵심 6개 spec을 양 브라우저에서 `38 passed / 2 intentionally skipped / 0 failed`로 재실행했다.
- `pnpm -F @nihongo-n3/db question:quality`: `11`개 local 정적 독해, failure `0`
- `verify:remote:audio:r2`: Production D1 9개 발음 참조 표면 합계 `0`
- `pnpm ops:status:remote -- --no-write`: `49 passed / 2 known warnings / 2 failed`. 실패는 현재 Production Worker의 legacy TOPIK status와 R2 origin 허용 CSP이며 로컬 후보를 배포하지 않았음을 정확히 차단한다.
- 정리: 재생성 가능한 build, Wrangler tmp, 이전 CI/E2E report와 비어 있는 미등록 package 껍데기 `61MB`를 `/Users/sunghokang/.Trash/JLPT-cleanup-2026-08-30-maintenance`로 이동했다. Production backup, release/rollback, recovery, intake/quality/operations artifact는 보존했다.

commit SHA와 origin 동기화 상태는 push가 실제 성공한 뒤 이 문서와 로컬 릴리스 원장에 추가한다. 실행하지 않은 검사는 통과로 기재하지 않는다.
