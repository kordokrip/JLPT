# JLPT · TOPIK 개인 학습 PWA

한국어 사용자의 JLPT 일본어와 일본어 사용자의 TOPIK 한국어를 한 계정에서 학습하는 React PWA다. 운영의 다섯 메뉴를 오늘 / 학습 / 복습 / 기록 네 메뉴로 통합하는 로컬 후보를 구현했다. 자유 문제·FSRS·개인 메모는 유지한다.

문서 기준일: 2026-10-12 KST. [현재 상태](docs/00_overview/CURRENT_STATE.md), [문서 색인](docs/README.md), [폴더 안내](docs/00_overview/PROJECT_INVENTORY.md), [전체 파일 지도](docs/00_overview/PROJECT_FILE_CATALOG.md)에서 시작한다. 신규 v7 440문항/220레슨은 두 독립 의미 승인을 받았으며 정식 출판 계약과 로컬 검증 도구를 추가했다. 기존 Preview160의 실패는 보존하고 별도 v3 160문항이 두 의미 승인을 받았다. 두 후보 모두 원격 출시 완료가 아니며 이번 작업은 사용자 지시에 따라 로컬 검증·문서화로 제한한다. [구현/재작성 기록](docs/00_overview/CONTENT_LEARNING_UX_UPDATE_PLAN.md)을 따른다.

## Production 기준

| 구분 | 현재 기준 |
| --- | --- |
| D1 | `nihongo-n3-prod-v2`, migration `0000–0030` |
| Worker | `aedcbd40-6605-44d2-8227-d145a186bef0` |
| Pages | `https://f62a8bdb.nihongo-n3.pages.dev`, ID `f62a8bdb-298e-446a-ab74-7d78ca47efd8` |
| canonical | `https://nihongo-n3.pages.dev` |
| Worker/web source | `032b50ddfea4051309ae95829520e6309e67a6ff` |
| 콘텐츠 source | `3485c6ef8addda3cd3e209730646c296175cf3c9` |
| manifest | `content-v3-d102868e3d43b9b3c1a4` |

2026-10-10 시작 읽기 전용 검사는 local40/1/0·remote52/1/0이다. 현재 릴리스는 2026-09-25 배포이며 이번 폴더·문서 정리에서 재배포하거나 DB를 변경하지 않는다. 실제 gate와 실패 이력은 [릴리스 원장](docs/00_overview/LOCAL_RELEASE_LEDGER.md)에 있다.

## 현재 기능과 콘텐츠

목표 급수·안내 언어·시간대를 저장하고 3–5분 quick 또는 기본20분 daily 세션을 시작·중단·재개한다. 서버 수락 학습일의 스트릭과 안내 세션 XP·성취를 기록하고 opt-in 알림을 선택 언어·현지 시간에 보낸다. 해설 열람·완료·최초 응답·재시도·FSRS 평가는 구분한다.

JLPT N5–N1 canonical, N3 정적120, TOPIK owner Batch1–5와 practice v2 300이 운영 공개다. N2 정적60·N1 정적60·TOPIK Batch6 40은 Preview 후보이며 별도 콘텐츠 릴리스 대상이다. 수량과 원본 대응은 [콘텐츠 감사](docs/00_overview/CONTENT_AUDIT.md)와 [원본 지도](docs/00_overview/00_source_map.md)를 따른다.

## 구조·실행

`학습 원본 → deterministic seed → D1 → Hono Worker API → React Query/Dexie → UI`로 연결된다. 소스는 `apps/web`, `apps/api`, `packages/db`, `packages/shared`로 나뉜다. 상세 모델·API 진입점은 [코드 분석](PROJECT_CODEBASE_ANALYSIS.md)을 본다.

```sh
CI=true pnpm install --frozen-lockfile
pnpm dev:api
pnpm dev:web

pnpm docs:catalog
pnpm docs:check
pnpm ops:verify
```

fresh D1은 disposable local DB에 로컬 후보 `0000–0031`을 적용하고 기존 seed·음성 provenance·FK/FTS·manifest·content contract/control-plane을 검사한다. 운영은0030이며 신규 레슨 공개 증거가 아니다. 과거 `content:learning:readiness` 대상 초안은 불합격으로 보존한다. 새 `content:learning:readiness:v4`에 실제 v7 동결본과 두 전체 리뷰를 명시한 실행은 exit0이다. 버전별 SHA·검증 명령·실제 레슨 E2E 결과는 릴리스 원장에서 구분한다. 운영 콘텐츠는 `INC-DATA-024`의 HEAD drift 때문에 immutable release source에 고정해 검증한다.

검수 V7 전용 로컬 전체 게이트는 설치된 DB workspace의 tsx로 `pnpm -C packages/db exec tsx ../../scripts/run-learning-v7-local-gates.mjs --output=/절대경로/JLPT/.artifacts/새-증적-폴더`를 실행한다. 기존 증적 폴더는 덮어쓰지 않는다. 중간 `g0-g4-local-preflight.json`은 Preview 진입 증거가 아니며, 실제 격리 DB 공개·재전송·철회와 합성 학습 기록 보존까지 성공한 최종 `g0-g4-local.json`만 사용한다. 이 명령에는 원격·커밋·배포 기능이 없다.

2026-10-12 cohort04는 단위614·desktop/mobile Chromium/WebKit44·fresh/upgrade/reseed·정식 local 공개/철회를 통과했다. 음성은 mock이고 실제 가족·Chrome 가청·새 Preview·현 schema backup/restore·Production 검증은 아니다. 초기 실패와 최종 로그를 함께 보존한다.

## 음성·운영 관리

발음은 같은 언어 Google 브라우저 음성을 우선하고 없으면 같은 언어 설치 음성을 사용한다. 한국어 `ko-*`, 일본어 `ja-*`만 허용한다. 첫 click task에서 즉시 speak하고 실제 onend 이후 성공을 기록한다. R2 발음 수집·생성·저장·조회·재생·fallback은 금지하며 legacy `/api/v1/audio/*`와 관리자 생성은410이다.

9월25일 Preview 사용자 양언어 청취와 Production Chrome lifecycle/Network를 각각 기록했다. Production 사람 가청의 추가 확인은 기록되지 않았으며 이번 정리의 자동 검사로 대신하지 않는다. [음성 장애 기록](docs/00_overview/TOPIK_GOOGLE_SPEECH_INCIDENT_2026-08-23.md)과 [오류 원장](docs/00_overview/ERROR_LEDGER.md)이 회귀 계약이다.

GitHub Actions는 비활성이고 로컬 gate·MD 원장으로 CI/CD를 관리한다. [운영 runbook](docs/00_overview/OPERATIONS_MANAGEMENT_RUNBOOK.md), [CI/CD 기준](docs/00_overview/LOCAL_CICD_OPERATIONS.md), [A/B 짧은 gate](docs/00_overview/LOCAL_CICD_MANAGEMENT.md), [Agent 인수인계](docs/00_overview/SUB_AGENT_HANDOFF.md)를 따른다. 변경·삭제 목록은 [10월10일 정리 기록](docs/00_overview/REPOSITORY_MAINTENANCE_2026-10-10.md), 날짜별 변경은 [CHANGELOG](docs/00_overview/CHANGELOG.md)에 둔다.
