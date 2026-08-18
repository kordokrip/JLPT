import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from './constants.js';
import { parseGrammar } from './parse-grammar.js';
import { parseKanji } from './parse-kanji.js';
import { parseVocab } from './parse-vocab.js';
import { esc, escJson } from './utils.js';

/** Second operating, self-authored N1 curriculum. Never contains JLPT exam material. */
export const N1_BATCH_2_SOURCE_CODE = 'N1-A2';
export const N1_BATCH_2_SOURCE_ASSET_ID = 'source-asset:jlpt-n1-self-authored-batch-2-2026-07-30';
export const N1_BATCH_2_PATH = path.join(REPO_ROOT, 'docs/06_n1/02_self_authored_batch_2.md');
export const N1_BATCH_2_REPOSITORY_URL = 'https://github.com/kordokrip/JLPT/blob/main/docs/06_n1/02_self_authored_batch_2.md';
export const N1_BATCH_2_LICENSE_URL = 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#학습-콘텐츠와-provenance';
export const N1_BATCH_2_KANJI = ['指', '針', '監', '督', '仮', '証', '偏', '標', '衡', '譲', '脆', '兆'] as const;


interface SentenceSeed { seqNo: number; ja: string; kana?: string; ko: string; }
interface ReadingQuestion { questionJa: string; questionKo: string; choices: readonly string[]; answerIndex: number; explanationKo: string; }
interface ReadingSeed { titleJa: string; genre: string; bodyJa: string; bodyKo: string; wordCount: number; questions: readonly ReadingQuestion[]; }

const SENTENCES: readonly SentenceSeed[] = [
  { seqNo: 1, ja: '施策の目的と指針を端的に説明する。', kana: 'しさくのもくてきとししんをたんてきにせつめいする。', ko: '시책의 목적과 지침을 간결하게 설명한다.' },
  { seqNo: 2, ja: '権限を委譲しても、監督の責任までなくなるわけではない。', kana: 'けんげんをいじょうしても、かんとくのせきにんまでなくなるわけではない。', ko: '권한을 위임해도 감독 책임까지 없어지는 것은 아니다.' },
  { seqNo: 3, ja: '公聴会では、異なる立場の意見を同じ条件で聞く。', ko: '공청회에서는 다른 입장의 의견을 같은 조건에서 듣는다.' },
  { seqNo: 4, ja: '透明性を高めるには、審議の過程も共有する必要がある。', ko: '투명성을 높이려면 심의 과정도 공유할 필요가 있다.' },
  { seqNo: 5, ja: '仮説を立てる前に、何を確かめたいのかを明確にした。', ko: '가설을 세우기 전에 무엇을 확인하고 싶은지 명확하게 했다.' },
  { seqNo: 6, ja: '相関があることだけでは、因果関係を実証したことにならない。', ko: '상관이 있다는 것만으로 인과관계를 실증한 것이 되지는 않는다.' },
  { seqNo: 7, ja: '標本の偏りを避けるため、集め方を見直した。', ko: '표본의 편향을 피하기 위해 모으는 방법을 재검토했다.' },
  { seqNo: 8, ja: '反証に耐えられるかを考えると、仮説の弱点が見えてくる。', ko: '반증을 견딜 수 있는지 생각하면 가설의 약점이 보이기 시작한다.' },
  { seqNo: 9, ja: '役割分担が曖昧だと、調整に必要な時間が増える。', ko: '역할 분담이 모호하면 조정에 필요한 시간이 늘어난다.' },
  { seqNo: 10, ja: '部門ごとの裁量を尊重しながら、全体の方針をそろえる。', ko: '부문별 재량을 존중하면서 전체 방침을 맞춘다.' },
  { seqNo: 11, ja: '情報を共有しなければ、連携は言葉だけで終わってしまう。', ko: '정보를 공유하지 않으면 연계는 말뿐으로 끝나 버린다.' },
  { seqNo: 12, ja: '不足する専門性は、外部の協力で補完できる。', ko: '부족한 전문성은 외부 협력으로 보완할 수 있다.' },
  { seqNo: 13, ja: '小さな兆候を見逃すと、問題が顕在化してから対応することになる。', ko: '작은 조짐을 놓치면 문제가 표면화한 뒤에 대응하게 된다.' },
  { seqNo: 14, ja: '脆弱な仕組みほど、一つの障害が広く波及しやすい。', ko: '취약한 구조일수록 하나의 장애가 넓게 파급되기 쉽다.' },
  { seqNo: 15, ja: '復旧を急ぐ一方で、同じ失敗を繰り返さない対策も必要だ。', ko: '복구를 서두르는 한편 같은 실패를 되풀이하지 않을 대책도 필요하다.' },
  { seqNo: 16, ja: '代替手段を用意しておけば、機会の逸失を小さくできる。', ko: '대체 수단을 마련해 두면 기회 상실을 작게 할 수 있다.' },
  { seqNo: 17, ja: '画一的な基準では、地域ごとの事情を十分に扱えない。', ko: '획일적인 기준으로는 지역별 사정을 충분히 다룰 수 없다.' },
  { seqNo: 18, ja: '包括的な説明を読めば、結論の背景もおのずと理解できる。', ko: '포괄적인 설명을 읽으면 결론의 배경도 저절로 이해할 수 있다.' },
];

