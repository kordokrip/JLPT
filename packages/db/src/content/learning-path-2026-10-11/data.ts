// 강성호 2026-10-11: 검수 전 자체 저작 문항이다. source evidence와 reviewer 승인은 통합 단계에서 별도로 결합한다.
import { CONCEPTS, JLPT_CONCEPTS, TOPIK_CONCEPTS, type ConceptSpec, type Localized } from './concept-specs.js';

export { CONCEPTS };

export type DraftItem = {
  id: string;
  concept_key: string;
  track: 'jlpt-ja' | 'topik-ko';
  level: string;
  section: string;
  question: Localized;
  choices?: Localized[];
  answer_index?: 0 | 1 | 2 | 3;
  explanation: Localized;
  audio_script?: string;
  rubric?: Localized;
  sample?: Localized;
  difficulty: 1 | 2 | 3 | 4 | 5;
};

const L = (ko: string, ja: string, en: string): Localized => ({ ko, ja, en });
const difficulty = (level: string): 1 | 2 | 3 | 4 | 5 => {
  const n = Number(level.replace(/\D/g, ''));
  return level.startsWith('N') ? Math.max(1, Math.min(5, 6 - n)) as 1 | 2 | 3 | 4 | 5 : Math.max(1, Math.min(5, n)) as 1 | 2 | 3 | 4 | 5;
};

const rotate = <T>(values: readonly T[], correct: T, answer: number, shift = 0): T[] => {
  const pool = values.filter((value) => value !== correct);
  const distractors = [...pool.slice(shift), ...pool.slice(0, shift)].slice(0, 3);
  const result = distractors.slice();
  result.splice(answer, 0, correct);
  return result;
};

type GrammarCase = { stem: string; correct: string; distractors: readonly [string, string, string] };
const GRAMMAR: Record<string, readonly [GrammarCase, GrammarCase]> = {
  'N5:は': [{ stem: '田中さん___会社員です。', correct: 'は', distractors: ['を','に','で'] }, { stem: 'この本___私のです。', correct: 'は', distractors: ['を','へ','と'] }],
  'N5:を': [{ stem: '毎朝、新聞___読みます。', correct: 'を', distractors: ['は','に','で'] }, { stem: '駅で友達___待ちました。', correct: 'を', distractors: ['が','へ','と'] }],
  'N5:に': [{ stem: '七時___起きます。', correct: 'に', distractors: ['を','で','と'] }, { stem: '来月、日本___行きます。', correct: 'に', distractors: ['を','が','の'] }],
  'N5:で': [{ stem: '図書館___勉強します。', correct: 'で', distractors: ['に','を','へ'] }, { stem: '箸___ご飯を食べます。', correct: 'で', distractors: ['を','の','が'] }],
  'N5:ません': [{ stem: '今日はコーヒーを飲み___。', correct: 'ません', distractors: ['ます','ました','ましょう'] }, { stem: '日曜日は会社へ行き___。', correct: 'ません', distractors: ['ます','ました','たいです'] }],
  'N4:ながら': [{ stem: '音楽を聞き___、料理します。', correct: 'ながら', distractors: ['まで','だけ','ので'] }, { stem: '地図を見___、駅まで歩きました。', correct: 'ながら', distractors: ['そうで','たあと','より'] }],
  'N4:てしまう': [{ stem: '大切な書類をなくし___。', correct: 'てしまいました', distractors: ['てみました','てあります','ておきました'] }, { stem: '宿題を全部終え___。', correct: 'てしまった', distractors: ['ているところだ','てほしい','てもらった'] }],
  'N4:なければならない': [{ stem: '明日までに申込書を出さ___。', correct: 'なければなりません', distractors: ['なくてもいいです','ないでください','ないことがあります'] }, { stem: '入る前に靴を脱が___。', correct: 'なければならない', distractors: ['ないほうがいい','なくてもよい','ないかもしれない'] }],
  'N4:ようになる': [{ stem: '毎日練習して、漢字が読める___。', correct: 'ようになりました', distractors: ['ことにしました','はずでした','ところでした'] }, { stem: '引っ越してから、自転車で通う___。', correct: 'ようになった', distractors: ['ことがあった','ためになった','わけになった'] }],
  'N4:かもしれない': [{ stem: '空が暗いので、雨が降る___。', correct: 'かもしれません', distractors: ['にちがいます','ことにします','ようにします'] }, { stem: '道が混んでいて、少し遅れる___。', correct: 'かもしれない', distractors: ['ことができる','ようになる','つもりだった'] }],
  'N3:わけではない': [{ stem: '値段が高ければ、必ず品質がいい___。', correct: 'わけではない', distractors: ['ことになっている','おかげである','ようにしている'] }, { stem: '反対しているが、計画を全部否定する___。', correct: 'わけではありません', distractors: ['ことになりました','おかげでした','ようにしました'] }],
  'N3:ことになっている': [{ stem: 'この施設では、受付で身分証を見せる___。', correct: 'ことになっている', distractors: ['わけではない','おかげである','ようにしている'] }, { stem: '資料は毎週金曜日に更新する___。', correct: 'ことになっています', distractors: ['わけではありません','おかげです','ようにしています'] }],
  'N3:おかげで': [{ stem: '友達が手伝ってくれた___、早く終わった。', correct: 'おかげで', distractors: ['に対して','わけではなく','ことになって'] }, { stem: '案内が分かりやすかった___、迷わず着いた。', correct: 'おかげで', distractors: ['に対して','ようにして','ことになり'] }],
  'N3:ようにする': [{ stem: '忘れない___、予定を手帳に書いている。', correct: 'ようにして', distractors: ['おかげで','わけではなく','ことになって'] }, { stem: '健康のため、毎日歩く___。', correct: 'ようにしています', distractors: ['ことになっています','わけではありません','おかげです'] }],
  'N3:に対して': [{ stem: 'この制度___、利用者から質問が出た。', correct: 'に対して', distractors: ['おかげで','ようにして','ことになって'] }, { stem: '兄が静かなの___、弟はよく話す。', correct: 'に対して', distractors: ['おかげで','わけではなく','ようにして'] }],
  'N2:わけではない': [{ stem: '説明が短いからといって、内容が不足している___。', correct: 'わけではない', distractors: ['に伴っている','かねない','つつある'] }, { stem: '予定を変更しても、計画を中止する___。', correct: 'わけではありません', distractors: ['に伴っています','かねません','つつあります'] }],
  'N2:ことになっている': [{ stem: '機器は使用後に返却する___。', correct: 'ことになっている', distractors: ['わけではない','かねない','つつある'] }, { stem: '会議では費用と効果を評価する___。', correct: 'ことになっています', distractors: ['わけではありません','かねません','つつあります'] }],
  'N2:に伴って': [{ stem: '利用者の増加___、窓口を増やした。', correct: 'に伴って', distractors: ['にすぎず','だけに','ものの'] }, { stem: '制度の変更___、申請方法も変わった。', correct: 'に伴い', distractors: ['に対し','だけで','ものなら'] }],
  'N2:かねない': [{ stem: '確認を怠ると、大きな事故につながり___。', correct: 'かねない', distractors: ['つつある','にすぎない','わけではない'] }, { stem: '説明を省けば、誤解を招き___。', correct: 'かねません', distractors: ['つつあります','にすぎません','わけではありません'] }],
  'N2:つつある': [{ stem: '地域の人口は少しずつ減り___。', correct: 'つつある', distractors: ['かねない','にすぎない','わけではない'] }, { stem: '新しい制度が社会に定着し___。', correct: 'つつあります', distractors: ['かねません','にすぎません','わけではありません'] }],
  'N1:いかんだ': [{ stem: '計画を実行できるかは、予算___。', correct: 'いかんだ', distractors: ['ならではだ','ないまでもだ','を皮切りにだ'] }, { stem: '評価が変わるかどうかは、今後の結果___。', correct: 'いかんである', distractors: ['ならではである','ないまでもである','を皮切りにである'] }],
  'N1:を余儀なくされる': [{ stem: '大雪のため、鉄道会社は運休___。', correct: 'を余儀なくされた', distractors: ['を皮切りにした','に足りなかった','ならではだった'] }, { stem: '資金不足で、計画の縮小___。', correct: 'を余儀なくされました', distractors: ['を皮切りにしました','に足りました','ならではでした'] }],
  'N1:ならでは': [{ stem: 'この細やかな接客は、老舗___の魅力だ。', correct: 'ならでは', distractors: ['いかん','ないまでも','を皮切りに'] }, { stem: '地元の素材を生かした、ここ___の味です。', correct: 'ならでは', distractors: ['いかん','に足る','を余儀なくされる'] }],
  'N1:ないまでも': [{ stem: '毎日は無理___、週に一度は運動したい。', correct: 'でないまでも', distractors: ['を皮切りに','を余儀なくされ','いかんで'] }, { stem: '完璧とは言え___、十分に評価できる成果だ。', correct: 'ないまでも', distractors: ['ならでは','いかんだ','を皮切りに'] }],
  'N1:を皮切りに': [{ stem: '東京公演___、全国十都市を回る。', correct: 'を皮切りに', distractors: ['を余儀なくされ','ないまでも','いかんで'] }, { stem: '新製品の発表___、関連サービスも順次公開された。', correct: 'を皮切りに', distractors: ['ならでは','いかんだ','に足らず'] }],
};

