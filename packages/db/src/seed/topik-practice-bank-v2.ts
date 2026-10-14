import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from './constants.js';
import { esc, escJson } from './utils.js';

export const TOPIK_PRACTICE_V2_TRACK = 'topik-ko' as const;
export const TOPIK_PRACTICE_V2_BANK_VERSION = 'v2' as const;
export const TOPIK_PRACTICE_V2_PARSER_VERSION = 'topik-practice-parser-v2-quality-gated';
export const TOPIK_PRACTICE_V2_SOURCE_CODE = 'TOPIK-PRACTICE-V2' as const;
export const TOPIK_PRACTICE_V2_SOURCE_PATH = path.join(REPO_ROOT, 'docs/07_topik/T10_topik_i_ii_practice_bank_v2.md');

type ExamLevel = 'TOPIK-I' | 'TOPIK-II';
type Section = 'listening' | 'writing' | 'reading';
type ChoiceSection = Exclude<Section, 'writing'>;
type QuestionType = 'choice' | 'writing';

interface LocalizedText {
  ko: string;
  ja: string;
  en: string;
}

interface ChoiceValue extends LocalizedText {}

interface ChoiceFamily {
  code: string;
  aspect: LocalizedText;
  choices: readonly [ChoiceValue, ChoiceValue, ChoiceValue, ChoiceValue];
}

export interface TopikPracticeV2Question {
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
  /** Kept as audit metadata; API choices remain the existing string-array contract. */
  answerKo: string | null;
  answerJa: string | null;
  answerEn: string | null;
  explanationKo: string;
  explanationJa: string;
  explanationEn: string;
  sampleAnswerKo: string | null;
  sampleAnswerJa: string | null;
  sampleAnswerEn: string | null;
  audioScriptKo: string | null;
  /** Must permanently remain null: pronunciation is browser Google speech only. */
  audioR2Key: null;
  sourceCode: typeof TOPIK_PRACTICE_V2_SOURCE_CODE;
  authorReviewer: string;
  secondReviewer: string;
  reviewedAt: string;
}

export interface TopikPracticeV2QualityLedgerEntry {
  questionId: string;
  sourceEvidenceSha256: string;
  validatorVersion: typeof TOPIK_PRACTICE_V2_PARSER_VERSION;
  automatedCheck: 'passed';
  authorReviewer: string;
  secondReviewer: string;
  releaseState: 'published';
}

const AUTHOR_REVIEWER = 'JLPT-TOPIK Study original-item author review';
const SECOND_REVIEWER = 'JLPT-TOPIK Study adversarial Korean/Japanese/English QA';
const REVIEWED_AT = '2026-08-17';

/**
 * All values below are self-authored learning facts.  They are not excerpts,
 * answers, transcripts, or audio from an official TOPIK examination.
 */
