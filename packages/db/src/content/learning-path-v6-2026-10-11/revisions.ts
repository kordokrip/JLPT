// 강성호 2026-10-11: v5 동결 실패를 보존하고 문제 요구와 채점 기준의 일치·문법 정답 유일성을 새 v6에서 수정한다.
import type { DraftItem } from "../learning-path-2026-10-11/data.js";

export const V6_ITEM_REVISIONS: Record<string, Partial<DraftItem>> = {
  "lp5-n1-grammar_fill-09": {
    question: {
      ko: "일련의 행사가 시작되는 첫 계기를 나타내는 표현을 고르세요.\n札幌での説明会（　）、全国十都市で意見交換会を開く。",
      ja: "一連の催しの出発点を示す表現を選んでください。\n札幌での説明会（　）、全国十都市で意見交換会を開く。",
      en: "Choose the expression marking the beginning of a series of events.\n札幌での説明会（　）、全国十都市で意見交換会を開く。",
    },
    explanation: {
      ko: "정답은 を皮切りに입니다. 삿포로 설명회를 전국 행사 연속의 출발점으로 나타냅니다. いかんで는 어떤 결과나 내용에 따라 달라짐을 나타내므로 문제에서 요구한 연속 행사의 시작이라는 의미와 다릅니다.",
      ja: "正解は「を皮切りに」です。札幌の説明会を全国の一連の催しの出発点として示します。「いかんで」は結果や内容によって変わることを表し、指定された一連の催しの始まりという意味ではありません。",
      en: "The answer is を皮切りに: the Sapporo briefing starts the nationwide series. いかんで expresses dependence on a result or state, not the beginning-of-a-series meaning requested here.",
    },
  },
  "lp5-n1-grammar_fill-10": {
    question: {
      ko: "여러 판매 시작 중 첫 출발점을 나타내는 표현을 고르세요.\n国内での先行発売（　）、来月からアジア各国でも順次販売を始める。",
      ja: "一連の販売開始の最初の出発点を示す表現を選んでください。\n国内での先行発売（　）、来月からアジア各国でも順次販売を始める。",
      en: "Choose the expression marking the first launch in a sequence of launches.\n国内での先行発売（　）、来月からアジア各国でも順次販売を始める。",
    },
    explanation: {
      ko: "정답은 を皮切りに입니다. 국내 선행 출시가 이어지는 아시아 판매의 첫 출발점입니다. いかんで는 결과에 따른 조건을 나타내므로 이 문제에서 요구한 판매 연속의 시작과 다릅니다.",
      ja: "正解は「を皮切りに」です。国内の先行発売を、続くアジア各国での販売の出発点として示します。「いかんで」は結果による条件を示すため、ここで指定された販売の連続の始まりとは異なります。",
      en: "The answer is を皮切りに: the domestic launch begins the subsequent launches across Asia. いかんで expresses conditional dependence on results, not the requested first launch in a sequence.",
    },
  },
  "lp5-topik-3-reading-b1-authored-2": {
    question: {
      ko: "다음 글을 읽고 질문에 답하십시오.\n[학습실 이용 공지] 시험 기간에는 2층 학습실을 오전 8시부터 오후 10시까지 운영합니다. 좌석은 당일 오전 8시부터 앱으로 예약할 수 있고, 예약 후 20분 안에 입실하지 않으면 자동으로 취소됩니다.\n예약한 좌석이 자동 취소되는 경우는 언제입니까?",
      ja: "次の文章を読んで質問に答えてください。\n[학습실 이용 공지] 시험 기간에는 2층 학습실을 오전 8시부터 오후 10시까지 운영합니다. 좌석은 당일 오전 8시부터 앱으로 예약할 수 있고, 예약 후 20분 안에 입실하지 않으면 자동으로 취소됩니다.\n예약한 좌석이 자동 취소되는 경우는 언제입니까?",
      en: "Read the passage and answer the question.\n[학습실 이용 공지] 시험 기간에는 2층 학습실을 오전 8시부터 오후 10시까지 운영합니다. 좌석은 당일 오전 8시부터 앱으로 예약할 수 있고, 예약 후 20분 안에 입실하지 않으면 자동으로 취소됩니다.\n예약한 좌석이 자동 취소되는 경우는 언제입니까?",
    },
    choices: [
      { ko: "오후 10시까지 공부할 때", ja: "오후 10시까지 공부할 때", en: "오후 10시까지 공부할 때" },
      { ko: "예약 뒤 20분 안에 입실하지 않을 때", ja: "예약 뒤 20분 안에 입실하지 않을 때", en: "예약 뒤 20분 안에 입실하지 않을 때" },
      { ko: "오전 8시에 예약할 때", ja: "오전 8시에 예약할 때", en: "오전 8시에 예약할 때" },
      { ko: "시험 기간에 이용할 때", ja: "시험 기간에 이용할 때", en: "시험 기간에 이용할 때" },
    ],
  },
  "lp5-topik-3-writing-b2-authored-1": {
    rubric: {
      ko: "한국어 이메일 4문장에 감기로 내일 수업에 참석하기 어렵다는 사유와 시점, 과제 제출 방법을 묻는 정중한 질문이 제시되는지 평가합니다. 인사나 별도의 맺음은 선택이며 특정 제출 방법을 답으로 강제하지 않습니다.",
      ja: "韓国語のメール4文で、風邪で明日の授業に出席しにくい理由と時点、課題の提出方法を尋ねる丁寧な質問を示しているか評価します。あいさつや独立した結びは任意で、特定の提出方法は必須ではありません。",
      en: "Assess a four-sentence Korean email explaining that a cold prevents attendance tomorrow and politely asking how to submit the assignment. A greeting and separate closing are optional; no specific submission method is required.",
    },
    explanation: {
      ko: "내일 감기로 결석한다는 상황을 알리고 과제 제출 방법을 정중하게 묻습니다. 총 4문장으로 쓰며 예시의 인사·맺음·이메일 제출 제안은 선택입니다.",
      ja: "風邪で明日欠席する状況を伝え、課題の提出方法を丁寧に尋ねます。合計4文で書き、例のあいさつ・結び・メール提出の提案は任意です。",
      en: "Explain the cold-related absence tomorrow and politely ask about assignment submission in four sentences. The example's greeting, closing, and email-submission suggestion are optional.",
    },
  },
  "lp5-topik-4-writing-b1-authored-1": {
    rubric: {
      ko: "한국어 4~5문장으로 음식 판매 부스 운영 상황을 알리고 영업 신고 필요 여부, 필요 서류, 처리 기간을 공식적인 어조로 문의하는지 평가합니다. 인사나 별도의 맺음은 선택이며 세 질문을 한 문장에 함께 담아도 됩니다.",
      ja: "韓国語4〜5文で食品販売ブースを運営する状況を伝え、営業届の要否・必要書類・処理期間を公式な文体で尋ねているか評価します。あいさつや独立した結びは任意で、三つの質問を一文にまとめても構いません。",
      en: "Assess a formal 4–5 sentence Korean inquiry explaining the food-sales booth and asking about notification requirements, documents, and processing time. A greeting or separate closing is optional, and questions may share a sentence.",
    },
  },
  "lp5-topik-6-writing-b4-authored-1": {
    rubric: {
      ko: "한국어 비판적 논평 6문장에서 신고 건수 감소와 범죄 감소를 구별하고, 제시된 자료의 한계나 타당한 대안 설명을 근거로 주장에 대한 판단을 논증하는지 평가합니다. 인구·신고 방식·인접 지역은 검토 가능한 한계이며 모두 열거하거나 특정 비교·통제 설계를 제안할 필요는 없습니다. 자료에 없는 범죄 감소를 사실로 단정하지 않습니다.",
      ja: "韓国語の批判的論評6文で、通報件数減と犯罪減を区別し、資料の限界や妥当な代替説明を根拠に主張への判断を論じているか評価します。人口・通報方法・隣接地域は検討できる限界であり、全ての列挙や特定の比較・統制設計は必須ではありません。資料にない犯罪減を事実と断定しません。",
      en: "Assess six Korean sentences distinguishing fewer reports from less crime and evaluating the claim using justified evidence limits or alternative explanations. Population, reporting methods, and nearby areas are possible limits, not a compulsory checklist. No particular comparison design is required; do not assert an unobserved crime decline as fact.",
    },
  },
  "lp5-topik-1-writing-b1-authored-1": {
    rubric: {
      ko: "한국어 3문장 전체에 이름, 출신 나라, 좋아하는 활동이 상황에 맞게 제시되는지 평가합니다. 인사는 선택이며 정보를 한 문장에 함께 담아도 됩니다. 예시와 다른 이름·나라·활동도 인정합니다.",
      ja: "韓国語3文全体で名前・出身国・好きな活動が場面に合って示されているか評価します。あいさつは任意で、複数の情報を一文にまとめても構いません。例と異なる名前・国・活動も認めます。",
      en: "Assess three Korean sentences that collectively give a name, country of origin, and preferred activity. A greeting is optional and information may be combined in one sentence. Names, countries, and activities need not match the example.",
    },
  },
  "lp5-topik-1-writing-b1-authored-2": {
    rubric: {
      ko: "한국어 3문장 전체에 이름, 사는 층, 직업이 새 이웃에게 어울리는 정중한 표현으로 제시되는지 평가합니다. 인사는 선택이며 예시의 이름·층·직업을 그대로 쓸 필요는 없습니다.",
      ja: "韓国語3文全体で名前・住む階・職業が新しい隣人に合う丁寧な表現で示されているか評価します。あいさつは任意で、例の名前・階・職業をそのまま使う必要はありません。",
      en: "Assess three Korean sentences collectively stating a name, floor, and occupation politely to a new neighbor. A greeting is optional; the details need not match the example.",
    },
  },
  "lp5-topik-1-writing-b4-authored-2": {
    rubric: {
      ko: "한국어 대화 3문장에 사과 가격을 묻는 표현과 사과 세 개를 달라는 요청이 자연스럽게 포함되는지 평가합니다. 한 개 또는 세 개의 가격을 물어도 되며 상인의 가격 답변은 필수가 아닙니다. 가격·인사·감사 표현은 예시와 달라도 됩니다.",
      ja: "韓国語の会話3文に、りんごの価格を尋ねる表現と三個を求める依頼が自然に含まれるか評価します。一個または三個分の価格を尋ねてもよく、店員の価格回答は必須ではありません。値段・あいさつ・感謝は例と異なっても構いません。",
      en: "Assess a natural three-sentence Korean dialogue asking the price of apples and requesting three apples. Asking for the price of one or three is acceptable; a vendor's price-answer turn is not required. Price and optional greetings or thanks may differ from the example.",
    },
  },
  "lp5-topik-2-grammar-b4-authored-2": {
    question: {
      ko: "다음 대화에서 지금 정한 앞으로의 계획을 나타내는 표현을 고르십시오.\n친구: 내일 점심에 무엇을 할 계획이에요?\n나: 도시락을 먹( ).",
      ja: "次の会話で、今決めた今後の計画を表す韓国語表現を選んでください。\n친구: 내일 점심에 무엇을 할 계획이에요?\n나: 도시락을 먹( ).",
      en: "Choose the Korean expression stating a future plan decided now in this conversation.\n친구: 내일 점심에 무엇을 할 계획이에요?\n나: 도시락을 먹( ).",
    },
    explanation: {
      ko: "정답은 “으려고 합니다”입니다. 현재 정한 앞으로의 계획에는 -(으)려고 하다를 쓰며 먹-에는 으려고 합니다가 붙습니다. 고 싶었어요는 과거의 희망, 었어요는 과거의 행동을 말해 요청한 현재 계획에 맞지 않습니다. 는 바람입니다도 이 형태로는 먹-에 자연스럽게 붙지 않습니다.",
      ja: "正解は韓国語の「으려고 합니다」です。今決めた今後の計画には「-(으)려고 하다」を使い、「먹-」には「으려고 합니다」が付きます。「고 싶었어요」は過去の希望、「었어요」は過去の行動で、指定された現在の計画ではありません。「는 바람입니다」もこの形では「먹-」に自然につながりません。",
      en: "The correct Korean answer is “으려고 합니다.” The requested plan decided now uses -(으)려고 하다, with 으려고 합니다 after 먹-. 고 싶었어요 reports a past wish and 었어요 a past action, not the requested current plan. 는 바람입니다 does not naturally attach to 먹- in this form.",
    },
  },
  "lp5-topik-3-writing-b3-authored-2": {
    explanation: {
      ko: "점심을 거르고 오후에 집중하기 어려운 상황과 관련된 실천 가능한 직장 조언 두 가지를 3~4문장으로 제시합니다. 식사 준비나 휴식은 예시일 뿐 다른 타당한 조언도 가능합니다. 별도의 이유 문장은 필수가 아닙니다.",
      ja: "昼食を抜き午後に集中できない状況に関係する、職場で実践できる助言2点を3〜4文で示します。食事準備や休憩は例にすぎず、他の妥当な助言も認めます。独立した理由の文は必須ではありません。",
      en: "Give two feasible workplace suggestions relevant to skipped lunches and afternoon concentration in 3–4 sentences. Meal preparation and breaks are examples, not mandatory solutions. A separate sentence explaining reasons is not required.",
    },
  },
  "lp5-topik-5-writing-b4-authored-2": {
    rubric: {
      ko: "한국어 의견문 5문장에 오류가 많은 공공기관 자동 자막을 어떻게 개선할지, 품질을 어떻게 확인할지, 누구를 조사할지에 대한 타당하고 서로 연결된 의견이 있는지 평가합니다. 사람 교정·화자 표시·정보 찾기 검사·중도 이탈자 조사는 가능한 예시이며 특정 방법을 강제하지 않습니다.",
      ja: "韓国語の意見文5文で、誤りの多い公共機関の自動字幕の改善・品質確認・調査対象について、妥当でつながりのある意見を示しているか評価します。人による修正・話者表示・情報探索テスト・離脱者調査は選択肢の例であり、特定の方法は必須ではありません。",
      en: "Assess a coherent five-sentence Korean opinion giving justified improvements, quality checks, and survey participants for inaccurate public-video captions. Human correction, speaker labels, information-finding tests, and dropout surveys are examples, not compulsory methods.",
    },
    explanation: {
      ko: "개선·품질 확인·조사 대상이라는 세 요구를 서로 연결해 5문장으로 씁니다. 예시는 한 가지 제안이며 근거가 있는 다른 설계도 인정합니다.",
      ja: "改善・品質確認・調査対象という三つの要求をつなげて5文で書きます。例は一つの提案であり、根拠のある別の設計も認めます。",
      en: "Connect the three requested topics—improvements, quality checks, and survey participants—in five sentences. The model is one proposal; other justified designs are acceptable.",
    },
  },
  "lp5-topik-6-writing-b2-authored-1": {
    rubric: {
      ko: "한국어 6문장으로 연구의 기여, 자료에 근거한 한계, 이를 보완할 후속 설계를 연결하는지 평가합니다. 자기선택·미측정 사전 성적과 동기가 인과 해석에 미치는 영향을 다루고 그에 대응하는 타당한 설계를 제안하면 됩니다. 반복 연구나 특정 비교 방법은 필수가 아닙니다.",
      ja: "韓国語6文で研究の貢献・資料に基づく限界・それを補う追加研究の設計をつなげているか評価します。自己選択、未測定の事前成績と動機が因果解釈に与える影響を扱い、それに対応する妥当な設計を提案します。反復研究や特定の比較方法は必須ではありません。",
      en: "Assess six Korean sentences connecting contribution, evidence-based limits, and a follow-up design. Address how self-selection and unmeasured baseline grades or motivation constrain causal interpretation and propose a justified response. Replication and any particular comparison method are optional.",
    },
  },
  "lp5-topik-6-writing-b3-authored-1": {
    rubric: {
      ko: "한국어 제안문 6문장에 소득 예측 점수의 전제와 위험, 사람 검토, 이의 제기, 감사, 중단 기준을 상황에 맞게 제시하는지 평가합니다. 각 제안이 권리 보호와 어떻게 연결되는지 확인하며 보조 용도만 허용하는 설계나 수치 기준을 강제하지 않습니다. 이의 제기를 보장할 수 없을 때 중단한다는 타당한 질적 기준도 인정합니다.",
      ja: "韓国語の提案文6文で、所得予測点の前提とリスク、人の審査、異議申立、監査、停止基準を場面に合って示しているか評価します。権利保護とのつながりを確認し、補助利用だけの設計や数値基準は必須にしません。異議申立を保障できない場合の停止など、妥当な質的基準も認めます。",
      en: "Assess a six-sentence Korean proposal addressing assumptions, risks, human review, appeals, audits, and stopping criteria. Check relevance to rights protection without requiring assistive-only use or numerical thresholds. A justified qualitative criterion, such as stopping when appeals cannot be guaranteed, is acceptable.",
    },
  },
};