type KanjiCase = { phrase: string; reading: string; distractors: readonly [string, string, string] };
const KANJI: Record<string, readonly [KanjiCase, KanjiCase]> = {
  日:[{phrase:'日本',reading:'に',distractors:['ひ','じつ','び']},{phrase:'日曜日',reading:'にち',distractors:['ひ','じつ','か']}], 月:[{phrase:'月曜日',reading:'げつ',distractors:['つき','がつ','げち']},{phrase:'今月',reading:'げつ',distractors:['つき','がつ','げち']}], 人:[{phrase:'日本人',reading:'じん',distractors:['ひと','にん','びと']},{phrase:'三人',reading:'にん',distractors:['じん','ひと','びと']}], 山:[{phrase:'富士山',reading:'さん',distractors:['やま','ざん','せん']},{phrase:'山道',reading:'やま',distractors:['さん','ざん','せん']}], 川:[{phrase:'川上',reading:'かわ',distractors:['がわ','せん','こう']},{phrase:'小川',reading:'がわ',distractors:['かわ','せん','こう']}],
  会:[{phrase:'会社',reading:'かい',distractors:['あ','え','がい']},{phrase:'会う',reading:'あ',distractors:['かい','え','がい']}], 社:[{phrase:'会社',reading:'しゃ',distractors:['やしろ','じゃ','さ']},{phrase:'神社',reading:'じゃ',distractors:['しゃ','やしろ','さ']}], 駅:[{phrase:'駅前',reading:'えき',distractors:['やく','えっ','え']},{phrase:'駅員',reading:'えき',distractors:['やく','えっ','え']}], 時:[{phrase:'時間',reading:'じ',distractors:['とき','し','じき']},{phrase:'時計',reading:'と',distractors:['じ','とき','し']}], 間:[{phrase:'時間',reading:'かん',distractors:['あいだ','ま','けん']},{phrase:'間に合う',reading:'ま',distractors:['かん','あいだ','けん']}],
  確:[{phrase:'確認',reading:'かく',distractors:['こう','きゃく','がく']},{phrase:'正確',reading:'かく',distractors:['こう','きゃく','がく']}], 変:[{phrase:'変更',reading:'へん',distractors:['べん','はん','かわ']},{phrase:'変化',reading:'へん',distractors:['べん','はん','かわ']}], 議:[{phrase:'会議',reading:'ぎ',distractors:['き','げ','ご']},{phrase:'議員',reading:'ぎ',distractors:['き','げ','ご']}], 調:[{phrase:'調査',reading:'ちょう',distractors:['じょう','しょう','ちょ']},{phrase:'調整',reading:'ちょう',distractors:['じょう','しょう','ちょ']}], 連:[{phrase:'連絡',reading:'れん',distractors:['れい','ねん','れつ']},{phrase:'関連',reading:'れん',distractors:['れい','ねん','れつ']}],
  対:[{phrase:'対応',reading:'たい',distractors:['だい','つい','たいら']},{phrase:'反対',reading:'たい',distractors:['だい','つい','たいら']}], 効:[{phrase:'効率',reading:'こう',distractors:['きょう','ごう','こ']},{phrase:'効果',reading:'こう',distractors:['きょう','ごう','こ']}], 判:[{phrase:'判断',reading:'はん',distractors:['ばん','は','わか']},{phrase:'判定',reading:'はん',distractors:['ばん','は','わか']}], 課:[{phrase:'課題',reading:'か',distractors:['が','け','かい']},{phrase:'課長',reading:'か',distractors:['が','け','かい']}],
  顕:[{phrase:'顕著',reading:'けん',distractors:['げん','こん','あらわ']},{phrase:'顕在化',reading:'けん',distractors:['げん','こん','あらわ']}], 乖:[{phrase:'乖離',reading:'かい',distractors:['がい','けい','り']},{phrase:'乖離率',reading:'かい',distractors:['がい','けい','り']}], 遂:[{phrase:'遂行',reading:'すい',distractors:['つい','ずい','と']},{phrase:'完遂',reading:'すい',distractors:['つい','ずい','と']}], 衡:[{phrase:'均衡',reading:'こう',distractors:['ぎょう','しょう','へい']},{phrase:'平衡',reading:'こう',distractors:['ぎょう','しょう','へい']}], 緩:[{phrase:'緩和',reading:'かん',distractors:['だん','げん','ゆる']},{phrase:'緩衝',reading:'かん',distractors:['だん','げん','ゆる']}],
};

