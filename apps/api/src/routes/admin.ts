/**
 * apps/api/src/routes/admin.ts
 *
 * GET  /weekly-report — 최신 주간 학습 리포트 조회 (R2에서 읽기)
 * POST /weekly-report — 수동 리포트 생성 (즉시 생성 후 R2 저장)
 *
 * 보호: application admin session
 * Cron: 매주 일요일 23:00 KST (14:00 UTC) scheduled handler에서 자동 생성
 *
 * 리포트 항목:
 *   - 신규 학습량 (이번 주 new → learning/review 전환 카드 수)
 *   - 일별 정확도 추이 (최근 7일)
 *   - 약점 카테고리 Top 5 (낮은 평점 비율)
 *   - FSRS 평균 stability
 */
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { adminSessionAuth } from '../lib/auth-session.js';
import { badRequest, ok, problem } from '../lib/response.js';
import { AUDIO_BATCH_LEVELS, runAudioGeneration, type AudioBatchLevel } from '../jobs/generate-audio.js';
import { getTtsProviderInfo, getVoicevoxUrl, type TtsProviderId } from '../lib/tts/index.js';
import { probeVoicevoxEngine } from '../lib/tts/voicevox.js';
import { parseAudioQaProvider, warmupAudioQa, type AudioQaProvider } from '../lib/audio-qa.js';
import { equalSecret } from '../lib/secret.js';

const admin = new Hono<AppEnv>();
admin.use('*', adminSessionAuth);

