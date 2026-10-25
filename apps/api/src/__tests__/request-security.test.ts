import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { requestIntent } from '../middleware/request-intent.js';
import { loginRateLimit } from '../middleware/rate-limit.js';

const origin = 'https://nihongo-n3.pages.dev';
const endpoint = 'https://nihongo-n3-api.kordokrip.workers.dev/api/v1/auth/login';
const environment = { ENVIRONMENT: 'production', APP_ORIGIN: origin };
describe('browser write intent', () => {
  const app = new Hono<AppEnv>().use('*', requestIntent).all('*', c => c.json({ accepted: true }));
  it.each(['https://attacker.test', 'null', origin + '.attacker.test'])('rejects foreign origin %s before the handler', async value => {
    expect((await app.request(endpoint, { method: 'POST', headers: { Origin: value }, body: '{}' }, environment)).status).toBe(403);
  });
  it('rejects cross-site metadata without Origin but preserves non-browser clients and same-origin writes', async () => {
    expect((await app.request(endpoint, { method: 'POST', headers: { 'Sec-Fetch-Site': 'cross-site' } }, environment)).status).toBe(403);
    for (const headers of [{ Origin: origin }, { 'Sec-Fetch-Site': 'same-origin' }, {}]) {
      expect((await app.request(endpoint, { method: 'POST', headers }, environment)).status).toBe(200);
    }
    expect((await app.request(endpoint, { headers: { Origin: 'https://accounts.google.com' } }, environment)).status).toBe(200);
  });
  it('trusts deployment previews only in the isolated preview environment', async () => {
    const headers = { Origin: 'https://abc123.nihongo-n3.pages.dev' };
    expect((await app.request(endpoint, { method: 'POST', headers }, environment)).status).toBe(403);
    expect((await app.request(endpoint, { method: 'POST', headers }, { ...environment, ENVIRONMENT: 'preview' })).status).toBe(200);
  });
});
describe('password entry throttling', () => {
  it('checks IP and normalized account digest before invoking password work', async () => {
    const handler = vi.fn(c => c.json({ ok: true }));
    const limit = vi.fn(async (_options: { key: string }) => ({ success: true }));
    const app = new Hono<AppEnv>().use('*', loginRateLimit).post('*', handler);
    const request = (email: string) => app.request(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1' },
      body: JSON.stringify({ email, password: 'not-a-real-password' }),
    }, { ...environment, RATE_LIMITER_SYNC: { limit } });
    expect((await request('  Learner@example.test ')).status).toBe(200);
    const keys = limit.mock.calls.map(call => (call[0] as { key: string }).key);
    expect(keys).toHaveLength(2);
    expect(keys.join()).not.toContain('Learner');
    expect(keys.join()).not.toContain('@');
    await request('learner@example.test');
    expect(limit.mock.calls[3]?.[0]).toEqual(limit.mock.calls[1]?.[0]);
    limit.mockResolvedValue({ success: false });
    const denied = await request('learner@example.test');
    expect(denied.status).toBe(429);
    expect(denied.headers.get('retry-after')).toBe('60');
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