const VOCAB_CONTEXTS: Record<string, readonly [string, string]> = {
  学校:['妹は毎朝八時に学校へ行きます。','学校の図書館で宿題をしました。'],先生:['分からない漢字を先生に聞きました。','先生は教室で学生を待っています。'],電車:['雨の日は電車で会社へ行きます。','電車が遅れて約束に間に合いませんでした。'],友達:['週末に友達と映画を見ました。','困ったとき、友達が手伝ってくれました。'],朝ご飯:['朝ご飯にパンと卵を食べました。','急いでいて朝ご飯を食べませんでした。'],
  予定:['午後の予定を手帳で確認しました。','雨のため旅行の予定を変えました。'],連絡:['到着したら家族に連絡してください。','担当者から変更の連絡が来ました。'],準備:['会議の準備を前日に終えました。','旅行の準備に二時間かかりました。'],必要:['申請には身分証が必要です。','必要な資料だけ机に置きました。'],約束:['駅前で会う約束をしました。','約束の時間に十分遅れました。'],
  確認:['提出前に名前を確認してください。','予約内容を電話で確認しました。'],変更:['会議の時間を三時に変更しました。','住所に変更があれば知らせてください。'],影響:['大雨が交通に影響を与えました。','睡眠不足は仕事の効率に影響します。'],対応:['窓口の担当者が丁寧に対応しました。','障害が起きたため、すぐに対応しました。'],状況:['現場の状況を写真で報告しました。','状況が変わるまでここで待ちます。'],
  方針:['会社は新しい方針を発表しました。','基本方針に沿って計画を直しました。'],手順:['画面の手順に従って申請しました。','安全な作業手順を全員で確認しました。'],判断:['資料を比較してから判断しました。','一度の結果だけで判断してはいけません。'],効率:['道具の配置を変えて作業効率を上げました。','費用だけでなく効率も比較しました。'],課題:['待ち時間の短縮が次の課題です。','調査で制度の課題が明らかになりました。'],
  論拠:['主張の論拠を資料で示しました。','結論より先に論拠を検証しました。'],脈絡:['発言の脈絡を確認して誤解を解きました。','一文だけでなく文章全体の脈絡を読みます。'],妥当性:['第三者が提案の妥当性を検証しました。','新しい基準の妥当性には議論が必要です。'],乖離:['報告値と実測値の乖離を調べました。','理想と現場の間に乖離があります。'],是正:['誤った表示を直ちに是正しました。','監査結果を受けて手順を是正します。'],
};

