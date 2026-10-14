-- TOPIK placement V2: reviewed listening/reading surfaces and account-scoped attempts.
-- This migration adds schema only. Publishing/seeding the reviewed bank remains a manual release action.

ALTER TABLE `topik_placement_questions` ADD `bank_version` text NOT NULL DEFAULT 'v1';
--> statement-breakpoint
ALTER TABLE `topik_placement_questions` ADD `audio_script_ko` text;
--> statement-breakpoint
ALTER TABLE `topik_placement_questions` ADD `audio_r2_key` text;
--> statement-breakpoint
ALTER TABLE `topik_placement_questions` ADD `is_published` integer NOT NULL DEFAULT 0 CHECK (`is_published` IN (0, 1));
--> statement-breakpoint
CREATE INDEX `topik_placement_release_idx`
  ON `topik_placement_questions` (`learning_track`,`bank_version`,`is_published`,`section`,`difficulty`);
--> statement-breakpoint

CREATE TABLE `topik_placement_attempts` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `learning_track` text NOT NULL CHECK (`learning_track` = 'topik-ko'),
  `bank_version` text NOT NULL,
  `instruction_language` text NOT NULL CHECK (`instruction_language` IN ('ko', 'en')),
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
CREATE INDEX `topik_placement_response_question_idx`
  ON `topik_placement_responses` (`question_id`,`is_correct`);