// ── GET /dashboard ──────────────────────────────────────────
admin.get('/dashboard', async (c) => {
  const db = c.env.DB;
  const todayStart = Math.floor(
    new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').getTime() / 1000,
  );

  // 오늘 DAU (distinct users who reviewed today)
  const dauRow = await db
    .prepare(
      `SELECT COUNT(DISTINCT s.user_id) AS dau
       FROM review_logs r
       JOIN srs_cards s ON s.id = r.card_id
       WHERE r.reviewed_at >= ?`,
    )
    .bind(todayStart)
    .first<{ dau: number }>();

  // 오늘 총 리뷰 수 + 정답률
  const reviewRow = await db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN rating IN ('good','easy') THEN 1 ELSE 0 END) AS correct
       FROM review_logs
       WHERE reviewed_at >= ?`,
    )
    .bind(todayStart)
    .first<{ total: number; correct: number }>();

  // p95 응답시간 (response_ms)
  const msCountRow = await db
    .prepare(
      `SELECT COUNT(*) AS cnt
       FROM review_logs
       WHERE reviewed_at >= ? AND response_ms IS NOT NULL`,
    )
    .bind(todayStart)
    .first<{ cnt: number }>();
  let p95Ms: number | null = null;
  const msCount = msCountRow?.cnt ?? 0;
  if (msCount > 0) {
    const p95Offset = Math.floor(msCount * 0.95);
    const p95Row = await db
      .prepare(
        `SELECT response_ms
         FROM review_logs
         WHERE reviewed_at >= ? AND response_ms IS NOT NULL
         ORDER BY response_ms
         LIMIT 1 OFFSET ?`,
      )
      .bind(todayStart, p95Offset)
      .first<{ response_ms: number }>();
    p95Ms = p95Row?.response_ms ?? null;
  }

  // 활성 카드 수 + FSRS 평균
  const fsrsRow = await db
    .prepare(
      `SELECT
         COUNT(*)                  AS active_cards,
         ROUND(AVG(stability), 2)  AS avg_stability,
         ROUND(AVG(difficulty), 2) AS avg_difficulty
       FROM srs_cards WHERE state != 'new'`,
    )
    .first<{ active_cards: number; avg_stability: number; avg_difficulty: number }>();

  // 7일간 일별 리뷰 추이 (sparkline 데이터)
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 86_400;
  const trendRows = await db
    .prepare(
      `SELECT
         DATE(datetime(reviewed_at, 'unixepoch')) AS day,
         COUNT(*) AS cnt
       FROM review_logs
       WHERE reviewed_at >= ?
       GROUP BY day ORDER BY day`,
    )
    .bind(sevenDaysAgo)
    .all<{ day: string; cnt: number }>();

  const dau         = dauRow?.dau ?? 0;
  const totalReview = reviewRow?.total ?? 0;
  const accuracy    = totalReview > 0
    ? Math.round(((reviewRow?.correct ?? 0) / totalReview) * 100)
    : 0;

  const trend = (trendRows.results ?? []) as { day: string; cnt: number }[];
  const maxCnt = trend.reduce((m, r) => Math.max(m, r.cnt), 1);

  const sparkBars = trend
    .map((r) => {
      const h = Math.round((r.cnt / maxCnt) * 40);
      return `<div style="width:10px;height:${h}px;background:#E08278;border-radius:2px 2px 0 0;align-self:flex-end" title="${r.day}: ${r.cnt}"></div>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin Dashboard — 日本語N3</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
       background:#0f0f0f;color:#e0e0e0;padding:2rem;min-height:100vh}
  h1{font-size:1.4rem;font-weight:600;margin-bottom:1.5rem;color:#fff;
     border-bottom:1px solid #2a2a2a;padding-bottom:.75rem}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;margin-bottom:1.5rem}
  .card{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:1.25rem}
  .card .label{font-size:.72rem;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem}
  .card .value{font-size:2rem;font-weight:700;color:#fff;line-height:1}
  .card .sub{font-size:.78rem;color:#666;margin-top:.3rem}
  .card.accent .value{color:#E08278}
  .section{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:1.25rem;margin-bottom:1rem}
  .section h2{font-size:.85rem;font-weight:600;color:#aaa;margin-bottom:1rem;text-transform:uppercase;letter-spacing:.05em}
  .spark{display:flex;align-items:flex-end;gap:3px;height:48px;padding-top:8px}
  .meta{font-size:.72rem;color:#555;margin-top:1.5rem;text-align:right}
</style>
</head>
<body>
<h1>🇯🇵 Admin Dashboard</h1>

<div class="grid">
  <div class="card accent">
    <div class="label">DAU (오늘)</div>
    <div class="value">${dau}</div>
    <div class="sub">today's active learners</div>
  </div>
  <div class="card">
    <div class="label">오늘 리뷰 수</div>
    <div class="value">${totalReview.toLocaleString()}</div>
    <div class="sub">review sessions</div>
  </div>
  <div class="card">
    <div class="label">오늘 정답률</div>
    <div class="value">${accuracy}%</div>
    <div class="sub">good + easy ratings</div>
  </div>
  <div class="card">
    <div class="label">p95 응답시간</div>
    <div class="value">${p95Ms !== null ? p95Ms + 'ms' : '—'}</div>
    <div class="sub">review response latency</div>
  </div>
  <div class="card">
    <div class="label">활성 카드</div>
    <div class="value">${(fsrsRow?.active_cards ?? 0).toLocaleString()}</div>
    <div class="sub">learning + review + relearning</div>
  </div>
  <div class="card">
    <div class="label">평균 stability</div>
    <div class="value">${fsrsRow?.avg_stability ?? '—'}</div>
    <div class="sub">avg difficulty: ${fsrsRow?.avg_difficulty ?? '—'}</div>
  </div>
</div>

<div class="section">
  <h2>최근 7일 리뷰 추이</h2>
  <div class="spark">${sparkBars || '<span style="color:#555;font-size:.75rem">데이터 없음</span>'}</div>
</div>

<div class="meta">생성: ${new Date().toISOString()} UTC</div>
</body>
</html>`;

  return c.html(html);
});

// ── GET /weekly-report ──────────────────────────────────────
admin.get('/weekly-report', async (c) => {
  const reportKey = latestReportKey();

  const obj = await c.env.REPORTS.get(reportKey);
  if (!obj) {
    return problem(c, 404, 'Not Found', 'Weekly report not yet generated. POST /admin/weekly-report to generate.');
  }

  const content = await obj.text();
  return ok(c, {
    content,
    key:         reportKey,
    generatedAt: obj.uploaded.toISOString(),
  });
});

// ── POST /weekly-report ─────────────────────────────────────
// 즉시 리포트 생성 → R2 저장 (cron 트리거와 동일 로직)
admin.post('/weekly-report', async (c) => {
  const { markdown, weekLabel } = await buildWeeklyReport(c.env.DB);

  const key = `reports/weekly/${weekLabel}.md`;
  await c.env.REPORTS.put(key, markdown, {
    httpMetadata: { contentType: 'text/markdown; charset=utf-8' },
    customMetadata: { generatedAt: new Date().toISOString() },
  });

  return ok(c, { key, weekLabel, bytes: markdown.length });
});

// ─────────────────────────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────────────────────────

/** 이번 주 ISO 주차 레이블 (YYYY-Www) */
function currentWeekLabel(): string {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const diff = (now.getTime() - startOfWeek1.getTime()) / 86_400_000;
  const week = Math.floor(diff / 7) + 1;
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function latestReportKey(): string {
  return `reports/weekly/${currentWeekLabel()}.md`;
}

// ─────────────────────────────────────────────────────────────────
// 리포트 생성 함수 (Cron + POST 공용)
// ─────────────────────────────────────────────────────────────────

interface DailyAccuracy {
  date:           string;
  total:          number;
  correct:        number;
}

interface WeakCategory {
  item_type:  string;
  total:      number;
  hard_count: number;
  hard_pct:   number;
}

interface AvgStability {
  avg_stability:   number;
  avg_difficulty:  number;
  card_count:      number;
}

export async function buildWeeklyReport(
  db: D1Database,
): Promise<{ markdown: string; weekLabel: string }> {
  const weekLabel = currentWeekLabel();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const today        = new Date().toISOString().slice(0, 10);

  // ── 1. 신규 학습량 ───────────────────────────────────────
  // 이번 주에 'new' 상태에서 최초 리뷰된 카드 수
  const newCardsResult = await db.prepare(`
    SELECT COUNT(*) AS cnt
    FROM   srs_cards
    WHERE  state != 'new'
      AND  updated_at >= ?
  `).bind(sevenDaysAgo).first<{ cnt: number }>();
  const newCards = newCardsResult?.cnt ?? 0;

  // ── 2. 일별 정확도 추이 (최근 7일) ──────────────────────
  // review_logs: rating >= 3 → correct
  const accuracyRows = await db.prepare(`
    SELECT
      DATE(reviewed_at) AS date,
      COUNT(*)          AS total,
      SUM(CASE WHEN rating >= 3 THEN 1 ELSE 0 END) AS correct
    FROM   review_logs
    WHERE  reviewed_at >= ?
    GROUP  BY DATE(reviewed_at)
    ORDER  BY date ASC
  `).bind(sevenDaysAgo).all<DailyAccuracy>();

  // ── 3. 약점 카테고리 Top 5 (rating <= 2 비율 높은 순) ───
  const weakRows = await db.prepare(`
    SELECT
      s.item_type,
      COUNT(*)                                           AS total,
      SUM(CASE WHEN r.rating <= 2 THEN 1 ELSE 0 END)    AS hard_count,
      ROUND(
        SUM(CASE WHEN r.rating <= 2 THEN 1.0 ELSE 0 END)
        / COUNT(*) * 100, 1
      )                                                  AS hard_pct
    FROM   review_logs r
    JOIN   srs_cards   s ON s.id = r.card_id
    WHERE  r.reviewed_at >= ?
    GROUP  BY s.item_type
    ORDER  BY hard_pct DESC
    LIMIT  5
  `).bind(sevenDaysAgo).all<WeakCategory>();

  // ── 4. FSRS 평균 stability / difficulty ─────────────────
  const stabilityRow = await db.prepare(`
    SELECT
      ROUND(AVG(stability),  3) AS avg_stability,
      ROUND(AVG(difficulty), 3) AS avg_difficulty,
      COUNT(*)                  AS card_count
    FROM srs_cards
    WHERE state != 'new'
  `).first<AvgStability>();

  // ─────────────────────────────────────────────────────────
  // 마크다운 리포트 조립
  // ─────────────────────────────────────────────────────────
  const lines: string[] = [
    `# 週次学習レポート ${weekLabel}`,
    `\n生成日時: ${new Date().toISOString()}\n`,

    `## 1. 신규 학습량`,
    `이번 주 신규 카드 (처음 리뷰 완료): **${newCards}개**\n`,

    `## 2. 일별 정확도 추이`,
    `| 날짜 | 총 리뷰 | 정답 | 정확도 |`,
    `|------|--------|------|--------|`,
  ];

  for (const row of accuracyRows.results) {
    const pct = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0;
    lines.push(`| ${row.date} | ${row.total} | ${row.correct} | ${pct}% |`);
  }

  lines.push('');
  lines.push(`## 3. 약점 카테고리 Top 5`);
  lines.push(`| 카테고리 | 총 리뷰 | 어려움(≤2) | 비율 |`);
  lines.push(`|---------|--------|-----------|------|`);

  for (const row of weakRows.results) {
    lines.push(`| ${row.item_type} | ${row.total} | ${row.hard_count} | ${row.hard_pct}% |`);
  }

  lines.push('');
  lines.push(`## 4. FSRS 평균 지표`);

  if (stabilityRow) {
    lines.push(`| 항목 | 값 |`);
    lines.push(`|------|-----|`);
    lines.push(`| 활성 카드 수 | ${stabilityRow.card_count} |`);
    lines.push(`| 평균 stability | ${stabilityRow.avg_stability} |`);
    lines.push(`| 평균 difficulty | ${stabilityRow.avg_difficulty} |`);
  } else {
    lines.push('_데이터 없음_');
  }

  const markdown = lines.join('\n');
  return { markdown, weekLabel };
}

// ── 이메일 발송 (MailChannels, 선택적) ──────────────────────────
export async function sendReportEmail(
  notifyEmail: string | undefined,
  weekLabel:   string,
  markdown:    string,
): Promise<void> {
  if (!notifyEmail) return;

  // Cloudflare MailChannels integration
  // 사전 조건: DNS SPF/DKIM 설정 필요 (docs/00_overview/logpush-r2-setup.md 참고)
  await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: notifyEmail }] }],
      from: { email: 'noreply@nihongo-n3.pages.dev', name: 'nihongo-n3 Bot' },
      subject: `週次学習レポート ${weekLabel}`,
      content: [{ type: 'text/plain', value: markdown }],
    }),
  });
}