const TOPIK_VOCAB_CLUES: Record<string, readonly [string, string]> = {
  '인사와 소개':['처음 만난 사람에게 이름과 국적을 말합니다.','선생님을 만나 정중하게 안부를 묻습니다.'],가족:['아버지와 어머니, 동생을 함께 부르는 말입니다.','집에서 함께 사는 사람들을 소개합니다.'],'학교 물건':['수업 때 연필, 공책, 지우개를 사용합니다.','책상 위에 교과서와 필통이 있습니다.'],'시장 물건':['과일 가게에서 사과와 배의 값을 묻습니다.','장바구니에 채소와 생선을 담습니다.'],
  '하루 일과':['아침에 일어나 출근하고 저녁에 쉽니다.','기상부터 취침까지 한 일을 순서대로 말합니다.'],'날씨와 계획':['비 예보를 보고 소풍 날짜를 정합니다.','기온과 강수 여부에 맞춰 주말 약속을 바꿉니다.'],'취미와 약속':['쉬는 날에 등산을 하기로 친구와 정합니다.','좋아하는 활동을 함께 할 시간을 잡습니다.'],대중교통:['버스와 지하철을 갈아타고 회사에 갑니다.','정류장에서 노선을 확인하고 교통카드를 찍습니다.'],
  '예약과 변경':['식당에 잡아 둔 시간을 다른 시각으로 바꿉니다.','병원 방문 날짜를 미리 정한 뒤 수정합니다.'],'신청과 문의':['프로그램 참가 서류를 내고 필요한 내용을 묻습니다.','이용 조건을 담당자에게 질문한 뒤 접수합니다.'],'건강과 습관':['충분히 자고 규칙적으로 운동합니다.','매일 물을 마시며 몸 상태를 관리합니다.'],'직장 전화':['회사로 걸려 온 전화를 담당자에게 연결합니다.','업무 용건과 연락처를 메모해 전달합니다.'],
  '공공 서비스':['주민센터에서 서류를 발급받고 상담합니다.','도서관과 보건소의 이용 방법을 확인합니다.'],'환경과 분리배출':['병과 종이, 플라스틱을 나누어 버립니다.','쓰레기를 줄이고 재활용품을 정해진 날에 냅니다.'],'지역과 문화':['동네 축제와 전통 공연을 주민에게 소개합니다.','지역 박물관에서 고장의 역사와 예술을 배웁니다.'],'지역 정책':['시청이 주민을 위해 새 교통 제도를 마련합니다.','지역 문제 해결을 위한 행정 계획을 검토합니다.'],
  '의견과 근거':['주장을 말한 뒤 그 이유와 자료를 제시합니다.','생각을 뒷받침하는 사례를 함께 설명합니다.'],'비교와 평가':['두 방안의 장단점을 살펴 점수를 매깁니다.','이전 결과와 새 결과를 대조해 판단합니다.'],'사회 문제':['주거 불안과 고령화처럼 공동체가 해결할 일을 다룹니다.','개인만으로 해결하기 어려운 현상의 원인을 찾습니다.'],'디지털 접근성':['장애나 나이와 관계없이 온라인 서비스를 쓰게 합니다.','화면 읽기와 큰 글씨로 정보 이용 장벽을 낮춥니다.'],
  '사회 현상 분석':['통계와 사례를 이용해 인구 변화를 해석합니다.','여러 집단에서 나타나는 변화를 원인별로 살핍니다.'],'연구와 해석':['자료를 수집하고 결과의 의미를 설명합니다.','관찰한 수치를 맥락에 따라 이해합니다.'],'연구와 비평':['연구의 근거와 한계를 따져 의견을 제시합니다.','조사 방법의 장점과 문제점을 함께 검토합니다.'],'자료 해석':['표와 그래프가 보여 주는 변화의 뜻을 설명합니다.','수치의 범위와 조건을 확인해 결론을 냅니다.'],
};

const TOPIK_LISTENING_TOPICS: Record<string, { ja: string; en: string }> = {
  '짧은 자기소개': { ja: '短い自己紹介', en: 'a short self-introduction' },
  '카페 주문': { ja: 'カフェでの注文', en: 'ordering at a cafe' },
  '도서관 안내': { ja: '図書館の案内', en: 'a library announcement' },
  '시장 방송': { ja: '市場の放送', en: 'a market announcement' },
  '전화 약속': { ja: '電話での約束', en: 'a phone arrangement' },
  '버스 안내': { ja: 'バスの案内', en: 'a bus announcement' },
  '약속 변경': { ja: '約束の変更', en: 'changing an appointment' },
  '환승 약속': { ja: '乗り換えの待ち合わせ', en: 'a transfer meeting arrangement' },
  '병원 예약': { ja: '病院の予約', en: 'a clinic appointment' },
  '회사 일정': { ja: '会社の日程', en: 'a workplace schedule' },
  '건강 상담': { ja: '健康相談', en: 'a health consultation' },
  '업무 요청': { ja: '業務上の依頼', en: 'a work request' },
  '분실물 안내': { ja: '落とし物の案内', en: 'a lost-property announcement' },
  '기차 안내': { ja: '列車の案内', en: 'a train announcement' },
  '행사 변경': { ja: '行事の変更', en: 'an event change' },
  '행사 조정': { ja: '行事の日程調整', en: 'event schedule coordination' },
  '회의 의견': { ja: '会議での意見', en: 'an opinion in a meeting' },
  '회의 보고': { ja: '会議報告', en: 'a meeting report' },
  '토론 요약': { ja: '討論の要約', en: 'a discussion summary' },
  '토론의 결론': { ja: '討論の結論', en: 'the conclusion of a discussion' },
  '발표 결론': { ja: '発表の結論', en: 'the conclusion of a presentation' },
  '전문가 설명': { ja: '専門家の説明', en: 'an expert explanation' },
  '공청회 발언': { ja: '公聴会での発言', en: 'a public-hearing statement' },
};

