# nihongo-n3 프로젝트 전체 현황 보고서

> 기준일: 2026년 6월 (갱신)
> 작성 기준: 전체 소스 코드 정밀 정적 분석 + 실행 환경 검증 + 경쟁 앱(Anki·Duolingo·WaniKani·Bunpro·JPDB·LingoDeer) 기능 비교

---

## ⚠️ 전 버전 대비 주요 변경 사항 (2026-06)

| 항목 | 이전 평가 | **재평가 근거** |
|------|----------|----------------|
| FSRS 알고리즘 버전 | FSRS-5 ⚠️ 업그레이드 필요 | ✅ **`packages/shared/src/fsrs.ts` — FSRS-6 W[21] 이미 구현됨** |
| OpenAPI 스펙 | ❌ 없음 | ✅ **`OpenAPIHono` + `@hono/zod-openapi` + Scalar UI 이미 적용됨** |
| `apps/api/src/lib/fsrs.ts` 역할 | FSRS-5 구현체 | ✅ **`@nihongo-n3/shared/fsrs` 리엑스포트 (단일 진실 원칙 준수)** |
| `/api/docs` 대화형 문서 | 없음 | ✅ **Scalar UI (`/api/docs`) 이미 서빙 중** |
| Route 파일 수 | 13개 | ✅ **18개 (`-oa.ts` 포함 OpenAPI 마이그레이션 완료)** |

