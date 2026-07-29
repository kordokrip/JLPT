/** A small, self-authored local TOPIK 1 fixture for the new 1–6 curriculum contract. */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from './constants.js';
import { esc } from './utils.js';

export const TOPIK_GRADE1_LOCAL_FIXTURE_SOURCE_CODE = 'TOPIK-GRADE1-LOCAL-2026-07-29';
export const TOPIK_GRADE1_LOCAL_FIXTURE_SOURCE_ASSET_ID = 'source-asset:topik-grade1-local-2026-07-29';
export const TOPIK_GRADE1_LOCAL_FIXTURE_PATH = path.join(REPO_ROOT, 'docs/07_topik/01_owner_authored_grade1_local_fixture.md');
const FIXTURE_LICENSE_ID = 'LicenseRef-nihongo-n3-self-authored';
const FIXTURE_REPOSITORY_URL = 'https://github.com/kordokrip/JLPT/blob/main/docs/07_topik/01_owner_authored_grade1_local_fixture.md';
const FIXTURE_LICENSE_URL = 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#학습-콘텐츠와-provenance';
const UNIT_ID = 'topik-owner-grade1-unit-greetings-v1';
const VOCAB_ITEM_ID = 'topik-owner-grade1-vocab-annyeonghaseyo-v1';
const LISTENING_ITEM_ID = 'topik-owner-grade1-listening-introduction-v1';

export interface TopikGrade1LocalFixtureManifest {
  sourceCode: string;
  sourceAssetId: string;
  sourcePath: string;
  sourceSha256: string;
  unitId: string;
  itemIds: string[];
  counts: { units: number; items: number; stableRefs: number; audioBindings: number };
}

export interface TopikGrade1LocalFixturePlan {
  statements: string[];
  manifest: TopikGrade1LocalFixtureManifest;
}

