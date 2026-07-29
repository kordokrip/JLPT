# JLPT · TOPIK 개인 학습 PWA

모바일·태블릿·데스크톱에서 매일 이어서 공부하기 위한 개인용 일본어·한국어 학습 앱입니다.

핵심은 세 가지입니다.

1. 오늘의 복습을 빠르게 끝낸다.
2. 레벨별 어휘·문법·읽기·듣기를 실제 데이터로 학습한다.
3. 기기와 화면 크기가 달라도 같은 진도와 설정을 유지한다.

## 현재 학습 범위

| 트랙 | 현재 데이터 | 다음 작업 |
| --- | --- | --- |
| JLPT N5~N3 | 기존 학습 데이터와 복습·탐색·퀴즈·읽기 흐름 | 유지·품질 보강 |
| JLPT N2 | 자체 저작 Batch 1·2·3이 실제 seed/API/PWA 경로에 연결됨 | 다음 unit부터 주제별 확장 |
| JLPT N1 | 데이터 모델과 화면은 준비됨 | N2 구조 검증 후 같은 방식으로 확장 |
| TOPIK 1~6 | 트랙·기초 학습 화면과 자체 저작 초안 | 급수별 unit과 학습 데이터를 확장 |

공식 JLPT/TOPIK 문항·정답·지문·음원은 저장하거나 변형하지 않습니다. 예문, 읽기·듣기 대본, 문제와 해설은 자체 저작하며, 외부 표기·사전·음원은 파일별 라이선스와 출처가 확인된 경우만 사용합니다. 자세한 기준은 [콘텐츠 출처](./docs/ATTRIBUTIONS.md)와 [후보 레지스트리](./docs/00_overview/CONTENT_SOURCE_CANDIDATE_REGISTRY_2026-07-29.md)에 있습니다.

## 구조

```text
apps/web       React PWA: 학습 화면·복습·설정·오프라인 shell
apps/api       Cloudflare Worker: 인증·학습 API·오디오 접근
packages/db    D1 schema, migrations, seed, 콘텐츠 검증
packages/shared 공통 타입·FSRS·학습 계약
docs           실제 학습 원본과 짧은 콘텐츠 계획
e2e            Chromium/WebKit 핵심 학습 경로 테스트
```

콘텐츠는 `docs`의 원본에서 시작해 seed로 D1에 적재되고, API를 거쳐 PWA에 표시됩니다.

```text
학습 원본 → seed/검증 → D1 → API → PWA 학습·복습
```

## 로컬 실행

```bash
pnpm install
pnpm dev:api
pnpm dev:web
```

주요 검증:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm -F @nihongo-n3/db verify:fresh
```

원격 D1/R2/배포는 로컬 검증과 별도이며, 콘텐츠·UI 변경만으로 자동 실행하지 않습니다.

## 유지 원칙

- 설정은 한 곳에서 언어·테마·후리가나·학습 보조 옵션을 쉽게 바꾼다.
- 정상 학습 오디오는 승인된 R2 asset만 재생한다. 없으면 준비 상태를 명확히 표시한다.
- 개인용 앱이므로 공개 릴리스·다중 검수 절차를 콘텐츠 제작의 선행 조건으로 삼지 않는다.
- 라이선스, secret 보호, 사용자 학습 기록의 안전성은 유지한다.