// ── POST /audio/queue — TTS 오디오 생성 즉시 실행 ──────────────
// dry_run=true 시 실제 생성 없이 대상 목록만 반환
admin.post('/audio/queue', async (c) => {
  const body = (await c.req.json<{
    execute?: boolean;
    dry_run?: boolean;
    batch?: number;
    provider?: string;
    force_regenerate?: boolean;
    level?: string;
  }>().catch(() => ({}))) as {
    execute?: boolean;
    dry_run?: boolean;
    batch?: number;
    provider?: string;
    force_regenerate?: boolean;
    level?: string;
  };

  const provider = parseBatchProvider(body.provider);
  if (body.provider && !provider) {
    return badRequest(c, `지원하지 않는 TTS provider입니다: ${body.provider}`);
  }
  const level = parseAudioBatchLevel(body.level);
  if (body.level && !level) {
    return badRequest(c, `지원하지 않는 JLPT level입니다: ${body.level}`);
  }

  if (body.execute !== true || body.dry_run === true) {
    const selectedProvider = provider ?? 'google';
    const stats = await loadAudioBatchStats(c.env.DB, selectedProvider, level);
    return ok(c, {
      dry_run: true,
      approval_required: true,
      provider: selectedProvider,
      level: level ?? 'all',
      execution_order: AUDIO_BATCH_LEVELS,
      immutable_overwrite_allowed: false,
      stats,
    });
  }

  if (provider !== 'google') {
    return badRequest(c, '운영 전체 배치는 승인된 Google Cloud TTS provider만 사용할 수 있습니다');
  }
  if (!level) {
    return badRequest(c, `실제 오디오 배치는 level을 ${AUDIO_BATCH_LEVELS.join(', ')} 중 하나로 지정해야 합니다`);
  }
  if (body.force_regenerate === true) {
    return badRequest(c, 'immutable key는 덮어쓸 수 없습니다. provider model/version을 올려 새 key를 생성하세요');
  }
  if (!c.env.GOOGLE_TTS_API_KEY?.trim()) {
    return badRequest(c, '승인된 환경에 GOOGLE_TTS_API_KEY가 설정되지 않았습니다');
  }
  const configuredApproval = c.env.AUDIO_BATCH_APPROVAL_TOKEN?.trim();
  const suppliedApproval = c.req.header('x-audio-batch-approval')?.trim();
  if (!configuredApproval || !suppliedApproval || !(await equalSecret(configuredApproval, suppliedApproval))) {
    return badRequest(c, '오디오 배치 승인 토큰이 없거나 일치하지 않습니다');
  }

  const result = await runAudioGeneration(c.env, {
    ...(provider ? { provider } : {}),
    ...(typeof body.batch === 'number' ? { batchSize: body.batch } : {}),
    level,
  });
  return ok(c, result);
});

