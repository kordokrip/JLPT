import { esc } from './utils.js';
import {
  JLPT_N3_PRACTICE_SOURCE_EVIDENCE_HASH,
  JLPT_N3_PRACTICE_SOURCE_SHA256,
  type LocalizedText,
  type IndependentReviewLedger,
  type PendingReview,
  requireIndependentReview,
} from './jlpt-n3-practice-bank-v1.js';

export const TOPIK_OWNER_BATCH_5_SOURCE_CODE = 'TOPIK-A5';
export const TOPIK_OWNER_BATCH_5_SOURCE_ASSET_ID = 'source-asset:topik-owner-authored-grades-1-2-batch-5-2026-08-19';
export const TOPIK_OWNER_BATCH_5_SOURCE_PATH = 'packages/db/src/content/jlpt-n3-topik-owner-expansion-source.md';

type Section = 'vocab' | 'grammar' | 'reading' | 'listening' | 'writing';

export interface TopikOwnerBatch5Draft {
  id: string;
  grade: 1 | 2;
  section: Section;
  sequence: 1 | 2;
  title: LocalizedText;
  prompt: LocalizedText;
  choices?: readonly LocalizedText[];
  answer_index?: number;
  rubric?: LocalizedText;
  explanation: LocalizedText;
  audio_text_ko: string | null;
  speech_provider: 'google-browser' | 'unavailable';
  authorship: 'self-authored';
  source_evidence_hash: string;
  reviews: readonly [PendingReview, PendingReview];
  release_state: 'draft';
}

const t = (ko: string, ja: string, en: string): LocalizedText => ({ ko, ja, en });
const reviews = (): readonly [PendingReview, PendingReview] => [
  { reviewer_slot: 'adversarial-1', status: 'pending' },
  { reviewer_slot: 'adversarial-2', status: 'pending' },
];

const draft = (
  grade: 1 | 2,
  section: Section,
  sequence: 1 | 2,
  title: LocalizedText,
  prompt: LocalizedText,
  explanation: LocalizedText,
  options: { choices?: readonly LocalizedText[]; answerIndex?: number; audioTextKo?: string; rubric?: LocalizedText } = {},
): TopikOwnerBatch5Draft => {
  const base = {
    id: `topik-owner-batch5-grade${grade}-${section}-${sequence}`,
    grade,
    section,
    sequence,
    title,
    prompt,
    explanation,
  audio_text_ko: section === 'listening' ? options.audioTextKo ?? null : null,
  speech_provider: section === 'listening' ? 'google-browser' as const : 'unavailable' as const,
    authorship: 'self-authored' as const,
    source_evidence_hash: JLPT_N3_PRACTICE_SOURCE_EVIDENCE_HASH,
    reviews: reviews(),
    release_state: 'draft' as const,
  };
  if (!options.choices) {
    if (!options.rubric) throw new Error(`Constructed-response item is missing a multilingual rubric: ${base.id}`);
    return { ...base, rubric: options.rubric };
  }
  if (options.answerIndex === undefined) throw new Error(`Choice item is missing answer index: ${base.id}`);
  return { ...base, choices: options.choices, answer_index: options.answerIndex };
};

const choiceSet = (...choices: [LocalizedText, LocalizedText, LocalizedText, LocalizedText]) => choices;

