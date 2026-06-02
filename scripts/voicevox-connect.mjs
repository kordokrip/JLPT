#!/usr/bin/env node
/**
 * Validate and connect a production VOICEVOX Engine URL.
 *
 * Usage:
 *   node scripts/voicevox-connect.mjs --url https://voicevox.example.com
 *   node scripts/voicevox-connect.mjs --url https://voicevox.example.com --apply --warmup
 *
 * The script probes /version, /speakers, and a real /audio_query + /synthesis
 * request before it can write Cloudflare Worker secrets.
 */
import { spawnSync } from 'node:child_process';

const API_BASE = 'https://nihongo-n3-api.kordokrip.workers.dev';
const SAMPLE_TEXT = '日本語の発音は、アクセントの位置によって意味が変わることがあります。';

const args = parseArgs(process.argv.slice(2));
const url = args.url || process.env.VOICEVOX_URL || process.env.VOICEVOX_URL_SECRET || '';
const speaker = Number(args.speaker ?? process.env.VOICEVOX_SPEAKER ?? '3');

if (!url) {
  fail('VOICEVOX URL이 없습니다. --url https://... 또는 VOICEVOX_URL 환경변수를 지정하십시오.');
}
if (!Number.isInteger(speaker) || speaker < 0) {
  fail(`speaker 값이 올바르지 않습니다: ${String(args.speaker)}`);
}

const baseUrl = normalizeBaseUrl(url);
console.log(`[voicevox] probe: ${baseUrl} speaker=${speaker}`);
const probe = await probeVoicevox(baseUrl, speaker);
console.log(JSON.stringify(probe, null, 2));

if (!args.apply) {
  console.log('\n[voicevox] 검증만 완료했습니다. Cloudflare에 반영하려면 --apply 를 추가하십시오.');
  process.exit(0);
}

run('corepack', [
  'pnpm',
  '--filter',
  '@nihongo-n3/api',
  'exec',
  'wrangler',
  'secret',
  'put',
  'VOICEVOX_URL_SECRET',
  '--env=',
], { input: `${baseUrl}\n` });

run('corepack', ['pnpm', '--filter', '@nihongo-n3/api', 'run', 'deploy']);

const providers = await fetchJson(`${API_BASE}/admin/audio/providers`);
console.log('\n[voicevox] deployed provider status');
console.log(JSON.stringify(providers.data.providers.voicevox, null, 2));
if (providers.data.providers.voicevox.ok !== true) {
  fail('배포 후 /admin/audio/providers 에서 VOICEVOX ok:true 확인에 실패했습니다.');
}

if (args.warmup) {
  const warmup = await fetchJson(`${API_BASE}/admin/audio/qa/warmup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'voicevox', force: true }),
  });
  console.log('\n[voicevox] QA warmup summary');
  console.log(JSON.stringify(warmup.data.summary, null, 2));
  const voicevoxSummary = warmup.data.summary.find((row) => row.provider === 'voicevox');
  if (!voicevoxSummary || voicevoxSummary.failed > 0 || voicevoxSummary.generated + voicevoxSummary.cached !== 30) {
    fail('VOICEVOX 30개 QA warmup 검증에 실패했습니다.');
  }
}

console.log('\n[voicevox] 연결 검증 완료');

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i++) {
    const value = argv[i];
    if (value === '--apply') parsed.apply = true;
    else if (value === '--warmup') parsed.warmup = true;
    else if (value === '--url') parsed.url = argv[++i];
    else if (value === '--speaker') parsed.speaker = argv[++i];
    else fail(`알 수 없는 옵션입니다: ${value}`);
  }
  return parsed;
}

function normalizeBaseUrl(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:') {
    fail('운영 VOICEVOX_URL은 반드시 https:// URL이어야 합니다.');
  }
  return parsed.toString().replace(/\/+$/, '');
}

async function probeVoicevox(baseUrl, speakerId) {
  const versionRes = await fetch(`${baseUrl}/version`);
  assertOk(versionRes, '/version');
  const version = await versionRes.text();

  const speakersRes = await fetch(`${baseUrl}/speakers`);
  assertOk(speakersRes, '/speakers');
  const speakers = await speakersRes.json();
  if (!Array.isArray(speakers) || speakers.length === 0) {
    fail('/speakers 응답이 비어 있습니다.');
  }

  const queryUrl = new URL(`${baseUrl}/audio_query`);
  queryUrl.searchParams.set('text', SAMPLE_TEXT);
  queryUrl.searchParams.set('speaker', String(speakerId));
  const queryRes = await fetch(queryUrl, { method: 'POST' });
  assertOk(queryRes, '/audio_query');
  const query = await queryRes.json();
  query.speedScale = 0.94;
  query.pitchScale = 0;
  query.intonationScale = 1.12;
  query.outputSamplingRate = 44100;
  query.outputStereo = false;

  const synthesisUrl = new URL(`${baseUrl}/synthesis`);
  synthesisUrl.searchParams.set('speaker', String(speakerId));
  synthesisUrl.searchParams.set('enable_interrogative_upspeak', 'true');
  const synthesisRes = await fetch(synthesisUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(query),
  });
  assertOk(synthesisRes, '/synthesis');

  const audio = new Uint8Array(await synthesisRes.arrayBuffer());
  const riff = String.fromCharCode(...audio.slice(0, 4));
  const wave = String.fromCharCode(...audio.slice(8, 12));
  if (riff !== 'RIFF' || wave !== 'WAVE') {
    fail(`/synthesis 결과가 WAV가 아닙니다. bytes=${audio.byteLength}`);
  }

  return {
    ok: true,
    version,
    speakerCount: speakers.length,
    synthesisBytes: audio.byteLength,
    contentType: synthesisRes.headers.get('content-type'),
  };
}

function assertOk(res, label) {
  if (!res.ok) fail(`${label} 실패: HTTP ${res.status}`);
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const body = await res.text();
  if (!res.ok) fail(`${url} 실패: HTTP ${res.status}\n${body}`);
  return JSON.parse(body);
}

function run(command, argv, options = {}) {
  const res = spawnSync(command, argv, {
    cwd: process.cwd(),
    stdio: options.input ? ['pipe', 'inherit', 'inherit'] : 'inherit',
    input: options.input,
    env: { ...process.env, PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH ?? ''}` },
  });
  if (res.status !== 0) fail(`${command} ${argv.join(' ')} 실패`);
}

function fail(message) {
  console.error(`[voicevox] ${message}`);
  process.exit(1);
}
