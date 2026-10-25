import assert from 'node:assert/strict';
import test from 'node:test';

import { validateActualBrowserAudioEvidence } from '../verify-actual-browser-audio-evidence.mjs';

const validEvidence = {
  artifact_schema_version: 1,
  browser_family: 'chrome',
  mocked: false,
  speech_synthesis: true,
  google_voice_preferred: true,
  same_language_fallback_allowed: true,
  same_language_voice_enforced: true,
  korean_voice_count: 1,
  japanese_voice_count: 1,
  korean_resolution: 'enumerated-voice',
  japanese_resolution: 'enumerated-voice',
  korean_played: 1,
  japanese_played: 1,
  human_audible_confirmation: true,
  confirmed_by: 'user',
  observed_at: '2026-08-23T12:00:00+09:00',
  target_url: 'https://preview.example.test/audio-qa',
  release_sha: '0123456789abcdef0123456789abcdef01234567',
  deployment_id: 'preview-2026-08-23-001',
  r2_fallback_allowed: false,
  r2_pronunciation_request_count: 0,
  legacy_audio_request_count: 0,
  callback_provenance: 'real-page-onend',
};

test('accepts non-mocked Korean and Japanese playback with audible confirmation', () => {
  assert.deepEqual(validateActualBrowserAudioEvidence(validEvidence), []);
});

test('accepts real onend playback through utterance.lang when voices are not enumerable', () => {
  assert.deepEqual(validateActualBrowserAudioEvidence({
    ...validEvidence,
    korean_voice_count: 0,
    japanese_voice_count: 0,
    korean_resolution: 'utterance-lang',
    japanese_resolution: 'utterance-lang',
  }), []);
});

test('rejects mocked browser speech even when callbacks report played', () => {
  const errors = validateActualBrowserAudioEvidence({ ...validEvidence, mocked: true });
  assert.match(errors.join('\n'), /mocked must be false/);
});

test('rejects zero playback and missing audible confirmation', () => {
  const errors = validateActualBrowserAudioEvidence({
    ...validEvidence,
    korean_played: 0,
    japanese_played: 0,
    human_audible_confirmation: false,
  });
  assert.match(errors.join('\n'), /korean_played/);
  assert.match(errors.join('\n'), /japanese_played/);
  assert.match(errors.join('\n'), /human_audible_confirmation/);
});

test('rejects server/R2 requests and synthetic callbacks', () => {
  const errors = validateActualBrowserAudioEvidence({
    ...validEvidence,
    r2_pronunciation_request_count: 1,
    legacy_audio_request_count: 1,
    callback_provenance: 'mock-onend',
  });
  assert.match(errors.join('\n'), /r2_pronunciation_request_count/);
  assert.match(errors.join('\n'), /legacy_audio_request_count/);
  assert.match(errors.join('\n'), /callback_provenance/);
});

test('rejects evidence that is not bound to an immutable release and deployment', () => {
  const errors = validateActualBrowserAudioEvidence({
    ...validEvidence,
    release_sha: 'moving-branch',
    deployment_id: '',
  });
  assert.match(errors.join('\n'), /release_sha/);
  assert.match(errors.join('\n'), /deployment_id/);
});
