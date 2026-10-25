import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from './constants.js';
import { esc, escJson } from './utils.js';

export const TOPIK_PRACTICE_TRACK = 'topik-ko' as const;
export const TOPIK_PRACTICE_BANK_VERSION = 'v1' as const;
export const TOPIK_PRACTICE_PARSER_VERSION = 'topik-practice-parser-v1';
export const TOPIK_PRACTICE_SOURCE_CODE = 'TOPIK-PRACTICE-V1' as const;
export const TOPIK_PRACTICE_SOURCE_PATH = path.join(REPO_ROOT, 'docs/07_topik/T7_topik_i_ii_practice_bank_v1.md');

type ExamLevel = 'TOPIK-I' | 'TOPIK-II';
type Section = 'listening' | 'writing' | 'reading';
type QuestionType = 'choice' | 'writing';

export interface TopikPracticeQuestion {
  id: string;
  examLevel: ExamLevel;
  section: Section;
  questionType: QuestionType;
  skill: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  promptKo: string;
  promptJa: string;
  promptEn: string;
  choices: string[];
  answerIndex: number | null;
  explanationKo: string;
  explanationJa: string;
  explanationEn: string;
  sampleAnswerKo: string | null;
  sampleAnswerJa: string | null;
  sampleAnswerEn: string | null;
  audioScriptKo: string | null;
  audioR2Key: string | null;
  sourceCode: typeof TOPIK_PRACTICE_SOURCE_CODE;
  authorReviewer: string;
  secondReviewer: string;
  reviewedAt: string;
}

const AUTHOR_REVIEWER = 'JLPT-TOPIK Study self-authored content review';
const SECOND_REVIEWER = 'JLPT-TOPIK Study Korean and Japanese-language QA';
const REVIEWED_AT = '2026-07-20';

function choice(input: Omit<TopikPracticeQuestion, 'questionType' | 'sampleAnswerKo' | 'sampleAnswerJa' | 'sampleAnswerEn' | 'audioR2Key' | 'sourceCode' | 'authorReviewer' | 'secondReviewer' | 'reviewedAt'>): TopikPracticeQuestion {
  return {
    ...input,
    questionType: 'choice',
    sampleAnswerKo: null,
    sampleAnswerJa: null,
    sampleAnswerEn: null,
    audioR2Key: null,
    sourceCode: TOPIK_PRACTICE_SOURCE_CODE,
    authorReviewer: AUTHOR_REVIEWER,
    secondReviewer: SECOND_REVIEWER,
    reviewedAt: REVIEWED_AT,
  };
}

function writing(input: Omit<TopikPracticeQuestion, 'questionType' | 'choices' | 'answerIndex' | 'audioScriptKo' | 'audioR2Key' | 'sourceCode' | 'authorReviewer' | 'secondReviewer' | 'reviewedAt'>): TopikPracticeQuestion {
  return {
    ...input,
    questionType: 'writing',
    choices: [],
    answerIndex: null,
    audioScriptKo: null,
    audioR2Key: null,
    sourceCode: TOPIK_PRACTICE_SOURCE_CODE,
    authorReviewer: AUTHOR_REVIEWER,
    secondReviewer: SECOND_REVIEWER,
    reviewedAt: REVIEWED_AT,
  };
}

/**
 * Original instructional items. The exam structure is informed by the public
 * NIIED format, but no official question, answer, transcript, or audio is used.
 */
