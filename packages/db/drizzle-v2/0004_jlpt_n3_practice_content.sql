-- Supplemental JLPT N3 practice content.
-- This file contains original study material, not copied JLPT exam questions.
-- It targets gaps found in the production DB: empty reading_passages and missing
-- scenario-based listening/conversation practice.

INSERT OR IGNORE INTO sources (code, title, file_path)
VALUES ('13', 'N3 실전 독해·청해 보강', 'packages/db/drizzle/0002_jlpt_n3_practice_content.sql');

INSERT OR IGNORE INTO sentences
  (source_id, level, register, seq_no, ja, ko, vocab_ids, grammar_ids)
VALUES
  ((SELECT id FROM sources WHERE code = '13'), 'N3', 'conversation', 1201,
   'A: 予約した時間を変更したいんですが、今日の午後は空いていますか。 B: 三時ならご案内できます。',
   '예약한 시간을 변경하고 싶은데 오늘 오후에 비어 있나요? / 세 시라면 안내해 드릴 수 있습니다.',
   '[]', '[]'),
  ((SELECT id FROM sources WHERE code = '13'), 'N3', 'conversation', 1202,
   '会議が長引いたため、駅に着くのが少し遅れそうです。',
   '회의가 길어진 탓에 역에 도착하는 것이 조금 늦어질 것 같습니다.',
   '[]', '[]'),
  ((SELECT id FROM sources WHERE code = '13'), 'N3', 'conversation', 1203,
   'この資料は急ぎではないので、確認してから返事をいただければ大丈夫です。',
   '이 자료는 급한 것이 아니므로 확인한 뒤 답장을 주시면 괜찮습니다.',
   '[]', '[]'),
  ((SELECT id FROM sources WHERE code = '13'), 'N3', 'conversation', 1204,
   '道に迷ったら、駅前の交番で聞くといいですよ。',
   '길을 잃으면 역 앞 파출소에서 물어보면 좋아요.',
   '[]', '[]'),
  ((SELECT id FROM sources WHERE code = '13'), 'N3', 'conversation', 1205,
   '説明を聞いたつもりでしたが、もう一度確認してもよろしいでしょうか。',
   '설명을 들었다고 생각했지만, 다시 한번 확인해도 괜찮을까요?',
   '[]', '[]'),
  ((SELECT id FROM sources WHERE code = '13'), 'N3', 'conversation', 1206,
   '天気予報によると、夕方から雨が強くなるそうです。',
   '일기예보에 따르면 저녁부터 비가 강해진다고 합니다.',
   '[]', '[]'),
  ((SELECT id FROM sources WHERE code = '13'), 'N3', 'conversation', 1207,
   'このアプリを使えば、復習する単語を自動で選んでくれます。',
   '이 앱을 사용하면 복습할 단어를 자동으로 골라 줍니다.',
   '[]', '[]'),
  ((SELECT id FROM sources WHERE code = '13'), 'N3', 'conversation', 1208,
   '時間がないわけではありませんが、先に重要な問題から解きたいです。',
   '시간이 없는 것은 아니지만, 먼저 중요한 문제부터 풀고 싶습니다.',
   '[]', '[]'),
  ((SELECT id FROM sources WHERE code = '13'), 'N3', 'conversation', 1209,
   '受付で名前を伝えたところ、すぐに担当者が来てくれました。',
   '접수처에서 이름을 말했더니 바로 담당자가 와 주었습니다.',
   '[]', '[]'),
  ((SELECT id FROM sources WHERE code = '13'), 'N3', 'conversation', 1210,
   '試験の前日は新しいことを覚えるより、間違えた問題を見直すことにしています。',
   '시험 전날에는 새로운 것을 외우기보다 틀린 문제를 다시 보기로 하고 있습니다.',
   '[]', '[]'),
  ((SELECT id FROM sources WHERE code = '13'), 'N3', 'conversation', 1211,
   '音声が速すぎる場合は、一度止めて、聞こえた言葉だけを書き出してください。',
   '음성이 너무 빠른 경우에는 한 번 멈추고 들린 말만 적어 보세요.',
   '[]', '[]'),
  ((SELECT id FROM sources WHERE code = '13'), 'N3', 'conversation', 1212,
   'この表現は失礼に聞こえることがあるので、目上の人には使わないほうがいいです。',
   '이 표현은 무례하게 들릴 수 있으므로 윗사람에게는 쓰지 않는 편이 좋습니다.',
   '[]', '[]');

