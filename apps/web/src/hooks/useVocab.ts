/**
 * useVocab — 어휘 데이터 훅 (IDB first)
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useQuery } from '@tanstack/react-query';
import { db, type VocabItem } from '../lib/db';
import { vocabApi } from '../lib/api';

/** IDB first — 비어있으면 서버에서 로드해 IDB에 저장 */
export function useVocabList(level?: string, limit = 50) {
  const local = useLiveQuery(
    () => {
      let query = db.vocab.orderBy('id');
      if (level) {
        return db.vocab.where('level').equals(level).limit(limit).toArray();
      }
      return query.limit(limit).toArray();
    },
    [level, limit],
  );

  const { isFetching } = useQuery({
    queryKey: ['vocab', 'list', level, limit],
    queryFn: async () => {
      const count = level
        ? await db.vocab.where('level').equals(level).count()
        : await db.vocab.count();
      if (count > 0) return null; // IDB에 이미 있음

      const res = await vocabApi.list({ ...(level !== undefined ? { level } : {}), limit: 200 });
      if (!res.ok) return null;
      await db.vocab.bulkPut(res.data);
      return res.data;
    },
    staleTime: Infinity, // 한 번 로드하면 재요청 안 함
    retry: 1,
  });

  return { items: local ?? [], loading: isFetching };
}

/** 어휘 단건 조회 */
export function useVocabItem(id: number) {
  const local = useLiveQuery(() => db.vocab.get(id), [id]);

  const { isFetching } = useQuery({
    queryKey: ['vocab', 'item', id],
    enabled: !local,
    queryFn: async () => {
      const res = await vocabApi.get(id);
      if (!res.ok) return null;
      await db.vocab.put(res.data);
      return res.data;
    },
    staleTime: Infinity,
    retry: 1,
  });

  return { item: local, loading: isFetching };
}

/** 어휘 검색 (항상 서버에서) */
export function useVocabSearch(q: string) {
  return useQuery<VocabItem[]>({
    queryKey: ['vocab', 'search', q],
    enabled:  q.trim().length >= 1,
    queryFn: async () => {
      const res = await vocabApi.search(q);
      return res.ok ? res.data : [];
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}