export const TOPIK_PRACTICE_QUESTIONS: readonly TopikPracticeQuestion[] = [
  choice({
    id: 'topik-practice-i-l-001', examLevel: 'TOPIK-I', section: 'listening', skill: 'greeting', difficulty: 1,
    promptKo: '잘 듣고 남자가 하는 일을 고르십시오.', promptJa: 'よく聞いて、男性の職業を選んでください。', promptEn: "Listen and choose the man's job.",
    audioScriptKo: '저는 병원에서 일해요. 환자를 도와드려요.', choices: ['간호사', '학생', '요리사', '기사'], answerIndex: 0,
    explanationKo: '병원에서 환자를 돕는다고 했으므로 간호사입니다.', explanationJa: '病院で患者を助けると言っているので、看護師です。', explanationEn: 'He works in a hospital and helps patients, so he is a nurse.',
  }),
  choice({
    id: 'topik-practice-i-l-002', examLevel: 'TOPIK-I', section: 'listening', skill: 'schedule', difficulty: 1,
    promptKo: '두 사람은 언제 영화를 봅니까?', promptJa: '二人はいつ映画を見ますか。', promptEn: 'When will the two people watch a movie?',
    audioScriptKo: '오늘은 바빠요. 토요일 저녁에 영화 볼까요? 좋아요.', choices: ['토요일 저녁', '오늘 저녁', '금요일 아침', '일요일 아침'], answerIndex: 0,
    explanationKo: '오늘은 바쁘고 토요일 저녁에 보자고 했습니다.', explanationJa: '今日は忙しいため、土曜日の夜に見ようと話しています。', explanationEn: 'They are busy today and agree on Saturday evening.',
  }),
  choice({
    id: 'topik-practice-i-l-003', examLevel: 'TOPIK-I', section: 'listening', skill: 'location', difficulty: 1,
    promptKo: '여자는 어디에 있습니까?', promptJa: '女性はどこにいますか。', promptEn: 'Where is the woman?',
    audioScriptKo: '지금 역 앞 빵집에 있어요. 빨리 오세요.', choices: ['역 앞 빵집', '학교 앞 은행', '집 근처 공원', '회사 식당'], answerIndex: 0,
    explanationKo: '여자는 역 앞 빵집에 있다고 말했습니다.', explanationJa: '女性は駅前のパン屋にいると言っています。', explanationEn: 'She says she is at the bakery in front of the station.',
  }),
  choice({
    id: 'topik-practice-i-l-004', examLevel: 'TOPIK-I', section: 'listening', skill: 'quantity', difficulty: 2,
    promptKo: '여자는 사과를 몇 개 삽니까?', promptJa: '女性はりんごをいくつ買いますか。', promptEn: 'How many apples does the woman buy?',
    audioScriptKo: '사과 다섯 개하고 바나나 두 개 주세요.', choices: ['다섯 개', '두 개', '세 개', '일곱 개'], answerIndex: 0,
    explanationKo: '사과는 다섯 개, 바나나는 두 개를 주문했습니다.', explanationJa: 'りんごは5個、バナナは2本と注文しています。', explanationEn: 'She orders five apples and two bananas.',
  }),
  choice({
    id: 'topik-practice-i-l-005', examLevel: 'TOPIK-I', section: 'listening', skill: 'reason', difficulty: 2,
    promptKo: '남자는 왜 택시를 탑니까?', promptJa: '男性はなぜタクシーに乗りますか。', promptEn: 'Why does the man take a taxi?',
    audioScriptKo: '버스가 아직 안 왔어요. 약속 시간에 늦을 것 같아서 택시를 탈게요.', choices: ['약속 시간에 늦을 것 같아서', '비가 많이 와서', '짐이 무거워서', '길을 몰라서'], answerIndex: 0,
    explanationKo: '버스가 오지 않아 약속 시간에 늦을까 봐 택시를 탑니다.', explanationJa: 'バスが来ず、約束の時間に遅れそうなのでタクシーに乗ります。', explanationEn: 'The bus has not arrived and he may be late for an appointment.',
  }),
  choice({
    id: 'topik-practice-i-l-006', examLevel: 'TOPIK-I', section: 'listening', skill: 'notice', difficulty: 3,
    promptKo: '이 안내의 내용과 같은 것을 고르십시오.', promptJa: 'この案内と同じ内容を選んでください。', promptEn: 'Choose the statement that matches the announcement.',
    audioScriptKo: '안내 말씀 드립니다. 오늘 수영장은 오후 네 시부터 이용할 수 있습니다.', choices: ['수영장은 오후 네 시부터 엽니다', '수영장은 오늘 쉽니다', '수영장은 오전 네 시에 엽니다', '수영장은 밤에만 엽니다'], answerIndex: 0,
    explanationKo: '오후 네 시부터 이용할 수 있다고 안내했습니다.', explanationJa: 'プールは午後4時から利用できるという案内です。', explanationEn: 'The pool can be used from 4 p.m. today.',
  }),
  choice({
    id: 'topik-practice-i-r-001', examLevel: 'TOPIK-I', section: 'reading', skill: 'sign', difficulty: 1,
    promptKo: '표지판: 주차 금지\n\n무엇을 하면 안 됩니까?', promptJa: '標識：駐車禁止\n\n何をしてはいけませんか。', promptEn: 'Sign: No parking. What must you not do?',
    audioScriptKo: null, choices: ['차를 세웁니다', '사진을 찍습니다', '문을 엽니다', '표를 삽니다'], answerIndex: 0,
    explanationKo: '주차 금지는 차를 세우면 안 된다는 뜻입니다.', explanationJa: '주차 금지は、車を停めてはいけないという意味です。', explanationEn: '주차 금지 means that parking a car is prohibited.',
  }),
  choice({
    id: 'topik-practice-i-r-002', examLevel: 'TOPIK-I', section: 'reading', skill: 'particle', difficulty: 1,
    promptKo: '저는 매일 아침에 커피를 ___.', promptJa: '저는 매일 아침에 커피를 ___ . に入るものを選んでください。', promptEn: 'Choose the natural completion: 저는 매일 아침에 커피를 ___.',
    audioScriptKo: null, choices: ['마셔요', '마시고', '마시다', '마실'], answerIndex: 0,
    explanationKo: '매일 하는 습관을 공손하게 말하면 마셔요가 자연스럽습니다.', explanationJa: '毎朝する習慣を丁寧に述べるので마셔요が自然です。', explanationEn: '마셔요 is the natural polite present-tense form for a daily habit.',
  }),
  choice({
    id: 'topik-practice-i-r-003', examLevel: 'TOPIK-I', section: 'reading', skill: 'message', difficulty: 2,
    promptKo: '메시지: 회의가 끝난 후에 1층 카페에서 만나요.\n\n두 사람은 어디에서 만납니까?', promptJa: 'メッセージを読んでください。二人はどこで会いますか。', promptEn: 'Read the message. Where will the two people meet?',
    audioScriptKo: null, choices: ['1층 카페', '회의실', '회사 입구', '도서관'], answerIndex: 0,
    explanationKo: '회의가 끝난 후 1층 카페에서 만나자고 했습니다.', explanationJa: '会議の後、1階のカフェで会うと言っています。', explanationEn: 'The message says to meet at the first-floor cafe after the meeting.',
  }),
  choice({
    id: 'topik-practice-i-r-004', examLevel: 'TOPIK-I', section: 'reading', skill: 'sequence', difficulty: 2,
    promptKo: '요리 방법: 먼저 양파를 썹니다. 그다음 기름에 볶습니다.\n\n가장 먼저 하는 일은 무엇입니까?', promptJa: '料理の手順を読んでください。最初にすることは何ですか。', promptEn: 'Read the cooking steps. What happens first?',
    audioScriptKo: null, choices: ['양파를 썹니다', '기름에 볶습니다', '접시에 담습니다', '물을 끓입니다'], answerIndex: 0,
    explanationKo: '먼저 다음에 양파를 썬다고 했습니다.', explanationJa: '먼저の後に玉ねぎを切ると書かれています。', explanationEn: 'The word 먼저 introduces cutting the onion as the first step.',
  }),
  choice({
    id: 'topik-practice-i-r-005', examLevel: 'TOPIK-I', section: 'reading', skill: 'contrast', difficulty: 2,
    promptKo: '저는 매운 음식을 좋아하지만 동생은 잘 못 먹어요.\n\n동생에 대한 설명으로 맞는 것은 무엇입니까?', promptJa: '文を読んでください。弟（妹）について正しい説明はどれですか。', promptEn: 'Read the sentence. Which statement about the sibling is correct?',
    audioScriptKo: null, choices: ['매운 음식을 잘 못 먹습니다', '매운 음식을 아주 좋아합니다', '음식을 만들지 않습니다', '한국 음식을 모릅니다'], answerIndex: 0,
    explanationKo: '하지만 뒤에서 동생은 매운 음식을 잘 못 먹는다고 했습니다.', explanationJa: '하지만の後で、きょうだいは辛い料理をあまり食べられないと述べています。', explanationEn: 'After 하지만, the sentence says the sibling cannot eat spicy food well.',
  }),
  choice({
    id: 'topik-practice-i-r-006', examLevel: 'TOPIK-I', section: 'reading', skill: 'short-notice', difficulty: 3,
    promptKo: '공지: 내일 오전에는 인터넷 점검이 있습니다. 인터넷은 오후 1시부터 사용할 수 있습니다.\n\n인터넷은 언제부터 사용할 수 있습니까?', promptJa: 'お知らせを読んでください。インターネットはいつから使えますか。', promptEn: 'Read the notice. From when can the internet be used?',
    audioScriptKo: null, choices: ['오후 1시부터', '내일 오전부터', '오늘 오후부터', '밤 1시부터'], answerIndex: 0,
    explanationKo: '점검 후 오후 1시부터 사용할 수 있습니다.', explanationJa: '点検の後、午後1時から利用できます。', explanationEn: 'The notice states that it can be used from 1 p.m. after maintenance.',
  }),
  choice({
    id: 'topik-practice-ii-l-001', examLevel: 'TOPIK-II', section: 'listening', skill: 'workplace-inference', difficulty: 3,
    promptKo: '잘 듣고 남자의 의도를 고르십시오.', promptJa: 'よく聞いて、男性の意図を選んでください。', promptEn: "Listen and choose the man's intention.",
    audioScriptKo: '보고서 초안을 오늘 안에 보내 주실 수 있을까요? 내일 회의에서 함께 검토하고 싶습니다.', choices: ['회의 전에 초안을 검토하고 싶다', '회의를 취소하고 싶다', '보고서를 새로 쓰고 싶다', '오늘 회의를 시작하고 싶다'], answerIndex: 0,
    explanationKo: '내일 회의에서 함께 검토하려고 오늘 안에 초안을 요청했습니다.', explanationJa: '明日の会議で一緒に確認したいので、今日中に下書きを送ってほしいと言っています。', explanationEn: 'He requests the draft today so it can be reviewed together at tomorrow’s meeting.',
  }),
  choice({
    id: 'topik-practice-ii-l-002', examLevel: 'TOPIK-II', section: 'listening', skill: 'announcement-detail', difficulty: 3,
    promptKo: '안내를 듣고 맞는 내용을 고르십시오.', promptJa: '案内を聞いて、正しい内容を選んでください。', promptEn: 'Listen to the announcement and choose the correct statement.',
    audioScriptKo: '이번 주 토요일 문화 강좌는 신청자가 많아서 큰 강당으로 장소를 옮깁니다. 시작 시간은 오후 두 시로 같습니다.', choices: ['장소만 바뀌고 시간은 같다', '시간만 바뀌고 장소는 같다', '강좌가 취소되었다', '신청자가 적어서 장소를 옮긴다'], answerIndex: 0,
    explanationKo: '신청자가 많아 장소만 큰 강당으로 옮기고 시작 시간은 같습니다.', explanationJa: '申込者が多いため会場だけ大講堂に変わり、開始時刻は同じです。', explanationEn: 'Only the venue changes because there are many applicants; the time stays the same.',
  }),
  choice({
    id: 'topik-practice-ii-l-003', examLevel: 'TOPIK-II', section: 'listening', skill: 'opinion', difficulty: 4,
    promptKo: '여자의 생각으로 알맞은 것을 고르십시오.', promptJa: '女性の考えとして適切なものを選んでください。', promptEn: "Choose the statement that matches the woman's opinion.",
    audioScriptKo: '온라인 수업은 장소에 상관없이 들을 수 있어서 편리해요. 다만 질문을 바로 하기 어려울 때가 있어요.', choices: ['온라인 수업은 편리하지만 질문하기 어려울 수 있다', '온라인 수업은 장소가 정해져 있다', '온라인 수업은 질문만 할 수 있다', '온라인 수업은 필요 없다'], answerIndex: 0,
    explanationKo: '편리하다는 장점과 즉시 질문하기 어렵다는 단점을 함께 말했습니다.', explanationJa: '便利だという長所と、すぐ質問しにくいという短所の両方を述べています。', explanationEn: 'She names the convenience of online classes and the difficulty of asking questions immediately.',
  }),
  choice({
    id: 'topik-practice-ii-l-004', examLevel: 'TOPIK-II', section: 'listening', skill: 'cause-effect', difficulty: 4,
    promptKo: '남자는 왜 계획을 바꿉니까?', promptJa: '男性はなぜ計画を変えますか。', promptEn: 'Why does the man change the plan?',
    audioScriptKo: '원래 기차를 타고 갈 생각이었는데, 폭설 때문에 운행이 중단되었대요. 그래서 버스를 알아보고 있어요.', choices: ['기차 운행이 중단되어서', '버스가 너무 늦어서', '표를 잃어버려서', '친구가 오지 않아서'], answerIndex: 0,
    explanationKo: '폭설 때문에 기차 운행이 중단되어 버스를 알아봅니다.', explanationJa: '大雪で列車の運行が中止になったため、バスを調べています。', explanationEn: 'Heavy snow stopped train service, so he is looking for a bus.',
  }),
  choice({
    id: 'topik-practice-ii-l-005', examLevel: 'TOPIK-II', section: 'listening', skill: 'recommendation', difficulty: 4,
    promptKo: '여자가 권하는 것은 무엇입니까?', promptJa: '女性が勧めていることは何ですか。', promptEn: 'What does the woman recommend?',
    audioScriptKo: '처음에는 짧은 뉴스부터 들어 보세요. 모르는 단어를 모두 찾기보다 핵심 내용을 먼저 이해하는 연습이 더 중요해요.', choices: ['짧은 뉴스의 핵심을 먼저 이해한다', '모르는 단어를 모두 외운다', '긴 소설만 읽는다', '뉴스를 듣지 않는다'], answerIndex: 0,
    explanationKo: '모든 단어보다 짧은 뉴스의 핵심 내용을 먼저 이해하라고 권합니다.', explanationJa: '知らない単語をすべて調べるより、短いニュースの要点を先に理解するよう勧めています。', explanationEn: 'She recommends understanding the key point of short news before looking up every word.',
  }),
  choice({
    id: 'topik-practice-ii-l-006', examLevel: 'TOPIK-II', section: 'listening', skill: 'sequence', difficulty: 5,
    promptKo: '다음에 할 일은 무엇입니까?', promptJa: '次にすることは何ですか。', promptEn: 'What will happen next?',
    audioScriptKo: '자료를 팀원들에게 먼저 공유했습니다. 의견을 받은 뒤에 수정해서 최종본을 제출할 예정입니다.', choices: ['의견을 받은 뒤 수정한다', '자료를 처음 공유한다', '최종본을 바로 제출한다', '회의를 취소한다'], answerIndex: 0,
    explanationKo: '공유는 이미 했고, 다음에는 의견을 받은 뒤 수정합니다.', explanationJa: '共有はすでに済んでおり、次は意見を受けて修正します。', explanationEn: 'The materials have already been shared; next, feedback will be collected and revisions made.',
  }),
  writing({
    id: 'topik-practice-ii-w-001', examLevel: 'TOPIK-II', section: 'writing', skill: 'formal-request', difficulty: 3,
    promptKo: '친구에게 다음 주에 만날 수 없는 이유와 다른 약속 시간을 2~3문장으로 쓰십시오.', promptJa: '友人に、来週会えない理由と別の約束の時間を2〜3文で書いてください。', promptEn: 'Write 2–3 sentences explaining why you cannot meet next week and proposing another time.',
    explanationKo: '이유, 사과 또는 배려 표현, 새로운 시간을 모두 포함했는지 확인합니다.', explanationJa: '理由、謝罪または配慮の表現、新しい時間の提案がすべて含まれているか確認します。', explanationEn: 'Check that the response includes a reason, a considerate expression, and a new proposed time.',
    sampleAnswerKo: '다음 주에는 회사 일이 많아서 만나기 어려울 것 같아요. 미안하지만 다다음 주 토요일 오후는 어떠세요?', sampleAnswerJa: '例：来週は会社の仕事が多くて会うのが難しそうです。申し訳ないのですが、再来週の土曜日午後はいかがですか。', sampleAnswerEn: 'Example: I may have difficulty meeting next week because of work. I am sorry; how about Saturday afternoon the following week?',
  }),
  writing({
    id: 'topik-practice-ii-w-002', examLevel: 'TOPIK-II', section: 'writing', skill: 'opinion', difficulty: 4,
    promptKo: '온라인으로 공부하는 것의 장점 한 가지와 주의할 점 한 가지를 3~4문장으로 쓰십시오.', promptJa: 'オンラインで勉強することの利点を一つ、注意点を一つ、3〜4文で書いてください。', promptEn: 'Write 3–4 sentences with one benefit and one caution about studying online.',
    explanationKo: '한 가지 장점과 한 가지 주의점을 근거와 함께 연결했는지 확인합니다.', explanationJa: '利点と注意点を一つずつ、理由とともに自然につないでいるか確認します。', explanationEn: 'Check that one benefit and one caution are connected clearly with supporting reasons.',
    sampleAnswerKo: '온라인 수업은 원하는 장소에서 들을 수 있어서 편리합니다. 하지만 혼자 공부하면 집중하기 어려울 수 있습니다. 그래서 매일 정해진 시간에 공부하려고 합니다.', sampleAnswerJa: '例：オンライン授業は好きな場所で受けられるので便利です。ただし一人で勉強すると集中しにくいことがあります。そのため毎日決まった時間に勉強しようと思います。', sampleAnswerEn: 'Example: Online classes are convenient because you can take them anywhere. However, it can be difficult to focus alone, so I plan to study at a fixed time each day.',
  }),
  writing({
    id: 'topik-practice-ii-w-003', examLevel: 'TOPIK-II', section: 'writing', skill: 'information-summary', difficulty: 4,
    promptKo: '다음 정보를 바탕으로 2문장 안내문을 쓰십시오: 장소는 3층 강의실, 시간은 금요일 오후 2시, 준비물은 노트북.', promptJa: '次の情報をもとに、2文のお知らせを書いてください：場所は3階講義室、時間は金曜日午後2時、持ち物はノートパソコン。', promptEn: 'Write a two-sentence notice using this information: third-floor classroom, Friday 2 p.m., bring a laptop.',
    explanationKo: '장소, 시간, 준비물을 빠뜨리지 않고 공손한 안내문으로 썼는지 확인합니다.', explanationJa: '場所、時間、持ち物を漏らさず、丁寧な案内文にできているか確認します。', explanationEn: 'Check that the location, time, and required item are all present in a polite notice.',
    sampleAnswerKo: '수업은 금요일 오후 2시에 3층 강의실에서 진행됩니다. 노트북을 꼭 가져와 주세요.', sampleAnswerJa: '例：授業は金曜日午後2時に3階講義室で行われます。ノートパソコンを必ずお持ちください。', sampleAnswerEn: 'Example: The class will be held in the third-floor classroom at 2 p.m. on Friday. Please bring a laptop.',
  }),
  writing({
    id: 'topik-practice-ii-w-004', examLevel: 'TOPIK-II', section: 'writing', skill: 'comparison', difficulty: 5,
    promptKo: '대중교통과 자전거 중 하나를 선택해 출근할 때의 장점과 단점을 3~4문장으로 쓰십시오.', promptJa: '公共交通機関と自転車のうち一つを選び、通勤する際の利点と欠点を3〜4文で書いてください。', promptEn: 'Choose public transport or a bicycle and write 3–4 sentences about its advantages and disadvantages for commuting.',
    explanationKo: '선택한 수단을 분명히 밝히고 장점과 단점을 균형 있게 썼는지 확인합니다.', explanationJa: '選んだ手段を明確にし、長所と短所をバランスよく書けているか確認します。', explanationEn: 'Check that the chosen method is clear and that both an advantage and disadvantage are explained.',
    sampleAnswerKo: '저는 대중교통으로 출근하는 것이 좋습니다. 운전할 필요가 없어서 피곤하지 않기 때문입니다. 하지만 출근 시간에는 사람이 많아서 불편할 수 있습니다.', sampleAnswerJa: '例：私は公共交通機関で通勤するのがよいと思います。運転する必要がなく疲れにくいからです。ただし通勤時間帯は人が多く、不便なことがあります。', sampleAnswerEn: 'Example: I prefer commuting by public transport because I do not need to drive. However, it can be uncomfortable because it is crowded during commuting hours.',
  }),
  choice({
    id: 'topik-practice-ii-r-001', examLevel: 'TOPIK-II', section: 'reading', skill: 'connector', difficulty: 3,
    promptKo: '비가 많이 왔습니다. ___ 행사는 예정대로 진행되었습니다.', promptJa: '비가 많이 왔습니다. ___ 행사는 예정대로 진행되었습니다. に入る接続表現を選んでください。', promptEn: 'Choose the connector: It rained heavily. ___, the event proceeded as scheduled.',
    audioScriptKo: null, choices: ['하지만', '그래서', '그러면', '그리고'], answerIndex: 0,
    explanationKo: '비가 왔지만 행사는 진행되었다는 대조이므로 하지만이 맞습니다.', explanationJa: '雨が降ったにもかかわらずイベントは行われたという対比なので하지만が適切です。', explanationEn: '하지만 expresses the contrast between heavy rain and the event proceeding.',
  }),
  choice({
    id: 'topik-practice-ii-r-002', examLevel: 'TOPIK-II', section: 'reading', skill: 'notice-purpose', difficulty: 3,
    promptKo: '공지: 사내 시스템 점검으로 오늘 밤 11시부터 자정까지 일부 서비스 이용이 제한됩니다.\n\n이 공지의 목적은 무엇입니까?', promptJa: 'お知らせを読んでください。このお知らせの目的は何ですか。', promptEn: 'Read the notice. What is its purpose?',
    audioScriptKo: null, choices: ['서비스 이용 제한을 알리기 위해', '새 서비스를 홍보하기 위해', '직원을 모집하기 위해', '회의 시간을 바꾸기 위해'], answerIndex: 0,
    explanationKo: '시스템 점검 시간 동안 일부 서비스를 이용할 수 없다는 안내입니다.', explanationJa: 'システム点検中に一部サービスが利用できないことを知らせる案内です。', explanationEn: 'The notice informs users that some services will be limited during system maintenance.',
  }),
  choice({
    id: 'topik-practice-ii-r-003', examLevel: 'TOPIK-II', section: 'reading', skill: 'main-idea', difficulty: 4,
    promptKo: '많은 사람은 계획을 크게 세울수록 더 잘 실천할 수 있다고 생각한다. 그러나 너무 큰 목표는 시작을 어렵게 만들 수 있다. 매일 할 수 있는 작은 행동부터 정하는 것이 꾸준함에 도움이 된다.\n\n글의 중심 생각은 무엇입니까?', promptJa: '文章を読んでください。中心となる考えは何ですか。', promptEn: 'Read the passage. What is the main idea?',
    audioScriptKo: null, choices: ['작은 행동부터 시작하는 것이 꾸준함에 도움이 된다', '목표는 클수록 좋다', '계획은 세우지 않는 것이 좋다', '매일 다른 목표를 정해야 한다'], answerIndex: 0,
    explanationKo: '큰 목표의 어려움을 말한 뒤 작은 행동부터 시작하라고 권합니다.', explanationJa: '大きすぎる目標の難しさを述べたうえで、小さな行動から始めることを勧めています。', explanationEn: 'The passage recommends starting with small actions to maintain consistency.',
  }),
  choice({
    id: 'topik-practice-ii-r-004', examLevel: 'TOPIK-II', section: 'reading', skill: 'detail', difficulty: 4,
    promptKo: '메일: 다음 달부터 도서 대출 기간이 2주에서 3주로 늘어납니다. 다만 예약이 많은 책은 기존과 같이 2주만 대출할 수 있습니다.\n\n예약이 많은 책은 얼마나 빌릴 수 있습니까?', promptJa: 'メールを読んでください。予約の多い本はどのくらい借りられますか。', promptEn: 'Read the email. How long can highly requested books be borrowed?',
    audioScriptKo: null, choices: ['2주', '3주', '1주', '한 달'], answerIndex: 0,
    explanationKo: '예약이 많은 책은 기존과 같이 2주라고 했습니다.', explanationJa: '予約が多い本は従来どおり2週間と書かれています。', explanationEn: 'The email says highly requested books remain limited to two weeks.',
  }),
  choice({
    id: 'topik-practice-ii-r-005', examLevel: 'TOPIK-II', section: 'reading', skill: 'inference', difficulty: 5,
    promptKo: '민지 씨는 발표 자료를 여러 번 고쳤지만 여전히 자신이 없었다. 그래서 동료에게 미리 보여 주고 의견을 들은 뒤, 중요한 부분을 더 간단하게 정리했다.\n\n민지 씨가 마지막에 한 일은 무엇입니까?', promptJa: '文章を読んでください。ミンジさんが最後にしたことは何ですか。', promptEn: 'Read the passage. What did Minji do last?',
    audioScriptKo: null, choices: ['중요한 부분을 더 간단하게 정리했다', '발표 자료를 처음 만들었다', '동료에게 자료를 보내지 않았다', '발표를 취소했다'], answerIndex: 0,
    explanationKo: '동료 의견을 들은 뒤 중요한 부분을 더 간단하게 정리했습니다.', explanationJa: '同僚の意見を聞いた後、重要な部分をより簡潔にまとめました。', explanationEn: 'After receiving feedback, she simplified the important parts.',
  }),
  choice({
    id: 'topik-practice-ii-r-006', examLevel: 'TOPIK-II', section: 'reading', skill: 'author-attitude', difficulty: 5,
    promptKo: '새로운 기술은 일을 빠르게 처리하게 해 주지만, 모든 판단을 기술에 맡길 수는 없다. 기술이 제시한 결과를 이해하고 책임 있게 선택하는 태도도 필요하다.\n\n글쓴이의 태도로 알맞은 것은 무엇입니까?', promptJa: '文章を読んでください。筆者の態度として適切なものはどれですか。', promptEn: "Read the passage. Which statement matches the writer's attitude?",
    audioScriptKo: null, choices: ['기술을 활용하되 사람의 판단도 필요하다', '기술은 사용하면 안 된다', '모든 판단은 기술에 맡겨야 한다', '기술은 일을 느리게 한다'], answerIndex: 0,
    explanationKo: '기술의 장점은 인정하지만 책임 있는 사람의 판단도 필요하다고 봅니다.', explanationJa: '技術の利点は認めつつも、責任ある人の判断も必要だと考えています。', explanationEn: 'The writer values technology but says responsible human judgment remains necessary.',
  }),
];

