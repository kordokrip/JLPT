import { esc, escJson } from './utils.js';

export const JLPT_N3_PRACTICE_BANK_VERSION = 'jlpt-n3-practice-v1';
export const JLPT_N3_PRACTICE_SOURCE_EVIDENCE_HASH = '54f98c5ec66d205b6f13e97edacd0480d4a07471a74fed6097832f40aa227d77';
export const JLPT_N3_PRACTICE_SOURCE_SHA256 = '16d6ace591dccf6815ccfb5197a5415ff4d57c41b7eacc942af57894a8508608';
export const JLPT_N3_PRACTICE_SOURCE_CODE = 'JLPT-N3-P1';
export const JLPT_N3_PRACTICE_SOURCE_ASSET_ID = 'source-asset:jlpt-n3-practice-v1-self-authored-2026-08-19';

export type LocalizedText = { ko: string; ja: string; en: string };
export type PendingReview = { reviewer_slot: 'adversarial-1' | 'adversarial-2'; status: 'pending' };
export type JlptN3PracticeMode = 'kanji_reading' | 'listening';

export interface ItemReviewDecision {
  reviewer_id: string;
  verdict: 'approved';
  answer_index: number | null;
  explanation_consistent: true;
  reviewed_at: string;
}

export type IndependentItemReview = readonly [ItemReviewDecision, ItemReviewDecision];
export type IndependentReviewLedger = Readonly<Record<string, IndependentItemReview>>;

export interface JlptN3PracticeDraft {
  id: string;
  level: 'N3';
  mode: JlptN3PracticeMode;
  prompt: LocalizedText;
  choices: readonly LocalizedText[];
  answer_index: number;
  explanation: LocalizedText;
  audio_script_ja: string | null;
  speech_provider: 'google-browser' | 'unavailable';
  source_evidence_hash: string;
  bank_version: typeof JLPT_N3_PRACTICE_BANK_VERSION;
  authorship: 'self-authored';
  reviews: readonly [PendingReview, PendingReview];
  is_published: 0;
}

type KanjiSpec = readonly [word: string, reading: string, meaningKo: string, meaningEn: string];

const KANJI_SPECS: readonly KanjiSpec[] = [
  ['予定', 'よてい', '예정', 'plan'], ['準備', 'じゅんび', '준비', 'preparation'], ['経験', 'けいけん', '경험', 'experience'], ['関係', 'かんけい', '관계', 'relationship'],
  ['説明', 'せつめい', '설명', 'explanation'], ['必要', 'ひつよう', '필요', 'necessity'], ['利用', 'りよう', '이용', 'use'], ['連絡', 'れんらく', '연락', 'contact'],
  ['相談', 'そうだん', '상담', 'consultation'], ['参加', 'さんか', '참가', 'participation'], ['注意', 'ちゅうい', '주의', 'attention'], ['予約', 'よやく', '예약', 'reservation'],
  ['都合', 'つごう', '형편', 'convenience'], ['場合', 'ばあい', '경우', 'case'], ['最近', 'さいきん', '최근', 'recently'], ['以前', 'いぜん', '이전', 'before'],
  ['以外', 'いがい', '이외', 'except'], ['最初', 'さいしょ', '처음', 'beginning'], ['最後', 'さいご', '마지막', 'end'], ['途中', 'とちゅう', '도중', 'on the way'],
  ['遅刻', 'ちこく', '지각', 'lateness'], ['到着', 'とうちゃく', '도착', 'arrival'], ['出発', 'しゅっぱつ', '출발', 'departure'], ['交通', 'こうつう', '교통', 'transportation'],
  ['運転', 'うんてん', '운전', 'driving'], ['事故', 'じこ', '사고', 'accident'], ['道路', 'どうろ', '도로', 'road'], ['地震', 'じしん', '지진', 'earthquake'],
  ['台風', 'たいふう', '태풍', 'typhoon'], ['天気', 'てんき', '날씨', 'weather'], ['季節', 'きせつ', '계절', 'season'], ['気温', 'きおん', '기온', 'temperature'],
  ['習慣', 'しゅうかん', '습관', 'habit'], ['生活', 'せいかつ', '생활', 'daily life'], ['健康', 'けんこう', '건강', 'health'], ['運動', 'うんどう', '운동', 'exercise'],
  ['食事', 'しょくじ', '식사', 'meal'], ['睡眠', 'すいみん', '수면', 'sleep'], ['病院', 'びょういん', '병원', 'hospital'], ['薬局', 'やっきょく', '약국', 'pharmacy'],
  ['受付', 'うけつけ', '접수처', 'reception'], ['会議', 'かいぎ', '회의', 'meeting'], ['資料', 'しりょう', '자료', 'materials'], ['書類', 'しょるい', '서류', 'documents'],
  ['会社', 'かいしゃ', '회사', 'company'], ['工場', 'こうじょう', '공장', 'factory'], ['店員', 'てんいん', '점원', 'store clerk'], ['商品', 'しょうひん', '상품', 'product'],
  ['価格', 'かかく', '가격', 'price'], ['費用', 'ひよう', '비용', 'cost'], ['無料', 'むりょう', '무료', 'free of charge'], ['有料', 'ゆうりょう', '유료', 'paid'],
  ['文化', 'ぶんか', '문화', 'culture'], ['歴史', 'れきし', '역사', 'history'], ['社会', 'しゃかい', '사회', 'society'], ['政治', 'せいじ', '정치', 'politics'],
  ['経済', 'けいざい', '경제', 'economy'], ['環境', 'かんきょう', '환경', 'environment'], ['教育', 'きょういく', '교육', 'education'], ['技術', 'ぎじゅつ', '기술', 'technology'],
] as const;