type TopikGrammarCase = { stem: string; correct: string; distractors: readonly [string, string, string] };
const TOPIK_GRAMMAR: Record<string, readonly [TopikGrammarCase, TopikGrammarCase]> = {
  '이에요와 예요':[{stem:'저는 학생___.',correct:'이에요',distractors:['예요','에서','하고']},{stem:'제 이름은 유키___.',correct:'예요',distractors:['이에요','으로','까지']}], '에 있어요':[{stem:'책이 가방 안___.',correct:'에 있어요',distractors:['에서 가요','을 있어요','와 있어요']},{stem:'은행은 역 앞___.',correct:'에 있어요',distractors:['에서 만나요','를 있어요','에게 있어요']}], 에서:[{stem:'도서관___ 책을 읽어요.',correct:'에서',distractors:['에','을','하고']},{stem:'친구를 학교___ 만났어요.',correct:'에서',distractors:['에','가','에게']}], 으세요:[{stem:'여기에 앉___.',correct:'으세요',distractors:['어요','을까요','으려고']},{stem:'이 약을 드___.',correct:'세요',distractors:['고요','지만','니까']}],
  '고 싶어요':[{stem:'주말에 영화를 보___.',correct:'고 싶어요',distractors:['아야 해요','는 중이에요','기로 했어요']},{stem:'한국 음식을 만들___.',correct:'고 싶어요',distractors:['고 있어요','게 됐어요','는 편이에요']}], '았어요와 었어요':[{stem:'어제 친구를 ___.',correct:'만났어요',distractors:['만나요','만나겠어요','만나고요']},{stem:'아침에 밥을 ___.',correct:'먹었어요',distractors:['먹어요','먹겠어요','먹는군요']}], '으려고 하다':[{stem:'주말에 부산에 가___.',correct:'려고 해요',distractors:['고 말아요','는 편이에요','기만 해요']},{stem:'버스를 타___.',correct:'려고 합니다',distractors:['고 있습니다','게 됩니다','기 바랍니다']}],
  '기 때문에':[{stem:'비가 오___ 우산을 가져왔어요.',correct:'기 때문에',distractors:['는 대신에','을 뿐만 아니라','는 셈이다']},{stem:'길이 막히___ 지하철을 탔어요.',correct:'기 때문에',distractors:['기는 하지만','도록','는데']}], 는데:[{stem:'지금 회의 중인___ 나중에 전화해 주세요.',correct:'데',distractors:['기','지만','도록']},{stem:'문의가 있는___ 어디로 가야 해요?',correct:'데',distractors:['기 때문에','뿐만 아니라','셈이다']}], '아/어야 하다':[{stem:'건강하려면 충분히 자___.',correct:'야 해요',distractors:['고 싶어요','는 중이에요','는 대신이에요']},{stem:'예약하려면 오늘 신청하___.',correct:'여야 합니다',distractors:['려고 합니다','고 있습니다','기 마련입니다']}], '아/어서':[{stem:'길이 ___ 조금 늦었습니다.',correct:'막혀서',distractors:['막히지만','막히도록','막히는 대신에']},{stem:'자료를 ___ 다시 연락드리겠습니다.',correct:'확인해서',distractors:['확인하면서도','확인할 뿐만 아니라','확인하는 셈이다']}],
  '는 바람에':[{stem:'갑자기 비가 오___ 행사가 취소됐다.',correct:'는 바람에',distractors:['는 반면에','는 대신에','도록']},{stem:'버스가 늦게 도착하___ 기차를 놓쳤다.',correct:'는 바람에',distractors:['기는 하지만','을 뿐만 아니라','에 비추어']}], 도록:[{stem:'모두 들을 수 있___ 크게 말해 주세요.',correct:'도록',distractors:['는데','기에','는 셈이다']},{stem:'잊지 않___ 달력에 표시했습니다.',correct:'도록',distractors:['는 반면에','을 뿐만 아니라','기 마련이다']}], '는 반면에':[{stem:'도시는 ___ 생활비가 비싸다.',correct:'편리한 반면에',distractors:['편리한 바람에','편리한 대신에','편리하도록']},{stem:'형은 말이 적___ 동생은 활발하다.',correct:'은 반면에',distractors:['을 뿐만 아니라','기에','는 셈이다']}], '는 대신에':[{stem:'차를 가져가___ 지하철을 탔어요.',correct:'는 대신에',distractors:['는 바람에','는 반면에','도록']},{stem:'오늘 야근하___ 내일 늦게 출근합니다.',correct:'는 대신에',distractors:['을 뿐만 아니라','에 비추어','기 마련이다']}],
  '기는커녕':[{stem:'사과하___ 오히려 화를 냈다.',correct:'기는커녕',distractors:['기는 하지만','기 마련이다','을 뿐만 아니라']},{stem:'쉬___ 점심도 못 먹었다.',correct:'기는커녕',distractors:['는 셈이다','에 비추어','기에']}], '기는 하지만':[{stem:'이 방법이 편리하___ 비용이 많이 든다.',correct:'기는 하지만',distractors:['기는커녕','기 마련이다','을 뿐만 아니라']},{stem:'결과가 좋아지___ 아직 한계가 있다.',correct:'기는 했지만',distractors:['는 셈이지만','에 비추지만','을 뿐이지만']}], '기 마련이다':[{stem:'처음 하는 일은 실수하___.',correct:'기 마련이다',distractors:['기는커녕','는 셈이다','에 비추어']},{stem:'준비가 부족하면 문제가 생기___.',correct:'기 마련입니다',distractors:['을 뿐만 아니라','기는 하지만','는 대신입니다']}], '을 뿐만 아니라':[{stem:'이 앱은 글씨가 클___ 음성 안내도 제공한다.',correct:'뿐만 아니라',distractors:['기는커녕','기 마련이며','는 셈이라']},{stem:'비용___ 시간도 절약할 수 있다.',correct:'뿐만 아니라',distractors:['에 비추어','는 대신에','는 바람에']}],
  '는 한이 있더라도':[{stem:'시간이 더 걸리___ 정확히 확인하겠다.',correct:'는 한이 있더라도',distractors:['는 셈이라도','에 비추더라도','기는커녕']},{stem:'비용을 부담하___ 안전은 지켜야 한다.',correct:'는 한이 있더라도',distractors:['을 뿐만 아니라','기 마련이라도','기에']}], 기에:[{stem:'자료가 충분하지 않___ 결론을 미뤘다.',correct:'기에',distractors:['는 셈이다','을 뿐만 아니라','는 대신에']},{stem:'상황이 급하___ 먼저 전화로 알렸다.',correct:'기에',distractors:['기 마련이다','는 반면에','도록']}], '는 셈이다':[{stem:'하루에 두 시간씩이면 일주일에 열네 시간을 공부하___.',correct:'는 셈이다',distractors:['기에','는 한이 있더라도','에 비추어']},{stem:'참가자 절반이 찬성했으니 의견이 나뉜___.',correct:'셈이다',distractors:['뿐만 아니라','바람이다','대신이다']}], '에 비추어':[{stem:'지금까지의 결과___ 계획을 수정해야 한다.',correct:'에 비추어',distractors:['는 셈이다','기는커녕','는 대신에']},{stem:'관련 법규___ 이 절차는 적절하지 않다.',correct:'에 비추어',distractors:['기 마련이다','을 뿐만 아니라','는 바람에']}],
};

