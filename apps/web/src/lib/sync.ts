/**
 * apps/web/src/lib/sync.ts
 *
 * 오프라인 → 온라인 복귀 시 sync_queue 를 서버에 밀어 넣는 Background Sync.
 *
 * 흐름:
 *   1. 리뷰/로그 발생 → enqueue()로 IDB sync_queue 에 push
 *   2. 온라인 상태 → flush()가 /api/v1/sync 를 호출해 큐 비움
 *   3. 성공한 항목은 status='done' → 주기적으로 purge
 */
import { db, type SyncOpType, type SyncQueueItem } from './db';
import { syncApi } from './api';
import { createClientId, isOnline } from './browser';

type ServerSyncOpType = 'review' | 'daily_log' | 'quiz' | 'self_check';

function uuid(): string {
  return createClientId('sync');
}

function toServerOpType(type: string): ServerSyncOpType {
  if (type === 'srs_review') return 'review';
  if (type === 'quiz_attempt') return 'quiz';
  return type as ServerSyncOpType;
}

// ─────────────────────────────────────────────
// 큐에 추가
// ─────────────────────────────────────────────
export async function enqueue(
  type: SyncOpType,
  payload: unknown,
): Promise<void> {
  const item: SyncQueueItem = {
    op_id:       uuid(),
    type,
    payload:     JSON.stringify(payload),
    occurred_at: new Date().toISOString(),
    status:      'pending',
    retries:     0,
  };
  await db.sync_queue.add(item);
}

// ─────────────────────────────────────────────
// 큐 플러시 (온라인 시 호출)
// ─────────────────────────────────────────────
const MAX_RETRIES = 5;
let flushing = false;

export async function flush(): Promise<void> {
  if (flushing || !isOnline()) return;
  flushing = true;
  try {
    const pending = await db.sync_queue
      .where('status').equals('pending')
      .and((item) => item.retries < MAX_RETRIES)
      .toArray();

    if (pending.length === 0) return;

    // processing 으로 마킹
    const ids = pending.map((i) => i.id!);
    await db.sync_queue.where('id').anyOf(ids).modify({ status: 'processing' });

    // last_synced_at: 가장 오래된 done 항목 이후
    const lastDone = await db.sync_queue
      .where('status').equals('done')
      .reverse()
      .first();
    const last_synced_at = lastDone?.occurred_at ?? new Date(0).toISOString();

    const operations = pending.map((item) => ({
      op_id:       item.op_id,
      type:        toServerOpType(item.type),
      payload:     JSON.parse(item.payload),
      occurred_at: item.occurred_at,
    }));

    const result = await syncApi.push(last_synced_at, operations);

    if (result.ok) {
      await db.sync_queue.where('id').anyOf(ids).modify({ status: 'done' });
    } else {
      await db.sync_queue
        .where('id')
        .anyOf(ids)
        .modify((item: SyncQueueItem) => {
          item.status  = 'pending';
          item.retries = (item.retries ?? 0) + 1;
          item.last_error = result.message;
        });
    }
  } finally {
    flushing = false;
  }
}

// ─────────────────────────────────────────────
// 오래된 'done' 항목 정리
// ─────────────────────────────────────────────
export async function purge(keepDays = 7): Promise<void> {
  const cutoff = new Date(Date.now() - keepDays * 86_400_000).toISOString();
  await db.sync_queue
    .where('status').equals('done')
    .and((item) => item.occurred_at < cutoff)
    .delete();
}

// ─────────────────────────────────────────────
// 온라인 복귀 이벤트 리스너 등록
// ─────────────────────────────────────────────
export function initSync(): () => void {
  const handler = () => void flush();
  window.addEventListener('online', handler);
  // 즉시 한 번 시도
  if (isOnline()) void flush();
  return () => window.removeEventListener('online', handler);
}
