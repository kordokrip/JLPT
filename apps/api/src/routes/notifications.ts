/**
 * apps/api/src/routes/notifications.ts
 *
 * POST   /api/v1/notifications/subscribe   — PushSubscription 저장
 * DELETE /api/v1/notifications/subscribe   — 구독 취소
 * POST   /api/v1/notifications/test        — 즉시 테스트 알림 발송 (본인에게)
 */
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { cfAccessAuth } from '../middleware/auth.js';
import { ok, created, badRequest, notFound } from '../lib/response.js';
import { sendPushNotification } from '../lib/push.js';

const notifications = new Hono<AppEnv>();
notifications.use('*', cfAccessAuth);

// ── POST /notifications/subscribe ────────────────────────────────
notifications.post('/notifications/subscribe', async (c) => {
  const body = await c.req.json<{
    endpoint:  string;
    p256dh:    string;
    auth:      string;
    morningOn?: boolean;
    eveningOn?: boolean;
  }>().catch(() => null);

  if (!body?.endpoint || !body?.p256dh || !body?.auth) {
    return badRequest(c, 'endpoint, p256dh, auth 필드가 필요합니다');
  }

  const userId = c.get('userId');
  const ua     = c.req.header('User-Agent') ?? null;
  const now    = Math.floor(Date.now() / 1000);

  await c.env.DB.prepare(
    `INSERT INTO push_subscriptions
       (user_id, endpoint, p256dh, auth, user_agent, morning_on, evening_on, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET
       p256dh       = excluded.p256dh,
       auth         = excluded.auth,
       morning_on   = excluded.morning_on,
       evening_on   = excluded.evening_on,
       last_seen_at = excluded.last_seen_at`,
  )
    .bind(
      userId,
      body.endpoint,
      body.p256dh,
      body.auth,
      ua,
      body.morningOn !== false ? 1 : 0,
      body.eveningOn !== false ? 1 : 0,
      now,
      now,
    )
    .run();

  return created(c, { subscribed: true });
});

// ── DELETE /notifications/subscribe ──────────────────────────────
notifications.delete('/notifications/subscribe', async (c) => {
  const body = await c.req.json<{ endpoint: string }>().catch(() => null);
  if (!body?.endpoint) return badRequest(c, 'endpoint 필드가 필요합니다');

  const userId = c.get('userId');
  const result = await c.env.DB.prepare(
    `DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?`,
  )
    .bind(userId, body.endpoint)
    .run();

  if (!result.meta.rows_written) {
    return notFound(c, '구독 정보를 찾을 수 없습니다');
  }
  return ok(c, { unsubscribed: true });
});

// ── POST /notifications/test ──────────────────────────────────────
notifications.post('/notifications/test', async (c) => {
  const vapidPublicKey  = c.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = c.env.VAPID_PRIVATE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey) {
    return badRequest(c, 'VAPID 키가 설정되지 않았습니다');
  }

  const userId = c.get('userId');
  const rows = await c.env.DB.prepare(
    `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ? LIMIT 5`,
  ).bind(userId).all<{ endpoint: string; p256dh: string; auth: string }>();

  if (!rows.results?.length) {
    return notFound(c, '등록된 구독이 없습니다');
  }

  const results = await Promise.all(
    rows.results.map((sub) =>
      sendPushNotification(
        sub,
        {
          title: 'JLPT N3 테스트 알림',
          body:  '알림이 정상 작동합니다!',
          icon:  '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          url:   '/',
        },
        vapidPublicKey,
        vapidPrivateKey,
      ),
    ),
  );

  const sent   = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  return ok(c, { sent, failed });
});

export { notifications };
