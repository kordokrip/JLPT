import { contentApi } from './api';
import { db, getActiveLearningTrack } from './db';
import type { ContentVersionDto } from '@nihongo-n3/shared';

export const CONTENT_VERSION_META_KEY = 'content.version';

let inFlight: Promise<string | null> | null = null;
const subscribers = new Set<(track: string, version: string) => void>();

export function contentVersionMetaKey(track: string): string {
  return `${CONTENT_VERSION_META_KEY}:${track}`;
}

export function subscribeToContentVersionChanges(
  subscriber: (track: string, version: string) => void,
): () => void {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

function notifyContentVersionChanged(track: string, version: string) {
  for (const subscriber of subscribers) subscriber(track, version);
}

export async function ensureContentFresh(): Promise<string | null> {
  if (inFlight) return inFlight;
  inFlight = refreshContentVersion().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function refreshContentVersion(): Promise<string | null> {
  const track = getActiveLearningTrack();
  if (track !== 'jlpt-ja') return null;
  const remote = await contentApi.version();
  if (!remote.ok) return null;

  const metaKey = contentVersionMetaKey(track);
  const current = await db.meta.get(metaKey);
  if (current?.value === remote.data.version) return remote.data.version;

  await clearMirroredContent(remote.data, metaKey);
  notifyContentVersionChanged(track, remote.data.version);
  return remote.data.version;
}

async function clearMirroredContent(version: ContentVersionDto, metaKey: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.vocab, db.grammar, db.kanji, db.sentences, db.sysprog, db.curriculum, db.meta],
    async () => {
      await Promise.all([
        db.vocab.clear(),
        db.grammar.clear(),
        db.kanji.clear(),
        db.sentences.clear(),
        db.sysprog.clear(),
        db.curriculum.clear(),
      ]);
      await db.meta.put({
        key: metaKey,
        value: version.version,
        updated_at: new Date().toISOString(),
      });
    },
  );
}
