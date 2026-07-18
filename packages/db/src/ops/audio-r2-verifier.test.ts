import assert from 'node:assert/strict';
import test from 'node:test';

import {
  encodeR2Key,
  expectedAudioObject,
  verifyR2Head,
} from './audio-r2-verifier.js';

test('builds a deterministic immutable Google audio key', () => {
  const first = expectedAudioObject({
    id: 7,
    item_type: 'vocab',
    level: 'N3',
    text: '予約',
    audio_r2_key: null,
  });
  const second = expectedAudioObject({
    id: 7,
    item_type: 'vocab',
    level: 'N3',
    text: '予約',
    audio_r2_key: null,
  });

  assert.equal(first.key, second.key);
  assert.match(first.key, /^audio\/vocab\/n3\/7-[0-9a-f]{16}\.mp3$/);
  assert.equal(first.contentHash.length, 64);
});

test('requires complete R2 metadata and immutable cache headers', () => {
  const expected = expectedAudioObject({
    id: 12,
    item_type: 'sentence',
    level: 'N5',
    text: '今日はいい天気ですね。',
    audio_r2_key: null,
  });
  const headers = new Headers({
    'Content-Type': 'audio/mpeg',
    'Cache-Control': 'public, max-age=2592000, immutable',
  });
  for (const [name, value] of Object.entries(expected.metadata)) {
    headers.set(`x-amz-meta-${name}`, value);
  }

  assert.deepEqual(verifyR2Head(headers, expected), []);
  headers.delete('x-amz-meta-contenthash');
  assert.deepEqual(verifyR2Head(headers, expected), ['metadata:contenthash']);
});

test('encodes each R2 key segment without hiding separators', () => {
  assert.equal(encodeR2Key('audio/vocab/n3/1-abc.mp3'), 'audio/vocab/n3/1-abc.mp3');
  assert.equal(encodeR2Key('audio/qa/空 白.wav'), 'audio/qa/%E7%A9%BA%20%E7%99%BD.wav');
});
