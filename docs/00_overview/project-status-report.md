# nihongo-n3 프로젝트 현황 보고서

기준일: 2026-07-08 KST

## 1. 현재 결론

`nihongo-n3`는 Cloudflare 기반 일본어 학습 PWA로 운영 가능한 수준의 앱/API/DB/CI 구조를 갖췄다. 최근 작업의 핵심은 기능을 무작정 늘리는 것이 아니라, 운영 중 문제가 되었던 인증, API 명세, IndexedDB stale data, 사용자별 로컬 데이터 분리, 오디오 provider 혼선, 대형 페이지 유지보수 비용을 줄이는 방향이었다.

현재 직접적인 코드 구조 기준:

- Web: `apps/web`
- API: `apps/api`
- DB/seed: `packages/db`
- Shared contract: `packages/shared`
- Content metadata: `packages/content`
- Docs: `docs`
- E2E: `e2e`
- CI/CD: `.github/workflows`

## 2. 최근 완료 작업

### P0

| 항목 | 결과 |
| --- | --- |
| API 라우트 중복 정리 | OpenAPI wrapper route 문제를 실제 schema 누락 리스크로 보고 정리 |
| AI 번역 API 보호 | 인증/rate limit/운영 보호 경로 강화 |
| CI 신뢰도 | 로컬 dev env와 GitHub Actions 차이를 줄이는 테스트 경로 보강 |
| 세션/Access 모드 | 앱 session auth와 Cloudflare Access 보호 모드 분리 |

### P1

| 항목 | 결과 |
| --- | --- |
| 프론트 API DTO | `packages/shared/src/content-dto.ts`로 normalizer 수렴 |
| 콘텐츠 갱신 | `/api/v1/content/version`과 IDB invalidation 추가 |
| 멀티 사용자 로컬 데이터 | userId namespace로 SRS/sync queue 분리 |
| 오디오/TTS 정책 | `packages/shared/src/audio-policy.ts`로 surface별 재생 정책 코드화 |

### P2

| 항목 | 결과 |
| --- | --- |
| 대형 페이지 분리 | `CharacterTrainer`, `QuizListening`, `SelfCheck`, `Browse`를 feature module로 분리 |
| 테스트 유지성 | 순수 함수 테스트 import를 page에서 feature logic으로 이동 |
| 운영 문서 최신화 | `ROADMAP.md`, `PROJECT_ANALYSIS_2026.md`, 본 보고서를 현재 기준으로 재작성 |

## 3. 현재 feature 구조

```text
apps/web/src/features/
├── browse/
│   ├── BrowseFilters.tsx
│   ├── BrowseList.tsx
│   ├── BrowseView.tsx
│   ├── types.ts
│   └── useBrowse.ts
├── character-trainer/
│   ├── CharacterTrainerView.tsx
│   ├── data.ts
│   ├── logic.ts
│   ├── types.ts
│   └── useCharacterTrainer.ts
├── quiz-listening/
│   ├── ListeningAudioPlayer.tsx
│   ├── QuizListeningView.tsx
│   ├── logic.ts
│   ├── types.ts
│   └── useListeningQuiz.ts
└── self-check/
    ├── RadarChart.tsx
    ├── SelfCheckView.tsx
    ├── data.ts
    ├── logic.ts
    ├── types.ts
    └── useSelfCheck.ts
```

페이지 파일은 라우트 컨테이너 역할만 수행한다. 기능별 데이터, 계산, 화면 패널이 분리되어 이후 UI 개선과 테스트 추가가 쉬워졌다.

## 4. 품질 기준

최종 배포 전 통과해야 하는 명령:

```bash
pnpm typecheck
pnpm -F @nihongo-n3/api test
pnpm -F @nihongo-n3/web test:run
pnpm -F @nihongo-n3/e2e test
pnpm -F @nihongo-n3/api build
pnpm -F @nihongo-n3/web build
```

운영 smoke:

```bash
curl -fsS https://nihongo-n3-api.kordokrip.workers.dev/health
curl -fsS https://nihongo-n3-api.kordokrip.workers.dev/api/v1/content/version
curl -I -fsS https://nihongo-n3.pages.dev/
```

## 5. 남은 리스크

| 리스크 | 설명 | 대응 |
| --- | --- | --- |
| GitHub billing/account lock | workflow 실패가 코드 실패가 아니라 account lock으로 발생할 수 있음 | CI 상태 해석 시 annotation 확인 |
| OAuth redirect mismatch | Pages origin과 API callback URI가 Google console 설정과 다르면 SSO 실패 | 운영/로컬 OAuth client 분리 |
| 오디오 품질 | provider fallback은 있지만 청감 품질은 R2 고정 오디오 검수에 좌우 | 문자/청해별 QA 승인 단계 추가 |
| OpenAPI client drift | DTO normalizer는 개선됐지만 generated client는 아직 아님 | P3에서 OpenAPI client 도입 검토 |
| 문서 과거본 | 오래된 보고서가 남으면 현재 판단과 충돌 가능 | `docs/archive` 또는 상단 과거 기준 표시 |

## 6. 다음 작업

1. P3: OpenAPI generated client 도입 여부 결정
2. P3: 오디오 provider 실패율과 R2 fallback 현황을 admin dashboard에 노출
3. P3: mobile visual regression 범위를 문자 암기, 청해, 자기진단까지 확대
4. P4: N2 콘텐츠를 `docs/05_n2` 구조로 추가
5. P4: 추천 기능을 자기진단, 오답, 복습 로그 기반으로 고도화

## 7. 운영 원칙

- 새 기능은 먼저 shared contract 또는 feature module 경계부터 정한다.
- API 응답 형태를 프론트에서 임시 변환하지 않고 shared DTO 또는 OpenAPI client로 수렴한다.
- IndexedDB에 저장되는 사용자 학습 데이터는 항상 userId 기준으로 격리한다.
- 오디오 재생은 surface별 정책을 코드와 문서에 동시에 반영한다.
- Cloudflare 배포 전에는 로컬 테스트와 production smoke를 분리해서 확인한다.
