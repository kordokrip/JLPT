import { describe, expect, it, vi } from 'vitest';
import { runObservabilityAlerts } from '../jobs/observability-alerts.js';

const NOW = Date.parse('2026-07-15T04:00:00.000Z');

describe('scheduled observability alerts', () => {
  it('skips without exposing absent secret values when configuration is incomplete', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const result = await runObservabilityAlerts({}, { now: NOW });
      expect(result).toEqual({
        status: 'skipped',
        missing: [
          'CLOUDFLARE_ACCOUNT_ID',
          'OBSERVABILITY_API_TOKEN',
          'OBSERVABILITY_ALERT_WEBHOOK_URL',
        ],
      });
    } finally {
      log.mockRestore();
    }
  });

  it('delivers a PII-free payload when the 5xx threshold fires', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(init ? { url, init } : { url });
      if (url.includes('/workers/observability/telemetry/query')) {
        return Response.json({
          success: true,
          result: {
            events: {
              count: 2,
              events: [
                telemetry({ event: 'http_request', status: 500, route: '/api/v1/vocab/:id', duration_ms: 24 }),
                telemetry({ event: 'http_request', status: 200, route: '/health', duration_ms: 4 }),
              ],
            },
          },
        });
      }
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const result = await runObservabilityAlerts(
        {
          CLOUDFLARE_ACCOUNT_ID: 'account-id',
          OBSERVABILITY_API_TOKEN: 'observability-token',
          OBSERVABILITY_ALERT_WEBHOOK_URL: 'https://alerts.example.test/cloudflare',
          OBSERVABILITY_ALERT_WEBHOOK_TOKEN: 'webhook-token',
          OBSERVABILITY_WORKER_NAME: 'nihongo-n3-api-preview',
          RELEASE_SHA: 'abc123',
        },
        { now: NOW, fetcher },
      );

      expect(result.status).toBe('sent');
      expect(result.alertEvaluation?.five_xx.fired).toBe(true);
      expect(calls).toHaveLength(2);
      expect(calls[0]?.url).toContain('/accounts/account-id/workers/observability/telemetry/query');
      const queryBody = JSON.parse(String(calls[0]?.init?.body)) as {
        view?: string;
        parameters?: { view?: string };
      };
      expect(queryBody.view).toBe('events');
      expect(queryBody.parameters).not.toHaveProperty('view');
      expect(calls[1]?.url).toBe('https://alerts.example.test/cloudflare');
      expect(calls[1]?.init?.headers).toMatchObject({ Authorization: 'Bearer webhook-token' });

      const payload = JSON.parse(String(calls[1]?.init?.body)) as Record<string, unknown>;
      expect(payload).toMatchObject({ service: 'nihongo-n3-api-preview', release: 'abc123' });
      expect(JSON.stringify(payload)).not.toContain('observability-token');
      expect(JSON.stringify(payload)).not.toContain('webhook-token');
      expect(JSON.stringify(payload)).not.toContain('987654321');
    } finally {
      log.mockRestore();
    }
  });

  it('does not call the webhook when no threshold fires', async () => {
    const fetcher = vi.fn(async () => Response.json({
      success: true,
      result: {
        events: {
          count: 1,
          events: [telemetry({ event: 'http_request', status: 200, route: '/health', duration_ms: 3 })],
        },
      },
    })) as unknown as typeof fetch;
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const result = await runObservabilityAlerts(
        {
          CLOUDFLARE_ACCOUNT_ID: 'account-id',
          OBSERVABILITY_API_TOKEN: 'observability-token',
          OBSERVABILITY_ALERT_WEBHOOK_URL: 'https://alerts.example.test/cloudflare',
        },
        { now: NOW, fetcher },
      );
      expect(result.status).toBe('quiet');
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally {
      log.mockRestore();
    }
  });

  it('prefers the internal receiver binding when an alert fires', async () => {
    const externalFetch = vi.fn(async () => Response.json({
      success: true,
      result: {
        events: {
          count: 1,
          events: [telemetry({ event: 'http_request', status: 500, route: '/health', duration_ms: 3 })],
        },
      },
    })) as unknown as typeof fetch;
    const receiverFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(null, { status: 202 }));
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const result = await runObservabilityAlerts(
        {
          CLOUDFLARE_ACCOUNT_ID: 'account-id',
          OBSERVABILITY_API_TOKEN: 'observability-token',
          OBSERVABILITY_ALERT_WEBHOOK_URL: 'https://alerts.example.test/cloudflare',
          OBSERVABILITY_ALERT_WEBHOOK_TOKEN: 'webhook-token',
          OBSERVABILITY_ALERT_RECEIVER: { fetch: receiverFetch },
        },
        { now: NOW, fetcher: externalFetch },
      );

      expect(result.status).toBe('sent');
      expect(externalFetch).toHaveBeenCalledTimes(1);
      expect(receiverFetch).toHaveBeenCalledTimes(1);
      expect(receiverFetch.mock.calls[0]?.[0].toString()).toBe('https://alerts.example.test/cloudflare');
    } finally {
      log.mockRestore();
    }
  });
});

function telemetry(log: Record<string, unknown>) {
  return { timestamp: NOW - 30_000, source: { ...log, release: 'abc123' } };
}
