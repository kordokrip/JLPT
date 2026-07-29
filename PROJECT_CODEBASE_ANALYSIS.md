# 개인용 JLPT · TOPIK PWA 구조 분석

기준일: 2026-07-29 KST. 이 문서는 현재 코드와 로컬 검증을 기준으로 한 간결한 구조 지도다.

## 목적

어느 기기에서나 같은 진도와 설정으로 JLPT N5~N1, TOPIK 1~6을 효율적으로 학습한다. 기능의 성공 기준은 운영 절차의 수가 아니라 실제 데이터가 PWA의 탐색·읽기·듣기·퀴즈·복습에 연결되는지다.

## 실제 실행 흐름

```text
학습 원본(docs)
  → seed generator와 검증(packages/db)
  → Cloudflare D1
  → Worker API(apps/api)
  → React PWA(apps/web)
  → 복습 기록·설정·오프라인 shell
```

| 계층 | 책임 | 유지 이유 |
| --- | --- | --- |
| `apps/web` | 반응형 PWA, 학습·복습·설정 UI | 모든 기기에서 직접 사용하는 제품 |
| `apps/api` | 인증, 콘텐츠·학습 기록 API, R2 audio 접근 | PWA와 D1/R2의 안전한 연결 |
| `packages/db` | schema, canonical migration, seed, fresh verifier | 실제 학습 데이터를 재현 가능하게 적재 |
| `packages/shared` | DTO, FSRS, 트랙·레벨 계약 | web과 API의 동작 불일치 방지 |
| `docs` | 학습 원본과 소스 조건 | 콘텐츠의 단일 원본 |
| `e2e` | Chromium/WebKit 핵심 학습 경로 | 모바일 Safari를 포함한 회귀 방지 |

## 현재 학습 데이터 상태

| 범위 | 상태 | 근거 |
| --- | --- | --- |
| JLPT N5~N3 | 기존 seed와 학습 UI가 연결됨 | `content-manifest.ts` |
| JLPT N2 | Batch 1·2·3이 main manifest, track status, PWA browse/reading path에 연결됨 | `n2-batch1.ts`, `n2-batch2.ts`, `n2-batch3.ts`, `n2-release-browse.spec.ts` |
| JLPT N1 | 데이터 없음 | `docs/06_n1/` 및 후속 batch 필요 |
| TOPIK 1~6 | 화면·DB 모델은 있으나 전체 급수별 unit 수가 부족함 | TOPIK curriculum routes/seeds |

## UX 우선순위

유지할 핵심 흐름은 홈의 오늘 학습 → 새 unit/탐색 → 퀴즈·읽기·듣기 → FSRS 복습 → 통계·간단 설정이다. 반응형 레이아웃, 터치 목표 크기, iOS safe area, WebKit E2E와 PWA app shell은 이 목적에 직접 기여하므로 유지한다.

정상 학습 오디오는 R2 asset만 재생한다. asset이 없다면 준비 상태를 표시하며 브라우저 TTS로 조용히 대체하지 않는다.

## 이번 정리에서 제거한 범위

- 사용되지 않는 `_design` Figma/Vite 골격과 빈 `guidelines` 템플릿
- 실제 seed/API/UI가 참조하지 않는 `packages/content` 중복 메타데이터 패키지
- 과거 공개 릴리스, 다중 검수, preview claim, blue/green, logpush, release control-plane 중심의 문서와 실행 프롬프트
- 현재 코드와 모순되는 중복 분석·로드맵 문서

제거하지 않은 항목은 실제 학습 UI, 데이터 원본, canonical migration, 오디오 provenance, PWA 테스트다.

## 다음 구조 단순화 후보

아래는 런타임에서 실제로 연결돼 있으므로, 즉시 삭제하면 현재 기능을 깨뜨릴 수 있다. 개인 학습 UX에 계속 필요하지 않다고 판단하면 영향 범위를 분리해 제거한다.

| 후보 | 현재 연결 | 권장 |
| --- | --- | --- |
| TOPIK owner-private release/claim 경로 | TOPIK 학습 화면, API, D1 migration, E2E | 전체 TOPIK curriculum의 일반 personal seed가 안정화된 뒤 대체·제거 |
| 다중 TTS provider와 Audio QA | Settings, admin route, audio QA 화면 | Cloudflare/R2만 유지할지 결정 후 한 번에 제거 |
| AI writing assistance | TOPIK 학습 화면과 Worker | 실제 사용하지 않으면 UI·API·설정을 함께 제거 |
| push notification, admin user 관리 | Settings/admin와 API | 개인 단일 사용자 흐름에서 쓰지 않으면 별도 정리 |

이 네 항목은 살아 있는 코드이므로, 삭제 전에 사용자에게 기능 유지 여부와 대안을 설명하고 확인받는다.
