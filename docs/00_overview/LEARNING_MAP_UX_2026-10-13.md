# 학습 지도 UI/UX 개편 — 2026-10-13

## Production 준비 통합 검증 — 진행 중

사용자가 기존 기능·데이터 바인딩·이벤트를 독립 교차검증한 뒤 배포하도록 조건부 승인했다. 로컬 구현 완료와 출시 완료는 구분한다. 새 증적은 `.artifacts/operations/map-release-2026-10-13/`에 보존한다.

| 기능 | UI 진입과 실제 데이터 연결 | 검증 경로 |
| --- | --- | --- |
| 목표·안내 언어 | 온보딩/목표 설정 → profile GET/PUT | ProfileForm·useLearningProfile, settings E2E |
| 레슨·일반 quick/daily | 지도 → lessons/current/start, 정확 ID/버전 | Map 단위, 11급수 reviewed E2E |
| 제출·해설·중단·재개 | study session → reveal/submit/status, scope별 pending | StudySession, learning-experience E2E |
| 자유 문제·학습 자료 | 학습 메뉴 → quiz/browse/reading/characters/curriculum/TOPIK | quiz-modes·menu-smoke·TOPIK·딥링크 E2E |
| 복습·완료 효과 | 복습 메뉴/지도 due → 기존 FSRS API | srs-review·owner completion·reviewed E2E |
| 기록·XP·일지·메모 | 기록/완료/세션 메모 → records/motivation/annotations | activity·guided session·revision/계정 격리 회귀 |
| 계정·설정·공유·갱신 | 상단 계정/설정·PWA | auth/settings/track isolation·실제 빌드 PWA |

- 독립 검토에서 `INC-UI-107` 오프라인 재개/일반 quick 누락과 `INC-UI-108` 계정 전환 중 대기 저장 경합을 발견했다. 실패 회귀를 먼저 남기고 수정한다. 기존 기본 온보딩의 급수·부제·보조 링크도 복원한다.
- `INC-UI-109`: 이전 questions 링크의 급수/영역이 중간 URL에만 남고 최종 연습에 전달되지 않는 공백을 보강한다. URL뿐 아니라 선택 상태와 실제 요청을 검사한다.
- 첫 기존 전체 E2E는279통과/30기존 정책 제외/8실패였다. 시각7개와 모바일 evaluate 중 navigation1개이며 실패 원본을 보존한다. 이 실행은 검토 중 수정과 겹쳐 최종 불변 후보 증거로 사용하지 않는다.
- 시각 교차검토: TOPIK 지도4개만 승인 방향의 변화로 기준선 갱신한다. JLPT 온보딩2개와 계정 메뉴1개는 온보딩 안내 복원 후 기존 기준선과 대조한다. 계정 메뉴 expected/actual은 모두 열린 상태임을 부모가 직접 이미지로 재확인했다. 허용치·마스킹·제외 범위는 늘리지 않는다.
- 시작 local39/2/0, 최초 remote50/2/1(Cloudflare7403), 별도 전체 remote 재조회51/2/0이다. 일반 운영 상태 검사가 새 UI 배포 gate를 대체하지 않는다.
- DB/migration/콘텐츠/음성 코어 변경 없음. 새 Preview·두 학습자 확인·ko/ja 실제 가청·현재 backup/restore/rollback/predeploy 전에는 Production을 반영하지 않는다.
- 후속 수정: cold-offline current 복원과 빈/완료 catalog의 일반 quick 시작, profile/note/session의 요청 전·응답 후 계정/트랙 검사, JLPT level-only/mode-only 링크 및 TOPIK grade/unit/section 전달을 반영했다. 명시한 유효 급수는 미공개여도 다른 급수로 대체하지 않는다.
- 수정 후 web 전체 단위 53파일/228개가 통과했다(`web-final-03.log`). 독립 검토의 지도/세션 집중 45개 통과와 구분한다. 최종 clean SHA 전체 gate·새 Preview·Production은 아직 미완료다.

