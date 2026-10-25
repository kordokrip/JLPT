import { beforeAll, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { admin, weeklyReportKey } from '../routes/admin.js';
import { sync } from '../routes/sync.js';
import { createSession } from '../lib/auth-session.js';
// @ts-ignore -- isolated migration fixture
import baseSchema from '../../../../packages/db/drizzle-v2/0000_schema_convergence.sql?raw';
// @ts-ignore -- isolated migration fixture
import trackSchema from '../../../../packages/db/drizzle-v2/0005_learning_track.sql?raw';
// @ts-ignore -- track-scoped learning schema used by /sync
import learningTrackSchema from '../../../../packages/db/drizzle-v2/0008_topik_track_content_and_learning_keys.sql?raw';

const db = (env as typeof env & { DB: D1Database }).DB;
const testEnv = { ...env, DB: db, ENVIRONMENT: 'test', AUTH_MODE: 'app-session' };
const app = new Hono<AppEnv>().get('/fixture-session', async c => {
  await createSession(c, 'stored-output-admin');
  return c.text('fixture');
}).route('/admin', admin).route('/api/v1', sync);
let cookie: string;
beforeAll(async () => {
  for (const migration of [baseSchema, trackSchema, learningTrackSchema]) {
    for (const statement of migration.split('--> statement-breakpoint').map((s: string) => s.trim()).filter(Boolean)) await db.prepare(statement).run();
  }
  await db.prepare("INSERT INTO users (id,email,display_name,role) VALUES ('stored-output-admin','fixture@example.test','Synthetic fixture','admin')").run();
  await db.prepare("INSERT INTO srs_cards (id,user_id,item_type,item_id,difficulty) VALUES (1,'stored-output-admin','vocab',1,0)").run();
  cookie = (await app.request('https://local.test/fixture-session', undefined, testEnv)).headers.get('set-cookie')!.split(';')[0]!;
});
describe('stored numeric review data', () => {
  it('keeps production report paths and isolates preview reads/writes', () => {
    expect(weeklyReportKey('production', '2026-W44')).toBe('reports/weekly/2026-W44.md');
    expect(weeklyReportKey('preview', '2026-W44')).toBe('reports/non-production/preview/2026-W44.md');
  });
  it('rejects script-valued review duration before changing the card or review logs', async () => {
    const response = await app.request('https://local.test/api/v1/sync', {
      method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: 'security-fixture', last_synced_at: '2000-01-01T00:00:00.000Z', operations: [{
        op_id: crypto.randomUUID(), type: 'review', occurred_at: new Date().toISOString(),
        payload: { card_id: 1, rating: 'good', response_ms: '<img src=x onerror=alert(1)>' },
      }] }),
    }, testEnv);
    expect(response.status).toBe(200);
    expect((await response.json() as any).data.processed_op_ids).toEqual([]);
    expect(await db.prepare('SELECT COUNT(*) AS n FROM review_logs').first('n')).toBe(0);
    expect(await db.prepare('SELECT reps FROM srs_cards WHERE id=1').first('reps')).toBe(0);
  });
  it('does not render historical malicious duration as HTML and blocks executable dashboard content', async () => {
    await db.prepare('INSERT INTO review_logs (card_id,rating,response_ms,reviewed_at) VALUES (1,?,?,?)')
      .bind('good', '<img src=x onerror=alert(1)>', Math.floor(Date.now() / 1000)).run();
    const response = await app.request('https://local.test/admin/dashboard', { headers: { Cookie: cookie } }, testEnv);
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain('<img src=x');
    expect(response.headers.get('content-security-policy')).toContain("script-src 'none'");
  });
  it('still accepts a normal offline review and records its numeric duration', async () => {
    const opId = crypto.randomUUID();
    const response = await app.request('https://local.test/api/v1/sync', {
      method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: 'security-fixture', last_synced_at: '2000-01-01T00:00:00.000Z', operations: [{
        op_id: opId, type: 'review', occurred_at: new Date().toISOString(),
        payload: { card_id: 1, rating: 'good', response_ms: 1200 },
      }] }),
    }, testEnv);
    expect(response.status).toBe(200);
    expect((await response.json() as any).data.processed_op_ids).toEqual([opId]);
    expect(await db.prepare('SELECT response_ms FROM review_logs WHERE card_id=1 AND response_ms=1200').first('response_ms')).toBe(1200);
  });
});
