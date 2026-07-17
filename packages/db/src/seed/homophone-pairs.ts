import { createHash } from 'node:crypto';

import { esc } from './utils.js';

export type HomophoneLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface HomophoneWordSeed {
  sourceCode: string;
  level: HomophoneLevel;
  ja: string;
  kana: string;
  accent: string;
  exampleJa: string;
  exampleKo: string;
}

export interface HomophonePairSeed {
  id: string;
  level: HomophoneLevel;
  noteKo: string;
  accentSource: string;
  accentSourceUrl: string;
  reviewer: string;
  reviewedAt: string;
  wordA: HomophoneWordSeed;
  wordB: HomophoneWordSeed;
}

export const HOMOPHONE_PARSER_VERSION = 'homophone-pairs-v1';
export const HOMOPHONE_ACCENT_SOURCE = 'UniDic 2.1.2 via unidic-lite 1.0.8 (BSD-3-Clause option)';
export const HOMOPHONE_ACCENT_SOURCE_URL = 'https://clrd.ninjal.ac.jp/unidic/en/';
export const HOMOPHONE_REVIEWER = 'nihongo-n3 editorial QA';
export const HOMOPHONE_REVIEWED_AT = '2026-07-16';

function word(
  sourceCode: string,
  level: HomophoneLevel,
  ja: string,
  kana: string,
  accent: string,
  exampleJa: string,
  exampleKo: string,
): HomophoneWordSeed {
  return { sourceCode, level, ja, kana, accent, exampleJa, exampleKo };
}

function pair(
  id: string,
  level: HomophoneLevel,
  noteKo: string,
  wordA: HomophoneWordSeed,
  wordB: HomophoneWordSeed,
): HomophonePairSeed {
  return {
    id,
    level,
    noteKo,
    accentSource: HOMOPHONE_ACCENT_SOURCE,
    accentSourceUrl: HOMOPHONE_ACCENT_SOURCE_URL,
    reviewer: HOMOPHONE_REVIEWER,
    reviewedAt: HOMOPHONE_REVIEWED_AT,
    wordA,
    wordB,
  };
}

