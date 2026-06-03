-- Self-check templates and expanded score axes.
-- Sources used for the diagnostic axes:
-- - JLPT official test sections/scoring sections
-- - JLPT official Can-do Self-Evaluation List
-- - JF Standard Can-do framework

ALTER TABLE self_check ADD COLUMN reading_score INTEGER CHECK (reading_score BETWEEN 0 AND 100);
ALTER TABLE self_check ADD COLUMN speaking_score INTEGER CHECK (speaking_score BETWEEN 0 AND 100);

CREATE TABLE IF NOT EXISTS self_check_templates (
  id                INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  code              TEXT    NOT NULL UNIQUE,
  level             TEXT    NOT NULL DEFAULT 'N3',
  category          TEXT    NOT NULL,
  sort_order        INTEGER NOT NULL,
  item_ko           TEXT    NOT NULL,
  evidence_ko       TEXT,
  recommendation_ko TEXT    NOT NULL,
  source_name       TEXT    NOT NULL,
  source_url        TEXT    NOT NULL,
  created_at        INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at        INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS self_check_templates_level_idx
  ON self_check_templates (level, category, sort_order);

DELETE FROM self_check_templates WHERE level = 'N3';

INSERT INTO self_check_templates
  (code, level, category, sort_order, item_ko, evidence_ko, recommendation_ko, source_name, source_url)
VALUES
('n3_vocab_01', 'N3', 'vocab', 10, 'N3 지문에서 모르는 단어가 있어도 앞뒤 문맥으로 뜻을 추정할 수 있다.', 'JLPT N3는 어휘와 문맥 이해를 언어지식 영역에서 확인한다.', '매일 N3 어휘 20개를 예문과 함께 SRS에 추가하고, 모르는 단어는 단독 암기보다 문장 단위로 복습하세요.', 'JLPT Composition of Test Sections and Items', 'https://www.jlpt.jp/e/guideline/testsections.html'),
('n3_vocab_02', 'N3', 'vocab', 20, '한자로 쓰인 N3 빈출 단어의 읽기와 의미를 함께 떠올릴 수 있다.', 'JLPT N3 어휘 영역에는 한자 읽기와 표기 이해가 포함된다.', '한자-읽기-뜻을 한 카드에 묶어 복습하고, 오답 한자는 같은 부수/음독 단어 3개와 같이 정리하세요.', 'JLPT N3 Purposes of Test Items', 'https://www.jlpt.jp/e/guideline/pdf/n3_e.pdf'),
('n3_vocab_03', 'N3', 'vocab', 30, '비슷한 뜻의 단어가 있을 때 문장에 맞는 단어를 고를 수 있다.', '어휘 문제는 단어의 의미뿐 아니라 문장 안의 적절한 사용을 묻는다.', '동의어를 따로 외우지 말고 “같이 쓰이는 조사/동사/명사”까지 짝지어 비교 노트를 만드세요.', 'JLPT N3 Purposes of Test Items', 'https://www.jlpt.jp/e/guideline/pdf/n3_e.pdf'),
('n3_vocab_04', 'N3', 'vocab', 40, '외래어, 부사, 접속 표현이 들어간 일상 문장을 읽고 자연스럽게 해석할 수 있다.', 'N3는 일상적인 장면의 일본어를 어느 정도 이해하는 수준을 목표로 한다.', '카타카나어와 부사는 예문 음성으로 같이 듣고, 한국어 직역 대신 상황별 의미를 적어두세요.', 'JLPT Level Summary', 'https://jlpt.jp/sp/e/about/levelsummary.html'),

('n3_grammar_01', 'N3', 'grammar', 10, 'N3 문형을 보고 “의미, 접속, 쓰는 상황”을 함께 설명할 수 있다.', 'JLPT N3는 문법 지식과 독해를 같은 시험 시간 안에서 확인한다.', '문형 암기는 뜻만 보지 말고 접속 형태와 예문 2개를 같이 소리 내어 읽으세요.', 'JLPT Composition of Test Sections and Items', 'https://www.jlpt.jp/e/guideline/testsections.html'),
('n3_grammar_02', 'N3', 'grammar', 20, '비슷한 문형(〜ように, 〜ために, 〜ことにする 등)의 차이를 구분할 수 있다.', 'N3 문법은 문장 안에서 적절한 표현 선택을 요구한다.', '헷갈리는 문형은 한 표에 “주체, 의도, 결과, 예문”을 나눠 정리하고 오답 문장을 다시 만드세요.', 'JLPT N3 Purposes of Test Items', 'https://www.jlpt.jp/e/guideline/pdf/n3_e.pdf'),
('n3_grammar_03', 'N3', 'grammar', 30, '긴 문장에서 수식 관계와 접속 표현을 따라가며 문장 구조를 파악할 수 있다.', 'N3의 문법·독해 영역은 문장 단위 이해와 담화 이해를 함께 본다.', '긴 문장은 끊어 읽기 표시를 하고, 수식어가 어느 명사를 꾸미는지 화살표로 표시해 보세요.', 'JLPT N3 Purposes of Test Items', 'https://www.jlpt.jp/e/guideline/pdf/n3_e.pdf'),
('n3_grammar_04', 'N3', 'grammar', 40, '문장 배열 문제처럼 흐름에 맞게 문장을 재구성할 수 있다.', 'N3 문법 문제에는 문장 구성 능력을 확인하는 형식이 포함된다.', '문장 배열 오답은 “접속어, 지시어, 시제”만 따로 표시하고 다시 순서를 맞춰보세요.', 'JLPT N3 Purposes of Test Items', 'https://www.jlpt.jp/e/guideline/pdf/n3_e.pdf'),

('n3_reading_01', 'N3', 'reading', 10, '짧은 안내문, 이메일, 공지문에서 핵심 정보를 빠르게 찾을 수 있다.', 'JLPT N3는 일상적인 주제의 글을 읽고 내용을 이해하는 능력을 본다.', '읽기 전에 질문을 먼저 보고 날짜, 조건, 이유, 결론에 표시하면서 읽으세요.', 'JLPT Level Summary', 'https://jlpt.jp/sp/e/about/levelsummary.html'),
('n3_reading_02', 'N3', 'reading', 20, '중간 길이의 글에서 필자의 주장과 이유를 구분할 수 있다.', 'N3 독해는 글의 요지와 세부 정보를 함께 확인한다.', '문단마다 한 줄 요약을 한국어로 적고, 마지막 문장에서 결론 표현을 찾아보세요.', 'JLPT N3 Purposes of Test Items', 'https://www.jlpt.jp/e/guideline/pdf/n3_e.pdf'),
('n3_reading_03', 'N3', 'reading', 30, '모르는 표현이 있어도 전체 흐름을 놓치지 않고 읽을 수 있다.', 'N3는 약간 어려운 일상 일본어도 이해할 수 있는 중간 수준을 다룬다.', '모르는 단어를 즉시 검색하지 말고 먼저 문단 의미를 추측한 뒤 정답 확인 후 단어장을 보완하세요.', 'JLPT Level Summary', 'https://jlpt.jp/sp/e/about/levelsummary.html'),
('n3_reading_04', 'N3', 'reading', 40, '시간 제한 안에서 독해 문제를 풀 때 쉬운 문제와 어려운 문제를 구분해 순서를 조절할 수 있다.', 'N3 문법·독해 시험 시간은 70분으로 시간 관리가 중요하다.', '독해는 1문항당 제한 시간을 정하고, 2분 이상 막히면 표시 후 다음 문제로 넘어가는 연습을 하세요.', 'JLPT Composition of Test Sections and Items', 'https://www.jlpt.jp/e/guideline/testsections.html'),

('n3_listening_01', 'N3', 'listening', 10, '일상 대화에서 누가, 무엇을, 왜 하는지 핵심 정보를 들을 수 있다.', 'JLPT N3 청해는 대화와 설명을 듣고 요지와 세부 정보를 이해하는 능력을 본다.', '스크립트를 보기 전 2회 듣고, 사람/장소/행동/이유만 네 칸으로 받아 적으세요.', 'JLPT N3 Purposes of Test Items', 'https://www.jlpt.jp/e/guideline/pdf/n3_e.pdf'),
('n3_listening_02', 'N3', 'listening', 20, '자연스러운 속도의 짧은 대화에서 정답 단서를 놓치지 않는다.', 'JLPT N3 청해 시간은 40분이며 실제 속도 적응이 필요하다.', '앱 청해 퀴즈는 브라우저 일본어 음성으로 먼저 듣고, 서버 오디오와 비교해 어색한 발음은 스크립트로 확인하세요.', 'JLPT Composition of Test Sections and Items', 'https://www.jlpt.jp/e/guideline/testsections.html'),
('n3_listening_03', 'N3', 'listening', 30, '질문을 먼저 듣고 필요한 정보를 예상한 뒤 대화를 들을 수 있다.', 'N3 청해에는 과제 이해와 포인트 이해 유형이 있다.', '듣기 전 선택지를 보고 숫자, 장소, 행동처럼 들을 목표를 미리 정하세요.', 'JLPT N3 Purposes of Test Items', 'https://www.jlpt.jp/e/guideline/pdf/n3_e.pdf'),
('n3_listening_04', 'N3', 'listening', 40, '들은 내용을 한국어로만 번역하지 않고 일본어 표현 그대로 다시 말할 수 있다.', 'Can-do 자기평가는 실제 언어 사용 능력을 보조적으로 확인한다.', '짧은 문장은 듣고 멈춘 뒤 그대로 따라 말하는 shadowing을 5문장씩 반복하세요.', 'JLPT Can-do Self-Evaluation List', 'https://www.jlpt.jp/e/about/pdf/cdslist_e_all.pdf'),

('n3_speaking_01', 'N3', 'speaking', 10, '일상 주제에 대해 3~5문장으로 내 의견과 이유를 말할 수 있다.', 'JF Standard Can-do는 실제 상황에서 일본어로 무엇을 할 수 있는지에 초점을 둔다.', '오늘 배운 문형 하나를 써서 30초 자기 의견 말하기를 녹음하고 다시 들어보세요.', 'JF Standard Can-do', 'https://www.jfstandard.jpf.go.jp/summaryen/ja/render.do'),
('n3_speaking_02', 'N3', 'speaking', 20, '상대의 질문을 듣고 짧게 되묻거나 확인하는 표현을 사용할 수 있다.', 'Can-do 기반 진단은 상호작용 능력을 점검하는 데 유용하다.', '聞き返し 표현(もう一度お願いします, つまり〜ですか)을 상황별로 5개 암기하세요.', 'JF Standard Can-do', 'https://www.jfstandard.jpf.go.jp/summaryen/ja/render.do'),
('n3_speaking_03', 'N3', 'speaking', 30, '발음과 억양을 의식하며 예문을 따라 읽을 수 있다.', '청해와 실제 사용 능력은 음성 입력과 출력 훈련이 함께 필요하다.', '오디오가 어색하게 들린 문장은 브라우저 일본어 음성으로 바꿔 듣고, 한 문장을 3회 따라 읽으세요.', 'JLPT Can-do Self-Evaluation List', 'https://www.jlpt.jp/e/about/pdf/cdslist_e_all.pdf'),

('n3_writing_01', 'N3', 'writing', 10, '배운 문형을 사용해 짧은 일기나 학습 기록을 일본어로 쓸 수 있다.', 'JF Standard Can-do는 실제 산출 활동도 학습 진단에 포함한다.', '하루 3문장 일본어 기록을 쓰고, 문형/어휘/조사를 각각 하나씩 점검하세요.', 'JF Standard Can-do', 'https://www.jfstandard.jpf.go.jp/summaryen/ja/render.do'),
('n3_writing_02', 'N3', 'writing', 20, '이메일이나 메모에서 목적, 요청, 이유를 간단히 쓸 수 있다.', '실제 의사소통 상황의 Can-do는 시험 외 학습 방향을 잡는 데 도움이 된다.', '공지/요청/사과 템플릿을 1개씩 만들고 N3 문형으로 바꿔 쓰는 연습을 하세요.', 'JF Standard Can-do', 'https://www.jfstandard.jpf.go.jp/summaryen/ja/render.do'),
('n3_writing_03', 'N3', 'writing', 30, '오답 문장을 보고 왜 틀렸는지 한국어로 설명한 뒤 일본어로 다시 고칠 수 있다.', '자기진단은 오답 원인 분석과 보충 학습 계획으로 이어질 때 효과적이다.', '오답은 “단어 부족, 문법 혼동, 독해 착각, 청해 놓침” 중 하나로 태그를 붙이고 다시 쓰세요.', 'JF Standard Can-do', 'https://www.jfstandard.jpf.go.jp/summaryen/ja/render.do'),

('n3_strategy_01', 'N3', 'strategy', 10, 'N3 시험의 3개 주요 영역과 시간 배분을 알고 있다.', 'N3는 어휘 30분, 문법·독해 70분, 청해 40분으로 진행된다.', '주 1회는 실제 시간에 맞춰 어휘 30분, 문법·독해 70분, 청해 40분 블록 학습을 해보세요.', 'JLPT Composition of Test Sections and Items', 'https://www.jlpt.jp/e/guideline/testsections.html'),
('n3_strategy_02', 'N3', 'strategy', 20, '최근 7일 학습에서 가장 약한 영역을 하나 고르고 보충 계획을 세울 수 있다.', 'JLPT는 총점뿐 아니라 영역별 약점 관리가 중요하다.', '오늘 저장한 자기진단 점수 중 70점 미만 영역을 하나 골라 3일 보충 루틴을 만드세요.', 'JLPT Scoring Sections, Pass or Fail, Score Report', 'https://www.jlpt.jp/e/guideline/results.html'),
('n3_strategy_03', 'N3', 'strategy', 30, '복습, 퀴즈, 독해, 청해를 주간 루틴으로 나누어 꾸준히 실행하고 있다.', '시험 대비는 지식과 실제 이해 활동을 함께 반복해야 한다.', '평일은 SRS+짧은 청해, 주말은 독해+모의 퀴즈처럼 루틴을 고정하세요.', 'JLPT Can-do Self-Evaluation List', 'https://www.jlpt.jp/e/about/pdf/cdslist_e_all.pdf');