작성: 강성호 요청에 따른 Codex 작업 기록. 후속 요청으로 **이미지 개선과 지도·레슨·완료 화면 로컬 구현**을 진행했다. 아래 디자인 단계 결과는 당시 이력으로 보존하며 새 앱 검사와 혼합하지 않는다. 이번 작업은 Production 배포 기록이 아니다.

## 후속 구현 — 2026-10-13

- 기존 Superdesign 방향을 이어 지도 이미지를 개선하고 [레슨 시안](https://p.superdesign.dev/draft/0149889b-e697-48ad-9611-caf10e759533), [완료 시안](https://p.superdesign.dev/draft/08f5a941-b42e-4494-a557-9698937d3d00)을 연결했다. 추가 생성은 지도 개선1회와 연결2화면이며 Superdesign 소비는 각각2.5/9 credits다. 완성 시안의 추정 XP/장식 겹침은 직접 수정했다.
- `learning-journey.png`는 한국·일본 건축과 책의 자체 제작 장식이다. 학습 내용/정답이 아니며 대체 텍스트는 비워 중복 낭독을 방지한다. 원본은 생성 이미지 폴더에 보존하고 앱 사본은1024px/약496KB로 최적화했다.
- `Today`의 기존 화면을 남기고 새 `LearningMap`을 `VITE_LEARNING_MAP_ENABLED`로 전환한다. 기존 레슨 catalog의 ID·버전·제목·순서·완료만 사용한다. 추천은 진행 중 세션→예정 복습→다음 공개 레슨이다. 자유 연습과 기존 daily 세션은 별도 유지한다.
- 레슨 제목은 진행 중 세션의 급수로 조회하고 ID+버전이 일치할 때만 표시한다. 현재 목표 급수나 첫 문제로 제목을 추정하지 않는다. 완료 화면은 서버 완료와 미수락 응답 없음이 조건이며 최초 응답/재시도·다음 복습 조회 실패를 구분한다.
- 학습 메뉴의 중복 목록은 지도 진입점으로 정리했다. 하단4메뉴는 실제 목적지 수에 맞게 같은 너비를 사용한다. 기존 URL·자료·자유 문제 경로는 유지한다.
- API/schema/migration/콘텐츠/음성 코어/FSRS/XP 산정은 변경하지 않았다. 운영 배포·push도 수행하지 않았다. mock catalog의 렌더링 검사는 실제 공개 콘텐츠·실사용·가청 증거가 아니다.

### 새 후보 검사 기록

증적 폴더: `.artifacts/operations/learning-map-2026-10-13/` (비공개 로컬, 커밋 제외).

| 검사 | 이번 후보 결과와 범위 |
| --- | --- |
| typecheck / build | 전체 워크스페이스 통과. 마지막 UI 보정 후 web build(tsc 포함) 재통과 |
| 전체 단위 | ops33 + DB296 + API215 + web207 =751통과. web은 마지막 화면/오프라인 보정 후 재실행 |
| 지도·기존 학습 E2E | Chromium/WebKit66/66. 11급수 지도 fixture22와 기존 실제 로컬 학습·재개·저장·오프라인·메뉴·빈 catalog 검사44를 구분 |
| 모바일 기기 설정 | 한국어/일본어 quick 재개·daily 완료→FSRS8/8. 마지막 완료 레이아웃 후 양언어 완료→FSRS4/4 재통과 |
| N3/TOPIK3·4 지도 최종 보정 | Chromium/WebKit6/6. 합성 catalog, 공개 콘텐츠 실행 증거가 아님 |
| fresh D1 | 새 격리 로컬 DB migration·seed·FK·콘텐츠 verifier 통과. 사용자/운영 DB 변경 없음 |
| 음성 | browser audio contract 통과. 음성 코어 무수정. 실제 가청/onend·Network 검사는 이번 UI 후보에서 미실행 |
| 문서/운영 상태 | catalog928 paths,74 Markdown/1123 relative links, lifecycle13active/7retired/36DBrefs. ops39pass/2warnings(worktree,기존 manifest drift)/0fail |

초기 지도 브라우저20/22는 h1/h2 중복 이름을 사용한 검사 locator 실패였다. h1의 level을 지정했다. 다음 통합64/66은 새 지도에 들어가기 전 목표 설정 저장 누락 및 구 빈 목록 문구를 찾는 검사 결함이었다. 실제 onboarding→지도 경로와 명시적인 빈 목록을 검사하도록 수정한 뒤66/66을 새로 실행했다. 완료 화면 간소화 중 중복 제목 단위1실패는 중복 UI 문구 제거 후 web207 통과로 확인했다. 실패 로그는 성공 로그로 덮어쓰지 않았다.

새 Preview·가족 관찰·실제 ko/ja 가청·새 공개 레슨 전수 실데이터 E2E·Production gate는 별도 남아 있다. 화면의 합성 수치/로컬 음성 mock/이전 배포의 가청을 새 후보 증거로 사용하지 않는다. `VITE_LEARNING_MAP_ENABLED=false`는 기존 화면의 빌드 시 복귀 스위치이며 데이터 복원을 수반하지 않는다.

## 목표와 범위

한국어 JLPT와 일본어 TOPIK 학습자가 현재 위치·다음 학습·복습을 이해하도록 기능 목록을 친근한 학습 지도로 전환한다. 콘텐츠와 기존 기록은 유지한다. 개인용 앱이므로 경쟁·결제·하트 제한 대신 추천 경로와 자유 탐색을 함께 제공한다.

- 오늘/今日: 현재 급수 지도, 활성 세션 → 예정 복습 → 다음 공개 레슨 순의 주요 행동 하나.
- 학습/学ぶ: 자유 문제·급수 탐색·기존 자료. 중복 레슨 목록은 지도 진입점으로 정리한다.
- 복습/復習: 예정 복습·어려운 항목·메모.
- 기록/記録: 서버 수락 기록, 최초 응답/재시도와 실제 복습 예정.
- 지도는 5레슨 단위 구간이며 완료/현재/다음 상태에 텍스트와 아이콘을 함께 제공한다. 다른 레슨을 잠그지 않는다.
- 중단한 세션이 있는 상태에서 다른 레슨을 선택하면 기존 세션으로 이어진다는 설명을 먼저 보여준다.

## 디자인 및 계약

Superdesign 기준 시안 → 개선 방향 하나 → 사용자 시안 승인 → 연결 레슨/완료 화면 → React 구현 순서다. 계획 승인과 아직 보지 않은 시안 승인을 동일하게 취급하지 않는다.

기존 도자기색 배경·JLPT 적색·TOPIK 남색을 유지하면서 둥근 입체 버튼과 작은 장식으로 친근함을 만든다. Duolingo의 경로·짧은 단위·복습 배치를 참고하되 로고/캐릭터/전용 폰트는 복제하지 않는다. 외부 공개 웹 스타일 추출은 로그인 후 학습 화면 관찰 증거가 아니다.

API는 기존 `/learning/lessons`, `/study/sessions`, motivation/records 조회를 재사용한다. 새 migration·재시드·보상 변경은 없다. ID/버전/순서/제목/완료/활성 세션/다음 레슨이 지도 상태의 근거다. 목표 문구가 실제 내용보다 넓은 능력을 약속하지 않도록 검수한다.

세션은 기존 learn/recall/practice/retry 표현을 실제 단계 상태에 맞게 안내하며 UI 설명을 새로운 서버 단계로 오인하지 않는다. 청해는 첫 제출 전 대본·번역 비노출을 유지한다. 동기화 대기를 완료로 표시하지 않고 최초 정답/재시도를 분리한다. 새 화면은 독립 기능 플래그로 되돌릴 수 있어야 한다.

음성 코어·FSRS·XP·계정/트랙 격리·공개 철회·버전 고정·PWA 저장 보호는 불변이다. Google 우선, 같은 언어 설치 음성 fallback, ko/ja만 허용, R2 발음 금지/legacy410을 유지한다.

## 보존된 선행 분석 당시 코드와 개선 지점

- `Today.tsx`: 시간 선택 두 버튼과 routine 설명 중심. 지도와 특정 다음 레슨이 없다.
- `LearnerLessonLibrary.tsx`: 레슨을 긴 목록으로 표시하며 추천과 일반 시작의 시각적 차이가 작다.
- `StudySession.tsx`: 일반적인 이어서 공부 제목·결과 수치 중심. 학습 목적과 완료 후 지도로 돌아가는 동선을 보강한다.
- `BottomTabBar.tsx`: 학습 경험 모드에서 실제 목적지는 네 개지만 CSS grid는 다섯 열이다. 구현 시 별도 회귀로 네 열을 검증한다. 이번 시안 작성 단계에서는 수정하지 않았다.

## 구현 후 필수 검사

1. 지도 우선순위·11급수·완료/미완료/빈 목록·조회 실패·오프라인·철회 상태 단위 검사.
2. 시작/제출/중단/재개/기록·동일 요청 재전송·계정/트랙 전환·기존 FSRS/XP 보존 회귀.
3. Chromium/WebKit: 390px 모바일·태블릿·PC, 긴 일본어/200% 글자, 키보드·스크린리더·44px 이상 터치·감소 동작.
4. 같은 새 Preview에서 N3와 TOPIK3/4 실제 두 학습자 관찰. 설명 없이 다음 행동을 찾는지 확인하고 10초 목표를 효과 입증으로 표현하지 않는다.
5. 같은 후보 실제 ko/ja 재생 lifecycle·사용자 가청·Network R2/legacy0. 과거 릴리스 확인을 재사용하지 않는다.
6. 로컬 gate→Preview→운영 backup/restore·rollback·predeploy→현재 승인→배포. 앱 구현 전인 이번 단계에서는 미실행이다.

## 보존된 선행 디자인 단계의 증거 경계

- [Superdesign 캔버스](https://superdesign.dev/teams/b4c51e76-39fd-4c3c-a90b-069c98104724/projects/c35594fd-cdcb-482d-bee8-c2eb86320771), [학습 지도 시안](https://p.superdesign.dev/draft/8fa35f81-5ea9-4eb0-ad1a-f5ce0cbc9f61).
- 현재 화면 기준65db12ef v1과 개선8fa35f81 v2를 보존했다. 생성은 기준1회+개선1회이며 이후 제목/접근성/자물쇠/반복 애니메이션 교정은 유료 재생성 없이 직접 반영했다.
- 홈 시안은 한국어 JLPT N3/일본어 TOPIK3을 전환해 비교한다. 앱이 아닌 합성 예시이며 실제 레슨 시작/음성/DB 저장은 하지 않는다. 레슨·완료 연결 화면과 앱 구현은 이 방향 승인 후 진행한다.
- Chrome 390×844에서 두 언어의 렌더링·선택 전환·현재 레슨/시작 버튼·네 메뉴와 현지화 접근성 문구를 확인했다. 원격에 저장된 v2 HTML 재조회 후 실제 TOPIK 제목/자물쇠 없음/4열/반복 애니메이션 없음/현지화 label/합성 고지 6개 구조 검사를 통과했다. 이는 Superdesign 시안 검사이며 앱 E2E·스크린리더 전체 검사·사용자 승인과 다르다.
- 문서 검사: catalog918 paths, Markdown74 files/1113 relative links, lifecycle13 active/7 retired absent/36 DB references, diff check exit0. 최종 ops39 pass/2 warnings(worktree+known manifest drift)/0 fail. 앱 전체 단위/E2E/가청은 이번 디자인 단계에서 미실행이다.

- 시작 `pnpm ops:status`: exit0, 40 pass / 1 known manifest drift warning / 0 fail.
- Superdesign CLI 인증 확인 및 Duolingo 공개 웹 스타일 추출 완료.
- `.superdesign/init`는 소스 분석, `design-system.md`는 디자인 계약, `resume.json`은 캔버스 재개용이다. 합성 진행 수치는 실제 학습 기록이 아니다.
- 앱 코드/DB/음성/운영 배포/push는 시안 승인 전 변경하지 않는다. 전체 기능 테스트를 새로 통과했다고 보고하지 않는다.