function sha256(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableRef(stableRef: string, itemId: string): string {
  return [
    'INSERT OR IGNORE INTO `learning_content_stable_refs`',
    '  (`stable_ref`, `learning_track`, `item_type`, `item_id`, `level_tag`, `source_asset_id`)',
    `VALUES (${esc(stableRef)}, 'topik-ko', 'topik-owner-item', ${esc(itemId)}, 'TOPIK-1', ${esc(TOPIK_GRADE1_LOCAL_FIXTURE_SOURCE_ASSET_ID)});`,
  ].join('\n');
}

function preparingBinding(id: string, stableRefValue: string, itemId: string, role: 'pronunciation' | 'listening'): string {
  return [
    'INSERT OR IGNORE INTO `content_audio_bindings`',
    '  (`id`, `stable_ref`, `item_type`, `item_id`, `language`, `audio_role`, `binding_state`, `asset_id`, `unavailable_reason`)',
    `VALUES (${esc(id)}, ${esc(stableRefValue)}, 'topik-owner-item', ${esc(itemId)}, 'ko', ${esc(role)},`,
    "  'preparing', NULL, 'No licensed Korean recording or validated TTS pilot has been attached to this self-authored local fixture.');",
  ].join('\n');
}

export function buildTopikGrade1LocalFixturePlan(): TopikGrade1LocalFixturePlan {
  const sourceSha256 = sha256(fs.readFileSync(TOPIK_GRADE1_LOCAL_FIXTURE_PATH));
  const vocabStableRef = 'topik:grade1:vocab:annyeonghaseyo';
  const listeningStableRef = 'topik:grade1:listening:introduction';
  const statements = [
    [
      'INSERT INTO `sources` (`code`, `title`, `file_path`, `version`)',
      `VALUES (${esc(TOPIK_GRADE1_LOCAL_FIXTURE_SOURCE_CODE)}, 'TOPIK 1급 자체 저작 로컬 fixture', 'docs/07_topik/01_owner_authored_grade1_local_fixture.md', 'topik-grade1-local-fixture-v1')`,
      'ON CONFLICT(`code`) DO UPDATE SET',
      '  `title` = excluded.`title`, `file_path` = excluded.`file_path`,',
      '  `version` = excluded.`version`, `updated_at` = unixepoch();',
    ].join('\n'),
    [
      'INSERT OR IGNORE INTO `content_source_assets`',
      '  (`id`, `asset_kind`, `source_url`, `license_id`, `license_url`, `attribution_text`, `allowed_use`, `source_sha256`, `generated_at`, `selection_reason`)',
      `VALUES (${esc(TOPIK_GRADE1_LOCAL_FIXTURE_SOURCE_ASSET_ID)}, 'self-authored-fixture', ${esc(FIXTURE_REPOSITORY_URL)},`,
      `  ${esc(FIXTURE_LICENSE_ID)}, ${esc(FIXTURE_LICENSE_URL)},`,
      "  '© Nihongo N3 contributors; self-authored local TOPIK fixture.',",
      "  'Local schema, API, PWA and audio-policy test only; not official TOPIK material or a public release.',",
      `  ${esc(sourceSha256)}, 1785283200, 'Fixture provenance for the TOPIK grade 1 curriculum connection.');`,
    ].join('\n'),
    [
      'INSERT OR IGNORE INTO `topik_owner_authored_curriculum_units`',
      '  (`id`, `target_grade`, `stable_ref`, `section`, `title_ko`, `title_ja`, `title_en`, `source_asset_id`)',
      `VALUES (${esc(UNIT_ID)}, 1, 'topik:grade1:unit:greetings', 'vocab',`,
      `  '인사와 자기소개', 'あいさつと自己紹介', 'Greetings and introductions', ${esc(TOPIK_GRADE1_LOCAL_FIXTURE_SOURCE_ASSET_ID)});`,
    ].join('\n'),
    [
      'INSERT OR IGNORE INTO `topik_owner_authored_curriculum_items`',
      '  (`id`, `unit_id`, `target_grade`, `stable_ref`, `item_type`, `prompt_ko`, `prompt_ja`, `prompt_en`, `answer_json`, `explanation_ko`, `explanation_ja`, `explanation_en`, `audio_required`, `source_asset_id`)',
      `VALUES (${esc(VOCAB_ITEM_ID)}, ${esc(UNIT_ID)}, 1, ${esc(vocabStableRef)}, 'vocab',`,
      `  '안녕하세요와 가장 알맞게 연결되는 뜻은 무엇입니까?', '「안녕하세요」と最も合う意味は何ですか。', 'Which meaning best matches 안녕하세요?',`,
      `  ${esc(JSON.stringify({ choices: ['처음 만날 때의 인사', '식당 주문', '날짜 묻기', '길 안내'], answer_index: 0 }))},`,
      `  '안녕하세요는 처음 만나거나 정중하게 인사할 때 쓸 수 있습니다.', '「안녕하세요」は初対面や丁寧にあいさつするときに使えます。', '안녕하세요 can be used when first meeting someone or greeting politely.', 1, ${esc(TOPIK_GRADE1_LOCAL_FIXTURE_SOURCE_ASSET_ID)});`,
    ].join('\n'),
    [
      'INSERT OR IGNORE INTO `topik_owner_authored_curriculum_items`',
      '  (`id`, `unit_id`, `target_grade`, `stable_ref`, `item_type`, `prompt_ko`, `prompt_ja`, `prompt_en`, `answer_json`, `explanation_ko`, `explanation_ja`, `explanation_en`, `audio_required`, `source_asset_id`)',
      `VALUES (${esc(LISTENING_ITEM_ID)}, ${esc(UNIT_ID)}, 1, ${esc(listeningStableRef)}, 'listening',`,
      `  '말하는 사람은 무엇을 하고 있습니까?', '話している人は何をしていますか。', 'What is the speaker doing?',`,
      `  ${esc(JSON.stringify({ choices: ['자기소개', '약속 취소', '물건 구매', '길 묻기'], answer_index: 0 }))},`,
      `  '대본에서 이름을 말하고 처음 뵙겠다고 하므로 자기소개입니다.', '名前を言って「初めてお目にかかります」と話しているため、自己紹介です。', 'The speaker states a name and says nice to meet you, so this is an introduction.', 1, ${esc(TOPIK_GRADE1_LOCAL_FIXTURE_SOURCE_ASSET_ID)});`,
    ].join('\n'),
    stableRef(vocabStableRef, VOCAB_ITEM_ID),
    stableRef(listeningStableRef, LISTENING_ITEM_ID),
    preparingBinding('audio-binding:topik:grade1:vocab:annyeonghaseyo', vocabStableRef, VOCAB_ITEM_ID, 'pronunciation'),
    preparingBinding('audio-binding:topik:grade1:listening:introduction', listeningStableRef, LISTENING_ITEM_ID, 'listening'),
  ];
  return {
    statements,
    manifest: {
      sourceCode: TOPIK_GRADE1_LOCAL_FIXTURE_SOURCE_CODE,
      sourceAssetId: TOPIK_GRADE1_LOCAL_FIXTURE_SOURCE_ASSET_ID,
      sourcePath: path.relative(REPO_ROOT, TOPIK_GRADE1_LOCAL_FIXTURE_PATH).split(path.sep).join('/'),
      sourceSha256,
      unitId: UNIT_ID,
      itemIds: [VOCAB_ITEM_ID, LISTENING_ITEM_ID],
      counts: { units: 1, items: 2, stableRefs: 2, audioBindings: 2 },
    },
  };
}
