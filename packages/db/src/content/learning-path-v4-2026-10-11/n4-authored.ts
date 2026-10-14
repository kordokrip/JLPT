import type { DraftItem } from "../learning-path-2026-10-11/data.js";
type L = { ko: string; ja: string; en: string };
type I = DraftItem & { context_tag: string };
const l = (ko: string, ja: string, en: string): L => ({ ko, ja, en });
const same = (x: string[]) => x.map((v) => l(v, v, v));
const cues: [string, L][] = [
  [
    "vocab-1",
    l(
      "予定（よてい）는 앞으로 하기로 정한 일정입니다. 이미 끝난 결과와 구별해 予定を立てる로 회상합니다.",
      "予定（よてい）はこれから行うと決めた日程です。「予定を立てる」で覚えます。",
      "予定 (よてい) is a planned future schedule; recall 予定を立てる.",
    ),
  ],
  [
    "vocab-2",
    l(
      "連絡（れんらく）는 필요한 정보를 상대에게 알리는 일입니다. 조언을 구하는 相談과 구별해 連絡する로 회상합니다.",
      "連絡（れんらく）は必要な情報を相手に知らせることです。相談と区別します。",
      "連絡 (れんらく) means contacting someone with needed information; contrast 相談.",
    ),
  ],
  [
    "vocab-3",
    l(
      "準備する（じゅんびする）는 일을 시작하기 전에 필요한 것을 갖추는 동작입니다. 準備ができる와 함께 회상합니다.",
      "準備する（じゅんびする）は始める前に必要な物を整える動作です。",
      "準備する (じゅんびする) means getting necessities ready before starting.",
    ),
  ],
  [
    "vocab-4",
    l(
      "必要（ひつよう）는 목적을 위해 꼭 있어야 함을 뜻하며 な형용사로 必要な書類처럼 씁니다.",
      "必要（ひつよう）は目的のために要ることを表し、「必要な書類」と使います。",
      "必要 (ひつよう) means necessary and appears in 必要な書類.",
    ),
  ],
  [
    "vocab-5",
    l(
      "約束（やくそく）는 사람 사이에 하기로 정한 일이나 만날 약속입니다. 予定보다 상대와의 합의를 강조합니다.",
      "約束（やくそく）は人同士で決めたことです。予定より相手との合意を強調します。",
      "約束 (やくそく) is an agreement between people; unlike 予定 it stresses mutual commitment.",
    ),
  ],
  [
    "grammar-1",
    l(
      "동사 ます형 어간+ながら는 같은 주체가 두 동작을 동시에 함을 나타냅니다. 중심 동작은 뒤에 옵니다.",
      "動詞のます形の語幹＋ながらは、同じ主体の同時動作を表し、主動作は後ろです。",
      "Verb-stem+ながら marks two simultaneous actions by one subject; the main action follows.",
    ),
  ],
  [
    "grammar-2",
    l(
      "てしまう는 동작의 완결 또는 뜻밖의 유감스러운 결과를 나타냅니다. 단순 진행 ている와 구별합니다.",
      "「てしまう」は完了または残念な結果を表し、「ている」と区別します。",
      "てしまう marks completion or a regrettable result; contrast ongoing ている.",
    ),
  ],
  [
    "grammar-3",
    l(
      "ない형의 ない를 なければならない로 바꾸면 의무입니다. 허가의 なくてもいい와 구별합니다.",
      "ない形の「ない」を「なければならない」に替えると義務を表します。",
      "Replace ない with なければならない for obligation; contrast なくてもいい.",
    ),
  ],
  [
    "grammar-4",
    l(
      "가능형+ようになる는 이전에는 못하던 능력이 생긴 변화를 나타냅니다. 의식적 노력 ようにする와 구별합니다.",
      "可能形＋ようになるは能力の変化を表し、「ようにする」と区別します。",
      "Potential form+ようになる marks a change in ability; contrast deliberate ようにする.",
    ),
  ],
  [
    "grammar-5",
    l(
      "보통형+かもしれない는 확실하지 않은 가능성입니다. 강한 확신의 はずだ와 구별합니다.",
      "普通形＋かもしれないは不確かな可能性を表し、「はずだ」と区別します。",
      "Plain form+かもしれない expresses uncertainty; contrast stronger はずだ.",
    ),
  ],
  [
    "kanji-1",
    l(
      "春은 シュン 또는 はる입니다. 春休み(はるやすみ)와 青春(せいしゅん)을 단어째 구별합니다.",
      "「春」はシュン／はる。「春休み」と「青春」を語ごとに覚えます。",
      "春 is シュン or はる; contrast 春休み and 青春.",
    ),
  ],
  [
    "kanji-2",
    l(
      "夏는 カ 또는 なつ입니다. 夏休み(なつやすみ)와 初夏(しょか)를 구별합니다.",
      "「夏」はカ／なつ。「夏休み」と「初夏」を区別します。",
      "夏 is カ or なつ; contrast 夏休み and 初夏.",
    ),
  ],
  [
    "kanji-3",
    l(
      "秋는 シュウ 또는 あき입니다. 秋風(あきかぜ)과 晩秋(ばんしゅう)을 구별합니다.",
      "「秋」はシュウ／あき。「秋風」と「晩秋」を区別します。",
      "秋 is シュウ or あき; contrast 秋風 and 晩秋.",
    ),
  ],
  [
    "kanji-4",
    l(
      "冬는 トウ 또는 ふゆ입니다. 冬休み(ふゆやすみ)와 暖冬(だんとう)을 구별합니다.",
      "「冬」はトウ／ふゆ。「冬休み」と「暖冬」を区別します。",
      "冬 is トウ or ふゆ; contrast 冬休み and 暖冬.",
    ),
  ],
  [
    "kanji-5",
    l(
      "院은 음독 イン이며 병원·기관을 나타내는 복합어에 쓰입니다. 病院(びょういん), 入院(にゅういん)을 회상합니다.",
      "「院」は音読みのインで、「病院・入院」など機関に関する語に使います。",
      "院 is read イン in institution-related compounds such as 病院 and 入院.",
    ),
  ],
  [
    "listening-1",
    l(
      "「3時に駅で待ち合わせ」에서 3時는 시각, 駅은 만날 장소입니다. 두 정보를 따로 듣습니다.",
      "「3時に駅で待ち合わせ」では、時刻と場所を分けて聞き取ります。",
      "In 3時に駅で待ち合わせ, identify time and meeting place separately.",
    ),
  ],
  [
    "listening-2",
    l(
      "「予約しておく」는 나중을 위해 미리 예약한다는 뜻입니다. 지금 구매 완료와 구별합니다.",
      "「予約しておく」は後のために前もって予約する意味です。",
      "予約しておく means reserving in advance for later; contrast completing a purchase now.",
    ),
  ],
  [
    "listening-3",
    l(
      "「何時に会う？」는 만날 시각을 묻습니다. 장소를 묻는 どこで와 구별합니다.",
      "「何時に会う？」は会う時刻を尋ね、「どこで」と区別します。",
      "何時に会う asks meeting time; contrast どこで for place.",
    ),
  ],
  [
    "listening-4",
    l(
      "「何の映画が見たい？」는 보고 싶은 영화 종류를 묻습니다. 시간이나 극장을 묻는 말과 구별합니다.",
      "「何の映画が見たい？」は見たい映画の種類を尋ねます。",
      "何の映画が見たい asks the desired kind of movie, not time or theater.",
    ),
  ],
  [
    "listening-5",
    l(
      "「アクション映画がいいかな」는 액션 영화를 선호하지만 부드럽게 제안하는 말입니다. 확정 예약과 구별합니다.",
      "「アクション映画がいいかな」は好みを柔らかく示す表現です。",
      "アクション映画がいいかな softly expresses a preference, not a confirmed booking.",
    ),
  ],
];
export const N4_CONCEPT_CUES: Record<string, L> = Object.fromEntries(
  cues.map(([k, v]) => [`lp4-jlpt-n4-${k}`, v]),
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
const e = (ko: string, ja: string, en: string) => l(ko, ja, en);
const groups: {
  m: "vocab_mc" | "grammar_fill" | "kanji_reading" | "listening";
  c: C[];
}[] = [
  {
    m: "vocab_mc",
    c: [
      {
        k: "vocab-1",
        t: "weekend-schedule",
        s: "週末の（　）を手帳に書きました。",
        o: ["予定", "連絡", "必要", "約束"],
        a: 0,
        e: e(
          "정답은 予定입니다. 수첩에 적은 주말 일정입니다.",
          "正解は予定です。手帳に書いた日程です。",
          "The answer is 予定, the weekend schedule.",
        ),
      },
      {
        k: "vocab-1",
        t: "meeting-plan",
        s: "午後の（　）が変わり、会議は四時になりました。",
        o: ["準備", "予定", "連絡", "必要"],
        a: 1,
        e: e(
          "정답은 予定입니다. 오후 일정이 변경됐습니다.",
          "正解は予定です。午後の日程が変わりました。",
          "The answer is 予定, the changed afternoon schedule.",
        ),
      },
      {
        k: "vocab-2",
        t: "delay-message",
        s: "遅れるときは、電話で（　）してください。",
        o: ["予定", "約束", "連絡", "必要"],
        a: 2,
        e: e(
          "정답은 連絡입니다. 지연 정보를 전화로 알립니다.",
          "正解は連絡です。遅れることを知らせます。",
          "The answer is 連絡, notifying someone of a delay.",
        ),
      },
      {
        k: "vocab-2",
        t: "address-notice",
        s: "住所が変わったので、会社に（　）しました。",
        o: ["予定", "準備", "約束", "連絡"],
        a: 3,
        e: e(
          "정답은 連絡입니다. 새 주소를 회사에 알렸습니다.",
          "正解は連絡です。新住所を会社に知らせました。",
          "The answer is 連絡, informing the company of the address.",
        ),
      },
      {
        k: "vocab-3",
        t: "trip-packing",
        s: "旅行の前に、服と地図を（　）します。",
        o: ["準備", "連絡", "予定", "約束"],
        a: 0,
        e: e(
          "정답은 準備입니다. 여행 전에 필요한 것을 갖춥니다.",
          "正解は準備です。旅行前に必要な物を整えます。",
          "The answer is 準備, getting travel items ready.",
        ),
      },
      {
        k: "vocab-3",
        t: "presentation-ready",
        s: "発表の（　）ができたので、練習を始めます。",
        o: ["必要", "準備", "連絡", "予定"],
        a: 1,
        e: e(
          "정답은 準備입니다. 발표에 필요한 준비가 끝났습니다.",
          "正解は準備です。発表に必要な用意です。",
          "The answer is 準備, readiness for the presentation.",
        ),
      },
      {
        k: "vocab-4",
        t: "passport-required",
        s: "海外旅行にはパスポートが（　）です。",
        o: ["便利", "元気", "必要", "有名"],
        a: 2,
        e: e(
          "정답은 必要입니다. 해외여행에 여권이 꼭 필요합니다.",
          "正解は必要です。海外旅行に要ります。",
          "The answer is 必要 because a passport is required.",
        ),
      },
      {
        k: "vocab-4",
        t: "forms-required",
        s: "申し込みに（　）な書類を確認してください。",
        o: ["静か", "丈夫", "簡単", "必要"],
        a: 3,
        e: e(
          "정답은 必要입니다. 신청에 필요한 서류입니다.",
          "正解は必要です。申し込みに要る書類です。",
          "The answer is 必要, documents required for applying.",
        ),
      },
      {
        k: "vocab-5",
        t: "doctor-appointment",
        s: "明日の三時に医者と会う（　）があります。",
        o: ["約束", "準備", "連絡", "予定表"],
        a: 0,
        e: e(
          "정답은 約束입니다. 의사와 만나기로 한 약속입니다.",
          "正解は約束です。医者と会う取り決めです。",
          "The answer is 約束, an appointment with the doctor.",
        ),
      },
      {
        k: "vocab-5",
        t: "promise-return",
        s: "友達と、金曜日に本を返す（　）をしました。",
        o: ["必要", "約束", "予定", "準備"],
        a: 1,
        e: e(
          "정답은 約束입니다. 친구와 반납하기로 합의했습니다.",
          "正解は約束です。友達と返すことを決めました。",
          "The answer is 約束, the agreement to return the book.",
        ),
      },
    ],
  },
  {
    m: "grammar_fill",
    c: [
      {
        k: "grammar-1",
        t: "music-cooking",
        s: "音楽を聞き（　）、料理します。",
        o: ["ながら", "てから", "ので", "まで"],
        a: 0,
        e: e(
          "정답은 ながら입니다. 같은 사람이 듣기와 요리를 동시에 합니다.",
          "正解は「ながら」です。同じ人の同時動作です。",
          "The answer is ながら for simultaneous actions.",
        ),
      },
      {
        k: "grammar-1",
        t: "map-walking",
        s: "地図を見（　）、駅まで歩きました。",
        o: ["たあと", "ながら", "ために", "そうで"],
        a: 1,
        e: e(
          "정답은 ながら입니다. 지도를 보며 걷습니다.",
          "正解は「ながら」です。地図を見るのと歩くのが同時です。",
          "The answer is ながら: looking while walking.",
        ),
      },
      {
        k: "grammar-2",
        t: "lost-wallet",
        s: "電車に財布を忘れ（　）。",
        o: ["てあります", "ています", "てしまいました", "ておきました"],
        a: 2,
        e: e(
          "정답은 てしまいました입니다. 뜻밖의 유감스러운 결과입니다.",
          "正解は「てしまいました」です。残念な結果です。",
          "The answer is てしまいました, a regrettable result.",
        ),
      },
      {
        k: "grammar-2",
        t: "finished-homework",
        s: "宿題はもう全部終わっ（　）。",
        o: ["ています", "てみます", "ておきます", "てしまいました"],
        a: 3,
        e: e(
          "정답은 てしまいました입니다. 숙제를 완전히 끝냈습니다.",
          "正解は「てしまいました」です。完全な終了です。",
          "The answer is てしまいました, complete finish.",
        ),
      },
      {
        k: "grammar-3",
        t: "deadline-obligation",
        s: "申込書は明日までに出さ（　）。",
        o: [
          "なければなりません",
          "なくてもいいです",
          "ないでください",
          "ないでしょう",
        ],
        a: 0,
        e: e(
          "정답은 なければなりません입니다. 마감까지 제출할 의무입니다.",
          "正解は「なければなりません」です。提出の義務です。",
          "The answer is なければなりません, an obligation.",
        ),
      },
      {
        k: "grammar-3",
        t: "shoe-rule",
        s: "この部屋に入る前に靴を脱が（　）。",
        o: [
          "ないほうがいい",
          "なければなりません",
          "なくてもいいです",
          "ないかもしれません",
        ],
        a: 1,
        e: e(
          "정답은 なければなりません입니다. 입실 전 신발을 벗을 의무입니다.",
          "正解は「なければなりません」です。",
          "The answer is なければなりません.",
        ),
      },
      {
        k: "grammar-4",
        t: "kanji-ability",
        s: "毎日練習して、漢字が読める（　）。",
        o: ["ことにしました", "はずでした", "ようになりました", "ところでした"],
        a: 2,
        e: e(
          "정답은 ようになりました입니다. 연습 뒤 읽는 능력이 생겼습니다.",
          "正解は「ようになりました」です。能力の変化です。",
          "The answer is ようになりました, a new ability.",
        ),
      },
      {
        k: "grammar-4",
        t: "habit-change",
        s: "引っ越してから、自転車で通う（　）。",
        o: ["ことがありました", "ためでした", "わけでした", "ようになりました"],
        a: 3,
        e: e(
          "정답은 ようになりました입니다. 이사 뒤 통근 습관이 변했습니다.",
          "正解は「ようになりました」です。習慣の変化です。",
          "The answer is ようになりました, a habit change.",
        ),
      },
      {
        k: "grammar-5",
        t: "rain-possibility",
        s: "空が暗いので、雨が降る（　）。",
        o: [
          "かもしれません",
          "ことにします",
          "ようにします",
          "はずがありません",
        ],
        a: 0,
        e: e(
          "정답은 かもしれません입니다. 어두운 하늘에서 불확실한 가능성을 말합니다.",
          "正解は「かもしれません」です。不確かな可能性です。",
          "The answer is かもしれません, uncertain possibility.",
        ),
      },
      {
        k: "grammar-5",
        t: "late-possibility",
        s: "道が混んでいて、少し遅れる（　）。",
        o: [
          "ことができます",
          "かもしれません",
          "ようになりました",
          "つもりでした",
        ],
        a: 1,
        e: e(
          "정답은 かもしれません입니다. 지각할 가능성을 말합니다.",
          "正解は「かもしれません」です。遅れる可能性です。",
          "The answer is かもしれません, possible lateness.",
        ),
      },
    ],
  },
  {
    m: "kanji_reading",
    c: [
      {
        k: "kanji-1",
        t: "spring-break",
        s: "「春休み」に旅行します。「春休み」の読みはどれですか。",
        o: ["はるやすみ", "しゅんやすみ", "はるきゅうみ", "ふゆやすみ"],
        a: 0,
        e: e(
          "정답은 はるやすみ입니다.",
          "正解は「はるやすみ」です。",
          "The answer is はるやすみ.",
        ),
      },
      {
        k: "kanji-1",
        t: "youth-reading",
        s: "学生時代は「青春」の思い出です。「青春」の読みはどれですか。",
        o: ["あおはる", "せいしゅん", "せいはる", "しょうしゅん"],
        a: 1,
        e: e(
          "정답은 せいしゅん입니다.",
          "正解は「せいしゅん」です。",
          "The answer is せいしゅん.",
        ),
      },
      {
        k: "kanji-2",
        t: "summer-break",
        s: "「夏休み」は八月です。「夏休み」の読みはどれですか。",
        o: ["かやすみ", "なつきゅうみ", "なつやすみ", "ふゆやすみ"],
        a: 2,
        e: e(
          "정답은 なつやすみ입니다.",
          "正解は「なつやすみ」です。",
          "The answer is なつやすみ.",
        ),
      },
      {
        k: "kanji-2",
        t: "early-summer",
        s: "「初夏」の風が気持ちいいです。「初夏」の読みはどれですか。",
        o: ["はつなつ", "しょげ", "はつか", "しょか"],
        a: 3,
        e: e(
          "정답은 しょか입니다.",
          "正解は「しょか」です。",
          "The answer is しょか.",
        ),
      },
      {
        k: "kanji-3",
        t: "autumn-wind",
        s: "冷たい「秋風」が吹きます。「秋風」の読みはどれですか。",
        o: ["あきかぜ", "しゅうふう", "あきふう", "しゅうかぜ"],
        a: 0,
        e: e(
          "정답은 あきかぜ입니다.",
          "正解は「あきかぜ」です。",
          "The answer is あきかぜ.",
        ),
      },
      {
        k: "kanji-3",
        t: "late-autumn",
        s: "「晩秋」に山の葉が落ちます。「晩秋」の読みはどれですか。",
        o: ["ばんあき", "ばんしゅう", "まつあき", "ばんじゅう"],
        a: 1,
        e: e(
          "정답은 ばんしゅう입니다.",
          "正解は「ばんしゅう」です。",
          "The answer is ばんしゅう.",
        ),
      },
      {
        k: "kanji-4",
        t: "winter-break",
        s: "「冬休み」に祖父母を訪ねます。「冬休み」の読みはどれですか。",
        o: ["とうやすみ", "ふゆきゅうみ", "ふゆやすみ", "なつやすみ"],
        a: 2,
        e: e(
          "정답은 ふゆやすみ입니다.",
          "正解は「ふゆやすみ」です。",
          "The answer is ふゆやすみ.",
        ),
      },
      {
        k: "kanji-4",
        t: "warm-winter",
        s: "今年は「暖冬」だそうです。「暖冬」の読みはどれですか。",
        o: ["あたたふゆ", "だんふゆ", "なんとう", "だんとう"],
        a: 3,
        e: e(
          "정답은 だんとう입니다.",
          "正解は「だんとう」です。",
          "The answer is だんとう.",
        ),
      },
      {
        k: "kanji-5",
        t: "hospital-reading",
        s: "駅の近くに「病院」があります。「病院」の読みはどれですか。",
        o: ["びょういん", "びょうえん", "やまいん", "びょいん"],
        a: 0,
        e: e(
          "정답은 びょういん입니다.",
          "正解は「びょういん」です。",
          "The answer is びょういん.",
        ),
      },
      {
        k: "kanji-5",
        t: "admission-reading",
        s: "父は昨日「入院」しました。「入院」の読みはどれですか。",
        o: ["はいん", "にゅういん", "いりいん", "にゅうえん"],
        a: 1,
        e: e(
          "정답은 にゅういん입니다.",
          "正解は「にゅういん」です。",
          "The answer is にゅういん.",
        ),
      },
    ],
  },
  {
    m: "listening",
    c: [
      {
        k: "listening-1",
        t: "station-meeting",
        s: "二人は何時にどこで会いますか。",
        o: ["三時に駅で", "二時に駅で", "三時に店で", "四時に学校で"],
        a: 0,
        audio: "映画は四時からだね。じゃ、三時に駅で待ち合わせしよう。",
        e: e(
          "정답은 三時に駅で입니다.",
          "正解は「三時に駅で」です。",
          "The answer is at the station at three.",
        ),
      },
      {
        k: "listening-1",
        t: "changed-meeting",
        s: "新しい待ち合わせはいつですか。",
        o: ["一時に駅で", "三時に駅で", "三時に映画館で", "四時に駅で"],
        a: 1,
        audio: "二時は早すぎるから、三時に駅で待ち合わせしよう。",
        e: e(
          "정답은 三時に駅で입니다.",
          "正解は「三時に駅で」です。",
          "The answer is at the station at three.",
        ),
      },
      {
        k: "listening-2",
        t: "ticket-booking",
        s: "女の人は何をしますか。",
        o: ["映画を選ぶ", "駅へ行く", "チケットを予約する", "昼ご飯を作る"],
        a: 2,
        audio:
          "土曜日の映画、席がなくなると困るね。チケットは私が予約しておくよ。",
        e: e(
          "정답은 チケットを予約する입니다.",
          "正解は「チケットを予約する」です。",
          "She will reserve the tickets.",
        ),
      },
      {
        k: "listening-2",
        t: "advance-reservation",
        s: "男の人は旅行の前に何をしますか。",
        o: ["荷物を送る", "ホテルへ行く", "友達に会う", "ホテルを予約する"],
        a: 3,
        audio: "来月の旅行は人が多そうだから、ホテルは僕が予約しておくね。",
        e: e(
          "정답은 ホテルを予約する입니다.",
          "正解は「ホテルを予約する」です。",
          "He will reserve the hotel.",
        ),
      },
      {
        k: "listening-3",
        t: "meeting-time-question",
        s: "女の人は何を聞きましたか。",
        o: ["会う時間", "映画の名前", "駅の場所", "切符の値段"],
        a: 0,
        audio: "日曜日は空いているよ。いいね。何時に会う？",
        e: e(
          "정답은 会う時間입니다.",
          "正解は会う時間です。",
          "She asked the meeting time.",
        ),
      },
      {
        k: "listening-3",
        t: "lunch-time-question",
        s: "男の人は何を知りたいですか。",
        o: ["店の名前", "会う時間", "料理の値段", "駅への道"],
        a: 1,
        audio: "昼ご飯、一緒に食べよう。何時に会う？",
        e: e(
          "정답은 会う時間입니다.",
          "正解は会う時間です。",
          "He wants to know when to meet.",
        ),
      },
      {
        k: "listening-4",
        t: "movie-choice",
        s: "男の人は何を質問しましたか。",
        o: ["映画館の場所", "始まる時間", "見たい映画", "切符の枚数"],
        a: 2,
        audio: "土曜日、映画を見ようよ。何の映画が見たい？",
        e: e(
          "정답은 見たい映画입니다.",
          "正解は見たい映画です。",
          "He asked which movie she wants.",
        ),
      },
      {
        k: "listening-4",
        t: "family-movie-choice",
        s: "母は子どもに何を聞きましたか。",
        o: ["宿題の時間", "夕食の料理", "友達の名前", "見たい映画"],
        a: 3,
        audio: "宿題が終わったら映画を見よう。何の映画が見たい？",
        e: e(
          "정답은 見たい映画입니다.",
          "正解は見たい映画です。",
          "She asked which movie the child wants.",
        ),
      },
      {
        k: "listening-5",
        t: "action-preference",
        s: "女の人はどの映画がいいと言っていますか。",
        o: ["アクション映画", "恋愛映画", "歴史映画", "子ども映画"],
        a: 0,
        audio: "恋愛映画もあるけど、今日はアクション映画がいいかな。",
        e: e(
          "정답은 アクション映画입니다.",
          "正解はアクション映画です。",
          "She prefers an action movie.",
        ),
      },
      {
        k: "listening-5",
        t: "group-movie-preference",
        s: "男の人の希望はどれですか。",
        o: ["映画を見ない", "アクション映画", "朝の映画", "一人で見る"],
        a: 1,
        audio: "みんなで見るなら、アクション映画がいいかな。",
        e: e(
          "정답은 アクション映画입니다.",
          "正解はアクション映画です。",
          "He prefers an action movie.",
        ),
      },
    ],
  },
];
const ins = {
  vocab_mc: l(
    "빈칸에 알맞은 말을 고르세요.",
    "空欄に合う言葉を選んでください。",
    "Choose the word that fits the blank.",
  ),
  grammar_fill: l(
    "문맥과 문법에 맞는 표현을 고르세요.",
    "文脈と文法に合う表現を選んでください。",
    "Choose the expression fitting context and grammar.",
  ),
  kanji_reading: l(
    "지정된 말의 읽기를 고르세요.",
    "指定された語の読みを選んでください。",
    "Choose the reading of the specified word.",
  ),
  listening: l(
    "음성을 듣고 질문에 답하세요.",
    "音声を聞いて質問に答えてください。",
    "Listen and answer the question.",
  ),
};
export const N4_ITEMS: I[] = groups.flatMap(({ m, c }) =>
  c.map((x, i) => {
    const q = ins[m];
    const pattern =
      m === "grammar_fill" || m === "listening"
        ? [0, 1, 2, 3, 2, 3, 0, 1, 2, 3]
        : [0, 1, 0, 2, 1, 3, 0, 1, 2, 3];
    const answer = pattern[i] as 0 | 1 | 2 | 3;
    const correct = x.o[x.a];
    const options = x.o.filter((_, j) => j !== x.a);
    options.splice(answer, 0, correct);
    return {
      id: `lp4-n4-${m}-${i + 1}`,
      concept_key: `lp4-jlpt-n4-${x.k}`,
      track: "jlpt-ja",
      level: "N4",
      section: m,
      difficulty: 2,
      context_tag: x.t,
      question: l(`${q.ko}\n${x.s}`, `${q.ja}\n${x.s}`, `${q.en}\n${x.s}`),
      choices: same(options),
      answer_index: answer,
      explanation: x.e,
      ...(x.audio ? { audio_script: x.audio } : {}),
    };
  }),
);
