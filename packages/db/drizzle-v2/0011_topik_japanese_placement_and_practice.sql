-- TOPIK T3 expansion: Japanese-reviewed placement explanations and a separate,
-- self-authored TOPIK I/II practice bank. Official TOPIK questions and audio are
-- never stored in these tables.

ALTER TABLE `topik_placement_questions` ADD `prompt_ja` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `topik_placement_questions` ADD `explanation_ja` text NOT NULL DEFAULT '';
--> statement-breakpoint

-- SQLite cannot alter the CHECK constraint on instruction_language in place.
-- Preserve existing attempts/responses while allowing the Japanese explanation mode.
PRAGMA foreign_keys = OFF;
--> statement-breakpoint
ALTER TABLE `topik_placement_responses` RENAME TO `topik_placement_responses_legacy`;
--> statement-breakpoint
CREATE TABLE `topik_placement_attempts_v3` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `learning_track` text NOT NULL CHECK (`learning_track` = 'topik-ko'),
  `bank_version` text NOT NULL,
  `instruction_language` text NOT NULL CHECK (`instruction_language` IN ('ko', 'en', 'ja')),
  `status` text NOT NULL DEFAULT 'in_progress' CHECK (`status` IN ('in_progress', 'completed')),
  `question_ids_json` text NOT NULL,
  `score_total` integer,
  `score_listening` integer,
  `score_reading` integer,
  `result_band` text CHECK (`result_band` IS NULL OR `result_band` IN ('starter', 'foundation', 'ready')),
  `started_at` integer NOT NULL DEFAULT (unixepoch()),
  `completed_at` integer,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `topik_placement_attempts_v3`
  (`id`,`user_id`,`learning_track`,`bank_version`,`instruction_language`,`status`,`question_ids_json`,`score_total`,`score_listening`,`score_reading`,`result_band`,`started_at`,`completed_at`)
SELECT
  `id`,`user_id`,`learning_track`,`bank_version`,`instruction_language`,`status`,`question_ids_json`,`score_total`,`score_listening`,`score_reading`,`result_band`,`started_at`,`completed_at`
FROM `topik_placement_attempts`;
--> statement-breakpoint
DROP INDEX `topik_placement_attempt_user_idx`;
--> statement-breakpoint
DROP TABLE `topik_placement_attempts`;
--> statement-breakpoint
ALTER TABLE `topik_placement_attempts_v3` RENAME TO `topik_placement_attempts`;
--> statement-breakpoint
CREATE INDEX `topik_placement_attempt_user_idx`
  ON `topik_placement_attempts` (`user_id`,`learning_track`,`started_at`);
--> statement-breakpoint
CREATE TABLE `topik_placement_responses` (
  `attempt_id` text NOT NULL,
  `question_id` text NOT NULL,
  `selected_index` integer NOT NULL CHECK (`selected_index` >= 0),
  `is_correct` integer NOT NULL CHECK (`is_correct` IN (0, 1)),
  `answered_at` integer NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (`attempt_id`,`question_id`),
  FOREIGN KEY (`attempt_id`) REFERENCES `topik_placement_attempts`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`question_id`) REFERENCES `topik_placement_questions`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `topik_placement_responses` (`attempt_id`,`question_id`,`selected_index`,`is_correct`,`answered_at`)
SELECT `attempt_id`,`question_id`,`selected_index`,`is_correct`,`answered_at`
FROM `topik_placement_responses_legacy`;
--> statement-breakpoint
DROP TABLE `topik_placement_responses_legacy`;
--> statement-breakpoint
CREATE INDEX `topik_placement_response_question_idx`
  ON `topik_placement_responses` (`question_id`,`is_correct`);
--> statement-breakpoint
PRAGMA foreign_keys = ON;
--> statement-breakpoint

CREATE TABLE `topik_practice_questions` (
  `id` text PRIMARY KEY NOT NULL,
  `learning_track` text NOT NULL CHECK (`learning_track` = 'topik-ko'),
  `exam_level` text NOT NULL,
  `section` text NOT NULL CHECK (`section` IN ('listening', 'writing', 'reading')),
  `question_type` text NOT NULL CHECK (`question_type` IN ('choice', 'writing')),
  `skill` text NOT NULL,
  `difficulty` integer NOT NULL CHECK (`difficulty` BETWEEN 1 AND 5),
  `prompt_ko` text NOT NULL,
  `prompt_ja` text NOT NULL,
  `prompt_en` text NOT NULL,
  `choices_json` text NOT NULL DEFAULT '[]',
  `answer_index` integer,
  `explanation_ko` text NOT NULL,
  `explanation_ja` text NOT NULL,
  `explanation_en` text NOT NULL,
  `sample_answer_ko` text,
  `sample_answer_ja` text,
  `sample_answer_en` text,
  `audio_script_ko` text,
  `audio_r2_key` text,
  `source_code` text NOT NULL,
  `author_reviewer` text NOT NULL,
  `second_reviewer` text NOT NULL,
  `reviewed_at` text NOT NULL,
  `bank_version` text NOT NULL,
  `is_published` integer NOT NULL DEFAULT 0 CHECK (`is_published` IN (0, 1)),
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL,
  CHECK (
    (`question_type` = 'choice' AND `answer_index` IS NOT NULL)
    OR (`question_type` = 'writing' AND `answer_index` IS NULL)
  ),
  FOREIGN KEY (`learning_track`,`source_code`)
    REFERENCES `track_content_sources`(`learning_track`,`source_code`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`learning_track`,`exam_level`)
    REFERENCES `track_exam_levels`(`learning_track`,`exam_level`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `topik_practice_release_idx`
  ON `topik_practice_questions` (`learning_track`,`bank_version`,`is_published`,`exam_level`,`section`,`difficulty`);
--> statement-breakpoint
CREATE UNIQUE INDEX `topik_practice_prompt_uk`
  ON `topik_practice_questions` (`learning_track`,`exam_level`,`section`,`prompt_ko`);
