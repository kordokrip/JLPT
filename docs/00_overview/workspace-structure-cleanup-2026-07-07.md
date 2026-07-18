# JLPT 워크스페이스 구조 정리 및 리팩토링 점검 보고서

> **역사 문서:** 이 문서는 2026-07-07 구조 점검 결과다. 이후 R1 스키마 수렴, OpenAPI 분리, CI 강화 및 LearningTrack 기반 작업이 반영되었으므로 현재 상태는 `docs/00_overview/project-status-report.md`와 `docs/PROJECT_ANALYSIS_2026.md`를 따른다.

기준일: 2026-07-07 KST

## 1. 결론

현재 `JLPT` 폴더는 학습 마크다운만 있는 폴더가 아니라 Cloudflare Workers API, React PWA, D1 스키마, 공유 패키지, 콘텐츠 패키지, Playwright E2E, GitHub Actions를 포함한 pnpm 모노레포다. 루트 `package.json`도 현재는 정식 모노레포 루트로 정리되어 있으며, `pnpm typecheck`는 통과한다.

이번 점검에서 즉시 코드 수정이 필요한 JLPT 타입 오류는 발견되지 않았다. 대신 문서 수치와 일부 운영 설명이 실제 현재 구조와 조금씩 어긋나는 부분, 로컬 생성물과 운영 산출물이 섞여 보이는 부분이 남아 있다. 따라서 지금 필요한 정리는 삭제 중심이 아니라 “활성 코드 / 운영 문서 / 학습 콘텐츠 / 생성물 / 보관 자료”를 분리해서 관리하는 것이다.

별도 작업으로 확인한 `BookShelf_App`의 `npm run type-check` 실패는 JLPT 폴더 내부 문제가 아니라 별도 BookShelf 저장소의 엄격 타입 오류였다. 원인은 그룹, 알림, 프로필 영역의 배열 접근, nullable DB 결과, 알림 타입 확장 누락, `DbUser.profile_emoji` 타입 누락이었다. 해당 오류는 런타임 방어 코드와 타입 정의 정리로 수정했고 `npm run type-check`, `npm run build`가 통과했다.

## 2. 검증 스냅샷

| 항목 | 현재 결과 | 판단 |
| --- | --- | --- |
| JLPT 타입체크 | `pnpm typecheck` 통과 | 현재 모노레포 타입 기준 정상 |
| 문서 규모 | 점검 시작 시 `docs` 24개 md, 15,934 lines. 본 문서 추가 후 25개 md, 16,035 lines | 기존 문서의 15,324/15,348 lines 수치는 최신값 아님 |
| GitHub Actions | `.github/workflows` 7개 | audit, backup, CodeQL, content, deploy, E2E 존재 |
| Git 추적 파일 | 286개 | 코드/문서 중심으로 추적됨 |
| 로컬 생성물 | `node_modules` 634M, `.tmp-kana-audio*` 3.4M, E2E report/test-results 존재 | `.gitignore`로 제외되어 있음 |
| 민감 파일 | `apps/api/.env`, `apps/api/.dev.vars` 로컬 존재, 미추적 | 유지 가능하지만 절대 커밋 금지 |

## 3. 폴더별 성격

