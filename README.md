# JLPT · TOPIK 개인 학습 PWA

JLPT 일본어와 TOPIK 한국어를 한 계정에서 학습하는 React PWA입니다. 콘텐츠, 진행률, 퀴즈 응답, FSRS 복습, 브라우저 음성 상태를 Cloudflare Worker와 D1에 연결합니다.

## Production 기준 — 2026-08-30 재확인

| 구분 | 현재 기준 |
| --- | --- |
| production D1 | `nihongo-n3-prod-v2`, migration `0000–0027` |
| production Worker | `6bbe4bbd-b02d-42d3-9dfc-ad9187a86872` |
| production Pages | `https://9cc58a1f.nihongo-n3.pages.dev` (canonical `https://nihongo-n3.pages.dev`) |
| web source SHA | `2bd657e96d8a43c6d28efe414acd468c1abd0861` |
| Worker/content release SHA | `3485c6ef8addda3cd3e209730646c296175cf3c9` |
| production 콘텐츠 | TOPIK practice v2 300, JLPT N3 practice 120, TOPIK owner Batch 5 20 모두 published |

2026-08-19 배포에서 `jlpt-n3-practice-v1-2026-08-19`은 120개 quality link, `topik-owner-batch5-2026-08-19`은 20개, historical `topik-practice-v2-2026-08-17`은 300개 link와 함께 published가 되었습니다. 과거 rollback 기준은 [현재 상태](./docs/00_overview/CURRENT_STATE.md)에 보존합니다.

2026-08-23 후보인 N2 60문항, N1 60문항, TOPIK owner Batch 6 40항목은 구현·독립 리뷰·Preview 검증까지 완료했습니다. 음성 회귀 복구는 2026-08-24 Production에 반영됐으며, 신규 콘텐츠는 새 production-predeploy 증적과 `INC-DATA-024`의 immutable manifest 검증 경로를 확보한 뒤 별도 승인으로 배포합니다. 상세 상태는 [증량 릴리스 기록](./docs/00_overview/NEXT_CONTENT_EXPANSION_RELEASE_2026-08-23.md)을 따릅니다.

## 2026-09-06 학습 UX 후보 — Preview 검증 중

오늘 / 학습 / 문제 / 복습 / 기록, 계정·트랙별 목표, 기본 20분 세션, 중단·재개, 자동 기록과 개인 메모를 구현했습니다. 한국어 JLPT와 일본어 TOPIK에 같은 흐름을 적용하고, 해설 열람·명시적 완료·첫 정답·재시도·FSRS 평가를 분리합니다.

- 새 additive migration은 `0028_learning_experience.sql`입니다. Production은 여전히 `0000–0027`이며 공개 콘텐츠·기존 학습 기록을 재시드하지 않았습니다.
- 새 계약은 `/learning/profile`, `/study/sessions`, `/learning/records`, `/learning/annotations`와 소유권 검사 후 퀴즈 결과 재조회입니다. 기존 quiz/TOPIK/FSRS/activity API는 유지합니다.
- 최신 전용 Preview는 Pages `555fc0c4`, Worker `b02f3674`이며 둘 다 source `793b671`입니다. 로그인 트랙·세션 재전송·설정 바인딩 수정본은 로컬458개 gate와 전체 브라우저217 pass/30 시각 정책 skip/0 fail을 통과했습니다. 새 Preview 설정·테마14개와 실제 세션 재전송 검사는 통과했지만 실제 Google SSO start503 및 최종 후보 음성 증거가 남아 있습니다. Production과 Git 원격은 변경하지 않았습니다. 과거 배포의 가청 확인은 재사용하지 않습니다. 정확한 현재 배포와 미완료 gate는 [학습 경험 구현·검증 기록](./docs/00_overview/LEARNING_EXPERIENCE_PLAN.md)을 따릅니다.
- 화면 복귀용 `VITE_LEARNING_EXPERIENCE=false` 빌드를 지원합니다. 기존 Worker/Pages 복귀 절차나 D1 복원과 같은 동작은 아닙니다.

## 구조

```text
자체 저작 원본/seed → packages/db → Cloudflare D1
                                      ↓
apps/web React PWA ← apps/api Hono Worker ← packages/shared DTO·FSRS
```

- `apps/web`: TanStack Query, Zustand, Dexie 기반 학습 UI와 오프라인 활동 큐
- `apps/api`: 인증, 트랙 격리, 콘텐츠·진도·FSRS·활동 집계 API
- `packages/shared`: Zod DTO, FSRS, 학습 활동과 퀴즈 계약
- `packages/db`: Drizzle schema, migration, deterministic seed, fresh verifier
- `e2e`: Chromium/WebKit 핵심 학습 흐름과 음성 정책 회귀 검사

## 2026-08-19 production 계약

