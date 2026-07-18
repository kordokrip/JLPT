/**
 * useGrammar / useKanji — 문법·한자 데이터 훅 (IDB first, 서버 동기화)
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useQuery } from '@tanstack/react-query';
import { db } from '../lib/db';
import { grammarApi, kanjiApi } from '../lib/api';
import { ensureContentFresh } from '../lib/content-cache';
import type { JlptLevel } from '@nihongo-n3/shared';
import { useSettingsStore } from '../stores/settings-store';

// ─────────────────────────────────────────────
// 문법
// ─────────────────────────────────────────────
export function useGrammarList(level?: JlptLevel, limit = 50) {
  const track = useSettingsStore((state) => state.learningTrack);
  const local = useLiveQuery(
    () =>
      level
        ? db.grammar.where('level').equals(level).limit(limit).toArray()
        : db.grammar.orderBy('id').limit(limit).toArray(),
    [level, limit],
  );

  const { isFetching } = useQuery({
    queryKey: ['grammar', track, 'list', level, limit],
    queryFn: async () => {
      await ensureContentFresh();
      const count = level
        ? await db.grammar.where('level').equals(level).count()
        : await db.grammar.count();
      if (count > 0) return null;
      const res = await grammarApi.list({ ...(level !== undefined ? { level } : {}), limit: 200 });
      if (!res.ok) return null;
      await db.grammar.bulkPut(res.data);
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  return { items: local ?? [], loading: isFetching };
}

export function useGrammarItem(id: number) {
  const track = useSettingsStore((state) => state.learningTrack);
  const local = useLiveQuery(() => db.grammar.get(id), [id]);
  const { isFetching } = useQuery({
    queryKey: ['grammar', track, 'item', id],
    queryFn: async () => {
      await ensureContentFresh();
      const current = await db.grammar.get(id);
      if (current) return current;
      const res = await grammarApi.get(id);
      if (!res.ok) return null;
      await db.grammar.put(res.data);
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
  return { item: local, loading: isFetching };
}

// ─────────────────────────────────────────────
// 한자
// ─────────────────────────────────────────────
export function useKanjiList(level?: JlptLevel, limit = 50) {
  const track = useSettingsStore((state) => state.learningTrack);
  const local = useLiveQuery(
    () =>
      level
        ? db.kanji.where('level').equals(level).limit(limit).toArray()
        : db.kanji.orderBy('id').limit(limit).toArray(),
    [level, limit],
  );

  const { isFetching } = useQuery({
    queryKey: ['kanji', track, 'list', level, limit],
    queryFn: async () => {
      await ensureContentFresh();
      const count = level
        ? await db.kanji.where('level').equals(level).count()
        : await db.kanji.count();
      if (count > 0) return null;
      const res = await kanjiApi.list({ ...(level !== undefined ? { level } : {}), limit: 200 });
      if (!res.ok) return null;
      await db.kanji.bulkPut(res.data);
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  return { items: local ?? [], loading: isFetching };
}

export function useKanjiItem(id: number) {
  const track = useSettingsStore((state) => state.learningTrack);
  const local = useLiveQuery(() => db.kanji.get(id), [id]);
  const { isFetching } = useQuery({
    queryKey: ['kanji', track, 'item', id],
    queryFn: async () => {
      await ensureContentFresh();
      const current = await db.kanji.get(id);
      if (current) return current;
      const res = await kanjiApi.get(id);
      if (!res.ok) return null;
      await db.kanji.put(res.data);
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
  return { item: local, loading: isFetching };
}