export const TOPIK_OWNER_BATCH_5: readonly TopikOwnerBatch5Draft[] = [
  draft(1, 'vocab', 1, t('생활 장소', '生活の場所', 'Everyday place'), t('책을 읽거나 빌리는 곳은 어디입니까?', '本を読んだり借りたりする場所はどこですか。', 'Where do people read or borrow books?'), t('도서관에서는 책을 읽고 빌릴 수 있습니다.', '図書館では本を読んだり借りたりできます。', 'People can read and borrow books at a library.'), { choices: choiceSet(t('도서관', '図書館', 'library'), t('약국', '薬局', 'pharmacy'), t('식당', '食堂', 'restaurant'), t('은행', '銀行', 'bank')), answerIndex: 0 }),
  draft(1, 'vocab', 2, t('날씨 표현', '天気の表現', 'Weather expression'), t('하늘에서 물방울이 떨어지는 날씨는 무엇입니까?', '空から水滴が落ちる天気は何ですか。', 'Which weather has drops of water falling from the sky?'), t('비는 하늘에서 물방울이 떨어지는 날씨입니다.', '雨は空から水滴が落ちる天気です。', 'Rain is weather in which water drops fall from the sky.'), { choices: choiceSet(t('눈', '雪', 'snow'), t('비', '雨', 'rain'), t('바람', '風', 'wind'), t('안개', '霧', 'fog')), answerIndex: 1 }),
  draft(1, 'grammar', 1, t('예요와 이에요', '예요・이에요', '예요 and 이에요'), t('빈칸에 알맞은 말을 고르세요. 이것은 제 가방___ .', '空欄に合う表現を選んでください。이것은 제 가방___ .', 'Choose the correct ending: 이것은 제 가방___ .'), t('가방은 받침이 있으므로 이에요를 씁니다.', '가방にはパッチムがあるので「이에요」を使います。', '가방 ends in a consonant, so 이에요 is used.'), { choices: choiceSet(t('예요', '예요', '예요'), t('에서', '에서', '에서'), t('이에요', '이에요', '이에요'), t('하고', '하고', '하고')), answerIndex: 2 }),
  draft(1, 'grammar', 2, t('고 싶어요', '〜したいです', 'Want to'), t('희망을 나타내도록 문장을 완성하세요. 저는 주말에 영화를 보___ .', '希望を表すように文を完成させてください。저는 주말에 영화를 보___ .', 'Complete the sentence to express a wish: 저는 주말에 영화를 보___ .'), t('희망을 말할 때 동사 뒤에 고 싶어요를 씁니다.', '希望を表すとき、動詞の後に「고 싶어요」を使います。', 'Use 고 싶어요 after a verb to express a wish.'), { choices: choiceSet(t('았어요', '았어요', '았어요'), t('지만', '지만', '지만'), t('에서', '에서', '에서'), t('고 싶어요', '고 싶어요', '고 싶어요')), answerIndex: 3 }),
  draft(1, 'reading', 1, t('가게 휴무 안내', '店の休業案内', 'Shop closure notice'), t('안내: 오늘은 가게가 쉽니다. 내일 오전 아홉 시에 문을 엽니다. 가게는 언제 다시 엽니까?', '案内：今日は店が休みです。明日の午前九時に開きます。店はいつまた開きますか。', 'Notice: The shop is closed today and opens tomorrow at 9 a.m. When does it reopen?'), t('안내에 내일 오전 아홉 시에 문을 연다고 쓰여 있습니다.', '案内には明日の午前九時に開くと書いてあります。', 'The notice says the shop opens tomorrow at 9 a.m.'), { choices: choiceSet(t('내일 오전 9시', '明日午前九時', 'tomorrow at 9 a.m.'), t('오늘 오전 9시', '今日午前九時', 'today at 9 a.m.'), t('내일 오후 9시', '明日午後九時', 'tomorrow at 9 p.m.'), t('오늘 오후 9시', '今日午後九時', 'today at 9 p.m.')), answerIndex: 0 }),
  draft(1, 'reading', 2, t('수업 준비 안내', '授業の準備案内', 'Class preparation notice'), t('안내: 내일 미술 시간에는 색연필이 필요합니다. 학생은 무엇을 가져와야 합니까?', '案内：明日の美術の時間には色鉛筆が必要です。学生は何を持って来ますか。', 'Notice: Colored pencils are needed for tomorrow\'s art class. What should students bring?'), t('미술 시간에 색연필이 필요하다고 했습니다.', '美術の時間に色鉛筆が必要だと書いてあります。', 'The notice says colored pencils are needed for art class.'), { choices: choiceSet(t('공책', 'ノート', 'notebook'), t('색연필', '色鉛筆', 'colored pencils'), t('우산', '傘', 'umbrella'), t('운동화', '運動靴', 'sneakers')), answerIndex: 1 }),
  draft(1, 'listening', 1, t('버스 시간 듣기', 'バスの時間を聞く', 'Listening for a bus time'), t('다음 버스는 몇 시에 옵니까?', '次のバスは何時に来ますか。', 'What time does the next bus arrive?'), t('안내에서 다음 버스가 열한 시 삼십 분에 온다고 했습니다.', '案内では次のバスが十一時三十分に来ると言っています。', 'The announcement says the next bus arrives at 11:30.'), { choices: choiceSet(t('10시 30분', '十時三十分', '10:30'), t('11시', '十一時', '11:00'), t('11시 30분', '十一時三十分', '11:30'), t('12시', '十二時', '12:00')), answerIndex: 2, audioTextKo: '다음 버스는 열한 시 삼십 분에 도착합니다. 잠시만 기다려 주세요.' }),
  draft(1, 'listening', 2, t('주문 듣기', '注文を聞く', 'Listening to an order'), t('손님은 무엇을 주문합니까?', '客は何を注文しますか。', 'What does the customer order?'), t('손님은 따뜻한 차 한 잔을 주문했습니다.', '客は温かいお茶を一杯注文しました。', 'The customer ordered one cup of hot tea.'), { choices: choiceSet(t('찬물', '冷たい水', 'cold water'), t('커피 두 잔', 'コーヒー二杯', 'two coffees'), t('주스 한 잔', 'ジュース一杯', 'one juice'), t('따뜻한 차 한 잔', '温かいお茶一杯', 'one hot tea')), answerIndex: 3, audioTextKo: '저는 커피 말고 따뜻한 차 한 잔 주세요.' }),
  draft(1, 'writing', 1, t('자기소개 쓰기', '自己紹介を書く', 'Writing a self-introduction'), t('이름과 사는 곳을 넣어 자기소개를 두 문장으로 쓰세요.', '名前と住んでいる場所を入れて、自己紹介を二文で書いてください。', 'Write a two-sentence self-introduction with your name and where you live.'), t('예: 저는 민수예요. 서울에 살아요.', '例：私はミンスです。ソウルに住んでいます。', 'Example: 저는 민수예요. 서울에 살아요.'), { rubric: t('정확히 두 문장을 쓰고 이름과 현재 사는 곳을 모두 알아볼 수 있게 표현합니다.', '正確に二文を書き、名前と現在住んでいる場所の両方が分かるように表現します。', 'Write exactly two comprehensible sentences that state both a name and the current place of residence.') }),
  draft(1, 'writing', 2, t('시간 약속 쓰기', '時間の約束を書く', 'Writing an appointment'), t('친구에게 만날 시간과 장소를 한 문장으로 쓰세요.', '友達に会う時間と場所を一文で書いてください。', 'Write one sentence telling a friend when and where to meet.'), t('예: 내일 오후 두 시에 도서관 앞에서 만나요.', '例：明日の午後二時に図書館の前で会いましょう。', 'Example: 내일 오후 두 시에 도서관 앞에서 만나요.'), { rubric: t('한 문장 안에 만날 시간과 구체적인 장소를 모두 포함하고 친구에게 자연스럽게 제안합니다.', '一文の中に会う時間と具体的な場所をどちらも含め、友達に自然に提案します。', 'Use one natural sentence that includes both a meeting time and a specific place.') }),

  draft(2, 'vocab', 1, t('교통 어휘', '交通語彙', 'Transport vocabulary'), t('버스나 지하철을 다른 것으로 바꾸어 타는 것은 무엇입니까?', 'バスや地下鉄を別のものに乗り換えることは何ですか。', 'What is changing from one bus or train to another?'), t('환승은 이용하던 교통수단에서 다른 교통수단으로 바꾸어 타는 것입니다.', '「환승」は利用中の交通手段から別の交通手段へ乗り換えることです。', '환승 means transferring from one form of transport to another.'), { choices: choiceSet(t('환승', '乗り換え', 'transfer'), t('예약', '予約', 'reservation'), t('출석', '出席', 'attendance'), t('포장', '包装', 'packaging')), answerIndex: 0 }),
  draft(2, 'vocab', 2, t('건강 어휘', '健康語彙', 'Health vocabulary'), t('의사가 정한 시간에 병원에 가기로 미리 약속하는 것은 무엇입니까?', '医師が決めた時間に病院へ行くことを前もって約束するのは何ですか。', 'What is arranging in advance to visit a doctor at a set time?'), t('병원에 갈 시간을 미리 정하는 것은 진료 예약입니다.', '病院へ行く時間を前もって決めることは診療の予約です。', 'Setting a hospital visit time in advance is a medical appointment.'), { choices: choiceSet(t('검사', '検査', 'test'), t('진료 예약', '診療予約', 'medical appointment'), t('운동', '運動', 'exercise'), t('휴식', '休息', 'rest')), answerIndex: 1 }),
  draft(2, 'grammar', 1, t('아/어서 이유', '아/어서で理由', 'Reason with 아/어서'), t('늦은 이유를 나타내도록 문장을 완성하세요. 길이 ___ 약속에 늦었습니다.', '遅れた理由を表すように文を完成させてください。길이 ___ 약속에 늦었습니다.', 'Complete the sentence so the blank gives the reason for being late: 길이 ___ 약속에 늦었습니다.'), t('길이 막힌 이유와 늦은 결과를 연결하므로 막혀서가 알맞습니다.', '道が混んだ理由と遅れた結果をつなぐので「막혀서」が適切です。', '막혀서 correctly connects the congestion to being late.'), { choices: choiceSet(t('막지만', '막지만', '막지만'), t('막으려고', '막으려고', '막으려고'), t('막혀서', '막혀서', '막혀서'), t('막을까요', '막을까요', '막을까요')), answerIndex: 2 }),
  draft(2, 'grammar', 2, t('으려고 하다', '〜しようと思う', 'Intend to'), t('빈칸에 알맞은 말을 고르세요. 이번 방학에 한국어 수업을 들___ 합니다.', '空欄に合う表現を選んでください。이번 방학에 한국어 수업을 들___ 합니다.', 'Choose the correct expression: 이번 방학에 한국어 수업을 들___ 합니다.'), t('계획이나 의도를 말하므로 들으려고 합니다가 알맞습니다.', '計画や意図を表すので「들으려고 합니다」が適切です。', '들으려고 합니다 correctly expresses an intention.'), { choices: choiceSet(t('으면', '으면', '으면'), t('으니까', '으니까', '으니까'), t('은 적이', '은 적이', '은 적이'), t('으려고', '으려고', '으려고')), answerIndex: 3 }),
  draft(2, 'reading', 1, t('도서관 이용 안내', '図書館利用案内', 'Library use notice'), t('안내: 반납함은 도서관이 문을 닫은 뒤에도 이용할 수 있습니다. 밤에 책을 돌려주려면 어떻게 해야 합니까?', '案内：返却箱は図書館が閉まった後も利用できます。夜に本を返すにはどうしますか。', 'Notice: The return box can be used after the library closes. How can a book be returned at night?'), t('문을 닫은 뒤에는 반납함에 책을 넣으면 됩니다.', '閉館後は返却箱に本を入れればよいです。', 'After closing, the book can be placed in the return box.'), { choices: choiceSet(t('반납함에 넣는다', '返却箱に入れる', 'put it in the return box'), t('다음 달까지 기다린다', '来月まで待つ', 'wait until next month'), t('서점에 가져간다', '書店へ持って行く', 'take it to a bookstore'), t('친구에게 준다', '友達に渡す', 'give it to a friend')), answerIndex: 0 }),
  draft(2, 'reading', 2, t('회의 일정 안내', '会議日程の案内', 'Meeting schedule notice'), t('안내: 회의 자료는 화요일까지 이메일로 보내고, 회의는 목요일 오전에 합니다. 자료는 언제까지 보내야 합니까?', '案内：会議資料は火曜日までにメールで送り、会議は木曜日の午前に行います。資料はいつまでに送りますか。', 'Notice: Email the materials by Tuesday; the meeting is Thursday morning. When are the materials due?'), t('회의 날짜와 달리 자료 마감은 화요일입니다.', '会議の日と異なり、資料の締め切りは火曜日です。', 'Unlike the meeting date, the materials deadline is Tuesday.'), { choices: choiceSet(t('월요일', '月曜日', 'Monday'), t('화요일', '火曜日', 'Tuesday'), t('목요일', '木曜日', 'Thursday'), t('금요일', '金曜日', 'Friday')), answerIndex: 1 }),
  draft(2, 'listening', 1, t('진료 순서 듣기', '診療順序を聞く', 'Listening for clinic steps'), t('환자는 먼저 무엇을 해야 합니까?', '患者は最初に何をしなければなりませんか。', 'What must the patient do first?'), t('먼저 접수표를 쓰고 그다음에 기다리라고 했습니다.', '最初に受付票を書き、その後で待つように言っています。', 'The patient is told to fill out the reception form before waiting.'), { choices: choiceSet(t('약을 먹는다', '薬を飲む', 'take medicine'), t('진료실에 들어간다', '診察室に入る', 'enter the examination room'), t('접수표를 쓴다', '受付票を書く', 'fill out the reception form'), t('집에 돌아간다', '家に帰る', 'go home')), answerIndex: 2, audioTextKo: '처음 오셨으면 이 접수표를 먼저 써 주세요. 다 쓰신 뒤에 이름을 부를 때까지 기다리시면 됩니다.' }),
  draft(2, 'listening', 2, t('배송 안내 듣기', '配送案内を聞く', 'Listening to a delivery notice'), t('물건은 언제 도착합니까?', '品物はいつ届きますか。', 'When will the item arrive?'), t('주문한 물건은 금요일 오후에 도착할 예정입니다.', '注文した品物は金曜日の午後に届く予定です。', 'The ordered item is scheduled to arrive Friday afternoon.'), { choices: choiceSet(t('오늘 오전', '今日の午前', 'this morning'), t('수요일 저녁', '水曜日の夕方', 'Wednesday evening'), t('목요일 오전', '木曜日の午前', 'Thursday morning'), t('금요일 오후', '金曜日の午後', 'Friday afternoon')), answerIndex: 3, audioTextKo: '고객님이 주문하신 물건은 금요일 오후에 도착할 예정입니다. 집에 안 계시면 문 앞에 두겠습니다.' }),
  draft(2, 'writing', 1, t('예약 변경 요청', '予約変更の依頼', 'Requesting an appointment change'), t('병원에 예약 시간을 바꾸고 싶다는 정중한 문장을 두 문장으로 쓰세요.', '病院に予約時間を変更したいという丁寧な文を二文で書いてください。', 'Write two polite sentences asking a clinic to change an appointment time.'), t('예: 안녕하세요. 금요일 예약을 다음 주 월요일로 바꿀 수 있을까요?', '例：こんにちは。金曜日の予約を来週の月曜日に変更できますか。', 'Example: 안녕하세요. 금요일 예약을 다음 주 월요일로 바꿀 수 있을까요?'), { rubric: t('정확히 두 문장을 사용하고, 현재 예약과 희망하는 새 일정을 정중한 표현으로 전달합니다.', '正確に二文を使い、現在の予約と希望する新しい日時を丁寧に伝えます。', 'Use exactly two polite sentences that identify the current appointment and the requested new date or time.') }),
  draft(2, 'writing', 2, t('경험 쓰기', '経験を書く', 'Writing about an experience'), t('한국어를 공부하면서 도움이 된 방법을 이유와 함께 두 문장으로 쓰세요.', '韓国語を勉強しながら役に立った方法を、理由とともに二文で書いてください。', 'Write two sentences about a helpful Korean study method and why it helped.'), t('예: 저는 매일 짧은 문장을 소리 내어 읽었습니다. 발음과 단어를 함께 기억하는 데 도움이 되었습니다.', '例：私は毎日短い文を声に出して読みました。発音と単語を一緒に覚えるのに役立ちました。', 'Example: 저는 매일 짧은 문장을 소리 내어 읽었습니다. 발음과 단어를 함께 기억하는 데 도움이 되었습니다.'), { rubric: t('정확히 두 문장을 쓰고, 첫 문장에 구체적인 공부 방법을, 둘째 문장에 그 방법이 도움이 된 이유를 설명합니다.', '正確に二文を書き、一文目に具体的な学習方法、二文目にその方法が役立った理由を説明します。', 'Write exactly two sentences: name a specific study method first, then explain why it helped.') }),
] as const;

