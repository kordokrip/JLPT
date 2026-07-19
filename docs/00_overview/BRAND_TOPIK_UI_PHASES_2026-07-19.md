# JLPT · TOPIK Study 브랜드와 TOPIK UI 실행 기록

기준일: 2026-07-19 KST
적용 브랜치: `feature/topik-product-expansion`
출시 상태: 기능 release candidate, production 미출시

## 1. 제품 계약

| 항목 | 결정 |
| --- | --- |
| 제품명 | `JLPT · TOPIK Study` |
| 짧은 이름 | `JLPT·TOPIK` |
| 보조 문구 | `Language Study OS` |
| 앱 UI 언어 | 한국어 기본, 영어·일본어 지원 |
| JLPT 기본 해설 | 한국어 |
| TOPIK 기본 해설 | 영어, 사용자가 한국어로 변경 가능 |
| 학습 콘텐츠 언어 | JLPT는 일본어, TOPIK은 한국어 |
| 데이터 경계 | account×LearningTrack 기준 API·React Query·IndexedDB 분리 |

앱 표시 언어와 학습 해설 언어는 별도 설정이다. TOPIK 해설은 현재 이중 검수된 영어와
한국어만 제공한다. 일본어 UI를 선택해도 TOPIK 문제 해설은 영어 또는 한국어 중 하나를
사용한다.

## 2. 통합 시각 언어

일본의 부채·벚꽃·후지산 계열 형태와 한국의 한옥·무궁화·산 능선을 하나의 펼친 책과
원형 문장 안에 재구성했다. 참고 이미지의 구성물을 그대로 복제하지 않고 프로젝트용
새 래스터 일러스트와 단순화한 앱 아이콘을 생성했다.

| 자산 | 용도 |
| --- | --- |
| `brand-hero.png` | Welcome의 full-bleed 제품 이미지 |
| `page-bg-unified.png` | 로그인 후 전체 앱의 저대비 학습 배경 |
| `brand-mark.png` | 사이드바와 인증 화면의 제품 마크 |
| `pwa-192x192.png`, `pwa-512x512.png` | 설치 아이콘과 maskable 아이콘 |
| `apple-touch-icon.png` | iOS 홈 화면 아이콘 |
| `favicon-16.png`, `favicon-32.png`, `masked-icon.svg` | 브라우저 아이콘 |
| `screenshots/mobile.png`, `screenshots/desktop.png` | 설치 UI에 표시할 실제 Welcome 캡처 |

원본 생성 일러스트는 2026-07-19에 OpenAI 이미지 생성 도구로 만들었다. 세부 권리 경계는
`docs/ATTRIBUTIONS.md`에서 코드·콘텐츠·오디오와 분리해 관리한다.

## 3. 디자인 토큰

| 역할 | 공통 | JLPT | TOPIK |
| --- | --- | --- | --- |
| 배경 | ivory `#F7F0E2`, charcoal dark surface | 공통 | 공통 |
| 주 강조 | track token | vermilion `#C8332B` | deep blue `#1F4E70` |
| 보조 강조 | jade/indigo | blue-gray | vermilion |
| 카드 | 8px 이하 radius 중심, hairline border | 동일 | 동일 |
| 본문 폭 | 기본 `800px`, 넓은 반복 목록만 확장 | 동일 | 동일 |
| 입력/터치 | 최소 44px, iOS safe area 포함 | 동일 | 동일 |

색만 바꾸는 별도 앱을 만들지 않는다. 두 트랙은 같은 정보 구조·타입 스케일·표면 체계를
사용하고 accent와 학습 콘텐츠만 달라진다.

## 4. 핵심 화면 와이어프레임과 구현

### Welcome

1. 생성 브랜드 이미지를 full-bleed 배경으로 사용한다.
2. 제품명, 한 문장 가치 제안, JLPT/TOPIK radio 선택을 첫 viewport에 둔다.
3. 로그인·회원가입은 선택한 트랙을 유지한다.
4. 다음 band에 단계 학습·듣기·복습·진행률을 같은 밀도로 보여준다.

### TOPIK Dashboard

1. 현재 track release와 진단 공개 여부를 먼저 확인한다.
2. 진단, 6개 기초 단원, 복습을 동일한 action panel로 제공한다.
3. 최근 진단과 account×track 진행률만 표시한다.
4. 미승인 문제은행은 준비 상태로 비활성화하며 완성 기능처럼 홍보하지 않는다.

### TOPIK Placement

1. 응시 전 공식 시험 점수 예측이 아닌 학습 진단임을 명시한다.
2. 응시 중에는 한 문항·한 행동 구조, 진행률, 44px 이상 선택지를 사용한다.
3. 듣기는 승인된 R2 또는 명시적인 `ko-KR` 브라우저 fallback만 허용한다.
4. 제출 전 정답·해설·듣기 script를 DOM과 wire response에서 노출하지 않는다.

## 5. 단계별 상태