| 경로 | 성격 | 정리 기준 |
| --- | --- | --- |
| `apps/api` | Cloudflare Workers + Hono API. 인증, 학습 API, 퀴즈, 오디오/TTS, OpenAPI, 관리자 라우트 포함 | 운영 코드. 테스트와 OpenAPI 일관성 유지 대상 |
| `apps/web` | React/Vite PWA. 홈, 복습, 퀴즈, 문자 암기, 오디오 QA, 인증 화면 포함 | 사용자 체감 품질 최우선. 모바일/PWA 회귀 테스트 유지 대상 |
| `packages/db` | D1 스키마, drizzle SQL, 마이그레이션, FSRS 변환 | DB source of truth. 시드/마이그레이션 문서와 동기화 필요 |
| `packages/shared` | 공유 타입, API 스키마, FSRS 유틸 | API와 Web 사이 계약. 중복 타입 발생 시 이곳 우선 |
| `packages/content` | `docs` 콘텐츠 메타데이터와 경로 정의 | 문서 경로 변경 시 반드시 함께 갱신 |
| `docs` | 학습 콘텐츠, 운영 보고서, 로드맵, 리팩토링 백로그 | 최신 운영 상태 문서와 과거 분석 문서 구분 필요 |
| `e2e` | Playwright smoke, PWA, 모바일, 시각 회귀 테스트 | 스냅샷은 의도된 기준선만 커밋. report/test-results는 미추적 |
| `scripts` | D1 부트스트랩, 오디오 생성, VOICEVOX 연결, VAPID, Logpush 도구 | 운영 절차 README와 연결 필요 |
| `.github/workflows` | CI, 배포, 보안, 백업 자동화 | GitHub billing/account 상태에 따라 실행 실패 가능 |
| `_design` | Figma/Make 계열 참고 산출물 | 런타임 앱이 아니므로 archive/reference로 표시 유지 |
| `.tmp-kana-audio*`, `.wrangler`, `node_modules` | 로컬 생성물/캐시 | 커밋 금지. 필요 시 재생성 가능한 자료로 취급 |

## 4. BookShelf 타입체크 실패 원인과 처리 기준

`BookShelf_App`에서 발생한 `npm run type-check` 실패는 “기능이 전부 깨졌다”기보다 TypeScript의 엄격 옵션이 실제 nullable 가능성을 잡아낸 케이스다.

| 영역 | 원인 | 처리 |
| --- | --- | --- |
| 그룹 채팅 | `msgs[index]`가 없을 수 있음 | 메시지 존재 여부를 먼저 확인 |
| 모임 피드백 | `rating`이 null일 수 있음 | 별점 표시 기본값을 0으로 정규화 |
| 모임 멤버 | DB의 `profile_emoji`는 `null`, 컴포넌트는 `undefined`만 허용 | 컴포넌트 타입을 `string | null` 허용으로 수정 |
| 미팅 카드 | `split('T')[0]`가 `undefined`일 수 있음 | 날짜 비교는 `toISOString().slice(0, 10)` 사용 |
| 프로필 팝업 | 내부 store 사용자와 외부 `user` prop 계약 불일치 | 불필요한 prop 제거 |
| 알림 | `collection_created`, `collection_deleted`, `offline_sync`가 union에 없음 | 알림 타입, 아이콘, 배경 매핑 추가 |
| D1 `batch()` | 결과 배열이 비어 있을 수 있음 | `?.results ?? []` 기본값 적용 |
| 사용자 타입 | `DbUser`에 `profile_emoji`, `favorite_genres`, `reading_goal` 누락 | DB 스키마 기준 타입 보강 |

판단: 이런 오류는 `skipLibCheck`나 강제 캐스팅으로 숨기면 운영 중 빈 결과/누락 필드에서 UI가 깨질 수 있다. 따라서 현재처럼 타입을 실제 DB 응답과 맞추고, 빈 배열/기본값을 주는 방식으로 처리하는 것이 맞다.

## 5. 중복/미사용/혼재 정리 후보

