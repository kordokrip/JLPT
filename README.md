# JLPT · TOPIK 개인 학습 PWA

2026-10-14 개인화 Production 반영: 사진 프로필·계정 테마/강조색·알림 예약·연간 기록 활성화. [릴리스·검증·복귀](docs/00_overview/UNIFIED_FRONTEND_DESIGN_2026-10-14.md). 실기기 푸시 수신·가족 관찰은 사용자 지시로 사후 확인이며 미확인 사실을 유지한다.

한국어 사용자의 JLPT 일본어와 일본어 사용자의 TOPIK 한국어를 한 계정에서 학습하는 React PWA다. 오늘 / 학습 / 복습 / 기록 네 메뉴를 운영에 배포했다. 자유 문제·FSRS·개인 메모는 유지한다.

문서 기준일: 2026-10-13 KST. [현재 상태](docs/00_overview/CURRENT_STATE.md), [문서 색인](docs/README.md), [폴더 안내](docs/00_overview/PROJECT_INVENTORY.md), [전체 파일 지도](docs/00_overview/PROJECT_FILE_CATALOG.md)에서 시작한다. V7 440문항/220레슨과 별도 v3 160문항은 검수·로컬/Preview·실제 복귀·백업/복원·가족/양언어 음성 검증을 거쳐 운영에 공개했다. 이전 불합격 초안/리뷰는 보존한다. [최종 릴리스 기록](docs/00_overview/LEARNING_COHORT_RELEASE_2026-10-13.md)에 실행 증거와 한계를 구분했다.

## Production 기준

| 구분 | 현재 기준 |
| --- | --- |
| D1 | `nihongo-n3-prod-v2`, migration `0000–0033` |
| Worker | `69cffaa1-996d-42a7-9080-13c526203e86` |
| Pages | `https://07bc33c4.nihongo-n3.pages.dev`, ID `07bc33c4-2245-4d83-a84c-646f29052f1f` |
| canonical | `https://nihongo-n3.pages.dev` |
| Worker source | `78ee09a5ddec3254454fe14f174c03e5051f90d0` |
| Web source | `78ee09a5ddec3254454fe14f174c03e5051f90d0` |
| 콘텐츠 source | `3485c6ef8addda3cd3e209730646c296175cf3c9` |
| manifest | `content-v3-d102868e3d43b9b3c1a4` |

2026-10-14 01:00:27 KST 지도 UI를 배포했다. 단위772, 기존 E2E287통과/정책30제외/실패0, Preview44/44, 실제 빌드 PWA24/24, 운영 asset/route79/79·Worker smoke7/7을 확인했다. Worker·DB·콘텐츠는 유지하고 점검 해제·queue 원복을 확인했다. 실제 Chrome 양언어 종료는 운영에서 확인했으며 사람 가청과 전체 Network 증거는 동일 빌드 Preview의 확인이다. 한국어·일본어 업데이트 모달을 유지한다. 실패 이력과 증거 범위는 [지도 릴리스 기록](docs/00_overview/LEARNING_MAP_RELEASE_2026-10-14.md)에 있다.

## 현재 기능과 콘텐츠

목표 급수·안내 언어·시간대를 저장하고 3–5분 quick 또는 기본20분 daily 세션을 시작·중단·재개한다. 서버 수락 학습일의 스트릭과 안내 세션 XP·성취를 기록하고 opt-in 알림을 선택 언어·현지 시간에 보낸다. 해설 열람·완료·최초 응답·재시도·FSRS 평가는 구분한다.

기존 JLPT N5–N1 canonical·N3 정적120·TOPIK practice v2 300을 보존했다. 신규 V7 JLPT200/TOPIK240과 별도 N2 60/N1 60/TOPIK40, 총600문항·220레슨을 공개했고 TOPIK owner는 기존140에서420개다. 수량과 원본 대응은 [콘텐츠 감사](docs/00_overview/CONTENT_AUDIT.md)와 [원본 지도](docs/00_overview/00_source_map.md)를 따른다.

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

fresh D1은 disposable local DB에 `0000–0032`를 적용하고 기존 seed·음성 provenance·FK/FTS·manifest·content contract/control-plane을 검사한다. fresh만으로 원격 공개를 증명하지 않는다. 과거 불합격 초안은 보존하며 현재 V7+160 출판 증거는 릴리스 원장에서 별도로 확인한다. canonical은 `INC-DATA-024`의 HEAD drift 때문에 immutable release source에 고정하고 신규600개 cohort와 구분해 검증한다.

검수 V7 전용 로컬 전체 게이트는 설치된 DB workspace의 tsx로 `pnpm -C packages/db exec tsx ../../scripts/run-learning-v7-local-gates.mjs --output=/절대경로/JLPT/.artifacts/새-증적-폴더`를 실행한다. 기존 증적 폴더는 덮어쓰지 않는다. 중간 `g0-g4-local-preflight.json`은 Preview 진입 증거가 아니며, 실제 격리 DB 공개·재전송·철회와 합성 학습 기록 보존까지 성공한 최종 `g0-g4-local.json`만 사용한다. 이 명령에는 원격·커밋·배포 기능이 없다.

2026-10-12 cohort04는 단위614·desktop/mobile Chromium/WebKit44·fresh/upgrade/reseed·정식 local 공개/철회를 통과했다. 음성은 mock이고 실제 가족·Chrome 가청·새 Preview·현 schema backup/restore·Production 검증은 아니다. 초기 실패와 최종 로그를 함께 보존한다.

## 음성·운영 관리

발음은 같은 언어 Google 브라우저 음성을 우선하고 없으면 같은 언어 설치 음성을 사용한다. 한국어 `ko-*`, 일본어 `ja-*`만 허용한다. 첫 click task에서 즉시 speak하고 실제 onend 이후 성공을 기록한다. R2 발음 수집·생성·저장·조회·재생·fallback은 금지하며 legacy `/api/v1/audio/*`와 관리자 생성은410이다.

9월25일 Preview 사용자 양언어 청취와 Production Chrome lifecycle/Network를 각각 기록했다. Production 사람 가청의 추가 확인은 기록되지 않았으며 이번 정리의 자동 검사로 대신하지 않는다. [음성 장애 기록](docs/00_overview/TOPIK_GOOGLE_SPEECH_INCIDENT_2026-08-23.md)과 [오류 원장](docs/00_overview/ERROR_LEDGER.md)이 회귀 계약이다.

GitHub Actions는 비활성이고 로컬 gate·MD 원장으로 CI/CD를 관리한다. [운영 runbook](docs/00_overview/OPERATIONS_MANAGEMENT_RUNBOOK.md), [CI/CD 기준](docs/00_overview/LOCAL_CICD_OPERATIONS.md), [A/B 짧은 gate](docs/00_overview/LOCAL_CICD_MANAGEMENT.md), [Agent 인수인계](docs/00_overview/SUB_AGENT_HANDOFF.md)를 따른다. 변경·삭제 목록은 [10월10일 정리 기록](docs/00_overview/REPOSITORY_MAINTENANCE_2026-10-10.md), 날짜별 변경은 [CHANGELOG](docs/00_overview/CHANGELOG.md)에 둔다.
