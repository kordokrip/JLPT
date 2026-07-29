import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from './constants.js';
import { parseGrammar } from './parse-grammar.js';
import { parseKanji } from './parse-kanji.js';
import { parseVocab } from './parse-vocab.js';
import { esc, escJson } from './utils.js';

export const N2_BATCH_3_SOURCE_CODE = 'N2-A3';
export const N2_BATCH_3_SOURCE_ASSET_ID = 'source-asset:jlpt-n2-self-authored-batch-3-2026-07-30';
export const N2_BATCH_3_PATH = path.join(REPO_ROOT, 'docs/05_n2/04_self_authored_batch_3.md');
export const N2_BATCH_3_REPOSITORY_URL = 'https://github.com/kordokrip/JLPT/blob/main/docs/05_n2/04_self_authored_batch_3.md';
export const N2_BATCH_3_LICENSE_URL = 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#학습-콘텐츠와-provenance';
export const N2_BATCH_3_KANJI = ['衛', '染', '疫', '暮', '齢', '児', '童', '蓄', '節', '財', '均', '貿'] as const;

const AUDIO_PREPARING_REASON = 'No licensed human recording or validated TTS pilot exists yet for this self-authored N2 Batch 3 item.';

interface SentenceSeed { seqNo: number; ja: string; kana?: string; ko: string; }
interface ReadingQuestion { questionJa: string; questionKo: string; choices: readonly string[]; answerIndex: number; explanationKo: string; }
interface ReadingSeed { titleJa: string; genre: string; bodyJa: string; bodyKo: string; wordCount: number; questions: readonly ReadingQuestion[]; }

const SENTENCES: readonly SentenceSeed[] = [
  { seqNo: 1, ja: '健康診断に先立って、問診票をオンラインで提出した。', kana: 'けんこうしんだんにさきだって、もんしんひょうをおんらいんでていしゅつした。', ko: '건강검진에 앞서 문진표를 온라인으로 제출했다.' },
  { seqNo: 2, ja: '軽い症状でも、感染を広げないよう早めに相談する。', kana: 'かるいしょうじょうでも、かんせんをひろげないようはやめにそうだんする。', ko: '가벼운 증상이라도 감염을 퍼뜨리지 않도록 빨리 상담한다.' },
  { seqNo: 3, ja: '衛生に関する案内を、入口の見やすい場所に掲示した。', kana: 'えいせいにかんするあんないを、いりぐちのみやすいばしょにけいじした。', ko: '위생에 관한 안내를 입구의 보기 쉬운 곳에 게시했다.' },
  { seqNo: 4, ja: '医療が進歩したとはいえ、毎日の予防も欠かせない。', kana: 'いりょうがしんぽしたとはいえ、まいにちのよぼうもかかせない。', ko: '의료가 발전했다고 해도 매일의 예방도 빼놓을 수 없다.' },
  { seqNo: 5, ja: '高齢の家族を介護する世帯には、相談窓口を案内する。', ko: '고령 가족을 돌보는 가구에는 상담 창구를 안내한다.' },
  { seqNo: 6, ja: '育児と勤務を両立するため、利用できる福祉制度を調べた。', ko: '육아와 근무를 양립하기 위해 이용할 수 있는 복지 제도를 조사했다.' },
  { seqNo: 7, ja: '児童の暮らしに関する意見を、地域の会議で集めた。', ko: '아동의 생활에 관한 의견을 지역 회의에서 모았다.' },
  { seqNo: 8, ja: '生活費に加えて、急な修理のための余裕も必要だ。', ko: '생활비에 더하여 갑작스러운 수리를 위한 여유도 필요하다.' },
  { seqNo: 9, ja: '地震に備えて、非常用の水と食品を備蓄している。', ko: '지진에 대비하여 비상용 물과 식품을 비축하고 있다.' },
  { seqNo: 10, ja: '警報が出た場合は、近くの避難所へ向かってください。', ko: '경보가 나온 경우에는 가까운 대피소로 향해 주세요.' },
  { seqNo: 11, ja: '被災した地域の復旧には、長い時間と連携が必要になる。', ko: '피해를 입은 지역의 복구에는 긴 시간과 연계가 필요하게 된다.' },
  { seqNo: 12, ja: '防災の説明会を通じて、家族ごとの準備を確認した。', ko: '방재 설명회를 통해 가족별 준비를 확인했다.' },
  { seqNo: 13, ja: 'ごみを分別すると、再利用できる資源が増える。', ko: '쓰레기를 분리하면 재이용할 수 있는 자원이 늘어난다.' },
  { seqNo: 14, ja: '排出する量を削減する一方で、必要なサービスは維持する。', ko: '배출하는 양을 감축하는 한편 필요한 서비스는 유지한다.' },
  { seqNo: 15, ja: '廃棄する前に、ほかの用途に使えないか考えよう。', ko: '폐기하기 전에 다른 용도로 쓸 수 없는지 생각하자.' },
  { seqNo: 16, ja: '省エネの工夫は、家計の節約にもつながる。', ko: '에너지 절약의 노력은 가계 절약으로도 이어진다.' },
  { seqNo: 17, ja: '財政の状況に比べて、今年は支援の範囲が広がった。', ko: '재정 상황에 비해 올해는 지원 범위가 넓어졌다.' },
  { seqNo: 18, ja: '貿易の変化は、輸入する食品の価格にも影響する。', ko: '무역 변화는 수입하는 식품 가격에도 영향을 준다.' },
  { seqNo: 19, ja: '市場から消費者へ届くまでの流通を確認した。', ko: '시장에서 소비자에게 도착할 때까지의 유통을 확인했다.' },
  { seqNo: 20, ja: '生産者と利用者の意見をつなぐ仕組みが必要だ。', ko: '생산자와 이용자의 의견을 잇는 구조가 필요하다.' },
  { seqNo: 21, ja: '公開された統計をめぐって、さまざまな議論が起きた。', ko: '공개된 통계를 둘러싸고 다양한 논의가 일어났다.' },
  { seqNo: 22, ja: '報道を見た人の関心が高まり、会議への参加が増えた。', ko: '보도를 본 사람의 관심이 높아져 회의 참가가 늘었다.' },
  { seqNo: 23, ja: '異なる立場の意識を理解してから、意見をまとめる。', ko: '다른 입장의 의식을 이해한 뒤 의견을 정리한다.' },
  { seqNo: 24, ja: '公平な情報公開は、地域の信頼を育てることにつながる。', ko: '공정한 정보 공개는 지역의 신뢰를 키우는 것으로 이어진다.' },
];