const EXAM_LEVELS = [
  { examLevel: 'TOPIK-I', sortOrder: 1, labelEn: 'TOPIK I (Levels 1-2)', labelKo: 'TOPIK I (1~2급)', sections: ['listening', 'reading'] },
  { examLevel: 'TOPIK-II', sortOrder: 2, labelEn: 'TOPIK II (Levels 3-6)', labelKo: 'TOPIK II (3~6급)', sections: ['listening', 'writing', 'reading'] },
] as const;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function validateTopikPracticeBank(questions = TOPIK_PRACTICE_QUESTIONS): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const prompts = new Set<string>();
  const coverage = new Map<string, number>();

  for (const item of questions) {
    if (!ids.add(item.id)) errors.push(`duplicate id: ${item.id}`);
    const promptKey = `${item.examLevel}:${item.section}:${item.promptKo.replace(/\s+/gu, ' ').trim()}`;
    if (!prompts.add(promptKey)) errors.push(`duplicate prompt: ${item.id}`);
    coverage.set(`${item.examLevel}:${item.section}`, (coverage.get(`${item.examLevel}:${item.section}`) ?? 0) + 1);
    const required = [item.promptKo, item.promptJa, item.promptEn, item.explanationKo, item.explanationJa, item.explanationEn, item.sourceCode, item.authorReviewer, item.secondReviewer];
    if (required.some((value) => value.trim().length === 0)) errors.push(`blank required field: ${item.id}`);
    if (item.authorReviewer === item.secondReviewer) errors.push(`review roles must differ: ${item.id}`);
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(item.reviewedAt)) errors.push(`invalid reviewed date: ${item.id}`);
    if (item.questionType === 'choice') {
      if (item.choices.length !== 4 || new Set(item.choices.map((choice) => choice.trim())).size !== 4) errors.push(`invalid choices: ${item.id}`);
      if (!Number.isInteger(item.answerIndex) || item.answerIndex === null || item.answerIndex < 0 || item.answerIndex >= item.choices.length) errors.push(`invalid answer index: ${item.id}`);
      if (item.section === 'listening' && !item.audioScriptKo?.trim()) errors.push(`missing listening script: ${item.id}`);
    } else {
      if (item.choices.length !== 0 || item.answerIndex !== null) errors.push(`invalid writing answer fields: ${item.id}`);
      if (!item.sampleAnswerKo?.trim() || !item.sampleAnswerJa?.trim() || !item.sampleAnswerEn?.trim()) errors.push(`missing writing sample: ${item.id}`);
    }
  }

  for (const [key, minimum] of [
    ['TOPIK-I:listening', 6], ['TOPIK-I:reading', 6],
    ['TOPIK-II:listening', 6], ['TOPIK-II:writing', 4], ['TOPIK-II:reading', 6],
  ] as const) {
    if ((coverage.get(key) ?? 0) < minimum) errors.push(`incomplete coverage ${key}`);
  }
  return errors;
}

