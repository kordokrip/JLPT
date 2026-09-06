import { app } from './app.js';
import { runFsrsOptimizer } from './jobs/optimize-fsrs.js';
import { handleContentReleaseQueueBatch } from './lib/content-release-control-plane.js';
import { sendPushToMany } from './lib/push.js';
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

      if (cron === '0 22 * * *' || cron === '0 13 * * *') {
        try {
          if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
            console.log({ event: 'push_notification_skipped', reason: 'vapid_not_configured' });
            return;
          }
          const isMorning = cron === '0 22 * * *';
          const col = isMorning ? 'morning_on' : 'evening_on';
          const title = isMorning ? '오늘의 복습 알림' : '취침 전 미니 회상';
          const body = isMorning
            ? '오늘 복습할 카드가 기다리고 있어요.'
            : '자기 전 5분, 오늘 배운 단어를 떠올려 보세요.';
          const subs = await env.DB.prepare(
            `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE ${col} = 1 LIMIT 200`,
          ).all<{ endpoint: string; p256dh: string; auth: string }>();
          const { sent, failed, expired } = await sendPushToMany(
            subs.results ?? [],
            { title, body, icon: '/pwa-192x192.png', badge: '/pwa-192x192.png', url: '/review', tag: 'daily-reminder' },
            env.VAPID_PUBLIC_KEY,
            env.VAPID_PRIVATE_KEY,
          );
          for (const endpoint of expired) {
            await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).run();
          }
          console.log({ event: 'push_notification_completed', schedule: isMorning ? 'morning' : 'evening', sent, failed, expired: expired.length });
        } catch (err) {
          console.error({ event: 'push_notification_error', error_name: safeErrorName(err) });
        }
      }
    })());
  },
} satisfies ExportedHandler<Env>;