function stableRef(item: TopikOwnerBatch5Draft): string {
  return `topik:owner:batch5:grade${item.grade}:${item.section}:${item.sequence}`;
}

function unitId(item: TopikOwnerBatch5Draft): string {
  return `${item.id}-unit`;
}

function answerJson(item: TopikOwnerBatch5Draft): string {
  if (!item.choices) {
    if (!item.rubric) throw new Error(`Constructed-response item is missing a multilingual rubric: ${item.id}`);
    return JSON.stringify({
      sample_answer_ko: item.explanation.ko.replace(/^예: /u, ''),
      sample_answer_ja: item.explanation.ja.replace(/^例：/u, ''),
      sample_answer_en: item.explanation.en.replace(/^Example: /u, ''),
      rubric_ko: item.rubric.ko,
      rubric_ja: item.rubric.ja,
      rubric_en: item.rubric.en,
    });
  }
  return JSON.stringify({
    choices: item.choices.map((choice) => choice.ko),
    choices_ko: item.choices.map((choice) => choice.ko),
    choices_ja: item.choices.map((choice) => choice.ja),
    choices_en: item.choices.map((choice) => choice.en),
    answer_index: item.answer_index,
  });
}

export function buildTopikOwnerBatch5Statements(ledger: IndependentReviewLedger): string[] {
  for (const item of TOPIK_OWNER_BATCH_5) {
    requireIndependentReview(item.id, item.answer_index ?? null, ledger);
  }
  const sourceStatements = [
    [
      'INSERT INTO `sources` (`code`, `title`, `file_path`, `version`)',
      `VALUES (${esc(TOPIK_OWNER_BATCH_5_SOURCE_CODE)}, 'TOPIK 1~2급 자체 저작 Batch 5', ${esc(TOPIK_OWNER_BATCH_5_SOURCE_PATH)}, 'source-v4-${JLPT_N3_PRACTICE_SOURCE_EVIDENCE_HASH.slice(0, 16)}')`,
      'ON CONFLICT(`code`) DO UPDATE SET `title` = excluded.`title`, `file_path` = excluded.`file_path`, `version` = excluded.`version`, `updated_at` = unixepoch();',
    ].join('\n'),
    [
      'INSERT OR IGNORE INTO `content_source_assets`',
      '  (`id`, `asset_kind`, `source_url`, `license_id`, `license_url`, `attribution_text`, `allowed_use`, `source_sha256`, `generated_at`, `selection_reason`)',
      `VALUES (${esc(TOPIK_OWNER_BATCH_5_SOURCE_ASSET_ID)}, 'self-authored-fixture', 'https://github.com/kordokrip/JLPT/blob/main/${TOPIK_OWNER_BATCH_5_SOURCE_PATH}', 'LicenseRef-nihongo-n3-self-authored', 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#학습-콘텐츠와-provenance',`,
      "  '© Nihongo N3 contributors; self-authored TOPIK owner curriculum.',",
      "  'Self-authored personal learning content; not official TOPIK material.',",
      `  ${esc(JLPT_N3_PRACTICE_SOURCE_SHA256)}, 1787068800, 'Independently reviewed TOPIK grade 1-2 owner curriculum; Google browser speech only; R2 pronunciation prohibited.');`,
    ].join('\n'),
  ];
  return [
    ...sourceStatements,
    ...TOPIK_OWNER_BATCH_5.flatMap((item) => [
      [
        'INSERT OR IGNORE INTO `topik_owner_authored_curriculum_units`',
        '  (`id`, `target_grade`, `stable_ref`, `section`, `title_ko`, `title_ja`, `title_en`, `source_asset_id`)',
        `VALUES (${esc(unitId(item))}, ${item.grade}, ${esc(`${stableRef(item)}:unit`)}, ${esc(item.section)}, ${esc(item.title.ko)}, ${esc(item.title.ja)}, ${esc(item.title.en)}, ${esc(TOPIK_OWNER_BATCH_5_SOURCE_ASSET_ID)});`,
      ].join('\n'),
      [
        'INSERT OR IGNORE INTO `topik_owner_authored_curriculum_items`',
        '  (`id`, `unit_id`, `target_grade`, `stable_ref`, `item_type`, `prompt_ko`, `prompt_ja`, `prompt_en`, `answer_json`, `explanation_ko`, `explanation_ja`, `explanation_en`, `audio_required`, `audio_text_ko`, `source_asset_id`)',
        `VALUES (${esc(item.id)}, ${esc(unitId(item))}, ${item.grade}, ${esc(stableRef(item))}, ${esc(item.section)}, ${esc(item.prompt.ko)}, ${esc(item.prompt.ja)}, ${esc(item.prompt.en)}, ${esc(answerJson(item))}, ${esc(item.explanation.ko)}, ${esc(item.explanation.ja)}, ${esc(item.explanation.en)}, ${item.section === 'listening' ? 1 : 0}, ${item.audio_text_ko ? esc(item.audio_text_ko) : 'NULL'}, ${esc(TOPIK_OWNER_BATCH_5_SOURCE_ASSET_ID)});`,
      ].join('\n'),
      [
        'INSERT OR IGNORE INTO `learning_content_stable_refs`',
        '  (`stable_ref`, `learning_track`, `item_type`, `item_id`, `level_tag`, `source_asset_id`)',
        `VALUES (${esc(stableRef(item))}, 'topik-ko', 'topik-owner-item', ${esc(item.id)}, ${esc(`TOPIK-${item.grade}`)}, ${esc(TOPIK_OWNER_BATCH_5_SOURCE_ASSET_ID)});`,
      ].join('\n'),
      ...(item.section === 'listening' ? [[
          'INSERT OR IGNORE INTO `content_speech_bindings`',
          '  (`id`, `stable_ref`, `item_type`, `item_id`, `language`, `speech_role`, `provider`, `binding_state`, `text_source`, `unavailable_reason`)',
          `VALUES (${esc(`speech-binding:${stableRef(item)}`)}, ${esc(stableRef(item))}, 'topik-owner-item', ${esc(item.id)}, 'ko', 'listening', 'google-browser', 'ready', 'audio-script', NULL);`,
        ].join('\n')] : []),
    ]),
  ];
}

