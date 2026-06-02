# Nihongo N3

JLPT N5-N3 학습용 PWA 모노레포입니다. React 웹 앱, Cloudflare Workers API, D1 데이터베이스, R2 오디오 저장소, Workers AI 기반 TTS 파이프라인으로 구성되어 있습니다.

## 현재 운영 URL

| 영역 | URL |
|---|---|
| Web | https://nihongo-n3.pages.dev |
| API | https://nihongo-n3-api.kordokrip.workers.dev |
| API Docs | https://nihongo-n3-api.kordokrip.workers.dev/api/docs |
| OpenAPI | https://nihongo-n3-api.kordokrip.workers.dev/openapi.json |

## 주요 기능

| 기능 | 상태 |
|---|---|
| 어휘/문법/한자 찾아보기 | D1 콘텐츠 API와 IndexedDB 캐시를 사용합니다. API 원본 컬럼은 웹 모델로 정규화됩니다. |
| SRS 복습 | FSRS 기반 카드 상태를 사용합니다. 카드가 없으면 시작 카드 10장을 생성할 수 있습니다. |
| 퀴즈 | 어휘 선택, 한자 읽기, 문법 빈칸, 청해 모드를 제공합니다. 데이터가 부족한 레벨은 의미 있는 데이터로 폴백합니다. |
| 청해/발음 | R2에 오디오가 없으면 Cloudflare Workers AI TTS로 온디맨드 생성 후 R2에 캐시합니다. |
| 독해 | 지문 목록, 상세, 문제 제출 흐름을 제공합니다. |
| 통계 | 스트릭과 히트맵을 API에서 조회합니다. |
| PWA | 서비스워커, 오프라인 캐시, 설치 기반을 포함합니다. |

## 모노레포 구조

```text
apps/web       React + Vite PWA
apps/api       Cloudflare Workers + Hono API
packages/db    D1 schema, seed, verify scripts
packages/shared 공통 schema와 FSRS wrapper
packages/content 콘텐츠 메타데이터 패키지
e2e            Playwright smoke/E2E tests
docs           운영 문서와 학습 콘텐츠
```

## 로컬 실행

```bash
pnpm install
pnpm -F @nihongo-n3/api dev
pnpm -F @nihongo-n3/web dev
```

웹은 기본적으로 `http://localhost:5173`에서 실행됩니다. API는 `http://localhost:8787`입니다.

## 검증 명령

```bash
pnpm typecheck
pnpm test
VITE_API_URL=https://nihongo-n3-api.kordokrip.workers.dev pnpm -F @nihongo-n3/web build
pnpm -F @nihongo-n3/api build
```

운영 URL smoke test:

```bash
E2E_BASE_URL=https://nihongo-n3.pages.dev pnpm -F @nihongo-n3/e2e test:smoke
```

## 배포

API:

```bash
pnpm -C apps/api run deploy
```

Web:

```bash
VITE_API_URL=https://nihongo-n3-api.kordokrip.workers.dev pnpm -F @nihongo-n3/web build
wrangler pages deploy apps/web/dist --project-name=nihongo-n3 --branch=main
```

## VOICEVOX 운영 연결

VOICEVOX Engine은 Docker/native 서버가 필요하므로 Cloudflare Workers/Pages 안에서 직접 실행할 수 없습니다. 먼저 외부에서 접근 가능한 HTTPS VOICEVOX Engine URL을 준비한 뒤 연결합니다.

```bash
# 1. URL, speaker, 실제 WAV 합성까지 사전 검증
node scripts/voicevox-connect.mjs --url https://VOICEVOX_ENGINE_URL --speaker 3

# 2. 검증 통과 후 Cloudflare secret 설정, API 재배포, 30개 QA 샘플 생성
node scripts/voicevox-connect.mjs --url https://VOICEVOX_ENGINE_URL --speaker 3 --apply --warmup
```

연결 후 확인:

```bash
curl https://nihongo-n3-api.kordokrip.workers.dev/admin/audio/providers
curl -X POST https://nihongo-n3-api.kordokrip.workers.dev/admin/audio/qa/warmup \
  -H 'content-type: application/json' \
  --data '{"provider":"voicevox","force":true}'
```

`/audio-qa`에서 30개 샘플을 비교한 뒤 VOICEVOX가 더 낫다고 판정되면, 관리자 오디오 큐에서 `provider: "voicevox"`, `force_regenerate: true`로 R2 오디오를 순차 재생성합니다.

## 운영상 중요한 주의사항

- 현재 `AUTH_MODE=public-owner`는 Cloudflare Access 미설정 상태에서 단일 owner 학습 흐름을 살리기 위한 임시 모드입니다.
- 실제 다중 사용자 운영 전에는 `CF_ACCESS_AUD`, `CF_TEAM_DOMAIN`, Cloudflare Access policy를 설정하고 `AUTH_MODE=cf-access`로 전환해야 합니다.
- 외부 유료 TTS/OpenAI/Google API를 새로 추가하지 않습니다. 기본 TTS는 기존 Cloudflare Workers AI 바인딩을 사용합니다.
- VOICEVOX 연결 URL은 `VOICEVOX_URL_SECRET` secret으로 설정합니다. repo의 `VOICEVOX_URL` 기본값은 빈 문자열로 유지합니다.
- 일부 N3 어휘는 한국어 의미가 비어 있어 콘텐츠 보강이 필요합니다.
- Listening 품질은 TTS/R2 생성량이 늘어날수록 개선됩니다.

## 최근 QA 기준

운영 smoke test는 desktop/mobile에서 다음 9개 메뉴를 확인합니다.

```text
홈, 복습, 찾아보기, 퀴즈, 독해, 커리큘럼, 자가진단, 통계, 설정
```

테스트는 주요 라우트 렌더링, 브라우저 콘솔 오류, API 4xx/5xx 응답을 함께 확인합니다.
