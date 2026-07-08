import type { SelfCheckCategory, SelfCheckTemplate } from './types';

export const CATEGORY_ORDER: SelfCheckCategory[] = ['vocab', 'grammar', 'reading', 'listening', 'speaking', 'writing', 'strategy'];

export const CATEGORY_TITLE: Record<SelfCheckCategory, string> = {
  vocab: '어휘',
  grammar: '문법',
  reading: '독해',
  listening: '청해',
  speaking: '회화',
  writing: '작문',
  strategy: '시험 전략',
};

export const RADAR_LABEL_KEYS = ['vocab', 'grammar', 'reading', 'listening', 'speaking', 'writing'] as const;
export const SELF_CHECK_STORAGE_PREFIX = 'nihongo-n3:self-check';

export const DEFAULT_SELF_CHECK_TEMPLATES: SelfCheckTemplate[] = [
  { code: 'n3_vocab_01', level: 'N3', category: 'vocab', sort_order: 10, item_ko: 'N3 지문에서 모르는 단어가 있어도 앞뒤 문맥으로 뜻을 추정할 수 있다.', evidence_ko: 'JLPT N3는 어휘와 문맥 이해를 언어지식 영역에서 확인한다.', recommendation_ko: '매일 N3 어휘 20개를 예문과 함께 SRS에 추가하고 문장 단위로 복습하세요.', source_name: 'JLPT 공식 시험 구성', source_url: 'https://www.jlpt.jp/e/guideline/testsections.html' },
  { code: 'n3_vocab_02', level: 'N3', category: 'vocab', sort_order: 20, item_ko: '한자로 쓰인 N3 빈출 단어의 읽기와 의미를 함께 떠올릴 수 있다.', evidence_ko: 'N3 어휘 영역에는 한자 읽기와 표기 이해가 포함된다.', recommendation_ko: '한자-읽기-뜻을 한 카드에 묶어 복습하고, 오답 한자는 같은 음독 단어와 같이 정리하세요.', source_name: 'JLPT N3 문제 목적', source_url: 'https://www.jlpt.jp/e/guideline/pdf/n3_e.pdf' },
  { code: 'n3_grammar_01', level: 'N3', category: 'grammar', sort_order: 10, item_ko: 'N3 문형을 보고 의미, 접속, 쓰는 상황을 함께 설명할 수 있다.', evidence_ko: 'N3는 문법 지식과 독해를 같은 시험 시간 안에서 확인한다.', recommendation_ko: '문형은 뜻만 보지 말고 접속 형태와 예문 2개를 같이 소리 내어 읽으세요.', source_name: 'JLPT 공식 시험 구성', source_url: 'https://www.jlpt.jp/e/guideline/testsections.html' },
  { code: 'n3_grammar_02', level: 'N3', category: 'grammar', sort_order: 20, item_ko: '비슷한 문형의 의미 차이와 쓰임 차이를 구분할 수 있다.', evidence_ko: 'N3 문법은 문장 안에서 적절한 표현 선택을 요구한다.', recommendation_ko: '헷갈리는 문형은 주체, 의도, 결과, 예문을 나눠 비교 노트를 만드세요.', source_name: 'JLPT N3 문제 목적', source_url: 'https://www.jlpt.jp/e/guideline/pdf/n3_e.pdf' },
  { code: 'n3_reading_01', level: 'N3', category: 'reading', sort_order: 10, item_ko: '짧은 안내문, 이메일, 공지문에서 핵심 정보를 빠르게 찾을 수 있다.', evidence_ko: 'N3는 일상적인 주제의 글을 읽고 내용을 이해하는 능력을 본다.', recommendation_ko: '읽기 전에 질문을 먼저 보고 날짜, 조건, 이유, 결론에 표시하면서 읽으세요.', source_name: 'JLPT 레벨 요약', source_url: 'https://jlpt.jp/sp/e/about/levelsummary.html' },
  { code: 'n3_reading_02', level: 'N3', category: 'reading', sort_order: 20, item_ko: '중간 길이의 글에서 필자의 주장과 이유를 구분할 수 있다.', evidence_ko: 'N3 독해는 글의 요지와 세부 정보를 함께 확인한다.', recommendation_ko: '문단마다 한 줄 요약을 한국어로 적고 마지막 문장에서 결론 표현을 찾으세요.', source_name: 'JLPT N3 문제 목적', source_url: 'https://www.jlpt.jp/e/guideline/pdf/n3_e.pdf' },
  { code: 'n3_listening_01', level: 'N3', category: 'listening', sort_order: 10, item_ko: '일상 대화에서 누가, 무엇을, 왜 하는지 핵심 정보를 들을 수 있다.', evidence_ko: 'N3 청해는 요지와 세부 정보를 듣고 이해하는 능력을 본다.', recommendation_ko: '스크립트를 보기 전 2회 듣고 사람, 장소, 행동, 이유만 받아 적으세요.', source_name: 'JLPT N3 문제 목적', source_url: 'https://www.jlpt.jp/e/guideline/pdf/n3_e.pdf' },
  { code: 'n3_listening_02', level: 'N3', category: 'listening', sort_order: 20, item_ko: '자연스러운 속도의 짧은 대화에서 정답 단서를 놓치지 않는다.', evidence_ko: 'N3 청해 시간은 40분이며 실제 속도 적응이 필요하다.', recommendation_ko: '브라우저 일본어 음성으로 먼저 듣고 스크립트를 보며 놓친 조사를 확인하세요.', source_name: 'JLPT 공식 시험 구성', source_url: 'https://www.jlpt.jp/e/guideline/testsections.html' },
  { code: 'n3_speaking_01', level: 'N3', category: 'speaking', sort_order: 10, item_ko: '일상 주제에 대해 3~5문장으로 내 의견과 이유를 말할 수 있다.', evidence_ko: 'JF Standard Can-do는 실제 상황에서 일본어로 무엇을 할 수 있는지에 초점을 둔다.', recommendation_ko: '오늘 배운 문형 하나를 써서 30초 자기 의견 말하기를 녹음하세요.', source_name: 'JF Standard Can-do', source_url: 'https://www.jfstandard.jpf.go.jp/summaryen/ja/render.do' },
  { code: 'n3_writing_01', level: 'N3', category: 'writing', sort_order: 10, item_ko: '배운 문형을 사용해 짧은 일기나 학습 기록을 일본어로 쓸 수 있다.', evidence_ko: 'Can-do는 실제 산출 활동도 학습 진단에 포함한다.', recommendation_ko: '하루 3문장 일본어 기록을 쓰고 문형, 어휘, 조사를 하나씩 점검하세요.', source_name: 'JF Standard Can-do', source_url: 'https://www.jfstandard.jpf.go.jp/summaryen/ja/render.do' },
  { code: 'n3_strategy_01', level: 'N3', category: 'strategy', sort_order: 10, item_ko: 'N3 시험의 3개 주요 영역과 시간 배분을 알고 있다.', evidence_ko: 'N3는 어휘 30분, 문법·독해 70분, 청해 40분으로 진행된다.', recommendation_ko: '주 1회는 실제 시간에 맞춰 어휘, 문법·독해, 청해 블록 학습을 해보세요.', source_name: 'JLPT 공식 시험 구성', source_url: 'https://www.jlpt.jp/e/guideline/testsections.html' },
  { code: 'n3_strategy_02', level: 'N3', category: 'strategy', sort_order: 20, item_ko: '최근 7일 학습에서 가장 약한 영역을 하나 고르고 보충 계획을 세울 수 있다.', evidence_ko: 'JLPT는 총점뿐 아니라 영역별 약점 관리가 중요하다.', recommendation_ko: '70점 미만 영역을 하나 골라 3일 보충 루틴을 만드세요.', source_name: 'JLPT 공식 성적 구분', source_url: 'https://www.jlpt.jp/e/guideline/results.html' },
];
