import type {
  LearningActivityEvent,
  LearningTrackId,
} from '@nihongo-n3/shared';

import { activityApi } from './api';
import { createClientId, isOnline } from './browser';
import {
  db,
  getActiveLocalUserId,
  type ActivityEventQueueItem,
  type Rating,
} from './db';

export interface RecordLearningActivityInput {
  event_type: LearningActivityEvent['event_type'];
  learning_track: LearningTrackId;
  content_type?: string;
  content_id?: string;
  level_tag?: string;
  section?: string;
  mode?: LearningActivityEvent['mode'];
  correct?: boolean;
  rating?: Rating;
  duration_ms?: number;
  speech_outcome?: LearningActivityEvent['speech_outcome'];
  occurred_at?: string;
}

const MAX_RETRIES = 5;
const BATCH_SIZE = 50;
let flushing = false;

function toEvent(input: RecordLearningActivityInput): LearningActivityEvent {
  return {
    event_id: createClientId('activity'),
    event_type: input.event_type,
    learning_track: input.learning_track,
    occurred_at: input.occurred_at ?? new Date().toISOString(),
    ...(input.content_type !== undefined ? { content_type: input.content_type } : {}),
    ...(input.content_id !== undefined ? { content_id: input.content_id } : {}),
    ...(input.level_tag !== undefined ? { level_tag: input.level_tag } : {}),
    ...(input.section !== undefined ? { section: input.section } : {}),
    ...(input.mode !== undefined ? { mode: input.mode } : {}),
    ...(input.correct !== undefined ? { correct: input.correct } : {}),
    ...(input.rating !== undefined ? { rating: input.rating } : {}),
    ...(input.duration_ms !== undefined ? { duration_ms: input.duration_ms } : {}),
    ...(input.speech_outcome !== undefined ? { speech_outcome: input.speech_outcome } : {}),
  };
}

function withoutQueueFields(item: ActivityEventQueueItem): LearningActivityEvent {
  const { id: _id, scope_id: _scopeId, status: _status, retries: _retries, last_error: _lastError, ...event } = item;
  return event;
}

async function queueEvent(event: LearningActivityEvent): Promise<void> {
  const existing = await db.activity_event_queue.where('event_id').equals(event.event_id).first();
  if (existing) return;
  await db.activity_event_queue.add({
    ...event,
    scope_id: getActiveLocalUserId(),
    status: 'pending',
    retries: 0,
  });
}

/** Queue first so a tab close during delivery cannot lose the event. */
export async function recordLearningActivity(input: RecordLearningActivityInput): Promise<void> {
  const event = toEvent(input);
  try {
    await queueEvent(event);
  } catch {
    // IndexedDB can be disabled in private/restricted browser contexts. Keep an
    // online-only path so telemetry failure never blocks the learning action.
    if (isOnline()) await activityApi.record([event]).catch(() => undefined);
    return;
  }
  if (isOnline()) await flushActivityEvents();
}

export async function flushActivityEvents(): Promise<void> {
  if (flushing || !isOnline()) return;
  const scopeId = getActiveLocalUserId();
  let deliveredBatch = false;
  flushing = true;
  try {
    // Recover a batch left in-flight by a terminated tab or browser process.
    await db.activity_event_queue
      .where('[scope_id+status]')
      .equals([scopeId, 'processing'])
      .modify({ status: 'pending' });
    const pending = await db.activity_event_queue
      .where('[scope_id+status]')
      .equals([scopeId, 'pending'])
      .and((item) => item.retries < MAX_RETRIES)
      .limit(BATCH_SIZE)
      .toArray();
    if (pending.length === 0) return;

    const ids = pending.flatMap((item) => item.id === undefined ? [] : [item.id]);
    await db.activity_event_queue.where('id').anyOf(ids).modify({ status: 'processing' });
    let result: Awaited<ReturnType<typeof activityApi.record>>;
    try {
      result = await activityApi.record(pending.map(withoutQueueFields));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'activity delivery failed';
      await db.activity_event_queue.where('id').anyOf(ids).modify((item: ActivityEventQueueItem) => {
        item.retries += 1;
        item.status = item.retries >= MAX_RETRIES ? 'failed' : 'pending';
        item.last_error = message;
      });
      return;
    }

    if (result.ok) {
      await db.activity_event_queue.where('id').anyOf(ids).delete();
      deliveredBatch = true;
    } else {
      await db.activity_event_queue.where('id').anyOf(ids).modify((item: ActivityEventQueueItem) => {
        item.retries += 1;
        item.status = item.retries >= MAX_RETRIES ? 'failed' : 'pending';
        item.last_error = result.message;
      });
    }
  } finally {
    flushing = false;
  }
  // Drain additional batches and events queued while this request was active.
  if (deliveredBatch) void flushActivityEvents();
}

export async function purgeActivityEvents(keepDays = 30): Promise<void> {
  const cutoff = new Date(Date.now() - keepDays * 86_400_000).toISOString();
  await db.activity_event_queue
    .where('status')
    .equals('failed')
    .and((item) => item.occurred_at < cutoff)
    .delete();
}