admin.get('/audio/providers', async (c) => {
  const providerInfo = getTtsProviderInfo(c.env);
  const voicevoxUrl = getVoicevoxUrl(c.env);
  const voicevox = await probeVoicevoxEngine(voicevoxUrl, { timeoutMs: 5000 });
  return ok(c, {
    active: providerInfo,
    providers: {
      cloudflare: {
        configured: true,
        ok: true,
        model: getTtsProviderInfo(c.env, 'cloudflare').model,
      },
      google: {
        configured: Boolean(c.env.GOOGLE_TTS_API_KEY),
        ok: Boolean(c.env.GOOGLE_TTS_API_KEY),
        model: getTtsProviderInfo(c.env, 'google').model,
        use: 'approved-batch-only',
      },
      voicevox: {
        ...voicevox,
        model: getTtsProviderInfo(c.env, 'voicevox').model,
        urlConfigured: Boolean(voicevoxUrl),
      },
    },
  });
});

admin.post('/audio/qa/warmup', async (c) => {
  const body = (await c.req.json<{ provider?: string; force?: boolean }>().catch(() => ({}))) as {
    provider?: string;
    force?: boolean;
  };
  const providers = parseQaWarmupProviders(body.provider);
  if (providers.includes('google')) {
    const configuredApproval = c.env.AUDIO_BATCH_APPROVAL_TOKEN?.trim();
    const suppliedApproval = c.req.header('x-audio-batch-approval')?.trim();
    if (!configuredApproval || !suppliedApproval || !(await equalSecret(configuredApproval, suppliedApproval))) {
      return badRequest(c, 'Google QA 오디오 생성에는 오디오 배치 승인 토큰이 필요합니다');
    }
  }
  const results: Record<AudioQaProvider, Awaited<ReturnType<typeof warmupAudioQa>>> = {
    cloudflare: [],
    google: [],
    voicevox: [],
  };

  for (const provider of providers) {
    results[provider] = await warmupAudioQa(c.env, provider, { force: body.force === true });
  }

  return ok(c, {
    force: body.force === true,
    providers,
    summary: providers.map((provider) => {
      const rows = results[provider];
      return {
        provider,
        generated: rows.filter((row) => row.status === 'generated').length,
        cached: rows.filter((row) => row.status === 'cached').length,
        skipped: rows.filter((row) => row.status === 'skipped').length,
        failed: rows.filter((row) => row.status === 'failed').length,
      };
    }),
    results,
  });
});

