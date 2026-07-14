import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useGrammarList, useKanjiList } from '../../hooks/useContent';
import { useVocabList, useVocabSearch } from '../../hooks/useVocab';
import { normalizeContentType } from './types';
import type { ContentType } from './types';
import type { JlptLevel } from '@nihongo-n3/shared';

export function useBrowse() {
  const { type } = useParams<{ type: ContentType }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') ?? searchParams.get('text') ?? '');
  const [level, setLevel] = useState<JlptLevel | undefined>(undefined);

  const currentType = normalizeContentType(type);
  const vocabList = useVocabList(level, 200);
  const grammarList = useGrammarList(level, 200);
  const kanjiList = useKanjiList(level, 200);
  const vocabSearch = useVocabSearch(query);

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
  }

  const items =
    query.trim().length >= 1 && currentType === 'vocab'
      ? (vocabSearch.data ?? [])
      : currentType === 'vocab' ? vocabList.items
      : currentType === 'grammar' ? grammarList.items
      : kanjiList.items;

  const loading =
    currentType === 'vocab' ? vocabList.loading :
    currentType === 'grammar' ? grammarList.loading : kanjiList.loading;

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
