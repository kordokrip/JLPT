// 강성호 2026-10-11: 실제 N2 공개 개념20개에 서로 다른 두 상황을 연결한 자체 저작40문항과 학습 cue다.
// 전체은행 독립 의미 검수 전의 비공개 초안이며, 음성 정책과 기존 공개 데이터는 변경하지 않는다.
import type { DraftItem } from "../learning-path-2026-10-11/data.js";

type Localized = { ko: string; ja: string; en: string };
type AuthoredItem = DraftItem & { context_tag: string };
type Mode = "vocab_mc" | "grammar_fill" | "kanji_reading" | "listening";
type Case = {
  concept: string;
  context: string;
  stimulus: string;
  choices: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  explanation: Localized;
  audio?: string;
};

const l = (ko: string, ja: string, en: string): Localized => ({ ko, ja, en });
const same = (values: readonly string[]): Localized[] =>
  values.map((value) => l(value, value, value));

const instructions: Record<Mode, Localized> = {
  vocab_mc: l("빈칸에 알맞은 말을 고르세요.", "空欄に合う言葉を選んでください。", "Choose the word that fits the blank."),
  grammar_fill: l("문맥과 문법에 알맞은 표현을 고르세요.", "文脈と文法に合う表現を選んでください。", "Choose the expression that fits both the context and grammar."),
  kanji_reading: l("밑줄 친 말의 읽기를 고르세요.", "下線部の読み方を選んでください。", "Choose the reading of the underlined word."),
  listening: l("음성을 듣고 질문에 알맞은 답을 고르세요.", "音声を聞いて、質問に合う答えを選んでください。", "Listen to the audio and choose the best answer."),
};