const FAMILIES: readonly ChoiceFamily[] = [
  { code: 'schedule', aspect: { ko: '진행 시간', ja: '実施時刻', en: 'scheduled time' }, choices: [{ ko: '월요일 오전 아홉 시', ja: '月曜日の午前9時', en: 'Monday at 9 a.m.' }, { ko: '화요일 오전 열 시', ja: '火曜日の午前10時', en: 'Tuesday at 10 a.m.' }, { ko: '수요일 오후 두 시', ja: '水曜日の午後2時', en: 'Wednesday at 2 p.m.' }, { ko: '목요일 오후 네 시', ja: '木曜日の午後4時', en: 'Thursday at 4 p.m.' }] },
  { code: 'location', aspect: { ko: '장소', ja: '場所', en: 'location' }, choices: [{ ko: '1층 안내실', ja: '1階の案内室', en: 'the first-floor information desk' }, { ko: '2층 강의실', ja: '2階の講義室', en: 'the second-floor classroom' }, { ko: '도서관 입구', ja: '図書館の入口', en: 'the library entrance' }, { ko: 'B동 접수처', ja: 'B棟の受付', en: 'the Building B reception desk' }] },
  { code: 'required-item', aspect: { ko: '준비물', ja: '持ち物', en: 'required item' }, choices: [{ ko: '신분증', ja: '身分証明書', en: 'an identification card' }, { ko: '노트북', ja: 'ノートパソコン', en: 'a laptop' }, { ko: '통장 사본', ja: '通帳の写し', en: 'a bankbook copy' }, { ko: '필기구', ja: '筆記用具', en: 'writing materials' }] },
  { code: 'procedure', aspect: { ko: '신청 방법', ja: '申請方法', en: 'application method' }, choices: [{ ko: '신청서를 작성합니다', ja: '申請書を記入します', en: 'complete an application form' }, { ko: '전화로 예약합니다', ja: '電話で予約します', en: 'make a reservation by phone' }, { ko: '이메일로 제출합니다', ja: 'メールで提出します', en: 'submit it by email' }, { ko: '문자 안내를 기다립니다', ja: '案内メッセージを待ちます', en: 'wait for a text notification' }] },
  { code: 'reason', aspect: { ko: '변경 이유', ja: '変更の理由', en: 'reason for the change' }, choices: [{ ko: '강의실 공사', ja: '講義室の工事', en: 'classroom construction' }, { ko: '직원 회의', ja: '職員会議', en: 'a staff meeting' }, { ko: '기상 경보', ja: '気象警報', en: 'a weather alert' }, { ko: '안전 점검', ja: '安全点検', en: 'a safety inspection' }] },
  { code: 'service', aspect: { ko: '제공 서비스', ja: '提供するサービス', en: 'service provided' }, choices: [{ ko: '도서관 카드 발급', ja: '図書カードの発行', en: 'issuing library cards' }, { ko: '예약 시간 변경', ja: '予約時刻の変更', en: 'changing appointment times' }, { ko: '택배 수령', ja: '宅配便の受け取り', en: 'receiving packages' }, { ko: '문서 출력', ja: '書類の印刷', en: 'printing documents' }] },
  { code: 'deadline', aspect: { ko: '마감 시각', ja: '締切時刻', en: 'deadline' }, choices: [{ ko: '오늘 오후 다섯 시', ja: '今日の午後5時', en: '5 p.m. today' }, { ko: '금요일 정오', ja: '金曜日の正午', en: 'noon on Friday' }, { ko: '다음 주 월요일', ja: '来週の月曜日', en: 'next Monday' }, { ko: '이달 말', ja: '今月末', en: 'the end of this month' }] },
  { code: 'audience', aspect: { ko: '대상', ja: '対象者', en: 'intended audience' }, choices: [{ ko: '새 참가자', ja: '新しい参加者', en: 'new participants' }, { ko: '모둠 대표', ja: 'グループ代表', en: 'group representatives' }, { ko: '학부모', ja: '保護者', en: 'parents' }, { ko: '지역 주민', ja: '地域住民', en: 'local residents' }] },
  { code: 'priority', aspect: { ko: '우선 확인 사항', ja: '優先確認事項', en: 'priority to check' }, choices: [{ ko: '연락처를 확인합니다', ja: '連絡先を確認します', en: 'verify contact details' }, { ko: '결제를 확인합니다', ja: '支払いを確認します', en: 'verify payment' }, { ko: '날짜를 수정합니다', ja: '日付を修正します', en: 'revise the date' }, { ko: '질문을 준비합니다', ja: '質問を準備します', en: 'prepare questions' }] },
  { code: 'channel', aspect: { ko: '문의 경로', ja: '問い合わせ方法', en: 'contact channel' }, choices: [{ ko: '답장 이메일', ja: '返信メール', en: 'a reply email' }, { ko: '전화 상담', ja: '電話相談', en: 'a phone consultation' }, { ko: '온라인 양식', ja: 'オンラインフォーム', en: 'an online form' }, { ko: '현장 창구', ja: '窓口', en: 'the in-person desk' }] },
  { code: 'outcome', aspect: { ko: '처리 결과', ja: '処理結果', en: 'processing outcome' }, choices: [{ ko: '예약이 확정되었습니다', ja: '予約が確定しました', en: 'the reservation was confirmed' }, { ko: '수업이 연기되었습니다', ja: '授業が延期されました', en: 'the class was postponed' }, { ko: '장소가 변경되었습니다', ja: '会場が変更されました', en: 'the venue was changed' }, { ko: '참가 인원이 늘었습니다', ja: '参加人数が増えました', en: 'the participant count increased' }] },
  { code: 'data-focus', aspect: { ko: '검토 자료', ja: '確認する資料', en: 'data to review' }, choices: [{ ko: '참가 인원 수', ja: '参加人数', en: 'the participant count' }, { ko: '이용 간격', ja: '利用間隔', en: 'the usage interval' }, { ko: '설문 응답', ja: 'アンケート回答', en: 'survey responses' }, { ko: '예산 합계', ja: '予算合計', en: 'the budget total' }] },
  { code: 'benefit', aspect: { ko: '기대 효과', ja: '期待する効果', en: 'expected benefit' }, choices: [{ ko: '대기 시간을 줄입니다', ja: '待ち時間を減らします', en: 'reduces waiting time' }, { ko: '이동 경로를 분명히 합니다', ja: '移動経路を明確にします', en: 'clarifies the travel route' }, { ko: '파일을 함께 볼 수 있습니다', ja: 'ファイルを共有できます', en: 'allows files to be shared' }, { ko: '중복 작업을 막습니다', ja: '重複作業を防ぎます', en: 'prevents duplicate work' }] },
  { code: 'risk', aspect: { ko: '주의할 위험', ja: '注意すべきリスク', en: 'risk to avoid' }, choices: [{ ko: '마감을 놓칠 수 있습니다', ja: '締切を逃すおそれがあります', en: 'the deadline may be missed' }, { ko: '신청이 중복될 수 있습니다', ja: '申請が重複するおそれがあります', en: 'a request may be duplicated' }, { ko: '비용이 예상보다 늘 수 있습니다', ja: '費用が予定より増えるおそれがあります', en: 'costs may exceed expectations' }, { ko: '기록이 빠질 수 있습니다', ja: '記録が漏れるおそれがあります', en: 'a record may be omitted' }] },
  { code: 'next-step', aspect: { ko: '다음 단계', ja: '次の段階', en: 'next step' }, choices: [{ ko: '의견을 모읍니다', ja: '意見を集めます', en: 'collect feedback' }, { ko: '초안을 수정합니다', ja: '下書きを修正します', en: 'revise the draft' }, { ko: '안내문을 게시합니다', ja: '案内文を掲示します', en: 'publish the notice' }, { ko: '시간을 조정합니다', ja: '時間を調整します', en: 'adjust the schedule' }] },
] as const;

