import { app } from './app.js';
import { runFsrsOptimizer } from './jobs/optimize-fsrs.js';
import { handleContentReleaseQueueBatch } from './lib/content-release-control-plane.js';
import { runPushReminder } from './lib/push-reminders.js';
import { safeErrorName } from './lib/safe-log.js';
import { isReadOnlyMaintenance } from './middleware/maintenance.js';
import { buildWeeklyReport, sendReportEmail } from './routes/admin.js';
import type { Env } from './types.js';
import { runObservabilityAlerts } from './jobs/observability-alerts.js';

export { ContentReleaseWorkflow } from './workflows/content-release-workflow.js';
export {
  app,
  getAdminOpenApiDocument,
  getPublicOpenApiDocument,
  INTERNAL_ROUTE_EXCEPTIONS,
} from './app.js';
export type { AppEnv } from './types.js';

export default {
  fetch: app.fetch,

  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    // 강성호 2026-10-13: 점검 중 메시지를 소비/승인하지 않고 큐에 남겨 DB 쓰기를 차단한다.
    // 실제 백업은 기존 실행 중 Workflow 종료 확인과 Queue 원격 pause를 추가로 요구한다.
    if (isReadOnlyMaintenance(env)) {
      batch.retryAll({ delaySeconds: 900 });
      return;
    }
    await handleContentReleaseQueueBatch(batch, env);
  },

  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const cron = controller.cron;
    const isObservabilityCheck = cron === '*/5 * * * *';
    if (isReadOnlyMaintenance(env) && !isObservabilityCheck) {
      console.log({ event: 'cron_skipped', reason: 'maintenance_read_only', cron });
      return;
    }

    ctx.waitUntil((async () => {
      if (isObservabilityCheck) {
        try {
          await runObservabilityAlerts(env);
        } catch (err) {
          console.error({ event: 'observability_alert_check_error', error_name: safeErrorName(err) });
          throw err;
        }
        return;
      }

      if (cron === '0 14 * * 0') {
        try {
          const { markdown, weekLabel } = await buildWeeklyReport(env.DB);
          const key = `reports/weekly/${weekLabel}.md`;
          await env.REPORTS.put(key, markdown, {
            httpMetadata: { contentType: 'text/markdown; charset=utf-8' },
            customMetadata: { generatedAt: new Date().toISOString() },
          });
          await sendReportEmail(env.NOTIFY_EMAIL, weekLabel, markdown);
          console.log({ event: 'weekly_report_completed', report_key: key });
        } catch (err) {
          console.error({ event: 'weekly_report_error', error_name: safeErrorName(err) });
        }
      }

      if (cron === '0 15 * * 0') {
        try {
          await runFsrsOptimizer(env);
          console.log({ event: 'fsrs_optimizer_completed' });
        } catch (err) {
          console.error({ event: 'fsrs_optimizer_cron_error', error_name: safeErrorName(err) });
        }
      }

      if (cron === '0 * * * *') {
        try {
          await Promise.all([
            runPushReminder(env, 'morning'),
            runPushReminder(env, 'evening'),
          ]);
        } catch (err) {
          console.error({ event: 'push_notification_error', error_name: safeErrorName(err) });
        }
      }
    })());
  },
} satisfies ExportedHandler<Env>;
