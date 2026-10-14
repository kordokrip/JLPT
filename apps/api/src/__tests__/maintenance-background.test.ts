// 강성호 2026-10-13: HTTP 점검 중 queue가 DB 기록을 계속 쓰는 회귀를 차단한다.
import { describe, expect, it, vi } from 'vitest';
import worker from '../index.js';
import type { Env } from '../types.js';

describe('maintenance background writers', () => {
  it('defers the entire queue batch without acknowledging or writing D1', async () => {
    const retryAll = vi.fn();
    const ack = vi.fn();
    const prepare = vi.fn(() => { throw new Error('D1 must not be called'); });
    const batch = { queue: 'content-release', messages: [{ ack }], retryAll } as unknown as MessageBatch<unknown>;
    await worker.queue(batch, { MAINTENANCE_MODE: 'read-only', DB: { prepare } } as unknown as Env);
    expect(retryAll).toHaveBeenCalledWith({ delaySeconds: 900 });
    expect(ack).not.toHaveBeenCalled();
    expect(prepare).not.toHaveBeenCalled();
  });

  it('keeps the existing malformed-message acknowledgement outside maintenance', async () => {
    const ack = vi.fn();
    const retryAll = vi.fn();
    const batch = { queue: 'content-release', messages: [{ body: null, ack }], retryAll } as unknown as MessageBatch<unknown>;
    await worker.queue(batch, { MAINTENANCE_MODE: 'off' } as Env);
    expect(ack).toHaveBeenCalledOnce();
    expect(retryAll).not.toHaveBeenCalled();
  });

  it('does not schedule D1-writing cron work during read-only maintenance', async () => {
    const waitUntil = vi.fn();
    await worker.scheduled({ cron: '0 * * * *' } as ScheduledController,
      { MAINTENANCE_MODE: 'read-only' } as Env, { waitUntil } as unknown as ExecutionContext);
    expect(waitUntil).not.toHaveBeenCalled();
  });
});