const READINGS: readonly ReadingSeed[] = [
  {
    titleJa: '健康相談の予約', genre: 'notice',
    bodyJa: '市の健康相談では、生活習慣や気になる症状について保健師に相談できます。予約に先立って、相談したい内容を短く記入してください。急な症状で治療が必要な場合は、この窓口ではなく医療機関へ連絡します。相談は全年齢を対象にしていますが、育児や介護に関する内容は家族と一緒に参加することもできます。',
    bodyKo: '시 건강 상담에서는 생활 습관이나 신경 쓰이는 증상에 대해 보건사에게 상담할 수 있습니다. 예약에 앞서 상담하고 싶은 내용을 짧게 기입해 주세요. 급한 증상으로 치료가 필요한 경우에는 이 창구가 아니라 의료기관에 연락합니다. 상담은 모든 연령이 대상이지만 육아나 돌봄에 관한 내용은 가족과 함께 참가할 수도 있습니다.', wordCount: 104,
    questions: [
      { questionJa: '急な症状で治療が必要な場合、どこへ連絡しますか。', questionKo: '급한 증상으로 치료가 필요한 경우 어디에 연락합니까?', choices: ['시 건강 상담 창구', '의료기관', '지역 회의', '대피소'], answerIndex: 1, explanationKo: '급한 치료가 필요한 경우에는 의료기관에 연락하라고 안내합니다.' },
      { questionJa: '育児や介護に関する相談はどうできますか。', questionKo: '육아나 돌봄에 관한 상담은 어떻게 할 수 있습니까?', choices: ['가족과 함께 참가할 수 있다', '어린이만 참가한다', '예약 없이 치료를 받는다', '상담할 수 없다'], answerIndex: 0, explanationKo: '해당 내용은 가족과 함께 참가하는 것도 가능하다고 했습니다.' },
    ],
  },
  {
    titleJa: '地域の防災訓練', genre: 'instruction',
    bodyJa: '来週の日曜日、地域の防災訓練を行います。訓練に際して、各世帯は非常用の持ち物を確認してください。地震の警報を聞いた後、指定された避難所まで歩く予定です。雨の場合でも訓練は行いますが、強い警報が出たときは中止します。訓練を通じて、家族どうしの連絡方法と備蓄の場所を見直しましょう。',
    bodyKo: '다음 주 일요일에 지역 방재 훈련을 합니다. 훈련에 즈음하여 각 가구는 비상용 소지품을 확인해 주세요. 지진 경보를 들은 뒤 지정된 대피소까지 걸어갈 예정입니다. 비가 와도 훈련은 하지만 강한 경보가 나오면 중지합니다. 훈련을 통해 가족 간 연락 방법과 비축 장소를 재검토합시다.', wordCount: 105,
    questions: [
      { questionJa: '訓練の後、参加者はどこまで歩きますか。', questionKo: '훈련 후 참가자는 어디까지 걸어갑니까?', choices: ['시장까지', '지정된 대피소까지', '의료기관까지', '시청까지'], answerIndex: 1, explanationKo: '지진 경보 뒤 지정된 대피소까지 걸어갈 예정입니다.' },
      { questionJa: '訓練が中止になるのはどんなときですか。', questionKo: '훈련이 중지되는 것은 언제입니까?', choices: ['비가 조금 올 때', '일요일일 때', '강한 경보가 나올 때', '가족이 참가할 때'], answerIndex: 2, explanationKo: '강한 경보가 나올 때 훈련을 중지한다고 했습니다.' },
    ],
  },
  {
    titleJa: '資源回収の見直し', genre: 'report',
    bodyJa: '町では、資源ごみの分別方法を見直した。以前は回収日が分かりにくく、再利用できる物まで廃棄されることがあった。そこで、紙の案内に加えて、回収日の前日に短い通知を送ることにした。通知によって排出量がすぐに減るとはいえないが、住民の意識が変わるきっかけになると期待している。来月は、回収後の循環の流れも公開する予定だ。',
    bodyKo: '마을에서는 자원 쓰레기 분리 방법을 재검토했다. 이전에는 수거일을 알기 어려워 재이용할 수 있는 물건까지 폐기되는 일이 있었다. 그래서 종이 안내에 더하여 수거일 전날 짧은 알림을 보내기로 했다. 알림으로 배출량이 바로 줄어든다고는 할 수 없지만 주민 의식이 바뀌는 계기가 될 것으로 기대하고 있다. 다음 달에는 수거 후 순환 흐름도 공개할 예정이다.', wordCount: 113,
    questions: [
      { questionJa: '町が新しく決めたことは何ですか。', questionKo: '마을이 새로 결정한 것은 무엇입니까?', choices: ['수거를 중지한다', '수거 전날 알림을 보낸다', '재이용품을 폐기한다', '종이 안내를 없앤다'], answerIndex: 1, explanationKo: '종이 안내에 더해 수거일 전날 짧은 알림을 보내기로 했습니다.' },
      { questionJa: '通知に期待している効果は何ですか。', questionKo: '알림에 기대하는 효과는 무엇입니까?', choices: ['배출량이 즉시 0이 된다', '주민의 의식이 바뀌는 계기가 된다', '수거일이 사라진다', '시장이 확대된다'], answerIndex: 1, explanationKo: '배출량의 즉각적 감소가 아니라 주민 의식 변화의 계기를 기대한다고 했습니다.' },
    ],
  },
];

