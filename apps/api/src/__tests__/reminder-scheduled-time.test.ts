// 강성호 2026-10-14: cron 지연·자정 경계에도 원래 예약 슬롯을 사용한다.
import { describe, expect, it, vi } from 'vitest';
import worker from '../index.js';
import { runPushReminder } from '../lib/push-reminders.js';
vi.mock('../lib/push-reminders.js', async (original) => ({
  ...await original<typeof import('../lib/push-reminders.js')>(),
  runPushReminder: vi.fn(async () => ({ sent: 0, failed: 0, expired: 0, skippedStudied: 0, claimed: 0 })),
}));
describe('scheduled reminder slot', () => {
  it.each(['2026-10-14T22:15:00Z', '2026-10-14T14:45:00Z'])('uses scheduledTime despite delayed execution: %s', async (slot) => {
    vi.mocked(runPushReminder).mockClear();
    const scheduledTime = Date.parse(slot);
    vi.spyOn(Date, 'now').mockReturnValue(scheduledTime + 16 * 60_000);
    const tasks: Promise<unknown>[] = [];
    await worker.scheduled({ cron: '*/15 * * * *', scheduledTime } as ScheduledController,
      { MAINTENANCE_MODE: 'off' } as never,
      { waitUntil: (task: Promise<unknown>) => tasks.push(task) } as unknown as ExecutionContext);
    await Promise.all(tasks);
    for (const schedule of ['morning', 'evening', 'custom'])
      expect(runPushReminder).toHaveBeenCalledWith(expect.anything(), schedule, { now: new Date(scheduledTime) });
    vi.restoreAllMocks();
  });
});
