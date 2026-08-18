/**
 * Deprecated compatibility surface for pre-Google-only callers.
 * Browser speech has no R2 object to cache, so these functions never fetch or
 * inspect legacy audio keys.
 */

export interface PrefetchProgress {
  total: number;
  done: number;
  failed: number;
}

export type ProgressCallback = (progress: PrefetchProgress) => void;

export async function prefetchAudioKeys(
  keys: string[],
  onProgress?: ProgressCallback,
): Promise<PrefetchProgress> {
  const progress = { total: keys.length, done: keys.length, failed: 0 };
  onProgress?.(progress);
  return progress;
}

export async function prefetchDueAudio(onProgress?: ProgressCallback): Promise<PrefetchProgress> {
  const progress = { total: 0, done: 0, failed: 0 };
  onProgress?.(progress);
  return progress;
}