export const N2_CONCEPT_CUES20: Record<string, Localized> = {
  "lp4-jlpt-n2-vocab-1": l("方針은 ほうしん으로 읽고, 판단이나 행동을 이끄는 기본 방향입니다. 한 번의 구체적 순서인 手順과 구별해 方針を定める로 회상하세요.", "方針は「ほうしん」と読み、判断や行動を導く基本的な方向です。一回の具体的な手順と区別し、「方針を定める」で覚えましょう。", "方針 is read ほうしん and means a guiding policy or direction. Contrast it with concrete steps, 手順, and recall 方針を定める."),
  "lp4-jlpt-n2-vocab-2": l("手順은 てじゅん으로 읽고, 작업을 진행하는 단계의 순서입니다. 장기 방향인 方針과 구별해 手順を確認する로 회상하세요.", "手順は「てじゅん」と読み、作業を進める段階の順序です。長期的な方針と区別し、「手順を確認する」で覚えましょう。", "手順 is read てじゅん and means the ordered steps of a task. Contrast it with 方針 and recall 手順を確認する."),
  "lp4-jlpt-n2-vocab-3": l("判断은 はんだん으로 읽고, 정보와 조건을 살핀 뒤 결론을 내리는 일입니다. 단순한 인상인 印象과 구별해 判断を下す로 회상하세요.", "判断は「はんだん」と読み、情報や条件を検討して結論を出すことです。単なる印象と区別し、「判断を下す」で覚えましょう。", "判断 is read はんだん and means reaching a conclusion after considering evidence. Contrast it with a mere 印象 and recall 判断を下す."),
  "lp4-jlpt-n2-vocab-4": l("効率은 こうりつ으로 읽고, 들인 시간·노력에 비해 얻는 성과의 정도입니다. 단순한 속도인 速度와 구별해 効率を上げる로 회상하세요.", "効率は「こうりつ」と読み、時間や労力に対して得られる成果の度合いです。単なる速度と区別し、「効率を上げる」で覚えましょう。", "効率 is read こうりつ and means output relative to time or effort. Contrast it with speed alone, 速度, and recall 効率を上げる."),
  "lp4-jlpt-n2-vocab-5": l("課題는 かだい로 읽고, 해결하거나 검토해야 할 문제 또는 부여된 과제입니다. 이미 나온 成果와 구별해 課題を解決する로 회상하세요.", "課題は「かだい」と読み、解決・検討すべき問題、または与えられた宿題です。すでに得た成果と区別し、「課題を解決する」で覚えましょう。", "課題 is read かだい and means an issue to solve or an assigned task. Contrast it with an achieved result, 成果, and recall 課題を解決する."),
  "lp4-jlpt-n2-grammar-1": l("보통형+わけではない는 앞의 단정을 전부 부정하지 않고 ‘반드시 그런 것은 아니다’라고 범위를 제한합니다. 사실 전체를 부정하는 ではない와 구별하세요.", "普通形＋わけではないは、前の断定を全面否定せず「必ずしもそうではない」と範囲を限定します。単純な「ではない」と区別しましょう。", "Plain form + わけではない qualifies a claim as ‘not necessarily so.’ Contrast it with a simple categorical ではない."),
  "lp4-jlpt-n2-grammar-2": l("동사 사전형/ない형+ことになっている는 개인의 즉석 결정이 아니라 이미 정해진 규칙·일정을 나타냅니다. 스스로 정한 ことにしている와 구별하세요.", "動詞辞書形・ない形＋ことになっているは、個人のその場の決定ではなく、既定の規則や予定を表します。「ことにしている」と区別しましょう。", "Verb dictionary/ない form + ことになっている marks an established rule or schedule. Contrast it with a personal policy, ことにしている."),
  "lp4-jlpt-n2-grammar-3": l("명사+に伴って 또는 동사 사전형+のに伴って는 한 변화와 함께 다른 변화가 수반됨을 나타냅니다. 단순한 뒤이음인 その後와 구별하세요.", "名詞＋に伴って／動詞辞書形＋のに伴っては、一つの変化に付随して別の変化が起こることを表します。単なる順序の「その後」と区別しましょう。", "Noun + に伴って or verb + のに伴って marks one change accompanying another. Contrast it with mere sequence such as その後."),
  "lp4-jlpt-n2-grammar-4": l("동사 ます형 어간+かねない는 바람직하지 않은 결과가 생길 우려를 나타냅니다. 능력 부족의 かねる와 가능성만 중립적으로 말하는 かもしれない와 구별하세요.", "動詞ます形の語幹＋かねないは、好ましくない結果が起こる恐れを表します。「かねる」や中立的な「かもしれない」と区別しましょう。", "Verb stem + かねない warns of an undesirable possibility. Contrast it with かねる and neutral かもしれない."),
  "lp4-jlpt-n2-grammar-5": l("동사 ます형 어간+つつある는 비교적 객관적으로 진행 중인 변화를 나타냅니다. 순간 동작이나 단순 반복에는 쓰지 않습니다.", "動詞ます形の語幹＋つつあるは、進行中の変化を比較的客観的に表します。瞬間的な動作や単なる反復には使いません。", "Verb stem + つつある objectively describes an ongoing change. It is not used for an instantaneous act or mere repetition."),
  "lp4-jlpt-n2-kanji-1": l("基는 음독 キ, 훈독 もと・もとい입니다. 基準(きじゅん), 基盤(きばん)에서 바탕이라는 뜻을 회상하고 木의 읽기와 혼동하지 마세요.", "「基」は音読みキ、訓読みもと・もといです。「基準（きじゅん）」「基盤（きばん）」で土台の意味を覚え、木の読みと混同しないようにしましょう。", "基 has on-reading キ and kun-readings もと/もとい. Recall the foundation sense in 基準 and 基盤, and do not confuse it with 木."),
  "lp4-jlpt-n2-kanji-2": l("準는 음독 ジュン입니다. 準備(じゅんび), 標準(ひょうじゅん)처럼 기준에 맞추거나 갖춘다는 계열로 회상하세요.", "「準」は音読みジュンです。「準備（じゅんび）」「標準（ひょうじゅん）」のように、基準に合わせる・整える語で覚えましょう。", "準 has the on-reading ジュン. Recall it in 準備 and 標準, words connected with readiness or standards."),
  "lp4-jlpt-n2-kanji-3": l("測는 음독 ソク, 훈독 はかる입니다. 測定(そくてい)은 실제로 재는 일, 推測(すいそく)은 근거로 미루어 짐작하는 일입니다.", "「測」は音読みソク、訓読みはかるです。「測定」は実測、「推測」は根拠から推し量ることです。", "測 has on-reading ソク and kun-reading はかる. 測定 is measurement; 推測 is inference from evidence."),
  "lp4-jlpt-n2-kanji-4": l("査는 음독 サ이며 단독 훈독은 보통 쓰지 않습니다. 調査(ちょうさ), 検査(けんさ)처럼 자세히 살피는 복합어로 회상하세요.", "「査」は音読みサで、一般的な訓読みはありません。「調査（ちょうさ）」「検査（けんさ）」のように詳しく調べる複合語で覚えましょう。", "査 has the on-reading サ and no common standalone kun-reading. Recall it in compounds for examination such as 調査 and 検査."),
  "lp4-jlpt-n2-kanji-5": l("構는 음독 コウ, 훈독 かまえる입니다. 構成(こうせい)은 짜임, 機構(きこう)는 조직이나 장치의 구조를 나타냅니다.", "「構」は音読みコウ、訓読みかまえるです。「構成（こうせい）」は組み立て、「機構（きこう）」は組織や装置の仕組みです。", "構 has on-reading コウ and kun-reading かまえる. 構成 is composition, while 機構 is an organizational or mechanical structure."),
  "lp4-jlpt-n2-listening-1": l("‘比較してから’는 비교가 선택보다 먼저임을, ‘最も効率のよい’는 선택 기준이 효율임을 나타냅니다. 후보를 보지 않고 고른 상황과 구별하세요.", "「比較してから」は比較が選択より先で、「最も効率のよい」は選択基準が効率であることを示します。比較せずに選ぶ場面と区別しましょう。", "比較してから places comparison before selection, and 最も効率のよい states efficiency as the criterion. Contrast this with choosing without comparison."),
  "lp4-jlpt-n2-listening-2": l("‘数字だけでなく、利用者の声も’는 수치와 이용자 의견을 모두 판단 근거로 삼았다는 뜻입니다. 어느 한쪽만 본 판단과 구별하세요.", "「数字だけでなく、利用者の声も」は、数値と利用者の意見の両方を判断材料にしたという意味です。片方だけの判断と区別しましょう。", "数字だけでなく、利用者の声も means both figures and user feedback informed the judgment. Contrast it with relying on only one source."),
  "lp4-jlpt-n2-listening-3": l("‘利用者が多い時間帯’가 조건이고 ‘予備の窓口を開く’가 혼잡 대응입니다. 모든 시간에 창구를 늘리는 결정과 구별하세요.", "「利用者が多い時間帯」が条件で、「予備の窓口を開く」が混雑への対応です。終日窓口を増やす決定と区別しましょう。", "利用者が多い時間帯 is the condition, and opening a spare counter is the response. Contrast it with adding counters all day."),
  "lp4-jlpt-n2-listening-4": l("‘理由を省略すると’가 원인 조건이고 ‘誤解を招きかねない’가 우려되는 결과입니다. 오해가 이미 발생했다는 보고가 아닙니다.", "「理由を省略すると」が条件で、「誤解を招きかねない」が懸念される結果です。誤解がすでに起きたという報告ではありません。", "理由を省略すると gives the condition and 誤解を招きかねない the feared outcome. It does not report that misunderstanding has already occurred."),
  "lp4-jlpt-n2-listening-5": l("‘安定しつつある’는 안정으로 변화하는 과정, ‘が、確認は続ける’는 개선 중에도 점검을 중단하지 않는다는 뜻입니다.", "「安定しつつある」は安定へ向かう過程で、「が、確認は続ける」は改善中でも確認をやめないという意味です。", "安定しつつある describes movement toward stability, while が、確認は続ける says checks will continue despite that improvement."),
};

