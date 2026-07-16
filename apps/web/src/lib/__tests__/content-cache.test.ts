import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { contentVersionMetaKey } from '../content-cache';
import { invalidateTrackContentQueries } from '../../hooks/useContentVersionInvalidation';

describe('content cache version scope', () => {
  it('keeps content version metadata scoped to the learning track', () => {
    expect(contentVersionMetaKey('jlpt-ja')).toBe('content.version:jlpt-ja');
    expect(contentVersionMetaKey('topik-ko')).toBe('content.version:topik-ko');
  });

  it('invalidates only the changed track content and release status', async () => {
    const queryClient = new QueryClient();
    const jlptVocabKey = ['vocab', 'jlpt-ja', 'list', 'N2', 200] as const;
    const topikVocabKey = ['vocab', 'topik-ko', 'list', undefined, 200] as const;
    const jlptStatusKey = ['track-status', 'jlpt-ja'] as const;

    queryClient.setQueryData(jlptVocabKey, ['old N2 data']);
    queryClient.setQueryData(topikVocabKey, ['topik data']);
    queryClient.setQueryData(jlptStatusKey, { content_release: 'n5-n3' });

    await invalidateTrackContentQueries(queryClient, 'jlpt-ja');

    expect(queryClient.getQueryState(jlptVocabKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(jlptStatusKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(topikVocabKey)?.isInvalidated).toBe(false);
  });
});
