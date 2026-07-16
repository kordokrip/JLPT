import { useEffect } from 'react';
import { useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { subscribeToContentVersionChanges } from '../lib/content-cache';

const CONTENT_QUERY_PREFIXES = new Set([
  'vocab',
  'grammar',
  'kanji',
  'character-trainer-kanji',
  'reading-list',
  'curriculum',
]);

function belongsToTrack(queryKey: QueryKey, track: string): boolean {
  return queryKey[1] === track && CONTENT_QUERY_PREFIXES.has(String(queryKey[0]));
}

export async function invalidateTrackContentQueries(queryClient: QueryClient, track: string): Promise<void> {
  await queryClient.invalidateQueries({
    predicate: (query) => belongsToTrack(query.queryKey, track),
  });
  await queryClient.invalidateQueries({ queryKey: ['track-status', track] });
}

/** Keep live content screens in sync after a server content-version change. */
export function useContentVersionInvalidation(): void {
  const queryClient = useQueryClient();

  useEffect(() => subscribeToContentVersionChanges((track) => {
    void invalidateTrackContentQueries(queryClient, track);
  }), [queryClient]);
}
