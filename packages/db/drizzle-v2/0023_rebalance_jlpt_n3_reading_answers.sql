-- Rebalance the ten self-authored N3 reading questions without changing the
-- passages, question wording, explanations, or correct answer meaning.
-- Target distribution by answer_index is [3,2,2,3], so no static answer
-- position is favored (maximum count difference is one).

UPDATE `reading_questions`
SET `choices_json` = '["水曜日の午後七時","木曜日の午後七時","金曜日の午後五時","金曜日の午後七時"]',
    `answer_index` = 3
WHERE `question_ja` = '勉強会はいつ行われますか。';
--> statement-breakpoint
UPDATE `reading_questions`
SET `choices_json` = '["前日までに印刷する","メールで送られる","当日配られる","木曜日に取りに行く"]',
    `answer_index` = 2
WHERE `question_ja` = '資料について正しいことはどれですか。';
--> statement-breakpoint
UPDATE `reading_questions`
SET `choices_json` = '["午後五時","午後七時","午後八時","午後六時"]',
    `answer_index` = 3
WHERE `question_ja` = '土曜日は何時まで利用できますか。';
--> statement-breakpoint
UPDATE `reading_questions`
SET `choices_json` = '["利用カードを作る","本を返す","本を借りる","図書館に入る"]',
    `answer_index` = 0
WHERE `question_ja` = '延長時間中にできないことは何ですか。';
--> statement-breakpoint
UPDATE `reading_questions`
SET `choices_json` = '["駅の住所だけ","忘れた時間や物の特徴","物の値段だけ","係員の名前"]',
    `answer_index` = 1
WHERE `question_ja` = '忘れ物を見つけやすくするために、何を伝える必要がありますか。';
--> statement-breakpoint
UPDATE `reading_questions`
SET `choices_json` = '["新しい切符","駅の地図","本人確認の書類","電車の時刻表"]',
    `answer_index` = 2
WHERE `question_ja` = '見つかった物を受け取る時、何が必要ですか。';
--> statement-breakpoint
UPDATE `reading_questions`
SET `choices_json` = '["早めに質問すること","仕事をやめること","一人で考えること","メモを捨てること"]',
    `answer_index` = 0
WHERE `question_ja` = 'BさんはAさんに何をすすめていますか。';
--> statement-breakpoint
UPDATE `reading_questions`
SET `choices_json` = '["何も聞かない","仕事を休む","別の仕事を探す","メモを取りながら確認する"]',
    `answer_index` = 3
WHERE `question_ja` = 'Aさんはこれからどうしますか。';
