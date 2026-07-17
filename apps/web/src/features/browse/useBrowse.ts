import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useGrammarList, useKanjiList } from '../../hooks/useContent';
import { useVocabList, useVocabSearch } from '../../hooks/useVocab';
import { homophonesApi, type HomophonePairItem } from '../../lib/api';
import type { GrammarItem, KanjiItem, VocabItem } from '../../lib/db';
import { useSettingsStore } from '../../stores/settings-store';
import { normalizeContentType } from './types';
import type { ContentType } from './types';
import type { JlptLevel } from '@nihongo-n3/shared';

export function useBrowse() {
  const { type } = useParams<{ type: ContentType }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') ?? searchParams.get('text') ?? '');
  const [level, setLevel] = useState<JlptLevel | undefined>(undefined);
  const track = useSettingsStore((state) => state.learningTrack);

  const currentType = normalizeContentType(type);
  const vocabList = useVocabList(level, 200);
  const grammarList = useGrammarList(level, 200);
  const kanjiList = useKanjiList(level, 200);
  const vocabSearch = useVocabSearch(query);
  const homophones = useQuery<HomophonePairItem[]>({
    queryKey: ['homophones', track, level],
    enabled: currentType === 'homophones',
    queryFn: async () => {
      const result = await homophonesApi.list({
        ...(level ? { level } : {}),
        limit: 100,
      });
      return result.ok ? result.data : [];
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  useEffect(() => {
    setQuery(searchParams.get('q') ?? searchParams.get('text') ?? '');
  }, [searchParams]);

  function updateQuery(value: string) {
    setQuery(value);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value.trim()) {
        next.set('q', value);
      } else {
        next.delete('q');
        next.delete('text');
      }
      return next;
    }, { replace: true });
  }

  function switchType(nextType: ContentType) {
    navigate(`/browse/${nextType}`);
    setLevel(undefined);
    setQuery('');
    setSearchParams({}, { replace: true });
  }

  const items: Array<VocabItem | GrammarItem | KanjiItem | HomophonePairItem> =
    query.trim().length >= 1 && currentType === 'vocab'
      ? (vocabSearch.data ?? [])
      : currentType === 'vocab' ? vocabList.items
      : currentType === 'grammar' ? grammarList.items
      : currentType === 'kanji' ? kanjiList.items
      : (homophones.data ?? []);

  const loading =
    currentType === 'vocab' ? vocabList.loading :
    currentType === 'grammar' ? grammarList.loading :
    currentType === 'kanji' ? kanjiList.loading : homophones.isFetching;

  return {
    currentType,
    query,
    level,
    items,
    loading,
    setLevel,
    updateQuery,
    switchType,
  };
}