export interface N2Batch3Manifest { sourceCode: string; sourceAssetId: string; sourcePath: string; sourceSha256: string; parserVersion: string; counts: { categories: number; vocab: number; grammar: number; kanji: number; sentences: number; reading: number; readingQuestions: number; stableRefs: number; audioBindings: number; contentRows: number; }; }
export interface N2Batch3Plan { statements: string[]; manifest: N2Batch3Manifest; }

function sourceAttribution(): string { return `self-authored N2 Batch 3; source asset ${N2_BATCH_3_SOURCE_ASSET_ID}`; }
function insertCount(statements: readonly string[], table: string): number { return statements.filter((statement) => new RegExp('^INSERT(?: OR IGNORE)? INTO `?' + table + '`?', 'm').test(statement)).length; }

function sentenceStatement(sentence: SentenceSeed): string {
  return [
    'INSERT INTO `sentences` (`source_id`, `level`, `register`, `seq_no`, `ja`, `kana`, `ko`, `vocab_ids`, `grammar_ids`)',
    `VALUES ((SELECT id FROM sources WHERE code = ${esc(N2_BATCH_3_SOURCE_CODE)}), 'N2', 'listening', ${sentence.seqNo}, ${esc(sentence.ja)}, ${sentence.kana ? esc(sentence.kana) : 'NULL'}, ${esc(sentence.ko)}, '[]', '[]')`,
    'ON CONFLICT(`source_id`, `level`, `register`, `seq_no`) DO UPDATE SET `ja` = excluded.`ja`, `kana` = excluded.`kana`, `ko` = excluded.`ko`, `updated_at` = unixepoch();',
  ].join('\n');
}

