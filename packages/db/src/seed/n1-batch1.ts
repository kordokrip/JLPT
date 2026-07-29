import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from './constants.js';
import { parseGrammar } from './parse-grammar.js';
import { parseKanji } from './parse-kanji.js';
import { parseVocab } from './parse-vocab.js';
import { esc, escJson } from './utils.js';

/** First operating, self-authored N1 curriculum. Never contains official JLPT material. */
export const N1_BATCH_1_SOURCE_CODE = 'N1-A1';
export const N1_BATCH_1_SOURCE_ASSET_ID = 'source-asset:jlpt-n1-self-authored-batch-1-2026-07-30';
export const N1_BATCH_1_PATH = path.join(REPO_ROOT, 'docs/06_n1/01_self_authored_batch_1.md');
export const N1_BATCH_1_REPOSITORY_URL = 'https://github.com/kordokrip/JLPT/blob/main/docs/06_n1/01_self_authored_batch_1.md';
export const N1_BATCH_1_LICENSE_URL = 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#학습-콘텐츠와-provenance';
export const N1_BATCH_1_KANJI = ['曖', '昧', '遵', '拙', '顧', '慮', '緻', '密', '漠', '顕', '遂', '賜'] as const;

const AUDIO_PREPARING_REASON = 'Browser Google Japanese speech is available for this personal-learning item; no immutable R2 recording has been connected yet.';

interface SentenceSeed { seqNo: number; ja: string; kana?: string; ko: string; }
interface ReadingQuestion { questionJa: string; questionKo: string; choices: readonly string[]; answerIndex: number; explanationKo: string; }
interface ReadingSeed { titleJa: string; genre: string; bodyJa: string; bodyKo: string; wordCount: number; questions: readonly ReadingQuestion[]; }

const SENTENCES: readonly SentenceSeed[] = [
  { seqNo: 1, ja: '結論だけでなく、その論拠と脈絡を順に確認する。', kana: 'けつろんだけでなく、そのろんきょとみゃくらくをじゅんにかくにんする。', ko: '결론뿐 아니라 그 논거와 맥락을 차례로 확인한다.' },
  { seqNo: 2, ja: '数字の変化が顕著でも、原因が一つとは限らない。', kana: 'すうじのへんかがけんちょでも、げんいんがひとつとはかぎらない。', ko: '수치 변화가 현저해도 원인이 하나라고 할 수는 없다.' },
  { seqNo: 3, ja: '暗黙の了解に頼らず、役割を文書で共有した。', ko: '암묵적인 이해에 의지하지 않고 역할을 문서로 공유했다.' },
  { seqNo: 4, ja: '提案の妥当性は、利用者の見解も含めて検証する。', ko: '제안의 타당성은 이용자의 견해도 포함해 검증한다.' },
  { seqNo: 5, ja: '複数の部署が介在すると、合意までに時間がかかる。', ko: '여러 부서가 개입하면 합의까지 시간이 걸린다.' },
  { seqNo: 6, ja: '過度な規制は挑戦を抑制する一方で、安全を促進する面もある。', ko: '과도한 규제는 도전을 억제하는 한편 안전을 촉진하는 면도 있다.' },
  { seqNo: 7, ja: '現場の実感と報告書の内容に乖離がないか調べた。', ko: '현장의 실감과 보고서 내용에 괴리가 없는지 조사했다.' },
  { seqNo: 8, ja: '小さな誤りでも早期に是正すれば、大きな懸念を防げる。', ko: '작은 오류라도 조기에 시정하면 큰 우려를 막을 수 있다.' },
  { seqNo: 9, ja: '需給の均衡が崩れると、価格だけでなく雇用にも影響する。', ko: '수요와 공급의 균형이 무너지면 가격뿐 아니라 고용에도 영향을 준다.' },
  { seqNo: 10, ja: '採算だけを基準にせず、地域への影響も顧慮した。', ko: '채산만을 기준으로 하지 않고 지역에 대한 영향도 고려했다.' },
  { seqNo: 11, ja: '制度の緩和を皮切りに、関連する手続きも再編された。', ko: '제도 완화를 시작으로 관련 절차도 재편되었다.' },
  { seqNo: 12, ja: '資金が逼迫したため、計画の規模を縮小せざるを得なかった。', ko: '자금이 빠듯해 계획 규모를 축소하지 않을 수 없었다.' },
  { seqNo: 13, ja: '過去の方法を踏襲するだけでは、新しい課題を打開できない。', ko: '과거 방식을 답습하기만 해서는 새로운 과제를 타개할 수 없다.' },
  { seqNo: 14, ja: '検証を重ねた結果、変化の推移と帰結が見えてきた。', ko: '검증을 거듭한 결과 변화의 추이와 귀결이 보이기 시작했다.' },
  { seqNo: 15, ja: '対立を緩衝するため、双方が納得できる基準を探った。', ko: '대립을 완충하기 위해 양쪽이 납득할 수 있는 기준을 찾았다.' },
  { seqNo: 16, ja: '厳密な記録がなければ、問題が顕在化した時に対応できない。', ko: '엄밀한 기록이 없으면 문제가 표면화했을 때 대응할 수 없다.' },
  { seqNo: 17, ja: '一貫した説明は、漠然とした不安を小さくする。', ko: '일관된 설명은 막연한 불안을 작게 만든다.' },
  { seqNo: 18, ja: '担当者は例外的な事情を除き、決めた手順を最後まで遂行した。', ko: '담당자는 예외적인 사정을 제외하고 정한 절차를 끝까지 수행했다.' },
];

