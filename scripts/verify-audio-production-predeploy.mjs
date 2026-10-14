#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { validateActualBrowserAudioEvidence } from './verify-actual-browser-audio-evidence.mjs';
import { validateBrowserAudioContract } from './verify-browser-audio-contract.mjs';

async function main(argv) {
  const inputIndex = argv.indexOf('--input');
  const inputPath = inputIndex >= 0 ? argv[inputIndex + 1] : undefined;
  if (!inputPath) {
    console.error('usage: pnpm release:verify:audio-predeploy -- --input <evidence.json>');
    return 2;
  }

  const contractErrors = await validateBrowserAudioContract();
  let evidence;
  try {
    evidence = JSON.parse(await readFile(inputPath, 'utf8'));
  } catch (error) {
    console.error(`audio predeploy evidence failed: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  const evidenceErrors = validateActualBrowserAudioEvidence(evidence);
  const errors = [...contractErrors, ...evidenceErrors];
  console.log(`audio production predeploy gate: ${errors.length === 0 ? 'passed' : 'failed'}`);
  for (const error of errors) console.error(`FAIL ${error}`);
  return errors.length === 0 ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
