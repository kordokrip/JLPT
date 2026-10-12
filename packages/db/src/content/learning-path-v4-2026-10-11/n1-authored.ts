// 강성호 2026-10-11: 실제 N1 공개 개념20개에 서로 다른 두 상황을 연결한 자체 저작40문항·학습 안내이며, 전체은행 독립 검수 전 비공개 초안이다.
import type { DraftItem } from "../learning-path-2026-10-11/data.js";

type Localized = { ko: string; ja: string; en: string };
type AuthoredItem = DraftItem & { context_tag: string };
type Mode = "vocab_mc" | "grammar_fill" | "kanji_reading" | "listening";
type Case = {
  concept: string;
  context: string;
  stimulus: string;
  choices: string[];
  answer: 0 | 1 | 2 | 3;
  explanation: Localized;
  audio?: string;
};

const l = (ko: string, ja: string, en: string): Localized => ({ ko, ja, en });
const same = (values: string[]): Localized[] => values.map((value) => l(value, value, value));

const instructions: Record<Mode, Localized> = {
  vocab_mc: l("빈칸에 알맞은 말을 고르세요.", "空欄に合う言葉を選んでください。", "Choose the word that fits the blank."),
  grammar_fill: l("문맥과 문법에 알맞은 표현을 고르세요.", "文脈と文法に合う表現を選んでください。", "Choose the expression that fits both the context and grammar."),
  kanji_reading: l("지정된 말의 읽기를 고르세요.", "指定された語の読みを選んでください。", "Choose the reading of the specified word."),
  listening: l("음성을 듣고 질문에 답하세요.", "音声を聞いて質問に答えてください。", "Listen and answer the question."),
};