INSERT INTO reading_passages
  (level, genre, title_ja, body_ja, body_ko, word_count, vocab_ids, grammar_ids, source_attribution)
SELECT
  'N3', 'email', '勉強会の日程変更',
  '田中さんへ。来週の勉強会ですが、参加者の都合により、水曜日から金曜日に変更することになりました。時間は午後七時からで、場所は前回と同じ会議室です。もし金曜日の参加が難しい場合は、木曜日までに連絡してください。資料は当日配りますので、事前に印刷する必要はありません。',
  '다나카 씨에게. 다음 주 스터디 모임은 참가자 사정으로 수요일에서 금요일로 변경하게 되었습니다. 시간은 오후 7시부터이고 장소는 지난번과 같은 회의실입니다. 금요일 참가가 어려운 경우 목요일까지 연락해 주세요. 자료는 당일 배부하므로 미리 인쇄할 필요는 없습니다.',
  126, '[]', '[]', 'original:n3-practice-email'
WHERE NOT EXISTS (
  SELECT 1 FROM reading_passages WHERE title_ja = '勉強会の日程変更' AND source_attribution = 'original:n3-practice-email'
);

INSERT INTO reading_passages
  (level, genre, title_ja, body_ja, body_ko, word_count, vocab_ids, grammar_ids, source_attribution)
SELECT
  'N3', 'notice', '図書館の利用時間',
  '市立図書館では、七月から利用時間を延長します。平日は午後八時まで、土曜日は午後六時まで利用できます。ただし、日曜日と祝日はこれまでどおり午後五時に閉館します。延長時間中は貸し出しと返却のみ行い、新しい利用カードの作成はできません。',
  '시립 도서관은 7월부터 이용 시간을 연장합니다. 평일은 오후 8시까지, 토요일은 오후 6시까지 이용할 수 있습니다. 단, 일요일과 공휴일은 지금까지와 같이 오후 5시에 문을 닫습니다. 연장 시간 중에는 대출과 반납만 가능하며 새 이용 카드 발급은 할 수 없습니다.',
  112, '[]', '[]', 'original:n3-practice-notice'
WHERE NOT EXISTS (
  SELECT 1 FROM reading_passages WHERE title_ja = '図書館の利用時間' AND source_attribution = 'original:n3-practice-notice'
);

INSERT INTO reading_passages
  (level, genre, title_ja, body_ja, body_ko, word_count, vocab_ids, grammar_ids, source_attribution)
SELECT
  'N3', 'instruction', '忘れ物をした時の手続き',
  '電車の中に忘れ物をした場合は、まず駅の係員に相談してください。忘れた時間、乗った電車、物の特徴をできるだけ詳しく伝えると、見つかる可能性が高くなります。見つかった物を受け取る時には、本人確認ができる書類が必要です。',
  '전철 안에 물건을 두고 내린 경우 먼저 역 직원에게 상담해 주세요. 잊어버린 시간, 탄 전철, 물건의 특징을 가능한 한 자세히 전하면 찾을 가능성이 높아집니다. 발견된 물건을 받을 때에는 본인 확인이 가능한 서류가 필요합니다.',
  116, '[]', '[]', 'original:n3-practice-instruction'
WHERE NOT EXISTS (
  SELECT 1 FROM reading_passages WHERE title_ja = '忘れ物をした時の手続き' AND source_attribution = 'original:n3-practice-instruction'
);

INSERT INTO reading_passages
  (level, genre, title_ja, body_ja, body_ko, word_count, vocab_ids, grammar_ids, source_attribution)
SELECT
  'N3', 'conversation', 'アルバイトの相談',
  'A: 最近、アルバイトを始めたんですが、仕事を覚えるのが思ったより大変です。 B: 最初は誰でもそうですよ。分からないことをそのままにしないで、早めに質問したほうがいいです。 A: そうですね。忙しそうで聞きにくかったんですが、メモを取りながら確認してみます。',
  'A: 최근 아르바이트를 시작했는데 일을 익히는 것이 생각보다 힘듭니다. B: 처음에는 누구나 그래요. 모르는 것을 그대로 두지 말고 빨리 질문하는 편이 좋습니다. A: 그렇군요. 바빠 보여서 묻기 어려웠지만 메모를 하면서 확인해 보겠습니다.',
  122, '[]', '[]', 'original:n3-practice-conversation'
