import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from './constants.js';
import { parseGrammar } from './parse-grammar.js';
import { parseKanji } from './parse-kanji.js';
import { parseVocab } from './parse-vocab.js';
import { esc, escJson } from './utils.js';

/** Second operating N2 unit. The source markdown stays the human-editable origin. */
export const N2_BATCH_2_SOURCE_CODE = 'N2-A2';
export const N2_BATCH_2_SOURCE_ASSET_ID = 'source-asset:jlpt-n2-self-authored-batch-2-2026-07-29';
export const N2_BATCH_2_PATH = path.join(REPO_ROOT, 'docs/05_n2/03_self_authored_batch_2.md');
export const N2_BATCH_2_REPOSITORY_URL = 'https://github.com/kordokrip/JLPT/blob/main/docs/05_n2/03_self_authored_batch_2.md';
export const N2_BATCH_2_LICENSE_URL = 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#학습-콘텐츠와-provenance';
export const N2_BATCH_2_KANJI = ['雇', '賃', '労', '福', '祉', '績', '昇', '属', '雰', '兼', '遣', '超'] as const;


interface SentenceSeed { seqNo: number; ja: string; kana?: string; ko: string; }
interface ReadingQuestion { questionJa: string; questionKo: string; choices: readonly string[]; answerIndex: number; explanationKo: string; }
interface ReadingSeed { titleJa: string; genre: string; bodyJa: string; bodyKo: string; wordCount: number; questions: readonly ReadingQuestion[]; }

