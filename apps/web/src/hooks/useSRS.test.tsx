import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SrsCard } from '../lib/db';

// React Query is real; this observable table models the Dexie call contract,
// not an actual browser IndexedDB implementation.
const mocks = vi.hoisted(() => ({
  rows: [] as SrsCard[],
  listeners: new Set<() => void>(),
  due: vi.fn(),
  user: 'learner-a',
  track: 'jlpt-ja',
}));
vi.mock('../stores/auth-store', () => ({ useAuthStore: (select: (state: unknown) => unknown) => select({ user: { id: mocks.user } }) }));
vi.mock('../stores/settings-store', () => ({ useSettingsStore: (select: (state: unknown) => unknown) => select({ learningTrack: mocks.track }) }));
vi.mock('../lib/api', () => ({ srsApi: { due: mocks.due } }));
vi.mock('../lib/sync', () => ({ enqueue: vi.fn() }));
vi.mock('../lib/db', () => {
  const table = {
    where: () => ({ equals: (scope: string) => {
      let predicate = (_card: SrsCard) => true;
      let limit = Infinity;
      const query = {
        and: (filter: (card: SrsCard) => boolean) => { predicate = filter; return query; },
        limit: (count: number) => { limit = count; return query; },
        toArray: async () => mocks.rows.filter((card) => card.user_id === scope && predicate(card)).slice(0, limit).map((card) => ({ ...card })),
      };
      return query;
    } }),
    bulkPut: async (cards: SrsCard[]) => {
      for (const card of cards) {
        mocks.rows = mocks.rows.filter((row) => row.id !== card.id);
        mocks.rows.push({ ...card });
      }
      mocks.listeners.forEach((notify) => notify());
    },
  };
  return {
    db: { srs_cards: table, transaction: async (_mode: string, _table: unknown, callback: () => Promise<void>) => callback() },
    localUserIdFor: (user: string, track: string) => `user:${user}|track:${track}`,
  };
});
vi.mock('dexie-react-hooks', async () => {
  const { useEffect, useState } = await import('react');
  return { useLiveQuery: (query: () => Promise<SrsCard[]>, dependencies: unknown[]) => {
    const [value, setValue] = useState<SrsCard[]>();
    useEffect(() => {
      let active = true;
      const notify = () => { void query().then((cards) => { if (active) setValue(cards); }); };
      mocks.listeners.add(notify);
      notify();
      return () => { active = false; mocks.listeners.delete(notify); };
    }, dependencies);
    return value;
  } };
});

import { useDueCards } from './useSRS';

const scope = (user = 'learner-a', track = 'jlpt-ja') => `user:${user}|track:${track}`;
function serverCard(overrides: Partial<SrsCard> = {}): SrsCard {
  const timestamp = new Date(Date.now() + 60_000).toISOString();
  return { id: 71, user_id: 'learner-a', item_type: 'vocab', item_id: 4, state: 'new', stability: 2.5, difficulty: 5, lapses: 0, reps: 0, due_at: timestamp, created_at: timestamp, updated_at: timestamp, ...overrides };
}
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, ...renderHook(() => useDueCards(), { wrapper }) };
}
function replaceLocal(card: SrsCard) {
  mocks.rows = [card];
  mocks.listeners.forEach((notify) => notify());
}

describe('useDueCards server-due snapshot authority', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rows = [];
    mocks.listeners.clear();
    mocks.user = 'learner-a';
    mocks.track = 'jlpt-ja';
  });

  it('shows the server due snapshot despite an ahead-of-device clock without rewriting FSRS dates', async () => {
    const card = serverCard();
    mocks.due.mockResolvedValue({ ok: true, data: [card] });
    const { result, client } = setup();
    await waitFor(() => expect(result.current.cards).toHaveLength(1));
    expect(result.current.cards[0]).toEqual({ ...card, user_id: scope() });
    expect(mocks.rows[0]?.due_at).toBe(card.due_at);
    expect(client.getQueryData(['srs', 'due', scope(), undefined])).toEqual([{ ...card, user_id: scope() }]);
  });

  it('does not revive a locally reviewed card from cached or refetched stale server due data', async () => {
    const card = serverCard();
    mocks.due.mockResolvedValue({ ok: true, data: [card] });
    const { result } = setup();
    await waitFor(() => expect(result.current.cards).toHaveLength(1));
    const reviewed = { ...card, user_id: scope(), state: 'learning' as const, reps: 1, due_at: new Date(Date.now() + 86_400_000).toISOString(), updated_at: new Date().toISOString() };
    await act(async () => replaceLocal(reviewed));
    await waitFor(() => expect(result.current.cards).toEqual([]));
    await act(async () => { await result.current.refetch(); });
    expect(mocks.rows).toEqual([reviewed]);
    expect(result.current.cards).toEqual([]);
  });

  it('preserves a changed local snapshot when an older due request finishes later', async () => {
    const card = serverCard();
    mocks.rows = [{ ...card, user_id: scope() }];
    let resolve!: (value: { ok: true; data: SrsCard[] }) => void;
    mocks.due.mockReturnValue(new Promise((done) => { resolve = done; }));
    const { result } = setup();
    await waitFor(() => expect(mocks.due).toHaveBeenCalledOnce());
    const changed = { ...card, user_id: scope(), due_at: new Date(Date.now() + 86_400_000).toISOString(), updated_at: new Date().toISOString() };
    await act(async () => { replaceLocal(changed); resolve({ ok: true, data: [card] }); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mocks.rows).toEqual([changed]);
    expect(result.current.cards).toEqual([]);
  });

  it('rejects due payloads belonging to another account', async () => {
    const card = serverCard({ user_id: 'learner-b', due_at: new Date(Date.now() - 60_000).toISOString() });
    mocks.due.mockResolvedValue({ ok: true, data: [card] });
    const { result } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mocks.rows).toEqual([]);
    expect(result.current.cards).toEqual([]);
  });

  it.each(['account', 'track'])('never carries a server due proof across a changed %s scope', async (changedScope) => {
    const card = serverCard();
    mocks.due.mockResolvedValue({ ok: true, data: [card] });
    const { result, rerender } = setup();
    await waitFor(() => expect(result.current.cards).toHaveLength(1));
    mocks.due.mockResolvedValue({ ok: true, data: [] });
    if (changedScope === 'account') mocks.user = 'learner-b';
    else mocks.track = 'topik-ko';
    rerender();
    expect(result.current.cards).toEqual([]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.cards).toEqual([]);
  });

  it('retains locally due cards while excluding future cards absent from server due data', async () => {
    const past = serverCard({ user_id: scope(), due_at: new Date(Date.now() - 60_000).toISOString() });
    mocks.rows = [past, serverCard({ id: 72, user_id: scope() })];
    mocks.due.mockResolvedValue({ ok: true, data: [] });
    const { result } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.cards).toEqual([past]);
  });
});
