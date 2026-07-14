#!/usr/bin/env node
import { existsSync, mkdirSync, statSync } from 'node:fs';
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

const HIRAGANA_EXAMPLES = {
  a: 'あいさつ', i: 'いぬ', u: 'うみ', e: 'えき', o: 'おちゃ',
  ka: 'かさ', ki: 'きく', ku: 'くも', ke: 'けさ', ko: 'こえ',
  sa: 'さくら', shi: 'しお', su: 'すし', se: 'せんせい', so: 'そら',
  ta: 'たこ', chi: 'ちず', tsu: 'つき', te: 'て', to: 'とり',
  na: 'なつ', ni: 'にほん', nu: 'ぬの', ne: 'ねこ', no: 'のり',
  ha: 'はな', hi: 'ひと', fu: 'ふね', he: 'へや', ho: 'ほし',
  ma: 'まち', mi: 'みみ', mu: 'むし', me: 'め', mo: 'もり',
  ya: 'やま', yu: 'ゆき', yo: 'よる',
  ra: 'らいねん', ri: 'りんご', ru: 'るす', re: 'れい', ro: 'ろく',
  wa: 'わたし', wo: 'ほんをよむ', n: 'パン',
};

const KATAKANA_EXAMPLES = {
  a: 'アイス', i: 'インク', u: 'ウイスキー', e: 'エアコン', o: 'オレンジ',
  ka: 'カメラ', ki: 'キロ', ku: 'クラス', ke: 'ケーキ', ko: 'コーヒー',
  sa: 'サラダ', shi: 'シャツ', su: 'スキー', se: 'セーター', so: 'ソファ',
  ta: 'タクシー', chi: 'チーズ', tsu: 'ツアー', te: 'テレビ', to: 'トマト',
  na: 'ナイフ', ni: 'ニュース', nu: 'ヌードル', ne: 'ネクタイ', no: 'ノート',
  ha: 'ハンバーガー', hi: 'ヒーター', fu: 'フォーク', he: 'ヘルメット', ho: 'ホテル',
  ma: 'マスク', mi: 'ミルク', mu: 'ムービー', me: 'メール', mo: 'モデル',
  ya: 'ヤード', yu: 'ユニフォーム', yo: 'ヨガ',
  ra: 'ラジオ', ri: 'リモコン', ru: 'ルール', re: 'レストラン', ro: 'ロボット',
  wa: 'ワイン', wo: 'ヲタク', n: 'パン',
};

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
const minBytes = Number(valueArg('--min-bytes', '4000'));

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(' ')} failed with code ${result.status}`);
  }
}

function pronunciationPrompt(item) {
  const examples = item.mode === 'hiragana' ? HIRAGANA_EXAMPLES : KATAKANA_EXAMPLES;
  const example = examples[item.reading];
  if (!example) throw new Error(`Missing pronunciation example: ${item.mode}/${item.reading}`);
  return `${item.char}。${example}`;
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
    const localPath = join(outDir, 'v2', item.mode, `${item.reading}.m4a`);
    const key = `audio/kana/v2/${item.mode}/${item.reading}.m4a`;
    ensureDir(dirname(localPath));

    if (!existsSync(localPath) || force) {
      run('say', ['-v', voice, '-r', rate, '-o', localPath, pronunciationPrompt(item)]);
    }

    const size = statSync(localPath).size;
    if (size < minBytes) {
      throw new Error(`${localPath} is too small (${size} bytes). Refusing to upload likely empty audio.`);
    }

    if (upload) {
      run('pnpm', [
        'exec',
        'wrangler',
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
