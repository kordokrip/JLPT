import type { Env } from '../types.js';
import {
  sendPushNotification,
  type PushPayload,
  type PushSubscription,
} from './push.js';

type ReminderSchedule = 'morning' | 'evening';
type ReminderLanguage = 'ko' | 'ja' | 'en';
type LearningTrack = 'jlpt-ja' | 'topik-ko';

type ReminderSubscription = PushSubscription & {
  id: number;
  user_id: string;
  learning_track: LearningTrack;
  notification_language: string | null;
  timezone: string | null;
};

type ActivityRow = {
  user_id: string;
  learning_track: LearningTrack;
  occurred_at: number;
};

type DailyLogRow = {
  user_id: string;
  learning_track: LearningTrack;
  date: string;
};

export type PushSendResult = { ok: boolean; status: number; error?: string };
export type PushSender = (
  subscription: PushSubscription,
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string,
) => Promise<PushSendResult>;

const icon = '/pwa-192x192.png';

function fallbackLanguage(track: LearningTrack): ReminderLanguage {
  return track === 'topik-ko' ? 'ja' : 'ko';
}

function fallbackTimezone(track: LearningTrack): string {
  return track === 'topik-ko' ? 'Asia/Tokyo' : 'Asia/Seoul';
}

export function reminderLanguage(track: LearningTrack, value: string | null): ReminderLanguage {
  return value === 'ko' || value === 'ja' || value === 'en' ? value : fallbackLanguage(track);
}

export function reminderTimezone(track: LearningTrack, value: string | null): string {
  if (!value) return fallbackTimezone(track);
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: value }).format();
    return value;
  } catch {
    return fallbackTimezone(track);
  }
}

export function localReminderTime(now: Date, timezone: string): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    hour: Number(value('hour')),
  };
}

export function reminderPayload(schedule: ReminderSchedule, language: ReminderLanguage): PushPayload {
  const copy = {
    morning: {
      ko: ['오늘의 복습 알림', '오늘 복습할 카드가 기다리고 있어요.'],
      ja: ['今日の復習リマインダー', '今日の復習カードが待っています。'],
      en: ['Today’s review reminder', 'Your review cards are ready.'],
    },
    evening: {
      ko: ['취침 전 미니 회상', '자기 전 5분, 오늘 배운 내용을 떠올려 보세요.'],
      ja: ['就寝前のミニ復習', '寝る前の5分で、今日学んだことを思い出しましょう。'],
      en: ['Before-bed mini review', 'Take five minutes to recall what you learned today.'],
    },
  } as const;
  const [title, body] = copy[schedule][language];
  return { title, body, icon, badge: icon, url: '/review', tag: `daily-reminder-${schedule}` };
}

function studyKey(userId: string, track: LearningTrack, timezone: string, date: string): string {
  return `${userId}\u0000${track}\u0000${timezone}\u0000${date}`;
}

/**
 * Sends only at 07:00 or 22:00 in each learner's configured timezone.
 * A durable pre-send claim prevents duplicate cron deliveries. Explicit send
 * failures release the claim so the next matching run can retry safely.
 */
