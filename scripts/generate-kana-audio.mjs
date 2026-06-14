#!/usr/bin/env node
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const HIRAGANA = [
  ['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o'],
  ['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko'],
  ['さ', 'sa'], ['し', 'shi'], ['す', 'su'], ['せ', 'se'], ['そ', 'so'],
  ['た', 'ta'], ['ち', 'chi'], ['つ', 'tsu'], ['て', 'te'], ['と', 'to'],
  ['な', 'na'], ['に', 'ni'], ['ぬ', 'nu'], ['ね', 'ne'], ['の', 'no'],
  ['は', 'ha'], ['ひ', 'hi'], ['ふ', 'fu'], ['へ', 'he'], ['ほ', 'ho'],
  ['ま', 'ma'], ['み', 'mi'], ['む', 'mu'], ['め', 'me'], ['も', 'mo'],
  ['や', 'ya'], ['ゆ', 'yu'], ['よ', 'yo'],
  ['ら', 'ra'], ['り', 'ri'], ['る', 'ru'], ['れ', 're'], ['ろ', 'ro'],
  ['わ', 'wa'], ['を', 'wo'], ['ん', 'n'],
];

const KATAKANA = [
  ['ア', 'a'], ['イ', 'i'], ['ウ', 'u'], ['エ', 'e'], ['オ', 'o'],
  ['カ', 'ka'], ['キ', 'ki'], ['ク', 'ku'], ['ケ', 'ke'], ['コ', 'ko'],
  ['サ', 'sa'], ['シ', 'shi'], ['ス', 'su'], ['セ', 'se'], ['ソ', 'so'],
  ['タ', 'ta'], ['チ', 'chi'], ['ツ', 'tsu'], ['テ', 'te'], ['ト', 'to'],
  ['ナ', 'na'], ['ニ', 'ni'], ['ヌ', 'nu'], ['ネ', 'ne'], ['ノ', 'no'],
  ['ハ', 'ha'], ['ヒ', 'hi'], ['フ', 'fu'], ['ヘ', 'he'], ['ホ', 'ho'],
  ['マ', 'ma'], ['ミ', 'mi'], ['ム', 'mu'], ['メ', 'me'], ['モ', 'mo'],
  ['ヤ', 'ya'], ['ユ', 'yu'], ['ヨ', 'yo'],
  ['ラ', 'ra'], ['リ', 'ri'], ['ル', 'ru'], ['レ', 're'], ['ロ', 'ro'],
  ['ワ', 'wa'], ['ヲ', 'wo'], ['ン', 'n'],
];

const args = new Set(process.argv.slice(2));
const valueArg = (name, fallback) => {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
};

const voice = valueArg('--voice', 'Kyoko');
const rate = valueArg('--rate', '55');
const bucket = valueArg('--bucket', 'nihongo-n3-audio');
const outDir = valueArg('--out-dir', '.tmp-kana-audio');
const upload = args.has('--upload');
const force = args.has('--force');

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(' ')} failed with code ${result.status}`);
  }
}

function elongateKana(char, reading) {
  if (reading === 'n') return char.repeat(4);
  const vowel = [...reading].reverse().find((ch) => 'aiueo'.includes(ch));
  const hiragana = { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' };
  const katakana = { a: 'ア', i: 'イ', u: 'ウ', e: 'エ', o: 'オ' };
  const map = /[\u30a0-\u30ff]/u.test(char) ? katakana : hiragana;
  return `${char}${(map[vowel] ?? '').repeat(3)}`;
}

function kanaItems() {
  return [
    ...HIRAGANA.map(([char, reading]) => ({ mode: 'hiragana', char, reading })),
    ...KATAKANA.map(([char, reading]) => ({ mode: 'katakana', char, reading })),
  ];
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function main() {
  if (process.platform !== 'darwin') {
    throw new Error('This script uses macOS say. Run it on macOS or replace the generator command.');
  }

  const items = kanaItems();
  console.log(`[kana-audio] generating ${items.length} files voice=${voice} rate=${rate}`);

  for (const item of items) {
    const localPath = join(outDir, item.mode, `${item.reading}.m4a`);
    const key = `audio/kana/${item.mode}/${item.reading}.m4a`;
    ensureDir(dirname(localPath));

    if (!existsSync(localPath) || force) {
      run('say', ['-v', voice, '-r', rate, '-o', localPath, elongateKana(item.char, item.reading)]);
    }

    if (upload) {
      run('wrangler', [
        'r2', 'object', 'put',
        `${bucket}/${key}`,
        '--file', localPath,
        '--content-type', 'audio/mp4',
        '--cache-control', 'public, max-age=31536000, immutable',
        '--remote',
      ]);
    }
  }

  console.log(`[kana-audio] done. output=${outDir}${upload ? ` bucket=${bucket}` : ''}`);
}

main();