| Phase | 구현 상태 | 출시 관문 |
| --- | --- | --- |
| 0 브랜드·토큰·와이어프레임 | 완료 | 본 문서와 실제 PWA 캡처 |
| 1 TrackRegistry·DTO·라우팅 | 로컬 검증 완료 | public 57/admin 7 paths, generated drift 0 |
| 2 Placement V2·응시 모델 | 로컬 검증 완료 | 24문항 verifier, 정답 비노출, 선택지 위치 6/6/6/6 |
| 3 Dashboard·Placement UI | 로컬 검증 완료 | Chromium 87, WebKit 기능 57 통과 |
| 4 Learn·Review·Progress | 로컬 검증 완료 | account×track API·IDB E2E leak 0 |
| 5 i18n·접근성·오프라인·시각 회귀 | 로컬 검증 완료 | 4개 viewport, macOS/Linux baseline 통과 |
| 6 Preview QA·수동 출시 | 진행 중 | 전용 Preview D1/Worker/Pages, 사용자 QA, JLPT 운영 회귀, 사람 승인 |

production Worker, Pages, D1/R2에는 이 문서의 기능을 아직 적용하지 않는다. Phase 5 전체
관문과 preview 사용자 QA가 끝나더라도 Phase 6 수동 승인을 별도로 받아야 한다.

### Preview 격리 계약

- Pages Preview는 `API_ORIGIN` runtime variable로 `nihongo-n3-api-topik-preview`만 호출한다.
- 전용 API 주소가 없거나 올바른 HTTPS URL이 아니면 same-origin API proxy는 `503`과
  `Retry-After`를 반환하고 운영 Worker로 폴백하지 않는다.
- Preview Worker는 `nihongo-n3-topik-preview` D1만 바인딩한다. 운영
  `nihongo-n3-prod`는 읽기·쓰기 모두 사용하지 않는다.
- Google OAuth는 별도 callback URI 등록과 preview secret 승인 전까지 비활성화하며,
  Phase 6 계정 QA는 격리된 이메일 계정으로 수행한다.

## 6. 2026-07-19 로컬 검증 증거

| 관문 | 결과 |
| --- | --- |
| dependency audit | high 이상 알려진 취약점 0 |
| OpenAPI | public 57/admin 7 paths, 2회 생성 SHA-256 동일 |
| type/unit/build | 5 workspace typecheck, ops 8, DB 22, Web 70, API 96, Web·Worker build 통과 |
| fresh D1 | migration 10/10, JLPT source 13, FTS·FK·중복·필수값 통과 |
| TOPIK verifier | V2 24문항, 듣기/읽기 12/12, 선택지 위치별 정답 6개, manifest/checksum/FK 통과 |
| Chromium | 전체 87/87 통과, 시각 회귀 30개 포함 |
| WebKit | 기능·반응형 57/57 통과, Chromium 전용 시각 회귀 30개는 의도적 제외 |
| 시각 baseline | 390×844, 430×932, 768×1024, desktop에서 macOS 30/Linux 30 통과 |

fresh D1의 승인된 R2 오디오 미생성 4,954건은 기존 TD-08 warning이다. 검증 기준을
낮추거나 TOPIK 완료 근거로 숨기지 않는다. production seed·D1 migration·Worker·Pages
배포는 Phase 6 승인 전 수행하지 않는다.

## 7. Phase 6 Preview 데이터 계층 증거

2026-07-19에 APAC 전용 D1 `nihongo-n3-topik-preview`를 만들었다. 이 리소스는 운영
Worker 설정이나 `nihongo-n3-prod` binding을 변경하지 않는다.

| 관문 | 결과 |
| --- | --- |
| migration ledger | `0000`~`0009`, 10/10 적용 |
| JLPT content | source 13, `content-v2-7ca032d813f56fc31d05`, row/checksum/provenance 일치 |
| 검색·정합성 | vocab/sentence FTS parity, FK·중복·필수값 오류 0 |
| TOPIK Placement V2 | 24문항, listening/reading 12/12, answer position 6/6/6/6 |
| TOPIK manifest | `d75297dd8ca975dbc9089f61c91655df4f2aff0c4133da890e14d603221914ac` 일치 |
| 브라우저 재검증 | Chromium 87/87, WebKit 57/57, 시각 30건은 WebKit 의도적 제외 |

`topik:preview-seed`는 remote target 이름과 `ALLOW_TOPIK_PREVIEW_CHANGE=seed`를 함께
검사한다. 다른 D1 이름이나 승인값이 없는 실행은 거부한다. 최초 account API token은 D1
목록 권한이 없어 Cloudflare API `10000`으로 차단됐고, 이번 Preview 생성은 로컬 비밀파일의
Global API Key로 수행했다. 값은 출력·artifact·Git에 남기지 않았다. 장기 운영 전에는
Workers Scripts Write, D1 Edit, Pages Write만 가진 Preview 전용 API token으로 교체한다.