export const N1_CONCEPT_CUES20: Record<string, Localized> = {
  "lp4-jlpt-n1-vocab-1": l("論拠는 ろんきょ로 읽고 주장이나 판단을 뒷받침하는 근거입니다. 단순한 계기인 契機와 구별해 「論拠を示す」로 회상하세요.", "論拠は「ろんきょ」と読み、主張や判断を支える根拠です。単なる契機と区別し、「論拠を示す」で思い出しましょう。", "論拠 is read ろんきょ and means grounds supporting a claim or judgment. Contrast it with a mere trigger, 契機, and recall 論拠を示す."),
  "lp4-jlpt-n1-vocab-2": l("脈絡는 みゃくらく로 읽고 말이나 생각이 논리적으로 이어지는 흐름입니다. 배경 전반인 文脈과 겹치지만 「脈絡のない話」처럼 연결성에 초점을 둡니다.", "脈絡は「みゃくらく」と読み、話や考えの論理的なつながりを表します。文脈と重なりますが、「脈絡のない話」のように連続性に焦点があります。", "脈絡 is read みゃくらく and denotes the logical connection of ideas. It overlaps with 文脈 but emphasizes coherence, as in 脈絡のない話."),
  "lp4-jlpt-n1-vocab-3": l("妥当는 だとう로 읽고 이유·조건에 비추어 적절하고 합리적임을 나타냅니다. 단순히 가능한 可能과 구별해 「判断は妥当だ」로 회상하세요.", "妥当は「だとう」と読み、理由や条件に照らして適切で合理的であることを表します。可能と区別し、「判断は妥当だ」で思い出しましょう。", "妥当 is read だとう and means appropriate and reasonable under the relevant grounds or conditions. Contrast it with mere possibility and recall 判断は妥当だ."),
  "lp4-jlpt-n1-vocab-4": l("乖離는 かいり로 읽고 두 수치·인식·상태가 서로 벌어진 상태입니다. 일시적 차이인 差보다 기대와 실제의 불일치에 초점을 둔 「実態との乖離」로 회상하세요.", "乖離は「かいり」と読み、二つの数値・認識・状態が離れていることです。単なる差より不一致に焦点を置く「実態との乖離」で思い出しましょう。", "乖離 is read かいり and means a divergence between figures, perceptions, or states. Recall 実態との乖離, which stresses mismatch rather than a simple difference."),
  "lp4-jlpt-n1-vocab-5": l("是正는 ぜせい로 읽고 잘못되거나 치우친 상태를 올바르게 고치는 일입니다. 단순 변경인 変更과 구별해 「格差を是正する」로 회상하세요.", "是正は「ぜせい」と読み、誤りや偏りのある状態を正しく直すことです。単なる変更と区別し、「格差を是正する」で思い出しましょう。", "是正 is read ぜせい and means correcting an error or imbalance. Contrast it with a neutral change, 変更, and recall 格差を是正する."),
  "lp4-jlpt-n1-grammar-1": l("명사 뒤의 いかんだ·いかんにかかっている는 결과가 그 조건의 내용이나 정도에 달렸음을 격식 있게 나타냅니다. 이유를 직접 말하는 ためだ와 구별하세요.", "名詞に続く「いかんだ・いかんにかかっている」は、結果がその条件の内容や程度に左右されることを改まって表します。理由を直接示す「ためだ」と区別しましょう。", "After a noun, いかんだ or いかんにかかっている formally states that an outcome depends on that condition. Contrast it with ためだ, which directly gives a reason."),
  "lp4-jlpt-n1-grammar-2": l("명사 뒤의 を余儀なくされる는 외부 사정 때문에 원치 않던 행동이나 변화를 피할 수 없음을 나타냅니다. 스스로 선택한 ことにする와 구별하세요.", "名詞に続く「を余儀なくされる」は、外的事情により望まない行動や変化を避けられないことを表します。自ら選ぶ「ことにする」と区別しましょう。", "Noun + を余儀なくされる means external circumstances force an unwanted action or change. Contrast it with ことにする, a voluntary decision."),
  "lp4-jlpt-n1-grammar-3": l("명사 뒤의 ならではの·ならではだ는 그 대상에만 있는 특징이나 그 대상이기에 가능한 가치를 강조합니다. 단순 예시인 など와 구별하세요.", "名詞に続く「ならではの・ならではだ」は、その対象だけの特徴や、その対象だからこそ可能な価値を強調します。単なる例示の「など」と区別しましょう。", "Noun + ならではの or ならではだ emphasizes a distinctive quality possible only for that entity. Contrast it with など, which merely gives examples."),
  "lp4-jlpt-n1-grammar-4": l("동사 ない형+までも 또는 명사+ではないまでも는 강한 기준에는 못 미쳐도 더 약한 기준은 성립함을 나타냅니다. 전면 부정인 わけではない와 구별하세요.", "動詞ない形＋「までも」、または名詞＋「ではないまでも」は、強い基準には届かなくても、より弱い基準は成り立つことを表します。全面的な断定を避ける「わけではない」と区別しましょう。", "Verb nai-form + までも or noun + ではないまでも concedes a weaker degree while denying a stronger one. Contrast it with わけではない, which limits a general assertion."),
  "lp4-jlpt-n1-grammar-5": l("명사 뒤의 を皮切りに는 한 사건을 출발점으로 같은 흐름의 일이 잇따름을 나타냅니다. 한 번의 시작만 말하는 から와 구별하세요.", "名詞に続く「を皮切りに」は、一つの出来事を出発点として同じ流れの事柄が次々に続くことを表します。一度の起点だけを示す「から」と区別しましょう。", "Noun + を皮切りに marks the first event in a continuing series. Contrast it with から, which can mark a starting point without implying a sequence."),
  "lp4-jlpt-n1-kanji-1": l("顕의 음독은 ケン이며 顕著(けんちょ)·顕在化(けんざいか)에서 드러남의 뜻을 이룹니다. 학습 표기의 훈독 あきらか와 함께 단어째 회상하세요.", "「顕」の音読みはケンで、「顕著（けんちょ）」「顕在化（けんざいか）」で表面に現れる意味を作ります。学習表記の訓読み「あきらか」とともに語ごと覚えましょう。", "顕 has the on-reading ケン in 顕著 (けんちょ) and 顕在化 (けんざいか), both connected with becoming apparent. Recall the whole words alongside the listed kun-reading あきらか."),
  "lp4-jlpt-n1-kanji-2": l("遂의 음독은 スイ, 훈독은 とげる입니다. 遂行(すいこう)은 일을 끝까지 수행함, 成し遂げる(なしとげる)는 완수함이므로 형태별 읽기를 구별하세요.", "「遂」の音読みはスイ、訓読みは「とげる」です。「遂行（すいこう）」と「成し遂げる（なしとげる）」を形ごとに区別しましょう。", "遂 has on-reading スイ and kun-reading とげる. Contrast 遂行 (すいこう), carrying something through, with 成し遂げる (なしとげる), accomplishing it."),
  "lp4-jlpt-n1-kanji-3": l("衡의 음독은 コウ이며 均衡(きんこう)·不均衡(ふきんこう)에서 균형의 뜻을 이룹니다. 다른 コウ 한자와 글자 모양을 함께 구별하세요.", "「衡」の音読みはコウで、「均衡（きんこう）」「不均衡（ふきんこう）」で釣り合いの意味を作ります。同じコウと読む別の漢字と字形も区別しましょう。", "衡 has the on-reading コウ and forms 均衡 (きんこう) and 不均衡 (ふきんこう), both concerning balance. Distinguish its shape from other kanji read コウ."),
  "lp4-jlpt-n1-kanji-4": l("遵은 음독 ジュン으로 읽으며 遵守(じゅんしゅ)·遵法(じゅんぽう)처럼 규칙이나 법을 따르는 말에 쓰입니다. 準(じゅん)과 글자와 뜻을 구별하세요.", "「遵」は音読みのジュンで、「遵守（じゅんしゅ）」「遵法（じゅんぽう）」のように規則や法に従う語に使われます。「準」と字形・意味を区別しましょう。", "遵 is read ジュン in words about following rules or law, such as 遵守 (じゅんしゅ) and 遵法 (じゅんぽう). Distinguish it in form and meaning from 準."),
  "lp4-jlpt-n1-kanji-5": l("慮의 음독은 リョ이며 配慮(はいりょ)·考慮(こうりょ)에서 신중히 생각함을 나타냅니다. 학습 표기의 훈독 おもんぱかる도 단어째 회상하세요.", "「慮」の音読みはリョで、「配慮（はいりょ）」「考慮（こうりょ）」で慎重に考える意味を表します。学習表記の訓読み「おもんぱかる」も語ごと覚えましょう。", "慮 has the on-reading リョ in 配慮 (はいりょ) and 考慮 (こうりょ), both involving careful thought. Also recall the listed kun-reading おもんぱかる as a whole word."),
  "lp4-jlpt-n1-listening-1": l("결론만이 아니라 論拠와 脈絡을 차례로 확인하라는 말은 주장 평가에서 근거와 논리 전개를 함께 보라는 뜻입니다. 결론의 찬반만 묻는 말과 구별하세요.", "結論だけでなく論拠と脈絡を順に確認するとは、主張を評価する際に根拠と論理展開の両方を見るということです。結論への賛否だけを問う発言と区別しましょう。", "Checking both 論拠 and 脈絡 means evaluating evidence and the flow of reasoning, not merely agreeing or disagreeing with the conclusion."),
  "lp4-jlpt-n1-listening-2": l("顕著な変化가 보여도 원인을 하나로 한정하지 않는다는 말은 관찰된 변화와 인과 판단을 분리합니다. 변화가 없다는 뜻이나 특정 원인을 확정한 말이 아닙니다.", "顕著な変化が見えても原因を一つに限定しないという発言は、観察された変化と因果判断を分けています。変化がないという意味でも、特定の原因を確定した発言でもありません。", "Even when a change is 顕著, refusing to reduce it to one cause separates observation from causal judgment. It neither denies the change nor confirms a specific cause."),
  "lp4-jlpt-n1-listening-3": l("제안의 妥当性을 검증할 때 이용자 견해도 포함한다는 말은 내부 논리뿐 아니라 영향받는 사람의 관점도 판단 자료로 삼는다는 뜻입니다.", "提案の妥当性を検証する際に利用者の見解も含めるとは、内部の論理だけでなく、影響を受ける人の視点も判断材料にするという意味です。", "Including users' views when assessing a proposal's 妥当性 means using the perspective of affected people as evidence, not relying only on internal logic."),
  "lp4-jlpt-n1-listening-4": l("현장 체감과 보고서에 乖離가 없는지 조사한다는 말은 두 정보가 일치하는지 대조한다는 뜻입니다. 보고서가 틀렸다고 이미 결론 내린 말은 아닙니다.", "現場の実感と報告書に乖離がないか調べるとは、二つの情報が一致するか照合することです。報告書が誤りだとすでに結論づけた発言ではありません。", "Checking for 乖離 between field experience and a report means comparing them for consistency. It does not pre-judge the report as wrong."),
  "lp4-jlpt-n1-listening-5": l("작은 오류를 조기에 是正하면 큰 우려를 막을 수 있다는 말은 초기 수정의 예방 효과를 강조합니다. 오류를 숨기거나 문제가 커진 뒤 대응하자는 뜻이 아닙니다.", "小さな誤りを早期に是正すれば大きな懸念を防げるという発言は、初期の修正による予防を強調しています。誤りを隠したり、問題の拡大後に対応したりする意味ではありません。", "Correcting a small error early emphasizes prevention before it becomes a larger concern. It does not advocate hiding the error or waiting for escalation."),
};