type ListeningGroup = {
  id: string;
  title: LocalizedText;
  question: LocalizedText;
  choices: readonly [LocalizedText, LocalizedText, LocalizedText, LocalizedText];
  scripts: readonly [string, string, string, string];
};

const t = (ko: string, ja: string, en: string): LocalizedText => ({ ko, ja, en });

const LISTENING_GROUPS: readonly ListeningGroup[] = [
  { id: 'meeting-place', title: t('만날 장소', '待ち合わせ場所', 'Meeting place'), question: t('두 사람은 어디에서 만나기로 합니까?', '二人はどこで会うことにしましたか。', 'Where will the two people meet?'), choices: [t('역 앞', '駅前', 'in front of the station'), t('도서관 입구', '図書館の入口', 'at the library entrance'), t('카페 안', 'カフェの中', 'inside the cafe'), t('시청 로비', '市役所のロビー', 'in the city hall lobby')], scripts: ['雨が降りそうですね。外ではなく、駅前の屋根の下で会いましょう。', '本を返してから出かけたいです。では、図書館の入口で会いましょう。', '外は暑いので、駅ではなくカフェの中で待っています。', '書類を出す用事があります。市役所のロビーで会って、そのあと昼ご飯に行きましょう。'] },
  { id: 'meeting-time', title: t('만날 시간', '待ち合わせ時間', 'Meeting time'), question: t('약속 시간은 몇 시입니까?', '約束の時間は何時ですか。', 'What time is the appointment?'), choices: [t('오전 9시', '午前九時', '9 a.m.'), t('오전 10시', '午前十時', '10 a.m.'), t('오후 2시', '午後二時', '2 p.m.'), t('오후 4시', '午後四時', '4 p.m.')], scripts: ['店は十時に開きますが、その前に話したいので午前九時に会いましょう。', '九時は電車が混みます。少し遅くして、午前十時に駅で会いませんか。', '午前は仕事があります。昼ご飯のあと、午後二時なら大丈夫です。', '三時まで授業です。移動時間もあるので、午後四時に会いましょう。'] },
  { id: 'bring-item', title: t('준비물', '持ち物', 'What to bring'), question: t('어떤 물건을 가져가야 합니까?', '何を持って行かなければなりませんか。', 'What must be brought?'), choices: [t('우산', '傘', 'an umbrella'), t('공책', 'ノート', 'a notebook'), t('신분증', '身分証明書', 'identification'), t('회원 카드', '会員カード', 'a membership card')], scripts: ['午後は雨になるそうです。帰りに困らないよう、傘を持ってきてください。', '明日の説明をメモしますから、忘れずにノートを持ってきてください。', '受付で本人確認をします。写真の付いた身分証明書を持ってきてください。', '本を借りるときに必要ですから、図書館の会員カードを持ってきてください。'] },
  { id: 'first-task', title: t('먼저 할 일', '最初の作業', 'First task'), question: t('먼저 무엇을 해야 합니까?', '最初に何をしなければなりませんか。', 'What must be done first?'), choices: [t('이메일 보내기', 'メールを送る', 'send an email'), t('고객에게 전화하기', '客に電話する', 'call the customer'), t('자료 복사하기', '資料をコピーする', 'copy the materials'), t('담당자에게 묻기', '担当者に聞く', 'ask the person in charge')], scripts: ['会議の時間が変わりました。資料より先に、全員へメールを送ってください。', '注文の数が違います。書類を直す前に、まずお客様に電話して確認してください。', '参加者がもう来ます。説明を始める前に、資料を二十部コピーしてください。', 'この数字の意味が分かりません。勝手に直さず、まず担当者に聞いてください。'] },
  { id: 'change-reason', title: t('변경 이유', '変更の理由', 'Reason for change'), question: t('일정이 바뀐 이유는 무엇입니까?', '予定が変わった理由は何ですか。', 'Why was the schedule changed?'), choices: [t('비가 와서', '雨が降るため', 'because of rain'), t('담당자가 아파서', '担当者が病気のため', 'because the coordinator is ill'), t('전철이 늦어서', '電車が遅れたため', 'because the train was delayed'), t('회의실을 쓸 수 없어서', '会議室が使えないため', 'because the meeting room is unavailable')], scripts: ['明日の公園清掃は雨の予報なので、来週に変更します。', '今日の説明会ですが、担当者が病気で休んでいるため、金曜日に変更します。', '電車が事故で遅れています。参加者がそろわないので、開始を三十分遅らせます。', '予約した会議室のエアコンが壊れました。別の日に変更させてください。'] },
  { id: 'destination', title: t('목적지', '行き先', 'Destination'), question: t('말하는 사람은 어디에 가려고 합니까?', '話している人はどこへ行こうとしていますか。', 'Where is the speaker going?'), choices: [t('은행', '銀行', 'bank'), t('우체국', '郵便局', 'post office'), t('약국', '薬局', 'pharmacy'), t('슈퍼마켓', 'スーパー', 'supermarket')], scripts: ['家賃を振り込みたいのですが、この近くに銀行はありますか。', 'この荷物を外国へ送りたいので、駅前の郵便局へ行きます。', 'かぜ薬を買いたいのですが、薬局は何時まで開いていますか。', '牛乳と野菜がありません。帰りにスーパーへ寄ります。'] },
  { id: 'purchase', title: t('살 물건', '買う物', 'Purchase'), question: t('말하는 사람은 무엇을 사려고 합니까?', '話している人は何を買おうとしていますか。', 'What is the speaker going to buy?'), choices: [t('빵', 'パン', 'bread'), t('우유', '牛乳', 'milk'), t('건전지', '電池', 'batteries'), t('전철표', '電車の切符', 'a train ticket')], scripts: ['明日の朝のパンがありません。駅の店で買って帰ります。', 'コーヒーに入れる牛乳がないので、一本買ってきます。', '時計が止まりました。新しい電池を二つ買わなければなりません。', '交通カードを忘れたので、券売機で電車の切符を買います。'] },
  { id: 'weekday', title: t('요일', '曜日', 'Day of week'), question: t('수업은 무슨 요일에 있습니까?', '授業は何曜日にありますか。', 'On which day is the class?'), choices: [t('월요일', '月曜日', 'Monday'), t('화요일', '火曜日', 'Tuesday'), t('목요일', '木曜日', 'Thursday'), t('금요일', '金曜日', 'Friday')], scripts: ['水曜日ではありません。週の最初、月曜日の夜に日本語を勉強します。', '月曜日は休みです。授業は次の日の火曜日にあります。', '今週の授業は木曜日です。金曜日と間違えないでください。', '木曜日は先生が出張ですから、授業は金曜日に変更になりました。'] },
  { id: 'transport', title: t('이동 방법', '移動方法', 'Transportation'), question: t('두 사람은 무엇을 타고 갑니까?', '二人は何に乗って行きますか。', 'How will the two people travel?'), choices: [t('버스', 'バス', 'bus'), t('전철', '電車', 'train'), t('자전거', '自転車', 'bicycle'), t('아무것도 타지 않고 걷기', '何も乗らず歩く', 'walk without taking a vehicle')], scripts: ['駅から遠いので、三番乗り場からバスに乗りましょう。', '道路は混んでいます。時間が正確な電車で行きましょう。', '天気もいいし近いですから、二人で自転車に乗って行きませんか。', 'ここから十分だけです。乗り物を使わず、歩いて行きましょう。'] },
  { id: 'lunch', title: t('점심 메뉴', '昼食のメニュー', 'Lunch choice'), question: t('말하는 사람은 점심으로 무엇을 먹습니까?', '話している人は昼ご飯に何を食べますか。', 'What will the speaker eat for lunch?'), choices: [t('카레', 'カレー', 'curry'), t('메밀국수', 'そば', 'soba noodles'), t('샌드위치', 'サンドイッチ', 'a sandwich'), t('도시락', '弁当', 'a boxed lunch')], scripts: ['今日は辛い物が食べたいので、食堂のカレーにします。', '時間はありますが、軽い物がいいです。温かいそばを食べます。', '会議まで十五分しかありません。店でサンドイッチを買います。', '朝、自分で弁当を作ってきたので、外では買いません。'] },
  { id: 'hospital-place', title: t('병원 장소', '病院内の場所', 'Place in hospital'), question: t('다음에 어디로 가야 합니까?', '次にどこへ行かなければなりませんか。', 'Where must the person go next?'), choices: [t('접수처', '受付', 'reception'), t('2층 진료실', '二階の診察室', 'the second-floor examination room'), t('검사실', '検査室', 'the laboratory'), t('약국', '薬局', 'the pharmacy')], scripts: ['初めての方は、診察室へ行く前に一階の受付で名前を書いてください。', '受付は終わりました。次は二階の三番診察室の前でお待ちください。', '先生の診察の前に血液を調べます。廊下の奥の検査室へ行ってください。', '診察はこれで終わりです。この紙を持って、外の薬局へ行ってください。'] },
  { id: 'deadline', title: t('마감일', '締め切り', 'Deadline'), question: t('자료는 언제까지 내야 합니까?', '資料はいつまでに出さなければなりませんか。', 'When are the materials due?'), choices: [t('오늘', '今日', 'today'), t('내일', '明日', 'tomorrow'), t('수요일', '水曜日', 'Wednesday'), t('금요일', '金曜日', 'Friday')], scripts: ['急で申し訳ありませんが、今日の五時までに資料を出してください。', '今日は確認だけします。直した資料は明日の午前中までにお願いします。', '会議は木曜日ですから、その前の日、水曜日までに送ってください。', '今週中に必要です。遅くても金曜日の夕方までに提出してください。'] },
  { id: 'lost-item', title: t('분실물', '忘れ物', 'Lost item'), question: t('말하는 사람이 잃어버린 것은 무엇입니까?', '話している人がなくした物は何ですか。', 'What did the speaker lose?'), choices: [t('우산', '傘', 'umbrella'), t('지갑', '財布', 'wallet'), t('열쇠', '鍵', 'keys'), t('교통 카드', '交通カード', 'transit card')], scripts: ['電車を降りたとき、雨が降っているのに傘がないことに気づきました。', 'お金を払おうとしたら、かばんの中に財布がありませんでした。', '家の前まで来ましたが、ポケットに入れたはずの鍵が見つかりません。', '改札を出ようとしましたが、いつも使う交通カードがありません。'] },
  { id: 'weekend', title: t('주말 활동', '週末の活動', 'Weekend activity'), question: t('말하는 사람은 주말에 무엇을 할 예정입니까?', '話している人は週末に何をする予定ですか。', 'What will the speaker do this weekend?'), choices: [t('박물관 가기', '博物館へ行く', 'visit a museum'), t('등산하기', '山に登る', 'go hiking'), t('영화 보기', '映画を見る', 'watch a movie'), t('집 청소하기', '家を掃除する', 'clean the house')], scripts: ['新しい歴史の展示が始まるので、土曜日に博物館へ行く予定です。', '日曜日は晴れるそうです。友達と朝から山に登ります。', '見たかった映画が今週で終わるので、土曜日に映画館へ行きます。', '今週は忙しくて部屋が散らかりました。週末は家を掃除します。'] },
  { id: 'class-room', title: t('수업 장소', '授業の場所', 'Class location'), question: t('오늘 수업은 어디에서 합니까?', '今日の授業はどこで行いますか。', 'Where is today\'s class?'), choices: [t('201호', '二〇一号室', 'Room 201'), t('305호', '三〇五号室', 'Room 305'), t('도서관', '図書館', 'the library'), t('체육관', '体育館', 'the gymnasium')], scripts: ['いつもの教室は使えません。今日は二階の二〇一号室に集まってください。', '教室が変更になりました。三階の三〇五号室で授業をします。', '本の調べ方を練習するので、今日は教室ではなく図書館に集まります。', '今日は体を動かす活動です。運動できる服で体育館へ来てください。'] },
] as const;