const READINGS: readonly ReadingSeed[] = [
  {
    titleJa: '意見募集の設計', genre: 'report',
    bodyJa: '市では、新しい公共施設の利用方法について意見を集めることにした。以前の募集では、質問が抽象的で、回答の脈絡を比べにくいという課題があった。今回は、利用する時間帯、必要な設備、心配している点を分けて尋ねる。すべての意見をそのまま採用するわけではないが、どの見解が多いかを顕著にし、計画の論拠として公開する予定である。',
    bodyKo: '시는 새 공공시설의 이용 방식에 관해 의견을 모으기로 했다. 이전 모집에서는 질문이 추상적이어서 답변의 맥락을 비교하기 어렵다는 과제가 있었다. 이번에는 이용 시간대, 필요한 설비, 걱정하는 점을 나누어 묻는다. 모든 의견을 그대로 채택하는 것은 아니지만 어떤 견해가 많은지를 뚜렷하게 하고 계획의 논거로 공개할 예정이다.', wordCount: 119,
    questions: [
      { questionJa: '今回、質問を分ける理由は何ですか。', questionKo: '이번에 질문을 나누는 이유는 무엇입니까?', choices: ['시설 이용을 금지하기 위해', '답변의 맥락을 비교하기 쉽게 하기 위해', '의견을 전부 채택하기 위해', '질문 수를 없애기 위해'], answerIndex: 1, explanationKo: '이전에는 질문이 추상적이어서 답변의 맥락을 비교하기 어려웠다고 했습니다.' },
      { questionJa: '集めた意見はどのように使われますか。', questionKo: '모은 의견은 어떻게 사용됩니까?', choices: ['비공개로 버린다', '모두 그대로 채택한다', '계획의 논거로 공개한다', '시설을 즉시 폐쇄한다'], answerIndex: 2, explanationKo: '많은 견해를 뚜렷하게 하여 계획의 논거로 공개할 예정입니다.' },
    ],
  },
  {
    titleJa: '支援制度の見直し', genre: 'notice',
    bodyJa: '来年度から、地域事業者への支援制度の一部を見直します。申請の件数が増えた一方で、審査に必要な時間も逼迫してきたためです。新しい制度では、規模の小さい事業者向けに相談窓口を増やし、大きい事業者には事業計画の検証資料を求めます。これは支援を抑制するためではなく、限られた予算の中で需給と採算の均衡を保つための変更です。',
    bodyKo: '다음 연도부터 지역 사업자 지원 제도의 일부를 재검토합니다. 신청 건수가 늘어난 한편 심사에 필요한 시간도 빠듯해졌기 때문입니다. 새 제도에서는 규모가 작은 사업자용 상담 창구를 늘리고 큰 사업자에게는 사업 계획 검증 자료를 요구합니다. 이는 지원을 억제하기 위한 것이 아니라 한정된 예산 안에서 수요·공급과 채산의 균형을 지키기 위한 변경입니다.', wordCount: 118,
    questions: [
      { questionJa: '制度を見直す直接の理由は何ですか。', questionKo: '제도를 재검토하는 직접적인 이유는 무엇입니까?', choices: ['예산이 무한해서', '신청 증가로 심사 시간이 빠듯해져서', '지원 창구를 없애기 위해서', '사업자를 모두 같게 하기 위해서'], answerIndex: 1, explanationKo: '신청 건수가 늘고 심사 시간이 빠듯해졌기 때문이라고 설명합니다.' },
      { questionJa: '変更の目的として正しいものはどれですか。', questionKo: '변경 목적에 맞는 것은 무엇입니까?', choices: ['지원 자체를 줄이는 것', '예산 안에서 균형을 유지하는 것', '검증 자료를 없애는 것', '대형 사업자만 돕는 것'], answerIndex: 1, explanationKo: '한정된 예산에서 수요·공급과 채산의 균형을 보전하려는 변경입니다.' },
    ],
  },
  {
    titleJa: '連携のための記録', genre: 'workplace',
    bodyJa: '複数の担当者が交代で対応する相談窓口では、記録の形式を統一する試みを始めた。以前は各自の表現に任せていたため、次の担当者が判断の論拠を把握するまでに時間がかかった。新しい記録には、相談者の要望、確認した事実、保留した点を必ず書く。厳密な手順ともなると負担に感じる人もいるが、例外を除いて踏襲すれば、対応の乖離を是正できると考えている。',
    bodyKo: '여러 담당자가 교대로 대응하는 상담 창구에서는 기록 형식을 통일하는 시도를 시작했다. 이전에는 각자의 표현에 맡겼기 때문에 다음 담당자가 판단의 논거를 파악하기까지 시간이 걸렸다. 새 기록에는 상담자의 요청, 확인한 사실, 보류한 점을 반드시 쓴다. 엄밀한 절차쯤 되면 부담으로 느끼는 사람도 있지만 예외를 제외하고 답습한다면 대응의 괴리를 시정할 수 있다고 생각한다.', wordCount: 125,
    questions: [
      { questionJa: '以前の記録にはどんな問題がありましたか。', questionKo: '이전 기록에는 어떤 문제가 있었습니까?', choices: ['너무 엄밀했다', '다음 담당자가 논거를 파악하는 데 시간이 걸렸다', '상담자가 없었다', '형식이 이미 통일되어 있었다'], answerIndex: 1, explanationKo: '각자의 표현에 맡겨 다음 담당자가 판단 논거를 파악하는 데 시간이 걸렸습니다.' },
      { questionJa: '新しい記録に必ず書くものは何ですか。', questionKo: '새 기록에 반드시 쓰는 것은 무엇입니까?', choices: ['개인적 감상만', '상담자의 요청·확인 사실·보류점', '예산의 모든 수치', '담당자의 이름만'], answerIndex: 1, explanationKo: '요청, 확인한 사실, 보류한 점을 반드시 쓴다고 했습니다.' },
    ],
  },
];