export function buildTopikPracticeSeedPlan() {
  const errors = validateTopikPracticeBank();
  if (errors.length > 0) throw new Error(`TOPIK practice bank validation failed: ${errors.join('; ')}`);

  const documentChecksum = sha256(fs.readFileSync(TOPIK_PRACTICE_SOURCE_PATH, 'utf8'));
  const questionChecksum = sha256(JSON.stringify(TOPIK_PRACTICE_QUESTIONS));
  const sourceChecksum = sha256(`${documentChecksum}:${questionChecksum}`);
  const provenance = {
    origin: { name: 'JLPT-TOPIK Study self-authored TOPIK I/II practice content', url: 'https://github.com/kordokrip/JLPT/blob/main/docs/07_topik/T7_topik_i_ii_practice_bank_v1.md' },
    formatReference: { name: 'NIIED/Study in Korea TOPIK structure reference', url: 'https://www.studyinkorea.go.kr/eng/plan/examAndKoreanStudy.do' },
    license: { id: 'LicenseRef-nihongo-n3-topik-original', name: 'Repository self-authored learning content', url: 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#topik-자체-저작-콘텐츠' },
    authorReviewer: AUTHOR_REVIEWER,
    secondReviewer: SECOND_REVIEWER,
    reviewedAt: REVIEWED_AT,
    restrictions: 'No official TOPIK questions, answer keys, listening audio, or copyrighted preparation material is copied or redistributed.',
  };
  const manifestCore = {
    schemaVersion: 1,
    learningTrack: TOPIK_PRACTICE_TRACK,
    bankVersion: TOPIK_PRACTICE_BANK_VERSION,
    parserVersion: TOPIK_PRACTICE_PARSER_VERSION,
    source: { code: TOPIK_PRACTICE_SOURCE_CODE, title: 'Self-authored TOPIK I/II practice bank V1', filePath: 'docs/07_topik/T7_topik_i_ii_practice_bank_v1.md', sourceVersion: REVIEWED_AT, sourceChecksum, provenance },
    examLevels: EXAM_LEVELS,
    questions: { expectedRows: TOPIK_PRACTICE_QUESTIONS.length, sha256: questionChecksum },
  } as const;
  const manifestSha256 = sha256(JSON.stringify(manifestCore));
  const contentVersion = `topik-practice-v1-${manifestSha256.slice(0, 12)}`;
  const seedRunId = `topik-practice-${manifestSha256.slice(0, 20)}`;
  const provenanceJson = JSON.stringify(provenance);

  const statements = [
    [
      'INSERT INTO `track_content_sources` (`learning_track`,`source_code`,`title`,`file_path`,`source_version`,`provenance_json`)',
      `VALUES (${esc(TOPIK_PRACTICE_TRACK)}, ${esc(TOPIK_PRACTICE_SOURCE_CODE)}, ${esc(manifestCore.source.title)}, ${esc(manifestCore.source.filePath)}, ${esc(REVIEWED_AT)}, ${esc(provenanceJson)})`,
      'ON CONFLICT(`learning_track`,`source_code`) DO UPDATE SET `title`=excluded.`title`,`file_path`=excluded.`file_path`,`source_version`=excluded.`source_version`,`provenance_json`=excluded.`provenance_json`,`updated_at`=unixepoch();',
    ].join('\n'),
    ...EXAM_LEVELS.map((level) => [
      'INSERT INTO `track_exam_levels` (`learning_track`,`exam_level`,`sort_order`,`label_en`,`label_ko`,`sections_json`)',
      `VALUES (${esc(TOPIK_PRACTICE_TRACK)}, ${esc(level.examLevel)}, ${level.sortOrder}, ${esc(level.labelEn)}, ${esc(level.labelKo)}, ${escJson([...level.sections])})`,
      'ON CONFLICT(`learning_track`,`exam_level`) DO UPDATE SET `sort_order`=excluded.`sort_order`,`label_en`=excluded.`label_en`,`label_ko`=excluded.`label_ko`,`sections_json`=excluded.`sections_json`,`updated_at`=unixepoch();',
    ].join('\n')),
    `INSERT INTO \`track_content_seed_runs\` (\`id\`,\`learning_track\`,\`content_version\`,\`parser_version\`,\`manifest_sha256\`) VALUES (${esc(seedRunId)}, ${esc(TOPIK_PRACTICE_TRACK)}, ${esc(contentVersion)}, ${esc(TOPIK_PRACTICE_PARSER_VERSION)}, ${esc(manifestSha256)}) ON CONFLICT(\`learning_track\`,\`content_version\`) DO UPDATE SET \`parser_version\`=excluded.\`parser_version\`,\`manifest_sha256\`=excluded.\`manifest_sha256\`;`,
    `INSERT INTO \`track_content_seed_sources\` (\`seed_run_id\`,\`learning_track\`,\`source_code\`,\`source_checksum\`,\`parser_version\`,\`provenance_json\`) VALUES (${esc(seedRunId)}, ${esc(TOPIK_PRACTICE_TRACK)}, ${esc(TOPIK_PRACTICE_SOURCE_CODE)}, ${esc(sourceChecksum)}, ${esc(TOPIK_PRACTICE_PARSER_VERSION)}, ${esc(provenanceJson)}) ON CONFLICT(\`seed_run_id\`,\`source_code\`) DO UPDATE SET \`source_checksum\`=excluded.\`source_checksum\`,\`parser_version\`=excluded.\`parser_version\`,\`provenance_json\`=excluded.\`provenance_json\`;`,
    ...TOPIK_PRACTICE_QUESTIONS.map((item) => [
      'INSERT INTO `topik_practice_questions` (`id`,`learning_track`,`exam_level`,`section`,`question_type`,`skill`,`difficulty`,`prompt_ko`,`prompt_ja`,`prompt_en`,`choices_json`,`answer_index`,`explanation_ko`,`explanation_ja`,`explanation_en`,`sample_answer_ko`,`sample_answer_ja`,`sample_answer_en`,`audio_script_ko`,`audio_r2_key`,`source_code`,`author_reviewer`,`second_reviewer`,`reviewed_at`,`bank_version`,`is_published`)',
      `VALUES (${esc(item.id)}, ${esc(TOPIK_PRACTICE_TRACK)}, ${esc(item.examLevel)}, ${esc(item.section)}, ${esc(item.questionType)}, ${esc(item.skill)}, ${item.difficulty}, ${esc(item.promptKo)}, ${esc(item.promptJa)}, ${esc(item.promptEn)}, ${escJson(item.choices)}, ${item.answerIndex ?? 'NULL'}, ${esc(item.explanationKo)}, ${esc(item.explanationJa)}, ${esc(item.explanationEn)}, ${esc(item.sampleAnswerKo)}, ${esc(item.sampleAnswerJa)}, ${esc(item.sampleAnswerEn)}, ${esc(item.audioScriptKo)}, ${esc(item.audioR2Key)}, ${esc(item.sourceCode)}, ${esc(item.authorReviewer)}, ${esc(item.secondReviewer)}, ${esc(item.reviewedAt)}, ${esc(TOPIK_PRACTICE_BANK_VERSION)}, 1)`,
      'ON CONFLICT(`id`) DO UPDATE SET `exam_level`=excluded.`exam_level`,`section`=excluded.`section`,`question_type`=excluded.`question_type`,`skill`=excluded.`skill`,`difficulty`=excluded.`difficulty`,`prompt_ko`=excluded.`prompt_ko`,`prompt_ja`=excluded.`prompt_ja`,`prompt_en`=excluded.`prompt_en`,`choices_json`=excluded.`choices_json`,`answer_index`=excluded.`answer_index`,`explanation_ko`=excluded.`explanation_ko`,`explanation_ja`=excluded.`explanation_ja`,`explanation_en`=excluded.`explanation_en`,`sample_answer_ko`=excluded.`sample_answer_ko`,`sample_answer_ja`=excluded.`sample_answer_ja`,`sample_answer_en`=excluded.`sample_answer_en`,`audio_script_ko`=excluded.`audio_script_ko`,`audio_r2_key`=excluded.`audio_r2_key`,`source_code`=excluded.`source_code`,`author_reviewer`=excluded.`author_reviewer`,`second_reviewer`=excluded.`second_reviewer`,`reviewed_at`=excluded.`reviewed_at`,`bank_version`=excluded.`bank_version`,`is_published`=excluded.`is_published`,`updated_at`=unixepoch();',
    ].join('\n')),
  ];

  return { manifest: { ...manifestCore, contentVersion, manifestSha256, seedRunId }, statements };
}