function readingStatements(reading: ReadingSeed): string[] {
  const attribution = esc(sourceAttribution());
  const passage = [
    'INSERT INTO `reading_passages` (`level`, `genre`, `title_ja`, `body_ja`, `body_ko`, `word_count`, `vocab_ids`, `grammar_ids`, `source_attribution`)',
    `SELECT 'N2', ${esc(reading.genre)}, ${esc(reading.titleJa)}, ${esc(reading.bodyJa)}, ${esc(reading.bodyKo)}, ${reading.wordCount}, '[]', '[]', ${attribution}`,
    'WHERE NOT EXISTS (SELECT 1 FROM `reading_passages`',
    `  WHERE level = 'N2' AND title_ja = ${esc(reading.titleJa)} AND source_attribution = ${attribution});`,
  ].join('\n');
  return [passage, ...reading.questions.map((question) => [
    'INSERT INTO `reading_questions` (`passage_id`, `question_ja`, `question_ko`, `choices_json`, `answer_index`, `explanation_ko`)',
    `SELECT id, ${esc(question.questionJa)}, ${esc(question.questionKo)}, ${escJson([...question.choices])}, ${question.answerIndex}, ${esc(question.explanationKo)}`,
    'FROM `reading_passages`',
    `WHERE level = 'N2' AND title_ja = ${esc(reading.titleJa)} AND source_attribution = ${attribution}`,
    '  AND NOT EXISTS (SELECT 1 FROM `reading_questions` q WHERE q.passage_id = `reading_passages`.id',
    `    AND q.question_ja = ${esc(question.questionJa)});`,
  ].join('\n'))];
}

function stableRefStatements(): string[] {
  const source = esc(N2_BATCH_3_SOURCE_CODE);
  const asset = esc(N2_BATCH_3_SOURCE_ASSET_ID);
  const attribution = esc(sourceAttribution());
  const chars = N2_BATCH_3_KANJI.map(esc).join(', ');
  const rows: Array<[string, string, string]> = [
    ['jlpt-vocab', "'jlpt:n2:batch3:vocab:' || ja || ':' || kana", `FROM vocab WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N2'`],
    ['jlpt-grammar', "'jlpt:n2:batch3:grammar:' || pattern", `FROM grammar WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N2'`],
    ['jlpt-kanji', "'jlpt:n2:batch3:kanji:' || char", `FROM kanji WHERE jlpt_level = 'N2' AND char IN (${chars})`],
    ['jlpt-sentence', "'jlpt:n2:batch3:listening:' || seq_no", `FROM sentences WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N2' AND register = 'listening'`],
    ['jlpt-reading', "'jlpt:n2:batch3:reading:' || title_ja", `FROM reading_passages WHERE level = 'N2' AND source_attribution = ${attribution}`],
  ];
  return rows.map(([itemType, stableRef, from]) => [
    'INSERT OR IGNORE INTO `learning_content_stable_refs` (`stable_ref`, `learning_track`, `item_type`, `item_id`, `level_tag`, `source_asset_id`)',
    `SELECT ${stableRef}, 'jlpt-ja', ${esc(itemType)}, CAST(id AS TEXT), 'N2', ${asset}`,
    `${from};`,
  ].join('\n'));
}

function audioBindingStatement(itemType: 'jlpt-vocab' | 'jlpt-kanji' | 'jlpt-sentence' | 'jlpt-reading', role: 'pronunciation' | 'listening'): string {
  return [
    'INSERT OR IGNORE INTO `content_audio_bindings` (`id`, `stable_ref`, `item_type`, `item_id`, `language`, `audio_role`, `binding_state`, `asset_id`, `unavailable_reason`)',
    `SELECT 'audio-binding:' || stable_ref, stable_ref, ${esc(itemType)}, item_id, 'ja', ${esc(role)}, 'preparing', NULL, ${esc(AUDIO_PREPARING_REASON)}`,
    'FROM `learning_content_stable_refs`',
    `WHERE learning_track = 'jlpt-ja' AND level_tag = 'N2' AND source_asset_id = ${esc(N2_BATCH_3_SOURCE_ASSET_ID)} AND item_type = ${esc(itemType)};`,
  ].join('\n');
}