const WRITING_TOPICS: readonly LocalizedText[] = [
  { ko: '동아리 모임', ja: 'サークルの集まり', en: 'a club meeting' },
  { ko: '도서관 이용 안내', ja: '図書館利用の案内', en: 'library-use guidance' },
  { ko: '지역 행사 준비', ja: '地域行事の準備', en: 'preparation for a local event' },
  { ko: '온라인 수업 계획', ja: 'オンライン授業の計画', en: 'an online-class plan' },
  { ko: '환경 정리 활동', ja: '環境整備活動', en: 'a clean-up activity' },
  { ko: '건강 상담 예약', ja: '健康相談の予約', en: 'a health consultation appointment' },
  { ko: '팀 발표 준비', ja: 'チーム発表の準備', en: 'a team presentation' },
  { ko: '새 학기 안내', ja: '新学期の案内', en: 'a new-term notice' },
  { ko: '문화 체험 신청', ja: '文化体験の申込み', en: 'a cultural-experience application' },
  { ko: '자원봉사 일정', ja: 'ボランティアの日程', en: 'a volunteer schedule' },
  { ko: '공용 공간 사용 규칙', ja: '共用空間の利用規則', en: 'shared-space rules' },
  { ko: '설문 조사 참여', ja: 'アンケートへの参加', en: 'taking part in a survey' },
  { ko: '교통 안전 캠페인', ja: '交通安全キャンペーン', en: 'a traffic-safety campaign' },
  { ko: '학습 모임 장소', ja: '学習会の場所', en: 'a study-group venue' },
  { ko: '프로젝트 마감', ja: 'プロジェクトの締切', en: 'a project deadline' },
] as const;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function pad(value: number): string {
  return String(value).padStart(3, '0');
}

function itemId(examLevel: ExamLevel, section: Section, number: number): string {
  const level = examLevel === 'TOPIK-I' ? 'i' : 'ii';
  return `topik-practice-v2-${level}-${section[0]}-${pad(number)}`;
}

function makeChoiceQuestion(input: {
  examLevel: ExamLevel;
  section: ChoiceSection;
  family: ChoiceFamily;
  answerIndex: 0 | 1 | 2 | 3;
  number: number;
}): TopikPracticeV2Question {
  const { examLevel, section, family, answerIndex, number } = input;
  const answer = family.choices[answerIndex];
  const basic = examLevel === 'TOPIK-I';
  const listening = section === 'listening';
  const levelNameKo = basic ? '기초 학습센터' : '운영 검토 회의';
  const levelNameJa = basic ? '基礎学習センター' : '運営検討会議';
  const levelNameEn = basic ? 'the learning centre' : 'the operations review meeting';
  const detailKo = basic
    ? `${levelNameKo} 안내입니다. 이번 ${family.aspect.ko}은 ${answer.ko}입니다.`
    : `${levelNameKo}에서는 여러 방안을 비교한 뒤, 이번 단계의 ${family.aspect.ko}을(를) ${answer.ko}으로 정했습니다. 다른 선택지는 다음 검토에서 다룹니다.`;
  const detailJa = basic
    ? `${levelNameJa}からのお知らせです。今回の${family.aspect.ja}は${answer.ja}です。`
    : `${levelNameJa}では複数の案を比べた後、今回の${family.aspect.ja}を${answer.ja}に決めました。ほかの選択肢は次の検討で扱います。`;
  const detailEn = basic
    ? `This is a notice from ${levelNameEn}. The ${family.aspect.en} is ${answer.en}.`
    : `After comparing several options, ${levelNameEn} set the ${family.aspect.en} as ${answer.en}; the other options will be considered later.`;
  const questionKo = basic ? '알맞은 내용을 고르십시오.' : '화자의 판단과 일치하는 내용을 고르십시오.';
  const questionJa = basic ? '正しい内容を選んでください。' : '話し手の判断と一致する内容を選んでください。';
  const questionEn = basic ? 'Choose the correct detail.' : "Choose the option that matches the speaker's decision.";
  const promptPrefixKo = listening ? `[듣기 안내 ${pad(number)}]` : `[읽기 안내 ${pad(number)}]\n${detailKo}`;
  const promptPrefixJa = listening ? `[聞き取り案内 ${pad(number)}]` : `[読解案内 ${pad(number)}]\n${detailJa}`;
  const promptPrefixEn = listening ? `[Listening notice ${pad(number)}]` : `[Reading notice ${pad(number)}]\n${detailEn}`;

  return {
    id: itemId(examLevel, section, number),
    examLevel,
    section,
    questionType: 'choice',
    skill: `${family.code}-${basic ? 'foundation' : 'analysis'}-${answerIndex + 1}`,
    difficulty: (basic ? ((number - 1) % 3) + 1 : ((number - 1) % 3) + 3) as 1 | 2 | 3 | 4 | 5,
    promptKo: `${promptPrefixKo}\n${questionKo}`,
    promptJa: `${promptPrefixJa}\n${questionJa}`,
    promptEn: `${promptPrefixEn}\n${questionEn}`,
    choices: family.choices.map((choice) => choice.ko),
    answerIndex,
    answerKo: answer.ko,
    answerJa: answer.ja,
    answerEn: answer.en,
    explanationKo: `${detailKo} 따라서 정답은 '${answer.ko}'입니다.`,
    explanationJa: `${detailJa} したがって正解は「${answer.ja}」です。`,
    explanationEn: `${detailEn} Therefore, the correct answer is “${answer.en}.”`,
    sampleAnswerKo: null,
    sampleAnswerJa: null,
    sampleAnswerEn: null,
    audioScriptKo: listening ? detailKo : null,
    audioR2Key: null,
    sourceCode: TOPIK_PRACTICE_V2_SOURCE_CODE,
    authorReviewer: AUTHOR_REVIEWER,
    secondReviewer: SECOND_REVIEWER,
    reviewedAt: REVIEWED_AT,
  };
}

