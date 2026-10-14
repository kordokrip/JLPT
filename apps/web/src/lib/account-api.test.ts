import { afterEach, describe, expect, it, vi } from 'vitest';
import { accountApi } from './account-api';

afterEach(() => vi.unstubAllGlobals());
describe('accountApi transport', () => {
  it('unwraps the API envelope and preserves account credentials on PUT', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { theme: 'dark', accent: 'sea', reminder_enabled: true, reminder_time: '09:00', timezone: 'Asia/Seoul', custom_reminder_configured: true } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await accountApi.savePreferences('account-1', { theme: 'dark' });
    expect(result.theme).toBe('dark');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/api/v1/account/preferences');
    expect(init.headers['X-Account-Id']).toBe('account-1');
    expect(init.headers['Content-Type']).toBe('application/json');
  });
});
