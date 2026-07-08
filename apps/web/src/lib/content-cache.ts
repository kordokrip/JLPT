import { contentApi } from './api';
import { db } from './db';
import type { ContentVersionDto } from '@nihongo-n3/shared';

export const CONTENT_VERSION_META_KEY = 'content.version';

let inFlight: Promise<string | null> | null = null;

export async function ensureContentFresh(): Promise<string | null> {
  if (inFlight) return inFlight;
  inFlight = refreshContentVersion().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function refreshContentVersion(): Promise<string | null> {
  const remote = await contentApi.version();
  if (!remote.ok) return null;

  const current = await db.meta.get(CONTENT_VERSION_META_KEY);
  if (current?.value === remote.data.version) return remote.data.version;

  await clearMirroredContent(remote.data);
  return remote.data.version;
}

async function clearMirroredContent(version: ContentVersionDto): Promise<void> {
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
        key: CONTENT_VERSION_META_KEY,
        value: version.version,
        updated_at: new Date().toISOString(),
      });
    },
  );
}