const pendingReviews = (): readonly [PendingReview, PendingReview] => [
  { reviewer_slot: 'adversarial-1', status: 'pending' },
  { reviewer_slot: 'adversarial-2', status: 'pending' },
];

function rotateWithAnswer<T>(correct: T, distractors: readonly T[], answerIndex: number): T[] {
  const choices = [...distractors];
  choices.splice(answerIndex, 0, correct);
  return choices;
}

function buildKanjiItems(): JlptN3PracticeDraft[] {
  return KANJI_SPECS.map(([word, reading, meaningKo, meaningEn], index) => {
    const groupStart = Math.floor(index / 4) * 4;
    const distractors = KANJI_SPECS.slice(groupStart, groupStart + 4)
      .filter(([, candidate]) => candidate !== reading)
      .map(([, candidate]) => t(candidate, candidate, candidate));
    // Shift each four-word block independently. This keeps the exact
    // 15/15/15/15 distribution without making the visible bank order reveal
    // a repeating 1,2,3,4 answer key.
    const answerIndex = (index + Math.floor(index / 4)) % 4;
    return {
      id: `jlpt-n3-p1-kanji-${String(index + 1).padStart(3, '0')}`,
      level: 'N3',
      mode: 'kanji_reading',
      prompt: t(`일본어 단어 「${word}」의 올바른 읽기를 고르세요.`, `「${word}」の正しい読み方を選んでください。`, `Choose the correct reading of 「${word}」.`),
      choices: rotateWithAnswer(t(reading, reading, reading), distractors, answerIndex),
      answer_index: answerIndex,
      explanation: t(`「${word}」는 「${reading}」라고 읽으며 '${meaningKo}'이라는 뜻입니다.`, `「${word}」は「${reading}」と読みます。`, `「${word}」 is read ${reading} and means ${meaningEn}.`),
      audio_script_ja: null,
      speech_provider: 'unavailable',
      source_evidence_hash: JLPT_N3_PRACTICE_SOURCE_EVIDENCE_HASH,
      bank_version: JLPT_N3_PRACTICE_BANK_VERSION,
      authorship: 'self-authored',
      reviews: pendingReviews(),
      is_published: 0,
    };
  });
}

