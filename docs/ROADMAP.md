# ROADMAP - nihongo-n3 운영 로드맵

기준일: 2026-07-08 KST
기준 구조: pnpm monorepo, React PWA, Cloudflare Workers API, D1, R2, Pages

이 문서는 과거 루트 Markdown 중심 로드맵을 현재 운영 구조 기준으로 다시 정리한 것이다. 실행 우선순위는 코드 안정성, 데이터 최신성, 사용자 체감 학습 품질 순서로 둔다.

## 1. 현재 운영 기준

| 영역 | 현재 상태 | 기준 경로 |
| --- | --- | --- |
| Web | React/Vite PWA, i18n, IndexedDB, Playwright E2E | `apps/web` |
| API | Hono + OpenAPIHono Workers API | `apps/api` |
| DB | Drizzle schema, D1 migration, Markdown seed | `packages/db` |
| Shared | FSRS, DTO, audio policy, API shared contract | `packages/shared` |
| Content | 문서 메타데이터 보조 패키지 | `packages/content` |
| Docs | 학습 콘텐츠와 운영 문서 | `docs` |
| CI/CD | audit, CodeQL, deploy, backup, E2E | `.github/workflows` |

## 2. 완료된 주요 정리

### P0

- API 라우트 중복 및 OpenAPI wrapper 리스크를 정리했다.
- AI 번역 API 보호를 강화했다.
- CI 신뢰도 개선 작업을 진행했다.
- 앱 세션과 Cloudflare Access 모드가 섞이지 않도록 테스트 경로를 보강했다.

### P1

- 프론트 API DTO를 `packages/shared`의 normalizer 기준으로 수렴했다.
- `/api/v1/content/version`과 IndexedDB invalidation을 추가했다.
- 같은 기기에서 계정 전환 시 SRS/복습/sync queue가 섞이지 않도록 local user namespace를 적용했다.
- 오디오/TTS provider 정책을 `packages/shared/src/audio-policy.ts`로 코드화했다.

### P2

- `CharacterTrainer`, `QuizListening`, `SelfCheck`, `Browse`를 page container, data hook, panel/list component로 분리했다.
- 대형 페이지의 순수 계산 함수는 feature module로 이동해 단위 테스트가 page 구현에 덜 묶이도록 했다.
- 운영 문서 3종을 현재 구조 기준으로 재작성했다.

## 3. N2 콘텐츠 확장 계획

N2 파일은 루트에 추가하지 않는다. 현재 `docs` 하위 구조에 맞춰 다음 경로를 사용한다.

```text
docs/05_n2/13_kanji.md
docs/05_n2/14A_vocab_part1.md
docs/05_n2/14B_vocab_part2.md
docs/05_n2/15_grammar.md
docs/05_n2/16_reading.md
docs/05_n2/17_listening_scripts.md
```

필요 작업:

1. `packages/db/src/seed/constants.ts`에 N2 경로를 추가한다.
2. `packages/db/src/seed/seed.ts`와 `seed-diff.ts`에 N2 source mapping을 추가한다.
3. `sources` 테이블에 N2 source row를 추가하는 migration을 만든다.
4. `packages/content/src/index.ts`에 N2 문서 메타데이터를 추가한다.
5. `apps/web` 필터와 진단 화면에서 N2 표시 정책을 결정한다.

`vocab`, `grammar`, `kanji`의 `level` 컬럼은 `TEXT` 기반이므로 N2 값 자체를 위해 스키마 변경은 필요하지 않다. 다만 seed source와 UI 필터는 별도 반영이 필요하다.

## 4. 오디오/TTS 운영 계획

현재 목표는 provider를 많이 늘리는 것이 아니라 표면별 재생 경로를 예측 가능하게 만드는 것이다.

| 표면 | 기본 정책 | 이유 |
| --- | --- | --- |
| 문자 암기 kana | 브라우저 일본어 음성 우선, R2 고정 오디오 fallback | 한 글자 TTS가 기계적으로 들리는 문제 완화 |
| 단어/한자 | R2 고정 오디오 우선, 없으면 provider fallback | 반복 학습 품질 안정화 |
| 예문/청해 | 브라우저 Google/iOS 음성 우선 또는 R2 pregen | 자연스러운 문장 억양 우선 |
| QA | provider 비교 화면에서 수동 청감 비교 | 운영 provider 결정 근거 확보 |

정책 source of truth:

- `packages/shared/src/audio-policy.ts`
- `docs/00_overview/audio-tts-provider-policy-2026-07-07.md`

다음 단계:

1. 문자 암기 100개 kana 고정 오디오의 R2 품질을 수동 검수한다.
2. 청해 문제는 script 기반 browser voice와 R2 pregen 결과를 비교한다.
3. VOICEVOX는 운영 가능한 HTTPS endpoint가 있을 때만 활성화한다.
4. provider별 실패율과 fallback 로그를 admin 화면에 노출한다.

## 5. 인증과 사용자 관리

현재 구조는 앱 자체 세션을 기본으로 사용하고, Cloudflare Access는 운영 보호 모드로 분리한다.

| 기능 | 방향 |
| --- | --- |
| 이메일/비밀번호 | 앱 세션 기반 로그인 유지 |
| Google SSO | `/api/v1/auth/google/start`와 callback URI 정합성 유지 |
| Admin | 관리자 대시보드에서 사용자/세션/이벤트 확인 |
| Cloudflare Access | 운영 보호 route 또는 관리자 보호막으로 사용 |
| 로컬 데이터 | userId namespace 기준으로 IndexedDB 격리 |

Google OAuth 설정 기준:

- 승인된 JavaScript 원본: `https://nihongo-n3.pages.dev`
- 승인된 리디렉션 URI: `https://nihongo-n3-api.kordokrip.workers.dev/api/v1/auth/google/callback`

로컬 개발 시에는 localhost 원본과 callback을 별도 OAuth client 또는 dev setting으로 분리한다.

## 6. 테스트와 배포 기준

최종 배포 전 최소 기준:

```bash
pnpm typecheck
pnpm -F @nihongo-n3/api test
pnpm -F @nihongo-n3/web test:run
pnpm -F @nihongo-n3/e2e test
pnpm -F @nihongo-n3/api build
pnpm -F @nihongo-n3/web build
```

배포:

```bash
pnpm -F @nihongo-n3/api run deploy
pnpm exec wrangler pages deploy apps/web/dist --project-name=nihongo-n3 --branch=main
```

운영 smoke:

```bash
curl -fsS https://nihongo-n3-api.kordokrip.workers.dev/health
curl -fsS https://nihongo-n3-api.kordokrip.workers.dev/api/v1/content/version
curl -I -fsS https://nihongo-n3.pages.dev/
```

## 7. 다음 우선순위

| 우선순위 | 항목 | 목표 |
| --- | --- | --- |
| P3 | OpenAPI generated client 도입 검토 | 프론트/API contract drift 추가 감소 |
| P3 | 콘텐츠 품질 QA | N5-N3 어휘/문법/한자 중복, 오탈자, 예문 품질 점검 |
| P3 | 오디오 품질 대시보드 | provider, R2 hit, fallback, 실패 로그 시각화 |
| P4 | N2 콘텐츠 확장 | 현재 `docs/05_n2` 구조로 확장 |
| P4 | 학습 추천 고도화 | 자기진단, 오답, 복습 로그 기반 추천 |