function peers(concept: ConceptSpec): ConceptSpec[] {
  return JLPT_CONCEPTS.filter((candidate) => candidate.level === concept.level && candidate.section === concept.section);
}

function jlptQuestion(concept: ConceptSpec, variant: 0 | 1): DraftItem {
  const group = peers(concept);
  const localIndex = group.findIndex((candidate) => candidate.key === concept.key);
  const sectionOffset = ({ vocab: 0, grammar: 1, kanji: 2, listening: 3 } as const)[concept.section as 'vocab' | 'grammar' | 'kanji' | 'listening'];
  const answer = ((localIndex * 2 + variant + sectionOffset) % 4) as 0 | 1 | 2 | 3;
  const base = { id: `${concept.key}-q${variant + 1}`, concept_key: concept.key, track: concept.track, level: concept.level, difficulty: difficulty(concept.level) } as const;

  if (concept.section === 'vocab') {
    const scene = VOCAB_CONTEXTS[concept.lookup.value]![variant];
    const candidates = group.map((candidate) => candidate.title);
    const correct = concept.title;
    return {
      ...base, section: 'vocab_mc',
      question: L(`${concept.level} 다음 상황에서 「${concept.lookup.value}」의 뜻으로 가장 알맞은 것을 고르세요. ${scene}`, `${concept.level}の次の場面で「${concept.lookup.value}」の意味として最も適切なものを選んでください。${scene}`, `For ${concept.level}, choose the best meaning of 「${concept.lookup.value}」 in this situation. ${scene}`),
      choices: rotate(candidates, correct, answer, variant), answer_index: answer,
      explanation: L(`「${concept.lookup.value}」은/는 문맥에서 ‘${concept.title.ko}’라는 뜻이다. 다른 보기는 같은 급수의 별도 개념이다.`, `「${concept.lookup.value}」はこの文脈で「${concept.title.ja}」を表す。ほかの選択肢は別の概念である。`, `Here, 「${concept.lookup.value}」 means “${concept.title.en}”; the other options name different concepts.`),
    };
  }

  if (concept.section === 'grammar') {
    const pattern = concept.lookup.value;
    const grammar = GRAMMAR[`${concept.level}:${pattern}`]![variant];
    const options = rotate([grammar.correct, ...grammar.distractors], grammar.correct, answer).map((value) => L(value, value, value));
    return {
      ...base, section: 'grammar_fill',
      question: L(`${concept.level} 빈칸에 들어갈 가장 자연스러운 표현을 고르세요. ${grammar.stem}`, `${concept.level}の空欄に入る最も自然な表現を選んでください。${grammar.stem}`, `Choose the most natural expression for the ${concept.level} blank. ${grammar.stem}`),
      choices: options, answer_index: answer,
      explanation: L(`${pattern}은/는 ${concept.title.ko}의 기능을 나타낸다. 문장의 관계와 활용을 함께 확인해야 한다.`, `${pattern}は「${concept.title.ja}」の機能を表す。文の関係と接続を合わせて確認する。`, `${pattern} expresses ${concept.title.en}; both the logical relation and attachment must fit.`),
    };
  }

  if (concept.section === 'kanji') {
    const kanji = KANJI[concept.lookup.value]![variant];
    const options = rotate([kanji.reading, ...kanji.distractors], kanji.reading, answer).map((value) => L(value, value, value));
    return {
      ...base, section: 'kanji_reading',
      question: L(`${concept.level} 「${kanji.phrase}」에서 「${concept.lookup.value}」의 읽기로 알맞은 것을 고르세요.`, `${concept.level}「${kanji.phrase}」の「${concept.lookup.value}」の読みを選んでください。`, `In the ${concept.level} compound 「${kanji.phrase}」, choose the reading of 「${concept.lookup.value}」.`),
      choices: options, answer_index: answer,
      explanation: L(`복합어 「${kanji.phrase}」에서 「${concept.lookup.value}」은/는 「${kanji.reading}」로 읽는다.`, `複合語「${kanji.phrase}」では「${concept.lookup.value}」を「${kanji.reading}」と読む。`, `In 「${kanji.phrase}」, 「${concept.lookup.value}」 is read 「${kanji.reading}」.`),
    };
  }

  const script = concept.lookup.value;
  const options = rotate(group.map((candidate) => candidate.title), concept.title, answer, variant);
  return {
    ...base, section: 'listening',
    question: variant === 0
      ? L(`${concept.level} 듣기 ${localIndex + 1}번 음성을 듣고 내용과 정확히 일치하는 문장을 고르세요.`, `${concept.level}聴解${localIndex + 1}番の音声を聞き、内容と正確に一致する文を選んでください。`, `Listen to ${concept.level} audio ${localIndex + 1} and choose the sentence that exactly matches it.`)
      : L(`${concept.level} 듣기 ${localIndex + 1}번 안내를 한 번 듣고 화자가 실제로 말한 문장을 고르세요.`, `${concept.level}聴解${localIndex + 1}番の案内を一度聞き、話者が実際に述べた文を選んでください。`, `Listen once to ${concept.level} announcement ${localIndex + 1} and choose the sentence actually spoken.`),
    choices: options, answer_index: answer, audio_script: script,
    explanation: L(`대본의 핵심 문장은 「${script}」이다. 다른 보기는 같은 수준이지만 내용이 서로 다르다.`, `台本の中心文は「${script}」である。ほかの選択肢は同じレベルでも内容が異なる。`, `The script states 「${script}」; the distractors are level-appropriate but convey different facts.`),
  };
}