const SENTENCES: readonly SentenceSeed[] = [
  { seqNo: 1, ja: '応募する前に、勤務時間と休日の条件を確認した。', kana: 'おうぼするまえに、きんむじかんときゅうじつのじょうけんをかくにんした。', ko: '지원하기 전에 근무 시간과 휴일 조건을 확인했다.' },
  { seqNo: 2, ja: '面接では、これまでの経験を具体的に説明してください。', kana: 'めんせつでは、これまでのけいけんをぐたいてきにせつめいしてください。', ko: '면접에서는 지금까지의 경험을 구체적으로 설명해 주세요.' },
  { seqNo: 3, ja: '新しい社員は来月から営業部に配属される。', kana: 'あたらしいしゃいんはらいげつからえいぎょうぶにはいぞくされる。', ko: '새 사원은 다음 달부터 영업부에 배속된다.' },
  { seqNo: 4, ja: '給与の支給日は、銀行の休業日に応じて変わることがある。', kana: 'きゅうよのしきゅうびは、ぎんこうのきゅうぎょうびにおうじてかわることがある。', ko: '급여 지급일은 은행 휴무일에 따라 바뀌는 경우가 있다.' },
  { seqNo: 5, ja: '残業が続く場合は、担当者に早めに相談する。', ko: '잔업이 계속되는 경우에는 담당자에게 빨리 상담한다.' },
  { seqNo: 6, ja: '休暇の希望は、業務の予定を見てから提出する。', ko: '휴가 희망은 업무 일정을 본 뒤 제출한다.' },
  { seqNo: 7, ja: '実績だけでなく、チームへの協力も評価の対象になる。', ko: '실적뿐 아니라 팀에 대한 협력도 평가 대상이 된다.' },
  { seqNo: 8, ja: '資格を取ったからといって、すぐに昇進するわけではない。', ko: '자격을 땄다고 해서 바로 승진하는 것은 아니다.' },
  { seqNo: 9, ja: '福利厚生の内容は、勤務先によって異なる。', ko: '복리후생 내용은 근무처에 따라 다르다.' },
  { seqNo: 10, ja: '保険の手続きには、必要な書類をそろえる必要がある。', ko: '보험 절차에는 필요한 서류를 갖출 필요가 있다.' },
  { seqNo: 11, ja: '毎月の収入と支出を記録すると、家計を見直しやすい。', ko: '매달 수입과 지출을 기록하면 가계를 재검토하기 쉽다.' },
  { seqNo: 12, ja: '税金の説明は、初めて働く人にも分かる言葉で行う。', ko: '세금 설명은 처음 일하는 사람도 알 수 있는 말로 한다.' },
  { seqNo: 13, ja: '家賃の支払いが遅れると、契約の条件に影響する。', ko: '집세 납부가 늦어지면 계약 조건에 영향을 준다.' },
  { seqNo: 14, ja: '契約を更新するにしても解約するにしても、期限を確認してください。', ko: '계약을 갱신하든 해지하든 기한을 확인해 주세요.' },
  { seqNo: 15, ja: '駅の周辺は、朝と夕方で混雑の割合が大きく違う。', ko: '역 주변은 아침과 저녁에 혼잡 비율이 크게 다르다.' },
  { seqNo: 16, ja: '移転先を選ぶときは、通勤にかかる時間も考慮した。', ko: '이전할 곳을 고를 때는 통근에 걸리는 시간도 고려했다.' },
  { seqNo: 17, ja: '個別の事情に応じて、相談の時間を調整した。', ko: '개별 사정에 따라 상담 시간을 조정했다.' },
  { seqNo: 18, ja: '一律のルールではなく、柔軟な対応が必要な場合もある。', ko: '일률적인 규칙이 아니라 유연한 대응이 필요한 경우도 있다.' },
  { seqNo: 19, ja: '公正な評価を行うため、基準をあらかじめ共有した。', ko: '공정한 평가를 하기 위해 기준을 미리 공유했다.' },
  { seqNo: 20, ja: 'たとえ結果が小さくても、改善の過程を記録しておく。', ko: '설령 결과가 작아도 개선 과정을 기록해 둔다.' },
  { seqNo: 21, ja: '需要が増えるにつれて、供給の方法も見直されている。', ko: '수요가 늘어남에 따라 공급 방식도 재검토되고 있다.' },
  { seqNo: 22, ja: '価格というより、利用する時間の余裕が選択の理由だった。', ko: '가격이라기보다 이용할 시간의 여유가 선택 이유였다.' },
  { seqNo: 23, ja: '経験の有無を問わず、研修には参加できます。', ko: '경험 유무를 불문하고 연수에는 참가할 수 있습니다.' },
  { seqNo: 24, ja: '二年間にわたって集めた意見を、次の計画に生かす。', ko: '2년에 걸쳐 모은 의견을 다음 계획에 활용한다.' },
  { seqNo: 25, ja: '雇用の条件は、仕事内容だけでなく勤務地にも関係する。', ko: '고용 조건은 업무 내용뿐 아니라 근무지에도 관계가 있다.' },
  { seqNo: 26, ja: '賃金の説明を聞いてから、応募するかどうかを決めた。', ko: '임금 설명을 들은 뒤 지원할지 여부를 정했다.' },
  { seqNo: 27, ja: '退職する人から業務を引き継ぐため、記録を整理した。', ko: '퇴직하는 사람에게서 업무를 인계받기 위해 기록을 정리했다.' },
  { seqNo: 28, ja: '健康を守るため、長時間の勤務を避ける工夫が必要だ。', ko: '건강을 지키기 위해 장시간 근무를 피하는 노력이 필요하다.' },
  { seqNo: 29, ja: '物件を見学するときは、周辺の交通も確認するとよい。', ko: '매물을 둘러볼 때는 주변 교통도 확인하면 좋다.' },
  { seqNo: 30, ja: '互いに役割を理解していれば、急な変更にも対応しやすい。', ko: '서로 역할을 이해하고 있다면 갑작스러운 변경에도 대응하기 쉽다.' },
  { seqNo: 31, ja: '限られた資産をどのように使うかは、目的によって変わる。', ko: '한정된 자산을 어떻게 쓸지는 목적에 따라 달라진다.' },
  { seqNo: 32, ja: '消費を減らすことより、無理なく続けられる方法を選んだ。', ko: '소비를 줄이는 것보다 무리 없이 계속할 수 있는 방법을 골랐다.' },
];