function makeChoiceSection(examLevel: ExamLevel, section: ChoiceSection): TopikPracticeV2Question[] {
  return FAMILIES.flatMap((family, familyIndex) => ([0, 1, 2, 3] as const).map((answerIndex) =>
    makeChoiceQuestion({
      examLevel,
      section,
      family,
      answerIndex,
      number: familyIndex * 4 + answerIndex + 1,
    }),
  ));
}

function makeWritingQuestion(topic: LocalizedText, kind: number, number: number): TopikPracticeV2Question {
  const difficulty = ((number - 1) % 3) + 3 as 3 | 4 | 5;
  const templates = [
    {
      promptKo: `${topic.ko}에 참석하기 어려운 이유와 가능한 다른 시간을 3문장으로 쓰십시오.`,
      promptJa: `${topic.ja}に参加しにくい理由と、可能な別の時間を3文で書いてください。`,
      promptEn: `Write three sentences explaining why you cannot attend ${topic.en} and proposing another possible time.`,
      explanationKo: '이유, 배려 표현, 대안 시간을 모두 제시했는지 확인합니다.',
      explanationJa: '理由、配慮の表現、代わりの時間をすべて示したか確認します。',
      explanationEn: 'Check that the response gives a reason, a considerate expression, and an alternative time.',
      sampleKo: `안녕하세요. 이번 ${topic.ko}에는 개인 일정 때문에 참석하기 어렵습니다. 죄송하지만 다음 주 수요일 오후에 다시 이야기할 수 있을까요?`,
      sampleJa: `こんにちは。今回の${topic.ja}には私用のため参加が難しいです。申し訳ありませんが、来週水曜日の午後に改めて話せますか。`,
      sampleEn: `Hello. I cannot attend ${topic.en} because of a personal commitment. I am sorry; could we discuss it again next Wednesday afternoon?`,
      skill: 'request-and-reschedule',
    },
    {
      promptKo: `${topic.ko}를 더 잘 운영하기 위한 제안 한 가지와 그 이유를 3~4문장으로 쓰십시오.`,
      promptJa: `${topic.ja}をよりよく運営するための提案を一つ、その理由とともに3〜4文で書いてください。`,
      promptEn: `Write 3–4 sentences proposing one improvement for ${topic.en} and explaining why.`,
      explanationKo: '제안, 이유, 기대 효과가 자연스럽게 연결되는지 확인합니다.',
      explanationJa: '提案、理由、期待する効果が自然につながっているか確認します。',
      explanationEn: 'Check that the proposal, reason, and expected benefit connect naturally.',
      sampleKo: `${topic.ko}에는 사전 안내를 더 자세히 보내면 좋겠습니다. 참가자가 준비물을 미리 알 수 있어서 혼란이 줄어듭니다. 문의도 더 빨리 처리할 수 있습니다.`,
      sampleJa: `${topic.ja}には事前案内をもっと詳しく送るとよいと思います。参加者が持ち物を前もって知ることができ、混乱が減ります。問い合わせもより早く処理できます。`,
      sampleEn: `It would help to send more detailed information before ${topic.en}. Participants could prepare in advance, which would reduce confusion and allow questions to be handled sooner.`,
      skill: 'proposal-with-reason',
    },
    {
      promptKo: `${topic.ko}에 관한 짧은 안내문을 3문장으로 쓰십시오. 장소, 시간, 준비 사항을 포함해야 합니다.`,
      promptJa: `${topic.ja}についての短い案内文を3文で書いてください。場所、時間、準備事項を含めます。`,
      promptEn: `Write a three-sentence notice about ${topic.en}. Include a place, time, and preparation detail.`,
      explanationKo: '장소, 시간, 준비 사항을 빠뜨리지 않고 공손하게 알렸는지 확인합니다.',
      explanationJa: '場所、時間、準備事項を漏らさず、丁寧に伝えたか確認します。',
      explanationEn: 'Check that the notice politely includes the place, time, and preparation detail.',
      sampleKo: `${topic.ko}는 금요일 오후 두 시에 2층 강의실에서 진행됩니다. 신분증과 필기구를 가져와 주세요. 시작 십 분 전까지 도착해 주시면 됩니다.`,
      sampleJa: `${topic.ja}は金曜日の午後2時に2階講義室で行われます。身分証明書と筆記用具をお持ちください。開始10分前までにお越しください。`,
      sampleEn: `${topic.en} will take place in the second-floor classroom at 2 p.m. on Friday. Please bring identification and writing materials, and arrive ten minutes early.`,
      skill: 'formal-notice',
    },
    {
      promptKo: `${topic.ko}를 준비할 때 온라인 방식과 현장 방식을 비교하고, 더 알맞은 한 가지를 3~4문장으로 쓰십시오.`,
      promptJa: `${topic.ja}を準備するとき、オンライン方式と現場方式を比べ、より適切な一つを3〜4文で書いてください。`,
      promptEn: `Compare online and in-person approaches for ${topic.en}, then write 3–4 sentences choosing the more suitable one.`,
      explanationKo: '두 방식을 비교하고 선택한 방식의 근거와 한계까지 제시했는지 확인합니다.',
      explanationJa: '二つの方式を比較し、選んだ方式の根拠と限界まで示したか確認します。',
      explanationEn: 'Check that the response compares both approaches and states the chosen method’s reason and limitation.',
      sampleKo: `저는 ${topic.ko}에는 현장 방식을 선택하겠습니다. 바로 질문하고 필요한 자료를 확인하기 쉽기 때문입니다. 다만 먼 곳에 사는 사람은 참여하기 어려울 수 있어서 온라인 안내도 함께 제공해야 합니다.`,
      sampleJa: `私は${topic.ja}には現場方式を選びます。その場で質問し、必要な資料を確認しやすいからです。ただし遠方の人は参加しにくいので、オンライン案内も一緒に提供すべきです。`,
      sampleEn: `I would choose an in-person approach for ${topic.en} because it is easier to ask questions and check needed materials immediately. However, people who live far away may have difficulty attending, so online guidance should also be provided.`,
      skill: 'comparison-and-judgment',
    },
  ] as const;
  const template = templates[kind];
  if (!template) throw new Error(`Missing writing template ${kind}`);
  return {
    id: itemId('TOPIK-II', 'writing', number),
    examLevel: 'TOPIK-II',
    section: 'writing',
    questionType: 'writing',
    skill: template.skill,
    difficulty,
    promptKo: template.promptKo,
    promptJa: template.promptJa,
    promptEn: template.promptEn,
    choices: [],
    answerIndex: null,
    answerKo: null,
    answerJa: null,
    answerEn: null,
    explanationKo: template.explanationKo,
    explanationJa: template.explanationJa,
    explanationEn: template.explanationEn,
    sampleAnswerKo: template.sampleKo,
    sampleAnswerJa: template.sampleJa,
    sampleAnswerEn: template.sampleEn,
    audioScriptKo: null,
    audioR2Key: null,
    sourceCode: TOPIK_PRACTICE_V2_SOURCE_CODE,
    authorReviewer: AUTHOR_REVIEWER,
    secondReviewer: SECOND_REVIEWER,
    reviewedAt: REVIEWED_AT,
  };
}