function buildListeningItems(): JlptN3PracticeDraft[] {
  return LISTENING_GROUPS.flatMap((group, groupIndex) => group.scripts.map((_, dialogueIndex) => {
    // The authored source groups scripts by the correct choice. Rotate that
    // mapping per topic so the visible "dialogue 1..4" label cannot disclose
    // the answer position across every topic.
    const answerIndex = (dialogueIndex + groupIndex) % 4;
    const script = group.scripts[answerIndex]!;
    const serial = groupIndex * 4 + dialogueIndex + 1;
    const correct = group.choices[answerIndex]!;
    return {
      id: `jlpt-n3-p1-listening-${String(serial).padStart(3, '0')}`,
      level: 'N3',
      mode: 'listening',
      prompt: t(`${group.title.ko} 대화 ${dialogueIndex + 1}: ${group.question.ko}`, `${group.title.ja}・会話${dialogueIndex + 1}：${group.question.ja}`, `${group.title.en}, dialogue ${dialogueIndex + 1}: ${group.question.en}`),
      choices: group.choices,
      answer_index: answerIndex,
      explanation: t(`대화에서 정답은 '${correct.ko}'이라고 분명히 말합니다.`, `会話では「${correct.ja}」だとはっきり述べています。`, `The dialogue clearly identifies ${correct.en} as the answer.`),
      audio_script_ja: script,
      speech_provider: 'google-browser',
      source_evidence_hash: JLPT_N3_PRACTICE_SOURCE_EVIDENCE_HASH,
      bank_version: JLPT_N3_PRACTICE_BANK_VERSION,
      authorship: 'self-authored',
      reviews: pendingReviews(),
      is_published: 0,
    } satisfies JlptN3PracticeDraft;
  }));
}