WHERE NOT EXISTS (
  SELECT 1 FROM reading_passages WHERE title_ja = 'アルバイトの相談' AND source_attribution = 'original:n3-practice-conversation'
);

INSERT INTO reading_passages
  (level, genre, title_ja, body_ja, body_ko, word_count, vocab_ids, grammar_ids, source_attribution)
SELECT
  'N3', 'essay', '朝の時間の使い方',
  '朝の時間をどう使うかによって、一日の気分が変わる。以前の私は、起きてすぐスマートフォンを見ていたため、出かける準備がいつも遅れていた。最近は、まず水を飲み、十分だけ日本語の音声を聞くことにしている。短い時間でも続けると、勉強を始めるきっかけになる。',
  '아침 시간을 어떻게 쓰느냐에 따라 하루의 기분이 달라진다. 예전의 나는 일어나자마자 스마트폰을 보았기 때문에 외출 준비가 늘 늦었다. 최근에는 먼저 물을 마시고 10분만 일본어 음성을 듣기로 하고 있다. 짧은 시간이라도 계속하면 공부를 시작하는 계기가 된다.',
  129, '[]', '[]', 'original:n3-practice-essay'
WHERE NOT EXISTS (
  SELECT 1 FROM reading_passages WHERE title_ja = '朝の時間の使い方' AND source_attribution = 'original:n3-practice-essay'
);

INSERT INTO reading_questions
  (passage_id, question_ja, question_ko, choices_json, answer_index, explanation_ko)
SELECT p.id,
  '勉強会はいつ行われますか。',
  '스터디 모임은 언제 열립니까?',
  '["水曜日の午後七時","木曜日の午後七時","金曜日の午後七時","金曜日の午後五時"]',
  2,
  '본문에서 수요일에서 금요일로 변경되었고 시간은 오후 7시라고 했다.'
FROM reading_passages p
WHERE p.title_ja = '勉強会の日程変更'
  AND NOT EXISTS (SELECT 1 FROM reading_questions q WHERE q.passage_id = p.id AND q.question_ja = '勉強会はいつ行われますか。');

INSERT INTO reading_questions
  (passage_id, question_ja, question_ko, choices_json, answer_index, explanation_ko)
SELECT p.id,
  '資料について正しいことはどれですか。',
  '자료에 대해 맞는 것은 무엇입니까?',
  '["前日までに印刷する","当日配られる","メールで送られる","木曜日に取りに行く"]',
  1,
  '자료는 당일 배부하므로 사전 인쇄가 필요 없다고 했다.'
FROM reading_passages p
WHERE p.title_ja = '勉強会の日程変更'
  AND NOT EXISTS (SELECT 1 FROM reading_questions q WHERE q.passage_id = p.id AND q.question_ja = '資料について正しいことはどれですか。');

INSERT INTO reading_questions
  (passage_id, question_ja, question_ko, choices_json, answer_index, explanation_ko)
SELECT p.id,
  '土曜日は何時まで利用できますか。',
  '토요일에는 몇 시까지 이용할 수 있습니까?',
  '["午後五時","午後六時","午後七時","午後八時"]',
  1,
  '토요일은 오후 6시까지 이용할 수 있다고 했다.'
FROM reading_passages p
WHERE p.title_ja = '図書館の利用時間'
  AND NOT EXISTS (SELECT 1 FROM reading_questions q WHERE q.passage_id = p.id AND q.question_ja = '土曜日は何時まで利用できますか。');

INSERT INTO reading_questions
  (passage_id, question_ja, question_ko, choices_json, answer_index, explanation_ko)
SELECT p.id,
  '延長時間中にできないことは何ですか。',
  '연장 시간 중 할 수 없는 것은 무엇입니까?',
  '["本を返す","本を借りる","利用カードを作る","図書館に入る"]',
  2,
  '연장 시간에는 새 이용 카드 작성이 불가능하다고 했다.'
FROM reading_passages p
WHERE p.title_ja = '図書館の利用時間'
  AND NOT EXISTS (SELECT 1 FROM reading_questions q WHERE q.passage_id = p.id AND q.question_ja = '延長時間中にできないことは何ですか。');

INSERT INTO reading_questions
  (passage_id, question_ja, question_ko, choices_json, answer_index, explanation_ko)
