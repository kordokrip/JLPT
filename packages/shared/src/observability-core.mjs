const AUTH_ROUTE_PREFIXES = ['/api/v1/auth/', '/admin'];

export function parseWindow(value) {
  const match = String(value).trim().match(/^(\d+)(m|h)$/);
  if (!match) throw new Error(`Unsupported window: ${value}. Use <minutes>m or <hours>h.`);
  const amount = Number(match[1]);
  if (amount <= 0) throw new Error('Window must be greater than zero');
  return amount * (match[2] === 'h' ? 3_600_000 : 60_000);
}

export function extractStructuredLog(event) {
  const candidates = [
    event?.source,
    event?.message,
    event?.['$metadata']?.message,
    event?.logs,
  ];

  for (const candidate of candidates) {
    const parsed = parseCandidate(candidate);
    if (parsed && typeof parsed.event === 'string') return parsed;
  }
  return null;
}

export function normalizeTelemetryEvents(events) {
  const normalized = [];
  for (const event of events ?? []) {
    const log = extractStructuredLog(event);
    if (!log) continue;
    const timestamp = numericTimestamp(
      event?.timestamp ?? event?.['$metadata']?.timestamp ?? log.timestamp,
    );
    if (!timestamp) continue;
    normalized.push({ ...log, timestamp });
  }
  return normalized;
}

export function telemetryEventsFromQueryResult(result) {
  if (Array.isArray(result?.events)) return result.events;
  if (Array.isArray(result?.events?.events)) return result.events.events;
  return [];
}

export function buildObservabilitySummary(logs, { now = Date.now(), windowMs }) {
  const start = now - windowMs;
  const inWindow = logs.filter((log) => log.timestamp >= start && log.timestamp <= now);
  const requests = inWindow.filter((log) => log.event === 'http_request');
  const d1Errors = inWindow.filter((log) => log.event === 'd1_error');
  const releases = groupRequests(requests, 'release');
  const routes = groupRequests(requests, 'route');

  return {
    window: {
      from: new Date(start).toISOString(),
      to: new Date(now).toISOString(),
      duration_ms: windowMs,
    },
    requests: requestMetrics(requests),
    d1_errors: d1Errors.length,
    releases,
    routes,
    alert_evaluation: evaluateAlerts(logs, { now }),
  };
}

export function evaluateAlerts(logs, { now = Date.now() } = {}) {
  const fiveMinutes = 5 * 60_000;
  const baselineDuration = 55 * 60_000;
  const currentStart = now - fiveMinutes;
  const baselineStart = currentStart - baselineDuration;

  const currentRequests = logs.filter(
    (log) => log.event === 'http_request' && log.timestamp >= currentStart && log.timestamp <= now,
  );
  const currentAuth = authFailures(logs, currentStart, now);
  const baselineAuth = authFailures(logs, baselineStart, currentStart);
  const baselinePerFiveMinutes = baselineAuth.length / (baselineDuration / fiveMinutes);
  const authThreshold = Math.max(5, Math.ceil(baselinePerFiveMinutes * 3));
  const currentD1Errors = logs.filter(
    (log) => log.event === 'd1_error' && log.timestamp >= currentStart && log.timestamp <= now,
  ).length;
  const current5xx = currentRequests.filter((log) => Number(log.status) >= 500).length;
  const errorRate = currentRequests.length > 0 ? current5xx / currentRequests.length : 0;

  return {
    five_xx: {
      fired: currentRequests.length > 0 && errorRate > 0.01,
      threshold: '> 1% over 5 minutes',
      requests: currentRequests.length,
      errors: current5xx,
      rate: round(errorRate),
    },
    auth_failure_trend: {
      fired: currentAuth.length >= authThreshold,
      threshold: '>= 5 and >= 3x previous 55-minute normalized baseline',
      current_5m: currentAuth.length,
      previous_55m: baselineAuth.length,
      baseline_per_5m: round(baselinePerFiveMinutes),
      trigger_count: authThreshold,
    },
    d1_error: {
      fired: currentD1Errors > 0,
      threshold: '> 0 over 5 minutes',
      errors: currentD1Errors,
    },
  };
}

export function hasFiredAlert(evaluation) {
  return Object.values(evaluation).some((alert) => alert.fired === true);
}

function parseCandidate(candidate) {
  if (!candidate) return null;
  if (Array.isArray(candidate)) {
    for (const value of candidate) {
      const parsed = parseCandidate(value?.message ?? value?.Message ?? value);
      if (parsed) return parsed;
    }
    return null;
  }
  if (typeof candidate === 'object') {
    if (typeof candidate.event === 'string') return candidate;
    return parseCandidate(candidate.message ?? candidate.Message);
  }
  if (typeof candidate !== 'string') return null;
  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function numericTimestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function authFailures(logs, from, to) {
  const inWindow = logs.filter((log) => log.timestamp >= from && log.timestamp <= to);
  const explicit = inWindow.filter((log) => log.event === 'auth_failure');
  if (explicit.length > 0) return explicit;

  return inWindow.filter((log) => {
    if (log.event !== 'http_request') return false;
    const status = Number(log.status);
    const route = String(log.route ?? '');
    return (status === 401 || status === 403) && AUTH_ROUTE_PREFIXES.some((prefix) => route.startsWith(prefix));
  });
}

function groupRequests(requests, key) {
  const groups = new Map();
  for (const request of requests) {
    const value = String(request[key] ?? 'unknown');
    const bucket = groups.get(value) ?? [];
    bucket.push(request);
    groups.set(value, bucket);
  }
  return [...groups.entries()]
    .map(([value, rows]) => ({ [key]: value, ...requestMetrics(rows) }))
    .sort((left, right) => right.requests - left.requests || String(left[key]).localeCompare(String(right[key])));
}

function requestMetrics(requests) {
  const latencies = requests
    .map((request) => Number(request.duration_ms))
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((left, right) => left - right);
  const errors = requests.filter((request) => Number(request.status) >= 500).length;
  return {
    requests: requests.length,
    five_xx: errors,
    five_xx_rate: round(requests.length > 0 ? errors / requests.length : 0),
    latency_ms: {
      p50: percentile(latencies, 0.5),
      p95: percentile(latencies, 0.95),
      max: latencies.at(-1) ?? null,
    },
  };
}

function percentile(sorted, ratio) {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1);
  return sorted[index];
}

function round(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}