const READINGS: readonly ReadingSeed[] = [
  {
    titleJa: '求人情報を読む前に', genre: 'notice',
    bodyJa: '市の就職相談窓口では、求人情報を見る前に勤務時間、勤務地、給与の条件を整理することを勧めています。条件を一つだけで判断すると、後から通勤や生活との両立が難しくなることがあります。気になる点は面接の前に相談し、質問した内容を記録しておくと比較しやすくなります。',
    bodyKo: '시 취업 상담 창구에서는 구인 정보를 보기 전에 근무 시간, 근무지, 급여 조건을 정리할 것을 권합니다. 한 가지 조건만으로 판단하면 나중에 통근이나 생활과의 양립이 어려워질 수 있습니다. 궁금한 점은 면접 전에 상담하고 질문한 내용을 기록해 두면 비교하기 쉬워집니다.', wordCount: 92,
    questions: [
      { questionJa: '窓口が求人情報を見る前に勧めていることは何ですか。', questionKo: '창구가 구인 정보를 보기 전에 권하는 것은 무엇입니까?', choices: ['근무 조건을 정리한다', '바로 계약한다', '급여만 비교한다', '통근을 그만둔다'], answerIndex: 0, explanationKo: '지문은 근무 시간·근무지·급여 조건을 먼저 정리하라고 안내합니다.' },
      { questionJa: '質問した内容を記録する理由は何ですか。', questionKo: '질문한 내용을 기록하는 이유는 무엇입니까?', choices: ['면접을 취소하기 위해', '조건을 비교하기 쉽게 하기 위해', '급여를 줄이기 위해', '구인 정보를 없애기 위해'], answerIndex: 1, explanationKo: '기록해 두면 각 조건을 비교하기 쉬워진다고 설명합니다.' },
    ],
  },
  {
    titleJa: '研修の参加方法', genre: 'instruction',
    bodyJa: '新しく配属された社員向けの研修は、経験の有無を問わず参加できます。ただし、担当する業務に応じて、選ぶ講座が異なります。参加を希望する人は、今週金曜日までに希望する時間を登録してください。欠席する場合は、次の回に参加できるよう、理由と希望日をあらかじめ連絡します。',
    bodyKo: '새로 배속된 사원 대상 연수는 경험 유무와 관계없이 참가할 수 있습니다. 단, 담당할 업무에 따라 선택하는 강좌가 다릅니다. 참가를 원하는 사람은 이번 주 금요일까지 희망 시간을 등록해 주세요. 결석하는 경우에는 다음 회에 참가할 수 있도록 이유와 희망일을 미리 연락합니다.', wordCount: 91,
    questions: [
      { questionJa: '講座が異なる基準は何ですか。', questionKo: '강좌가 달라지는 기준은 무엇입니까?', choices: ['참가자의 나이', '담당 업무', '급여 금액', '거주 지역'], answerIndex: 1, explanationKo: '담당하는 업무에 따라 선택할 강좌가 다르다고 했습니다.' },
      { questionJa: '欠席する人は何をしますか。', questionKo: '결석하는 사람은 무엇을 합니까?', choices: ['연수를 영구히 취소한다', '이유와 희망일을 미리 연락한다', '다른 사람의 기록을 지운다', '급여를 다시 계산한다'], answerIndex: 1, explanationKo: '다음 회 참가를 위해 이유와 희망일을 미리 연락해야 합니다.' },
    ],
  },
  {
    titleJa: '住み替えの計画', genre: 'email',
    bodyJa: '来月、勤務先に近い地域へ移転する予定です。家賃は今より少し高くなりますが、通勤時間が短くなれば、平日の生活には余裕ができると考えています。契約を更新する前に、周辺の店や交通の利用しやすさを確認するつもりです。たとえ価格が低くても、生活に必要な条件がそろわない物件は選びません。',
    bodyKo: '다음 달 근무처와 가까운 지역으로 이사할 예정입니다. 집세는 지금보다 조금 높아지지만 통근 시간이 짧아지면 평일 생활에 여유가 생길 것이라고 생각합니다. 계약을 갱신하기 전에 주변 가게와 교통 이용 편의성을 확인할 생각입니다. 설령 가격이 낮아도 생활에 필요한 조건이 갖춰지지 않은 매물은 고르지 않습니다.', wordCount: 98,
    questions: [
      { questionJa: '筆者が家賃が高くなっても移転を考える理由は何ですか。', questionKo: '필자가 집세가 높아져도 이전을 생각하는 이유는 무엇입니까?', choices: ['계약을 즉시 해지하려고', '통근 시간을 줄여 생활에 여유를 얻으려고', '교통을 이용하지 않으려고', '매물을 모두 사려고'], answerIndex: 1, explanationKo: '통근 시간이 짧아지면 평일 생활에 여유가 생긴다고 생각합니다.' },
      { questionJa: '筆者が選ばない物件はどれですか。', questionKo: '필자가 고르지 않는 매물은 무엇입니까?', choices: ['가격이 낮고 조건이 충분한 매물', '근무처와 가까운 매물', '생활 조건이 갖춰지지 않은 매물', '주변 교통을 확인한 매물'], answerIndex: 2, explanationKo: '가격이 낮아도 생활에 필요한 조건이 갖춰지지 않으면 고르지 않는다고 했습니다.' },
    ],
  },
  {
    titleJa: '利用者の意見と改善', genre: 'report',
    bodyJa: '施設では、二年間にわたって利用者の意見を集めてきた。以前は、全員に同じ案内を出していたが、相談の目的が異なる人には分かりにくいという声が多かった。そこで、個別の事情に応じて案内の順番を変える試みを始めた。これは特別なサービスというより、必要な情報を適切に伝えるための改善である。来月は、利用後の感想も集めて効果を確かめる。',
    bodyKo: '시설에서는 2년에 걸쳐 이용자 의견을 모아 왔다. 이전에는 모두에게 같은 안내를 했지만 상담 목적이 다른 사람에게는 이해하기 어렵다는 의견이 많았다. 그래서 개별 사정에 따라 안내 순서를 바꾸는 시도를 시작했다. 이것은 특별한 서비스라기보다 필요한 정보를 적절히 전달하기 위한 개선이다. 다음 달에는 이용 후 감상도 모아 효과를 확인한다.', wordCount: 112,
    questions: [
      { questionJa: '以前の案内について多かった意見は何ですか。', questionKo: '이전 안내에 대해 많았던 의견은 무엇입니까?', choices: ['모든 사람이 너무 쉽게 이해했다', '목적이 다른 사람에게 이해하기 어려웠다', '안내가 전혀 없었다', '시설이 너무 멀었다'], answerIndex: 1, explanationKo: '상담 목적이 다른 사람에게는 같은 안내가 이해하기 어렵다는 의견이 많았습니다.' },
      { questionJa: '新しい試みの目的は何ですか。', questionKo: '새 시도의 목적은 무엇입니까?', choices: ['특별 서비스를 과시하기 위해', '필요한 정보를 적절히 전달하기 위해', '모든 안내를 없애기 위해', '의견을 더 이상 모으지 않기 위해'], answerIndex: 1, explanationKo: '지문은 필요한 정보를 적절히 전달하기 위한 개선이라고 설명합니다.' },
    ],
  },
];