SELECT p.id,
  '忘れ物を見つけやすくするために、何を伝える必要がありますか。',
  '분실물을 찾기 쉽게 하려면 무엇을 전해야 합니까?',
  '["駅の住所だけ","物の値段だけ","忘れた時間や物の特徴","係員の名前"]',
  2,
  '시간, 전철, 물건의 특징을 자세히 전하면 찾을 가능성이 높아진다고 했다.'
FROM reading_passages p
WHERE p.title_ja = '忘れ物をした時の手続き'
  AND NOT EXISTS (SELECT 1 FROM reading_questions q WHERE q.passage_id = p.id AND q.question_ja = '忘れ物を見つけやすくするために、何を伝える必要がありますか。');

INSERT INTO reading_questions
  (passage_id, question_ja, question_ko, choices_json, answer_index, explanation_ko)
SELECT p.id,
  '見つかった物を受け取る時、何が必要ですか。',
  '찾은 물건을 받을 때 무엇이 필요합니까?',
  '["本人確認の書類","新しい切符","駅の地図","電車の時刻表"]',
  0,
  '본문 마지막에서 본인 확인이 가능한 서류가 필요하다고 했다.'
FROM reading_passages p
WHERE p.title_ja = '忘れ物をした時の手続き'
  AND NOT EXISTS (SELECT 1 FROM reading_questions q WHERE q.passage_id = p.id AND q.question_ja = '見つかった物を受け取る時、何が必要ですか。');

INSERT INTO reading_questions
  (passage_id, question_ja, question_ko, choices_json, answer_index, explanation_ko)
SELECT p.id,
  'BさんはAさんに何をすすめていますか。',
  'B씨는 A씨에게 무엇을 권하고 있습니까?',
  '["仕事をやめること","一人で考えること","早めに質問すること","メモを捨てること"]',
  2,
  '모르는 것을 그대로 두지 말고 빨리 질문하는 편이 좋다고 했다.'
FROM reading_passages p
WHERE p.title_ja = 'アルバイトの相談'
  AND NOT EXISTS (SELECT 1 FROM reading_questions q WHERE q.passage_id = p.id AND q.question_ja = 'BさんはAさんに何をすすめていますか。');

INSERT INTO reading_questions
  (passage_id, question_ja, question_ko, choices_json, answer_index, explanation_ko)
SELECT p.id,
  'Aさんはこれからどうしますか。',
  'A씨는 앞으로 어떻게 하겠습니까?',
  '["何も聞かない","メモを取りながら確認する","仕事を休む","別の仕事を探す"]',
  1,
  'A는 메모를 하면서 확인해 보겠다고 말했다.'
FROM reading_passages p
WHERE p.title_ja = 'アルバイトの相談'
  AND NOT EXISTS (SELECT 1 FROM reading_questions q WHERE q.passage_id = p.id AND q.question_ja = 'Aさんはこれからどうしますか。');

INSERT INTO reading_questions
  (passage_id, question_ja, question_ko, choices_json, answer_index, explanation_ko)
SELECT p.id,
  '最近、筆者は朝に何をすることにしていますか。',
  '최근 글쓴이는 아침에 무엇을 하기로 하고 있습니까?',
  '["すぐスマートフォンを見る","水を飲んで日本語の音声を聞く","長い文章を書く","出かける準備をやめる"]',
  1,
  '최근에는 먼저 물을 마시고 10분 동안 일본어 음성을 듣는다고 했다.'
FROM reading_passages p
WHERE p.title_ja = '朝の時間の使い方'
  AND NOT EXISTS (SELECT 1 FROM reading_questions q WHERE q.passage_id = p.id AND q.question_ja = '最近、筆者は朝に何をすることにしていますか。');

INSERT INTO reading_questions
  (passage_id, question_ja, question_ko, choices_json, answer_index, explanation_ko)
SELECT p.id,
  '筆者が言いたいことは何ですか。',
  '글쓴이가 말하고 싶은 것은 무엇입니까?',
  '["短い習慣でも勉強のきっかけになる","朝は勉強してはいけない","スマートフォンは必ず必要だ","準備は遅れてもよい"]',
  0,
  '짧은 시간이라도 계속하면 공부를 시작하는 계기가 된다는 것이 핵심이다.'
FROM reading_passages p
WHERE p.title_ja = '朝の時間の使い方'
  AND NOT EXISTS (SELECT 1 FROM reading_questions q WHERE q.passage_id = p.id AND q.question_ja = '筆者が言いたいことは何ですか。');