function makeWritingSection(): TopikPracticeV2Question[] {
  return WRITING_TOPICS.flatMap((topic, topicIndex) => [0, 1, 2, 3].map((kind) =>
    makeWritingQuestion(topic, kind, topicIndex * 4 + kind + 1),
  ));
}

/** 300 self-authored, release-gated practice questions. */
export const TOPIK_PRACTICE_V2_QUESTIONS: readonly TopikPracticeV2Question[] = [
  ...makeChoiceSection('TOPIK-I', 'listening'),
  ...makeChoiceSection('TOPIK-I', 'reading'),
  ...makeChoiceSection('TOPIK-II', 'listening'),
  ...makeChoiceSection('TOPIK-II', 'reading'),
  ...makeWritingSection(),
];

type CoverageKey = 'TOPIK-I:listening' | 'TOPIK-I:reading' | 'TOPIK-II:listening' | 'TOPIK-II:reading' | 'TOPIK-II:writing';

const EXPECTED_COVERAGE: Readonly<Record<CoverageKey, number>> = {
  'TOPIK-I:listening': 60,
  'TOPIK-I:reading': 60,
  'TOPIK-II:listening': 60,
  'TOPIK-II:reading': 60,
  'TOPIK-II:writing': 60,
};

export function validateTopikPracticeV2Bank(questions = TOPIK_PRACTICE_V2_QUESTIONS): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const prompts = new Set<string>();
  const coverage = new Map<string, number>();
  const answerPositions = new Map<string, Map<number, number>>();

  for (const item of questions) {
    if (!ids.add(item.id)) errors.push(`duplicate id: ${item.id}`);
    const promptKey = `${item.examLevel}:${item.section}:${item.promptKo.replace(/\s+/gu, ' ').trim()}`;
    if (!prompts.add(promptKey)) errors.push(`duplicate prompt: ${item.id}`);
    const coverageKey = `${item.examLevel}:${item.section}`;
    coverage.set(coverageKey, (coverage.get(coverageKey) ?? 0) + 1);

    const required = [
      item.promptKo, item.promptJa, item.promptEn,
      item.explanationKo, item.explanationJa, item.explanationEn,
      item.sourceCode, item.authorReviewer, item.secondReviewer,
    ];
    if (required.some((value) => value.trim().length === 0)) errors.push(`blank required field: ${item.id}`);
    if (item.authorReviewer === item.secondReviewer) errors.push(`review roles must differ: ${item.id}`);
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(item.reviewedAt)) errors.push(`invalid reviewed date: ${item.id}`);
    if (!Number.isInteger(item.difficulty) || item.difficulty < 1 || item.difficulty > 5) errors.push(`invalid difficulty: ${item.id}`);
    if (item.audioR2Key !== null) errors.push(`R2 pronunciation is forbidden: ${item.id}`);

    if (item.questionType === 'choice') {
      if (item.choices.length !== 4 || item.choices.some((choice) => choice.trim().length === 0) || new Set(item.choices.map((choice) => choice.trim())).size !== 4) {
        errors.push(`invalid choices: ${item.id}`);
      }
      if (!Number.isInteger(item.answerIndex) || item.answerIndex === null || item.answerIndex < 0 || item.answerIndex > 3) {
        errors.push(`invalid answer index: ${item.id}`);
      } else {
        if (item.answerKo !== item.choices[item.answerIndex]) errors.push(`answer does not match choice: ${item.id}`);
        const positions = answerPositions.get(coverageKey) ?? new Map<number, number>();
        positions.set(item.answerIndex, (positions.get(item.answerIndex) ?? 0) + 1);
        answerPositions.set(coverageKey, positions);
      }
      if (!item.answerKo?.trim() || !item.answerJa?.trim() || !item.answerEn?.trim()) errors.push(`blank localized answer: ${item.id}`);
      if (!item.explanationKo.includes(item.answerKo ?? '')) errors.push(`Korean explanation does not identify answer: ${item.id}`);
      if (item.section === 'listening' && !item.audioScriptKo?.trim()) errors.push(`missing listening script: ${item.id}`);
      if (item.section === 'reading' && item.audioScriptKo !== null) errors.push(`unexpected reading script: ${item.id}`);
      if (item.sampleAnswerKo !== null || item.sampleAnswerJa !== null || item.sampleAnswerEn !== null) errors.push(`choice must not contain writing sample: ${item.id}`);
    } else {
      if (item.section !== 'writing') errors.push(`writing type outside writing section: ${item.id}`);
      if (item.choices.length !== 0 || item.answerIndex !== null || item.answerKo !== null || item.answerJa !== null || item.answerEn !== null) errors.push(`invalid writing answer fields: ${item.id}`);
      if (!item.sampleAnswerKo?.trim() || !item.sampleAnswerJa?.trim() || !item.sampleAnswerEn?.trim()) errors.push(`missing writing sample: ${item.id}`);
      if (item.audioScriptKo !== null) errors.push(`writing must not contain audio script: ${item.id}`);
    }
  }

  if (questions.length !== 300) errors.push(`bank must contain exactly 300 questions; found ${questions.length}`);
  for (const [key, expected] of Object.entries(EXPECTED_COVERAGE)) {
    if ((coverage.get(key) ?? 0) !== expected) errors.push(`${key} must contain exactly ${expected} questions`);
  }
  for (const key of ['TOPIK-I:listening', 'TOPIK-I:reading', 'TOPIK-II:listening', 'TOPIK-II:reading']) {
    const positions = answerPositions.get(key);
    for (let position = 0; position < 4; position += 1) {
      if ((positions?.get(position) ?? 0) !== 15) errors.push(`${key} answer index ${position} must contain exactly 15 questions`);
    }
  }
  return errors;
}