const READINGS: readonly ReadingSeed[] = [
  {
    titleJa: '公共施設の利用指針', genre: 'notice',
    bodyJa: '市は、新しい公共施設の利用指針を公表した。利用時間や予約方法だけでなく、相談窓口と意見を送る方法も示している。作成にあたっては、利用者への聞き取りと公聴会で出た意見を審議した。ただし、すべての要望をそのまま採用したわけではない。限られた人だけに有利にならないよう、利用の公平さと運営の継続性を両方考慮したという。来月には、実施後の課題を共有する予定である。',
    bodyKo: '시는 새 공공시설 이용 지침을 공표했다. 이용 시간과 예약 방법뿐 아니라 상담 창구와 의견을 보내는 방법도 제시하고 있다. 작성에 있어서는 이용자 면담과 공청회에서 나온 의견을 심의했다. 다만 모든 요구를 그대로 채택한 것은 아니다. 한정된 사람에게만 유리해지지 않도록 이용의 공정성과 운영의 지속성을 모두 고려했다고 한다. 다음 달에는 시행 후 과제를 공유할 예정이다.', wordCount: 126,
    questions: [
      { questionJa: '指針を作る際に行ったことは何ですか。', questionKo: '지침을 만들 때 한 일은 무엇입니까?', choices: ['이용자 의견을 듣고 심의했다', '예약을 모두 없앴다', '시설을 즉시 닫았다', '특정인만 초대했다'], answerIndex: 0, explanationKo: '이용자 면담과 공청회 의견을 심의했다고 합니다.' },
      { questionJa: 'すべての要望を採用しなかった理由は何ですか。', questionKo: '모든 요구를 채택하지 않은 이유는 무엇입니까?', choices: ['의견을 읽지 않았기 때문에', '이용의 공정성과 운영의 지속성을 고려했기 때문에', '상담 창구가 없어서', '다음 달까지 시간이 없어서'], answerIndex: 1, explanationKo: '이용 공정성과 운영 지속성을 함께 고려했다고 설명합니다.' },
    ],
  },
  {
    titleJa: '調査結果の読み方', genre: 'report',
    bodyJa: '研究グループは、働く人の移動時間について調査を行った。結果を見ると、移動時間が長い人ほど疲れを感じやすいという相関があった。しかし、この数字だけで移動時間が疲れの唯一の原因だとは言えない。勤務時間、休憩の取り方、家庭での役割など、ほかの要因も関わる可能性があるからだ。報告書では、標本の地域的な偏りにも触れ、次回は対象を広げて再現性を確かめるとしている。',
    bodyKo: '연구 그룹은 일하는 사람의 이동 시간에 관해 조사했다. 결과를 보면 이동 시간이 긴 사람일수록 피로를 느끼기 쉽다는 상관이 있었다. 그러나 이 수치만으로 이동 시간이 피로의 유일한 원인이라고 말할 수는 없다. 근무 시간, 휴식 방식, 가정에서의 역할 등 다른 요인도 관련될 가능성이 있기 때문이다. 보고서는 표본의 지역적 편향도 언급하며 다음에는 대상을 넓혀 재현성을 확인하겠다고 한다.', wordCount: 120,
    questions: [
      { questionJa: '報告書が慎重に扱っている点は何ですか。', questionKo: '보고서가 신중하게 다루는 점은 무엇입니까?', choices: ['상관을 곧바로 유일한 원인이라고 단정하지 않는 점', '조사를 전혀 하지 않는 점', '이동 시간을 없애는 점', '표본을 줄이는 점'], answerIndex: 0, explanationKo: '상관만으로 이동 시간이 유일한 원인이라고 할 수 없다고 했습니다.' },
      { questionJa: '次回の調査で行う予定のことは何ですか。', questionKo: '다음 조사에서 할 예정인 것은 무엇입니까?', choices: ['대상을 넓혀 재현성을 확인한다', '표본을 한 지역으로 제한한다', '결과를 공개하지 않는다', '휴식 시간을 없앤다'], answerIndex: 0, explanationKo: '대상을 넓혀 재현성을 확인할 예정입니다.' },
    ],
  },
  {
    titleJa: '復旧後の優先順位', genre: 'workplace',
    bodyJa: 'システム障害が収束した後、担当チームは復旧の過程を振り返った。最初は利用者が多い機能を優先して直したが、それだけでは十分ではなかった。障害が波及した原因を調べると、部門間で情報を共有する仕組みが脆弱だったことが分かった。今後は、代替手段をあらかじめ用意し、異常の兆候を即座に伝える担当を決める。また、個々の裁量に任せきりにせず、緊急時の役割分担を文書にすることにした。',
    bodyKo: '시스템 장애가 수습된 뒤 담당 팀은 복구 과정을 되돌아보았다. 처음에는 이용자가 많은 기능을 우선 고쳤지만 그것만으로는 충분하지 않았다. 장애가 파급된 원인을 조사하니 부문 간 정보를 공유하는 구조가 취약했다는 것을 알게 되었다. 앞으로는 대체 수단을 미리 마련하고 이상 조짐을 즉시 전달하는 담당을 정한다. 또한 개인 재량에만 맡기지 않고 긴급 시 역할 분담을 문서로 하기로 했다.', wordCount: 123,
    questions: [
      { questionJa: '障害が広がった原因として分かったことは何ですか。', questionKo: '장애가 넓어진 원인으로 알게 된 것은 무엇입니까?', choices: ['정보 공유 구조가 취약했다', '이용자가 너무 적었다', '대체 수단이 너무 많았다', '문서가 너무 길었다'], answerIndex: 0, explanationKo: '부문 사이 정보 공유 구조가 취약했다고 합니다.' },
      { questionJa: '今後、緊急時に備えて何をしますか。', questionKo: '앞으로 긴급 상황에 대비해 무엇을 합니까?', choices: ['역할 분담을 문서로 한다', '조짐을 무시한다', '복구를 미룬다', '정보 공유를 줄인다'], answerIndex: 0, explanationKo: '긴급 시 역할 분담을 문서로 하기로 했습니다.' },
    ],
  },
];