export const V6_CUE_REVISIONS: Record<string, { ko: string; ja: string; en: string }> = {
  "lp4-jlpt-n5-vocab-2": {
    ko: "先生（せんせい）는 가르치는 사람을 부르는 말입니다. 학생을 뜻하는 学生과 구별하고 ‘선생님께 묻다’라는 先生に聞く로 회상하세요.",
    ja: "先生（せんせい）は教える人への呼び方です。学生と区別し、「先生に聞く」で覚えます。",
    en: "先生 (せんせい) addresses a teacher. Contrast 学生 and recall 先生に聞く.",
  },
  "lp4-jlpt-n5-vocab-3": {
    ko: "電車（でんしゃ）는 선로 위를 달리는 전철입니다. 버스와 구별하고 ‘전철을 타다’라는 電車に乗る로 회상하세요.",
    ja: "電車（でんしゃ）は線路を走る乗り物です。バスと区別し、「電車に乗る」で覚えます。",
    en: "電車 (でんしゃ) is a train running on rails. Contrast a bus and recall 電車に乗る.",
  },
  "lp4-jlpt-n5-vocab-4": {
    ko: "友達（ともだち）는 친구를 뜻합니다. 가족을 뜻하는 家族와 구별하고 ‘친구와 이야기하다’라는 友達と話す로 회상하세요.",
    ja: "友達（ともだち）は親しく付き合う人です。家族と区別し、「友達と話す」で覚えます。",
    en: "友達 (ともだち) means friend. Contrast 家族 and recall 友達と話す.",
  },
  "lp4-jlpt-n5-vocab-5": {
    ko: "朝ご飯（あさごはん）은 아침에 먹는 식사입니다. 점심을 뜻하는 昼ご飯과 구별하고 ‘아침밥을 먹다’라는 朝ご飯を食べる로 회상하세요.",
    ja: "朝ご飯（あさごはん）は朝の食事です。昼ご飯と区別し、「朝ご飯を食べる」で覚えます。",
    en: "朝ご飯 (あさごはん) is breakfast. Contrast 昼ご飯 and recall 朝ご飯を食べる.",
  },
  "lp4-jlpt-n5-kanji-1": {
    ko: "日은 음독 ニチ・ジツ, 훈독 ひ・か입니다. 日本은 にほん, 日曜日은 にちようび, 三日은 みっか로 단어째 회상하세요.",
    ja: "「日」はニチ・ジツ／ひ・か。日本、日曜日、三日の読みを語ごとに覚えます。",
    en: "日 has ニチ・ジツ and ひ・か readings; recall 日本, 日曜日, and 三日 as whole words.",
  },
  "lp4-jlpt-n3-grammar-1": {
    ko: "わけではない는 ‘반드시 그런 것은 아니다’라고 단정의 범위를 제한합니다. 동사·い형용사는 보통형, な형용사는 어간+な, 명사는 +である 또는 +という 뒤에 붙입니다. な형용사·명사의 だ를 그대로 앞에 붙이지 않습니다. ‘그럴 리 없다’인 わけがない와 구별하세요.",
    ja: "「わけではない」は「必ずしもそうではない」と断定の範囲を限定します。動詞・イ形容詞は普通形、ナ形容詞は語幹＋な、名詞は＋である、または＋というに続けます。ナ形容詞・名詞の「だ」をそのまま前に付けません。「わけがない」と区別しましょう。",
    en: "わけではない limits a claim to ‘not necessarily so.’ Attach it after a verb or i-adjective in plain form, a na-adjective stem + な, or a noun + である or という—not directly after noun/na-adjective だ. Contrast わけがない, ‘there is no way.’",
  },
  "lp4-jlpt-n2-grammar-1": {
    ko: "わけではない는 앞의 단정을 전부 부정하지 않고 ‘반드시 그런 것은 아니다’라고 한정합니다. 동사·い형용사 보통형+わけではない, な형용사 어간+なわけではない, 명사+であるわけではない 또는 +というわけではない로 접속합니다. 단순한 ではない와 구별하세요.",
    ja: "「わけではない」は前の断定を全面否定せず「必ずしもそうではない」と限定します。動詞・イ形容詞の普通形＋わけではない、ナ形容詞の語幹＋なわけではない、名詞＋であるわけではない、または＋というわけではないと接続します。単純な「ではない」と区別しましょう。",
    en: "わけではない qualifies a claim as ‘not necessarily so.’ Use verb/i-adjective plain form + わけではない, na-adjective stem + なわけではない, or noun + であるわけではない or というわけではない. Contrast a simple categorical ではない.",
  },
  "lp4-jlpt-n2-kanji-2": {
    ko: "準은 음독 ジュン입니다. 準備(じゅんび), 標準(ひょうじゅん)처럼 기준에 맞추거나 갖춘다는 계열로 회상하세요.",
    ja: "「準」は音読みジュンです。「準備（じゅんび）」「標準（ひょうじゅん）」のように、基準に合わせる・整える語で覚えましょう。",
    en: "準 has the on-reading ジュン. Recall it in 準備 and 標準, words connected with readiness or standards.",
  },
};