const groups: Array<{ mode: Mode; cases: Case[] }> = [
  { mode: "vocab_mc", cases: [
    { concept:"lp4-jlpt-n2-vocab-1", context:"university-research-policy", stimulus:"研究費の使い方について、大学は新しい（　）を示した。", choices:["方針","手順","課題","判断"], answer:0, explanation:l("정답은 方針입니다. 대학이 연구비 사용의 기본 방향을 제시했습니다.","正解は「方針」です。大学が研究費の使い方の基本的な方向を示しました。","The answer is 方針: the university announced a guiding policy for research funds.") },
    { concept:"lp4-jlpt-n2-vocab-1", context:"museum-conservation-direction", stimulus:"美術館は、古い作品を優先して修復する（　）を決めた。", choices:["手順","方針","効率","課題"], answer:1, explanation:l("정답은 方針입니다. 어떤 작품을 우선할지 정한 장기적인 방향입니다.","正解は「方針」です。どの作品を優先するかという長期的な方向です。","The answer is 方針, the long-term direction for prioritizing restoration.") },
    { concept:"lp4-jlpt-n2-vocab-2", context:"laboratory-emergency-steps", stimulus:"停電が起きた場合の（　）を確認してから、実験を始めてください。", choices:["方針","判断","手順","効率"], answer:2, explanation:l("정답은 手順입니다. 정전 때 따라야 할 단계의 순서를 확인합니다.","正解は「手順」です。停電時に従う段階の順序を確認します。","The answer is 手順, the ordered steps to follow during a power outage.") },
    { concept:"lp4-jlpt-n2-vocab-2", context:"online-application-process", stimulus:"申請の（　）は、本人確認、入力、送信の順です。", choices:["課題","判断","方針","手順"], answer:3, explanation:l("정답은 手順입니다. 본인 확인부터 송신까지의 단계 순서를 말합니다.","正解は「手順」です。本人確認から送信までの段階の順序です。","The answer is 手順, the sequence from identity check through submission.") },
    { concept:"lp4-jlpt-n2-vocab-3", context:"hiking-weather-decision", stimulus:"山の天候と参加者の体調を見て、出発を延期する（　）をした。", choices:["判断","方針","効率","課題"], answer:0, explanation:l("정답은 判断입니다. 날씨와 건강 상태를 검토한 뒤 연기 결론을 내렸습니다.","正解は「判断」です。天候と体調を検討して延期という結論を出しました。","The answer is 判断 because the delay was decided after weighing weather and health.") },
    { concept:"lp4-jlpt-n2-vocab-3", context:"editorial-publication-decision", stimulus:"複数の資料を照合したうえで、記事を掲載できると（　）した。", choices:["手順","判断","課題","方針"], answer:1, explanation:l("정답은 判断입니다. 여러 자료를 대조한 근거로 게재 가능하다는 결론을 냈습니다.","正解は「判断」です。複数の資料を根拠に掲載可能だと結論づけました。","The answer is 判断, a conclusion based on comparing several sources.") },
    { concept:"lp4-jlpt-n2-vocab-4", context:"warehouse-route-efficiency", stimulus:"商品の置き場所を変えた結果、作業の（　）が大きく上がった。", choices:["方針","課題","効率","手順"], answer:2, explanation:l("정답은 効率입니다. 배치를 바꿔 같은 작업을 더 적은 시간과 움직임으로 하게 됐습니다.","正解は「効率」です。配置変更で同じ作業を少ない時間と動きで行えるようになりました。","The answer is 効率: the new layout reduced time and movement for the same work.") },
    { concept:"lp4-jlpt-n2-vocab-4", context:"meeting-document-efficiency", stimulus:"会議前に資料を共有すると、議論の（　）がよくなる。", choices:["判断","課題","方針","効率"], answer:3, explanation:l("정답은 効率입니다. 사전 공유로 회의 시간 대비 논의 성과가 좋아집니다.","正解は「効率」です。事前共有によって会議時間に対する議論の成果が上がります。","The answer is 効率 because advance sharing improves discussion output per meeting time.") },
    { concept:"lp4-jlpt-n2-vocab-5", context:"regional-transport-issue", stimulus:"高齢者の移動手段を確保することが、この地域の重要な（　）だ。", choices:["課題","効率","判断","手順"], answer:0, explanation:l("정답은 課題입니다. 지역이 앞으로 해결해야 할 중요한 문제입니다.","正解は「課題」です。地域が今後解決すべき重要な問題です。","The answer is 課題, an important issue the community still needs to solve.") },
    { concept:"lp4-jlpt-n2-vocab-5", context:"seminar-assignment", stimulus:"来週までの（　）は、調査結果を千字でまとめることです。", choices:["方針","課題","効率","判断"], answer:1, explanation:l("정답은 課題입니다. 다음 주까지 제출해야 하는 세미나 과제입니다.","正解は「課題」です。来週までに提出するゼミの課題です。","The answer is 課題, the seminar assignment due next week.") },
  ]},
  { mode: "grammar_fill", cases: [
    { concept:"lp4-jlpt-n2-grammar-1", context:"remote-work-qualification", stimulus:"在宅勤務が便利だからといって、すべての仕事に向いている（　）。", choices:["わけではない","ことになっている","に伴って","つつある"], answer:0, explanation:l("정답은 わけではない입니다. 편리하다는 사실에서 모든 업무에 적합하다는 전면 단정을 제한합니다.","正解は「わけではない」です。便利でも、すべての仕事に適するとは限らないという部分否定です。","The answer is わけではない, qualifying the claim that convenience makes remote work suitable for every task.") },
    { concept:"lp4-jlpt-n2-grammar-1", context:"short-report-qualification", stimulus:"報告書が短いからといって、調査が不十分な（　）。必要な点は網羅されている。", choices:["かねない","わけではない","ことになっている","つつある"], answer:1, explanation:l("정답은 わけではない입니다. 짧다는 이유로 조사가 부족하다고 단정할 수 없으며 뒤 문장이 이를 뒷받침합니다.","正解は「わけではない」です。短いから調査不足とは限らず、後文がその制限を裏づけます。","The answer is わけではない: brevity does not necessarily mean inadequate research, as the next sentence confirms.") },
    { concept:"lp4-jlpt-n2-grammar-2", context:"archive-entry-rule", stimulus:"この資料室では、入室前に身分証を預ける（　）。", choices:["わけではない","かねない","ことになっている","に伴って"], answer:2, explanation:l("정답은 ことになっている입니다. 자료실 이용자가 따라야 하는 기존 규칙입니다.","正解は「ことになっている」です。資料室の利用者が従う既定の規則です。","The answer is ことになっている because this is an established archive rule.") },
    { concept:"lp4-jlpt-n2-grammar-2", context:"scheduled-system-maintenance", stimulus:"サーバーは毎月第一日曜日に点検する（　）。", choices:["つつある","わけではない","かねない","ことになっている"], answer:3, explanation:l("정답은 ことになっている입니다. 매월 첫째 일요일이라는 이미 정해진 점검 일정입니다.","正解は「ことになっている」です。毎月第一日曜日という既定の点検予定です。","The answer is ことになっている, marking a pre-established monthly maintenance schedule.") },
    { concept:"lp4-jlpt-n2-grammar-3", context:"population-service-change", stimulus:"人口の増加（　）、市は保育施設を増やした。", choices:["に伴って","わけではない","ことになっている","かねない"], answer:0, explanation:l("정답은 に伴って입니다. 인구 증가에 수반해 보육 시설도 늘어났습니다.","正解は「に伴って」です。人口増加に付随して保育施設も増えました。","The answer is に伴って because expanded childcare accompanied population growth.") },
    { concept:"lp4-jlpt-n2-grammar-3", context:"digitization-workflow-change", stimulus:"手続きが電子化されるの（　）、窓口の役割も変化した。", choices:["かねない","に伴って","つつある","わけではない"], answer:1, explanation:l("정답은 に伴って입니다. 전자화라는 변화와 함께 창구 역할의 변화가 일어났습니다.","正解は「に伴って」です。電子化という変化に付随して窓口の役割も変わりました。","The answer is に伴って, linking digitization with the accompanying change in counter service.") },
    { concept:"lp4-jlpt-n2-grammar-4", context:"medicine-dose-warning", stimulus:"説明を読まずに薬を増やすと、健康を損ない（　）。", choices:["つつある","わけではない","かねない","ことになっている"], answer:2, explanation:l("정답은 かねない입니다. 설명 없이 용량을 늘릴 때 생길 수 있는 바람직하지 않은 결과를 경고합니다.","正解は「かねない」です。説明なしの増量が招く好ましくない結果を警告しています。","The answer is かねない, warning of the harmful possibility of increasing the dose without reading instructions.") },
    { concept:"lp4-jlpt-n2-grammar-4", context:"data-backup-warning", stimulus:"確認せずに古いファイルを削除すれば、必要な記録まで失い（　）。", choices:["に伴って","つつある","わけではない","かねない"], answer:3, explanation:l("정답은 かねない입니다. 필요한 기록까지 잃는 우려스러운 가능성을 나타냅니다.","正解は「かねない」です。必要な記録まで失うという好ましくない可能性を表します。","The answer is かねない, expressing the feared possibility of losing needed records.") },
    { concept:"lp4-jlpt-n2-grammar-5", context:"river-recovery-trend", stimulus:"長年の清掃活動により、川の水質は改善し（　）。", choices:["つつある","ことになっている","わけではない","に伴って"], answer:0, explanation:l("정답은 つつある입니다. 장기간 활동의 결과로 수질 개선이 현재 진행 중입니다.","正解は「つつある」です。長年の活動による水質改善が現在進行中です。","The answer is つつある, describing the ongoing improvement of water quality.") },
    { concept:"lp4-jlpt-n2-grammar-5", context:"workplace-culture-change", stimulus:"若い社員の提案を受け入れる文化が、社内に広がり（　）。", choices:["かねない","つつある","ことになっている","わけではない"], answer:1, explanation:l("정답은 つつある입니다. 제안을 받아들이는 문화가 회사 안에서 점차 확산되는 변화입니다.","正解は「つつある」です。提案を受け入れる文化が社内で徐々に広がる変化です。","The answer is つつある, marking the gradual spread of a receptive workplace culture.") },
  ]},
  { mode: "kanji_reading", cases: [
    { concept:"lp4-jlpt-n2-kanji-1", context:"scholarship-selection-standard", stimulus:"奨学金の選考【基準】が公開された。", choices:["きじゅん","もとじゅん","きしゅん","もとしゅん"], answer:0, explanation:l("정답은 きじゅん입니다. 基는 キ, 準은 ジュン으로 읽어 基準이 됩니다.","正解は「きじゅん」です。基はキ、準はジュンと読みます。","The answer is きじゅん: 基 is キ and 準 is ジュン in 基準.") },
    { concept:"lp4-jlpt-n2-kanji-1", context:"regional-industry-foundation", stimulus:"観光はこの町の産業の【基盤】になっている。", choices:["もとばん","きばん","きはん","もといた"], answer:1, explanation:l("정답은 きばん입니다. 基盤에서 基는 음독 キ로 읽습니다.","正解は「きばん」です。「基盤」の基は音読みのキです。","The answer is きばん; 基 takes its on-reading キ in 基盤.") },
    { concept:"lp4-jlpt-n2-kanji-2", context:"conference-preparation", stimulus:"国際会議の【準備】に半年かかった。", choices:["しゅんび","じゅうび","じゅんび","しょうび"], answer:2, explanation:l("정답은 じゅんび입니다. 準의 음독은 ジュン이며 準備로 읽습니다.","正解は「じゅんび」です。準の音読みはジュンです。","The answer is じゅんび; 準 has the on-reading ジュン.") },
    { concept:"lp4-jlpt-n2-kanji-2", context:"standard-temperature-setting", stimulus:"装置は【標準】の温度に設定してください。", choices:["ひょうしゅん","ひょじゅん","ひょうじゅう","ひょうじゅん"], answer:3, explanation:l("정답은 ひょうじゅん입니다. 標準에서 準은 ジュン으로 읽습니다.","正解は「ひょうじゅん」です。「標準」の準はジュンと読みます。","The answer is ひょうじゅん; 準 is read ジュン in 標準.") },
    { concept:"lp4-jlpt-n2-kanji-3", context:"air-quality-measurement", stimulus:"研究班が駅前の空気を【測定】した。", choices:["そくてい","はかてい","そってい","さくてい"], answer:0, explanation:l("정답은 そくてい입니다. 測定의 測은 음독 ソク입니다.","正解は「そくてい」です。「測定」の測は音読みソクです。","The answer is そくてい; 測 takes the on-reading ソク in 測定.") },
    { concept:"lp4-jlpt-n2-kanji-3", context:"cause-inference", stimulus:"残された記録から事故の原因を【推測】した。", choices:["すいはか","すいそく","すいさく","すいぞく"], answer:1, explanation:l("정답은 すいそく입니다. 推測에서 測은 ソク으로 읽습니다.","正解は「すいそく」です。「推測」の測はソクと読みます。","The answer is すいそく; 測 is read ソク in 推測.") },
    { concept:"lp4-jlpt-n2-kanji-4", context:"resident-survey", stimulus:"市が住民の交通事情を【調査】している。", choices:["ちょうざ","しょうさ","ちょうさ","しらさ"], answer:2, explanation:l("정답은 ちょうさ입니다. 調査에서 査의 음독은 サ입니다.","正解は「ちょうさ」です。「調査」の査は音読みサです。","The answer is ちょうさ; 査 has the on-reading サ in 調査.") },
    { concept:"lp4-jlpt-n2-kanji-4", context:"medical-examination-result", stimulus:"血液の【検査】結果は明日わかる。", choices:["けんざ","けんしゃ","けんさく","けんさ"], answer:3, explanation:l("정답은 けんさ입니다. 検査의 査는 サ로 읽습니다.","正解は「けんさ」です。「検査」の査はサと読みます。","The answer is けんさ; 査 is read サ in 検査.") },
    { concept:"lp4-jlpt-n2-kanji-5", context:"report-composition", stimulus:"発表前に報告書の【構成】を見直した。", choices:["こうせい","かまえせい","こうじょう","ごうせい"], answer:0, explanation:l("정답은 こうせい입니다. 構成에서 構는 음독 コウ입니다.","正解は「こうせい」です。「構成」の構は音読みコウです。","The answer is こうせい; 構 takes the on-reading コウ in 構成.") },
    { concept:"lp4-jlpt-n2-kanji-5", context:"machine-mechanism", stimulus:"技術者が新しい装置の【機構】を説明した。", choices:["きかまえ","きこう","きごう","きくみ"], answer:1, explanation:l("정답은 きこう입니다. 機構에서 構는 コウ로 읽어 장치의 구조를 뜻합니다.","正解は「きこう」です。「機構」の構はコウと読み、装置の仕組みを表します。","The answer is きこう; 構 is read コウ, and 機構 means the mechanism of a device.") },
  ]},
  { mode: "listening", cases: [
    { concept:"lp4-jlpt-n2-listening-1", context:"delivery-method-comparison", stimulus:"男の人は、なぜ電車で運ぶことにしましたか。", choices:["最も費用が高いから","最も早く着くから","最も効率がよいから","比較する時間がなかったから"], answer:2, audio:"女：荷物は車と電車のどちらで運びますか。男：時間と費用を比較したら、電車が最も効率的でした。ですから電車にします。", explanation:l("정답은 最も効率がよいから입니다. 남자는 시간과 비용을 비교한 뒤 전철이 가장 효율적이라고 판단했습니다.","正解は「最も効率がよいから」です。男性は時間と費用を比較し、電車が最も効率的だと判断しました。","The answer is that the train was most efficient after comparing time and cost.") },
    { concept:"lp4-jlpt-n2-listening-1", context:"translation-tool-selection", stimulus:"女の人がB社の道具を選んだ決め手は何ですか。", choices:["値段だけ","操作の効率","会社の知名度","説明書の長さ"], answer:1, audio:"男：翻訳の道具はどれにしましたか。女：三つを試しました。B社のものは少ない操作で結果を確認でき、作業効率が一番よかったんです。", explanation:l("정답은 操作の効率입니다. 세 도구를 시험해 적은 조작으로 결과를 확인할 수 있는 B사를 골랐습니다.","正解は「操作の効率」です。三つを試し、少ない操作で確認できるB社製を選びました。","The deciding factor was operational efficiency: B required fewer steps to check results.") },
    { concept:"lp4-jlpt-n2-listening-2", context:"library-hours-evidence", stimulus:"図書館は何を根拠に開館時間を変えますか。", choices:["職員の希望だけ","利用者数だけ","天気予報だけ","利用者数と意見"], answer:3, audio:"女：開館時間を延ばすそうですね。男：はい。時間帯別の利用者数に加えて、アンケートの意見も検討して決めました。", explanation:l("정답은 利用者数と意見입니다. 시간대별 이용자 수뿐 아니라 설문 의견도 함께 검토했습니다.","正解は「利用者数と意見」です。時間帯別の人数だけでなく、アンケートの意見も検討しました。","The library used both visitor numbers and survey feedback as evidence.") },
    { concept:"lp4-jlpt-n2-listening-2", context:"product-improvement-evidence", stimulus:"改善案を決めるとき、何を参考にしましたか。", choices:["売上と購入者の声","売上だけ","担当者の好み","去年の広告だけ"], answer:0, audio:"男：改善案はどうやって決めたんですか。女：売上の数字だけでなく、購入した方の声も分類して参考にしました。", explanation:l("정답은 売上と購入者の声입니다. 수치와 구매자 의견 양쪽을 판단 근거로 삼았습니다.","正解は「売上と購入者の声」です。数値と購入者の意見の両方を判断材料にしました。","They relied on both sales figures and customer feedback.") },
    { concept:"lp4-jlpt-n2-listening-3", context:"station-peak-counter", stimulus:"駅は朝の混雑時にどうしますか。", choices:["窓口を全部閉める","予備の窓口を開ける","利用者を午後に断る","切符の販売をやめる"], answer:1, audio:"女：朝は切符売り場が混みますね。男：来週から、七時半から九時まで予備の窓口を開けることになりました。", explanation:l("정답은 予備の窓口を開ける입니다. 혼잡한 7시 반부터 9시까지만 예비 창구를 엽니다.","正解は「予備の窓口を開ける」です。混雑する七時半から九時まで開けます。","The station will open a spare counter during the busy 7:30–9:00 period.") },
    { concept:"lp4-jlpt-n2-listening-3", context:"clinic-busy-reception", stimulus:"診療所が月曜日の午前に追加するものは何ですか。", choices:["休憩時間","診察室の工事","受付の担当者","休日"], answer:2, audio:"男：月曜の午前は患者さんが集中します。女：では、その時間だけ受付の担当者を一人増やしましょう。", explanation:l("정답은 受付の担当者입니다. 이용자가 집중되는 월요일 오전에만 접수 담당자를 한 명 늘립니다.","正解は「受付の担当者」です。患者が集中する月曜午前だけ一人増やします。","The clinic will add one receptionist specifically on busy Monday mornings.") },
    { concept:"lp4-jlpt-n2-listening-4", context:"schedule-change-explanation", stimulus:"男の人は、理由を書かないとどうなると心配していますか。", choices:["予定が早まる","費用が下がる","参加者が増える","変更が誤解される"], answer:3, audio:"女：日程変更だけ知らせれば十分でしょうか。男：理由がないと、こちらの都合だけで変えたと誤解されかねません。短くても理由を書きましょう。", explanation:l("정답은 変更が誤解される입니다. 이유를 생략하면 일방적인 변경으로 오해받을 수 있다고 걱정합니다.","正解は「変更が誤解される」です。理由を省くと一方的な変更だと誤解される恐れがあります。","He worries the change may be misunderstood as one-sided if no reason is given.") },
    { concept:"lp4-jlpt-n2-listening-4", context:"missing-chart-label-risk", stimulus:"女の人は何を付け加えるよう求めていますか。", choices:["調査の理由","図の説明","新しい写真","会議の日程"], answer:0, audio:"男：報告書の図はこのままでいいですか。女：数字だけでは意味を取り違えかねません。調査の理由を一文加えてください。", explanation:l("정답은 調査の理由입니다. 숫자의 의미가 오해되지 않도록 조사 이유를 한 문장 덧붙이라고 합니다.","正解は「調査の理由」です。数字の意味を取り違えないよう、一文加えるよう求めています。","She asks for the reason for the survey to prevent misinterpretation of the figures.") },
    { concept:"lp4-jlpt-n2-listening-5", context:"factory-quality-stabilizing", stimulus:"生産の状態について、男の人はどう説明していますか。", choices:["完全に停止した","安定し始めたが確認を続ける","悪化が確定した","確認はもう不要だ"], answer:1, audio:"女：新しい機械に替えてから、不良品は減りましたか。男：はい。生産は安定しつつあります。ただ、今月いっぱいは毎日確認します。", explanation:l("정답은 安定し始めたが確認を続ける입니다. 안정되는 과정이지만 이달 말까지 매일 점검합니다.","正解は「安定し始めたが確認を続ける」です。安定へ向かっていますが、今月中は毎日確認します。","Production is becoming stable, but daily checks will continue through the month.") },
    { concept:"lp4-jlpt-n2-listening-5", context:"river-restoration-progress", stimulus:"川の環境は現在どうなっていますか。", choices:["改善中だが観測を続ける","すでに完全に元通りだ","急に悪化した","観測を中止した"], answer:0, audio:"男：魚の種類が少しずつ増えていますね。女：ええ、川の環境は回復しつつありますが、水質の観測はこれからも続けます。", explanation:l("정답은 改善中だが観測を続ける입니다. 환경은 회복 중이지만 수질 관측은 계속합니다.","正解は「改善中だが観測を続ける」です。環境は回復中ですが、水質観測は継続します。","The river is recovering, but water-quality monitoring will continue.") },
  ]},
];

