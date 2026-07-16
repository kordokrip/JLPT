# N7 JLPT N2/N1 출시 게이트 및 웹 노출 정리

기준일: 2026-07-16 KST
작업 브랜치: `refactor/n7-level-release-gating`
범위: N6 콘텐츠 검수 완료 뒤의 N2/N1 웹 노출 준비. production 배포·D1 seed는 포함하지 않는다.

## 1. 출시 판정

`/api/v1/tracks/jlpt-ja/status`는 더 이상 고정 문자열을 반환하지 않는다. DB에서 `vocab.level`, `grammar.level`, `kanji.jlpt_level`별 row 수를 읽고, 같은 레벨에 세 종류가 모두 1건 이상 있어야 그 레벨을 완전한 학습 표면으로 인정한다.

| DB 완전 분포 | `content_release` | `available_levels` | 웹 노출 |
| --- | --- | --- | --- |
| N5~N3 | `n5-n3` | N5, N4, N3 | N2/N1 숨김 |
| N5~N1 | `n5-n1` | N5, N4, N3, N2, N1 | N2/N1 노출 |
| N5~N3 + N2 일부 | `n5-n3` | N5, N4, N3 | N2/N1 숨김 |
| 필수 표면이 부족함 | `foundation-only` | 없음 | 콘텐츠 레벨 선택 숨김 |

정책 원천은 [`packages/shared/src/jlpt-levels.ts`](../../packages/shared/src/jlpt-levels.ts)다. `JLPT_LEVELS` 순서는 항상 `N5 → N4 → N3 → N2 → N1`이다. 서버는 이 모듈의 `contentReleaseForAvailableLevels()`로 DB 분포를 판정하고, 웹은 서버의 `available_levels`와 같은 shared 타입·순서를 사용한다. 이 게이트는 일부 N2/N1 test row, 미검수 source, 또는 한 종류만 적재된 콘텐츠가 사용자 메뉴를 여는 일을 막는다.

N2/N1 후보 콘텐츠는 provenance·검수·manifest 게이트가 별도로 충족되어야 한다. 이 문서의 코드가 추가되었다고 N2/N1이 production 콘텐츠로 출시되는 것은 아니다.

## 2. 하드코딩 인벤토리와 교체 결과

| 위치 | 이전 상태 | 결과 | 비고 |
| --- | --- | --- | --- |
| `features/browse/types.ts`, `BrowseFilters.tsx` | N5/N4/N3 고정 selector/filter | `useTrackStatus().levels` | status가 `n5-n3`이면 N2/N1 버튼 자체를 렌더링하지 않음 |
| `pages/Quiz.tsx` | 로컬 N5/N4/N3 union 및 `LEVELS` | shared `JlptLevel`, track status | 출제 레벨은 공개된 levels만 선택 가능 |
| `pages/QuizListening.tsx`, `useListeningQuiz.ts` | N3 고정 청해 요청 | query-string level + track status | 공개된 레벨만 청해 요청 가능 |
| `features/character-trainer/*` | N5/N4/N3 고정 한자 레벨 | shared type + track status | 레벨 라벨은 `levels.*` i18n 키 사용 |
| `pages/Reading.tsx` | N5~N2의 고정 filter | track status levels | N1까지 지원하며 0건은 준비 중 상태로 표시 |
| `routes/reading-oa.ts` | OpenAPI의 수동 레벨 enum | shared `jlptLevelSchema` | 공개 명세도 N5→N1 단일 계약을 사용 |
| `features/browse/BrowseList.tsx` | N3 fallback 문자열과 N3/N4만 색상 분기 | `DEFAULT_JLPT_LEVEL`, `Badge.levelVariant()` | N2/N1 배지 색상도 기존 공통 Badge 정책 사용 |
| `content-dto.ts`, `Review.tsx`, `Curriculum.tsx` | N3 기본값 문자열 | `DEFAULT_JLPT_LEVEL` | N3 기본 과정 의도는 유지, 소스는 단일화 |
| `i18n/{ko,ja,en}.ts` | 레벨용 공통 키 없음 | `levels.N5`~`levels.N1` | selector/filter/범위 표기에 공통 사용 |
| `jobs/generate-audio.ts`, `routes/admin-oa.ts` | N5/N4/N3 배치 배열과 OpenAPI enum 중복 | shared `AUDIO_BATCH_LEVELS` | N2/N1 오디오는 별도 QA 승인 전까지 명시적으로 제외 |
| `Stats.tsx` | 레벨별 통계 축 없음 | 변경 없음 | 레벨 축이 생길 때만 shared `JLPT_LEVELS`로 파생한다 |

다음 항목은 출시에 따라 바꾸는 selector가 아니므로 의도적으로 유지한다.

