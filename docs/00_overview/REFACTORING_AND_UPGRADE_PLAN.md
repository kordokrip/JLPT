# nihongo-n3 리팩토링 & 업그레이드 A-Z 마스터 플랜

> 기준일: 2026년 6월  
> 목적: 전체 코드베이스 완성도 78% → 95%+ 달성을 위한 실행 가능한 A-Z 로드맵  
> 방법론: 프론트엔드 → 백엔드 → 컴포넌트 → DB → 인프라 → 기타 기능 순서로 교차 검증까지 포함

---

## 목차

1. [현황 요약 & 전제 조건](#1-현황-요약--전제-조건)
2. [Phase A — 즉시 수정 (보안·안정성·Critical Bugs)](#2-phase-a--즉시-수정-보안안정성critical-bugs)
3. [Phase B — 핵심 학습 기능 완성](#3-phase-b--핵심-학습-기능-완성)
4. [Phase C — 프론트엔드 UX 고도화](#4-phase-c--프론트엔드-ux-고도화)
5. [Phase D — 백엔드 API 확장](#5-phase-d--백엔드-api-확장)
6. [Phase E — PWA 능력 강화](#6-phase-e--pwa-능력-강화)
7. [Phase F — DB & 검색 고도화](#7-phase-f--db--검색-고도화)
8. [Phase G — 인프라 & CI/CD 개선](#8-phase-g--인프라--cicd-개선)
9. [Phase H — 콘텐츠 파이프라인](#9-phase-h--콘텐츠-파이프라인)
10. [테스트 전략 & 교차 검증 매트릭스](#10-테스트-전략--교차-검증-매트릭스)
11. [의존성 관리 & 마이그레이션 가이드](#11-의존성-관리--마이그레이션-가이드)
12. [완성도 목표 달성 체크리스트](#12-완성도-목표-달성-체크리스트)

---

## 1. 현황 요약 & 전제 조건

### 1-1. 확인된 구현 상태 (정밀 코드 분석 결과)

| 항목 | 이전 오판 | 실제 상태 | 파일 위치 |
|------|----------|----------|----------|
| FSRS-6 알고리즘 | ❌ FSRS-5 업그레이드 필요 | ✅ W[21] 완전 구현 | `packages/shared/src/fsrs.ts` |
| OpenAPI 문서 | ❌ 없음 | ✅ OpenAPIHono + Scalar `/api/docs` | `apps/api/src/index.ts` |
| 라우트 수 | 13개 | ✅ 18개 (`-oa.ts` OpenAPI 마이그레이션 완료) | `apps/api/src/routes/` |
| API 인증 | 단순 JWT | ✅ JWKS 캐시 + D1 자동 생성 + 개발 bypass | `apps/api/src/middleware/auth.ts` |
| 캐시 미들웨어 | 확인 불명 | ✅ `contentCacheMiddleware` + `audioCacheMiddleware` | `apps/api/src/middleware/cache.ts` |

### 1-2. 빌드 상태 (기준)

```
pnpm build          → ✅ 성공 (1.01s, PWA 33 precache entries)
tsc --noEmit        → ✅ 오류 없음
pnpm test           → (단위 테스트 실행 — E2E 없음)
```

### 1-3. 전제 조건 체크리스트

- [ ] `pnpm install` 완료
- [ ] `.env.local` 설정 (`.dev.vars.example` 참조)
- [ ] `wrangler dev` 로컬 API 실행 가능
- [ ] D1 로컬 데이터 (`wrangler d1 migrations apply --local`) 완료

---

## 2. Phase A — 즉시 수정 (보안·안정성·Critical Bugs)

> **목표**: 프로덕션에서 즉시 문제가 될 수 있는 항목 해결  
> **예상 공수**: 1일  
> **우선순위**: 🔴 CRITICAL

### A-1. Rate Limiting Binding 코드 구현

**문제**: `wrangler.toml`에 CF Rate Limit Rule 설정이 없고, Workers 코드에도 Rate Limiting 없음.  
로그인 없이 접근 가능한 공개 API(`/vocab`, `/grammar`, `/search`)가 무제한 요청에 노출.

**해결**: CF Workers Rate Limiting Binding (2024 GA, Free 플랜 포함)

**Step 1 — `wrangler.toml` 수정**
```toml
# apps/api/wrangler.toml에 추가
[[unsafe.bindings]]
name = "RATE_LIMITER"
type = "ratelimit"
namespace_id = "1001"
simple = { limit = 100, period = 60 }
```

**Step 2 — `apps/api/src/types.ts` 수정**
```typescript
// Env interface에 추가
RATE_LIMITER: {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
};
```

**Step 3 — `apps/api/src/middleware/rate-limit.ts` 신규 생성**
```typescript
import type { Context, Next } from 'hono';
import type { AppEnv } from '../types.js';

export async function rateLimitMiddleware(
  c: Context<AppEnv>,
  next: Next,
): Promise<Response> {
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  const { success } = await c.env.RATE_LIMITER.limit({ key: ip });
  if (!success) {
    return c.json({ error: 'Too many requests', code: 429 }, 429);
  }
  return next();
}
```

**Step 4 — `apps/api/src/index.ts` 공개 API에 적용**
```typescript
// 공개 콘텐츠 라우트 rate limit 적용
v1.use('/vocab*', rateLimitMiddleware);
v1.use('/grammar*', rateLimitMiddleware);
v1.use('/sentences*', rateLimitMiddleware);
```

**검증**: `ab -n 200 -c 10 http://localhost:8787/api/v1/vocab` → 101번째부터 429 응답 확인

---

### A-2. CSP (Content Security Policy) 헤더 강화

**문제**: `hono/secure-headers` 기본값에 CSP 미포함.

**해결**: `apps/api/src/index.ts`에서 `secureHeaders()` 설정 확장

```typescript
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'blob:'],
    connectSrc: ["'self'", 'https://nihongo-n3-api.workers.dev'],
    mediaSrc: ["'self'", 'blob:'],
    workerSrc: ["'self'", 'blob:'],  // Service Worker
    frameAncestors: ["'none'"],
  },
  xFrameOptions: 'DENY',
  referrerPolicy: 'strict-origin-when-cross-origin',
}));
```

---

### A-3. Dependabot 설정

**파일**: `.github/dependabot.yml` 신규 생성

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: "09:00"
      timezone: "Asia/Seoul"
    open-pull-requests-limit: 5
    labels:
      - "dependencies"
    ignore:
      # 메이저 버전 업데이트는 수동 검토
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]
```

---

### A-4. FTS5 트리거 검증

**문제**: `0000_init.sql`에 FTS5 트리거가 있는지 실행 확인 필요.  
현재 코드베이스에는 트리거 선언이 있으나, 시드 이후 검색 결과가 0건일 경우 의심해야 함.

**검증 명령**:
```bash
wrangler d1 execute nihongo-n3 \
  --command="SELECT count(*) FROM vocab_fts" \
  --local

# 결과가 0이면 트리거 누락
wrangler d1 execute nihongo-n3 \
  --command="SELECT name FROM sqlite_master WHERE type='trigger'" \
  --local
```

**수동 수정 (트리거 누락 시)**: `packages/db/drizzle/0001_fts_triggers.sql` 신규 생성

```sql
-- vocab FTS 트리거 수동 추가
CREATE TRIGGER IF NOT EXISTS vocab_fts_ai AFTER INSERT ON vocab BEGIN
  INSERT INTO vocab_fts(rowid, ja, kana, ko) VALUES (NEW.id, NEW.ja, NEW.kana, NEW.ko);
END;
CREATE TRIGGER IF NOT EXISTS vocab_fts_ad AFTER DELETE ON vocab BEGIN
  INSERT INTO vocab_fts(vocab_fts, rowid, ja, kana, ko)
  VALUES ('delete', OLD.id, OLD.ja, OLD.kana, OLD.ko);
END;
CREATE TRIGGER IF NOT EXISTS vocab_fts_au AFTER UPDATE ON vocab BEGIN
  INSERT INTO vocab_fts(vocab_fts, rowid, ja, kana, ko)
  VALUES ('delete', OLD.id, OLD.ja, OLD.kana, OLD.ko);
  INSERT INTO vocab_fts(rowid, ja, kana, ko) VALUES (NEW.id, NEW.ja, NEW.kana, NEW.ko);
END;
```

---

## 3. Phase B — 핵심 학습 기능 완성

> **목표**: JLPT 실전 대비를 위한 핵심 미구현 기능 완성  
> **예상 공수**: 1주일  
> **우선순위**: 🔴 HIGH

### B-1. Quiz API 구현 (`apps/api/src/routes/quiz.ts`)

현재 `quiz_attempts` 테이블과 `index.ts` 선언만 있고 실제 라우트 없음.

**API 설계**:
```
GET  /api/v1/quiz/generate  — 4지선다 문제 생성 (인증 필요)
POST /api/v1/quiz/submit    — 정답 제출 + quiz_attempts 저장
GET  /api/v1/quiz/history   — 퀴즈 이력 (날짜별)
GET  /api/v1/quiz/stats     — 정답률 통계 (type별)
```

**문제 생성 로직** (`quiz.ts`):
```typescript
// GET /api/v1/quiz/generate?type=vocab&level=N3&count=10
quizRouter.get('/quiz/generate', cfAccessAuth, async (c) => {
  const { type = 'vocab', level = 'N3', count = '10' } = c.req.query();
  const n = Math.min(parseInt(count, 10), 50);

  // 정답 풀 (랜덤 n개)
  const correct = await c.env.DB.prepare(
    `SELECT id, ja, ko, kana FROM vocab
     WHERE level = ? ORDER BY RANDOM() LIMIT ?`,
  ).bind(level, n).all<{ id: number; ja: string; ko: string; kana: string }>();

  // 오답 풀 (정답 제외, 동일 레벨)
  const questions = await Promise.all(
    correct.results.map(async (item) => {
      const distractors = await c.env.DB.prepare(
        `SELECT ko FROM vocab WHERE level = ? AND id != ?
         ORDER BY RANDOM() LIMIT 3`,
      ).bind(level, item.id).all<{ ko: string }>();

      const choices = shuffle([
        { text: item.ko, correct: true },
        ...distractors.results.map(d => ({ text: d.ko, correct: false })),
      ]);

      return {
        vocab_id: item.id,
        question: item.ja,
        kana: item.kana,
        choices,
      };
    }),
  );

  return ok(c, questions);
});
```

**프론트엔드**: `apps/web/src/pages/Quiz.tsx` 신규 + `App.tsx`에 `/quiz` 라우트 추가

---

### B-2. 학습 스트릭 + 히트맵 API

**API 확장** (`apps/api/src/routes/logs.ts`에 추가):

```typescript
// GET /api/v1/logs/streak
logsRouter.get('/logs/streak', cfAccessAuth, async (c) => {
  const userId = c.get('userId');
  
  // 최근 365일 학습 일지
  const rows = await c.env.DB.prepare(
    `SELECT log_date FROM daily_logs
     WHERE user_id = ? AND reviews_done > 0
     ORDER BY log_date DESC LIMIT 365`,
  ).bind(userId).all<{ log_date: string }>();

  const dates = rows.results.map(r => r.log_date);
  
  // 현재 스트릭 계산
  let currentStreak = 0;
  const today = new Date().toISOString().slice(0, 10);
  let checkDate = today;
  
  for (const date of dates) {
    if (date === checkDate) {
      currentStreak++;
      const d = new Date(checkDate);
      d.setDate(d.getDate() - 1);
      checkDate = d.toISOString().slice(0, 10);
    } else break;
  }

  // 최장 스트릭 계산 (SQL 윈도우 함수 활용)
  const longestResult = await c.env.DB.prepare(`
    WITH dated AS (
      SELECT log_date,
             date(log_date, '-' || row_number() OVER (ORDER BY log_date) || ' days') AS grp
      FROM daily_logs
      WHERE user_id = ? AND reviews_done > 0
    )
    SELECT MAX(cnt) AS longest
    FROM (SELECT count(*) AS cnt FROM dated GROUP BY grp)
  `).bind(userId).first<{ longest: number }>();

  return ok(c, {
    currentStreak,
    longestStreak: longestResult?.longest ?? 0,
    totalDays: dates.length,
  });
});

// GET /api/v1/logs/heatmap?year=2026
logsRouter.get('/logs/heatmap', cfAccessAuth, async (c) => {
  const userId = c.get('userId');
  const year = c.req.query('year') ?? new Date().getFullYear().toString();
  
  const rows = await c.env.DB.prepare(
    `SELECT log_date, reviews_done + new_cards AS total
     FROM daily_logs
     WHERE user_id = ? AND log_date LIKE ?`,
  ).bind(userId, `${year}-%`).all<{ log_date: string; total: number }>();

  const heatmap: Record<string, number> = {};
  for (const row of rows.results) {
    heatmap[row.log_date] = row.total;
  }
  
  return ok(c, heatmap);
});
```

**프론트엔드**: `apps/web/src/pages/Home.tsx`에 스트릭 배너 + GitHub 히트맵 컴포넌트 추가

---

### B-3. Curriculum.tsx 동적 주차 계산

**문제**: `const CURRENT_WEEK = 7;` 하드코딩.

**해결**:
```typescript
// apps/web/src/hooks/useContent.ts에 추가
export function useCurrentWeek(): number {
  const { data: stats } = useSrsStats();
  
  if (!stats?.firstCardAt) return 1;
  
  const diffMs = Date.now() - new Date(stats.firstCardAt).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.min(16, Math.max(1, Math.floor(diffDays / 7) + 1));
}
```

`apps/api/src/routes/srs.ts`의 `/srs/stats` 엔드포인트에 `firstCardAt` 필드 추가:
```typescript
// GET /srs/stats 응답에 추가
const firstCard = await c.env.DB.prepare(
  'SELECT MIN(created_at) AS first FROM srs_cards WHERE user_id = ?',
).bind(userId).first<{ first: string }>();
return ok(c, { ...existingStats, firstCardAt: firstCard?.first ?? null });
```

---

### B-4. SelfCheck 레이더 차트 연동

**문제**: `SelfCheck.tsx` 레이더 차트 점수가 정적 mock 데이터.

**해결**: 체크리스트 체크 결과를 6개 카테고리 점수(0-100)로 변환

```typescript
// apps/web/src/pages/SelfCheck.tsx 수정
function calcScores(checks: Record<string, boolean>): RadarScores {
  const categories = {
    vocab: Object.entries(checks).filter(([k]) => k.startsWith('v')).filter(([,v]) => v).length,
    grammar: Object.entries(checks).filter(([k]) => k.startsWith('g')).filter(([,v]) => v).length,
    // ...카테고리별 체크 집계
  };
  
  return {
    어휘: Math.round((categories.vocab / VOCAB_CHECK_COUNT) * 100),
    문법: Math.round((categories.grammar / GRAMMAR_CHECK_COUNT) * 100),
    // ...
  };
}
```

---

## 4. Phase C — 프론트엔드 UX 고도화

> **목표**: 사용자 경험 완성도 향상 + 접근성 개선  
> **예상 공수**: 3-4일  
> **우선순위**: 🟡 MEDIUM

### C-1. 복습 Undo (되돌리기) 기능

**문제**: `Review.tsx` — 복습 중 실수로 틀린 평가를 준 경우 되돌리기 불가.

**해결**:
```typescript
// apps/web/src/pages/Review.tsx
const [history, setHistory] = useState<Array<{ card: SrsCard; rating: Rating }>>([]);

const handleUndo = async () => {
  const last = history[history.length - 1];
  if (!last) return;
  
  // 서버에 undo 요청 (이전 상태 복원)
  await api.post('/srs/undo', { card_id: last.card.id });
  setReviewed(n => n - 1);
  setHistory(prev => prev.slice(0, -1));
};
```

**API 추가** (`apps/api/src/routes/srs.ts`):
```typescript
// POST /srs/undo — 마지막 복습 취소
srs.post('/srs/undo', cfAccessAuth, async (c) => {
  const { card_id } = await c.req.json();
  const userId = c.get('userId');
  
  // review_logs에서 최신 항목 조회
  const lastLog = await c.env.DB.prepare(
    `SELECT * FROM review_logs WHERE card_id = ? ORDER BY reviewed_at DESC LIMIT 1`,
  ).bind(card_id).first();
  
  if (!lastLog) return notFound(c, '복습 기록 없음');
  
  // card를 이전 상태로 복원 (이전 stability/difficulty 적용)
  await c.env.DB.prepare(
    `UPDATE srs_cards SET
       stability = ?, difficulty = ?, state = ?, due_at = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
  ).bind(
    lastLog.stability_before, lastLog.difficulty_before,
    lastLog.state_before, lastLog.due_at_before,
    new Date().toISOString(), card_id, userId,
  ).run();
  
  // 최신 review_log 삭제
  await c.env.DB.prepare('DELETE FROM review_logs WHERE id = ?').bind(lastLog.id).run();
  
  return ok(c, { undone: true });
});
```

> **DB 마이그레이션 필요**: `review_logs`에 `stability_before`, `difficulty_before`, `state_before`, `due_at_before` 컬럼 추가.

---

### C-2. Browse 문법·한자 검색 확장

**문제**: `Browse.tsx` 검색이 vocab 탭에서만 동작.

**백엔드 추가**:
```typescript
// apps/api/src/routes/grammar.ts에 추가
// GET /api/v1/grammar/search?q=てしまう
grammarRouter.get('/grammar/search', async (c) => {
  const q = c.req.query('q') ?? '';
  if (!q.trim()) return ok(c, []);
  
  const rows = await c.env.DB.prepare(
    `SELECT * FROM grammar
     WHERE pattern LIKE ? OR meaning_ko LIKE ?
     LIMIT 30`,
  ).bind(`%${q}%`, `%${q}%`).all();
  
  return ok(c, rows.results ?? []);
});
```

> **참고**: grammar/kanji 검색은 FTS5 가상 테이블이 없으므로 LIKE 검색으로 대체.  
> 향후 `grammar_fts`, `kanji_fts` 추가 시 FTS5로 업그레이드.

---

### C-3. Android Chrome 설치 배너 (`beforeinstallprompt`)

**문제**: `IosInstallHint.tsx`는 iOS만 지원. Android에서 설치 유도 없음.

**해결**:
```typescript
// apps/web/src/components/IosInstallHint.tsx 확장 또는
// apps/web/src/components/InstallBanner.tsx 신규 생성

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  
  if (!deferredPrompt) return null;
  
  const handleInstall = async () => {
    (deferredPrompt as any).prompt();
    const { outcome } = await (deferredPrompt as any).userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };
  
  return (
    <div className="fixed bottom-20 left-4 right-4 bg-card border border-border rounded-xl p-4 shadow-lg z-50">
      <p className="text-sm font-medium mb-2">홈 화면에 추가하기</p>
      <p className="text-xs text-muted-foreground mb-3">오프라인에서도 학습 가능합니다</p>
      <div className="flex gap-2">
        <button onClick={handleInstall} className="px-4 py-2 bg-accent text-white rounded-lg text-sm">
          설치
        </button>
        <button onClick={() => setDeferredPrompt(null)} className="px-4 py-2 text-muted-foreground text-sm">
          나중에
        </button>
      </div>
    </div>
  );
}
```

---

### C-4. 카드 타입별 뒷면 레이아웃 분화

**문제**: `SRSCard.tsx` 문법/한자 카드도 vocab 뒷면과 동일한 레이아웃 사용.

**해결**: `itemType` prop 추가 → 조건부 렌더링

```typescript
// SRSCard.tsx props 확장
interface SRSCardProps {
  // ... 기존 props
  itemType: 'vocab' | 'grammar' | 'kanji' | 'sentence' | 'sysprog';
}

// 뒷면 렌더링
{itemType === 'grammar' && (
  <div>
    <p className="text-sm text-muted-foreground">접속 방법</p>
    <p className="font-medium">{connection}</p>
    <p className="text-sm mt-2">{contrast}</p>
  </div>
)}
{itemType === 'kanji' && (
  <div className="grid grid-cols-2 gap-3">
    <div><span className="text-xs text-muted-foreground">音読み</span><p>{onReading}</p></div>
    <div><span className="text-xs text-muted-foreground">訓読み</span><p>{kunReading}</p></div>
  </div>
)}
```

---

## 5. Phase D — 백엔드 API 확장

> **목표**: API 완성도 82% → 92% 달성  
> **예상 공수**: 3-5일  
> **우선순위**: 🔴 HIGH

### D-1. Workers AI TTS 오디오 생성 파이프라인

현재 `audio_r2_key` 컬럼은 있으나 R2에 실제 오디오 파일 없음.

**Step 1 — `wrangler.toml`에 AI Binding 추가**:
```toml
# apps/api/wrangler.toml
[ai]
binding = "AI"
```

**Step 2 — `apps/api/src/types.ts` 업데이트**:
```typescript
export interface Env {
  // ... 기존 바인딩
  AI: {
    run: (model: string, options: { text: string; lang?: string }) => Promise<ArrayBuffer>;
  };
}
```

**Step 3 — TTS 라우트 신규 생성** (`apps/api/src/routes/tts.ts`):
```typescript
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { cfAccessAuth } from '../middleware/auth.js';
import { ok, badRequest } from '../lib/response.js';
import { eq } from 'drizzle-orm';
import { vocab } from '@nihongo-n3/db/schema';
import { getDb } from '../lib/db.js';

const tts = new Hono<AppEnv>();

// POST /tts/generate — 단일 어휘 TTS 생성 (관리자용)
tts.post('/tts/generate', cfAccessAuth, async (c) => {
  const { vocab_id, force = false } = await c.req.json<{ vocab_id: number; force?: boolean }>();
  
  const db = getDb(c.env.DB);
  const row = await db.select().from(vocab).where(eq(vocab.id, vocab_id)).get();
  if (!row) return badRequest(c, '어휘 없음');
  
  const cacheKey = `audio/vocab/${vocab_id}.mp3`;
  
  // 이미 있으면 스킵 (force 없이)
  if (!force) {
    const exists = await c.env.ASSETS.head(cacheKey);
    if (exists) return ok(c, { key: cacheKey, cached: true });
  }
  
  // Workers AI Aura-2 (일본어)
  // 참고: 모델명은 CF AI 카탈로그 최신값 확인 필요
  const audioBuffer = await c.env.AI.run('@cf/metavoice/aura-2', {
    text: row.ja,
    lang: 'ja-JP',
  });
  
  await c.env.ASSETS.put(cacheKey, audioBuffer, {
    httpMetadata: { contentType: 'audio/mpeg' },
  });
  
  // DB 업데이트
  await db.update(vocab)
    .set({ audio_r2_key: cacheKey, updated_at: new Date().toISOString() })
    .where(eq(vocab.id, vocab_id));
  
  return ok(c, { key: cacheKey, generated: true });
});
```

**Step 4 — 배치 생성 스크립트** (`scripts/generate-audio-batch.ts`):
```typescript
// 전체 vocab 순회하면서 audio_r2_key 없는 항목 TTS 생성
const vocabList = await fetch(`${API_BASE}/api/v1/vocab?limit=9999`).then(r => r.json());
for (const item of vocabList.data) {
  if (!item.audio_r2_key) {
    await fetch(`${API_BASE}/api/v1/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
      body: JSON.stringify({ vocab_id: item.id }),
    });
    await sleep(200); // Rate limit 방지
  }
}
```

> **비용 참고**: CF Workers AI 유료 플랜 필요 (AI 바인딩 사용 시). 무료 티어는 매우 제한적.  
> 대안: 외부 OpenAI TTS API 프록시 (ROADMAP.md 참조) — 비용: $0.015/1K chars.

---

### D-2. Web Push 알림 API

**Step 1 — `push_subscriptions` 테이블 추가** (새 마이그레이션):
```sql
-- packages/db/drizzle/0001_push_subscriptions.sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT    NOT NULL,
  p256dh     TEXT    NOT NULL,
  auth       TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, endpoint)
);
```

**Step 2 — Push 라우트** (`apps/api/src/routes/push.ts`):
```typescript
// POST /api/v1/push/subscribe   — 구독 등록
// DELETE /api/v1/push/subscribe — 구독 해제
// POST /api/v1/push/send        — 알림 전송 (관리자용)
// POST /api/v1/push/daily       — 일일 복습 알림 (Cron)
```

**Step 3 — Cron 연동** (`apps/api/src/index.ts`):
```typescript
// 매일 오전 8시 KST (= 23:00 UTC)
// wrangler.toml: crons = ["0 23 * * *"]
export default {
  // ... 기존 fetch handler
  async scheduled(event: ScheduledEvent, env: Env) {
    if (event.cron === '0 23 * * *') {
      await sendDailyReviewReminders(env);
    }
  },
};
```

---

### D-3. grammar/kanji FTS5 검색 테이블 추가

```sql
-- packages/db/drizzle/0002_grammar_kanji_fts.sql
CREATE VIRTUAL TABLE IF NOT EXISTS grammar_fts USING fts5(
  pattern, meaning_ko, content='grammar', content_rowid='id', tokenize='unicode61'
);
CREATE VIRTUAL TABLE IF NOT EXISTS kanji_fts USING fts5(
  character, meaning_ko, content='kanji', content_rowid='id', tokenize='unicode61'
);

-- grammar 트리거
CREATE TRIGGER IF NOT EXISTS grammar_fts_ai AFTER INSERT ON grammar BEGIN
  INSERT INTO grammar_fts(rowid, pattern, meaning_ko)
  VALUES (NEW.id, NEW.pattern, NEW.meaning_ko);
END;
-- ... (DELETE, UPDATE 트리거)

-- kanji 트리거
CREATE TRIGGER IF NOT EXISTS kanji_fts_ai AFTER INSERT ON kanji BEGIN
  INSERT INTO kanji_fts(rowid, character, meaning_ko)
  VALUES (NEW.id, NEW.character, NEW.meaning_ko);
END;
-- ... (DELETE, UPDATE 트리거)
```

---

## 6. Phase E — PWA 능력 강화

> **목표**: Lighthouse PWA 점수 최대화, iOS/Android 설치 경험 개선  
> **예상 공수**: 2일  
> **우선순위**: 🟡 MEDIUM

### E-1. Background Sync API 실제 구현

**현재 상태**: `sync_queue` IDB 테이블 + 온라인 상태 폴링으로 수동 처리.  
**목표**: `navigator.sync.register('sync-reviews')` — 진정한 Background Sync.

```typescript
// apps/web/src/lib/sync.ts 수정
export async function queueReviewForSync(review: ReviewLog): Promise<void> {
  // 1. IDB sync_queue에 저장
  await db.sync_queue.add({ ... });
  
  // 2. Service Worker Background Sync 등록
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('sync-reviews');
  }
}
```

**Service Worker 수정** (Workbox SW로는 직접 수정 필요):
```javascript
// apps/web/public/sw.js 또는 vite.config.ts의 workbox additionalManifestEntries
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reviews') {
    event.waitUntil(syncPendingReviews());
  }
});

async function syncPendingReviews() {
  // IDB sync_queue에서 pending 항목 가져와서 서버에 POST /api/v1/sync
}
```

> **호환성**: Chrome/Android 지원. iOS Safari 미지원 (Periodic Sync도 iOS 미지원).  
> iOS에서는 온라인 복귀 이벤트 감지 폴링 유지.

---

### E-2. PWA Manifest 완성도 개선

**`vite.config.ts` 수정** (manifest 섹션):
```typescript
manifest: {
  // 기존 설정 유지 + 추가:
  screenshots: [
    {
      src: 'screenshot-home.png',
      sizes: '540x720',
      type: 'image/png',
      form_factor: 'narrow',
      label: '오늘의 학습 대시보드',
    },
    {
      src: 'screenshot-review.png',
      sizes: '540x720',
      type: 'image/png',
      form_factor: 'narrow',
      label: 'SRS 복습 카드',
    },
  ],
  share_target: {
    action: '/share',
    method: 'GET',
    params: { text: 'text', url: 'url' },
  },
  // description은 이미 있음
},
```

**스크린샷 생성**: `scripts/capture-screenshots.ts` — Playwright로 자동 캡처

---

### E-3. Workbox Precache 전략 최적화

**현재**: `globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']` — 전체 포함.

**개선**: 큰 오디오 파일은 precache 제외, runtime cache만 사용.

```typescript
// vite.config.ts workbox 설정 수정
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,woff2}'], // 이미지 제외 또는 크기 제한
  maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB 이하만 precache
  navigateFallback: '/index.html',
  // ... 기존 runtimeCaching 유지
}
```

---

## 7. Phase F — DB & 검색 고도화

> **목표**: 검색 품질 향상 + 쿼리 성능 최적화  
> **예상 공수**: 2일  
> **우선순위**: 🟡 MEDIUM

### F-1. 일본어 토크나이저 최적화

**현재**: FTS5 기본 토크나이저 (unicode61) — 일본어 분리 불완전.

**개선**: `tokenize='unicode61 remove_diacritics 0'` 적용  
또는 외부 형태소 분석기 기반 토큰화 (시드 단계에서 사전 토큰화):

```typescript
// packages/db/src/seed/parse-vocab.ts에 토큰화 추가
// 예: 単語 → "単語 たんご tanago" 토큰을 별도 컬럼에 저장
// → FTS5 검색 시 히라가나, 로마자, 한자 모두 히트
```

### F-2. 인덱스 커버링 쿼리 최적화

**현재 `srs_cards` 복잡한 쿼리** (`srs.ts` `/srs/due`):
```sql
SELECT * FROM srs_cards
WHERE user_id = ? AND state != 'new' AND due_at <= ?
ORDER BY due_at LIMIT ?
```

**개선**: 커버링 인덱스 추가
```sql
-- packages/db/drizzle/0003_covering_index.sql
CREATE INDEX IF NOT EXISTS idx_srs_due_covering
  ON srs_cards(user_id, state, due_at)
  WHERE state != 'new';  -- D1 partial index 지원 여부 확인 필요
```

### F-3. 통계 쿼리 성능 (daily_logs 집계)

`/api/v1/logs/heatmap` 연간 쿼리 최적화:
```sql
-- 현재: O(n) 전체 스캔
-- 개선: 이미 (user_id, log_date) UK 인덱스 존재 → 이미 최적
-- 추가: materialized view 역할의 monthly_summary 테이블 (옵션)
```

---

## 8. Phase G — 인프라 & CI/CD 개선

> **목표**: 배포 안정성 + 관측 가능성 향상  
> **예상 공수**: 1-2일  
> **우선순위**: 🟡 MEDIUM

### G-1. `@nihongo-n3/shared` 타입 빌드 최적화

**현재 이슈**: 일부 환경에서 `Cannot find module '@nihongo-n3/shared'` 오류 가능.

**확인 및 수정**:
```json
// packages/shared/package.json 확인
{
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./fsrs": { "import": "./dist/fsrs.js", "types": "./dist/fsrs.d.ts" }
  }
}
```

```json
// 루트 pnpm-workspace.yaml 확인
packages:
  - 'apps/*'
  - 'packages/*'
```

빌드 순서 명시:
```json
// package.json scripts 확인
{
  "build": "pnpm --filter @nihongo-n3/shared build && pnpm --filter @nihongo-n3/db build && pnpm --filter @nihongo-n3/api build && pnpm --filter @nihongo-n3/web build"
}
```

---

### G-2. 스모크 테스트 확장

**현재**: `/health` + `/api/v1/ping` 2개.

**개선** (`.github/workflows/deploy-api.yml`):
```yaml
smoke-test:
  steps:
    - name: Health check
      run: curl -f $API_BASE/health
    - name: Ping
      run: curl -f $API_BASE/api/v1/ping
    - name: Vocab API
      run: curl -f "$API_BASE/api/v1/vocab?limit=1"
    - name: Search API
      run: curl -f "$API_BASE/api/v1/vocab/search?q=水"
    - name: OpenAPI spec
      run: curl -f $API_BASE/openapi.json | jq '.info.title'
```

---

### G-3. PR 라벨 기반 자동 배포 정책 명확화

**현재**: `db:migration` 라벨 시 마이그레이션 자동 적용.  
**추가 라벨**:
- `content:update` → seed:diff 실행
- `api:breaking` → 주의 배포 (manual approval)
- `pwa:sw` → SW 프리캐시 재계산 경고

---

## 9. Phase H — 콘텐츠 파이프라인

> **목표**: N3 완성 → N2 확장 준비 + 청해·독해 콘텐츠 기반 구축  
> **예상 공수**: 2-4일 (콘텐츠 파일 확보 후)  
> **우선순위**: 🟢 LOW

### H-1. N2 콘텐츠 추가 준비

ROADMAP.md에 이미 상세 가이드 있음:
- `13 — N2 한자.md`, `14A/B — N2 어휘.md`, `15 — N2 문법.md` 파일 작성
- `sources` 테이블에 N2 소스 행 추가
- `seed.ts` `SOURCE_FILE_MAP`에 N2 항목 추가
- `0004_add_n2_sources.sql` 마이그레이션 생성

### H-2. 독해 지문 테이블 추가

```sql
-- packages/db/drizzle/0005_reading_passages.sql
CREATE TABLE IF NOT EXISTS reading_passages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  level        TEXT    NOT NULL CHECK(level IN ('N5','N4','N3','N2','N1')),
  title        TEXT    NOT NULL,
  content_ja   TEXT    NOT NULL,
  content_ko   TEXT    NOT NULL,
  questions    TEXT    NOT NULL,  -- JSON array
  source_id    INTEGER REFERENCES sources(id),
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_passages_level ON reading_passages(level);
```

### H-3. 청해 오디오 문제 구조

```sql
-- packages/db/drizzle/0006_listening_questions.sql
CREATE TABLE IF NOT EXISTS listening_questions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  level        TEXT    NOT NULL,
  audio_r2_key TEXT    NOT NULL,  -- 문제 오디오 R2 키
  question_ko  TEXT    NOT NULL,
  choices      TEXT    NOT NULL,  -- JSON [{ text, correct }]
  transcript   TEXT,              -- 오디오 텍스트 (TTS 생성 원문)
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

---

## 10. 테스트 전략 & 교차 검증 매트릭스

> **목표**: 회귀 탐지 자동화 → 배포 신뢰도 100%  
> **예상 공수**: 3-5일 (초기 설정)

### 10-1. 단위 테스트 (Vitest) — 현재 상태 확인 필요

**확인이 필요한 테스트 파일** (`apps/api/src/__tests__/`):
```
__tests__/
├── srs.test.ts     ← FSRS 스케줄 계산 단위 테스트
├── auth.test.ts    ← JWT 검증 테스트
├── vocab.test.ts   ← vocab API 테스트
└── ...
```

**FSRS-6 알고리즘 단위 테스트** 추가 (누락 시):
```typescript
// packages/shared/src/__tests__/fsrs.test.ts
import { schedule, createNewCard } from '../fsrs.js';

describe('FSRS-6', () => {
  it('신규 카드 → GOOD 평가 → 1일 후 due', () => {
    const card = createNewCard();
    const result = schedule(card, 'good', { elapsedDays: 0 });
    expect(result.card.state).toBe('learning');
    expect(result.scheduledDays).toBeGreaterThan(0);
  });
  
  it('W 배열이 21개인지 확인', () => {
    const { FSRS6_DEFAULT_W } = await import('../fsrs.js');
    expect(FSRS6_DEFAULT_W).toHaveLength(21);
  });
});
```

---

### 10-2. E2E 테스트 (Playwright) 신규 구축

**설정**:
```bash
cd apps/web
pnpm add -D @playwright/test
npx playwright install chromium
```

```typescript
// apps/web/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
```

**핵심 시나리오**:
```typescript
// e2e/review-flow.spec.ts — 복습 플로우 (가장 중요)
test('복습 카드 평가 → 서버 동기화', async ({ page }) => {
  await page.goto('/review');
  
  // 카드가 있으면 진행, 없으면 skip
  const hasCards = await page.locator('[data-testid="srs-card"]').isVisible();
  if (!hasCards) test.skip();
  
  // 카드 뒤집기 (Space)
  await page.keyboard.press('Space');
  await expect(page.locator('[data-testid="card-back"]')).toBeVisible();
  
  // GOOD 평가 (3)
  await page.keyboard.press('3');
  
  // 다음 카드 또는 완료 화면
  await expect(
    page.locator('[data-testid="srs-card"], [data-testid="review-complete"]')
  ).toBeVisible({ timeout: 3000 });
});

// e2e/browse-search.spec.ts — 어휘 검색
test('vocab FTS 검색 — 결과 반환', async ({ page }) => {
  await page.goto('/browse/vocab');
  await page.fill('[data-testid="search-input"]', '水');
  await expect(page.locator('[data-testid="vocab-item"]').first()).toBeVisible({ timeout: 3000 });
});

// e2e/offline.spec.ts — 오프라인 모드
test('오프라인 전환 → 복습 카드 표시', async ({ page, context }) => {
  await page.goto('/review');
  
  // 오프라인으로 전환
  await context.setOffline(true);
  
  // 오프라인 배너 확인
  await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();
  
  // Dexie에 캐시된 카드는 여전히 표시
  // (srs_cards IDB 스토어에 데이터가 있어야 함)
});
```

---

### 10-3. 교차 검증 매트릭스

| 시나리오 | 단위 테스트 | E2E 테스트 | 수동 검증 | 비고 |
|---------|------------|------------|---------|------|
| FSRS-6 스케줄 계산 | ✅ (추가 필요) | — | — | packages/shared |
| SRS Init (카드 생성) | ✅ | ✅ (추가 필요) | — | D1 INSERT OR IGNORE |
| SRS Review (AGAIN/GOOD/EASY) | ✅ | ✅ | — | 평가별 due_at 차이 |
| FTS5 어휘 검색 (`水`) | ✅ | ✅ | 브라우저 | 트리거 필요 |
| CF Access JWT 검증 | ✅ | — | — | RS256, exp, aud |
| 오프라인 복습 (Dexie) | — | ✅ | 디바이스 | IDB 미러 필요 |
| Background Sync 큐 | — | ✅ | Chrome DevTools | Sync API 필요 |
| R2 오디오 스트리밍 | — | — | ✅ (수동) | Range 요청 |
| PWA 설치 (Android) | — | — | ✅ (수동) | beforeinstallprompt |
| iOS 홈 화면 추가 | — | — | ✅ (수동) | iOS Safari 전용 |
| OpenAPI 스펙 유효성 | ✅ | ✅ (curl) | /api/docs | Scalar UI |
| D1 daily 백업 | — | — | ✅ (R2 확인) | Cron 매일 |
| Rate Limiting (429) | ✅ | — | ab 도구 | CF binding |
| CSP 헤더 | — | ✅ | Lighthouse | secure-headers |

---

## 11. 의존성 관리 & 마이그레이션 가이드

### 11-1. 주요 의존성 현황 (2026-06 기준)

| 패키지 | 현재 버전 | 최신 | 업그레이드 우선순위 |
|--------|---------|------|-------------------|
| React | 18.3.1 | 19.x | 🟡 중간 (hooks API 변경) |
| React Router | v6.23.1 | v7.x | 🟡 중간 (loader 패턴 변경) |
| TanStack Query | v5.40 | v5.latest | 🟢 낮음 (마이너) |
| Hono | 4.4.2 | 4.latest | 🟢 낮음 (호환성 유지) |
| Drizzle ORM | 0.31.2 | 0.latest | 🟢 낮음 |
| Workbox | 7 (vite-plugin-pwa) | 7.latest | 🟢 낮음 |
| Dexie | 4.0.7 | 4.latest | 🟢 낮음 |
| TypeScript | 5.4.5 | 5.latest | 🟢 낮음 |

### 11-2. D1 마이그레이션 파일 순서

```
packages/db/drizzle/
├── 0000_init.sql              ✅ 완성 (전체 스키마 + FTS5)
├── 0001_fts_triggers.sql      ← [추가 예정] 트리거 누락 시
├── 0002_grammar_kanji_fts.sql ← [Phase F-3] grammar/kanji FTS5
├── 0003_covering_index.sql    ← [Phase F-2] srs 커버링 인덱스
├── 0004_push_subscriptions.sql← [Phase D-2] Web Push
├── 0005_reading_passages.sql  ← [Phase H-2] 독해 지문
├── 0006_listening_questions.sql← [Phase H-3] 청해
└── 0007_review_undo.sql       ← [Phase C-1] undo 컬럼
```

**적용 순서**: 로컬 → 스테이징(Preview) → 프로덕션  
**롤백**: `wrangler d1 migrations apply --dry-run` 으로 사전 확인

### 11-3. 패키지 업그레이드 SOP

1. `pnpm update --interactive --recursive` → 대화형 선택
2. `pnpm build` → 빌드 통과 확인
3. `pnpm test` → 단위 테스트 통과 확인
4. `wrangler dev` + `pnpm dev` → 로컬 통합 테스트
5. E2E 실행 (`npx playwright test`)
6. PR 생성 → smoke test CI 통과 → merge

---

## 12. 완성도 목표 달성 체크리스트

### Phase A (즉시) — 목표: 82% → 86%
- [ ] A-1. Rate Limiting Binding 코드 구현
- [ ] A-2. CSP 헤더 강화
- [ ] A-3. Dependabot 설정
- [ ] A-4. FTS5 트리거 검증 (프로덕션 D1에서 `vocab_fts` 데이터 확인)

### Phase B (1주) — 목표: 86% → 90%
- [ ] B-1. Quiz API + 페이지 (`/quiz` 라우트 + `quiz_attempts` 저장)
- [ ] B-2. 스트릭 + 히트맵 API + Home.tsx UI
- [ ] B-3. Curriculum.tsx 동적 주차 계산
- [ ] B-4. SelfCheck 레이더 차트 체크리스트 연동

### Phase C (3-4일) — 목표: 90% → 92%
- [ ] C-1. 복습 Undo 기능
- [ ] C-2. Browse 문법·한자 검색 확장
- [ ] C-3. Android Chrome 설치 배너
- [ ] C-4. 카드 타입별 뒷면 레이아웃 분화

### Phase D (3-5일) — 목표: 92% → 94%
- [ ] D-1. Workers AI TTS 오디오 생성 파이프라인
- [ ] D-2. Web Push 알림 API + Cron
- [ ] D-3. grammar/kanji FTS5 테이블 + 트리거

### Phase E (2일) — 목표: 94% → 95%
- [ ] E-1. Background Sync API 실제 구현 (Service Worker 수정)
- [ ] E-2. PWA Manifest 스크린샷 + share_target
- [ ] E-3. Workbox precache 크기 최적화

### Phase F-G (2-4일) — 목표: 95% → 96%
- [ ] F-1. 일본어 토크나이저 최적화
- [ ] F-2. srs_cards 커버링 인덱스 추가
- [ ] G-1. `@nihongo-n3/shared` 빌드 설정 검증
- [ ] G-2. 스모크 테스트 5개로 확장

### Phase H (콘텐츠 파일 확보 후) — 목표: 96% → 98%
- [ ] H-1. N2 콘텐츠 파일 작성 + 시드
- [ ] H-2. 독해 지문 테이블 + API
- [ ] H-3. 청해 오디오 문제 구조 설계

### 테스트 인프라 (지속) — 목표: 98% → 100%
- [ ] Vitest FSRS-6 단위 테스트 추가
- [ ] Playwright E2E 핵심 3개 시나리오 (review, search, offline)
- [ ] CI/CD E2E 워크플로 통합
- [ ] Lighthouse PWA 점수 측정 + 개선

---

## 부록: 주요 파일 경로 빠른 참조

```
nihongo-n3 모노레포
│
├── apps/api/src/
│   ├── index.ts          ← Hono 앱 진입점 (OpenAPIHono, 미들웨어, 라우트 마운트)
│   ├── types.ts          ← Env 바인딩 타입 (D1, R2×2, AI 등)
│   ├── middleware/
│   │   ├── auth.ts       ← CF Access JWT RS256 검증 (JWKS 캐시 1h)
│   │   └── cache.ts      ← 엣지 캐시 미들웨어 (content: 1h, audio: 30일)
│   ├── routes/
│   │   ├── srs.ts        ← FSRS-6 스케줄 (init/due/review/stats)
│   │   ├── vocab-oa.ts   ← vocab OpenAPI (GET /vocab, /vocab/search, /vocab/:id)
│   │   ├── admin.ts      ← 주간 리포트 생성 + 이메일 발송
│   │   └── ... (15개 더)
│   └── lib/
│       ├── fsrs.ts       ← @nihongo-n3/shared/fsrs 리엑스포트 (구현 없음)
│       ├── db.ts         ← Drizzle D1 클라이언트
│       ├── cursor.ts     ← Base64 커서 페이지네이션
│       └── response.ts   ← ok/created/notFound/badRequest/internalError
│
├── apps/web/src/
│   ├── App.tsx           ← React Router lazy 페이지 라우팅
│   ├── pages/
│   │   ├── Review.tsx    ← SRS 복습 세션 (due 카드 순서)
│   │   ├── Browse.tsx    ← 어휘/문법/한자 탭 + 레벨 필터 + 검색
│   │   ├── Home.tsx      ← 대시보드 (due 수, 진도, 오늘 할 일)
│   │   ├── Curriculum.tsx← 16주 타임라인 (CURRENT_WEEK 하드코딩 ⚠️)
│   │   └── SelfCheck.tsx ← 자가진단 + 레이더 차트 (연동 미완성 ⚠️)
│   ├── components/feature/
│   │   ├── SRSCard.tsx   ← 3D 플립 카드 + 키보드 단축키 + 평가 버튼
│   │   └── VocabCard.tsx ← 어휘 카드 (Browse에서 사용)
│   └── lib/
│       ├── db.ts         ← Dexie 4 스키마 (12개 IDB 스토어)
│       ├── fsrs-client.ts← ⚠️ 클라이언트 측 FSRS (shared 패키지와 별도 — 통합 필요)
│       ├── audio.ts      ← AudioContext 플레이어
│       └── sync.ts       ← Background Sync 큐 헬퍼
│
├── packages/
│   ├── shared/src/
│   │   ├── fsrs.ts       ← ✅ FSRS-6 W[21] 완전 구현 (단일 진실 원칙)
│   │   ├── schemas.ts    ← Zod 요청/응답 스키마
│   │   └── types.ts      ← DB 인퍼드 타입
│   └── db/src/
│       ├── schema.ts     ← Drizzle ORM 스키마 (15개 테이블)
│       └── seed/         ← 마크다운 → D1 파서 + 시드 스크립트
│
└── .github/workflows/
    ├── deploy-api.yml    ← Workers 배포 + 스모크 테스트
    ├── deploy-web.yml    ← Pages 배포 + PR Preview
    ├── backup-d1.yml     ← D1 daily 백업 → R2 (30일 lifecycle)
    └── content-update.yml← .md 변경 시 seed:diff + migration 자동 실행
```

---

> **작성**: 2026-06  
> **다음 검토 기준일**: Phase A 완료 후 (1주 이내 권장)  
> **관련 문서**: `project-status-report.md` (현황), `ROADMAP.md` (장기 로드맵)
