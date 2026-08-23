#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const CONTRACT_FILES = {
  selector: 'apps/web/src/lib/google-browser-speech.ts',
  japanese: 'apps/web/src/lib/audio.ts',
  korean: 'apps/web/src/features/topik/useKoreanAudio.ts',
  shared: 'packages/shared/src/audio-policy.ts',
  legacyAudio: 'apps/api/src/routes/audio.ts',
};

export async function validateBrowserAudioContract(projectRoot = root) {
  const source = Object.fromEntries(await Promise.all(
    Object.entries(CONTRACT_FILES).map(async ([key, relative]) => [
      key,
      await readFile(path.join(projectRoot, relative), 'utf8'),
    ]),
  ));
  const errors = [];

  if (!/matching\.find\(\(voice\) => isGoogleVoiceForLanguage/.test(source.selector)
    || !/matching\.find\(\(voice\) => voice\.default\)/.test(source.selector)
    || !/\?\? matching\[0\]/.test(source.selector)) {
    errors.push('voice selector must prefer Google, then default and first same-language voices');
  }
  if (!/waitForBrowserVoice/.test(source.japanese) || !/waitForBrowserVoice/.test(source.korean)) {
    errors.push('JLPT and TOPIK must both use the same-language browser voice resolver');
  }
  if (!/if \(voice && !isVoiceForLanguage\(voice, language\)\)/.test(source.japanese)
    || !/if \(voice && !isVoiceForLanguage\(voice, 'ko-KR'\)\)/.test(source.korean)) {
    errors.push('enumerated voices must be rejected only when their language is wrong');
  }
  if (!/if \(voice\) utterance\.voice = voice/.test(source.japanese)
    || !/if \(voice\) utterance\.voice = voice/.test(source.korean)) {
    errors.push('empty voice lists must fall through to utterance.lang browser resolution');
  }
  if (!/utterance\.lang = language/.test(source.japanese)
    || !/utterance\.lang = 'ko-KR'/.test(source.korean)) {
    errors.push('utterance language must remain explicit for JLPT and TOPIK');
  }
  if (!/primary: 'browser-speech'/.test(source.shared)
    || !/preferGoogleVoice: true/.test(source.shared)) {
    errors.push('shared policy must keep Google-preferred browser speech');
  }
  if (!/status: 410/.test(source.legacyAudio)) {
    errors.push('legacy server audio route must remain 410 Gone');
  }

  const runtimeAudio = `${source.selector}\n${source.japanese}\n${source.korean}`;
  if (/\bfetch\s*\(\s*['"`]\/api\/v1\/audio\//.test(runtimeAudio)
    || /\bnew\s+Audio\s*\(/.test(runtimeAudio)
    || /audio_r2_key|r2:\/\//iu.test(runtimeAudio)) {
    errors.push('browser pronunciation runtime must not request server or R2 audio');
  }
  return errors;
}

async function main() {
  const errors = await validateBrowserAudioContract();
  console.log(`browser audio contract gate: ${errors.length === 0 ? 'passed' : 'failed'}`);
  for (const error of errors) console.error(`FAIL ${error}`);
  return errors.length === 0 ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