function parseBatchProvider(value: string | undefined): Extract<TtsProviderId, 'cloudflare' | 'google' | 'voicevox'> | undefined {
  if (value === 'cloudflare' || value === 'google' || value === 'voicevox') return value;
  return undefined;
}

function parseAudioBatchLevel(value: string | undefined): AudioBatchLevel | undefined {
  return AUDIO_BATCH_LEVELS.find((level) => level === value);
}

async function loadAudioBatchStats(
  db: D1Database,
  provider: string,
  level?: AudioBatchLevel,
): Promise<Record<'sentences' | 'vocab' | 'kanji', { total: number; approved: number; pending: number }>> {
  type CountRow = { total: number; approved: number };
  const query = async (
    table: 'sentences' | 'vocab' | 'kanji',
    itemType: 'sentence' | 'vocab' | 'kanji',
    levelColumn: 'level' | 'jlpt_level',
  ): Promise<{ total: number; approved: number; pending: number }> => {
    const levels = level ? [level] : [...AUDIO_BATCH_LEVELS];
    const placeholders = levels.map(() => '?').join(', ');
    const row = await db.prepare(`
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN EXISTS (
               SELECT 1 FROM audio_generation_log AS generation
               WHERE generation.item_type = ?
                 AND generation.item_id = item.id
                 AND generation.provider = ?
                 AND generation.success = 1
                 AND generation.r2_key = item.audio_r2_key
             ) THEN 1 ELSE 0 END) AS approved
      FROM ${table} AS item
      WHERE item.${levelColumn} IN (${placeholders})`)
      .bind(itemType, provider, ...levels)
      .first<CountRow>();
    const total = row?.total ?? 0;
    const approved = row?.approved ?? 0;
    return { total, approved, pending: total - approved };
  };

  const [sentences, vocab, kanji] = await Promise.all([
    query('sentences', 'sentence', 'level'),
    query('vocab', 'vocab', 'level'),
    query('kanji', 'kanji', 'jlpt_level'),
  ]);
  return { sentences, vocab, kanji };
}

function parseQaWarmupProviders(value: string | undefined): AudioQaProvider[] {
  const provider = value ? parseAudioQaProvider(value) : null;
  if (provider) return [provider];
  return ['cloudflare', 'voicevox'];
}

export { admin };