- `POST /api/v1/activity/events`: 최대 100개 이벤트를 idempotent batch로 수신합니다. 브라우저는 Dexie에 먼저 저장한 뒤 계정×트랙 범위에서 재전송합니다.
- `GET /api/v1/activity/summary?window=7d|30d`: 완료·정답·복습·음성 결과를 트랙/급수/영역/모드별로 집계합니다.
- 퀴즈 생성은 선택적 `strategy: "random" | "weakest"`를 받습니다. 기본 `random` 요청은 기존 wire shape를 유지하며, `weakest`도 요청 JLPT 급수 밖으로 fallback하지 않습니다.
- TOPIK 다음 학습은 `복습 예정 → 미완료 owner 항목 → 최근 30일 취약 영역` 순서입니다.
- `0026`은 문제별 quality audit을 `content_releases`에 연결합니다. 정확한 승인 링크 집합이 없으면 publication trigger가 공개를 차단합니다.

## 오디오 정책

발음은 브라우저 음성을 사용합니다. 같은 언어의 Google 음성을 우선하고, 없으면 기기에 설치된 같은 언어 음성으로 재생합니다. R2 발음의 수집·생성·저장·조회·재생·fallback은 금지합니다. 기존 `/api/v1/audio/*`와 관리자 생성 경로는 호환 목적으로 `410 Gone`을 유지합니다. `0027`의 provider `google-browser`는 호환용 식별자이며 실제 계약은 `Google 우선 browser speech`입니다. 상태는 `ready|unavailable`만 허용하고 R2 asset/key 필드를 두지 않습니다.

## 로컬 실행과 검증

```bash
CI=true pnpm install --frozen-lockfile
pnpm dev:api
pnpm dev:web

pnpm ops:verify
pnpm -F @nihongo-n3/db question:quality
```

`ops:verify`의 fresh D1 단계는 음성 provenance, content contract/control plane까지 포함합니다. 운영 콘텐츠는 `INC-DATA-024`가 열린 동안 일반 `verify:remote:audio`로 판정하지 않고 immutable release source에 고정한 verifier와 별도의 `verify:remote:audio:r2` 차단 검사만 사용합니다.

2026-08-24 추가 조사에서 TOPIK/JLPT 첫 클릭이 voice 준비 Promise를 기다리며 사용자 활성화를 잃는 문제와 설치형 PWA가 이전 JS를 계속 실행하는 문제를 확인했습니다. 복구본은 click task 안에서 즉시 `speak()`를 호출하고, voice는 background에서 준비하며, 배포 전부터 기존 worker가 제어하던 PWA만 controller 교체 때 한 번 갱신합니다. 첫 방문자는 reload하지 않습니다. 이 복구본은 Preview `d53c3b4f-0c51-4a2b-9cc8-e5f35edcf5a0`을 거쳐 Production `9cc58a1f-4772-4129-b90d-c819ca20d700`에 배포됐습니다. 실제 Chrome에서 한국어·일본어 모두 `재생 중 → onend 정상 종료`, 경고·콘솔 오류 0건을 확인했으며, 물리 스피커 가청 여부는 자동 증거와 구분합니다. 성공은 실제 `onend` 이후에만 기록하고 R2 요청은 만들지 않습니다. 운영 증거는 [음성 장애 기록](./docs/00_overview/TOPIK_GOOGLE_SPEECH_INCIDENT_2026-08-23.md)을 확인하십시오. `verify:fresh`는 로컬 disposable D1을 `0000–0027`까지 재구성하며 원격 write는 수행하지 않습니다.

현재 오류 전체와 배포를 강제로 중단시키는 기준은 [오류·회귀 차단 원장](./docs/00_overview/ERROR_LEDGER.md)에 기록합니다. 미실행·인프라 실패·mock 재생은 통과로 보고하지 않습니다.

현재 로컬 `verify:fresh`는 새 후보 migration `0000–0028`까지 검사합니다. 위 `0000–0027` 복구 기록은 2026-08-24 당시의 역사적 검증 범위입니다.

운영 감사, 버그·리팩터링 gate, 로컬 CI/CD와 Cloudflare 상태 추적은 [운영관리 runbook](./docs/00_overview/OPERATIONS_MANAGEMENT_RUNBOOK.md)과 프로젝트 전담 `project-operations-steward` Sub Agent가 담당합니다. 작업 전후 `pnpm ops:status`, 전체 로컬 gate는 `pnpm ops:verify`, 원격 read-only 확인은 `pnpm ops:status:remote`를 사용합니다.

GitHub는 공개 원격 형상 보관에만 사용하고 Actions 자동 실행은 비활성화했습니다. 로컬 gate는 [로컬 CI/CD 운영 기준](./docs/00_overview/LOCAL_CICD_OPERATIONS.md), commit/tag·Cloudflare deployment·rollback 이력은 [로컬 형상관리·릴리스 원장](./docs/00_overview/LOCAL_RELEASE_LEDGER.md)을 따릅니다.

문서 탐색은 [docs/README.md](./docs/README.md), 코드 구조는 [PROJECT_CODEBASE_ANALYSIS.md](./PROJECT_CODEBASE_ANALYSIS.md), 실제 상태는 [CURRENT_STATE.md](./docs/00_overview/CURRENT_STATE.md)를 기준으로 합니다.