export interface N1Batch1Manifest { sourceCode: string; sourceAssetId: string; sourcePath: string; sourceSha256: string; parserVersion: string; counts: { categories: number; vocab: number; grammar: number; kanji: number; sentences: number; reading: number; readingQuestions: number; stableRefs: number; audioBindings: number; contentRows: number; }; }
export interface N1Batch1Plan { statements: string[]; manifest: N1Batch1Manifest; }

function sourceAttribution(): string { return `self-authored N1 Batch 1; source asset ${N1_BATCH_1_SOURCE_ASSET_ID}`; }
function insertCount(statements: readonly string[], table: string): number { return statements.filter((statement) => new RegExp('^INSERT(?: OR IGNORE)? INTO `?' + table + '`?', 'm').test(statement)).length; }

function sentenceStatement(sentence: SentenceSeed): string {
  return [
    'INSERT INTO `sentences` (`source_id`, `level`, `register`, `seq_no`, `ja`, `kana`, `ko`, `vocab_ids`, `grammar_ids`)',
    `VALUES ((SELECT id FROM sources WHERE code = ${esc(N1_BATCH_1_SOURCE_CODE)}), 'N1', 'listening', ${sentence.seqNo}, ${esc(sentence.ja)}, ${sentence.kana ? esc(sentence.kana) : 'NULL'}, ${esc(sentence.ko)}, '[]', '[]')`,
    'ON CONFLICT(`source_id`, `level`, `register`, `seq_no`) DO UPDATE SET `ja` = excluded.`ja`, `kana` = excluded.`kana`, `ko` = excluded.`ko`, `updated_at` = unixepoch();',
  ].join('\n');
}

