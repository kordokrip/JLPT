import type { DraftItem } from "../learning-path-2026-10-11/data.js";
type L = { ko: string; ja: string; en: string };
type I = DraftItem & { context_tag: string };
const l = (ko: string, ja: string, en: string): L => ({ ko, ja, en });
const same = (a: string[]) => a.map((x) => l(x, x, x));
const cueRows: [string, string, string, string][] = [
  [
    "vocab-1",
    "学校（がっこう）は児童・生徒が学ぶ「학교/school」です。会社や駅ではなく、学校へ行く・学校で勉強する場面で思い出します。",
    "学校（がっこう）は児童・生徒が学ぶ場所です。「学校へ行く・学校で勉強する」で思い出します。",
    "学校 (がっこう) means school, where pupils study. Recall 学校へ行く and 学校で勉強する.",
  ],
  [
    "vocab-2",
    "先生（せんせい）は 가르치는 사람/teacher를 부르는 말입니다. 学生과 구별해 先生に聞く로 회상합니다.",
    "先生（せんせい）は教える人への呼び方です。学生と区別し、「先生に聞く」で覚えます。",
    "先生 (せんせい) addresses a teacher. Contrast 学生 and recall 先生に聞く.",
  ],
  [
    "vocab-3",
    "電車（でんしゃ）は 선로 위를 달리는 train입니다. 버스가 아니라 電車に乗る로 회상합니다.",
    "電車（でんしゃ）は線路を走る乗り物です。バスと区別し、「電車に乗る」で覚えます。",
    "電車 (でんしゃ) is a train running on rails. Contrast a bus and recall 電車に乗る.",
  ],
  [
    "vocab-4",
    "友達（ともだち）は 친구/friend입니다. 가족을 뜻하는 家族와 구별해 友達と話す로 회상합니다.",
    "友達（ともだち）は親しく付き合う人です。家族と区別し、「友達と話す」で覚えます。",
    "友達 (ともだち) means friend. Contrast 家族 and recall 友達と話す.",
  ],
  [
    "vocab-5",
    "朝ご飯（あさごはん）は 아침에 먹는 breakfast입니다. 昼ご飯과 구별해 朝ご飯を食べる로 회상합니다.",
    "朝ご飯（あさごはん）は朝の食事です。昼ご飯と区別し、「朝ご飯を食べる」で覚えます。",
    "朝ご飯 (あさごはん) is breakfast. Contrast 昼ご飯 and recall 朝ご飯を食べる.",
  ],
  [
    "grammar-1",
    "「AはBです」는 A를 화제로 삼아 B라고 정중하게 설명합니다. は는 조사로 わ라고 읽으며, 의문은 ですか로 만듭니다.",
    "「AはBです」はAを話題にしてBだと丁寧に述べます。助詞の「は」は「わ」と読みます。",
    "AはBです politely states B about topic A; the particle は is pronounced わ.",
  ],
  [
    "grammar-2",
    "「を」는 読む・食べる 같은 타동작의 직접 대상을 표시하며 お로 읽습니다. 이동 목적지의 に와 구별합니다.",
    "「を」は読む・食べるなどの動作の直接の対象を示し、「お」と読みます。目的地の「に」と区別します。",
    "を, pronounced お, marks the direct object of actions such as 読む; contrast destination に.",
  ],
  [
    "grammar-3",
    "정확한 시각 뒤의 に는 동작이 일어나는 때를 표시합니다. 毎日처럼 반복 빈도어에는 보통 붙이지 않는 점을 구별합니다.",
    "決まった時刻の「に」は動作の時を示します。「毎日」には普通付けない点を区別します。",
    "に after a specific time marks when an action occurs; it is normally omitted after 毎日.",
  ],
  [
    "grammar-4",
    "장소+で는 그 장소에서 행동함을 나타냅니다. 존재 위치의 に와 구별해 図書館で読む로 회상합니다.",
    "場所＋「で」はそこで行う動作を示します。存在場所の「に」と区別し、「図書館で読む」で覚えます。",
    "Place+で marks where an action happens. Contrast location-of-existence に and recall 図書館で読む.",
  ],
  [
    "grammar-5",
    "동사 ます형의 ます를 ません으로 바꾸면 정중한 현재·미래 부정입니다. 과거 부정 ませんでした와 구별합니다.",
    "動詞の「ます」を「ません」に替えると丁寧な現在・未来の否定です。「ませんでした」と区別します。",
    "Replace ます with ません for polite present/future negation; contrast past-negative ませんでした.",
  ],
  [
    "kanji-1",
    "日は 음독 ニチ・ジツ, 훈독 ひ・か입니다. 日本은 にほん, 日曜日은 にちようび, 三日은 みっか로 단어째 회상합니다.",
    "「日」はニチ・ジツ／ひ・か。日本、日曜日、三日の読みを語ごとに覚えます。",
    "日 has ニチ・ジツ and ひ・か readings; recall 日本, 日曜日, and 三日 as whole words.",
  ],
  [
    "kanji-2",
    "月은 ゲツ・ガツ와 つき입니다. 月曜日(げつようび), 一月(いちがつ), 月(つき)을 구별합니다.",
    "「月」はゲツ・ガツ／つき。「月曜日・一月・月」を区別します。",
    "月 has ゲツ・ガツ and つき readings; contrast 月曜日, 一月, and 月.",
  ],
  [
    "kanji-3",
    "人은 ジン・ニン과 ひと입니다. 日本人(にほんじん), 三人(さんにん), 人(ひと)을 단어째 회상합니다.",
    "「人」はジン・ニン／ひと。「日本人・三人・人」を語ごとに覚えます。",
    "人 has ジン・ニン and ひと readings; recall 日本人, 三人, and 人.",
  ],
  [
    "kanji-4",
    "山은 음독 サン, 훈독 やま입니다. 富士山(ふじさん)과 山(やま)의 읽기를 구별합니다.",
    "「山」はサン／やま。「富士山」と「山」の読みを区別します。",
    "山 is read サン or やま; contrast 富士山 (ふじさん) with 山 (やま).",
  ],
  [
    "kanji-5",
    "川은 음독 セン, 훈독 かわ입니다. 河川(かせん)과 川(かわ)을 구별해 회상합니다.",
    "「川」はセン／かわ。「河川」と「川」の読みを区別します。",
    "川 is read セン or かわ; contrast 河川 (かせん) with 川 (かわ).",
  ],
  [
    "listening-1",
    "おはようございます는 아침의 정중한 인사입니다. 낮의 こんにちは, 밤의 こんばんは와 시간대를 구별합니다.",
    "「おはようございます」は朝の丁寧な挨拶です。「こんにちは・こんばんは」と時間帯を区別します。",
    "おはようございます is a polite morning greeting; contrast こんにちは and こんばんは by time.",
  ],
  [
    "listening-2",
    "「私は〜です」는 자신을 소개하는 정중한 틀입니다. システムエンジニア가 직업명임을 듣고 이름 소개와 구별합니다.",
    "「私は〜です」は自己紹介の丁寧な形です。システムエンジニアが職業名だと聞き分けます。",
    "私は〜です is a polite self-introduction; recognize システムエンジニア as an occupation.",
  ],
  [
    "listening-3",
    "毎朝는 매일 아침, 6時に起きます는 6시에 일어난다는 뜻입니다. 시각과 취침 행동을 구별해 듣습니다.",
    "「毎朝」は毎朝、「6時に起きます」は六時の起床です。時刻と就寝を聞き分けます。",
    "毎朝 means every morning; 6時に起きます means wake at six. Distinguish waking from sleeping.",
  ],
  [
    "listening-4",
    "「電車で会社へ行きます」에서 で는 교통수단, へ는 목적지 방향입니다. 버스나 학교로 바꾸어 듣지 않습니다.",
    "「電車で会社へ行きます」の「で」は手段、「へ」は方向です。乗り物と目的地を聞き分けます。",
    "In 電車で会社へ行きます, で marks transport and へ direction; identify both accurately.",
  ],
  [
    "listening-5",
    "「寝る前に本を読みます」는 취침 전에 독서한다는 순서입니다. 일어난 뒤나 식사 전과 구별합니다.",
    "「寝る前に本を読みます」は就寝前の読書です。起床後や食事前と区別します。",
    "寝る前に本を読みます means reading before bed; contrast after waking or before a meal.",
  ],
];
export const N5_CONCEPT_CUES: Record<string, L> = Object.fromEntries(
  cueRows.map(([s, ko, ja, en]) => [`lp4-jlpt-n5-${s}`, l(ko, ja, en)]),
);
type C = {
  k: string;
  t: string;
  s: string;
  o: [string, string, string, string];
  a: 0 | 1 | 2 | 3;
  e: L;
  audio?: string;
};
const E = (ko: string, ja: string, en: string) => l(ko, ja, en);
const rows: {
  mode: "vocab_mc" | "grammar_fill" | "kanji_reading" | "listening";
  cases: C[];
}[] = [
  {
    mode: "vocab_mc",
    cases: [
      {
        k: "vocab-1",
        t: "first-day-school",
        s: "子どもは毎朝、勉強するために（　）へ行きます。",
        o: ["学校", "会社", "病院", "駅"],
        a: 0,
        e: E(
          "정답은 学校입니다. 아이가 공부하러 가는 곳입니다.",
          "正解は学校です。子どもが勉強しに行く場所です。",
          "The answer is 学校, where a child goes to study.",
        ),
      },
      {
        k: "vocab-1",
        t: "school-library",
        s: "この（　）には、教室が六つと図書室があります。",
        o: ["会社", "学校", "店", "家"],
        a: 1,
        e: E(
          "정답은 学校입니다. 교실과 도서실이 있는 교육 장소입니다.",
          "正解は学校です。教室と図書室がある教育の場所です。",
          "The answer is 学校, an educational place with classrooms and a library.",
        ),
      },
      {
        k: "vocab-2",
        t: "class-question",
        s: "分からない漢字を（　）に聞きました。",
        o: ["先生", "友達", "電車", "朝ご飯"],
        a: 0,
        e: E(
          "정답은 先生입니다. 모르는 한자를 가르치는 사람에게 묻습니다.",
          "正解は先生です。分からない漢字を教える人に聞きます。",
          "The answer is 先生, the person asked to teach the unknown kanji.",
        ),
      },
      {
        k: "vocab-2",
        t: "teacher-arrival",
        s: "授業の前に、（　）が教室に入りました。",
        o: ["学生", "駅", "先生", "学校"],
        a: 2,
        e: E(
          "정답은 先生입니다. 수업 전에 교사가 교실에 들어옵니다.",
          "正解は先生です。授業前に教える人が教室へ入ります。",
          "The answer is 先生, the teacher entering before class.",
        ),
      },
      {
        k: "vocab-3",
        t: "rail-commute",
        s: "駅から東京まで（　）に乗ります。",
        o: ["学校", "先生", "電車", "朝ご飯"],
        a: 2,
        e: E(
          "정답은 電車입니다. 역에서 타는 철도 교통수단입니다.",
          "正解は電車です。駅から乗る鉄道の乗り物です。",
          "The answer is 電車, rail transport boarded at a station.",
        ),
      },
      {
        k: "vocab-3",
        t: "train-delay",
        s: "雪で（　）が止まり、駅で待っています。",
        o: ["友達", "学校", "先生", "電車"],
        a: 3,
        e: E(
          "정답은 電車입니다. 눈 때문에 멈추고 역에서 기다리는 교통수단입니다.",
          "正解は電車です。雪で止まり、駅で待つ乗り物です。",
          "The answer is 電車, the vehicle stopped by snow at the station.",
        ),
      },
      {
        k: "vocab-4",
        t: "weekend-friend",
        s: "日曜日に（　）と公園で遊びます。",
        o: ["友達", "朝ご飯", "学校", "電車"],
        a: 0,
        e: E(
          "정답은 友達입니다. 일요일에 함께 노는 친구입니다.",
          "正解は友達です。日曜日に一緒に遊ぶ人です。",
          "The answer is 友達, the friend who plays together Sunday.",
        ),
      },
      {
        k: "vocab-4",
        t: "birthday-call",
        s: "誕生日に（　）から電話が来ました。",
        o: ["先生", "友達", "駅", "朝ご飯"],
        a: 1,
        e: E(
          "정답은 友達입니다. 생일에 친구에게 전화가 왔습니다.",
          "正解は友達です。誕生日に親しい人から電話が来ました。",
          "The answer is 友達, a friend who called on the birthday.",
        ),
      },
      {
        k: "vocab-5",
        t: "morning-meal",
        s: "起きてから、パンと卵の（　）を食べます。",
        o: ["電車", "朝ご飯", "学校", "先生"],
        a: 1,
        e: E(
          "정답은 朝ご飯입니다. 일어난 뒤 먹는 아침 식사입니다.",
          "正解は朝ご飯です。起きた後に食べる朝の食事です。",
          "The answer is 朝ご飯, the morning meal after waking.",
        ),
      },
      {
        k: "vocab-5",
        t: "breakfast-skip",
        s: "今朝は時間がなくて、（　）を食べませんでした。",
        o: ["学校", "友達", "電車", "朝ご飯"],
        a: 3,
        e: E(
          "정답은 朝ご飯입니다. 오늘 아침 시간이 없어 거른 식사입니다.",
          "正解は朝ご飯です。今朝、時間がなくて食べなかった食事です。",
          "The answer is 朝ご飯, the meal skipped this morning.",
        ),
      },
    ],
  },
  {
    mode: "grammar_fill",
    cases: [
      {
        k: "grammar-1",
        t: "name-introduction",
        s: "わたし（　）田中です。",
        o: ["を", "に", "は", "で"],
        a: 2,
        e: E(
          "정답은 は입니다. わたし를 화제로 소개합니다.",
          "正解は「は」です。「わたし」を話題にします。",
          "The answer is は, marking わたし as topic.",
        ),
      },
      {
        k: "grammar-1",
        t: "book-description",
        s: "この本（　）日本語の本です。",
        o: ["を", "で", "に", "は"],
        a: 3,
        e: E(
          "정답은 は입니다. この本을 화제로 설명합니다.",
          "正解は「は」です。「この本」を話題に説明します。",
          "The answer is は, marking this book as topic.",
        ),
      },
      {
        k: "grammar-2",
        t: "water-object",
        s: "毎朝、水（　）飲みます。",
        o: ["に", "で", "を", "は"],
        a: 2,
        e: E(
          "정답은 を입니다. 마시는 직접 대상을 표시합니다.",
          "正解は「を」です。飲む対象を示します。",
          "The answer is を, marking what is drunk.",
        ),
      },
      {
        k: "grammar-2",
        t: "letter-object",
        s: "夜、家族に手紙（　）書きます。",
        o: ["へ", "に", "で", "を"],
        a: 3,
        e: E(
          "정답은 を입니다. 쓰는 대상인 편지를 표시합니다.",
          "正解は「を」です。書く対象の手紙を示します。",
          "The answer is を, marking the letter being written.",
        ),
      },
      {
        k: "grammar-3",
        t: "wake-time",
        s: "毎朝、六時（　）起きます。",
        o: ["に", "を", "で", "は"],
        a: 0,
        e: E(
          "정답은 に입니다. 정확한 기상 시각을 표시합니다.",
          "正解は「に」です。決まった起床時刻を示します。",
          "The answer is に, marking the exact waking time.",
        ),
      },
      {
        k: "grammar-3",
        t: "meeting-time",
        s: "会議は午後三時（　）始まります。",
        o: ["で", "に", "を", "へ"],
        a: 1,
        e: E(
          "정답은 に입니다. 회의 시작 시각을 표시합니다.",
          "正解は「に」です。会議の開始時刻を示します。",
          "The answer is に, marking the meeting start time.",
        ),
      },
      {
        k: "grammar-4",
        t: "library-study",
        s: "午後、図書館（　）勉強します。",
        o: ["に", "を", "で", "へ"],
        a: 2,
        e: E(
          "정답은 で입니다. 공부 행동이 일어나는 장소입니다.",
          "正解は「で」です。勉強する場所を示します。",
          "The answer is で, marking where studying occurs.",
        ),
      },
      {
        k: "grammar-4",
        t: "park-lunch",
        s: "天気がいいので、公園（　）昼ご飯を食べます。",
        o: ["を", "に", "へ", "で"],
        a: 3,
        e: E(
          "정답은 で입니다. 먹는 행동의 장소를 표시합니다.",
          "正解は「で」です。食べる動作の場所です。",
          "The answer is で, marking where eating occurs.",
        ),
      },
      {
        k: "grammar-5",
        t: "coffee-negative",
        s: "夜はコーヒーを飲み（　）。",
        o: ["ません", "ます", "ました", "ましょう"],
        a: 0,
        e: E(
          "정답은 ません입니다. 밤에는 마시지 않는 정중한 현재 부정입니다.",
          "正解は「ません」です。夜は飲まないという丁寧な否定です。",
          "The answer is ません, polite present negation.",
        ),
      },
      {
        k: "grammar-5",
        t: "sunday-work-negative",
        s: "日曜日は会社へ行き（　）。",
        o: ["ました", "ません", "ます", "たいです"],
        a: 1,
        e: E(
          "정답은 ません입니다. 일요일에 가지 않는다는 정중한 부정입니다.",
          "正解は「ません」です。日曜日に行かないという丁寧な否定です。",
          "The answer is ません, politely saying one does not go Sunday.",
        ),
      },
    ],
  },
  {
    mode: "kanji_reading",
    cases: [
      {
        k: "kanji-1",
        t: "sunday-reading",
        s: "「日曜日」に公園へ行きます。「日曜日」の読みはどれですか。",
        o: ["にちようび", "げつようび", "ひようび", "じつようび"],
        a: 0,
        e: E(
          "정답은 にちようび입니다. 日曜日 전체의 읽기입니다.",
          "正解は「にちようび」です。",
          "The answer is にちようび.",
        ),
      },
      {
        k: "kanji-1",
        t: "three-days-reading",
        s: "旅行は「三日」です。「三日」の読みはどれですか。",
        o: ["さんにち", "みっか", "みか", "さんじつ"],
        a: 1,
        e: E(
          "정답은 みっか입니다. 날짜·기간의 三日 읽기입니다.",
          "正解は「みっか」です。",
          "The answer is みっか.",
        ),
      },
      {
        k: "kanji-2",
        t: "monday-reading",
        s: "「月曜日」に会いましょう。「月曜日」の読みはどれですか。",
        o: ["がつようび", "つきようび", "げつようび", "げっようび"],
        a: 2,
        e: E(
          "정답은 げつようび입니다. 月曜日 전체의 읽기입니다.",
          "正解は「げつようび」です。",
          "The answer is げつようび.",
        ),
      },
      {
        k: "kanji-2",
        t: "january-reading",
        s: "学校は「一月」に始まります。「一月」の読みはどれですか。",
        o: ["ひとつき", "いちげつ", "ついたち", "いちがつ"],
        a: 3,
        e: E(
          "정답은 いちがつ입니다. 1월을 뜻하는 一月의 읽기입니다.",
          "正解は「いちがつ」です。",
          "The answer is いちがつ.",
        ),
      },
      {
        k: "kanji-3",
        t: "japanese-person-reading",
        s: "田中さんは「日本人」です。「日本人」の読みはどれですか。",
        o: ["にほんじん", "にほんにん", "にっぽんひと", "にほんびと"],
        a: 0,
        e: E(
          "정답은 にほんじん입니다. 日本人 전체의 읽기입니다.",
          "正解は「にほんじん」です。",
          "The answer is にほんじん.",
        ),
      },
      {
        k: "kanji-3",
        t: "three-people-reading",
        s: "部屋に「三人」います。「三人」の読みはどれですか。",
        o: ["みたり", "さんにん", "さんじん", "みっか"],
        a: 1,
        e: E(
          "정답은 さんにん입니다. 세 사람을 세는 읽기입니다.",
          "正解は「さんにん」です。",
          "The answer is さんにん.",
        ),
      },
      {
        k: "kanji-4",
        t: "mountain-reading",
        s: "あの「山」は高いです。「山」の読みはどれですか。",
        o: ["かわ", "さん", "やま", "もり"],
        a: 2,
        e: E(
          "정답은 やま입니다. 단독 山의 훈독입니다.",
          "正解は「やま」です。",
          "The answer is やま.",
        ),
      },
      {
        k: "kanji-4",
        t: "fuji-reading",
        s: "「富士山」が見えます。「富士山」の読みはどれですか。",
        o: ["ふじやま", "ふしさん", "ふじざん", "ふじさん"],
        a: 3,
        e: E(
          "정답은 ふじさん입니다. 富士山 전체의 읽기입니다.",
          "正解は「ふじさん」です。",
          "The answer is ふじさん.",
        ),
      },
      {
        k: "kanji-5",
        t: "river-reading",
        s: "この「川」は長いです。「川」の読みはどれですか。",
        o: ["かわ", "やま", "せん", "みず"],
        a: 0,
        e: E(
          "정답은 かわ입니다. 단독 川의 훈독입니다.",
          "正解は「かわ」です。",
          "The answer is かわ.",
        ),
      },
      {
        k: "kanji-5",
        t: "rivers-reading",
        s: "町の「河川」を調べます。「河川」の読みはどれですか。",
        o: ["かわがわ", "かせん", "かかわ", "がせん"],
        a: 1,
        e: E(
          "정답은 かせん입니다. 河川 전체의 읽기입니다.",
          "正解は「かせん」です。",
          "The answer is かせん.",
        ),
      },
    ],
  },
  {
    mode: "listening",
    cases: [
      {
        k: "listening-1",
        t: "morning-office-greeting",
        s: "男の人はいつの挨拶をしましたか。",
        o: ["昼", "夜", "朝", "別れ"],
        a: 2,
        audio: "朝、会社に着いた男の人が「おはようございます」と言いました。",
        e: E(
          "정답은 朝입니다. 아침에 한 인사입니다.",
          "正解は朝です。",
          "The answer is morning.",
        ),
      },
      {
        k: "listening-1",
        t: "teacher-morning-greeting",
        s: "学生は先生に何と言いましたか。",
        o: ["こんばんは", "さようなら", "いただきます", "おはようございます"],
        a: 3,
        audio:
          "午前八時、学生は先生に会って「おはようございます」と言いました。",
        e: E(
          "정답은 おはようございます입니다. 오전 8시의 인사입니다.",
          "正解は「おはようございます」です。",
          "The answer is おはようございます.",
        ),
      },
      {
        k: "listening-2",
        t: "job-introduction",
        s: "女の人の仕事は何ですか。",
        o: ["医者", "先生", "システムエンジニア", "店員"],
        a: 2,
        audio: "はじめまして。私は佐藤です。システムエンジニアです。",
        e: E(
          "정답은 システムエンジニア입니다. 화자가 밝힌 직업입니다.",
          "正解はシステムエンジニアです。",
          "The answer is systems engineer.",
        ),
      },
      {
        k: "listening-2",
        t: "new-employee-introduction",
        s: "新しい社員は何をしていますか。",
        o: ["学生です", "料理人です", "教師です", "システムエンジニアです"],
        a: 3,
        audio: "新しい社員が「私はシステムエンジニアです」と自己紹介しました。",
        e: E(
          "정답은 システムエンジニアです입니다. 신입 사원의 직업입니다.",
          "正解は「システムエンジニアです」です。",
          "The answer is “a systems engineer.”",
        ),
      },
      {
        k: "listening-3",
        t: "weekday-wake-time",
        s: "男の人は何時に起きますか。",
        o: ["六時", "七時", "八時", "九時"],
        a: 0,
        audio: "私は毎朝六時に起きて、七時に朝ご飯を食べます。",
        e: E(
          "정답은 六時입니다. 아침 6시에 일어납니다.",
          "正解は六時です。",
          "The answer is six o’clock.",
        ),
      },
      {
        k: "listening-3",
        t: "sunday-wake-time",
        s: "日曜日は何時に起きますか。",
        o: ["六時", "八時", "七時", "十時"],
        a: 1,
        audio: "平日は六時ですが、日曜日は八時に起きます。",
        e: E(
          "정답은 八時입니다. 일요일 기상 시각입니다.",
          "正解は八時です。",
          "The answer is eight o’clock.",
        ),
      },
      {
        k: "listening-4",
        t: "company-transport",
        s: "女の人は何で会社へ行きますか。",
        o: ["バス", "自転車", "電車", "車"],
        a: 2,
        audio: "駅まで歩いて、そこから電車で会社へ行きます。",
        e: E(
          "정답은 電車입니다. 역부터 전철로 회사에 갑니다.",
          "正解は電車です。",
          "The answer is train.",
        ),
      },
      {
        k: "listening-4",
        t: "rainy-commute",
        s: "雨の日、男の人は何で会社へ行きますか。",
        o: ["歩いて", "車で", "バスで", "電車で"],
        a: 3,
        audio: "晴れの日は自転車ですが、雨の日は電車で会社へ行きます。",
        e: E(
          "정답은 電車で입니다. 비 오는 날의 교통수단입니다.",
          "正解は「電車で」です。",
          "The answer is by train.",
        ),
      },
      {
        k: "listening-5",
        t: "bedtime-reading",
        s: "女の人はいつ本を読みますか。",
        o: ["寝る前", "朝ご飯の前", "学校の後", "起きる前"],
        a: 0,
        audio: "夜は十一時に寝ます。寝る前に本を少し読みます。",
        e: E(
          "정답은 寝る前입니다. 자기 전에 책을 읽습니다.",
          "正解は寝る前です。",
          "The answer is before bed.",
        ),
      },
      {
        k: "listening-5",
        t: "night-routine",
        s: "男の人は歯を磨いた後、何をしますか。",
        o: [
          "朝ご飯を食べます",
          "本を読みます",
          "会社へ行きます",
          "電車に乗ります",
        ],
        a: 1,
        audio: "夜、歯を磨いた後で本を読みます。それから寝ます。",
        e: E(
          "정답은 本を読みます입니다. 양치 뒤 독서합니다.",
          "正解は「本を読みます」です。",
          "The answer is “read a book.”",
        ),
      },
    ],
  },
];
const inst = {
  vocab_mc: l(
    "빈칸에 알맞은 말을 고르세요.",
    "空欄に合う言葉を選んでください。",
    "Choose the word that fits the blank.",
  ),
  grammar_fill: l(
    "빈칸에 알맞은 표현을 고르세요.",
    "空欄に合う表現を選んでください。",
    "Choose the expression that fits the blank.",
  ),
  kanji_reading: l(
    "지정된 범위의 읽기를 고르세요.",
    "指定された部分の読みを選んでください。",
    "Choose the reading of the specified text.",
  ),
  listening: l(
    "음성을 듣고 질문에 답하세요.",
    "音声を聞いて質問に答えてください。",
    "Listen and answer the question.",
  ),
};
export const N5_ITEMS: I[] = rows.flatMap(({ mode, cases }) =>
  cases.map((c, i) => {
    const q = inst[mode];
    return {
      id: `lp4-n5-${mode}-${i + 1}`,
      concept_key: `lp4-jlpt-n5-${c.k}`,
      track: "jlpt-ja",
      level: "N5",
      section: mode,
      difficulty: 1,
      context_tag: c.t,
      question: l(`${q.ko}\n${c.s}`, `${q.ja}\n${c.s}`, `${q.en}\n${c.s}`),
      choices: same(c.o),
      answer_index: c.a,
      explanation: c.e,
      ...(c.audio ? { audio_script: c.audio } : {}),
    };
  }),
);
