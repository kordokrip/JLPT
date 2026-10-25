import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  type Row = Record<string, unknown> & { id?: number };
  const rows: Row[] = [];
  let nextId = 1;
  const matches = (row: Row, field: string, value: unknown) => {
    if (field === '[scope_id+status]' && Array.isArray(value)) {
      return row.scope_id === value[0] && row.status === value[1];
    }
    return row[field] === value;
  };
  const selection = (selected: () => Row[]) => ({
    first: async () => selected()[0],
    toArray: async () => [...selected()],
    and: (predicate: (row: Row) => boolean) => selection(() => selected().filter(predicate)),
    limit: (limit: number) => selection(() => selected().slice(0, limit)),
    modify: async (change: Record<string, unknown> | ((row: Row) => void)) => {
      for (const row of selected()) typeof change === 'function' ? change(row) : Object.assign(row, change);
    },
    delete: async () => {
      for (const row of selected()) {
        const index = rows.indexOf(row);
        if (index >= 0) rows.splice(index, 1);
      }
    },
  });
  const table = {
    clear: async () => { rows.splice(0); nextId = 1; },
    add: async (row: Row) => { rows.push({ ...row, id: nextId++ }); },
    count: async () => rows.length,
    toArray: async () => [...rows],
    where: (field: string) => ({
      equals: (value: unknown) => selection(() => rows.filter((row) => matches(row, field, value))),
      anyOf: (values: unknown[]) => selection(() => rows.filter((row) => values.includes(row[field]))),
    }),
  };
  return { record: vi.fn(), table };
});

vi.mock('../api', () => ({
  activityApi: { record: mocks.record },
}));
vi.mock('../db', () => ({
  db: { activity_event_queue: mocks.table },
  getActiveLocalUserId: () => 'user:member-1|track:jlpt-ja',
}));

import { flushActivityEvents, recordLearningActivity } from '../activity-events';

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
}

describe('offline-safe learning activity queue', () => {
  beforeEach(async () => {
    await mocks.table.clear();
    mocks.record.mockReset();
  });

  afterEach(async () => {
    await mocks.table.clear();
    setOnline(true);
  });

  it('queues a privacy-minimized event while offline', async () => {
    setOnline(false);
    await recordLearningActivity({
      event_type: 'speech_attempted',
      learning_track: 'jlpt-ja',
      content_type: 'jlpt_practice_question',
      content_id: 'n3-listening-1',
      level_tag: 'N3',
      mode: 'listening',
      speech_outcome: 'played',
    });

    const queued = await mocks.table.toArray();
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({
      scope_id: 'user:member-1|track:jlpt-ja',
      learning_track: 'jlpt-ja',
      content_id: 'n3-listening-1',
      status: 'pending',
      retries: 0,
    });
    expect(JSON.stringify(queued[0])).not.toMatch(/prompt|answer_text|email/i);
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it('reuses the queued event id and deletes it only after delivery is confirmed', async () => {
    setOnline(false);
    await recordLearningActivity({
      event_type: 'content_opened',
      learning_track: 'jlpt-ja',
      content_type: 'jlpt_practice_question',
      content_id: 'n3-kanji-1',
    });
    const eventId = (await mocks.table.toArray())[0]?.event_id;

    mocks.record.mockResolvedValue({ ok: true, data: { accepted: 1, duplicates: 0 } });
    setOnline(true);
    await flushActivityEvents();

    expect(mocks.record).toHaveBeenCalledWith([
      expect.objectContaining({ event_id: eventId, content_id: 'n3-kanji-1' }),
    ]);
    expect(await mocks.table.count()).toBe(0);
  });
});
