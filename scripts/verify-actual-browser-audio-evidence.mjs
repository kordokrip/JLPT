#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const PLAYED_COUNTS = ['korean_played', 'japanese_played'];
const VOICE_COUNTS = ['korean_voice_count', 'japanese_voice_count'];
const RESOLUTIONS = new Set(['enumerated-voice', 'utterance-lang']);

export function validateActualBrowserAudioEvidence(evidence) {
  const errors = [];
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    return ['evidence must be an object'];
  }
  if (evidence.artifact_schema_version !== 1) {
    errors.push('artifact_schema_version must be 1');
  }
  if (evidence.browser_family !== 'chrome') errors.push('browser_family must be chrome');
  if (evidence.mocked !== false) errors.push('mocked must be false');
  if (evidence.speech_synthesis !== true) errors.push('speech_synthesis must be true');
  if (evidence.google_voice_preferred !== true) errors.push('google_voice_preferred must be true');
  if (evidence.same_language_fallback_allowed !== true) {
    errors.push('same_language_fallback_allowed must be true');
  }
  if (evidence.same_language_voice_enforced !== true) {
    errors.push('same_language_voice_enforced must be true');
  }
  for (const field of VOICE_COUNTS) {
    if (!Number.isInteger(evidence[field]) || evidence[field] < 0) {
      errors.push(`${field} must be an integer >= 0`);
    }
  }
  for (const field of PLAYED_COUNTS) {
    if (!Number.isInteger(evidence[field]) || evidence[field] < 1) {
      errors.push(`${field} must be an integer >= 1`);
    }
  }
  for (const language of ['korean', 'japanese']) {
    const resolution = evidence[`${language}_resolution`];
    if (!RESOLUTIONS.has(resolution)) {
      errors.push(`${language}_resolution must be enumerated-voice or utterance-lang`);
    }
    if (resolution === 'enumerated-voice' && evidence[`${language}_voice_count`] < 1) {
      errors.push(`${language}_voice_count must be >= 1 for enumerated-voice resolution`);
    }
  }
  if (evidence.human_audible_confirmation !== true) {
    errors.push('human_audible_confirmation must be true');
  }
  for (const field of ['confirmed_by', 'observed_at', 'target_url', 'deployment_id']) {
    if (typeof evidence[field] !== 'string' || evidence[field].trim() === '') {
      errors.push(`${field} must be a non-empty string`);
    }
  }
  if (typeof evidence.observed_at === 'string' && Number.isNaN(Date.parse(evidence.observed_at))) {
    errors.push('observed_at must be an ISO-8601 timestamp');
  }
  if (typeof evidence.target_url === 'string' && !evidence.target_url.startsWith('https://')) {
    errors.push('target_url must use https');
  }
  if (typeof evidence.release_sha !== 'string' || !/^[0-9a-f]{40}$/.test(evidence.release_sha)) {
    errors.push('release_sha must be a lowercase 40-character Git SHA');
  }
  if (evidence.r2_fallback_allowed !== false) errors.push('r2_fallback_allowed must be false');
  if (evidence.r2_pronunciation_request_count !== 0) {
    errors.push('r2_pronunciation_request_count must be 0');
  }
  if (evidence.legacy_audio_request_count !== 0) {
    errors.push('legacy_audio_request_count must be 0');
  }
  if (evidence.callback_provenance !== 'real-page-onend') {
    errors.push('callback_provenance must be real-page-onend');
  }
  return errors;
}

async function main(argv) {
  const inputIndex = argv.indexOf('--input');
  const inputPath = inputIndex >= 0 ? argv[inputIndex + 1] : undefined;
  if (!inputPath) {
    console.error('usage: pnpm release:verify:actual-audio -- --input <evidence.json>');
    return 2;
  }
  let evidence;
  try {
    evidence = JSON.parse(await readFile(inputPath, 'utf8'));
  } catch (error) {
    console.error(`actual browser audio evidence failed: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  const errors = validateActualBrowserAudioEvidence(evidence);
  console.log(`actual browser audio gate: ${errors.length === 0 ? 'passed' : 'failed'}`);
  for (const error of errors) console.error(`FAIL ${error}`);
  return errors.length === 0 ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