export interface N1Batch2Manifest { sourceCode: string; sourceAssetId: string; sourcePath: string; sourceSha256: string; parserVersion: string; counts: { categories: number; vocab: number; grammar: number; kanji: number; sentences: number; reading: number; readingQuestions: number; stableRefs: number; audioBindings: number; contentRows: number; }; }
export interface N1Batch2Plan { statements: string[]; manifest: N1Batch2Manifest; }

function sourceAttribution(): string { return `self-authored N1 Batch 2; source asset ${N1_BATCH_2_SOURCE_ASSET_ID}`; }
function insertCount(statements: readonly string[], table: string): number { return statements.filter((statement) => new RegExp('^INSERT(?: OR IGNORE)? INTO `?' + table + '`?', 'm').test(statement)).length; }

function sentenceStatement(sentence: SentenceSeed): string {
  return [
    'INSERT INTO `sentences` (`source_id`, `level`, `register`, `seq_no`, `ja`, `kana`, `ko`, `vocab_ids`, `grammar_ids`)',
    `VALUES ((SELECT id FROM sources WHERE code = ${esc(N1_BATCH_2_SOURCE_CODE)}), 'N1', 'listening', ${sentence.seqNo}, ${esc(sentence.ja)}, ${sentence.kana ? esc(sentence.kana) : 'NULL'}, ${esc(sentence.ko)}, '[]', '[]')`,
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
  const source = esc(N1_BATCH_2_SOURCE_CODE);
  const asset = esc(N1_BATCH_2_SOURCE_ASSET_ID);
  const attribution = esc(sourceAttribution());
  const chars = N1_BATCH_2_KANJI.map(esc).join(', ');
  const rows: Array<[string, string, string]> = [
    ['jlpt-vocab', "'jlpt:n1:batch2:vocab:' || ja || ':' || kana", `FROM vocab WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N1'`],
    ['jlpt-grammar', "'jlpt:n1:batch2:grammar:' || pattern", `FROM grammar WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N1'`],
    ['jlpt-kanji', "'jlpt:n1:batch2:kanji:' || char", `FROM kanji WHERE jlpt_level = 'N1' AND char IN (${chars})`],
    ['jlpt-sentence', "'jlpt:n1:batch2:listening:' || seq_no", `FROM sentences WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N1' AND register = 'listening'`],
    ['jlpt-reading', "'jlpt:n1:batch2:reading:' || title_ja", `FROM reading_passages WHERE level = 'N1' AND source_attribution = ${attribution}`],
  ];
  return rows.map(([itemType, stableRef, from]) => [
    'INSERT OR IGNORE INTO `learning_content_stable_refs` (`stable_ref`, `learning_track`, `item_type`, `item_id`, `level_tag`, `source_asset_id`)',
    `SELECT ${stableRef}, 'jlpt-ja', ${esc(itemType)}, CAST(id AS TEXT), 'N1', ${asset}`,
    `${from};`,
  ].join('\n'));
}

function audioBindingStatement(itemType: 'jlpt-vocab' | 'jlpt-kanji' | 'jlpt-sentence' | 'jlpt-reading', role: 'pronunciation' | 'listening'): string {
  const textSource = itemType === 'jlpt-sentence' ? 'sentence' : itemType === 'jlpt-reading' ? 'passage' : 'item';
  return [
    'INSERT OR IGNORE INTO `content_speech_bindings` (`id`, `stable_ref`, `item_type`, `item_id`, `language`, `speech_role`, `provider`, `binding_state`, `text_source`, `unavailable_reason`)',
    `SELECT 'speech-binding:' || stable_ref, stable_ref, ${esc(itemType)}, item_id, 'ja', ${esc(role)}, 'google-browser', 'ready', ${esc(textSource)}, NULL`,
    'FROM `learning_content_stable_refs`',
    `WHERE learning_track = 'jlpt-ja' AND level_tag = 'N1' AND source_asset_id = ${esc(N1_BATCH_2_SOURCE_ASSET_ID)} AND item_type = ${esc(itemType)};`,
  ].join('\n');
}

export function n1Batch2ContentRowsSql(): string {
  const source = esc(N1_BATCH_2_SOURCE_CODE);
  const attribution = esc(sourceAttribution());
  const chars = N1_BATCH_2_KANJI.map(esc).join(', ');
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

export function buildN1Batch2Plan(): N1Batch2Plan {
  const sourceSha256 = createHash('sha256').update(fs.readFileSync(N1_BATCH_2_PATH)).digest('hex');
  const vocab = parseVocab({ sourceCode: N1_BATCH_2_SOURCE_CODE, level: 'N1', filePath: N1_BATCH_2_PATH });
  const grammar = parseGrammar({ sourceCode: N1_BATCH_2_SOURCE_CODE, level: 'N1', filePath: N1_BATCH_2_PATH });
  const kanji = parseKanji({ sourceCode: N1_BATCH_2_SOURCE_CODE, level: 'N1', filePath: N1_BATCH_2_PATH });
  const counts = { categories: 6, vocab: 40, grammar: 8, kanji: 12, sentences: SENTENCES.length, reading: READINGS.length, readingQuestions: READINGS.reduce((total, reading) => total + reading.questions.length, 0), stableRefs: 81, audioBindings: 73, contentRows: 87 } as const;
  if (insertCount(vocab, 'vocab') !== counts.vocab || insertCount(grammar, 'grammar') !== counts.grammar || insertCount(kanji, 'kanji') !== counts.kanji) throw new Error('N1 Batch 2 markdown/parser count changed. Update the manifest deliberately.');
  if (counts.contentRows !== counts.vocab + counts.grammar + counts.kanji + counts.sentences + counts.reading + counts.readingQuestions) throw new Error('N1 Batch 2 content row manifest is inconsistent.');
  return {
    statements: [
      'INSERT INTO `sources` (`code`, `title`, `file_path`, `version`) ' +
        `VALUES (${esc(N1_BATCH_2_SOURCE_CODE)}, 'JLPT N1 자체 저작 Batch 2', 'docs/06_n1/02_self_authored_batch_2.md', ${esc(`source-v3-${sourceSha256.slice(0, 16)}`)}) ` +
        'ON CONFLICT(`code`) DO UPDATE SET `title` = excluded.`title`, `file_path` = excluded.`file_path`, `version` = excluded.`version`, `updated_at` = unixepoch();',
      'INSERT OR IGNORE INTO `content_source_assets` (`id`, `asset_kind`, `source_url`, `license_id`, `license_url`, `attribution_text`, `allowed_use`, `source_sha256`, `generated_at`, `selection_reason`) ' +
        `VALUES (${esc(N1_BATCH_2_SOURCE_ASSET_ID)}, 'self-authored-fixture', ${esc(N1_BATCH_2_REPOSITORY_URL)}, 'LicenseRef-nihongo-n3-self-authored', ${esc(N1_BATCH_2_LICENSE_URL)}, '© Nihongo N3 contributors; self-authored Japanese-learning content.', 'Personal learning content; self-authored explanations, examples, readings, questions, and listening scripts; not official JLPT material.', ${esc(sourceSha256)}, 1785379200, 'Second operating N1 unit with browser Google Japanese pronunciation available.');`,
      ...vocab, ...grammar, ...kanji, ...SENTENCES.map(sentenceStatement), ...READINGS.flatMap(readingStatements), ...stableRefStatements(),
      audioBindingStatement('jlpt-vocab', 'pronunciation'), audioBindingStatement('jlpt-kanji', 'pronunciation'), audioBindingStatement('jlpt-sentence', 'listening'), audioBindingStatement('jlpt-reading', 'listening'),
    ],
    manifest: { sourceCode: N1_BATCH_2_SOURCE_CODE, sourceAssetId: N1_BATCH_2_SOURCE_ASSET_ID, sourcePath: path.relative(REPO_ROOT, N1_BATCH_2_PATH).split(path.sep).join('/'), sourceSha256, parserVersion: 'n1-batch-2-parser-v1', counts },
  };
}
