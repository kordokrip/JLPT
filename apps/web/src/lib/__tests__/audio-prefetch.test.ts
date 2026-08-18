import { describe, expect, it, vi } from 'vitest';

import { prefetchAudioKeys, prefetchDueAudio } from '../audio-prefetch';

describe('deprecated R2 audio prefetch compatibility', () => {
  it('does not make network requests for legacy audio keys', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(prefetchAudioKeys(['audio/vocab/n2/example.mp3'])).resolves.toEqual({ total: 1, done: 1, failed: 0 });
    await expect(prefetchDueAudio()).resolves.toEqual({ total: 0, done: 0, failed: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
