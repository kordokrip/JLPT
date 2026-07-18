import {
  buildObservabilitySummary,
  hasFiredAlert,
  normalizeTelemetryEvents,
  telemetryEventsFromQueryResult,
  type AlertEvaluation,
} from '../../../../packages/shared/src/observability-core.mjs';

const LOOKBACK_MS = 60 * 60_000;
const REPORT_WINDOW_MS = 30 * 60_000;
const TELEMETRY_LIMIT = 2_000;

export type ObservabilityAlertEnv = {
  CLOUDFLARE_ACCOUNT_ID?: string;
  OBSERVABILITY_API_TOKEN?: string;
  OBSERVABILITY_ALERT_WEBHOOK_URL?: string;
  OBSERVABILITY_ALERT_WEBHOOK_TOKEN?: string;
  OBSERVABILITY_ALERT_RECEIVER?: { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> };
  OBSERVABILITY_WORKER_NAME?: string;
  RELEASE_SHA?: string;
};

type Fetcher = typeof fetch;

export type ObservabilityAlertResult = {
  status: 'sent' | 'quiet' | 'skipped';
  missing?: string[];
  eventRows?: number;
  alertEvaluation?: AlertEvaluation;
};

export async function runObservabilityAlerts(
  env: ObservabilityAlertEnv,
  options: { now?: number; fetcher?: Fetcher } = {},
): Promise<ObservabilityAlertResult> {
  const now = options.now ?? Date.now();
  const fetcher = options.fetcher ?? fetch;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = env.OBSERVABILITY_API_TOKEN?.trim();
  const webhook = env.OBSERVABILITY_ALERT_WEBHOOK_URL?.trim();
  const missing = [
    !accountId && 'CLOUDFLARE_ACCOUNT_ID',
    !apiToken && 'OBSERVABILITY_API_TOKEN',
    !webhook && 'OBSERVABILITY_ALERT_WEBHOOK_URL',
  ].filter((value): value is string => Boolean(value));

  if (!accountId || !apiToken || !webhook) {
    console.log({ event: 'observability_alert_check_skipped', reason: 'configuration_missing', missing });
    return { status: 'skipped', missing };
  }

  const workerName = env.OBSERVABILITY_WORKER_NAME?.trim() || 'nihongo-n3-api';
  const events = await queryTelemetry({
    accountId,
    apiToken,
    workerName,
    from: now - LOOKBACK_MS,
    to: now,
    fetcher,
  });
  const logs = normalizeTelemetryEvents(events);
  const summary = buildObservabilitySummary(logs, { now, windowMs: REPORT_WINDOW_MS });
  const fired = hasFiredAlert(summary.alert_evaluation);

  if (fired) {
    await sendWebhook({
      url: webhook,
      fetcher,
      ...(env.OBSERVABILITY_ALERT_RECEIVER
        ? { receiver: env.OBSERVABILITY_ALERT_RECEIVER }
        : {}),
      ...(env.OBSERVABILITY_ALERT_WEBHOOK_TOKEN?.trim()
        ? { token: env.OBSERVABILITY_ALERT_WEBHOOK_TOKEN.trim() }
        : {}),
      body: {
        source: 'worker-cron',
        service: workerName,
        generated_at: new Date(now).toISOString(),
        release: env.RELEASE_SHA?.trim() || 'unversioned',
        dedupe_key: `${workerName}:${Math.floor(now / (5 * 60_000))}`,
        event_rows_received: events.length,
        telemetry_truncated: events.length >= TELEMETRY_LIMIT,
        alerts: summary.alert_evaluation,
        requests: summary.requests,
        releases: summary.releases,
        routes: summary.routes,
      },
    });
  }

  console.log({
    event: 'observability_alert_check_completed',
    result: fired ? 'sent' : 'quiet',
    event_rows_received: events.length,
    structured_events_used: logs.length,
    alerts: {
      five_xx: summary.alert_evaluation.five_xx.fired,
      auth_failure_trend: summary.alert_evaluation.auth_failure_trend.fired,
      d1_error: summary.alert_evaluation.d1_error.fired,
    },
  });

  return {
    status: fired ? 'sent' : 'quiet',
    eventRows: events.length,
    alertEvaluation: summary.alert_evaluation,
  };
}

async function queryTelemetry({
  accountId,
  apiToken,
  workerName,
  from,
  to,
  fetcher,
}: {
  accountId: string;
  apiToken: string;
  workerName: string;
  from: number;
  to: number;
  fetcher: Fetcher;
}): Promise<unknown[]> {
  const response = await fetcher(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/observability/telemetry/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queryId: `nihongo-n3-alert-${crypto.randomUUID()}`,
        timeframe: { from, to },
        dry: true,
        limit: TELEMETRY_LIMIT,
        view: 'events',
        parameters: {
          datasets: ['cloudflare-workers'],
          filterCombination: 'and',
          filters: [
            {
              kind: 'filter',
              key: '$metadata.service',
              operation: 'eq',
              type: 'string',
              value: workerName,
            },
          ],
          limit: TELEMETRY_LIMIT,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  const body = await response.json().catch(() => null) as {
    success?: boolean;
    errors?: Array<{ code?: number; message?: string }>;
    result?: unknown;
  } | null;
  if (!response.ok || body?.success === false) {
    throw cloudflareError('Workers Observability query', response.status, body?.errors);
  }
  return telemetryEventsFromQueryResult(body?.result);
}

async function sendWebhook({
  url,
  token,
  fetcher,
  receiver,
  body,
}: {
  url: string;
  token?: string;
  fetcher: Fetcher;
  receiver?: { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> };
  body: Record<string, unknown>;
}): Promise<void> {
  const target = new URL(url);
  if (target.protocol !== 'https:') throw new Error('Observability alert webhook must use HTTPS');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await (receiver ? receiver.fetch(target, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  }) : fetcher(target, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  }));
  if (!response.ok) {
    const error = new Error(`Observability alert webhook returned HTTP ${response.status}`);
    error.name = 'ObservabilityWebhookHttpError';
    throw error;
  }
}

function cloudflareError(
  operation: string,
  status: number,
  errors: Array<{ code?: number; message?: string }> | undefined,
): Error {
  const codes = (errors ?? []).map((error) => error.code).filter((code) => code !== undefined);
  const suffix = codes.length > 0 ? ` (codes: ${codes.join(',')})` : '';
  const error = new Error(`${operation} failed with HTTP ${status}${suffix}`);
  error.name = 'CloudflareObservabilityQueryError';
  return error;
}