export const JLPT_N3_PRACTICE_BANK_V1: readonly JlptN3PracticeDraft[] = [
  ...buildKanjiItems(),
  ...buildListeningItems(),
];

export function requireIndependentReview(
  itemId: string,
  expectedAnswerIndex: number | null,
  ledger: IndependentReviewLedger,
): IndependentItemReview {
  const decisions = ledger[itemId];
  if (!decisions || decisions.length !== 2) throw new Error(`Two independent reviews are required before seeding: ${itemId}`);
  const [first, second] = decisions;
  if (!first || !second || first.reviewer_id.trim() === '' || second.reviewer_id.trim() === '' || first.reviewer_id === second.reviewer_id) {
    throw new Error(`Reviewer identities must be non-empty and distinct: ${itemId}`);
  }
  if (first.verdict !== 'approved' || second.verdict !== 'approved' || !first.explanation_consistent || !second.explanation_consistent) {
    throw new Error(`Both reviewers must approve answer and explanation consistency: ${itemId}`);
  }
  if (first.answer_index !== expectedAnswerIndex || second.answer_index !== expectedAnswerIndex) {
    throw new Error(`Reviewer answer decisions do not match authored answer: ${itemId}`);
  }
  if (![first.reviewed_at, second.reviewed_at].every((date) => /^\d{4}-\d{2}-\d{2}$/u.test(date))) {
    throw new Error(`Reviewer decisions require ISO calendar dates: ${itemId}`);
  }
  return decisions;
}