const groups: { mode: Mode; cases: Case[] }[] = [
  { mode: "vocab_mc", cases: [
    { concept:"lp4-jlpt-n1-vocab-1", context:"policy-evidence-review", stimulus:"委員は結論に賛成したが、それを支える（　）が十分か再検討を求めた。", choices:["論拠","脈絡","乖離","是正"], answer:0, explanation:l("정답은 論拠(ろんきょ)입니다. 결론을 뒷받침하는 근거가 충분한지 묻는 문맥입니다.","正解は「論拠（ろんきょ）」です。結論を支える根拠が十分かを問う文脈です。","The answer is 論拠 (ろんきょ), the grounds supporting the conclusion.") },
    { concept:"lp4-jlpt-n1-vocab-1", context:"research-claim-support", stimulus:"相関が見られただけでは因果関係の（　）にはならない。", choices:["是正","論拠","妥当","脈絡"], answer:1, explanation:l("정답은 論拠입니다. 상관관계만으로 인과 주장을 뒷받침하는 근거가 되지 않는다는 뜻입니다.","正解は「論拠」です。相関だけでは因果関係の主張を支える根拠にならないという意味です。","The answer is 論拠: correlation alone is not grounds for a causal claim.") },
    { concept:"lp4-jlpt-n1-vocab-2", context:"edited-speech-coherence", stimulus:"発言の一部だけを切り取ったため、前後の（　）が失われて意味が変わってしまった。", choices:["妥当","是正","脈絡","乖離"], answer:2, explanation:l("정답은 脈絡(みゃくらく)입니다. 발언 전후의 논리적 연결이 사라진 상황입니다.","正解は「脈絡（みゃくらく）」です。発言の前後にある論理的なつながりが失われた状況です。","The answer is 脈絡 (みゃくらく), the logical connection between the surrounding remarks.") },
    { concept:"lp4-jlpt-n1-vocab-2", context:"manuscript-argument-flow", stimulus:"各章の主張は興味深いが、全体の（　）が見えにくく、結論への流れが追えない。", choices:["論拠","妥当","是正","脈絡"], answer:3, explanation:l("정답은 脈絡입니다. 각 장의 주장이 결론으로 이어지는 전체 흐름이 불명확합니다.","正解は「脈絡」です。各章の主張が結論へつながる全体の流れが不明瞭です。","The answer is 脈絡 because the overall flow connecting the chapters to the conclusion is unclear.") },
    { concept:"lp4-jlpt-n1-vocab-3", context:"sample-size-judgment", stimulus:"対象者が三人だけの調査から全国的な傾向を断定するのは（　）とは言えない。", choices:["妥当","乖離","論拠","是正"], answer:0, explanation:l("정답은 妥当(だとう)입니다. 표본이 너무 작아 전국적 결론을 내리는 판단은 합리적이지 않습니다.","正解は「妥当（だとう）」です。標本が少なすぎるため、全国的な結論を出す判断は合理的ではありません。","The answer is 妥当 (だとう); such a nationwide inference is not reasonable from only three participants.") },
    { concept:"lp4-jlpt-n1-vocab-3", context:"contract-price-assessment", stimulus:"複数社の見積もりと保守条件を比較した結果、この価格は（　）だと判断された。", choices:["脈絡","妥当","乖離","論拠"], answer:1, explanation:l("정답은 妥当입니다. 여러 견적과 유지보수 조건에 비추어 가격이 적절하다고 판단했습니다.","正解は「妥当」です。複数の見積もりと保守条件に照らして、価格が適切だと判断されました。","The answer is 妥当 because the price was judged reasonable against several bids and maintenance terms.") },
    { concept:"lp4-jlpt-n1-vocab-4", context:"forecast-actual-gap", stimulus:"需要予測と実際の販売数の（　）が大きく、在庫が余ってしまった。", choices:["脈絡","妥当","乖離","是正"], answer:2, explanation:l("정답은 乖離(かいり)입니다. 수요 예측과 실제 판매량이 크게 벌어진 상태입니다.","正解は「乖離（かいり）」です。需要予測と実際の販売数が大きく離れた状態です。","The answer is 乖離 (かいり), a large divergence between forecast demand and actual sales.") },
    { concept:"lp4-jlpt-n1-vocab-4", context:"management-field-perception", stimulus:"経営側の認識と現場の実感との（　）を埋めるため、対話の場を設けた。", choices:["論拠","是正","妥当","乖離"], answer:3, explanation:l("정답은 乖離입니다. 경영진의 인식과 현장 체감 사이의 간극을 줄이려는 문맥입니다.","正解は「乖離」です。経営側の認識と現場の実感の隔たりを縮める文脈です。","The answer is 乖離, the gap between management's perception and field experience.") },
    { concept:"lp4-jlpt-n1-vocab-5", context:"pay-gap-correction", stimulus:"同じ職務なのに待遇が異なる状態を（　）するため、賃金制度を改めた。", choices:["是正","脈絡","論拠","妥当"], answer:0, explanation:l("정답은 是正(ぜせい)입니다. 부당한 처우 차이를 올바르게 고치려는 조치입니다.","正解は「是正（ぜせい）」です。不当な待遇差を正しく改める措置です。","The answer is 是正 (ぜせい), correcting an unfair difference in treatment.") },
    { concept:"lp4-jlpt-n1-vocab-5", context:"audit-procedure-correction", stimulus:"監査で指摘された手続き上の不備を今月中に（　）し、再発防止策も示す。", choices:["乖離","是正","妥当","脈絡"], answer:1, explanation:l("정답은 是正입니다. 감사에서 확인된 절차상 잘못을 바로잡는다는 뜻입니다.","正解は「是正」です。監査で判明した手続き上の誤りを正しく直すという意味です。","The answer is 是正, correcting the procedural defect identified by the audit.") },
  ]},
  { mode: "grammar_fill", cases: [
    { concept:"lp4-jlpt-n1-grammar-1", context:"grant-continuation-condition", stimulus:"来年度も助成を継続できるかどうかは、今年度の成果（　）。", choices:["を皮切りに","ならではだ","いかんだ","ないまでも"], answer:2, explanation:l("정답은 いかんだ입니다. 조성 지속 여부가 올해 성과에 달렸음을 격식 있게 나타냅니다.","正解は「いかんだ」です。助成継続の可否が今年度の成果に左右されることを改まって表します。","The answer is いかんだ, formally stating that continued funding depends on this year's results.") },
    { concept:"lp4-jlpt-n1-grammar-1", context:"negotiation-outcome-condition", stimulus:"交渉がまとまるかは、双方がどこまで譲歩できるか（　）。", choices:["ないまでも","ならではだ","を余儀なくされる","いかんにかかっている"], answer:3, explanation:l("정답은 いかんにかかっている입니다. 협상 성립이 양측의 양보 정도에 좌우됩니다.","正解は「いかんにかかっている」です。交渉の成立が双方の譲歩の程度に左右されます。","The answer is いかんにかかっている: the outcome depends on how far both sides can compromise.") },
    { concept:"lp4-jlpt-n1-grammar-2", context:"disaster-route-change", stimulus:"土砂崩れで幹線道路が通れず、住民は遠回り（　）。", choices:["ならではだった","ないまでも","を余儀なくされた","いかんだった"], answer:2, explanation:l("정답은 を余儀なくされた입니다. 산사태라는 외부 사정 때문에 주민들이 우회할 수밖에 없었습니다.","正解は「を余儀なくされた」です。土砂崩れという外的事情により、住民は遠回りを避けられませんでした。","The answer is を余儀なくされた because the landslide forced residents to take a detour.") },
    { concept:"lp4-jlpt-n1-grammar-2", context:"budget-project-reduction", stimulus:"資材価格の急騰により、研究班は計画の大幅な縮小（　）。", choices:["を皮切りにした","いかんだった","ないまでも","を余儀なくされた"], answer:3, explanation:l("정답은 を余儀なくされた입니다. 자재비 급등으로 원치 않던 계획 축소를 피할 수 없었습니다.","正解は「を余儀なくされた」です。資材価格の急騰により、望まない計画縮小を避けられませんでした。","The answer is を余儀なくされた: rising material costs forced an unwanted reduction.") },
    { concept:"lp4-jlpt-n1-grammar-3", context:"historic-building-craft", stimulus:"手作業の細かな彫刻には、百年続く工房（　）の味わいがある。", choices:["ならでは","いかん","ないまでも","を皮切り"], answer:0, explanation:l("정답은 ならでは입니다. 100년 된 공방만이 보여 줄 수 있는 고유한 멋을 강조합니다.","正解は「ならでは」です。百年続く工房だからこそ出せる固有の味わいを強調します。","The answer is ならでは, emphasizing a quality distinctive to the century-old workshop.") },
    { concept:"lp4-jlpt-n1-grammar-3", context:"small-team-flexibility", stimulus:"意思決定の速さは、少人数の組織（　）の強みだ。", choices:["いかん","ならでは","を余儀なくされる","ないまでも"], answer:1, explanation:l("정답은 ならでは입니다. 빠른 의사결정을 소규모 조직이기에 가능한 고유한 강점으로 봅니다.","正解は「ならでは」です。迅速な意思決定を、少人数の組織だからこその強みとして述べています。","The answer is ならでは, presenting fast decisions as a distinctive strength of a small organization.") },
    { concept:"lp4-jlpt-n1-grammar-4", context:"partial-consensus", stimulus:"全員の賛成は得られ（　）、主要な論点については合意できた。", choices:["いかんで","を皮切りに","ないまでも","ならでは"], answer:2, explanation:l("정답은 ないまでも입니다. 전원 찬성이라는 강한 기준에는 못 미쳤지만 주요 쟁점 합의는 이뤘습니다.","正解は「ないまでも」です。全員賛成という強い基準には届かなくても、主要論点では合意できました。","The answer is ないまでも: they fell short of unanimous approval but reached agreement on key issues.") },
    { concept:"lp4-jlpt-n1-grammar-4", context:"nonexpert-basic-analysis", stimulus:"専門家（　）、統計の基本的な読み方は身につけておく必要がある。", choices:["を皮切りに","ならではの","いかんで","ではないまでも"], answer:3, explanation:l("정답은 ではないまでも입니다. 전문가 수준까지는 아니어도 기본 통계 해석 능력은 필요하다는 뜻입니다.","正解は「ではないまでも」です。専門家の水準まで達しなくても、基礎的な統計解釈は必要だという意味です。","The answer is ではないまでも: one need not be an expert, but basic statistical literacy is necessary.") },
    { concept:"lp4-jlpt-n1-grammar-5", context:"regional-consultation-series", stimulus:"札幌での説明会（　）、全国十都市で意見交換会を開く。", choices:["を皮切りに","ないまでも","いかんで","ならでは"], answer:0, explanation:l("정답은 を皮切りに입니다. 삿포로 설명회를 첫 행사로 전국 여러 도시의 행사가 이어집니다.","正解は「を皮切りに」です。札幌の説明会を最初として、全国各都市の催しが続きます。","The answer is を皮切りに, marking the Sapporo briefing as the first in a nationwide series.") },
    { concept:"lp4-jlpt-n1-grammar-5", context:"product-rollout-series", stimulus:"国内での先行発売（　）、来月からアジア各国でも順次販売を始める。", choices:["を余儀なくされ","を皮切りに","ないまでも","いかんで"], answer:1, explanation:l("정답은 を皮切りに입니다. 국내 선행 출시 뒤 아시아 각국 판매가 차례로 이어집니다.","正解は「を皮切りに」です。国内の先行発売を起点に、アジア各国での販売が順次続きます。","The answer is を皮切りに: the domestic launch begins a sequence of launches across Asia.") },
  ]},
  { mode: "kanji_reading", cases: [
    { concept:"lp4-jlpt-n1-kanji-1", context:"regional-disparity-visible", stimulus:"地域による利用率の差が【顕著】になった。", choices:["けんちょ","げんしょ","けんしょ","けんちゃく"], answer:0, explanation:l("정답은 けんちょ입니다. 顕著에서 顕은 음독 ケン으로 읽습니다.","正解は「けんちょ」です。「顕著」の顕は音読みのケンです。","The answer is けんちょ; 顕 takes the on-reading ケン in 顕著.") },
    { concept:"lp4-jlpt-n1-kanji-1", context:"hidden-risk-emergence", stimulus:"調査を重ねるうちに、潜在的な問題が【顕在化】した。", choices:["げんざいか","けんざいか","けんさいか","けんぞんか"], answer:1, explanation:l("정답은 けんざいか입니다. 顕在化의 顕은 ケン으로 읽고 숨은 문제가 드러남을 뜻합니다.","正解は「けんざいか」です。「顕在化」の顕はケンと読み、隠れた問題が表面化することです。","The answer is けんざいか; 顕 is read ケン, and the word means becoming apparent.") },
    { concept:"lp4-jlpt-n1-kanji-2", context:"emergency-plan-execution", stimulus:"担当者は緊急時の計画を着実に【遂行】した。", choices:["ついこう","ずいぎょう","すいこう","すいぎょう"], answer:2, explanation:l("정답은 すいこう입니다. 遂行에서 遂는 음독 スイ로 읽습니다.","正解は「すいこう」です。「遂行」の遂は音読みのスイです。","The answer is すいこう; 遂 takes the on-reading スイ in 遂行.") },
    { concept:"lp4-jlpt-n1-kanji-2", context:"long-term-goal-accomplishment", stimulus:"研究チームは十年越しの目標を【成し遂げた】。", choices:["なしつげた","なりとげた","なしすげた","なしとげた"], answer:3, explanation:l("정답은 なしとげた입니다. 成し遂げる에서 遂는 훈독 とげる로 읽습니다.","正解は「なしとげた」です。「成し遂げる」の遂は訓読みの「とげる」です。","The answer is なしとげた; 遂 takes the kun-reading とげる in 成し遂げる.") },
    { concept:"lp4-jlpt-n1-kanji-3", context:"work-life-balance", stimulus:"仕事と生活の【均衡】を保つ制度が必要だ。", choices:["きんこう","きんごう","きんぎょう","きんきょう"], answer:0, explanation:l("정답은 きんこう입니다. 均衡에서 衡은 음독 コウ로 읽습니다.","正解は「きんこう」です。「均衡」の衡は音読みのコウです。","The answer is きんこう; 衡 takes the on-reading コウ in 均衡.") },
    { concept:"lp4-jlpt-n1-kanji-3", context:"resource-imbalance", stimulus:"都市と地方の資源配分の【不均衡】が課題だ。", choices:["ふきんごう","ふきんこう","ふきんぎょう","ふきんきょう"], answer:1, explanation:l("정답은 ふきんこう입니다. 不均衡에서도 衡은 コウ로 읽습니다.","正解は「ふきんこう」です。「不均衡」でも衡はコウと読みます。","The answer is ふきんこう; 衡 is also read コウ in 不均衡.") },
    { concept:"lp4-jlpt-n1-kanji-4", context:"research-ethics-compliance", stimulus:"研究に参加する全員が倫理規定を【遵守】する。", choices:["じゅうしゅ","しゅんしゅ","じゅんしゅ","じゅんじゅ"], answer:2, explanation:l("정답은 じゅんしゅ입니다. 遵守에서 遵은 음독 ジュン으로 읽습니다.","正解は「じゅんしゅ」です。「遵守」の遵は音読みのジュンです。","The answer is じゅんしゅ; 遵 takes the on-reading ジュン in 遵守.") },
    { concept:"lp4-jlpt-n1-kanji-4", context:"corporate-legal-compliance", stimulus:"企業には徹底した【遵法】経営が求められる。", choices:["じゅうほう","しゅんぽう","じゅんほう","じゅんぽう"], answer:3, explanation:l("정답은 じゅんぽう입니다. 遵法에서 遵은 ジュン, 法은 연탁되어 ポウ로 읽습니다.","正解は「じゅんぽう」です。「遵法」の遵はジュン、法はポウと読みます。","The answer is じゅんぽう; 遵 is ジュン and 法 is ポウ in this compound.") },
    { concept:"lp4-jlpt-n1-kanji-5", context:"accessibility-consideration", stimulus:"案内には視覚に障害のある人への【配慮】が必要だ。", choices:["はいりょ","はいろ","はいりょう","はいよ"], answer:0, explanation:l("정답은 はいりょ입니다. 配慮에서 慮는 음독 リョ로 읽습니다.","正解は「はいりょ」です。「配慮」の慮は音読みのリョです。","The answer is はいりょ; 慮 takes the on-reading リョ in 配慮.") },
    { concept:"lp4-jlpt-n1-kanji-5", context:"climate-factor-consideration", stimulus:"地域差を分析する際は気候条件も【考慮】すべきだ。", choices:["こうろ","こうりょ","こうりょう","こうよ"], answer:1, explanation:l("정답은 こうりょ입니다. 考慮에서 慮는 リョ로 읽고 판단에 포함한다는 뜻입니다.","正解は「こうりょ」です。「考慮」の慮はリョと読み、判断材料に含めることです。","The answer is こうりょ; 慮 is read リョ, and 考慮 means taking something into account.") },
  ]},
  { mode: "listening", cases: [
    { concept:"lp4-jlpt-n1-listening-1", context:"editorial-argument-review", stimulus:"編集者は原稿をどのように直すよう求めていますか。", choices:["結論を削る","例を一つにする","根拠と論理の流れを示す","題名だけ変える"], answer:2, audio:"女：結論は明確ですが、読者にはそこへ至る論拠が見えません。段落の脈絡も含めて、判断の過程が追えるように直してください。", explanation:l("정답은 根拠と論理の流れを示す입니다. 편집자는 결론에 이르는 논거와 문단의 맥락을 보이도록 요구합니다.","正解は「根拠と論理の流れを示す」です。編集者は結論に至る論拠と段落の脈絡を示すよう求めています。","The editor asks for the grounds and logical flow leading to the conclusion.") },
    { concept:"lp4-jlpt-n1-listening-1", context:"committee-proposal-assessment", stimulus:"委員長が次回までに確認したいことは何ですか。", choices:["発表者の経歴","会議室の広さ","資料の印刷部数","提案の根拠と議論のつながり"], answer:3, audio:"男：結論だけなら賛成できます。ただ、示された数字が論拠として十分か、そこから提案へどう話がつながるのかは、次回までに確認しましょう。", explanation:l("정답은 提案の根拠と議論のつながり입니다. 숫자가 충분한 논거인지와 제안까지의 흐름을 확인하려 합니다.","正解は「提案の根拠と議論のつながり」です。数字が十分な論拠か、提案への流れが明確かを確認します。","The chair wants to verify both the evidence and how the argument leads to the proposal.") },
    { concept:"lp4-jlpt-n1-listening-2", context:"sales-change-causal-caution", stimulus:"女の人は売上増加の原因をどう考えていますか。", choices:["広告だけが原因だ","季節だけが原因だ","一つに断定できない","増加は見られない"], answer:2, audio:"男：広告を変えてから売上が顕著に伸びましたね。女：ええ。ただ、同じ時期に季節需要も高まったので、広告だけが原因とは限りません。", explanation:l("정답은 一つに断定できない입니다. 증가는 뚜렷하지만 광고와 계절 수요가 겹쳐 원인을 하나로 확정하지 않습니다.","正解は「一つに断定できない」です。増加は顕著ですが、広告と季節需要が重なり、原因を一つに限定していません。","The increase is clear, but overlapping advertising and seasonal demand prevent attributing it to one cause.") },
    { concept:"lp4-jlpt-n1-listening-2", context:"river-data-multiple-causes", stimulus:"研究者が追加調査を行う理由は何ですか。", choices:["数値が変わっていないから","測定を中止するため","原因がすでに確定したから","複数の要因を区別するため"], answer:3, audio:"女：水質の改善は顕著ですが、工場の対策と降水量の変化が同時に起きています。どちらの影響が大きいか、追加調査で分けて考える必要があります。", explanation:l("정답은 複数の要因を区別するため입니다. 개선은 뚜렷하지만 공장 대책과 강수량 변화의 영향을 분리해야 합니다.","正解は「複数の要因を区別するため」です。改善は顕著でも、工場対策と降水量変化の影響を分ける必要があります。","The study must distinguish the effects of factory measures and rainfall changes.") },
    { concept:"lp4-jlpt-n1-listening-3", context:"service-proposal-user-view", stimulus:"提案の検証に追加されるものは何ですか。", choices:["利用者への聞き取り","担当者の好み","過去の宣伝文句","競合会社の制服"], answer:0, audio:"男：計算上は待ち時間を短縮できる案です。女：妥当か判断するには、実際に利用する人が操作しやすいかも確かめましょう。来週、聞き取りを追加します。", explanation:l("정답은 利用者への聞き取り입니다. 계산뿐 아니라 실제 이용자의 조작 경험도 타당성 검증에 포함합니다.","正解は「利用者への聞き取り」です。計算だけでなく、実際の操作経験も妥当性の検証に含めます。","User interviews will be added so the proposal is assessed using actual usability as well as calculations.") },
    { concept:"lp4-jlpt-n1-listening-3", context:"park-redesign-accessibility", stimulus:"委員会は公園の案を何に照らして再評価しますか。", choices:["設計者の受賞歴","利用者の移動しやすさ","工事会社の知名度","写真の枚数"], answer:1, audio:"女：見た目は魅力的ですが、車いすやベビーカーでも移動しやすいでしょうか。男：その視点を含めて案の妥当性をもう一度検証します。", explanation:l("정답은 利用者の移動しやすさ입니다. 외관뿐 아니라 휠체어와 유모차 이용자의 이동성을 기준으로 재검토합니다.","正解は「利用者の移動しやすさ」です。外観だけでなく、車いすやベビーカーでの移動性に照らして再検証します。","The plan will be reassessed for mobility by wheelchair and stroller users.") },
    { concept:"lp4-jlpt-n1-listening-4", context:"survey-report-field-gap", stimulus:"調査班は次に何を確認しますか。", choices:["報告書を公開しない理由","調査員の勤務時間","現場の声と集計結果のずれ","会議の座席順"], answer:2, audio:"男：集計では満足度が高いのに、窓口では不満をよく聞きます。女：現場の実感と報告書に乖離がないか、回答者の構成から確かめましょう。", explanation:l("정답은 現場の声と集計結果のずれ입니다. 현장 불만과 높은 만족도 집계 사이의 괴리를 응답자 구성부터 확인합니다.","正解は「現場の声と集計結果のずれ」です。現場の不満と高い満足度の集計との乖離を、回答者構成から確認します。","The team will investigate the gap between field complaints and the survey's high satisfaction result.") },
    { concept:"lp4-jlpt-n1-listening-4", context:"head-office-branch-report-gap", stimulus:"支店長は本社に何を求めていますか。", choices:["目標をさらに上げること","報告をやめること","支店を閉鎖すること","現場の状況を踏まえて指標を見直すこと"], answer:3, audio:"女：本社の報告では処理時間が短くなっています。男：でも現場では確認作業が増えました。この乖離を調べ、実態に合う指標へ見直してほしいです。", explanation:l("정답은 現場の状況を踏まえて指標を見直すこと입니다. 본사 보고와 현장 실태의 괴리를 조사해 지표를 고치라고 합니다.","正解は「現場の状況を踏まえて指標を見直すこと」です。本社報告と現場実態の乖離を調べ、指標を改めるよう求めています。","The manager asks headquarters to investigate the gap and revise the metric to reflect actual conditions.") },
    { concept:"lp4-jlpt-n1-listening-5", context:"small-billing-error-prevention", stimulus:"責任者は請求書の誤りにどう対応しますか。", choices:["今すぐ修正し確認手順も改める","次の年度まで放置する","誤りを公表せず隠す","金額が増えるまで待つ"], answer:0, audio:"男：金額は小さいのですが、同じ入力ミスが三件ありました。女：今のうちに是正しましょう。請求書を直すだけでなく、確認手順も見直してください。", explanation:l("정답은 今すぐ修正し確認手順も改める입니다. 작은 오류를 즉시 시정하고 재발 방지를 위해 확인 절차도 개선합니다.","正解は「今すぐ修正し確認手順も改める」です。小さな誤りを早期に是正し、再発防止のため確認手順も見直します。","They will correct the small errors immediately and revise the checking procedure to prevent recurrence.") },
    { concept:"lp4-jlpt-n1-listening-5", context:"early-safety-defect-correction", stimulus:"工場は部品のずれに対して何をしますか。", choices:["出荷後に考える","出荷を止めて原因を是正する","検査記録を削除する","許容範囲を広げる"], answer:1, audio:"女：一部の部品にわずかなずれがあります。男：小さいからと見過ごすと事故につながります。出荷を止め、原因を特定して早期に是正しましょう。", explanation:l("정답은 出荷を止めて原因を是正する입니다. 작은 편차도 사고 우려가 있으므로 출하 전에 원인을 바로잡습니다.","正解は「出荷を止めて原因を是正する」です。小さなずれも事故につながる恐れがあるため、出荷前に原因を直します。","The factory will stop shipment and correct the cause before the small deviation can lead to an accident.") },
  ]},
];

