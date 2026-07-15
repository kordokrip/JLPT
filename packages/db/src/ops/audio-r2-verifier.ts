import { createHash } from 'node:crypto';

export const GOOGLE_AUDIO_BATCH_PROFILE = {
  provider: 'google',
  model: 'ja-JP-Neural2-B',
  audioVersion: 'google-neural2-v1',
  extension: 'mp3',
} as const;

export type AudioItemType = 'vocab' | 'kanji' | 'sentence';

export interface AudioSourceRow {
  [key: string]: unknown;
  id: number;
  item_type: AudioItemType;
  level: string;
  text: string;
  audio_r2_key: string | null;
}

export interface ExpectedAudioObject {
  key: string;
  contentHash: string;
  metadata: Record<string, string>;
}

export function expectedAudioObject(row: AudioSourceRow): ExpectedAudioObject {
  const payload = [
    row.text.normalize('NFC'),
    GOOGLE_AUDIO_BATCH_PROFILE.provider,
    GOOGLE_AUDIO_BATCH_PROFILE.model,
    GOOGLE_AUDIO_BATCH_PROFILE.audioVersion,
  ].join('\n');
  const contentHash = createHash('sha256').update(payload, 'utf8').digest('hex');
  return {
    key: [
      'audio',
      row.item_type,
      row.level.toLowerCase(),
      `${row.id}-${contentHash.slice(0, 16)}.${GOOGLE_AUDIO_BATCH_PROFILE.extension}`,
    ].join('/'),
    contentHash,
    metadata: {
      provider: GOOGLE_AUDIO_BATCH_PROFILE.provider,
      model: GOOGLE_AUDIO_BATCH_PROFILE.model,
      audioversion: GOOGLE_AUDIO_BATCH_PROFILE.audioVersion,
      contenthash: contentHash,
      itemtype: row.item_type,
      itemid: String(row.id),
      level: row.level,
    },
  };
}

export function verifyR2Head(
  headers: Headers,
  expected: ExpectedAudioObject,
): string[] {
  const errors: string[] = [];
  for (const [name, value] of Object.entries(expected.metadata)) {
    if (headers.get(`x-amz-meta-${name}`) !== value) {
      errors.push(`metadata:${name}`);
    }
  }
  if (headers.get('content-type') !== 'audio/mpeg') {
    errors.push('content-type');
  }
  if (!/(?:^|,)\s*immutable(?:,|$)/i.test(headers.get('cache-control') ?? '')) {
    errors.push('cache-control:immutable');
  }
  return errors;
}

export function encodeR2Key(key: string): string {
  return key.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}