export function buildJlptN3PracticeBankV1Statements(ledger: IndependentReviewLedger): string[] {
  const sourceStatements = [
    [
      'INSERT INTO `sources` (`code`, `title`, `file_path`, `version`)',
      `VALUES (${esc(JLPT_N3_PRACTICE_SOURCE_CODE)}, 'JLPT N3 자체 저작 Practice Bank V1', 'packages/db/src/content/jlpt-n3-topik-owner-expansion-source.md', ${esc(`source-v4-${JLPT_N3_PRACTICE_SOURCE_SHA256.slice(0, 16)}`)})`,
      'ON CONFLICT(`code`) DO UPDATE SET `title` = excluded.`title`, `file_path` = excluded.`file_path`, `version` = excluded.`version`, `updated_at` = unixepoch();',
    ].join('\n'),
    [
      'INSERT OR IGNORE INTO `content_source_assets`',
      '  (`id`, `asset_kind`, `source_url`, `license_id`, `license_url`, `attribution_text`, `allowed_use`, `source_sha256`, `generated_at`, `selection_reason`)',
      `VALUES (${esc(JLPT_N3_PRACTICE_SOURCE_ASSET_ID)}, 'self-authored-fixture', 'https://github.com/kordokrip/JLPT/blob/main/packages/db/src/content/jlpt-n3-topik-owner-expansion-source.md', 'LicenseRef-nihongo-n3-self-authored', 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#학습-콘텐츠와-provenance',`,
      "  '© Nihongo N3 contributors; self-authored JLPT N3 practice content.',",
      "  'Self-authored personal learning content; not official JLPT material.',",
      `  ${esc(JLPT_N3_PRACTICE_SOURCE_SHA256)}, 1787068800, 'Reviewed JLPT N3 practice draft; Japanese listening uses browser Google speech only; no stored pronunciation audio.');`,
    ].join('\n'),
  ];
  return [...sourceStatements, ...JLPT_N3_PRACTICE_BANK_V1.map((item) => {
    requireIndependentReview(item.id, item.answer_index, ledger);
    return [
    'INSERT INTO `jlpt_practice_questions`',
    '  (`id`, `level`, `mode`, `skill`, `difficulty`, `prompt_ko`, `prompt_ja`, `prompt_en`, `choices_json`, `answer_index`, `explanation_ko`, `explanation_ja`, `explanation_en`, `audio_script_ja`, `source_code`, `source_evidence_sha256`, `bank_version`, `is_published`)',
    `VALUES (${esc(item.id)}, 'N3', ${esc(item.mode)}, ${esc(item.mode === 'kanji_reading' ? 'kanji-reading' : 'listening-comprehension')}, 3, ${esc(item.prompt.ko)}, ${esc(item.prompt.ja)}, ${esc(item.prompt.en)}, ${escJson([...item.choices])}, ${item.answer_index}, ${esc(item.explanation.ko)}, ${esc(item.explanation.ja)}, ${esc(item.explanation.en)}, ${item.audio_script_ja ? esc(item.audio_script_ja) : 'NULL'}, ${esc(JLPT_N3_PRACTICE_SOURCE_CODE)}, ${esc(item.source_evidence_hash)}, ${esc(item.bank_version)}, 0)`,
    'ON CONFLICT(`id`) DO UPDATE SET',
    '  `prompt_ko` = excluded.`prompt_ko`, `prompt_ja` = excluded.`prompt_ja`, `prompt_en` = excluded.`prompt_en`,',
    '  `choices_json` = excluded.`choices_json`, `answer_index` = excluded.`answer_index`,',
    '  `explanation_ko` = excluded.`explanation_ko`, `explanation_ja` = excluded.`explanation_ja`, `explanation_en` = excluded.`explanation_en`,',
    '  `audio_script_ja` = excluded.`audio_script_ja`, `source_evidence_sha256` = excluded.`source_evidence_sha256`,',
    '  `bank_version` = excluded.`bank_version`, `is_published` = 0, `updated_at` = unixepoch();',
    ].join('\n');
  })];
}

export function buildJlptN3PracticeBankV1Plan(ledger: IndependentReviewLedger) {
  return {
    statements: buildJlptN3PracticeBankV1Statements(ledger),
    manifest: {
      sourceCode: JLPT_N3_PRACTICE_SOURCE_CODE,
      sourceAssetId: JLPT_N3_PRACTICE_SOURCE_ASSET_ID,
      sourceEvidenceSha256: JLPT_N3_PRACTICE_SOURCE_EVIDENCE_HASH,
      bankVersion: JLPT_N3_PRACTICE_BANK_VERSION,
      counts: {
        questions: JLPT_N3_PRACTICE_BANK_V1.length,
        kanjiReading: JLPT_N3_PRACTICE_BANK_V1.filter((item) => item.mode === 'kanji_reading').length,
        listening: JLPT_N3_PRACTICE_BANK_V1.filter((item) => item.mode === 'listening').length,
      },
      releaseState: 'reviewed-draft' as const,
    },
  };
}