const answerPatterns: Record<Mode, readonly (0 | 1 | 2 | 3)[]> = {
  vocab_mc: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1],
  grammar_fill: [2, 3, 2, 3, 0, 1, 2, 3, 0, 1],
  kanji_reading: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1],
  listening: [2, 3, 2, 3, 0, 1, 2, 3, 0, 1],
};

export const N2_ITEMS40: AuthoredItem[] = groups.flatMap(({ mode, cases }) =>
  cases.map((entry, index) => {
    const intended = answerPatterns[mode][index]!;
    const correct = entry.choices[entry.answer];
    const arranged = entry.choices.filter((_, choiceIndex) => choiceIndex !== entry.answer);
    arranged.splice(intended, 0, correct);
    const guide = instructions[mode];
    return {
      id: `lp4-n2-${mode}-${String(index + 1).padStart(2, "0")}`,
      concept_key: entry.concept,
      track: "jlpt-ja",
      level: "N2",
      section: mode,
      difficulty: 4,
      context_tag: entry.context,
      question: l(`${guide.ko}\n${entry.stimulus}`, `${guide.ja}\n${entry.stimulus}`, `${guide.en}\n${entry.stimulus}`),
      choices: same(arranged),
      answer_index: intended,
      explanation: entry.explanation,
      ...(entry.audio === undefined ? {} : { audio_script: entry.audio }),
    };
  }),
);