function topikStimulus(concept: ConceptSpec, variant: 0 | 1): string {
  const topic = concept.title.ko.replace(/ 듣기$/u, '');
  const batch = concept.key.match(/-b(\d+)$/)?.[1] ?? '1';
  const place = ['주민센터','도서관','학교','문화센터'][Number(batch) - 1]!;
  if (concept.section === 'vocab') return TOPIK_VOCAB_CLUES[topic]![variant];
  if (concept.section === 'grammar') return `${place}에서 한 말입니다. ${TOPIK_GRAMMAR[topic]![variant].stem}`;
  if (concept.section === 'reading') return variant === 0
    ? `${place} 공지: ${topic} 관련 신청은 금요일 오후 여섯 시까지 받습니다. 필요한 서류가 빠지면 다음 주에 다시 제출해야 합니다.`
    : `${place} 안내: ${topic} 프로그램은 예약한 사람부터 참여합니다. 취소할 경우 다른 사람이 신청할 수 있도록 하루 전에 알려 주세요.`;
  if (concept.section === 'listening') return variant === 0
    ? `${place}에서 안내 말씀드립니다. ${topic} 일정은 비 때문에 오후 세 시로 바뀌었습니다. 참가자는 시작 십 분 전까지 안내 데스크로 와 주세요.`
    : `${place}에서 전화드렸습니다. ${topic} 자료를 오늘 보내려고 했는데 확인할 내용이 하나 남았습니다. 내일 오전까지 검토한 뒤 다시 연락드리겠습니다.`;
  return variant === 0
    ? `${place}에서 경험한 ${topic}에 관한 개선 의견을 두 문장으로 쓰세요.`
    : `${place}의 ${topic}이 가진 장점 한 가지와 보완할 점 한 가지를 근거와 함께 쓰세요.`;
}