function readingStatements(reading: ReadingSeed): string[] {
  const attribution = esc(sourceAttribution());
  const passage = [
    'INSERT INTO `reading_passages` (`level`, `genre`, `title_ja`, `body_ja`, `body_ko`, `word_count`, `vocab_ids`, `grammar_ids`, `source_attribution`)',
    `SELECT 'N1', ${esc(reading.genre)}, ${esc(reading.titleJa)}, ${esc(reading.bodyJa)}, ${esc(reading.bodyKo)}, ${reading.wordCount}, '[]', '[]', ${attribution}`,
    'WHERE NOT EXISTS (SELECT 1 FROM `reading_passages`',
    `  WHERE level = 'N1' AND title_ja = ${esc(reading.titleJa)} AND source_attribution = ${attribution});`,
  ].join('\n');
  return [passage, ...reading.questions.map((question) => [
    'INSERT INTO `reading_questions` (`passage_id`, `question_ja`, `question_ko`, `choices_json`, `answer_index`, `explanation_ko`)',
    `SELECT id, ${esc(question.questionJa)}, ${esc(question.questionKo)}, ${escJson([...question.choices])}, ${question.answerIndex}, ${esc(question.explanationKo)}`,
    'FROM `reading_passages`',
    `WHERE level = 'N1' AND title_ja = ${esc(reading.titleJa)} AND source_attribution = ${attribution}`,
    '  AND NOT EXISTS (SELECT 1 FROM `reading_questions` q WHERE q.passage_id = `reading_passages`.id',
    `    AND q.question_ja = ${esc(question.questionJa)});`,
  ].join('\n'))];
}

function stableRefStatements(): string[] {
  const source = esc(N1_BATCH_1_SOURCE_CODE);
  const asset = esc(N1_BATCH_1_SOURCE_ASSET_ID);
  const attribution = esc(sourceAttribution());
  const chars = N1_BATCH_1_KANJI.map(esc).join(', ');
  const rows: Array<[string, string, string]> = [
    ['jlpt-vocab', "'jlpt:n1:batch1:vocab:' || ja || ':' || kana", `FROM vocab WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N1'`],
    ['jlpt-grammar', "'jlpt:n1:batch1:grammar:' || pattern", `FROM grammar WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N1'`],
    ['jlpt-kanji', "'jlpt:n1:batch1:kanji:' || char", `FROM kanji WHERE jlpt_level = 'N1' AND char IN (${chars})`],
    ['jlpt-sentence', "'jlpt:n1:batch1:listening:' || seq_no", `FROM sentences WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N1' AND register = 'listening'`],
    ['jlpt-reading', "'jlpt:n1:batch1:reading:' || title_ja", `FROM reading_passages WHERE level = 'N1' AND source_attribution = ${attribution}`],
  ];
  return rows.map(([itemType, stableRef, from]) => [
    'INSERT OR IGNORE INTO `learning_content_stable_refs` (`stable_ref`, `learning_track`, `item_type`, `item_id`, `level_tag`, `source_asset_id`)',
    `SELECT ${stableRef}, 'jlpt-ja', ${esc(itemType)}, CAST(id AS TEXT), 'N1', ${asset}`,
    `${from};`,
  ].join('\n'));
}

function audioBindingStatement(itemType: 'jlpt-vocab' | 'jlpt-kanji' | 'jlpt-sentence' | 'jlpt-reading', role: 'pronunciation' | 'listening'): string {
  return [
    'INSERT OR IGNORE INTO `content_audio_bindings` (`id`, `stable_ref`, `item_type`, `item_id`, `language`, `audio_role`, `binding_state`, `asset_id`, `unavailable_reason`)',
    `SELECT 'audio-binding:' || stable_ref, stable_ref, ${esc(itemType)}, item_id, 'ja', ${esc(role)}, 'preparing', NULL, ${esc(AUDIO_PREPARING_REASON)}`,
    'FROM `learning_content_stable_refs`',
    `WHERE learning_track = 'jlpt-ja' AND level_tag = 'N1' AND source_asset_id = ${esc(N1_BATCH_1_SOURCE_ASSET_ID)} AND item_type = ${esc(itemType)};`,
  ].join('\n');
}