// Each entry resolves against a concrete seeded vocab row. The examples are
// repository-authored learning examples; accent types are Tokyo-standard values
// checked against the recorded UniDic release.
export const HOMOPHONE_PAIRS: readonly HomophonePairSeed[] = [
  pair('n5-kami', 'N5', '紙은 종이, 髪은 머리카락을 뜻합니다.',
    word('04', 'N5', '紙', 'かみ', '2형', '紙を一枚ください。', '종이 한 장 주세요.'),
    word('04', 'N5', '髪', 'かみ', '2형', '髪を短く切りました。', '머리를 짧게 잘랐습니다.')),
  pair('n5-hana', 'N5', '花은 꽃, 鼻은 코를 뜻합니다.',
    word('04', 'N5', '花', 'はな', '2형', '庭に花が咲いています。', '정원에 꽃이 피어 있습니다.'),
    word('04', 'N5', '鼻', 'はな', '0형', '鼻が少し痛いです。', '코가 조금 아픕니다.')),
  pair('n5-ha', 'N5', '歯는 이, 葉는 잎을 뜻합니다.',
    word('04', 'N5', '歯', 'は', '1형', '歯を毎晩磨きます。', '이를 매일 밤 닦습니다.'),
    word('04', 'N5', '葉', 'は', '0형', '木の葉が風に揺れています。', '나뭇잎이 바람에 흔들리고 있습니다.')),
  pair('n5-ima', 'N5', '今은 지금, 居間은 거실을 뜻합니다.',
    word('04', 'N5', '今', 'いま', '1형', '今、駅に着きました。', '지금 역에 도착했습니다.'),
    word('04', 'N5', '居間', 'いま', '2형', '居間で家族と話します。', '거실에서 가족과 이야기합니다.')),
  pair('n5-kaze', 'N5', '風은 바람, 風邪는 감기를 뜻합니다.',
    word('04', 'N5', '風', 'かぜ', '0형', '今日は風が強いです。', '오늘은 바람이 강합니다.'),
    word('04', 'N5', '風邪', 'かぜ', '0형', '風邪をひいたので休みます。', '감기에 걸려서 쉽니다.')),
  pair('n5-hayai', 'N5', '早い는 이르다, 速い는 빠르다를 뜻합니다.',
    word('04', 'N5', '早い', 'はやい', '2형', '早い時間に出発します。', '이른 시간에 출발합니다.'),
    word('04', 'N5', '速い', 'はやい', '2형', 'この電車は速いです。', '이 전철은 빠릅니다.')),
  pair('n4-kikai', 'N4', '機械은 기계, 機会은 기회를 뜻합니다.',
    word('07', 'N4', '機械', 'きかい', '2형', 'この機械は安全です。', '이 기계는 안전합니다.'),
    word('07', 'N4', '機会', 'きかい', '2형, 0형 변이', '日本語を使う機会が増えました。', '일본어를 사용할 기회가 늘었습니다.')),
  pair('n4-kiru', 'N4', '切る는 자르다, 着る는 입다를 뜻합니다.',
    word('07', 'N4', '切る', 'きる', '1형', '紙をはさみで切ります。', '종이를 가위로 자릅니다.'),
    word('07', 'N4', '着る', 'きる', '0형', '明日は着物を着ます。', '내일은 기모노를 입습니다.')),
  pair('n4-tazuneru', 'N4', '訪ねる는 방문하다, 尋ねる는 묻다를 뜻합니다.',
    word('07', 'N4', '訪ねる', 'たずねる', '3형', '友人の家を訪ねます。', '친구의 집을 방문합니다.'),
    word('07', 'N4', '尋ねる', 'たずねる', '3형', '先生に質問を尋ねます。', '선생님께 질문을 묻습니다.')),
  pair('n4-shimeru', 'N4', '閉める는 닫다, 締める는 조이다를 뜻합니다.',
    word('04', 'N5', '閉める', 'しめる', '2형', '窓を閉めてください。', '창문을 닫아 주세요.'),
    word('07', 'N4', '締める', 'しめる', '2형', '靴ひもを締めます。', '신발 끈을 조입니다.')),
  pair('n3-irai', 'N3', '以来는 이래, 依頼는 의뢰를 뜻합니다.',
    word('07', 'N4', '以来', 'いらい', '1형', '卒業以来、彼とは会っていません。', '졸업 이래 그와 만나지 않았습니다.'),
    word('10A', 'N3', '依頼', 'いらい', '0형', '資料の送付を依頼しました。', '자료 발송을 의뢰했습니다.')),
  pair('n3-saikin', 'N3', '最近은 최근, 細菌은 세균을 뜻합니다.',
    word('07', 'N4', '最近', 'さいきん', '0형', '最近は忙しいです。', '최근에는 바쁩니다.'),
    word('10A', 'N3', '細菌', 'さいきん', '0형', '細菌を調べる実験です。', '세균을 조사하는 실험입니다.')),
  pair('n3-jiki', 'N3', '時期는 시기, 磁気는 자기를 뜻합니다.',
    word('07', 'N4', '時期', 'じき', '1형', '今は大切な時期です。', '지금은 중요한 시기입니다.'),
    word('10A', 'N3', '磁気', 'じき', '1형', '磁気カードを近づけないでください。', '자기 카드를 가까이 대지 마세요.')),
  pair('n3-su', 'N3', '酢는 식초, 巣는 둥지를 뜻합니다.',
    word('07', 'N4', '酢', 'す', '1형', '酢を少し入れます。', '식초를 조금 넣습니다.'),
    word('10B', 'N3', '巣', 'す', '0형, 1형 변이', '鳥が木に巣を作りました。', '새가 나무에 둥지를 만들었습니다.')),
  pair('n4-naka', 'N4', '中은 안, 仲은 관계를 뜻합니다.',
    word('04', 'N5', '中', 'なか', '1형', '箱の中を確認します。', '상자 안을 확인합니다.'),
    word('07', 'N4', '仲', 'なか', '1형', '二人の仲は良いです。', '두 사람의 관계는 좋습니다.')),
  pair('n3-ryou', 'N3', '寮은 기숙사, 量은 양을 뜻합니다.',
    word('07', 'N4', '寮', 'りょう', '1형', '大学の寮に住んでいます。', '대학교 기숙사에 살고 있습니다.'),
    word('10B', 'N3', '量', 'りょう', '1형', '水の量を測ります。', '물의 양을 잽니다.')),
  pair('n3-kagaku', 'N3', '科学은 과학, 化学은 화학을 뜻합니다.',
    word('10A', 'N3', '科学', 'かがく', '1형', '科学の本を読みます。', '과학 책을 읽습니다.'),
    word('10A', 'N3', '化学', 'かがく', '1형', '化学の実験をします。', '화학 실험을 합니다.')),
  pair('n3-kanji', 'N3', '漢字는 한자, 感じ는 느낌을 뜻합니다.',
    word('04', 'N5', '漢字', 'かんじ', '0형', 'この漢字は読めますか。', '이 한자를 읽을 수 있나요?'),
    word('10A', 'N3', '感じ', 'かんじ', '0형', '今日は春の感じがします。', '오늘은 봄 느낌이 납니다.')),
  pair('n3-kanshin', 'N3', '関心은 관심, 感心은 감탄을 뜻합니다.',
    word('10A', 'N3', '関心', 'かんしん', '0형', '日本文化に関心があります。', '일본 문화에 관심이 있습니다.'),
    word('10A', 'N3', '感心', 'かんしん', '0형', '彼の行動に感心しました。', '그의 행동에 감탄했습니다.')),
  pair('n3-kitai', 'N3', '期待는 기대, 気体는 기체를 뜻합니다.',
    word('10A', 'N3', '期待', 'きたい', '0형', '新しい企画に期待しています。', '새 기획에 기대하고 있습니다.'),
    word('10A', 'N3', '気体', 'きたい', '0형', '気体は容器に広がります。', '기체는 용기 안으로 퍼집니다.')),
  pair('n3-kouka', 'N3', '硬貨는 동전, 効果는 효과를 뜻합니다.',
    word('10A', 'N3', '硬貨', 'こうか', '1형', '百円の硬貨を入れます。', '100엔 동전을 넣습니다.'),
    word('10A', 'N3', '効果', 'こうか', '1형', '薬の効果が出ました。', '약의 효과가 나타났습니다.')),
  pair('n3-koutei', 'N3', '肯定는 긍정, 工程은 공정을 뜻합니다.',
    word('10A', 'N3', '肯定', 'こうてい', '0형', 'その意見に肯定的です。', '그 의견에 긍정적입니다.'),
    word('10A', 'N3', '工程', 'こうてい', '0형', '製造工程を確認します。', '제조 공정을 확인합니다.')),
  pair('n3-jishin', 'N3', '地震은 지진, 自信은 자신감을 뜻합니다.',
    word('07', 'N4', '地震', 'じしん', '0형', '昨夜、地震がありました。', '어젯밤 지진이 있었습니다.'),
    word('10A', 'N3', '自信', 'じしん', '0형', '発表には自信があります。', '발표에는 자신이 있습니다.')),
  pair('n3-seikaku', 'N3', '性格은 성격, 正確은 정확함을 뜻합니다.',
    word('10A', 'N3', '性格', 'せいかく', '0형', '彼は明るい性格です。', '그는 밝은 성격입니다.'),
    word('10B', 'N3', '正確', 'せいかく', '0형', '正確な数字を確認します。', '정확한 숫자를 확인합니다.')),
  pair('n3-sousa', 'N3', '捜査는 수사, 操作는 조작을 뜻합니다.',
    word('10A', 'N3', '捜査', 'そうさ', '1형', '警察が事件を捜査しています。', '경찰이 사건을 수사하고 있습니다.'),
    word('10A', 'N3', '操作', 'そうさ', '1형', 'この機械は簡単に操作できます。', '이 기계는 쉽게 조작할 수 있습니다.')),
  pair('n3-souzou', 'N3', '想像은 상상, 創造는 창조를 뜻합니다.',
    word('10A', 'N3', '想像', 'そうぞう', '0형', '未来を想像してください。', '미래를 상상해 보세요.'),
    word('10A', 'N3', '創造', 'そうぞう', '0형', '新しい作品を創造します。', '새로운 작품을 창조합니다.')),
  pair('n3-kigyou', 'N3', '企業은 기업, 起業은 창업을 뜻합니다.',
    word('10A', 'N3', '企業', 'きぎょう', '1형', 'その企業は海外へ進出しました。', '그 기업은 해외로 진출했습니다.'),
    word('10A', 'N3', '起業', 'きぎょう', '1형, 0형 변이', '彼は会社を辞めて起業しました。', '그는 회사를 그만두고 창업했습니다.')),
  pair('n3-shukkin', 'N3', '出勤은 출근, 出金은 출금을 뜻합니다.',
    word('10A', 'N3', '出勤', 'しゅっきん', '0형', '毎朝八時に出勤します。', '매일 아침 8시에 출근합니다.'),
    word('10A', 'N3', '出金', 'しゅっきん', '0형', 'ATMで現金を出金します。', 'ATM에서 현금을 출금합니다.')),
  pair('n3-shinkou', 'N3', '信仰은 신앙, 進行은 진행을 뜻합니다.',
    word('10A', 'N3', '信仰', 'しんこう', '0형', '地域の信仰について調べます。', '지역의 신앙에 대해 조사합니다.'),
    word('10A', 'N3', '進行', 'しんこう', '0형', '会議は予定どおり進行しています。', '회의는 예정대로 진행되고 있습니다.')),
  pair('n3-shinchou', 'N3', '慎重은 신중함, 身長은 키를 뜻합니다.',
    word('10A', 'N3', '慎重', 'しんちょう', '0형', '慎重に計画を立てます。', '신중하게 계획을 세웁니다.'),
    word('10A', 'N3', '身長', 'しんちょう', '0형', '身長を測ってください。', '키를 재어 주세요.')),
];

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateHomophonePairs(pairs = HOMOPHONE_PAIRS): void {
  if (pairs.length < 30) {
    throw new Error(`Homophone release requires at least 30 pairs, received ${pairs.length}.`);
  }

  const ids = new Set<string>();
  const normalizedPairs = new Set<string>();
  for (const item of pairs) {
    if (!hasText(item.id) || ids.has(item.id)) {
      throw new Error(`Homophone pair ID must be unique: ${item.id}`);
    }
    ids.add(item.id);

    const values = [
      item.noteKo, item.accentSource, item.accentSourceUrl, item.reviewer, item.reviewedAt,
      item.wordA.sourceCode, item.wordA.ja, item.wordA.kana, item.wordA.accent,
      item.wordA.exampleJa, item.wordA.exampleKo,
      item.wordB.sourceCode, item.wordB.ja, item.wordB.kana, item.wordB.accent,
      item.wordB.exampleJa, item.wordB.exampleKo,
    ];
    if (values.some((value) => !hasText(value))) {
      throw new Error(`Homophone pair has an incomplete review record: ${item.id}`);
    }
    if (!isHttpsUrl(item.accentSourceUrl)) {
      throw new Error(`Homophone pair must record an HTTPS accent source: ${item.id}`);
    }
    if (!isCalendarDate(item.reviewedAt)) {
      throw new Error(`Homophone pair must record a valid review date: ${item.id}`);
    }
    if (item.wordA.kana !== item.wordB.kana) {
      throw new Error(`Homophone pair must use the same kana: ${item.id}`);
    }
    if (item.wordA.ja === item.wordB.ja) {
      throw new Error(`Homophone pair must contain two distinct words: ${item.id}`);
    }
    const normalized = [
      `${item.wordA.level}:${item.wordA.ja}:${item.wordA.kana}`,
      `${item.wordB.level}:${item.wordB.ja}:${item.wordB.kana}`,
    ].sort().join('|');
    if (normalizedPairs.has(normalized)) {
      throw new Error(`Duplicate homophone pair: ${item.id}`);
    }
    normalizedPairs.add(normalized);
  }
}

