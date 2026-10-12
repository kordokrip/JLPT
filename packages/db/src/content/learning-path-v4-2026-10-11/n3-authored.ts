// 강성호 2026-10-11: 실제 N3 공개 개념20개에 다른 두 상황을 연결한 자체 저작40문항·학습 안내이며, 전체은행 독립 검수 전 비공개 초안이다.
import type { DraftItem } from "../learning-path-2026-10-11/data.js";

type Localized = { ko: string; ja: string; en: string };
type AuthoredItem = DraftItem & { context_tag: string };
type Case = {
  concept: string;
  context: string;
  stimulus: string;
  choices: readonly [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  explanation: Localized;
  audio?: string;
};

const L = (ko: string, ja: string, en: string): Localized => ({ ko, ja, en });
const choices = (values: Case["choices"]): Localized[] =>
  values.map((value) => L(value, value, value));

const instructions: Record<
  "vocab_mc" | "grammar_fill" | "kanji_reading" | "listening",
  Localized
> = {
  vocab_mc: L(
    "빈칸에 알맞은 말을 고르세요.",
    "空欄に合う言葉を選んでください。",
    "Choose the word that fits the blank.",
  ),
  grammar_fill: L(
    "문맥과 문법에 알맞은 표현을 고르세요.",
    "文脈と文法に合う表現を選んでください。",
    "Choose the expression that fits both the context and grammar.",
  ),
  kanji_reading: L(
    "밑줄 친 범위의 읽기를 고르세요.",
    "下線部の読み方を選んでください。",
    "Choose the reading of the underlined part.",
  ),
  listening: L(
    "음성을 듣고 질문에 알맞은 답을 고르세요.",
    "音声を聞いて、質問に合う答えを選んでください。",
    "Listen to the audio and choose the answer to the question.",
  ),
};

function make(
  section: keyof typeof instructions,
  serial: number,
  c: Case,
): AuthoredItem {
  const guide = instructions[section];
  return {
    id: `lp4-n3-${section}-${String(serial).padStart(2, "0")}`,
    concept_key: c.concept,
    track: "jlpt-ja",
    level: "N3",
    section,
    difficulty: 3,
    context_tag: c.context,
    question: L(
      `${guide.ko}\n${c.stimulus}`,
      `${guide.ja}\n${c.stimulus}`,
      `${guide.en}\n${c.stimulus}`,
    ),
    choices: choices(c.choices),
    answer_index: c.answer,
    explanation: c.explanation,
    ...(c.audio === undefined ? {} : { audio_script: c.audio }),
  };
}

export const N3_CONCEPT_CUES: Record<string, Localized> = {
  "lp4-jlpt-n3-vocab-1": L(
    "確認은 かくにん으로 읽고, 내용이 맞는지 살피거나 확정하는 뜻입니다. 変更(바꿈)과 구별해 「内容を確認する」로 회상하세요.",
    "確認は「かくにん」と読み、内容が正しいか調べたり確かめたりする語です。変更と区別し、「内容を確認する」で思い出しましょう。",
    "確認 is read かくにん and means checking or making sure something is correct. Distinguish it from 変更 (changing), and recall 内容を確認する.",
  ),
  "lp4-jlpt-n3-vocab-2": L(
    "変更은 へんこう로 읽고, 정해진 내용이나 일정 등을 다른 것으로 바꾸는 뜻입니다. 단순히 살피는 確認과 구별해 「予定を変更する」로 회상하세요.",
    "変更は「へんこう」と読み、決まった内容や予定などを別のものに変える語です。確認と区別し、「予定を変更する」で思い出しましょう。",
    "変更 is read へんこう and means changing a set detail or schedule. Distinguish it from 確認 (checking), and recall 予定を変更する.",
  ),
  "lp4-jlpt-n3-vocab-3": L(
    "影響은 えいきょう로 읽고, 어떤 일이 다른 일의 상태나 결과에 미치는 작용입니다. 직접 도움을 청하는 相談과 구별해 「生活に影響する」로 회상하세요.",
    "影響は「えいきょう」と読み、ある事柄が別の事柄の状態や結果に及ぼす働きです。相談と区別し、「生活に影響する」で思い出しましょう。",
    "影響 is read えいきょう and is an effect on another state or result. Distinguish it from 相談 (consultation), and recall 生活に影響する.",
  ),
  "lp4-jlpt-n3-vocab-4": L(
    "相談은 そうだん으로 읽고, 문제를 해결하려고 다른 사람에게 의견이나 조언을 구하는 뜻입니다. 단순한 보고인 報告과 구별해 「先生に相談する」로 회상하세요.",
    "相談は「そうだん」と読み、問題を解決するために人に意見や助言を求める語です。報告と区別し、「先生に相談する」で思い出しましょう。",
    "相談 is read そうだん and means seeking advice to solve a problem. Distinguish it from 報告 (reporting), and recall 先生に相談する.",
  ),
  "lp4-jlpt-n3-vocab-5": L(
    "状況은 じょうきょう로 읽고, 어떤 시점에 놓인 사정이나 상태를 뜻합니다. 결과를 일으키는 影響과 구별해 「状況を説明する」로 회상하세요.",
    "状況は「じょうきょう」と読み、ある時点での事情や状態を表します。影響と区別し、「状況を説明する」で思い出しましょう。",
    "状況 is read じょうきょう and means the circumstances or state at a given time. Distinguish it from 影響 (effect), and recall 状況を説明する.",
  ),
  "lp4-jlpt-n3-grammar-1": L(
    "보통형 뒤의 わけではない는 전체를 단정적으로 부정하지 않고 “반드시 그런 것은 아니다”라고 범위를 제한합니다. “그럴 리 없다”의 わけがない와 구별하세요.",
    "普通形に続く「わけではない」は、全部を強く否定せず「必ずしもそうではない」と範囲を限定します。「わけがない」と区別しましょう。",
    "After a plain form, わけではない limits a claim: “it is not necessarily the case.” Distinguish it from わけがない, which means “there is no way.”",
  ),
  "lp4-jlpt-n3-grammar-2": L(
    "동사 사전형·ない형 뒤의 ことになっている는 개인의 즉석 결정보다 규칙이나 이미 정해진 약속을 나타냅니다. 개인이 정한 ことにしている와 구별하세요.",
    "動詞の辞書形・ない形に続く「ことになっている」は、個人のその場の決定ではなく、規則や既定の約束を表します。「ことにしている」と区別しましょう。",
    "After a dictionary or nai-form verb, ことになっている states a rule or established arrangement. Distinguish it from ことにしている, a personal decision or practice.",
  ),
  "lp4-jlpt-n3-grammar-3": L(
    "보통형 뒤에 おかげで를 붙이며, な형용사는 な, 명사는 の로 잇습니다. 도움이나 원인으로 좋은 결과가 생겼음을 나타내며, 불리한 결과의 せいで와 구별하세요.",
    "普通形に続き、ナ形容詞は「な」、名詞は「の」で「おかげで」に接続します。良い結果の原因を表し、不利な結果の「せいで」と区別しましょう。",
    "おかげで follows a plain form; na-adjectives take な and nouns take の. It credits a cause for a positive result, unlike せいで for an unfavorable result.",
  ),
  "lp4-jlpt-n3-grammar-4": L(
    "동사 사전형·ない형 뒤의 ようにする는 할 수 있도록 의식적으로 노력하거나 습관으로 삼는 뜻입니다. 자연스럽게 변화한 ようになる와 구별하세요.",
    "動詞の辞書形・ない形に続く「ようにする」は、意識して努力したり習慣にしたりすることを表します。自然な変化の「ようになる」と区別しましょう。",
    "ようにする follows a dictionary or nai-form verb and expresses deliberate effort or habit. Distinguish it from ようになる, which describes a change in state.",
  ),
  "lp4-jlpt-n3-grammar-5": L(
    "명사 뒤의 に対して는 행동·감정의 대상을 가리키거나 두 대상을 대비합니다. 단순한 화제인 について와 달리 방향성이나 대조가 있는지 확인하세요.",
    "名詞に続く「に対して」は、行為・感情の対象、または二者の対比を表します。単なる話題の「について」と違い、方向性や対照があるか確認しましょう。",
    "に対して follows a noun and marks the target of an action or feeling, or a contrast. Unlike について, it highlights direction toward a target or opposition.",
  ),
  "lp4-jlpt-n3-kanji-1": L(
    "確은 음독 カク, 훈독 たし(か)·たし(かめる)입니다. 確認에서는 かく으로 읽고, 確か에서는 たしか로 읽는 차이를 단어째 회상하세요.",
    "「確」の音読みはカク、訓読みは「たし（か）・たし（かめる）」です。「確認」の「かく」と「確か」の「たしか」を語ごとに覚えましょう。",
    "確 has on-reading カク and kun-readings たし(か) and たし(かめる). Recall the whole-word contrast between かく in 確認 and たしか in 確か.",
  ),
  "lp4-jlpt-n3-kanji-2": L(
    "認은 음독 ニン, 훈독 みと(める)입니다. 確認에서는 にん, 認める에서는 みとめる로 읽으므로 활용 형태까지 함께 회상하세요.",
    "「認」の音読みはニン、訓読みは「みと（める）」です。「確認」の「にん」と「認める」の「みとめる」を活用と一緒に覚えましょう。",
    "認 has on-reading ニン and kun-reading みと(める). Recall にん in 確認 and the inflected verb 認める, read みとめる.",
  ),
  "lp4-jlpt-n3-kanji-3": L(
    "議는 주로 음독 ギ로 읽습니다. 会議(かいぎ), 議論(ぎろん)처럼 논의와 관련된 복합어에서 쓰이며, 義(ぎ)와 글자 모양을 구별하세요.",
    "「議」は主に音読みのギで読みます。「会議（かいぎ）」「議論（ぎろん）」など議論に関する語に使われ、形の似た「義」と区別しましょう。",
    "議 is mainly read ギ. It appears in discussion-related compounds such as 会議 (かいぎ) and 議論 (ぎろん); distinguish its written form from 義.",
  ),
  "lp4-jlpt-n3-kanji-4": L(
    "報는 음독 ホウ, 훈독 むく(いる)입니다. 情報(じょうほう)·報告(ほうこく)에서는 ほう, 報いる에서는 むくいる로 읽습니다.",
    "「報」の音読みはホウ、訓読みは「むく（いる）」です。「情報・報告」の「ほう」と「報いる」の「むくいる」を語ごとに覚えましょう。",
    "報 has on-reading ホウ and kun-reading むく(いる). Recall ほう in 情報 and 報告, versus むくいる in 報いる.",
  ),
  "lp4-jlpt-n3-kanji-5": L(
    "連은 음독 レン, 훈독 つら(なる)·つ(れる)입니다. 連絡(れんらく)에서는 れん, 子どもを連れる에서는 つれる로 읽는 차이를 회상하세요.",
    "「連」の音読みはレン、訓読みは「つら（なる）・つ（れる）」です。「連絡」の「れん」と「子どもを連れる」の「つれる」を区別しましょう。",
    "連 has on-reading レン and kun-readings つら(なる) and つ(れる). Contrast れん in 連絡 with つれる in 子どもを連れる.",
  ),
  "lp4-jlpt-n3-listening-1": L(
    "「解けないわけじゃない」는 解けない를 전면 부정해 “풀 수 없는 것은 아니다”, 즉 가능성이 있음을 나타냅니다. 難しそう는 어려워 보인다는 인상일 뿐 불가능 판정이 아닙니다.",
    "「解けないわけじゃない」は「解けない」を全面否定し、「解ける可能性がある」と表します。「難しそう」は印象であり、不可能という判断ではありません。",
    "解けないわけじゃない negates “cannot solve” as an absolute, leaving open that it is solvable. 難しそう only says it looks difficult, not impossible.",
  ),
  "lp4-jlpt-n3-listening-2": L(
    "「雨が降りそう」는 비가 올 듯한 징후, 「持っていったほうがいい」는 우산을 가져가라는 조언입니다. 이미 비가 왔다는 보고와 구별하세요.",
    "「雨が降りそう」は雨の兆候、「持っていったほうがいい」は傘を持参する助言です。すでに雨が降ったという報告と区別しましょう。",
    "雨が降りそう signals likely rain, and 持っていったほうがいい advises taking an umbrella. Distinguish this from a report that rain has already fallen.",
  ),
  "lp4-jlpt-n3-listening-3": L(
    "「天気予報によると」는 정보 출처를, 「晴れるそうだ」는 전해 들은 예보를 나타냅니다. 화자가 직접 하늘을 보고 추측한 표현과 구별하세요.",
    "「天気予報によると」は情報源を、「晴れるそうだ」は伝聞の予報を表します。話者が空を見て直接推測した表現と区別しましょう。",
    "天気予報によると identifies the source, while 晴れるそうだ reports what was heard. Distinguish it from the speaker making a direct visual guess.",
  ),
  "lp4-jlpt-n3-listening-4": L(
    "「来ているはずだ」는 약속이라는 근거로 이미 도착했을 것이라 판단하는 표현입니다. 단순 희망이나 확정된 목격과 구별하세요.",
    "「来ているはずだ」は、約束を根拠にすでに到着していると判断する表現です。単なる希望や、実際に見た確定情報と区別しましょう。",
    "来ているはずだ is an expectation based on the promise that he should already be there. Distinguish it from a mere hope or confirmed eyewitness information.",
  ),
  "lp4-jlpt-n3-listening-5": L(
    "「本物に違いない」는 진품이라고 강하게 판단하는 표현이며, 뒤의 이유가 판단 근거입니다. 사실 확인을 마친 단정이나 가능성만 나타내는 かもしれない와 구별하세요.",
    "「本物に違いない」は本物だと強く判断する表現で、後ろの理由が判断材料です。確認済みの事実や、可能性だけの「かもしれない」と区別しましょう。",
    "本物に違いない expresses a strong judgment that it must be genuine, supported by a stated reason. Distinguish it from verified fact and the weaker かもしれない.",
  ),
};

const vocab: Case[] = [
  {
    concept: "lp4-jlpt-n3-vocab-1",
    context: "clinic-appointment-details",
    stimulus:
      "診察券の番号と予約時間が合っているか、受付で（　）してください。",
    choices: ["確認", "変更", "影響", "相談"],
    answer: 0,
    explanation: L(
      "정답은 確認(かくにん)입니다. 번호와 시간이 맞는지 살피는 행동입니다. 変更은 바꿈, 影響은 영향, 相談은 조언을 구하는 일입니다.",
      "正解は「確認（かくにん）」です。番号と時間が合っているか確かめる行為です。変更は変えること、影響は作用、相談は助言を求めることです。",
      "The answer is 確認 (かくにん), checking whether the number and time match. 変更 is a change, 影響 an effect, and 相談 seeking advice.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-vocab-1",
    context: "factory-safety-check",
    stimulus: "機械を動かす前に、安全装置が働くか必ず（　）します。",
    choices: ["状況", "確認", "相談", "変更"],
    answer: 1,
    explanation: L(
      "정답은 確認입니다. 기계를 작동하기 전에 안전장치의 작동 여부를 점검합니다. 状況은 상태, 相談은 상담, 変更은 변경입니다.",
      "正解は「確認」です。機械を動かす前に安全装置の作動を確かめます。状況は状態、相談は助言を求めること、変更は変えることです。",
      "The answer is 確認 because the safety device is checked before operation. 状況 is circumstances, 相談 consultation, and 変更 a change.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-vocab-2",
    context: "train-ticket-reschedule",
    stimulus: "出張が一日延びたので、帰りの新幹線の予約を（　）しました。",
    choices: ["変更", "確認", "相談", "影響"],
    answer: 0,
    explanation: L(
      "정답은 変更(へんこう)입니다. 출장 일정에 맞춰 예약을 다른 내용으로 바꿨습니다. 確認은 점검, 相談은 상담, 影響은 영향입니다.",
      "正解は「変更（へんこう）」です。出張の日程に合わせて予約内容を変えました。確認は点検、相談は助言を求めること、影響は作用です。",
      "The answer is 変更 (へんこう): the reservation was changed to fit the trip. 確認 is checking, 相談 consulting, and 影響 an effect.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-vocab-2",
    context: "website-address-update",
    stimulus:
      "会社が移転したため、ウェブサイトの住所を新しいものに（　）します。",
    choices: ["相談", "影響", "変更", "状況"],
    answer: 2,
    explanation: L(
      "정답은 変更입니다. 이전에 따라 웹사이트 주소를 새 주소로 바꿉니다. 相談은 조언 요청, 影響은 작용, 状況은 현재 사정입니다.",
      "正解は「変更」です。移転に伴い、サイトの住所を新しい住所に変えます。相談は助言を求めること、影響は作用、状況はその時の状態です。",
      "The answer is 変更 because the listed address is replaced with a new one. 相談 is seeking advice, 影響 an effect, and 状況 the current circumstances.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-vocab-3",
    context: "weather-crop-effect",
    stimulus: "今年の長雨は、野菜の収穫量に大きな（　）を与えました。",
    choices: ["相談", "影響", "状況", "確認"],
    answer: 1,
    explanation: L(
      "정답은 影響(えいきょう)입니다. 긴 장마가 수확량이라는 결과에 작용했습니다. 相談은 상담, 状況은 상태, 確認은 점검입니다.",
      "正解は「影響（えいきょう）」です。長雨が収穫量という結果に作用しました。相談は助言を求めること、状況は状態、確認は点検です。",
      "The answer is 影響 (えいきょう): prolonged rain affected the harvest. 相談 is consultation, 状況 circumstances, and 確認 checking.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-vocab-3",
    context: "construction-commute-effect",
    stimulus: "駅前の工事が朝のバスの運行に（　）して、到着が遅れています。",
    choices: ["変更", "確認", "相談", "影響"],
    answer: 3,
    explanation: L(
      "정답은 影響입니다. 공사가 버스 운행에 작용해 지연이라는 결과를 냈습니다. 変更·確認·相談은 「に～して」로 이 인과를 나타내지 않습니다.",
      "正解は「影響」です。工事がバス運行に作用し、遅延を起こしています。変更・確認・相談は「に～して」でこの因果関係を表しません。",
      "The answer is 影響: construction affects bus service and causes delays. 変更, 確認, and 相談 do not express this causal effect with に～して.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-vocab-4",
    context: "career-advice",
    stimulus: "進学先を決める前に、担任の先生に（　）することにしました。",
    choices: ["相談", "影響", "状況", "確認"],
    answer: 0,
    explanation: L(
      "정답은 相談(そうだん)입니다. 진학 결정을 위해 담임에게 의견을 구합니다. 影響은 작용, 状況은 상태, 確認은 사실 점검입니다.",
      "正解は「相談（そうだん）」です。進学を決めるため担任に意見を求めます。影響は作用、状況は状態、確認は事実の点検です。",
      "The answer is 相談 (そうだん), asking the teacher for advice before deciding. 影響 is an effect, 状況 circumstances, and 確認 checking facts.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-vocab-4",
    context: "apartment-repair-advice",
    stimulus: "天井から水が漏れているので、まず管理会社に（　）しました。",
    choices: ["変更", "相談", "確認", "影響"],
    answer: 1,
    explanation: L(
      "정답은 相談입니다. 누수 문제의 대응을 위해 관리 회사에 연락해 해결 방법을 묻습니다. 나머지는 변경·점검·영향을 뜻합니다.",
      "正解は「相談」です。水漏れへの対応について管理会社に連絡し、解決方法を求めます。ほかは変更・点検・影響を表します。",
      "The answer is 相談 because the tenant asks the management company how to address the leak. The other words mean change, checking, and influence.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-vocab-5",
    context: "road-closure-update",
    stimulus: "事故の（　）がまだ分からないため、警察が周辺を調べています。",
    choices: ["変更", "相談", "状況", "影響"],
    answer: 2,
    explanation: L(
      "정답은 状況(じょうきょう)입니다. 사고가 현재 어떤 상태인지 아직 파악되지 않았습니다. 変更은 바꿈, 相談은 상담, 影響은 다른 것에 미치는 작용입니다.",
      "正解は「状況（じょうきょう）」です。事故が現在どのような状態か、まだ分かっていません。変更は変えること、相談は助言を求めること、影響は他への作用です。",
      "The answer is 状況 (じょうきょう), the current circumstances of the accident. 変更 is a change, 相談 consultation, and 影響 an effect on something else.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-vocab-5",
    context: "project-progress-report",
    stimulus: "会議の最初に、各チームが作業の（　）を説明しました。",
    choices: ["確認", "影響", "相談", "状況"],
    answer: 3,
    explanation: L(
      "정답은 状況입니다. 각 팀이 작업이 현재 어느 단계인지 설명했습니다. 確認은 점검 행위, 影響은 작용, 相談은 조언을 구하는 일입니다.",
      "正解は「状況」です。各チームが作業の現在の状態を説明しました。確認は点検、影響は作用、相談は助言を求めることです。",
      "The answer is 状況 because each team describes its current work state. 確認 is checking, 影響 an effect, and 相談 seeking advice.",
    ),
  },
];

const grammar: Case[] = [
  {
    concept: "lp4-jlpt-n3-grammar-1",
    context: "price-quality-caution",
    stimulus:
      "値段が高い商品が、いつも長く使える（　）。安くても丈夫な物もあります。",
    choices: [
      "わけではありません",
      "ことになっています",
      "おかげです",
      "ようにしています",
    ],
    answer: 0,
    explanation: L(
      "정답은 わけではありません입니다. 뒤 문장이 “비싸면 항상 오래 쓴다”는 일반화를 부분 부정합니다. 다른 보기는 규칙·좋은 원인·의식적 습관이라 문맥과 맞지 않습니다.",
      "正解は「わけではありません」です。後文が「高ければ必ず長く使える」という一般化を部分否定します。ほかは規則・良い原因・意識的習慣です。",
      "The answer is わけではありません. The next sentence limits the generalization that expensive goods always last. The others express a rule, beneficial cause, or deliberate habit.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-grammar-1",
    context: "remote-work-preference",
    stimulus:
      "在宅勤務に反対している（　）。ただ、週に一度は皆で会う必要があると思います。",
    choices: [
      "ことになっています",
      "わけではありません",
      "おかげです",
      "に対しています",
    ],
    answer: 1,
    explanation: L(
      "정답은 わけではありません입니다. 재택근무 자체를 전면 반대하는 것이 아니라 대면 회의도 필요하다는 제한입니다. 다른 보기는 이 부분 부정을 만들지 못합니다.",
      "正解は「わけではありません」です。在宅勤務そのものを全面否定せず、対面の機会も必要だと限定しています。ほかはこの部分否定を作れません。",
      "The answer is わけではありません: the speaker is not wholly opposed to remote work, but adds a limitation. The other choices do not form this partial negation.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-grammar-2",
    context: "laboratory-entry-rule",
    stimulus:
      "この研究室に入るときは、入口でカードを見せる（　）。全員に適用される規則です。",
    choices: [
      "ようにしています",
      "ことになっています",
      "わけではありません",
      "おかげです",
    ],
    answer: 1,
    explanation: L(
      "정답은 ことになっています입니다. “모두에게 적용되는 규칙”이라는 조건이 이미 정해진 절차임을 밝힙니다. ようにしています는 개인 습관이고 나머지는 부정·좋은 원인입니다.",
      "正解は「ことになっています」です。「全員に適用される規則」なので、決められた手続きを表します。「ようにしています」は個人の習慣で、ほかは否定・良い原因です。",
      "The answer is ことになっています because the sentence explicitly states a rule for everyone. ようにしています is a personal habit; the others express negation or a beneficial cause.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-grammar-2",
    context: "library-return-arrangement",
    stimulus:
      "借りた本は、二週間以内に返す（　）。これは図書館の利用規則です。",
    choices: [
      "わけではありません",
      "おかげです",
      "ことになっています",
      "ようにしています",
    ],
    answer: 2,
    explanation: L(
      "정답은 ことになっています입니다. 도서관 이용 규칙으로 정해진 반납 기한을 나타냅니다. 개인적 노력이나 부분 부정, 좋은 결과의 원인이 아닙니다.",
      "正解は「ことになっています」です。図書館の利用規則として定められた返却期限を表します。個人の努力、部分否定、良い結果の原因ではありません。",
      "The answer is ことになっています, an established library return rule. It is not a personal effort, partial negation, or cause of a positive result.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-grammar-3",
    context: "neighbor-directions-help",
    stimulus: "近所の方が道を教えてくれた（　）、迷わず会場に着けました。",
    choices: ["に対して", "わけではなく", "おかげで", "ことになって"],
    answer: 2,
    explanation: L(
      "정답은 おかげで입니다. 이웃의 도움이 “헤매지 않고 도착”이라는 좋은 결과의 원인입니다. に対して는 대상, わけではなく는 부분 부정, ことになって는 정해진 경위입니다.",
      "正解は「おかげで」です。近所の方の助けが「迷わず到着」という良い結果の原因です。ほかは対象・部分否定・決定された経緯を表します。",
      "The answer is おかげで: the neighbor’s help caused the positive result of arriving without getting lost. The others mark a target, partial negation, or an arrangement.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-grammar-3",
    context: "backup-data-recovery",
    stimulus:
      "毎日バックアップを取っていた（　）、故障しても資料を失わずに済みました。",
    choices: ["ことになって", "に対して", "わけではなく", "おかげで"],
    answer: 3,
    explanation: L(
      "정답은 おかげで입니다. 매일 백업한 일이 자료를 잃지 않은 긍정적 결과로 이어졌습니다. 다른 표현은 이 원인·결과와 접속을 만들지 않습니다.",
      "正解は「おかげで」です。毎日のバックアップが、資料を失わないという良い結果につながりました。ほかはこの因果関係と接続を作れません。",
      "The answer is おかげで because daily backups led to the positive outcome of preserving the files. The other expressions do not fit this connection and causality.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-grammar-4",
    context: "work-email-habit",
    stimulus: "誤解を防ぐため、送信前にメールを読み直す（　）。",
    choices: [
      "ようにしています",
      "ことになっています",
      "おかげです",
      "わけではありません",
    ],
    answer: 0,
    explanation: L(
      "정답은 ようにしています입니다. 오해를 막기 위해 스스로 계속 실천하는 습관입니다. ことになっています는 외부 규칙이며, 나머지는 원인·부분 부정입니다.",
      "正解は「ようにしています」です。誤解を防ぐため、自分で継続している習慣です。「ことになっています」は外部の規則で、ほかは原因・部分否定です。",
      "The answer is ようにしています, a deliberately maintained habit to avoid misunderstandings. ことになっています is an external rule; the others express cause or partial negation.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-grammar-4",
    context: "sleep-phone-habit",
    stimulus: "よく眠れるように、寝る一時間前から携帯電話を見ない（　）。",
    choices: [
      "おかげです",
      "ことになっています",
      "わけではありません",
      "ようにしています",
    ],
    answer: 3,
    explanation: L(
      "정답은 ようにしています입니다. 잠을 잘 자기 위해 휴대전화를 보지 않도록 의식적으로 실천합니다. 규칙·좋은 결과의 원인·부분 부정은 이 개인 습관과 다릅니다.",
      "正解は「ようにしています」です。よく眠るため、携帯を見ないことを意識して実践しています。規則・良い結果の原因・部分否定とは異なります。",
      "The answer is ようにしています, a conscious personal practice of avoiding the phone before bed. A rule, beneficial cause, or partial negation does not fit.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-grammar-5",
    context: "customer-response-target",
    stimulus:
      "店長は、商品の遅れについて不安を感じている客（　）、現在の配送状況を説明しました。",
    choices: ["おかげで", "わけではなく", "に対して", "ことになって"],
    answer: 2,
    explanation: L(
      "정답은 に対して입니다. 설명이라는 행동이 불안해하는 고객을 향합니다. おかげで는 좋은 원인, わけではなく는 부정, ことになって는 정해진 경위입니다.",
      "正解は「に対して」です。説明という行為が、不安を感じている客に向けられています。ほかは良い原因・否定・決定された経緯です。",
      "The answer is に対して because the explanation is directed toward worried customers. The others express a beneficial cause, negation, or an arrangement.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-grammar-5",
    context: "siblings-study-contrast",
    stimulus: "姉が朝早く勉強するの（　）、弟は夜になってから机に向かいます。",
    choices: ["ようにして", "おかげで", "わけではなく", "に対して"],
    answer: 3,
    explanation: L(
      "정답은 に対して입니다. 아침에 공부하는 누나와 밤에 공부하는 남동생을 대비합니다. 다른 보기는 습관·좋은 원인·부분 부정으로 두 대상을 대조하지 않습니다.",
      "正解は「に対して」です。朝勉強する姉と、夜勉強する弟を対比しています。ほかは習慣・良い原因・部分否定で、二者を対比しません。",
      "The answer is に対して, contrasting the sister who studies early with the brother who studies at night. The other choices do not create this two-way contrast.",
    ),
  },
];

const kanji: Case[] = [
  {
    concept: "lp4-jlpt-n3-kanji-1",
    context: "schedule-confirmation-reading",
    stimulus:
      "会議の日程を「確認」してから返事をします。下線部「確認」の読み方はどれですか。",
    choices: ["かくにん", "かくじん", "こうにん", "たしかに"],
    answer: 0,
    explanation: L(
      "정답은 かくにん입니다. 이 문장에서 밑줄 범위 「確認」 전체를 かくにん으로 읽습니다. 나머지는 이 단어의 읽기가 아닙니다.",
      "正解は「かくにん」です。この文の下線部「確認」全体を「かくにん」と読みます。ほかはこの語の読みではありません。",
      "The answer is かくにん. The entire underlined word 確認 is read かくにん; the other options are not readings of this word.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-kanji-1",
    context: "evidence-certainty-reading",
    stimulus:
      "その情報が「確か」かどうか、資料で調べてください。下線部「確か」の読み方はどれですか。",
    choices: ["あきらか", "たしか", "かくか", "まさか"],
    answer: 1,
    explanation: L(
      "정답은 たしか입니다. 밑줄 범위 「確か」는 여기서 “확실한가”라는 뜻으로 たしか라고 읽습니다. 다른 보기는 별개의 말이거나 존재하지 않는 읽기입니다.",
      "正解は「たしか」です。下線部「確か」はここで「確実か」という意味で「たしか」と読みます。ほかは別の語、または存在しない読みです。",
      "The answer is たしか. Here 確か means “certain” and is read たしか. The other options are different words or invalid readings.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-kanji-2",
    context: "mistake-admission-reading",
    stimulus:
      "彼は自分の間違いを「認めました」。下線部「認めました」の読み方はどれですか。",
    choices: ["みとめました", "すすめました", "まとめました", "ながめました"],
    answer: 0,
    explanation: L(
      "정답은 みとめました입니다. 밑줄 범위 「認めました」는 동사 認める의 과거 정중형입니다. 나머지는 권하다·정리하다·바라보다라는 다른 동사입니다.",
      "正解は「みとめました」です。「認めました」は動詞「認める」の丁寧な過去形です。ほかは勧める・まとめる・眺めるという別の動詞です。",
      "The answer is みとめました, the polite past of 認める. The distractors are different verbs meaning recommend, summarize, or gaze.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-kanji-2",
    context: "identity-verification-reading",
    stimulus:
      "受付で本人「認証」が必要です。下線部「認証」の読み方はどれですか。",
    choices: ["じんしょう", "にんじょう", "にんしょう", "みとしょう"],
    answer: 2,
    explanation: L(
      "정답은 にんしょう입니다. 밑줄 범위 「認証」 전체는 にんしょう로 읽습니다. 認은 이 복합어에서 음독 にん입니다.",
      "正解は「にんしょう」です。下線部「認証」全体を「にんしょう」と読みます。「認」はこの熟語で音読みの「にん」です。",
      "The answer is にんしょう. The whole compound 認証 is read にんしょう, using the on-reading にん for 認.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-kanji-3",
    context: "meeting-reading",
    stimulus:
      "午後の「会議」は三階で行われます。下線部「会議」の読み方はどれですか。",
    choices: ["かいき", "かいご", "かいぎ", "えぎ"],
    answer: 2,
    explanation: L(
      "정답은 かいぎ입니다. 밑줄 범위 「会議」는 かいぎ로 읽으며 議의 음독은 ぎ입니다. 다른 보기는 탁음이나 음절이 맞지 않습니다.",
      "正解は「かいぎ」です。下線部「会議」は「かいぎ」と読み、「議」の音読みは「ぎ」です。ほかは濁音や音節が合いません。",
      "The answer is かいぎ. 会議 is read かいぎ, with ぎ as the on-reading of 議. The other options have incorrect sounds.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-kanji-3",
    context: "discussion-reading",
    stimulus:
      "計画について十分に「議論」しました。下線部「議論」の読み方はどれですか。",
    choices: ["ぎれん", "きろん", "ろんぎ", "ぎろん"],
    answer: 3,
    explanation: L(
      "정답은 ぎろん입니다. 밑줄 범위 「議論」 전체는 ぎろん으로 읽습니다. 議는 ぎ, 論은 ろん입니다.",
      "正解は「ぎろん」です。下線部「議論」全体を「ぎろん」と読みます。「議」は「ぎ」、「論」は「ろん」です。",
      "The answer is ぎろん. The entire word 議論 is read ぎろん: 議 is ぎ and 論 is ろん.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-kanji-4",
    context: "weather-information-reading",
    stimulus:
      "出発前に最新の「情報」を調べました。下線部「情報」の読み方はどれですか。",
    choices: ["じょうほう", "じょうぼう", "じょほう", "せいほう"],
    answer: 0,
    explanation: L(
      "정답은 じょうほう입니다. 밑줄 범위 「情報」는 じょうほう로 읽고, 報는 이 복합어에서 ほう입니다.",
      "正解は「じょうほう」です。下線部「情報」は「じょうほう」と読み、「報」はこの熟語で「ほう」です。",
      "The answer is じょうほう. 情報 is read じょうほう, with ほう as the reading of 報 in this compound.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-kanji-4",
    context: "incident-report-reading",
    stimulus:
      "担当者が事故の「報告」をまとめています。下線部「報告」の読み方はどれですか。",
    choices: ["ぼうこく", "ほうこく", "ほうこう", "むくこく"],
    answer: 1,
    explanation: L(
      "정답은 ほうこく입니다. 밑줄 범위 「報告」 전체를 ほうこく으로 읽습니다. 선택지 배열에서 두 번째가 정답이며, 다른 보기는 탁음·장음·훈독 적용이 틀립니다.",
      "正解は「ほうこく」です。下線部「報告」全体を「ほうこく」と読みます。ほかは濁音・長音・訓読みの使い方が誤っています。",
      "The answer is ほうこく, the reading of the whole underlined word 報告. The other options incorrectly change voicing, vowel length, or use a kun-reading.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-kanji-5",
    context: "contact-reading",
    stimulus:
      "到着が遅れる場合は、駅員に「連絡」してください。下線部「連絡」の読み方はどれですか。",
    choices: ["れいらく", "れんらく", "れんがく", "つららく"],
    answer: 1,
    explanation: L(
      "정답은 れんらく입니다. 밑줄 범위 「連絡」는 れんらく로 읽습니다. 선택지 배열에서 세 번째이며, 連의 음독은 れん입니다.",
      "正解は「れんらく」です。下線部「連絡」は「れんらく」と読みます。「連」の音読みは「れん」です。",
      "The answer is れんらく, the reading of the underlined word 連絡. The on-reading of 連 here is れん.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-kanji-5",
    context: "taking-child-reading",
    stimulus:
      "姉は子どもを「連れて」公園へ行きました。下線部「連れて」の読み方はどれですか。",
    choices: ["ならべて", "つられて", "はなれて", "つれて"],
    answer: 3,
    explanation: L(
      "정답은 つれて입니다. 밑줄 범위 「連れて」는 동사 連れる의 て형으로 つれて라고 읽습니다. 나머지는 늘어놓다·휩쓸리다·떨어지다의 다른 형태입니다.",
      "正解は「つれて」です。下線部「連れて」は動詞「連れる」のテ形です。ほかは並べる・つられる・離れるの別の形です。",
      "The answer is つれて, the te-form of 連れる. The distractors belong to other verbs such as arranging, being influenced, or separating.",
    ),
  },
];

const listening: Case[] = [
  {
    concept: "lp4-jlpt-n3-listening-1",
    context: "study-group-problem",
    stimulus: "話している人は、この問題についてどう考えていますか。",
    choices: [
      "難しいが解ける可能性はある",
      "簡単なのですぐ解ける",
      "難しすぎて絶対に解けない",
      "もう答えを知っている",
    ],
    answer: 0,
    audio:
      "この問題、見た目は難しいね。でも、時間をかければ解けないわけじゃないと思うよ。",
    explanation: L(
      "정답은 「難しいが解ける可能性はある」입니다. 대본은 어려워 보이지만 시간을 들이면 못 풀 것은 아니라고 합니다. 쉽다, 절대 불가능하다, 답을 안다는 내용은 없습니다.",
      "正解は「難しいが解ける可能性はある」です。音声では、難しそうでも時間をかければ解けないわけではないと述べています。ほかの内容は述べていません。",
      "The answer is “It is difficult but may be solvable.” The speaker says time may make it solvable, not that it is easy, impossible, or already answered.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-listening-1",
    context: "cooking-new-recipe",
    stimulus: "女の人は新しい料理について何と言っていますか。",
    choices: [
      "材料があっても作れない",
      "材料があれば作れるかもしれない",
      "もう何度も作った",
      "作るつもりは全くない",
    ],
    answer: 1,
    audio:
      "作り方は少し複雑だけど、材料さえそろえば、私にも作れないわけではないと思う。",
    explanation: L(
      "정답은 「材料があれば作れるかもしれない」입니다. 재료가 갖춰지면 자신도 못 만들 것은 아니라고 말합니다. 다른 선택지는 불가능·경험 완료·의도 부재로 대본과 다릅니다.",
      "正解は「材料があれば作れるかもしれない」です。材料がそろえば自分にも作れないわけではないと話しています。ほかは音声と異なります。",
      "The answer is “She may be able to make it if she has the ingredients.” The audio leaves that possibility open; the other choices contradict it.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-listening-2",
    context: "morning-commute-weather",
    stimulus: "男の人は、女の人に何を勧めていますか。",
    choices: [
      "電車を使わないこと",
      "傘を持って出ること",
      "午後まで家にいること",
      "厚いコートを着ること",
    ],
    answer: 1,
    audio:
      "空が急に暗くなってきたよ。駅まで行く間に雨が降りそうだから、傘を持っていったほうがいいよ。",
    explanation: L(
      "정답은 「傘を持って出ること」입니다. 역까지 가는 사이 비가 올 듯해 우산을 가져가라고 조언합니다. 교통수단·외출 시각·코트 이야기는 없습니다.",
      "正解は「傘を持って出ること」です。駅までの間に雨が降りそうなので、傘を勧めています。交通手段・外出時刻・コートの話はありません。",
      "The answer is “Take an umbrella.” Rain may start before the station. The audio says nothing about avoiding trains, staying home, or wearing a heavy coat.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-listening-2",
    context: "hiking-weather-advice",
    stimulus: "先輩は山へ行く人に何をするように言っていますか。",
    choices: [
      "予定を来月に変える",
      "水だけ持っていく",
      "雨具も準備する",
      "一人で出発する",
    ],
    answer: 2,
    audio:
      "山の天気は変わりやすいよ。朝は晴れていても午後は雨になりそうだから、雨具も用意したほうがいい。",
    explanation: L(
      "정답은 「雨具も準備する」입니다. 오후에 비가 올 가능성 때문에 우비도 준비하라고 합니다. 일정 변경·물만 준비·혼자 출발은 말하지 않았습니다.",
      "正解は「雨具も準備する」です。午後は雨になりそうなので、雨具の用意を勧めています。ほかの行動は述べていません。",
      "The answer is “Prepare rain gear too.” The speaker anticipates afternoon rain; changing the month, taking only water, or leaving alone is not mentioned.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-listening-3",
    context: "weekend-picnic-forecast",
    stimulus: "天気予報では、土曜日はどうなると言っていますか。",
    choices: [
      "朝から雪が降る",
      "一日中雨が続く",
      "昼ごろから晴れる",
      "強い風だけが続く",
    ],
    answer: 2,
    audio:
      "天気予報によると、土曜日は朝まで雨ですが、昼ごろから晴れるそうです。ピクニックは午後ならできそうですね。",
    explanation: L(
      "정답은 「昼ごろから晴れる」입니다. 예보는 아침까지 비가 오고 낮 무렵부터 맑아진다고 합니다. 눈·종일 비·강풍 지속은 대본과 다릅니다.",
      "正解は「昼ごろから晴れる」です。予報では朝まで雨で、昼ごろから晴れるそうです。雪・一日中の雨・強風は述べていません。",
      "The answer is “It will clear around noon.” The forecast says rain lasts only until morning; snow, all-day rain, and continuing strong winds are not stated.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-listening-3",
    context: "train-delay-report",
    stimulus: "放送によると、電車はなぜ遅れていますか。",
    choices: [
      "乗客が少ないから",
      "雨がやんだから",
      "駅員が交代するから",
      "車両を点検しているから",
    ],
    answer: 3,
    audio:
      "駅の放送によると、前の駅で車両を点検しているため、この電車は十分ほど遅れているそうです。",
    explanation: L(
      "정답은 「車両を点検しているから」입니다. 방송에 따르면 앞 역의 차량 점검 때문에 약 10분 지연됩니다. 나머지는 지연 이유로 언급되지 않았습니다.",
      "正解は「車両を点検しているから」です。放送によると、前の駅での車両点検により約十分遅れています。ほかの理由は述べていません。",
      "The answer is “Because a train is being inspected.” The announcement attributes the ten-minute delay to inspection at the previous station; no other reason is given.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-listening-4",
    context: "restaurant-meeting-arrival",
    stimulus: "女の人は田中さんについてどう考えていますか。",
    choices: [
      "約束どおり、もう店に着いていると思う",
      "今日は来ないと聞いた",
      "道に迷ったことを確認した",
      "予約を忘れたと思う",
    ],
    answer: 0,
    audio:
      "田中さんなら、もう店に着いているはずよ。十分前に来ると昨日約束していたから。",
    explanation: L(
      "정답은 「約束どおり、もう店に着いていると思う」입니다. 어제의 약속을 근거로 이미 도착했을 것이라 판단합니다. 불참·길 잃음 확인·예약 망각은 없습니다.",
      "正解は「約束どおり、もう店に着いていると思う」です。昨日の約束を根拠に、到着済みだと判断しています。ほかの内容はありません。",
      "The answer is that Tanaka should already be at the restaurant as promised. The inference is based on yesterday’s promise; the other situations are not mentioned.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-listening-4",
    context: "package-delivery-expectation",
    stimulus: "男の人は荷物についてどう判断していますか。",
    choices: [
      "まだ発送されていない",
      "送り先を間違えた",
      "自分で店へ取りに行く",
      "今日届く予定だと思う",
    ],
    answer: 3,
    audio:
      "配送会社から今朝、配達中という連絡が来たから、荷物は今日中に届くはずだよ。",
    explanation: L(
      "정답은 「今日届く予定だと思う」입니다. 아침에 배송 중이라는 연락을 받아 오늘 안에 도착할 것이라고 판단합니다. 미발송·주소 오류·직접 수령은 말하지 않았습니다.",
      "正解は「今日届く予定だと思う」です。今朝の「配達中」という連絡から、今日中に届くと判断しています。ほかは述べていません。",
      "The answer is that the package should arrive today. The delivery notice supports that expectation; the other options are not stated.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-listening-5",
    context: "museum-vase-judgment",
    stimulus: "専門家は花瓶をどう判断していますか。",
    choices: [
      "最近作られた品だ",
      "本物かどうか分からない",
      "本物に違いない",
      "修理できない偽物だ",
    ],
    answer: 2,
    audio:
      "この花瓶には当時の職人だけが使った印があります。細かい傷も年代と合うので、本物に違いありません。",
    explanation: L(
      "정답은 「本物に違いない」입니다. 당시 장인의 표식과 연대에 맞는 흠집을 근거로 진품이라고 강하게 판단합니다. 다른 선택지는 그 판단과 반대입니다.",
      "正解は「本物に違いない」です。職人の印と年代に合う傷を根拠に、本物だと強く判断しています。ほかはその判断と異なります。",
      "The answer is “It must be genuine.” The expert cites the maker’s mark and age-consistent scratches. The other choices contradict that judgment.",
    ),
  },
  {
    concept: "lp4-jlpt-n3-listening-5",
    context: "office-light-judgment",
    stimulus: "女の人は会議室についてどう考えていますか。",
    choices: [
      "誰も使っていない",
      "掃除が終わった",
      "予約が取り消された",
      "中に誰かいると思う",
    ],
    answer: 3,
    audio:
      "会議室の電気がついていて、中から話し声も聞こえます。誰かが使っているに違いありません。",
    explanation: L(
      "정답은 「中に誰かいると思う」입니다. 불이 켜져 있고 말소리가 들린다는 근거로 누군가 사용 중이라고 강하게 판단합니다. 다른 선택지는 대본에 없습니다.",
      "正解は「中に誰かいると思う」です。照明と話し声を根拠に、誰かが使用中だと強く判断しています。ほかは音声にありません。",
      "The answer is that someone must be inside. The light and voices support that judgment; the other situations are absent from the audio.",
    ),
  },
];

export const N3_ITEMS: Array<DraftItem & { context_tag: string }> = [
  ...vocab.map((c, i) => make("vocab_mc", i + 1, c)),
  ...grammar.map((c, i) => make("grammar_fill", i + 1, c)),
  ...kanji.map((c, i) => make("kanji_reading", i + 1, c)),
  ...listening.map((c, i) => make("listening", i + 1, c)),
];
