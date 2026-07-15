export type StructuredLog = {
  event: string;
  timestamp: number;
  release?: string;
  route?: string;
  status?: number;
  duration_ms?: number;
  [key: string]: unknown;
};

export type AlertEvaluation = {
  five_xx: {
    fired: boolean;
    threshold: string;
    requests: number;
    errors: number;
    rate: number;
  };
  auth_failure_trend: {
    fired: boolean;
    threshold: string;
    current_5m: number;
    previous_55m: number;
    baseline_per_5m: number;
    trigger_count: number;
  };
  d1_error: {
    fired: boolean;
    threshold: string;
    errors: number;
  };
};

export function parseWindow(value: string): number;
export function extractStructuredLog(event: unknown): Omit<StructuredLog, 'timestamp'> | null;
export function normalizeTelemetryEvents(events: unknown[]): StructuredLog[];
export function telemetryEventsFromQueryResult(result: unknown): unknown[];
export function buildObservabilitySummary(
  logs: StructuredLog[],
  options: { now?: number; windowMs: number },
): {
  window: { from: string; to: string; duration_ms: number };
  requests: RequestMetrics;
  d1_errors: number;
  releases: Array<{ release: string } & RequestMetrics>;
  routes: Array<{ route: string } & RequestMetrics>;
  alert_evaluation: AlertEvaluation;
};
export function evaluateAlerts(logs: StructuredLog[], options?: { now?: number }): AlertEvaluation;
export function hasFiredAlert(evaluation: AlertEvaluation): boolean;

type RequestMetrics = {
  requests: number;
  five_xx: number;
  five_xx_rate: number;
  latency_ms: { p50: number | null; p95: number | null; max: number | null };
};