export function buildTopikOwnerBatch5Plan(ledger: IndependentReviewLedger) {
  const statements = buildTopikOwnerBatch5Statements(ledger);
  return {
    statements,
    manifest: {
      sourceCode: TOPIK_OWNER_BATCH_5_SOURCE_CODE,
      sourceAssetId: TOPIK_OWNER_BATCH_5_SOURCE_ASSET_ID,
      sourcePath: TOPIK_OWNER_BATCH_5_SOURCE_PATH,
      sourceSha256: JLPT_N3_PRACTICE_SOURCE_SHA256,
      sourceEvidenceSha256: JLPT_N3_PRACTICE_SOURCE_EVIDENCE_HASH,
      counts: {
        units: 20,
        items: 20,
        stableRefs: 20,
        speechBindings: 4,
        contentRows: 40,
      },
      releaseState: 'draft' as const,
      reviewerState: 'pending' as const,
    },
  };
}

export function topikOwnerBatch5ContentRowsSql(): string {
  return `SELECT (SELECT count(*) FROM topik_owner_authored_curriculum_units WHERE source_asset_id = ${esc(TOPIK_OWNER_BATCH_5_SOURCE_ASSET_ID)}) + (SELECT count(*) FROM topik_owner_authored_curriculum_items WHERE source_asset_id = ${esc(TOPIK_OWNER_BATCH_5_SOURCE_ASSET_ID)}) AS count;`;
}