export function n2Batch3ContentRowsSql(): string {
  const source = esc(N2_BATCH_3_SOURCE_CODE);
  const attribution = esc(sourceAttribution());
  const chars = N2_BATCH_3_KANJI.map(esc).join(', ');
  return [
    'SELECT',
    `  (SELECT count(*) FROM vocab WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N2') +`,
    `  (SELECT count(*) FROM grammar WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N2') +`,
    `  (SELECT count(*) FROM kanji WHERE jlpt_level = 'N2' AND char IN (${chars})) +`,
    `  (SELECT count(*) FROM sentences WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N2' AND register = 'listening') +`,
    `  (SELECT count(*) FROM reading_passages WHERE level = 'N2' AND source_attribution = ${attribution}) +`,
    `  (SELECT count(*) FROM reading_questions q JOIN reading_passages p ON p.id = q.passage_id WHERE p.level = 'N2' AND p.source_attribution = ${attribution}) AS count;`,
  ].join('\n');
}

export function buildN2Batch3Plan(): N2Batch3Plan {
  const sourceSha256 = createHash('sha256').update(fs.readFileSync(N2_BATCH_3_PATH)).digest('hex');
  const vocab = parseVocab({ sourceCode: N2_BATCH_3_SOURCE_CODE, level: 'N2', filePath: N2_BATCH_3_PATH });
  const grammar = parseGrammar({ sourceCode: N2_BATCH_3_SOURCE_CODE, level: 'N2', filePath: N2_BATCH_3_PATH });
  const kanji = parseKanji({ sourceCode: N2_BATCH_3_SOURCE_CODE, level: 'N2', filePath: N2_BATCH_3_PATH });
  const counts = { categories: 7, vocab: 48, grammar: 8, kanji: 12, sentences: SENTENCES.length, reading: READINGS.length, readingQuestions: READINGS.reduce((total, reading) => total + reading.questions.length, 0), stableRefs: 95, audioBindings: 87, contentRows: 101 } as const;
  if (insertCount(vocab, 'vocab') !== counts.vocab || insertCount(grammar, 'grammar') !== counts.grammar || insertCount(kanji, 'kanji') !== counts.kanji) throw new Error('N2 Batch 3 markdown/parser count changed. Update the manifest deliberately.');
  if (counts.contentRows !== counts.vocab + counts.grammar + counts.kanji + counts.sentences + counts.reading + counts.readingQuestions) throw new Error('N2 Batch 3 content row manifest is inconsistent.');
  return {
    statements: [
      'INSERT INTO `sources` (`code`, `title`, `file_path`, `version`) ' +
        `VALUES (${esc(N2_BATCH_3_SOURCE_CODE)}, 'JLPT N2 자체 저작 Batch 3', 'docs/05_n2/04_self_authored_batch_3.md', ${esc(`source-v3-${sourceSha256.slice(0, 16)}`)}) ` +
        'ON CONFLICT(`code`) DO UPDATE SET `title` = excluded.`title`, `file_path` = excluded.`file_path`, `version` = excluded.`version`, `updated_at` = unixepoch();',
      'INSERT OR IGNORE INTO `content_source_assets` (`id`, `asset_kind`, `source_url`, `license_id`, `license_url`, `attribution_text`, `allowed_use`, `source_sha256`, `generated_at`, `selection_reason`) ' +
        `VALUES (${esc(N2_BATCH_3_SOURCE_ASSET_ID)}, 'self-authored-fixture', ${esc(N2_BATCH_3_REPOSITORY_URL)}, 'LicenseRef-nihongo-n3-self-authored', ${esc(N2_BATCH_3_LICENSE_URL)}, '© Nihongo N3 contributors; self-authored Japanese-learning content.', 'Personal learning content; self-authored explanations, examples, readings, questions, and listening scripts; not official JLPT material.', ${esc(sourceSha256)}, 1785379200, 'Third operating N2 unit with no external audio asset.');`,
      ...vocab, ...grammar, ...kanji, ...SENTENCES.map(sentenceStatement), ...READINGS.flatMap(readingStatements), ...stableRefStatements(),
      audioBindingStatement('jlpt-vocab', 'pronunciation'), audioBindingStatement('jlpt-kanji', 'pronunciation'), audioBindingStatement('jlpt-sentence', 'listening'), audioBindingStatement('jlpt-reading', 'listening'),
    ],
    manifest: { sourceCode: N2_BATCH_3_SOURCE_CODE, sourceAssetId: N2_BATCH_3_SOURCE_ASSET_ID, sourcePath: path.relative(REPO_ROOT, N2_BATCH_3_PATH).split(path.sep).join('/'), sourceSha256, parserVersion: 'n2-batch-3-parser-v1', counts },
  };
}