| 우선순위 | 대상 | 현재 상태 | 권장 처리 |
| --- | --- | --- | --- |
| P0 | `apps/api/.env`, `apps/api/.dev.vars` | 로컬에 존재하지만 Git 미추적 | 유지하되 절대 커밋 금지. 값 유출 이력이 있으면 Cloudflare/Google secret 회전 |
| P0 | `.tmp-kana-audio`, `.tmp-kana-audio-test` | 총 184개 오디오 임시 파일, Git 미추적 | 재생성 가능한 작업 산출물로 유지. R2 업로드 완료본과 혼동하지 않게 문서화 |
| P0 | `docs/.DS_Store` | OS 생성 파일, Git 미추적 | 로컬 삭제 가능. `.gitignore`에는 이미 `.DS_Store`가 있음 |
| P1 | `docs/PROJECT_ANALYSIS_2026.md`, `docs/CODEX_ Prompt.md` | 문서 수치가 현재 15,934 lines와 다름 | 최신 수치 반영 또는 “과거 기준 문서”로 표시 |
| P1 | `docs/ROADMAP.md`, `docs/00_overview/project-status-report.md`, `docs/00_overview/B_ops_guide.md` | CF Access, 경로, 운영 기준 설명이 일부 과거 상태와 섞임 | 현재 인증/배포/오디오 운영 정책 기준으로 재정리 |
| P1 | E2E 산출물 | `playwright-report`, `test-results`는 미추적, 스냅샷은 기준선 후보 | report/test-results는 계속 제외. 스냅샷은 의도된 기준선만 유지 |
| P2 | `_design` | 참고 디자인 산출물로 보이나 앱 런타임과 분리되어 있음 | `docs/design`에 설명을 두거나 `_design/README.md` 추가 |
| P2 | `docs/00_overview/*` 보고서류 | 개선 백로그, 상태 보고, 리팩토링 계획이 서로 겹침 | source-of-truth 문서를 하나 정하고 나머지는 archive 성격 명시 |

## 6. 현재 JLPT 리팩토링 판단

1. 타입 안정성: `pnpm typecheck`가 통과하므로, 현재 단계에서 대규모 타입 리팩토링보다 기능별 회귀 테스트와 문서 최신화가 우선이다.
2. 폴더 구조: 운영 앱 코드와 학습 콘텐츠가 한 저장소에 공존하는 구조는 타당하다. 다만 `_design`, 임시 오디오, E2E 결과물이 눈에 띄어 “산만해 보이는” 문제가 있다.
3. 문서 구조: 학습 콘텐츠와 운영 보고서가 모두 `docs`에 있어 접근성은 좋지만, 최신 기준 문서와 과거 분석 문서의 경계가 약하다.
4. 인프라: Cloudflare Workers/Pages/D1/R2/AI/TTS 흐름은 코드상 존재한다. 운영 실패는 코드보다 secret, GitHub 계정 상태, 외부 TTS endpoint 여부 같은 환경 요인과 연결될 수 있다.
5. DB/콘텐츠: `packages/db`와 `packages/content`가 분리되어 있어 장기적으로 좋은 구조다. 문서 경로가 바뀌면 콘텐츠 메타데이터와 seed/diff 경로도 함께 검증해야 한다.

## 7. 다음 정리 순서

1. P0: 로컬 민감 파일과 생성물을 계속 미추적으로 유지한다. `.env`, `.dev.vars`, `.tmp-*`, `.wrangler`, `node_modules`, E2E report/test-results는 커밋하지 않는다.
2. P1: `PROJECT_ANALYSIS_2026.md`, `CODEX_ Prompt.md`, `project-status-report.md`의 기준일과 문서 수치를 현재값으로 정리한다.
3. P1: `ROADMAP.md`의 인증 설명을 현재 계정 로그인/Google SSO/Cloudflare Access 역할 분리 기준으로 재작성한다.
4. P1: 오디오 운영 문서를 Cloudflare TTS, Google TTS, VOICEVOX, R2 고정 오디오 생성 흐름으로 분리한다.
5. P2: `_design`은 런타임 앱이 아니라 참고 자료임을 명시하고, 필요 없으면 별도 archive 브랜치나 release asset로 이동한다.
6. P2: 오래된 분석 문서는 삭제보다 `docs/archive` 이동을 우선한다. 운영 의사결정 이력을 잃지 않으면서 현재 문서의 가독성을 높일 수 있다.

## 8. 이번 점검에서 사용한 명령

```bash
pnpm typecheck
find docs -type f -name '*.md' -print0 | xargs -0 wc -l
find .github/workflows -type f -maxdepth 1 -print | sort
git status --ignored --short .tmp-kana-audio .tmp-kana-audio-test .wrangler .pnpm-store node_modules e2e/node_modules e2e/playwright-report e2e/test-results apps/api/.env apps/api/.dev.vars docs/.DS_Store
```

BookShelf 별도 저장소에서는 다음을 확인했다.

```bash
npm run type-check
npm run build
```
