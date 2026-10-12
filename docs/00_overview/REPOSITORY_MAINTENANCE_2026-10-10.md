# 코드·폴더·문서 정리 기록 — 2026-10-10

작업자: 강성호 프로젝트 / Codex. 시작 branch `feature/topik-product-expansion`, HEAD/origin `d626a16425a9a09a63b0af65928b51fd564c2834`·clean. 시작 local40/1/0·remote52/1/0이며 기존 `INC-DATA-024`만 경고다. 현재 운영은9월25일 Worker aedcbd40·Pages f62a8bdb·D1 0000–0030을 유지한다.

## 변경과 삭제 판단

| 대상 | 교차검증·조치 |
| --- | --- |
| `apps/api/src/lib/audio-qa-samples.ts` | import0·미사용 re-export. 활성 QA는 shared audio-qa 직접 사용; 삭제 |
| `apps/api/src/lib/db.ts` | createDb/AppDb 호출0. 활성 API D1 prepare/batch 및 DB schema 보존; 삭제 |
| `apps/api/src/lib/pronunciation-policy.ts` | guard 호출0. 활성 audio410·admin410·shared 정책 보존; 삭제 |
| `apps/web/src/components/feature/VocabCard.tsx` | import/동적 호출0. 활성 BrowseList의 VocabListItem·발음 버튼 보존; 삭제 |
| `apps/web/src/sw-push.ts` | import/importScripts0. Vite injectManifest는 sw.ts 사용; 활성 push/notificationclick 보존; 중복 파일·tsconfig exclude 삭제 |
| `vite.config.ts`의 `brand-hero.png` | public/Git 파일 없음·화면 참조0. 실제 사용 brand-hero-eastasia-v2.png 보존; 존재하지 않는 includeAssets 항목 제거 |
| 날짜별 수동 인벤토리·파일 지도 | 최신 소스/0030 누락·잘못된 cache 보존 안내. 영구 PROJECT_INVENTORY/PROJECT_FILE_CATALOG로 대체·구 경로 삭제 |
| `CHANGELOG_TIMELINE_2026-09-11.md` | 구 기준선·migration 날짜 오류를 교정한 CHANGELOG로 통합·구 경로 삭제 |
| CURRENT_STATE의 과거 순차 서술 | history 스냅샷에 내용 보존, 현재 안내·인수인계·README·코드 분석은 역할별 재작성 |
| 문서·CI/CD | source map·콘텐츠 감사·로드맵·runbook·오류/릴리스·A/B 짧은 gate 최신화 |

삭제 전 첫 검증은 TypeScript import/동적 import 그래프와 repository `rg`의 package/config/route/test 참조 대조였다. 두 번째는 독립 Astra reviewer의 지정5파일·활성 대체 경로 재검토였고 전부safe였다. CLI/Worker/SW entrypoint·migration·회귀 테스트는 import0을 삭제 근거로 삼지 않았다. 테스트/SQL/테이블을 무작정 줄이지 않았다.

자동 파일 지도는 Git 관리 대상과 ignore되지 않은 새 파일의 현재 목록으로 생성하고 pending 삭제를 제외한다. `pnpm docs:catalog`가 갱신하며 `pnpm docs:check`에 stale 지도 검사와 구 경로 재등장 차단을 포함했다.

## 보존·복구

학습 원문/seed/content95개 SHA 목록 합성 hash는 `9933b9a823c1192e53bde1fc153a13573ddade1a07d918c4bde74f12b704b392`, migration/snapshot39개 hash는 `dd82e5ddc1baec27cda43faab30bbcc5f4a3df7cdbc2b45ffa2bef71523df376`다. 변경 후 두 hash가 모두 동일하고 schema·Web 양언어 음성·shared 정책·PWA update·legacy410 핵심7파일이 HEAD 바이트와 같은 것을 확인했다. 실제 학습 원문·seed·schema·SQL과 release/backup/quality/recovery 원문을 보존하며 remote DB write는 없다.

추적 파일 삭제는 시작 Git SHA에서 복구할 수 있다. 검사 후 `apps/web/dist`(6,454,926 bytes), `e2e/playwright-report`(595,824), `e2e/test-results`(45), 합계 **7,050,795 bytes**를 `/Users/sunghokang/.Trash/JLPT-cleanup-2026-10-10-QExoJE`에 원래 상대 경로로 옮겼다. 대상 내부 Git 추적 파일0·symlink 아님을 확인했고 복구 가능하다. 이번 E2E 결과/log는 `.artifacts/operations/repository-maintenance-2026-10-10-*`에 따로 보존했다. `.wrangler`의 로컬 D1·`.artifacts`의 운영 증적·node_modules는 유지했다.

## 실행 결과

| 검사 | 결과 |
| --- | --- |
| 시작 local/remote ops | 40/1/0 · 52/1/0, exit0 |
| 지정5파일 독립 삭제 검토 | safe5, 호출·실행 설정·대체 경로 확인 |
| 파일 지도·문서 | 727개 현재 경로·Markdown71개/상대 링크861개·필수12/폐기7/DB 직접 참조36, exit0 |
| 지도 누락 차단 | 임시 새 파일 추가 시 `--check` expected exit1/actual1, probe 제거 후 exit0. fixture 잔존0 |
| 전체 로컬 gate | `pnpm ops:verify` exit0. Ops29·DB131·Web142·API190 = **492 pass/0 fail**; OpenAPI·typecheck·build·fresh0000–0030·FK/FTS·manifest·provenance·content contract/control-plane 통과 |
| 영향 브라우저 | audio-qa·pwa·vocab-search, Chromium/WebKit·모바일 **18 pass/0 skip/0 fail**, 52.5초·exit0. 음성은 mock lifecycle/R2 요청0 회귀이며 새 실제 가청 증거 아님 |
| source/migration hash | 학습 source95·migration/snapshot39 hash 동일, 핵심7파일 HEAD 바이트 동일 |
| 종료 원격 read-only | **51 pass/2 warning/0 fail**, exit0. 이번 작업 트리와 기존 manifest drift만 경고. 시작52/1/0의 Git clean pass가 dirty warning으로 바뀐 것 |
| 종료 로컬·diff | local39/2/0·`git diff --check` exit0. 변경 파일은 로컬 유지, 새 commit/push 없음 |

주요 실행 로그는 `.artifacts/operations/repository-maintenance-2026-10-10-full-gate.log`, `repository-maintenance-2026-10-10-e2e.log`, `repository-maintenance-2026-10-10-e2e-results`에 보존했다. 앱 코드 삭제가 포함되어 문서-only gate로 종료하지 않고 전체 로컬/영향 브라우저 검사를 실행했다.

이번 작업은 최신 운영 안내와 미사용 코드 정리다. 새 콘텐츠 공개·배포·Production 테스트용 기록·실제 양언어 가청 확인을 실행한 것으로 보고하지 않는다.