| 위치 | 유지 이유 |
| --- | --- |
| `Welcome.tsx`, 로그인/서비스워커의 `JLPT N3` | 현재 제품명·브랜드 문구 |
| `SelfCheck` N3 템플릿 | N3 진단 콘텐츠의 검수 범위를 명시하는 값. N2/N1 진단은 별도 검수 릴리스가 필요 |
| 오디오 batch의 N5→N3 범위 | R2 오디오 승인 정책이며 N2/N1 오디오가 검수되기 전에는 확장하지 않음 |
| 52주 curriculum 기본값 | N5~N3 운영 과정을 의미하며 상위 레벨 curriculum과 동일한 주차 축으로 합산하지 않음 |

## 3. 빈 상태와 콘텐츠 캐시

- Browse와 Reading은 선택된 공개 레벨에 콘텐츠가 0건이면 `콘텐츠 준비 중` 카드를 보인다. 검색어가 있을 때의 0건은 일반 검색 결과 없음으로 구분한다.
- `/content/version`은 source/table count와 최신 수정 시각을 포함한 version을 반환한다. 신규 N2/N1 적재로 version이 바뀌면 `content.version:jlpt-ja` meta가 갱신되고, 공개 콘텐츠 mirror를 비운 뒤 `track-status` React Query를 무효화한다.
- 학습 기록과 sync queue는 이미 `user:<id>|track:<track>` namespace다. 공개 콘텐츠는 사용자마다 중복 저장하지 않으며, 현재 TOPIK public content mirror는 아직 없으므로 cache refresher는 `jlpt-ja`에만 작동한다. TOPIK 콘텐츠 출시 전에는 별도 track-scoped store migration이 필요하다.

## 4. Home 진행률 판단

Home의 주간 %는 기존 SRS 카드 기반의 52주 기본 과정 지표다. N2/N1 출시 후에도 이 값을 N5~N1 전체 과정의 완성률처럼 표시하지 않는다.

- `n5-n3`: 기존 N5~N3 기본 과정 화면과 주간 %를 유지한다. 아직 공개되지 않은 상위 레벨을 암시하는 범위 패널은 표시하지 않는다.
- `n5-n1`: Home에 공개 범위와 분리 정책을 표시한다. 상위 레벨의 목표·주차·진단은 별도 curriculum 출시 전까지 기본 52주 %에 합산하지 않는다.

## 5. 검증 관문

| 검사 | 목적 | 상태 |
| --- | --- | --- |
| API route test | DB 분포별 `n5-n3`/`n5-n1`, N2/N1 vocab quiz | PASS - API 93 tests |
| Web unit test | shared release 순서, 오디오 범위, track cache meta key | PASS - Web 41 tests |
| N2 Browse E2E | 기본 DB 숨김 + released-status UI/IDB cache 계약 | PASS - Chromium 2, WebKit 2 |
| `pnpm verify:ci` | OpenAPI drift, type, unit, build, fresh seed verifier | PASS - public 52 / admin 7 paths, 7 migrations, manifest·FTS·FK PASS |
| Chromium | 실제 메뉴, 시각 스냅샷, N2/N1 공개, 모바일 터치 회귀 | PASS - 67 tests |
| WebKit | Safari 레이아웃·터치·N2/N1 공개 회귀 | PASS - 53 tests, Chromium 전용 시각 14 skipped |

E2E의 released N5~N1 case는 production seed가 아니라 API contract fixture를 사용한다. 서버 DB 분포 계산은 API integration test가 별도로 증명하며, 이 분리는 미검수 N2/N1 파일을 E2E용 DB seed로 우회 등록하지 않기 위한 것이다.

`verify:fresh`의 `audio_r2_key` 4,954건 누락 경고는 이번 범위 밖의 R2 오디오 승인 부채다. verifier 최소값을 낮추거나 경고를 성공으로 바꾸지 않았다.

## 6. 브라우저 안정화 보정

- 콘텐츠 version 갱신은 RootLayout에서 독립적으로 시작하고, track status 요청은 이를 기다리지 않는다. WebKit에서 화면 종료 시 status 요청이 늦게 시작되는 레이스를 제거하면서 version 변경 시 `track-status` 무효화는 유지했다.
- 768px WebKit viewport에서 스크롤바 폭 때문에 모바일과 rail 규칙이 동시에 보이는 문제를 피하기 위해 전환점은 `760px`로 통일했다. 768px 태블릿은 rail, 그 미만은 bottom tab bar를 사용한다.
- 청해 레벨 selector의 최소 높이는 44px로 올려 iPhone 터치 감사 기준을 충족한다.
- Home의 상위 레벨 안내는 실제 `n5-n1` 상태에서만 렌더링한다. 기본 `n5-n3` 운영 화면과 플랫폼별 시각 기준선에는 미공개 레벨 UI가 추가되지 않는다.
