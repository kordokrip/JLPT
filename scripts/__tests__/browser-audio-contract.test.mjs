import assert from 'node:assert/strict';
import test from 'node:test';

import { validateBrowserAudioContract } from '../verify-browser-audio-contract.mjs';

test('blocks removal of same-language fallback and reintroduction of server/R2 audio', async () => {
  assert.deepEqual(await validateBrowserAudioContract(), []);
});