const answerPatterns: Record<Mode, readonly (0 | 1 | 2 | 3)[]> = {
  vocab_mc: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1],
  grammar_fill: [2, 3, 2, 3, 0, 1, 2, 3, 0, 1],
  kanji_reading: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1],
  listening: [2, 3, 2, 3, 0, 1, 2, 3, 0, 1],
};

export const N1_ITEMS40: AuthoredItem[] = groups.flatMap(({ mode, cases }) =>
  cases.map((entry, index) => {
    const intended = answerPatterns[mode][index]!;
    const correct = entry.choices[entry.answer]!;
    const arranged = entry.choices.filter((_, choiceIndex) => choiceIndex !== entry.answer);
    arranged.splice(intended, 0, correct);
    const guide = instructions[mode];
    return {
      id: `lp4-n1-${mode}-${String(index + 1).padStart(2, "0")}`,
      concept_key: entry.concept,
      track: "jlpt-ja",
      level: "N1",
      section: mode,
      difficulty: 5,
      context_tag: entry.context,
      question: l(`${guide.ko}\n${entry.stimulus}`, `${guide.ja}\n${entry.stimulus}`, `${guide.en}\n${entry.stimulus}`),
      choices: same(arranged),
      answer_index: intended,
      explanation: entry.explanation,
      ...(entry.audio === undefined ? {} : { audio_script: entry.audio }),
    };
  }),
);
