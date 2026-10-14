export interface TopikLearningExpression {
  ko: string;
  en: string;
}

export interface TopikLearningUnit {
  id: string;
  order: number;
  titleKo: string;
  titleEn: string;
  objectiveEn: string;
  expressions: TopikLearningExpression[];
}

/** Self-authored TOPIK I foundation preview. No official test content is reproduced. */
export const TOPIK_FOUNDATION_UNITS: readonly TopikLearningUnit[] = [
  {
    id: 'identity-greetings', order: 1, titleKo: '인사와 자기소개', titleEn: 'Greetings and identity',
    objectiveEn: 'Introduce yourself and recognize common greetings.',
    expressions: [
      { ko: '안녕하세요?', en: 'Hello.' },
      { ko: '저는 민지입니다.', en: 'I am Minji.' },
      { ko: '만나서 반갑습니다.', en: 'Nice to meet you.' },
    ],
  },
  {
    id: 'places-movement', order: 2, titleKo: '장소와 이동', titleEn: 'Places and movement',
    objectiveEn: 'Describe where you go and where an action happens.',
    expressions: [
      { ko: '학교에 가요.', en: 'I go to school.' },
      { ko: '도서관에서 공부해요.', en: 'I study at the library.' },
      { ko: '집에 돌아왔어요.', en: 'I came back home.' },
    ],
  },
  {
    id: 'time-schedule', order: 3, titleKo: '시간과 일정', titleEn: 'Time and schedules',
    objectiveEn: 'Understand basic dates, times, and appointments.',
    expressions: [
      { ko: '지금 두 시예요.', en: "It is two o'clock now." },
      { ko: '금요일에 만나요.', en: 'Let us meet on Friday.' },
      { ko: '수업은 아홉 시에 시작해요.', en: 'Class starts at nine.' },
    ],
  },
  {
    id: 'shopping-food', order: 4, titleKo: '쇼핑과 음식', titleEn: 'Shopping and food',
    objectiveEn: 'Order food and ask about price and quantity.',
    expressions: [
      { ko: '커피 한 잔 주세요.', en: 'One coffee, please.' },
      { ko: '이거 얼마예요?', en: 'How much is this?' },
      { ko: '김밥 두 개를 샀어요.', en: 'I bought two gimbap rolls.' },
    ],
  },
  {
    id: 'reasons-conditions', order: 5, titleKo: '이유와 조건', titleEn: 'Reasons and conditions',
    objectiveEn: 'Connect simple reasons and conditional plans.',
    expressions: [
      { ko: '비가 와서 집에 있었어요.', en: 'I stayed home because it rained.' },
      { ko: '시간이 있으면 같이 가요.', en: 'If you have time, let us go together.' },
      { ko: '피곤하지만 운동했어요.', en: 'I exercised although I was tired.' },
    ],
  },
  {
    id: 'notices-sequence', order: 6, titleKo: '안내와 순서', titleEn: 'Notices and sequence',
    objectiveEn: 'Follow short public notices and ordered instructions.',
    expressions: [
      { ko: '먼저 번호표를 받으세요.', en: 'First, take a number ticket.' },
      { ko: '다음에 신청서를 쓰세요.', en: 'Next, fill out the application.' },
      { ko: '오늘은 문을 닫습니다.', en: 'We are closed today.' },
    ],
  },
];