export function homophonePairsChecksum(pairs = HOMOPHONE_PAIRS): string {
  return createHash('sha256').update(JSON.stringify(pairs)).digest('hex');
}

export function buildHomophoneSeedStatements(pairs = HOMOPHONE_PAIRS): string[] {
  validateHomophonePairs(pairs);
  return pairs.map((item) => {
    const columns = [
      'level', 'word_a_id', 'word_b_id', 'word_a_source_code', 'word_b_source_code',
      'note_ko', 'accent_source', 'accent_source_url', 'accent_a', 'accent_b',
      'example_a_ja', 'example_a_ko', 'example_b_ja', 'example_b_ko', 'reviewer', 'reviewed_at',
    ].map((column) => `\`${column}\``).join(', ');
    const selectValues = [
      esc(item.level), 'va.id', 'vb.id', esc(item.wordA.sourceCode), esc(item.wordB.sourceCode),
      esc(item.noteKo), esc(item.accentSource), esc(item.accentSourceUrl),
      esc(item.wordA.accent), esc(item.wordB.accent),
      esc(item.wordA.exampleJa), esc(item.wordA.exampleKo),
      esc(item.wordB.exampleJa), esc(item.wordB.exampleKo), esc(item.reviewer), esc(item.reviewedAt),
    ].join(', ');
    const updateColumns = [
      'level', 'word_a_source_code', 'word_b_source_code', 'note_ko', 'accent_source',
      'accent_source_url', 'accent_a', 'accent_b', 'example_a_ja', 'example_a_ko',
      'example_b_ja', 'example_b_ko', 'reviewer', 'reviewed_at',
    ].map((column) => `\`${column}\` = excluded.\`${column}\``).join(',\n  ');

    return [
      `INSERT INTO \`homophone_pairs\` (${columns})`,
      `SELECT ${selectValues}`,
      'FROM \`vocab\` va',
      'JOIN \`vocab\` vb',
      `WHERE va.level = ${esc(item.wordA.level)} AND va.ja = ${esc(item.wordA.ja)} AND va.kana = ${esc(item.wordA.kana)}`,
      `  AND vb.level = ${esc(item.wordB.level)} AND vb.ja = ${esc(item.wordB.ja)} AND vb.kana = ${esc(item.wordB.kana)}`,
      'ON CONFLICT(`word_a_id`, `word_b_id`) DO UPDATE SET',
      `  ${updateColumns};`,
    ].join('\n');
  });
}