export async function runPushReminder(
  env: Env,
  schedule: ReminderSchedule,
  options: { now?: Date; send?: PushSender } = {},
): Promise<{ sent: number; failed: number; expired: number; skippedStudied: number; claimed: number }> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    console.log({ event: 'push_notification_skipped', reason: 'vapid_not_configured', schedule });
    return { sent: 0, failed: 0, expired: 0, skippedStudied: 0, claimed: 0 };
  }

  const now = options.now ?? new Date();
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const enabledColumn = schedule === 'morning' ? 'morning_on' : 'evening_on';
  const cutoff = nowSeconds - 2 * 86_400;
  let sent = 0;
  let failed = 0;
  let expired = 0;
  let skippedStudied = 0;
  let claimed = 0;
  const send = options.send ?? sendPushNotification;
  let afterId = 0;

  for (;;) {
    const candidates = await env.DB.prepare(
      `SELECT s.id, s.endpoint, s.p256dh, s.auth, s.user_id, u.learning_track,
              s.notification_language, p.timezone
         FROM push_subscriptions s
         JOIN users u ON u.id = s.user_id
    LEFT JOIN learning_profiles p ON p.user_id = s.user_id AND p.learning_track = u.learning_track
        WHERE s.${enabledColumn} = 1 AND s.id > ?
        ORDER BY s.id
        LIMIT 200`,
    ).bind(afterId).all<ReminderSubscription>();
    const subscriptions = candidates.results ?? [];
    if (!subscriptions.length) break;
    afterId = subscriptions[subscriptions.length - 1]!.id;

    const userIds = [...new Set(subscriptions.map((subscription) => subscription.user_id))];
    const placeholders = userIds.map(() => '?').join(',');
    const [activities, logs] = await Promise.all([
      env.DB.prepare(
        `SELECT user_id, learning_track, occurred_at
           FROM learning_activity_events
          WHERE occurred_at >= ?
            AND user_id IN (${placeholders})
            AND event_type IN ('content_completed', 'quiz_answered', 'review_rated')`,
      ).bind(cutoff, ...userIds).all<ActivityRow>(),
      env.DB.prepare(
        `SELECT user_id, learning_track, date
           FROM daily_logs
          WHERE date >= ? AND user_id IN (${placeholders}) AND items_new + items_review > 0`,
      ).bind(new Date(cutoff * 1000).toISOString().slice(0, 10), ...userIds).all<DailyLogRow>(),
    ]);
    const studied = new Set<string>();
    const byTrackTimezone = new Set(
      subscriptions.map((subscription) => `${subscription.learning_track}\u0000${reminderTimezone(subscription.learning_track, subscription.timezone)}`),
    );
    for (const activity of activities.results ?? []) {
      for (const trackTimezone of byTrackTimezone) {
        const [track, timezone] = trackTimezone.split('\u0000') as [LearningTrack, string];
        if (activity.learning_track !== track) continue;
        const date = localReminderTime(new Date(activity.occurred_at * 1000), timezone).date;
        studied.add(studyKey(activity.user_id, track, timezone, date));
      }
    }
    for (const log of logs.results ?? []) {
      for (const trackTimezone of byTrackTimezone) {
        const [track, timezone] = trackTimezone.split('\u0000') as [LearningTrack, string];
        if (log.learning_track === track) studied.add(studyKey(log.user_id, track, timezone, log.date));
      }
    }

    for (const subscription of subscriptions) {
    const timezone = reminderTimezone(subscription.learning_track, subscription.timezone);
    const local = localReminderTime(now, timezone);
    const expectedHour = schedule === 'morning' ? 7 : 22;
    if (local.hour !== expectedHour) continue;
    if (studied.has(studyKey(subscription.user_id, subscription.learning_track, timezone, local.date))) {
      skippedStudied++;
      continue;
    }

    const claim = await env.DB.prepare(
      `INSERT OR IGNORE INTO push_notification_deliveries
       (endpoint, local_date, schedule, status, claimed_at)
       VALUES (?, ?, ?, 'claimed', ?)`,
    ).bind(subscription.endpoint, local.date, schedule, nowSeconds).run();
    if (!claim.meta.changes) continue;
    claimed++;

    const result = await send(
      subscription,
      reminderPayload(schedule, reminderLanguage(subscription.learning_track, subscription.notification_language)),
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
    );
    if (result.ok) {
      sent++;
      await env.DB.prepare(
        `UPDATE push_notification_deliveries SET status = 'sent', sent_at = ?
          WHERE endpoint = ? AND local_date = ? AND schedule = ?`,
      ).bind(nowSeconds, subscription.endpoint, local.date, schedule).run();
      continue;
    }

    failed++;
    if (result.status === 404 || result.status === 410) {
      expired++;
      await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(subscription.endpoint).run();
    } else if (result.status > 0) {
      // A completed HTTP response proves the push service rejected the request,
      // so it can be retried. status=0 has an unknown delivery outcome and the
      // claim remains to protect the learner from a duplicate notification.
      await env.DB.prepare(
        'DELETE FROM push_notification_deliveries WHERE endpoint = ? AND local_date = ? AND schedule = ?',
      ).bind(subscription.endpoint, local.date, schedule).run();
    }
  }
    if (subscriptions.length < 200) break;
  }

  console.log({ event: 'push_notification_completed', schedule, sent, failed, expired, skipped_studied: skippedStudied, claimed });
  return { sent, failed, expired, skippedStudied, claimed };
}