function topikQuestion(concept: ConceptSpec, variant: 0 | 1): DraftItem {
  const group = TOPIK_CONCEPTS.filter((candidate) => candidate.level === concept.level && candidate.section === concept.section);
  const localIndex = group.findIndex((candidate) => candidate.key === concept.key);
  const answer = ((localIndex * 2 + variant) % 4) as 0 | 1 | 2 | 3;
  const stimulus = topikStimulus(concept, variant);
  const batch = Number(concept.key.match(/-b(\d+)$/)?.[1] ?? '1');
  const contextPlace = ['주민센터','도서관','학교','문화센터'][batch - 1]!;
  const contextPlaceJa = ['住民センター','図書館','学校','文化センター'][batch - 1]!;
  const contextPlaceEn = ['community center','library','school','cultural center'][batch - 1]!;
  const listeningTopic = concept.title.ko.replace(/ 듣기$/u, '');
  const listeningTopicTranslation = concept.section === 'listening' ? TOPIK_LISTENING_TOPICS[listeningTopic]! : { ja: '', en: '' };
  const listeningTopicJa = listeningTopicTranslation.ja;
  const listeningTopicEn = listeningTopicTranslation.en;
  const base = { id: `${concept.key}-q${variant + 1}`, concept_key: concept.key, track: concept.track, level: concept.level, section: concept.section, difficulty: difficulty(concept.level) } as const;

  if (concept.section === 'writing') {
    return {
      ...base,
      question: L(`다음 과제를 수행하세요. ${stimulus}`, `次の課題に答えてください。韓国語の課題：${stimulus}`, `Complete the following task. Korean prompt: ${stimulus}`),
      explanation: L('주제에서 벗어나지 않고 요구된 두 요소를 모두 포함해야 한다. 연결 표현과 높임 수준도 일관되게 유지한다.', '主題を外れず、求められた二つの要素を含める。接続表現と丁寧さも一貫させる。', 'Stay on topic, include both required elements, and keep connectors and register consistent.'),
      rubric: L('내용 충실성 2점, 조직 1점, 어휘·문법 정확성 2점. 외운 답이 아니라 제시된 상황에 맞게 쓴다.', '内容2点、構成1点、語彙・文法2点。暗記文ではなく提示された状況に合わせる。', 'Content 2, organization 1, vocabulary/grammar accuracy 2; respond to the given situation rather than reciting a memorized answer.'),
      sample: variant === 0
        ? L(`${concept.title.ko}을 이용해 본 경험이 있습니다. 안내가 더 구체적이면 처음 참여하는 사람도 쉽게 준비할 수 있습니다.`, `${concept.title.ko}을 이용해 본 경험이 있습니다. 안내가 더 구체적이면 처음 참여하는 사람도 쉽게 준비할 수 있습니다.`, `${concept.title.ko}을 이용해 본 경험이 있습니다. 안내가 더 구체적이면 처음 참여하는 사람도 쉽게 준비할 수 있습니다.`)
        : L(`${concept.title.ko}은 필요한 정보를 빠르게 알 수 있다는 장점이 있습니다. 다만 이용 시간이 다른 사람을 위해 변경 내용을 더 일찍 알려야 합니다.`, `${concept.title.ko}은 필요한 정보를 빠르게 알 수 있다는 장점이 있습니다. 다만 이용 시간이 다른 사람을 위해 변경 내용을 더 일찍 알려야 합니다.`, `${concept.title.ko}은 필요한 정보를 빠르게 알 수 있다는 장점이 있습니다. 다만 이용 시간이 다른 사람을 위해 변경 내용을 더 일찍 알려야 합니다.`),
    };
  }

  let correct = '';
  let distractors: string[] = [];
  if (concept.section === 'vocab') {
    correct = concept.title.ko;
    distractors = group.filter((candidate) => candidate.key !== concept.key).map((candidate) => candidate.title.ko).slice(0, 3);
  }
  if (concept.section === 'grammar') {
    const grammar = TOPIK_GRAMMAR[concept.title.ko]![variant];
    correct = grammar.correct;
    distractors = [...grammar.distractors];
  }
  if (concept.section === 'reading') correct = variant === 0 ? '금요일 오후 여섯 시까지 신청해야 한다' : '취소하면 하루 전에 알려야 한다';
  if (concept.section === 'listening') correct = variant === 0 ? '일정이 오후 세 시로 바뀌었다' : '내일 오전까지 검토한 뒤 연락한다';
  if (concept.section === 'reading') distractors = variant === 0 ? ['오늘 안에 서류 없이 신청한다','다음 달에 자동으로 접수된다','금요일 아침에 프로그램이 끝난다'] : ['예약하지 않아도 먼저 참여한다','취소 사실을 알릴 필요가 없다','프로그램은 오늘 폐지된다'];
  if (concept.section === 'listening') distractors = variant === 0 ? ['일정이 오전 아홉 시로 앞당겨졌다','참가자는 행사 뒤에 도착한다','비와 관계없이 일정이 취소되었다'] : ['오늘 검토를 모두 끝냈다','자료를 보내지 않기로 했다','다음 달에 처음 연락한다'];
  const choicesKo = rotate([correct, ...distractors], correct, answer);
  const choices = choicesKo.map((value) => L(value, value, value));
  const instruction = concept.section === 'reading' ? '글을 읽고 맞는 내용을 고르세요.' : concept.section === 'listening' ? '들은 내용과 맞는 것을 고르세요.' : '상황에 가장 알맞은 답을 고르세요.';
  const question = concept.section === 'listening'
    ? (variant === 0
      ? L(`${contextPlace}의 ${listeningTopic} 관련 음성을 듣고 일정에 관해 맞는 내용을 고르세요.`, `${contextPlaceJa}の${listeningTopicJa}に関する音声を聞き、日程について正しい内容を選んでください。`, `Listen to the ${listeningTopicEn} audio from the ${contextPlaceEn} and choose the correct schedule statement.`)
      : L(`${contextPlace}의 ${listeningTopic} 관련 전화를 듣고 화자가 다음에 할 일을 고르세요.`, `${contextPlaceJa}の${listeningTopicJa}に関する電話を聞き、話者が次にすることを選んでください。`, `Listen to the ${listeningTopicEn} call from the ${contextPlaceEn} and choose what the speaker will do next.`))
    : L(`${instruction}\n${stimulus}`, `次の韓国語を読み、最も適切な答えを選んでください。\n${stimulus}`, `Read the Korean stimulus and choose the best answer.\n${stimulus}`);
  return {
    ...base,
    question,
    choices, answer_index: answer,
    ...(concept.section === 'listening' ? { audio_script: stimulus } : {}),
    explanation: concept.section === 'grammar'
      ? L(`빈칸 앞말의 형태와 문장 관계에 맞는 표현은 ‘${correct}’이다. 다른 보기는 접속 또는 의미 관계가 맞지 않는다.`, `空欄前の形と文の関係に合う表現は「${correct}」である。他の選択肢は接続または意味関係が合わない。`, `“${correct}” fits both the preceding form and the sentence relation; the alternatives do not.`)
      : concept.section === 'listening'
        ? L(`음성에서 확인되는 답은 ‘${correct}’이다. 다른 보기는 시간이나 다음 행동을 다르게 바꾼다.`, `音声から確認できる答えは「${correct}」である。他の選択肢は時間や次の行動を変えている。`, `The audio supports “${correct}”; the distractors change the time or next action.`)
        : L(`제시문에서 확인할 수 있는 답은 ‘${correct}’이다. 다른 보기는 핵심 상황이나 조건과 맞지 않는다.`, `韓国語の提示文から確認できる答えは「${correct}」である。他の選択肢は中心状況や条件に合わない。`, `The Korean stimulus supports “${correct}”; the distractors do not fit its central situation or condition.`),
  };
}

export const ITEMS: DraftItem[] = [
  ...JLPT_CONCEPTS.flatMap((concept) => [jlptQuestion(concept, 0), jlptQuestion(concept, 1)]),
  ...TOPIK_CONCEPTS.flatMap((concept) => [topikQuestion(concept, 0), topikQuestion(concept, 1)]),
];