export interface N2Batch2Manifest { sourceCode: string; sourceAssetId: string; sourcePath: string; sourceSha256: string; parserVersion: string; counts: { categories: number; vocab: number; grammar: number; kanji: number; sentences: number; reading: number; readingQuestions: number; stableRefs: number; audioBindings: number; contentRows: number; }; }
export interface N2Batch2Plan { statements: string[]; manifest: N2Batch2Manifest; }

function sourceAttribution(): string { return `self-authored N2 Batch 2; source asset ${N2_BATCH_2_SOURCE_ASSET_ID}`; }
function insertCount(statements: readonly string[], table: string): number { return statements.filter((statement) => new RegExp('^INSERT(?: OR IGNORE)? INTO `?' + table + '`?', 'm').test(statement)).length; }

function sentenceStatement(sentence: SentenceSeed): string {
  return [
    'INSERT INTO `sentences` (`source_id`, `level`, `register`, `seq_no`, `ja`, `kana`, `ko`, `vocab_ids`, `grammar_ids`)',
    `VALUES ((SELECT id FROM sources WHERE code = ${esc(N2_BATCH_2_SOURCE_CODE)}), 'N2', 'listening', ${sentence.seqNo}, ${esc(sentence.ja)}, ${sentence.kana ? esc(sentence.kana) : 'NULL'}, ${esc(sentence.ko)}, '[]', '[]')`,
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
  const questions = reading.questions.map((question) => [
    'INSERT INTO `reading_questions` (`passage_id`, `question_ja`, `question_ko`, `choices_json`, `answer_index`, `explanation_ko`)',
    `SELECT id, ${esc(question.questionJa)}, ${esc(question.questionKo)}, ${escJson([...question.choices])}, ${question.answerIndex}, ${esc(question.explanationKo)}`,
    'FROM `reading_passages`',
    `WHERE level = 'N2' AND title_ja = ${esc(reading.titleJa)} AND source_attribution = ${attribution}`,
    '  AND NOT EXISTS (SELECT 1 FROM `reading_questions` q WHERE q.passage_id = `reading_passages`.id',
    `    AND q.question_ja = ${esc(question.questionJa)});`,
  ].join('\n'));
  return [passage, ...questions];
}

function stableRefStatements(): string[] {
  const source = esc(N2_BATCH_2_SOURCE_CODE);
  const asset = esc(N2_BATCH_2_SOURCE_ASSET_ID);
  const attribution = esc(sourceAttribution());
  const chars = N2_BATCH_2_KANJI.map(esc).join(', ');
  const definitions: Array<[string, string, string]> = [
    ['jlpt-vocab', "'jlpt:n2:batch2:vocab:' || ja || ':' || kana", `FROM vocab WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N2'`],
    ['jlpt-grammar', "'jlpt:n2:batch2:grammar:' || pattern", `FROM grammar WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N2'`],
    ['jlpt-kanji', "'jlpt:n2:batch2:kanji:' || char", `FROM kanji WHERE jlpt_level = 'N2' AND char IN (${chars})`],
    ['jlpt-sentence', "'jlpt:n2:batch2:listening:' || seq_no", `FROM sentences WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = 'N2' AND register = 'listening'`],
    ['jlpt-reading', "'jlpt:n2:batch2:reading:' || title_ja", `FROM reading_passages WHERE level = 'N2' AND source_attribution = ${attribution}`],
  ];
  return definitions.map(([itemType, stableRef, from]) => [
    'INSERT OR IGNORE INTO `learning_content_stable_refs` (`stable_ref`, `learning_track`, `item_type`, `item_id`, `level_tag`, `source_asset_id`)',
    `SELECT ${stableRef}, 'jlpt-ja', ${esc(itemType)}, CAST(id AS TEXT), 'N2', ${asset}`,
    `${from};`,
  ].join('\n'));
}

function audioBindingStatement(itemType: 'jlpt-vocab' | 'jlpt-kanji' | 'jlpt-sentence' | 'jlpt-reading', role: 'pronunciation' | 'listening'): string {
  const textSource = itemType === 'jlpt-sentence' ? 'sentence' : itemType === 'jlpt-reading' ? 'passage' : 'item';
  return [
    'INSERT OR IGNORE INTO `content_speech_bindings` (`id`, `stable_ref`, `item_type`, `item_id`, `language`, `speech_role`, `provider`, `binding_state`, `text_source`, `unavailable_reason`)',
    `SELECT 'speech-binding:' || stable_ref, stable_ref, ${esc(itemType)}, item_id, 'ja', ${esc(role)}, 'google-browser', 'ready', ${esc(textSource)}, NULL`,
    'FROM `learning_content_stable_refs`',
    `WHERE learning_track = 'jlpt-ja' AND level_tag = 'N2' AND source_asset_id = ${esc(N2_BATCH_2_SOURCE_ASSET_ID)} AND item_type = ${esc(itemType)};`,
  ].join('\n');
}

export function n2Batch2ContentRowsSql(): string {
  const source = esc(N2_BATCH_2_SOURCE_CODE);
  const attribution = esc(sourceAttribution());
  const chars = N2_BATCH_2_KANJI.map(esc).join(', ');
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

export function buildN2Batch2Plan(): N2Batch2Plan {
  const sourceSha256 = createHash('sha256').update(fs.readFileSync(N2_BATCH_2_PATH)).digest('hex');
  const vocab = parseVocab({ sourceCode: N2_BATCH_2_SOURCE_CODE, level: 'N2', filePath: N2_BATCH_2_PATH });
  const grammar = parseGrammar({ sourceCode: N2_BATCH_2_SOURCE_CODE, level: 'N2', filePath: N2_BATCH_2_PATH });
  const kanji = parseKanji({ sourceCode: N2_BATCH_2_SOURCE_CODE, level: 'N2', filePath: N2_BATCH_2_PATH });
  const counts = { categories: 7, vocab: 48, grammar: 8, kanji: 12, sentences: SENTENCES.length, reading: READINGS.length, readingQuestions: READINGS.reduce((total, reading) => total + reading.questions.length, 0), stableRefs: 104, audioBindings: 96, contentRows: 112 } as const;
  if (insertCount(vocab, 'vocab') !== counts.vocab || insertCount(grammar, 'grammar') !== counts.grammar || insertCount(kanji, 'kanji') !== counts.kanji) {
    throw new Error('N2 Batch 2 markdown/parser count changed. Update the manifest deliberately.');
  }
  if (counts.contentRows !== counts.vocab + counts.grammar + counts.kanji + counts.sentences + counts.reading + counts.readingQuestions) throw new Error('N2 Batch 2 content row manifest is inconsistent.');
  return {
    statements: [
      'INSERT INTO `sources` (`code`, `title`, `file_path`, `version`) ' +
        `VALUES (${esc(N2_BATCH_2_SOURCE_CODE)}, 'JLPT N2 자체 저작 Batch 2', 'docs/05_n2/03_self_authored_batch_2.md', ${esc(`source-v3-${sourceSha256.slice(0, 16)}`)}) ` +
        'ON CONFLICT(`code`) DO UPDATE SET `title` = excluded.`title`, `file_path` = excluded.`file_path`, `version` = excluded.`version`, `updated_at` = unixepoch();',
      'INSERT OR IGNORE INTO `content_source_assets` (`id`, `asset_kind`, `source_url`, `license_id`, `license_url`, `attribution_text`, `allowed_use`, `source_sha256`, `generated_at`, `selection_reason`) ' +
        `VALUES (${esc(N2_BATCH_2_SOURCE_ASSET_ID)}, 'self-authored-fixture', ${esc(N2_BATCH_2_REPOSITORY_URL)}, 'LicenseRef-nihongo-n3-self-authored', ${esc(N2_BATCH_2_LICENSE_URL)}, '© Nihongo N3 contributors; self-authored Japanese-learning content.', 'Personal learning content; self-authored explanations, examples, readings, questions, and listening scripts; not official JLPT material.', ${esc(sourceSha256)}, 1785283200, 'Second operating N2 unit with no external audio asset.');`,
      ...vocab, ...grammar, ...kanji, ...SENTENCES.map(sentenceStatement), ...READINGS.flatMap(readingStatements), ...stableRefStatements(),
      audioBindingStatement('jlpt-vocab', 'pronunciation'), audioBindingStatement('jlpt-kanji', 'pronunciation'), audioBindingStatement('jlpt-sentence', 'listening'), audioBindingStatement('jlpt-reading', 'listening'),
    ],
    manifest: { sourceCode: N2_BATCH_2_SOURCE_CODE, sourceAssetId: N2_BATCH_2_SOURCE_ASSET_ID, sourcePath: path.relative(REPO_ROOT, N2_BATCH_2_PATH).split(path.sep).join('/'), sourceSha256, parserVersion: 'n2-batch-2-parser-v1', counts },
  };
}