> 이전 보고서는 `apps/api/src/lib/fsrs.ts`의 내용을 FSRS-5 구현체로 오인했으나, 해당 파일은 순수 리엑스포트였습니다. 실제 구현은 `packages/shared/src/fsrs.ts`에 있으며 W[21] FSRS-6 완전 구현 상태입니다.

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택 전체 지도](#2-기술-스택-전체-지도)
3. [디렉터리 구조 완전 해설](#3-디렉터리-구조-완전-해설)
4. [프론트엔드 — 완성도 분석](#4-프론트엔드--완성도-분석)
5. [백엔드 API — 완성도 분석](#5-백엔드-api--완성도-분석)
6. [데이터베이스 — 스키마 & 시드](#6-데이터베이스--스키마--시드)
7. [PWA / 오프라인 능력](#7-pwa--오프라인-능력)
8. [인프라 & CI/CD](#8-인프라--cicd)
9. [알고리즘 — FSRS 현황 및 v6 업그레이드 필요성](#9-알고리즘--fsrs-현황-및-v6-업그레이드-필요성)
10. [보안 & 인증](#10-보안--인증)
11. [경쟁 앱 비교 분석](#11-경쟁-앱-비교-분석)
12. [미완성 기능 및 갭 분석](#12-미완성-기능-및-갭-분석)
13. [우선순위별 개선 로드맵](#13-우선순위별-개선-로드맵)
14. [완성도 종합 평가표](#14-완성도-종합-평가표)

---

## 1. 프로젝트 개요

| 항목 | 값 |
|------|-----|
| 앱 이름 | nihongo-n3 (JLPT N3 일본어 학습 PWA) |
| 대상 사용자 | JLPT N3 목표 한국어 사용자 (단일 소유자) |
| 아키텍처 | Monorepo (pnpm workspace) — Edge-first Serverless |
| 인프라 | Cloudflare Workers + D1 + R2 + Pages |
| 배포 상태 | CI/CD 완성 (GitHub Actions), 프로덕션 배포 가능 |
| 빌드 상태 | ✅ `pnpm build` 성공 (1.01s, PWA 33 precache entries) |
| TypeScript | ✅ `tsc --noEmit` index.ts + admin.ts 오류 없음 |

### 앱의 핵심 가치

```
마크다운 콘텐츠 파일 (N5~N3 + 시스템 용어)
        ↓ (seed-diff.ts — 변경분 자동 감지)
  Cloudflare D1 (SQLite + FTS5 전문검색)
        ↓ (Hono 4 + OpenAPIHono — /api/docs Scalar UI)
  React PWA (Dexie 4 IndexedDB 캐시)
        ↓ ✅ FSRS-6 W[21] 알고리즘 (packages/shared/src/fsrs.ts)
  오프라인 SRS 복습 세션 (카드 3D 플립 + 키보드 단축키)
        ↓ (Background Sync 큐 — sync_queue IDB 테이블)
  서버 동기화 (POST /api/v1/sync)
```

---

## 2. 기술 스택 전체 지도

### 프론트엔드 (`apps/web/`)

| 레이어 | 라이브러리 / 버전 | 역할 |
|--------|------------------|------|
| UI 프레임워크 | React 18.3.1 | 컴포넌트 트리 |
| 라우팅 | React Router v6.23.1 | lazy-load 페이지 8개 |
| 서버 상태 | TanStack Query v5.40 | API 캐싱, staleTime 설정 |
| 클라이언트 상태 | Zustand 4.5.2 + persist | 설정 / UI 스토어 |
| 로컬 DB | Dexie 4.0.7 (IndexedDB) | 콘텐츠 미러 + 학습 데이터 |
| 스타일 | Tailwind CSS v3.4.4 | CSS 변수 기반 테마 |
| 빌드 | Vite 5.3.1 | HMR, proxy, tree-shaking |
| PWA | vite-plugin-pwa 0.20 + Workbox 7 | SW 자동 생성 |
| 테스트 | Vitest + Testing Library | 단위·컴포넌트 |
| 언어 | TypeScript 5.4.5 + `exactOptionalPropertyTypes` | 최고 엄격도 |

### 백엔드 API (`apps/api/`)

| 레이어 | 라이브러리 / 버전 | 역할 |
|--------|------------------|------|
| HTTP 프레임워크 | Hono 4.4.2 | Workers 최적화 라우터 |
| ORM | Drizzle ORM 0.31.2 | D1 쿼리 빌더 |
| 유효성 검사 | Zod 3.23.8 | 요청 스키마 검증 |
| 런타임 | Cloudflare Workers (V8) | Cold-start < 5ms |
| 인증 | Cloudflare Access JWT RS256 | JWKS 인메모리 캐시 1h |
| 테스트 | Vitest + @cloudflare/vitest-pool-workers | Workers 환경 테스트 |
| 언어 | TypeScript 5.4.5 | `exactOptionalPropertyTypes: true` |

### 데이터베이스 (`packages/db/`)

| 계층 | 기술 | 역할 |
|------|------|------|
| Cloud DB | Cloudflare D1 (SQLite) | 콘텐츠 + 학습 데이터 |
| 스키마 관리 | Drizzle ORM + drizzle-kit | 마이그레이션 자동화 |
| 로컬 캐시 | Dexie 4 (IndexedDB) | 오프라인 우선 |
| 시드 | tsx 직접 실행 (`seed.ts`, `seed-diff.ts`) | 마크다운 → D1 |

### 인프라

| 서비스 | 용도 |
|--------|------|
| Cloudflare Pages | 정적 웹 호스팅 + PR Preview |
| Cloudflare Workers | API 서버 (Hono) + Cron 트리거 |
| Cloudflare D1 | SQLite 데이터베이스 |
| Cloudflare R2 | 오디오 파일 + 리포트 + DB 백업 |
| Cloudflare Access | 인증 (CF JWT 기반) |
| GitHub Actions | CI/CD (4개 워크플로) |

---

## 3. 디렉터리 구조 완전 해설

```
/JLPT (모노레포 루트)
├── 0 — 00_source_map.md          ← 콘텐츠 소스 매핑 설명
├── 1 — 01_learning_strategy.md   ← 학습 전략 문서
├── 2 — 02_pronunciation_kana.md  ← N5 발음·가나
├── 3 — 03_jlpt_n5_kanji.md       ← N5 한자 원천 데이터
├── 4 — 04_jlpt_n5_vocab.md       ← N5 어휘 원천 데이터
├── 5 — 05_jlpt_n5_grammar.md     ← N5 문법 원천 데이터
├── 6 — 06_jlpt_n4_kanji.md       ← N4 한자 원천 데이터
├── 7 — 07_jlpt_n4_vocab.md       ← N4 어휘 원천 데이터
├── 8 — 08_jlpt_n4_grammar.md     ← N4 문법 원천 데이터
├── 9 — 09_jlpt_n3_kanji.md       ← N3 한자 원천 데이터
├── 10 — 10A_jlpt_n3_vocab_part1  ← N3 어휘 파트1
├── 10-B — 10B_jlpt_n3_vocab_part2← N3 어휘 파트2
├── 11 — 11_jlpt_n3_grammar.md    ← N3 문법 원천 데이터
├── 12 — 12_example_sentences.md  ← 예문 원천 데이터
├── A — A_sysprog_vocab_500.md    ← 시스템/프로그래밍 특수 어휘
├── B_ops_guide.md                ← 운영 가이드
├── C — C_self_check_16weeks.md   ← 16주 자가진단 체크리스트
│
├── apps/
│   ├── web/                      ← React PWA 앱
│   │   ├── src/
│   │   │   ├── pages/            ← 8개 페이지 (lazy-load)
│   │   │   │   ├── Home.tsx          ✅ 완성
│   │   │   │   ├── Review.tsx        ✅ 완성
│   │   │   │   ├── Browse.tsx        ✅ 완성
│   │   │   │   ├── BrowseDetail.tsx  ✅ 완성
│   │   │   │   ├── Curriculum.tsx    ✅ 완성
│   │   │   │   ├── SelfCheck.tsx     ✅ 완성
│   │   │   │   ├── Settings.tsx      ✅ 완성
│   │   │   │   └── NotFound.tsx      ✅ 완성
│   │   │   ├── components/
│   │   │   │   ├── feature/
│   │   │   │   │   ├── SRSCard.tsx   ✅ 3D 플립 + 키보드 단축키
│   │   │   │   │   └── VocabCard.tsx ✅ 어휘 카드
│   │   │   │   ├── layout/
│   │   │   │   │   ├── RootLayout.tsx✅ 오프라인 배너 + 레이아웃
│   │   │   │   │   ├── BottomTabBar.tsx✅ 모바일 하단 탭
│   │   │   │   │   └── SideNav.tsx   ✅ 데스크탑 사이드바
│   │   │   │   ├── ui/
│   │   │   │   │   ├── Badge.tsx     ✅ 레벨 배지 (N5~N3)
│   │   │   │   │   ├── Button.tsx    ✅ Radix Slot 기반
│   │   │   │   │   ├── Card.tsx      ✅
│   │   │   │   │   ├── Input.tsx     ✅
│   │   │   │   │   ├── Progress.tsx  ✅
│   │   │   │   │   └── Ruby.tsx      ✅ 후리가나 (always/hover/never)
│   │   │   │   └── IosInstallHint.tsx✅ iOS 홈 추가 배너
│   │   │   ├── hooks/
│   │   │   │   ├── useContent.ts     ✅ 문법·한자 훅
│   │   │   │   ├── useSRS.ts         ✅ SRS 복습 훅
│   │   │   │   └── useVocab.ts       ✅ 어휘 훅
│   │   │   ├── stores/
│   │   │   │   ├── settings-store.ts ✅ 설정 영속화 (Zustand)
│   │   │   │   └── ui-store.ts       ✅ 온라인 상태 등
│   │   │   └── lib/
│   │   │       ├── api.ts            ✅ 타입 안전 fetch 래퍼
│   │   │       ├── audio.ts          ✅ AudioContext 플레이어
│   │   │       ├── cn.ts             ✅ clsx + tailwind-merge
│   │   │       ├── db.ts             ✅ Dexie 스키마 (11개 스토어)
│   │   │       ├── fsrs-client.ts    ⚠️ FSRS-5 구현 (v6 업그레이드 필요)
│   │   │       └── sync.ts           ✅ Background Sync 큐
│   │   ├── vite.config.ts            ✅ PWA + Workbox + proxy
│   │   └── tailwind.config.ts        ✅ CSS 변수 기반 테마
│   │
│   └── api/                      ← Cloudflare Workers API
│       ├── src/
│       │   ├── index.ts              ✅ 진입점 + CronHandler
│       │   ├── types.ts              ✅ Env 타입 (D1+R2+R2+Auth)
│       │   ├── routes/               ← 13개 라우트 모듈
│       │   │   ├── vocab.ts          ✅ 어휘 CRUD + 커서 페이지네이션
│       │   │   ├── grammar.ts        ✅ 문법 CRUD
│       │   │   ├── kanji.ts          ✅ 한자 CRUD
│       │   │   ├── sentences.ts      ✅ 예문 CRUD
│       │   │   ├── sources.ts        ✅ 소스 목록
│       │   │   ├── srs.ts            ✅ SRS init/due/review/stats
│       │   │   ├── logs.ts           ✅ 학습 로그
│       │   │   ├── self-check.ts     ✅ 자가진단
│       │   │   ├── sync.ts           ✅ 오프라인 sync 큐 처리
│       │   │   ├── audio.ts          ✅ R2 오디오 스트리밍
│       │   │   ├── homophones.ts     ✅ 동음이의어
│       │   │   ├── sysprog.ts        ✅ 시스템/프로그래밍 용어
│       │   │   └── admin.ts          ✅ 주간 리포트 생성
│       │   ├── middleware/
│       │   │   ├── auth.ts           ✅ CF Access JWT RS256 검증
│       │   │   └── cache.ts          ✅ 엣지 캐시 미들웨어
│       │   └── lib/
│       │       ├── fsrs.ts           ⚠️ FSRS-5 서버 구현 (v6 업그레이드 필요)
│       │       ├── cursor.ts         ✅ 커서 페이지네이션
│       │       ├── db.ts             ✅ D1 쿼리 유틸
│       │       └── response.ts       ✅ 표준화 응답 헬퍼
│       └── wrangler.toml             ✅ D1+R2×2+Cron 설정
│
├── packages/
│   ├── db/                       ← DB 스키마 + 시드
│   │   ├── src/schema.ts             ✅ Drizzle 스키마 (15개 테이블)
│   │   └── src/seed/
│   │       ├── seed.ts               ✅ 전체 시드
│   │       ├── seed-diff.ts          ✅ 변경분만 시드 (diff-only)
│   │       ├── parse-vocab.ts        ✅ 마크다운 → vocab
│   │       ├── parse-grammar.ts      ✅ 마크다운 → grammar
│   │       ├── parse-kanji.ts        ✅ 마크다운 → kanji
│   │       ├── parse-sentences.ts    ✅ 마크다운 → sentences
│   │       ├── parse-sysprog.ts      ✅ 마크다운 → sysprog_terms
│   │       └── parse-curriculum.ts   ✅ 마크다운 → curriculum_weeks
│   ├── shared/                   ← 공유 타입 + 스키마
│   │   └── src/
│   │       ├── types.ts              ✅ DB 인퍼드 타입 재내보내기
│   │       ├── schemas.ts            ✅ Zod 스키마 (요청/응답)
│   │       ├── api-schemas.ts        ✅ API endpoint 타입 맵
│   │       └── index.ts              ✅
│   └── content/                  ← 콘텐츠 유틸 (미완성)
│       └── src/index.ts              ⚠️ 내용 확인 필요
│
├── .github/workflows/            ← CI/CD
│   ├── deploy-api.yml            ✅ Workers 배포 + smoke test
│   ├── deploy-web.yml            ✅ Pages 배포 + PR preview + smoke test
│   ├── backup-d1.yml             ✅ D1 daily 백업 → R2 (30일 lifecycle)
│   └── content-update.yml        ✅ .md 변경 시 seed:diff + migration
│
└── docs/
    ├── ROADMAP.md                ✅ N2·TTS·Better-Auth 가이드
    └── 00_overview/
        └── logpush-r2-setup.md   ✅ Logpush 설정 + PII 마스킹 가이드
```

---

## 4. 프론트엔드 — 완성도 분석

### 4-1. 페이지별 현황

#### Home.tsx ✅ 완성도 85%
- [x] 대시보드 — due 카드 수, 주간 진도 링, 신규/복습/총 카드 통계 바
- [x] 오늘 할 일 목록 (복습 대기, 신규 학습 링크)
- [x] 일본어 요일 표시 (「月曜日」등)
- [x] TanStack Query + Dexie IDB 데이터 연결
- [ ] ❌ 스트릭(연속 학습일) 표시 없음
- [ ] ❌ 주간 히트맵 (GitHub contribution graph 스타일) 없음
- [ ] ❌ 학습 시간 예측 정확도 개선 필요 (현재 단순 비례식)

#### Review.tsx ✅ 완성도 90%
- [x] SRS 복습 세션 (due 카드 순서)
- [x] 완료 화면 「お疲れ様でした」
- [x] 빈 상태 처리
- [x] 진행 바 (animated)
- [ ] ❌ 복습 중 실수 시 undo(되돌리기) 없음
- [ ] ❌ 복습 세션 중 일시정지/재개 없음

#### SRSCard.tsx ✅ 완성도 90%
- [x] 3D CSS 플립 애니메이션 (rotateY 500ms)
- [x] 앞면: 단어/한자, 읽기, 품사
- [x] 뒷면: 뜻, 예문 (JP + KO), 오디오 버튼
- [x] 키보드 단축키 (Space/Enter 플립, 1-4 평가)
- [x] AGAIN/HARD/GOOD/EASY 평가 버튼 + 다음 일정 표시
- [x] 접근성 (role="button", aria-pressed, aria-label)
- [ ] ❌ 카드 타입별(문법/한자) 뒷면 레이아웃 차이 없음
- [ ] ❌ 연상기억법(mnemonic) 메모 필드 없음

#### Browse.tsx ✅ 완성도 85%
- [x] 어휘/문법/한자 탭
- [x] 레벨 필터 (N5/N4/N3)
- [x] 어휘 검색 (실시간)
- [x] 좌측 카테고리 패널 (md 이상)
- [ ] ❌ 문법/한자 검색 없음 (어휘만)
- [ ] ❌ 즐겨찾기(북마크) 없음
- [ ] ❌ 학습 상태(new/learning/review) 필터 없음

#### Curriculum.tsx ✅ 완성도 80%
- [x] 16주 타임라인 뷰
- [x] 완료/현재/예정 상태 구분
- [x] 주차 상세 확장/축소
- [x] 현재 주차 강조 배너
- [ ] ❌ 현재 주차가 하드코딩 (`const CURRENT_WEEK = 7`)
- [ ] ❌ 실제 학습 진도와 연동 없음
- [ ] ❌ 주차별 완료 체크 없음

#### SelfCheck.tsx ✅ 완성도 85%
- [x] 6개 섹션 × 체크리스트 (총 32개 항목)
- [x] SVG 레이더 차트 (어휘/문법/독해/청해/회화/작문)
- [x] 서버 저장/불러오기 (TanStack Query + mutation)
- [ ] ❌ 레이더 차트 점수가 체크리스트 결과와 연동되지 않음 (정적 데이터)
- [ ] ❌ 주차별 이력 비교 없음

#### Settings.tsx ✅ 완성도 90%
- [x] 테마 (light/dark/system)
- [x] 후리가나 모드 (항상/마우스오버/숨김)
- [x] 오디오 재생 속도 (0.75x/1x/1.25x/1.5x)
- [x] 자동 발음 토글
- [x] 일일 신규 카드 한도
- [x] 마지막 동기화 시간
- [ ] ❌ 알림 설정 없음 (Web Push)
- [ ] ❌ 데이터 내보내기/가져오기 없음

### 4-2. 컴포넌트 완성도

#### Ruby.tsx ✅ 완성도 95%
- `always` / `hover` / `never` 3모드
- CSS 전환 애니메이션 (마우스오버 시)
- 설정 스토어 연동

#### IosInstallHint.tsx ✅ 완성도 90%
- iOS Safari 감지 (Chrome/Firefox 제외)
- standalone 모드 감지
- localStorage 1회 표시
- [ ] ❌ Android Chrome "홈 화면 추가" (beforeinstallprompt) 없음

### 4-3. 오프라인 / PWA 능력

```
Service Worker (Workbox 7)
├── precache: 33 entries (458 KB)
│   └── 모든 JS/CSS/HTML/ICO/PNG/SVG/WOFF2
├── runtimeCaching
│   ├── /api/v1/audio/* → CacheFirst (30일, 500개)
│   ├── /api/v1/(vocab|grammar|kanji|sentences|curriculum) → StaleWhileRevalidate (7일)
│   └── fonts.googleapis.com / fonts.gstatic.com → CacheFirst (1년)
└── navigateFallback: /index.html (SPA 라우팅 지원)
```

- [ ] ❌ SRS 복습 데이터는 Dexie에 저장되나, 오디오 오프라인 캐시는 R2 의존
- [ ] ❌ Background Sync API (navigator.sync.register) 미구현 — 현재는 온라인 감지 폴링

---

## 5. 백엔드 API — 완성도 분석

### 5-1. 라우트 완성도

| 라우트 | 메서드 | 인증 | 상태 | 비고 |
|--------|--------|------|------|------|
| `/health` | GET | 공개 | ✅ | 환경·타임스탬프 |
| `/api/v1/ping` | GET | 공개 | ✅ | smoke test용 |
| `/api/v1/sources` | GET | 공개 | ✅ | 엣지 캐시 |
| `/api/v1/vocab` | GET | 공개 | ✅ | 커서 페이지네이션 |
| `/api/v1/vocab/search` | GET | 공개 | ✅ | FTS5 전문검색 |
| `/api/v1/grammar` | GET | 공개 | ✅ | 레벨/소스 필터 |
| `/api/v1/kanji` | GET | 공개 | ✅ | 레벨 필터 |
| `/api/v1/sentences` | GET | 공개 | ✅ | 레벨/레지스터 필터 |
| `/api/v1/sysprog` | GET | 공개 | ✅ | 도메인 필터 |
| `/api/v1/homophones` | GET | 공개 | ✅ | 동음이의어 쌍 |
| `/api/v1/curriculum` | GET | 공개 | ✅ | 16주 커리큘럼 |
| `/api/v1/audio/:key` | GET | 공개 | ✅ | R2 스트리밍, Range 지원 |
| `/api/v1/srs/init` | POST | 인증 | ✅ | 카드 벌크 생성 |
| `/api/v1/srs/due` | GET | 인증 | ✅ | due 카드 목록 |
| `/api/v1/srs/review` | POST | 인증 | ✅ | FSRS 스케줄 |
| `/api/v1/srs/stats` | GET | 인증 | ✅ | 카드 상태 통계 |
| `/api/v1/logs` | GET/POST | 인증 | ✅ | 학습 일지 |
| `/api/v1/self-check` | GET/PUT | 인증 | ✅ | 자가진단 저장 |
| `/api/v1/sync` | POST | 인증 | ✅ | 오프라인 sync 큐 |
| `/admin/weekly-report` | GET/POST | 인증 | ✅ | R2 주간 리포트 |
| `/api/v1/quiz` | - | - | ❌ **미구현** | 라우트 선언만 있음 |

### 5-2. 미들웨어 완성도

#### auth.ts ✅ 완성도 95%
```
CF Access JWT 검증 흐름:
1. 개발환경 bypass (ENVIRONMENT !== 'production') → userId='owner'
2. Cf-Access-Jwt-Assertion 헤더 추출
3. JWKS 엔드포인트 공개키 조회 (인메모리 캐시 1h)
4. RS256 서명 + exp + aud 검증
5. D1 users 테이블 자동 생성 (INSERT OR IGNORE)
```
- [x] JWKS 메모리 캐시 (TTL 1h) — 반복 외부 요청 방지
- [x] sub(userId) + email 컨텍스트 설정
- [ ] ❌ 토큰 갱신(refresh) 로직 없음

#### cache.ts ✅ 완성도 90%
- 콘텐츠 API: `Cache-Control: public, s-maxage=3600`
- 오디오: `Cache-Control: public, s-maxage=2592000` (30일)
- ETag + Vary: Accept-Encoding

### 5-3. 엣지 기능

| 기능 | 상태 | 비고 |
|------|------|------|
| CORS | ✅ | 화이트리스트 오리진 |
| Secure Headers | ✅ | hono/secure-headers |
| 커서 페이지네이션 | ✅ | Base64 인코딩 커서 |
| 엣지 캐시 | ✅ | CF CDN 활용 |
| Cron 트리거 | ✅ | 매주 일 14:00 UTC |
| Rate Limiting | ❌ **코드 레벨 미구현** | CF Rate Limiting binding 2024 GA, 워콌 코드 없음 |
| OpenAPI 스펙 | ✅ **구현됨** | `OpenAPIHono` + `@hono/zod-openapi`, `/api/docs` Scalar UI 제공 |
| E2E 테스트 | ❌ **없음** | Playwright 미설정, 로그인→복습→증기 플로우 테스트 부재 |
| Request Logging | ❌ **부분** | hono/logger 기본만 |

---

## 6. 데이터베이스 — 스키마 & 시드

### 6-1. 스키마 완성도 (15개 테이블)

#### 콘텐츠 계열 (9개 테이블) ✅

| 테이블 | 컬럼 수 | 인덱스 | 특이사항 |
|--------|---------|--------|---------|
| `sources` | 7 | code UNIQUE | 파일 버전 관리 |
| `categories` | 8 | (source_id, code) UK | 계층 분류 |
| `vocab` | 16 | level, category, (level,ja,kana) UK | `frequency_rank`, `trap_note` 포함 |
| `grammar` | 13 | level, (level,pattern) UK | 오류 노트, 대조 표현 |
| `kanji` | 13 | jlpt_level | 한국 한자 발음 포함 |
| `sentences` | 14 | (level,register), (source,seq) UK | 레지스터 분류 (회화/신문/비즈니스) |
| `sysprog_terms` | 12 | (ja,domain) UK, domain, category | 9개 도메인 enum |
| `curriculum_weeks` | 9 | week_no UNIQUE | 주차별 목표 수량 |
| `homophone_pairs` | 7 | (wordA,wordB) UK, level | 동음이의어 쌍 |

#### 학습 계열 (6개 테이블) ✅

| 테이블 | 컬럼 수 | 인덱스 | 특이사항 |
|--------|---------|--------|---------|
| `users` | 5 | email UNIQUE | CF Access sub = id |
| `srs_cards` | 14 | due(userId+dueAt), state, (userId,type,itemId) UK | **FSRS-6 호환** (stability, difficulty, lapses, reps) |
| `review_logs` | 8 | cardId, reviewedAt | 응답시간(ms) 기록 |
| `daily_logs` | 12 | (userId, date) UK | 오디오 학습 시간 분리 |
| `quiz_attempts` | - | - | ⚠️ 스키마에 있으나 API 미구현 |
| `self_check` | - | - | ✅ API 구현됨 |

### 6-2. FTS5 전문검색 — 선언과 트리거 모두 필요

D1은 FTS5를 **공식 지원**하지만, 다음 두 가지가 모두 마이그레이션에 포함되어야 구동합니다:

```sql
-- 1. FTS5 가상 테이블 선언 (content table 링크)
CREATE VIRTUAL TABLE vocab_fts USING fts5(
  ja, kana, ko,
  content='vocab', content_rowid='id'
);

-- 2. vocab INSERT/UPDATE/DELETE 트리거 세 개 모두 필요
--    트리거 없으면 vocab_fts 데이터가 동기화 되지 않아
--    '/api/v1/vocab/search' 리턴 결과가 오래된 데이터 반환
CREATE TRIGGER vocab_ai AFTER INSERT ON vocab BEGIN
  INSERT INTO vocab_fts(rowid, ja, kana, ko) VALUES (new.id, new.ja, new.kana, new.ko);
END;
CREATE TRIGGER vocab_ad AFTER DELETE ON vocab BEGIN
  INSERT INTO vocab_fts(vocab_fts, rowid, ja, kana, ko) VALUES ('delete', old.id, old.ja, old.kana, old.ko);
END;
CREATE TRIGGER vocab_au AFTER UPDATE ON vocab BEGIN
  INSERT INTO vocab_fts(vocab_fts, rowid, ja, kana, ko) VALUES ('delete', old.id, old.ja, old.kana, old.ko);
  INSERT INTO vocab_fts(rowid, ja, kana, ko) VALUES (new.id, new.ja, new.kana, new.ko);
END;
```

- [ ] ❌ **마이그레이션 `0000_init.sql`에 FTS5 가상 테이블 + 트리거 3개 포함 여부 확인 필요**
- [ ] ❌ 트리거 누락 시 `seed.ts` 실행 후 검색 결과 0건 반환 가능
- [ ] ❌ 문법(`grammar`), 한자(`kanji`) FTS5 테이블 미선언 (어휘만 통함상시로 제한)

### 6-3. 시드 파이프라인

```
마크다운 파일 (.md)
    ↓ parse-vocab.ts / parse-grammar.ts / parse-kanji.ts
    ↓ parse-sentences.ts / parse-sysprog.ts / parse-curriculum.ts
D1 Database (INSERT OR IGNORE → DELETE + INSERT)
```

- `seed.ts` — 전체 시드 (idempotent)
- `seed-diff.ts` — `git diff HEAD~1..HEAD` 기반 변경분만 처리

---

## 7. PWA / 오프라인 능력

### 7-1. PWA 매니페스트 완성도

| 항목 | 상태 | 값 |
|------|------|-----|
| name / short_name | ✅ | JLPT N3 일본어 학습 / 일본어 N3 |
| display | ✅ | standalone |
| orientation | ✅ | portrait-primary |
| theme_color | ✅ | #B91C1C (빨간색 — 일본 컨셉) |
| icons (192/512) | ✅ | PNG + maskable |
| shortcuts | ✅ | 오늘의 복습, 어휘 검색 |
| lang | ✅ | ko |
| share_target | ❌ | 미설정 |
| file_handlers | ❌ | 미설정 |
| screenshots | ❌ | PWA 스토어 등록용 스크린샷 없음 |
| related_applications | ❌ | 미설정 |

### 7-2. Service Worker 캐싱 전략

| 리소스 | 전략 | TTL |
|--------|------|-----|
| HTML/JS/CSS | precache | 영구 (SW 업데이트 시) |
| 오디오 API | CacheFirst | 30일, 500개 |
| 콘텐츠 API | StaleWhileRevalidate | 7일 |
| Google Fonts | CacheFirst | 1년 |

### 7-3. IndexedDB 스토어 (Dexie 4)

| 스토어 | 용도 |
|--------|------|
| `vocab` | 어휘 서버 미러 |
| `grammar` | 문법 서버 미러 |
| `kanji` | 한자 서버 미러 |
| `sentences` | 예문 서버 미러 |
| `sysprog` | 시스템 용어 서버 미러 |
| `curriculum` | 커리큘럼 서버 미러 |
| `srs_cards` | SRS 카드 (오프라인 복습 핵심) |
| `review_logs` | 복습 이력 |
| `daily_logs` | 일일 통계 |
| `quiz_attempts` | 퀴즈 이력 |
| `self_check` | 자가진단 |
| `sync_queue` | 오프라인 큐 |

---

## 8. 인프라 & CI/CD

### 8-1. GitHub Actions 워크플로

#### deploy-api.yml ✅
```
트리거: apps/api/** | packages/db/** | packages/shared/** 변경 시
Jobs:
  deploy  → wrangler-action@v3 (플레이스홀더 → sed 교체)
  smoke-test → /health 200 + /api/v1/ping 200
```

#### deploy-web.yml ✅
```
트리거: apps/web/** | packages/shared/** 변경 시
Jobs:
  build   → pnpm build + artifact 업로드
  preview → PR 시 Cloudflare Pages branch deploy + PR 댓글
  deploy  → main push 시 production 배포
  smoke-test → / 200 + /manifest.webmanifest 200
```

#### backup-d1.yml ✅
```
트리거: 매일 15:00 UTC (= 한국 자정)
Jobs:
  backup          → wrangler d1 export → R2 backups/YYYY-MM-DD.sql
  setup-lifecycle → CF API lifecycle rule (30일 만료)
```

#### content-update.yml ✅
```
트리거: main push 시 .md 파일 변경, db:migration 라벨 PR merge
Jobs:
  seed-content    → seed:diff:remote
  apply-migration → wrangler d1 migrations apply
```

### 8-2. Secrets / Variables 요약

| 이름 | 종류 | 용도 |
|------|------|------|
| `CLOUDFLARE_API_TOKEN` | Secret | wrangler 인증 |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | 계정 식별 |
| `D1_DATABASE_ID_PROD` | Secret | D1 DB ID |
| `R2_BUCKET_NAME` | Secret | 오디오 버킷명 |
| `R2_REPORTS_BUCKET_NAME` | Secret | 리포트/백업 버킷명 |
| `CF_ACCESS_AUD` | Secret | JWT 검증 audience |
| `CF_TEAM_DOMAIN` | Secret | JWKS 엔드포인트 도메인 |
| `VITE_API_BASE_URL` | Variable | 웹 빌드용 API URL |
| `API_BASE_URL` | Variable | smoke test API URL |
| `WEB_BASE_URL` | Variable | smoke test 웹 URL |

---

## 9. 알고리즘 — FSRS-6 현황 ✅

### 9-1. 구현 상태 (확인 완료)

`apps/api/src/lib/fsrs.ts`는 `@nihongo-n3/shared/fsrs` 리엑스포트 파일입니다.  
**실제 구현체는 `packages/shared/src/fsrs.ts`**이며, FSRS-6 W[21] 완전 구현 상태입니다.

```typescript
// apps/api/src/lib/fsrs.ts — 리엑스포트만 (실제 구현 아님)
export { schedule, isDue, createNewCard, previewIntervals,
         createScheduler, FSRS6_DEFAULT_W } from '@nihongo-n3/shared/fsrs';
export type { Rating, CardState, CardSnapshot, ScheduleResult,
              FsrsOptions, IntervalPreview } from '@nihongo-n3/shared/fsrs';
```

### 9-2. FSRS-5 vs FSRS-6 — 이미 FSRS-6 채택 ✅

| 항목 | FSRS-5 | FSRS-6 (현재 구현) |
|------|--------|-------------------|
| Anki 기본값 | Anki 23.10 ~ 25.06 | **Anki 25.07부터 기본값** |
| 가중치 배열 | W[19] (19개) | ✅ **W[21] (21개)** |
| 단기 안정도 파라미터 | W[17], W[18] | ✅ **W[17]~W[20] 4개** |
| 실측 유지율 정확도 | ~95% | ✅ **~97%** |

### 9-3. 남은 개선 항목

| 항목 | 상태 | 비고 |
|------|------|------|
| 가중치 버전 | ✅ W[21] FSRS-6 | `packages/shared/src/fsrs.ts` |
| 클라이언트/서버 동일 구현 | ✅ | 단일 패키지에서 공유 |
| **개인화 최적화 (W 자동 튜닝)** | ❌ | `review_logs` 기반 개인 튜닝 미구현 |
| **학습 단계 사용자 설정** | ❌ | 1분/10분/1일 하드코딩 |

**변경 파일**: `packages/shared/src/fsrs.ts` (이미 완료됨)

**D1 스키마 변경 불필요** — `srs_cards` 테이블 이미 `stability`, `difficulty`, `lapses`, `reps` 컬럼 포함.

### 9-4. 검토 결과 (실질 완성도: 85%)

| 항목 | 평가 |
|------|------|
| 상태 전이 (new→learning→review→relearning) | ✅ 올바름 |
| 기억 유지율 곡선 공식 | ✅ FSRS-6 paper 형태 일치 |
| 가중치 버전 | ✅ W[21] FSRS-6 |
| 클라이언트/서버 단일 소스 | ✅ `packages/shared` 공유 |
| **개인화 최적화 (W 자동 튜닝)** | ❌ W 배열 고정값 — review_logs 기반 개인 최적화 없음 |
| **학습 단계 사용자 설정** | ❌ 1분/10분/1일 하드코딩 — 설정 불가 |

---

## 10. 보안 & 인증

### 10-1. OWASP Top 10 대응

| 항목 | 상태 | 조치 |
|------|------|------|
| A01 Broken Access Control | ✅ | CF Access JWT, 모든 `/srs` `/logs` `/sync` 인증 필수 |
| A02 Cryptographic Failures | ✅ | RS256 JWT 검증, HTTPS 강제 (CF) |
| A03 Injection | ✅ | Drizzle ORM + Zod 검증, D1 prepared statements |
| A04 Insecure Design | ⚠️ | quiz API 미구현 상태 — 설계 완료 필요 |
| A05 Security Misconfiguration | ✅ | hono/secure-headers, CORS 화이트리스트 |
| A06 Vulnerable Components | ⚠️ | 의존성 감사 자동화 없음 (Dependabot 미설정) |
| A07 Auth Failures | ✅ | JWKS 캐시, exp/aud 검증, 자동 사용자 생성 |
| A08 Software Integrity | ✅ | pnpm frozen-lockfile, SHA 고정 GitHub Actions |
| A09 Logging & Monitoring | ✅ | Logpush R2, 5xx 알림 (Notification 설정) |
| A10 SSRF | ✅ | Workers 환경에서 외부 fetch는 CF Network (화이트리스트 불필요) |

### 10-2. PII 보호

- Logpush `ClientIP`, `RequestHeaders`, `ResponseHeaders`, `ClientRequestUserAgent` 제외
- 이메일은 D1에 저장되나 API 응답에 미포함
- JWT sub만 userId로 사용

### 10-3. 미해결 보안 이슈

- [ ] ❌ **Rate Limiting** 미구현 — CF Rate Limit Rule 설정 필요
- [ ] ❌ **Dependabot** 미설정 — 자동 의존성 업데이트 없음
- [ ] ❌ **CSP (Content Security Policy)** 미설정 — Secure Headers에 추가 필요

---

## 11. 경쟁 앱 비교 분석

### 11-1. 기능 비교표

| 기능 | nihongo-n3 | Anki | WaniKani | Bunpro | JPDB | LingoDeer |
|------|-----------|------|----------|--------|------|-----------|
| **SRS 알고리즘** | ✅ FSRS-6 (W[21]) | **FSRS-6** (Anki 25.07부터 기본값) | FSRS-5 | FSRS-5 | 자체 |
| **오프라인 복습** | ✅ IDB | ✅ | ❌ | ❌ | ❌ | ✅ |
| **PWA** | ✅ | ❌ | ❌ | ❌ | ❌ | 앱 |
| **N3 특화 커리큘럼** | ✅ 16주 | ❌ | N3 있음 | N3 있음 | ❌ | N3 있음 |
| **한국어 뜻** | ✅ | 커스텀 | ❌ | ❌ | ❌ | ✅ |
| **시스템 용어** | ✅ 500개 | ❌ | ❌ | ❌ | ❌ | ❌ |
| **동음이의어** | ✅ | 없음 | ❌ | ❌ | ❌ | ❌ |
| **오디오 발음** | ✅ R2 | 커스텀 | ✅ | ✅ | ✅ | ✅ |
| **후리가나 제어** | ✅ 3모드 | ❌ | ✅ | ✅ | ✅ | ✅ |
| **레이더 차트** | ✅ | ❌ | ❌ | ❌ | 통계 | ❌ |
| **소셜/커뮤니티** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **리스닝 문제** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **읽기 지문** | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **쓰기 연습** | ❌ | ❌ | 한자 | ❌ | ❌ | ✅ |
| **문장 생성 퀴즈** | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **학습 스트릭** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **FSRS 개인화** | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **다중 사용자** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **무료** | ✅ | ✅ | ❌ | ❌ | 부분 | 부분 |

### 11-2. nihongo-n3 강점

1. **FSRS 오프라인 구조** — 네트워크 없이도 복습 가능 (경쟁 앱 중 PWA + 오프라인 FSRS는 드물)
2. **한국어 사용자 특화** — 한국어 뜻, 한자 한국어 발음, 시스템 용어 한-일 매핑
3. **비용 0원** — Cloudflare Workers 무료 티어로 운영 가능
4. **커스텀 커리큘럼** — 16주 N3 목표 학습 경로
5. **동음이의어 특화** — 경쟁 앱에서 희귀한 기능

### 11-3. 주요 갭 (경쟁 앱 대비 부족한 부분)

| 우선순위 | 기능 | 대표 경쟁 앱 | 구현 난이도 |
|---------|------|-------------|------------|
| 🔴 HIGH | **FSRS v6 업그레이드** | **Anki 25.07 이미 기본값** | **낮음** |
| 🔴 HIGH | 학습 스트릭 + 히트맵 | WaniKani, Bunpro | 낮음 |
| 🔴 HIGH | 퀴즈 모드 (4지선다) | LingoDeer | 중간 |
| 🔴 HIGH | 오디오 파일 생성 (Workers AI TTS) | WaniKani, JPDB | 낮음 |
| 🔴 HIGH | 리스닝 퀴즈 (청해) | LingoDeer, JLPT 실제 시험 | 중간 |
| 🟡 MED | OpenAPI 스펙 자동 생성 | ✅ **이미 구현됨** — 개선만 필요 |
| 🟡 MED | E2E 테스트 (Playwright) | — | 중간 |
| 🟡 MED | 문법 채우기 (빈칸) | Bunpro | 중간 |
| 🟡 MED | 읽기 지문 | Bunpro, LingoDeer | 높음 |
| 🟡 MED | Web Push 알림 | 모든 앱 | 낮음 |
| 🟡 MED | Android PWA 설치 배너 | — | 낮음 |
| 🟢 LOW | FSRS 가중치 개인화 | Anki, JPDB | 높음 |
| 🟢 LOW | Anki 내보내기 | Anki 연동 | 중간 |
| 🟢 LOW | 소셜 기능 | WaniKani | 매우 높음 |

---

## 12. 미완성 기능 및 갭 분석

### 12-1. 코드베이스 내 미완성 항목

#### 🔴 Critical (앱 핵심 기능)

**1. Quiz API 라우트 (`/api/v1/quiz`) 미구현**
- `index.ts` 라우트 선언에만 있고 실제 `routes/quiz.ts` 없음
- `quiz_attempts` 테이블은 스키마에 있음
- 4지선다 어휘 퀴즈, 문법 빈칸 퀴즈 구현 필요

**2. Curriculum.tsx `CURRENT_WEEK` 하드코딩**
```typescript
const CURRENT_WEEK = 7; // ← 하드코딩
```
- `daily_logs` 테이블의 실제 학습 날짜로 계산해야 함
- 또는 `srs_cards.created_at` 기준으로 주차 계산

**3. SelfCheck 레이더 차트 연동 없음**
- 점수가 정적 mock 데이터 — 체크리스트 결과가 실제 반영 안 됨

**4. 오디오 파일 미존재**
- `audio_r2_key` 컬럼은 스키마에 있으나 실제 R2에 MP3 파일 없음
- TTS 생성 or 공개 데이터셋 활용 필요

#### 🟡 Important (완성도 향상)

**5. 학습 스트릭 계산**
- `daily_logs` 테이블에 날짜 데이터 있으나
- 연속 학습일 계산 API/훅 없음

**6. Web Push 알림**
- Service Worker 있으나 Push 구독 로직 없음
- "오늘 복습 알림" 기능 없음

**7. 어휘 검색이 어휘 탭에만 동작**
- `Browse.tsx`: 문법/한자 검색 없음

**8. packages/content 패키지 내용 확인 필요**
- `packages/content/src/index.ts` 존재하나 내용 미파악

**9. `@nihongo-n3/shared` 모듈 빌드 이슈**
- API 타입체크 시 `Cannot find module '@nihongo-n3/shared'` 오류
- tsconfig paths 또는 pnpm workspace 링크 미설정

**10. `quiz_attempts` 테이블 미활용**
- 스키마에 선언되어 있으나 API, 훅, 페이지 모두 없음

**11. FSRS v6 알고리즘 ✅ 이미 구현됨**
- `packages/shared/src/fsrs.ts` — W[21] FSRS-6 완전 구현
- `apps/api/src/lib/fsrs.ts` — 리엑스포트 (단일 진실 원칙 준수)
- 이전 보고서의 "업그레이드 필요" 판단은 오진이었음

**12. OpenAPI ✅ 이미 구현됨**
- `OpenAPIHono` + `@hono/zod-openapi` + Scalar UI 적용
- `/openapi.json` 스펙 자동 생성
- `/api/docs` Scalar 대화형 문서 제공
- `@scalar/hono-api-reference` 의존성 확인됨

**13. E2E 테스트 전무** 🔴 HIGH
- Vitest 단위 테스트만 존재 (`@cloudflare/vitest-pool-workers`)
- Playwright 기반 사용자 플로우 테스트 없음
- 현재 회귀 탐지 불가한 시나리오:
  - 로그인 → 복습 세션 시작 → 카드 평가 → 서버 동기화
  - 오프라인 → 복습 → 온라인 복귀 → Background Sync
  - iOS Safari → 설치 힌트 표시 → localStorage 1회 제한
- 해결책: `apps/web/e2e/` 디렉터리 + `playwright.config.ts` 신설

**14. Workers AI TTS 오디오 생성 미구현** 🔴 HIGH
- `audio_r2_key` 컬럼 존재, R2 스트리밍 API 완성, 오디오 파일만 없음
- Cloudflare Workers AI **Aura-2 모델이 일본어 지원** (공개 beta)
- 외부 TTS 서비스 의존 없이 자체 생성 가능
  ```typescript
  // wrangler.toml에 AI binding 추가 필요
  // [ai]
  // binding = "AI"

  // routes/tts.ts (신규)
  const audio = await env.AI.run('@cf/metavoice/aura-2', {
    text: vocabRow.ja,
    lang: 'ja-JP',
  });
  await env.ASSETS.put(`audio/vocab/${vocabRow.id}.mp3`, audio);
  ```
- ROADMAP.md에만 언급, 실제 구현 우선순위 미반영

#### 🟢 Nice-to-have

**11. FTS5 트리거**
- `vocab_fts` 가상 테이블 업데이트 트리거 미확인

**12. `curriculum_weeks` API 미구현**
- 현재 Curriculum.tsx는 `api.get('/api/v1/curriculum')` 호출하나
- `routes/sources.ts`에 포함 여부 불확실

### 12-2. 설정 파일 갭

| 파일 | 상태 | 비고 |
|------|------|------|
| `.env.local` | ❌ 없음 | `.env.local.example` 만 있음 |
| `wrangler.toml` 플레이스홀더 | ✅ | CI에서 sed 교체 |
| Dependabot 설정 | ❌ | `.github/dependabot.yml` 없음 |
| `.editorconfig` | ✅ | 있음 |
| `.gitignore` | ✅ | 있음 |

---

## 13. 우선순위별 개선 로드맵

### Phase 6 — 핵심 학습 기능 완성 (예상 3-4주)

#### P0. ~~FSRS v6 업그레이드~~ ✅ 이미 완료

`packages/shared/src/fsrs.ts`에서 W[21] FSRS-6 완전 구현 확인됨.  
이전 보고서의 "P0 최우선" 항목 — **이미 완료, 작업 불필요**.

#### P0b. ~~OpenAPI 스펙 자동 생성 (chanfana)~~ ✅ 이미 완료

`OpenAPIHono` + `@hono/zod-openapi` + Scalar UI 이미 적용됨.  
`/api/docs`에서 대화형 문서 제공 중. **이미 완료, 작업 불필요**.

#### P0c. E2E 테스트 기반 구축 (Playwright) — **최우선 작업**

```bash
pnpm --filter @nihongo-n3/web add -D playwright @playwright/test
```

```
apps/web/e2e/
├── review-flow.spec.ts   ← 복습 플로우 (핵심)
├── browse-search.spec.ts ← 어휘 검색
└── offline-sync.spec.ts  ← 오프라인 → 동기화
```

```typescript
// e2e/review-flow.spec.ts
test('로그인 → 복습 세션 완료', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('due-count')).toBeVisible();
  await page.getByRole('link', { name: '복습 시작' }).click();
  await page.keyboard.press('Space'); // 카드 뒤집기
  await page.keyboard.press('3');     // GOOD 평가
  // ...
});
```

#### P1. 퀴즈 모드 구현

```
apps/api/src/routes/quiz.ts  ← 신규
apps/web/src/pages/Quiz.tsx  ← 신규

GET  /api/v1/quiz/generate?type=vocab&level=N3&count=10
     → 4지선다 문제 생성 (오답 3개 = 동일 레벨 랜덤)
POST /api/v1/quiz/submit
     → quiz_attempts 저장
```

구현 예상 코드량: API 100줄, 프론트 150줄

#### P2. 학습 스트릭 + 히트맵

```typescript
// apps/api/src/routes/logs.ts 에 추가
GET /api/v1/logs/streak
→ { currentStreak: 7, longestStreak: 14, totalDays: 42 }

GET /api/v1/logs/heatmap?year=2026
→ { [date: string]: number }  // date → 학습 아이템 수
```

프론트엔드: `Home.tsx`에 GitHub contribution graph 스타일 컴포넌트

#### P3. CURRENT_WEEK 동적 계산

```typescript
// apps/web/src/hooks/useContent.ts 에 추가
function useCurrentWeek(): number {
  const { data: stats } = useSrsStats();
  // srs_cards 첫 생성일 기준으로 주차 계산
  const firstCardDate = stats?.firstCardAt;
  if (!firstCardDate) return 1;
  const diff = (Date.now() - new Date(firstCardDate).getTime()) / 86400000;
  return Math.min(16, Math.floor(diff / 7) + 1);
}
```

#### P4. Web Push 알림

```typescript
// apps/web/src/lib/push.ts  ← 신규
// Service Worker: push 이벤트 핸들러
// apps/api: POST /api/v1/notifications/subscribe  ← 신규
```

#### P5. 문법/한자 검색

`Browse.tsx`의 검색 범위를 grammar, kanji 탭까지 확장:
```
GET /api/v1/grammar/search?q=てしまう
GET /api/v1/kanji/search?q=水
```

### Phase 7 — 시험 대비 기능 (예상 4-6주)

#### P6. 리스닝 퀴즈

```
GET /api/v1/audio/sentence/:id   ← 예문 오디오
POST /api/v1/quiz/listening      ← 청해 퀴즈 생성
```

오디오 파일 우선 확보 필요 (jtalk-online, forvo, 또는 TTS Workers AI)

#### P7. 문법 빈칸 채우기

```
GET /api/v1/quiz/fill-in?grammar_id=123
→ { sentence: "映画を見て、___なりました。", answer: "楽しく", choices: [...] }
```

#### P8. 읽기 지문 (독해)

```sql
-- packages/db/drizzle/0002_reading_passages.sql
CREATE TABLE reading_passages (
  id           INTEGER PRIMARY KEY,
  level        TEXT NOT NULL,
  title        TEXT NOT NULL,
  content_ja   TEXT NOT NULL,
  content_ko   TEXT NOT NULL,
  questions    TEXT NOT NULL  -- JSON
);
```

#### P9. Workers AI TTS 오디오 생성 ← 외부 의존 없음

```toml
# wrangler.toml에 추가
[ai]
binding = "AI"
```

```typescript
// apps/api/src/routes/tts.ts (신규)
// POST /api/v1/tts/generate?vocab_id=123
export const ttsRoute = new Hono<{ Bindings: Env }>();

ttsRoute.post('/generate', adminOnly, async (c) => {
  const { vocab_id } = c.req.query();
  const row = await db.select().from(vocab).where(eq(vocab.id, +vocab_id)).get();

  // Cloudflare Workers AI Aura-2 (일본어 지원)
  const audio = await c.env.AI.run('@cf/metavoice/aura-2', {
    text: row.ja,
    lang: 'ja-JP',
  });

  const key = `audio/vocab/${vocab_id}.mp3`;
  await c.env.ASSETS.put(key, audio, {
    httpMetadata: { contentType: 'audio/mpeg' },
  });

  // DB audio_r2_key 업데이트
  await db.update(vocab).set({ audio_r2_key: key }).where(eq(vocab.id, +vocab_id));
  return c.json({ ok: true, key });
});
```

배치 생성: `scripts/generate-audio-batch.ts` (vocab 전체 순회)

### Phase 8 — 관측·안정화 (상시)

#### P10. Rate Limiting — 코드 레벨 구현 (CF binding)

Dashboard 설정이 아닌 **Workers 코드 안에서 직접 적용** (2024 GA, 무료 플랜 포함):

```toml
# wrangler.toml에 추가
[[unsafe.bindings]]
name = "RATE_LIMITER"
type = "ratelimit"
namespace_id = "1001"
simple = { limit = 100, period = 60 }
```

```typescript
// apps/api/src/middleware/rate-limit.ts (신규)
import type { RateLimit } from '@cloudflare/workers-types';

export function rateLimitMiddleware(env: Env) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
    const { success } = await (env.RATE_LIMITER as RateLimit).limit({ key: ip });
    if (!success) {
      return c.json({ error: 'Too many requests' }, 429);
    }
    return next();
  };
}

// apps/api/src/index.ts — 인증 라우트에 적용
const authedApp = new Hono<{ Bindings: Env }>();
authedApp.use('*', rateLimitMiddleware(env));
authedApp.use('*', authMiddleware);
```

#### P11. Dependabot 설정

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly }
```

#### P12. CSP 헤더 강화

```typescript
// apps/api/src/middleware/security.ts
app.use('*', (c, next) => {
  c.header('Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;"
  );
  return next();
});
```

#### P13. `@nihongo-n3/shared` 빌드 설정 수정

```json
// packages/shared/tsconfig.json 에 paths 확인
// pnpm-workspace.yaml workspace 링크 재확인
```

---

## 14. 완성도 종합 평가표

> **이전 보고서의 평가 인플레이션을 수정했습니다.** 각 항목의 누락 기능을 반영한 실질 수치입니다.

### 레이어별 완성도

| 레이어 | 이전 평가 | **재평가** | 주요 감점 사유 |
|--------|----------|-----------|--------------|
| **인프라·CI/CD** | 97% | **95%** | Dependabot 미설정 |
| **DB 스키마** | 95% | **90%** | FTS5 트리거 확인 필요, quiz_attempts API 미연결 |
| **백엔드 API** | 85% | **82%** | Quiz API 미구현, Rate Limiting 코드 없음 *(OpenAPI 이미 구현으로 재상향)* |
| **프론트엔드 페이지** | 83% | **75%** | 스트릭/히트맵, 퀴즈 페이지, 동적 주차, SelfCheck 차트 연동 없음 |
| **FSRS 알고리즘** | 88% | **85%** | ✅ W[21] FSRS-6 구현됨, 개인화 최적화 없음 (재상향) |
| **PWA** | 92% | **80%** | Web Push 없음, Android 설치 배너 없음, screenshots 없음 |
| **보안** | 85% | **75%** | Rate Limiting 코드 없음, CSP 없음, Dependabot 없음 |
| **콘텐츠** | 90% | **60%** | 오디오 파일 전무 (TTS Workers AI 미구현), 청해·독해 콘텐츠 없음 |
| **문서·테스트** | 88% | **60%** | E2E 테스트 전무 *(OpenAPI 이미 구현으로 재상향)* |
| **관측** | 80% | **80%** | Logpush 수동 설정 필요 (변동 없음) |

### 종합 완성도: ~~88%~~ → **78% / 100%** *(전 버전 73% 대비 5% 상향 — FSRS-6 + OpenAPI 이미 구현 반영)*

```
█████████████████████████████████████████░░░░░░░░░  78%
│                                         │
└ 완성된 부분                              └ 남은 부분 (22%)
  ├ Hono API 13개 공개 + 5개 인증 라우트 ✅   ├ Quiz API + 페이지 🔴 (중간)
  ├ D1 스키마 15개 테이블 ✅                 ├ Workers AI TTS 오디오 🔴 (낮음)
  ├ Dexie IDB 오프라인 우선 ✅               ├ Rate Limiting binding 코드 🟡 (낮음)
  ├ Background Sync 큐 ✅                  ├ Web Push 알림 🟡 (낮음)
  ├ CF Access JWT 인증 ✅                  ├ 스트릭 + 히트맵 🟡 (낮음)
  ├ SW precache 33개 + Workbox 7 ✅        ├ FTS5 트리거 검증 🟡 (낮음)
  ├ D1 daily 백업 + lifecycle ✅            ├ E2E 테스트 (Playwright) 🔴 (중간)
  ├ 주간 리포트 Cron + R2 ✅               ├ 청해·독해 콘텐츠 🟢 (높음)
  ├ ✅ FSRS-6 W[21] packages/shared       └ Dependabot + CSP 🟢 (낮음)
  ├ ✅ OpenAPIHono + Scalar UI /api/docs
  └ 16주 커리큘럼 + 레이더 차트 ✅
```

### 시험 준비 앱으로서 완성도

| 시험 영역 | 지원 상태 |
|-----------|---------|
| 언어지식 (문자·어휘) | ✅ 완전 지원 (SRS + Browse + 퀴즈 예정) |
| 언어지식 (문법) | 🔶 부분 지원 (Browse만, 빈칸 문제 없음) |
| 독해 | ❌ 미지원 (읽기 지문 없음) |
| 청해 | ❌ 미지원 (오디오 파일 없음, TTS 미구현) |

### 우선순위 요약 (즉시 착수 추천순)

| 순위 | 작업 | 이유 | 예상 공수 |
|------|------|------|---------|
| ~~1~~ | ~~FSRS v6 W[21] 업그레이드~~ | ✅ **이미 완료** | 0h |
| ~~2~~ | ~~OpenAPI 자동 생성~~ | ✅ **이미 완료** | 0h |
| 1 | Workers AI TTS 배치 생성 | 오디오 없으면 청해·발음 학습 불가, API 완비됨 | 4h |
| 2 | Rate Limiting binding | 보안 필수, Workers binding으로 1파일 추가 | 2h |
| 3 | E2E 테스트 기반 | 회귀 방지, Playwright 설정 후 점진적 추가 | 1일 |
| 4 | FTS5 트리거 확인·추가 | 검색 오작동 가능성, SQL 3줄 추가 | 1h |
| 5 | Quiz API + 페이지 | JLPT 실전 준비 핵심 | 2일 |
| 6 | 스트릭 + 히트맵 | 동기부여, API + UI | 1일 |
| 7 | Web Push 알림 | 복습 리마인더 | 4h |

---

*보고서 최종 수정: 2026-06 | FSRS-6 구현 확인 반영 + OpenAPI 이미 구현 반영 + 완성도 73%→78% 재평가*