export function n1Batch1ContentRowsSql(): string {
  const source = esc(N1_BATCH_1_SOURCE_CODE);
  const attribution = esc(sourceAttribution());
  const chars = N1_BATCH_1_KANJI.map(esc).join(', ');
  return [
    'SELECT',
    `  (SELECT count(*) FROM vocab WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N1') +`,
    `  (SELECT count(*) FROM grammar WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N1') +`,
    `  (SELECT count(*) FROM kanji WHERE jlpt_level = 'N1' AND char IN (${chars})) +`,
    `  (SELECT count(*) FROM sentences WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N1' AND register = 'listening') +`,
    `  (SELECT count(*) FROM reading_passages WHERE level = 'N1' AND source_attribution = ${attribution}) +`,
    `  (SELECT count(*) FROM reading_questions q JOIN reading_passages p ON p.id = q.passage_id WHERE p.level = 'N1' AND p.source_attribution = ${attribution}) AS count;`,
  ].join('\n');
}

export function buildN1Batch1Plan(): N1Batch1Plan {
  const sourceSha256 = createHash('sha256').update(fs.readFileSync(N1_BATCH_1_PATH)).digest('hex');
  const vocab = parseVocab({ sourceCode: N1_BATCH_1_SOURCE_CODE, level: 'N1', filePath: N1_BATCH_1_PATH });
  const grammar = parseGrammar({ sourceCode: N1_BATCH_1_SOURCE_CODE, level: 'N1', filePath: N1_BATCH_1_PATH });
  const kanji = parseKanji({ sourceCode: N1_BATCH_1_SOURCE_CODE, level: 'N1', filePath: N1_BATCH_1_PATH });
  const counts = { categories: 6, vocab: 40, grammar: 8, kanji: 12, sentences: SENTENCES.length, reading: READINGS.length, readingQuestions: READINGS.reduce((total, reading) => total + reading.questions.length, 0), stableRefs: 81, audioBindings: 73, contentRows: 87 } as const;
  if (insertCount(vocab, 'vocab') !== counts.vocab || insertCount(grammar, 'grammar') !== counts.grammar || insertCount(kanji, 'kanji') !== counts.kanji) throw new Error('N1 Batch 1 markdown/parser count changed. Update the manifest deliberately.');
  if (counts.contentRows !== counts.vocab + counts.grammar + counts.kanji + counts.sentences + counts.reading + counts.readingQuestions) throw new Error('N1 Batch 1 content row manifest is inconsistent.');
  return {
    statements: [
      'INSERT INTO `sources` (`code`, `title`, `file_path`, `version`) ' +
        `VALUES (${esc(N1_BATCH_1_SOURCE_CODE)}, 'JLPT N1 자체 저작 Batch 1', 'docs/06_n1/01_self_authored_batch_1.md', ${esc(`source-v3-${sourceSha256.slice(0, 16)}`)}) ` +
        'ON CONFLICT(`code`) DO UPDATE SET `title` = excluded.`title`, `file_path` = excluded.`file_path`, `version` = excluded.`version`, `updated_at` = unixepoch();',
      'INSERT OR IGNORE INTO `content_source_assets` (`id`, `asset_kind`, `source_url`, `license_id`, `license_url`, `attribution_text`, `allowed_use`, `source_sha256`, `generated_at`, `selection_reason`) ' +
        `VALUES (${esc(N1_BATCH_1_SOURCE_ASSET_ID)}, 'self-authored-fixture', ${esc(N1_BATCH_1_REPOSITORY_URL)}, 'LicenseRef-nihongo-n3-self-authored', ${esc(N1_BATCH_1_LICENSE_URL)}, '© Nihongo N3 contributors; self-authored Japanese-learning content.', 'Personal learning content; self-authored explanations, examples, readings, questions, and listening scripts; not official JLPT material.', ${esc(sourceSha256)}, 1785379200, 'First operating N1 unit with browser Google Japanese pronunciation available.');`,
      ...vocab, ...grammar, ...kanji, ...SENTENCES.map(sentenceStatement), ...READINGS.flatMap(readingStatements), ...stableRefStatements(),
      audioBindingStatement('jlpt-vocab', 'pronunciation'), audioBindingStatement('jlpt-kanji', 'pronunciation'), audioBindingStatement('jlpt-sentence', 'listening'), audioBindingStatement('jlpt-reading', 'listening'),
    ],
    manifest: { sourceCode: N1_BATCH_1_SOURCE_CODE, sourceAssetId: N1_BATCH_1_SOURCE_ASSET_ID, sourcePath: path.relative(REPO_ROOT, N1_BATCH_1_PATH).split(path.sep).join('/'), sourceSha256, parserVersion: 'n1-batch-1-parser-v1', counts },
  };
}