const EXAM_LEVELS = [
  { examLevel: 'TOPIK-I', sortOrder: 1, labelEn: 'TOPIK I (Levels 1-2)', labelKo: 'TOPIK I (1~2급)', sections: ['listening', 'reading'] },
  { examLevel: 'TOPIK-II', sortOrder: 2, labelEn: 'TOPIK II (Levels 3-6)', labelKo: 'TOPIK II (3~6급)', sections: ['listening', 'writing', 'reading'] },
] as const;

export function buildTopikPracticeV2SeedPlan() {
  const errors = validateTopikPracticeV2Bank();
  if (errors.length > 0) throw new Error(`TOPIK practice V2 validation failed: ${errors.join('; ')}`);

  const documentChecksum = sha256(fs.readFileSync(TOPIK_PRACTICE_V2_SOURCE_PATH, 'utf8'));
  const questionChecksum = sha256(JSON.stringify(TOPIK_PRACTICE_V2_QUESTIONS));
  const sourceChecksum = sha256(`${documentChecksum}:${questionChecksum}`);
  const provenance = {
    origin: { name: 'JLPT-TOPIK Study self-authored TOPIK I/II practice content V2', url: 'https://github.com/kordokrip/JLPT/blob/main/docs/07_topik/T10_topik_i_ii_practice_bank_v2.md' },
    formatReference: { name: 'Public TOPIK area structure only', url: 'https://www.studyinkorea.go.kr/eng/plan/examAndKoreanStudy.do' },
    license: { id: 'LicenseRef-nihongo-n3-topik-original', name: 'Repository self-authored learning content', url: 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#topik-자체-저작-콘텐츠' },
    authorReviewer: AUTHOR_REVIEWER,
    secondReviewer: SECOND_REVIEWER,
    reviewedAt: REVIEWED_AT,
    restrictions: 'No official TOPIK question, answer key, transcript, audio, or commercial preparation material is copied or redistributed. Browser Google speech may read self-authored scripts; R2 pronunciation is forbidden.',
  };
  const manifestCore = {
    schemaVersion: 2,
    learningTrack: TOPIK_PRACTICE_V2_TRACK,
    bankVersion: TOPIK_PRACTICE_V2_BANK_VERSION,
    parserVersion: TOPIK_PRACTICE_V2_PARSER_VERSION,
    source: { code: TOPIK_PRACTICE_V2_SOURCE_CODE, title: 'Self-authored TOPIK I/II practice bank V2', filePath: 'docs/07_topik/T10_topik_i_ii_practice_bank_v2.md', sourceVersion: REVIEWED_AT, sourceChecksum, provenance },
    examLevels: EXAM_LEVELS,
    questions: { expectedRows: TOPIK_PRACTICE_V2_QUESTIONS.length, sha256: questionChecksum },
  } as const;
  const manifestSha256 = sha256(JSON.stringify(manifestCore));
  const contentVersion = `topik-practice-v2-${manifestSha256.slice(0, 12)}`;
  const seedRunId = `topik-practice-v2-${manifestSha256.slice(0, 20)}`;
  const provenanceJson = JSON.stringify(provenance);
  const qualityLedger: readonly TopikPracticeV2QualityLedgerEntry[] = TOPIK_PRACTICE_V2_QUESTIONS.map((item) => ({
    questionId: item.id,
    sourceEvidenceSha256: sourceChecksum,
    validatorVersion: TOPIK_PRACTICE_V2_PARSER_VERSION,
    automatedCheck: 'passed',
    authorReviewer: item.authorReviewer,
    secondReviewer: item.secondReviewer,
    releaseState: 'published',
  }));

  const statements = [
    // V1 is retained for audit/history but must not remain publicly selectable.
    `UPDATE \`topik_practice_questions\` SET \`is_published\`=0, \`updated_at\`=unixepoch() WHERE \`learning_track\`=${esc(TOPIK_PRACTICE_V2_TRACK)} AND \`bank_version\`='v1' AND \`is_published\`!=0;`,
    [
      'INSERT INTO `track_content_sources` (`learning_track`,`source_code`,`title`,`file_path`,`source_version`,`provenance_json`)',
      `VALUES (${esc(TOPIK_PRACTICE_V2_TRACK)}, ${esc(TOPIK_PRACTICE_V2_SOURCE_CODE)}, ${esc(manifestCore.source.title)}, ${esc(manifestCore.source.filePath)}, ${esc(REVIEWED_AT)}, ${esc(provenanceJson)})`,
      'ON CONFLICT(`learning_track`,`source_code`) DO UPDATE SET `title`=excluded.`title`,`file_path`=excluded.`file_path`,`source_version`=excluded.`source_version`,`provenance_json`=excluded.`provenance_json`,`updated_at`=unixepoch();',
    ].join('\n'),
    ...EXAM_LEVELS.map((level) => [
      'INSERT INTO `track_exam_levels` (`learning_track`,`exam_level`,`sort_order`,`label_en`,`label_ko`,`sections_json`)',
      `VALUES (${esc(TOPIK_PRACTICE_V2_TRACK)}, ${esc(level.examLevel)}, ${level.sortOrder}, ${esc(level.labelEn)}, ${esc(level.labelKo)}, ${escJson([...level.sections])})`,
      'ON CONFLICT(`learning_track`,`exam_level`) DO UPDATE SET `sort_order`=excluded.`sort_order`,`label_en`=excluded.`label_en`,`label_ko`=excluded.`label_ko`,`sections_json`=excluded.`sections_json`,`updated_at`=unixepoch();',
    ].join('\n')),
    `INSERT INTO \`track_content_seed_runs\` (\`id\`,\`learning_track\`,\`content_version\`,\`parser_version\`,\`manifest_sha256\`) VALUES (${esc(seedRunId)}, ${esc(TOPIK_PRACTICE_V2_TRACK)}, ${esc(contentVersion)}, ${esc(TOPIK_PRACTICE_V2_PARSER_VERSION)}, ${esc(manifestSha256)}) ON CONFLICT(\`learning_track\`,\`content_version\`) DO UPDATE SET \`parser_version\`=excluded.\`parser_version\`,\`manifest_sha256\`=excluded.\`manifest_sha256\`;`,
    `INSERT INTO \`track_content_seed_sources\` (\`seed_run_id\`,\`learning_track\`,\`source_code\`,\`source_checksum\`,\`parser_version\`,\`provenance_json\`) VALUES (${esc(seedRunId)}, ${esc(TOPIK_PRACTICE_V2_TRACK)}, ${esc(TOPIK_PRACTICE_V2_SOURCE_CODE)}, ${esc(sourceChecksum)}, ${esc(TOPIK_PRACTICE_V2_PARSER_VERSION)}, ${esc(provenanceJson)}) ON CONFLICT(\`seed_run_id\`,\`source_code\`) DO UPDATE SET \`source_checksum\`=excluded.\`source_checksum\`,\`parser_version\`=excluded.\`parser_version\`,\`provenance_json\`=excluded.\`provenance_json\`;`,
    ...TOPIK_PRACTICE_V2_QUESTIONS.map((item) => [
      'INSERT INTO `topik_practice_questions` (`id`,`learning_track`,`exam_level`,`section`,`question_type`,`skill`,`difficulty`,`prompt_ko`,`prompt_ja`,`prompt_en`,`choices_json`,`answer_index`,`explanation_ko`,`explanation_ja`,`explanation_en`,`sample_answer_ko`,`sample_answer_ja`,`sample_answer_en`,`audio_script_ko`,`audio_r2_key`,`source_code`,`author_reviewer`,`second_reviewer`,`reviewed_at`,`bank_version`,`is_published`)',
      `VALUES (${esc(item.id)}, ${esc(TOPIK_PRACTICE_V2_TRACK)}, ${esc(item.examLevel)}, ${esc(item.section)}, ${esc(item.questionType)}, ${esc(item.skill)}, ${item.difficulty}, ${esc(item.promptKo)}, ${esc(item.promptJa)}, ${esc(item.promptEn)}, ${escJson(item.choices)}, ${item.answerIndex ?? 'NULL'}, ${esc(item.explanationKo)}, ${esc(item.explanationJa)}, ${esc(item.explanationEn)}, ${esc(item.sampleAnswerKo)}, ${esc(item.sampleAnswerJa)}, ${esc(item.sampleAnswerEn)}, ${esc(item.audioScriptKo)}, NULL, ${esc(item.sourceCode)}, ${esc(item.authorReviewer)}, ${esc(item.secondReviewer)}, ${esc(item.reviewedAt)}, ${esc(TOPIK_PRACTICE_V2_BANK_VERSION)}, 1)`,
      'ON CONFLICT(`id`) DO UPDATE SET `exam_level`=excluded.`exam_level`,`section`=excluded.`section`,`question_type`=excluded.`question_type`,`skill`=excluded.`skill`,`difficulty`=excluded.`difficulty`,`prompt_ko`=excluded.`prompt_ko`,`prompt_ja`=excluded.`prompt_ja`,`prompt_en`=excluded.`prompt_en`,`choices_json`=excluded.`choices_json`,`answer_index`=excluded.`answer_index`,`explanation_ko`=excluded.`explanation_ko`,`explanation_ja`=excluded.`explanation_ja`,`explanation_en`=excluded.`explanation_en`,`sample_answer_ko`=excluded.`sample_answer_ko`,`sample_answer_ja`=excluded.`sample_answer_ja`,`sample_answer_en`=excluded.`sample_answer_en`,`audio_script_ko`=excluded.`audio_script_ko`,`audio_r2_key`=NULL,`source_code`=excluded.`source_code`,`author_reviewer`=excluded.`author_reviewer`,`second_reviewer`=excluded.`second_reviewer`,`reviewed_at`=excluded.`reviewed_at`,`bank_version`=excluded.`bank_version`,`is_published`=excluded.`is_published`,`updated_at`=unixepoch();',
    ].join('\n')),
    ...TOPIK_PRACTICE_V2_QUESTIONS.map((item) => {
      const auditId = `quality-${item.id}-${manifestSha256.slice(0, 12)}`;
      const details = {
        source: 'self-authored',
        question_type: item.questionType,
        answer_index: item.answerIndex,
        pronunciation: 'google-browser-only',
        r2_pronunciation: 'forbidden',
      };
      return [
        'INSERT INTO `content_quality_audits` (`id`,`learning_track`,`content_type`,`content_id`,`content_version`,`evidence_sha256`,`validator_version`,`automated_status`,`author_review_status`,`adversarial_review_status`,`author_reviewer`,`adversarial_reviewer`,`release_state`,`details_json`,`checked_at`)',
        `VALUES (${esc(auditId)}, ${esc(TOPIK_PRACTICE_V2_TRACK)}, 'topik-practice', ${esc(item.id)}, ${esc(contentVersion)}, ${esc(sourceChecksum)}, ${esc(TOPIK_PRACTICE_V2_PARSER_VERSION)}, 'passed', 'signed', 'signed', ${esc(item.authorReviewer)}, ${esc(item.secondReviewer)}, 'published', ${esc(JSON.stringify(details))}, ${esc(item.reviewedAt)})`,
        'ON CONFLICT(`learning_track`,`content_type`,`content_id`,`content_version`) DO UPDATE SET `evidence_sha256`=excluded.`evidence_sha256`,`validator_version`=excluded.`validator_version`,`automated_status`=excluded.`automated_status`,`author_review_status`=excluded.`author_review_status`,`adversarial_review_status`=excluded.`adversarial_review_status`,`author_reviewer`=excluded.`author_reviewer`,`adversarial_reviewer`=excluded.`adversarial_reviewer`,`release_state`=excluded.`release_state`,`details_json`=excluded.`details_json`,`checked_at`=excluded.`checked_at`,`updated_at`=unixepoch();',
      ].join('\n');
    }),
  ];

  return { manifest: { ...manifestCore, contentVersion, manifestSha256, seedRunId }, statements, qualityLedger };
}
