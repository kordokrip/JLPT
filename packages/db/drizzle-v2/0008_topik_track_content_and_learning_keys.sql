-- TOPIK T2: track-aware mutable learning records and unpublished placement content.
-- Existing rows are JLPT data and retain the explicit jlpt-ja default.

ALTER TABLE `srs_cards` ADD `learning_track` text NOT NULL DEFAULT 'jlpt-ja';
--> statement-breakpoint
DROP INDEX `srs_cards_due_idx`;
--> statement-breakpoint
DROP INDEX `srs_cards_natural_uk`;
--> statement-breakpoint
DROP INDEX `srs_cards_state_idx`;
--> statement-breakpoint
CREATE INDEX `srs_cards_track_due_idx` ON `srs_cards` (`user_id`,`learning_track`,`due_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `srs_cards_track_natural_uk` ON `srs_cards` (`user_id`,`learning_track`,`item_type`,`item_id`);
--> statement-breakpoint
CREATE INDEX `srs_cards_track_state_idx` ON `srs_cards` (`user_id`,`learning_track`,`state`);
--> statement-breakpoint

ALTER TABLE `daily_logs` ADD `learning_track` text NOT NULL DEFAULT 'jlpt-ja';
--> statement-breakpoint
DROP INDEX `daily_logs_user_date_uk`;
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_logs_track_date_uk` ON `daily_logs` (`user_id`,`learning_track`,`date`);
--> statement-breakpoint

ALTER TABLE `quiz_attempts` ADD `learning_track` text NOT NULL DEFAULT 'jlpt-ja';
--> statement-breakpoint
DROP INDEX `quiz_attempts_user_idx`;
--> statement-breakpoint
DROP INDEX `quiz_attempts_week_idx`;
--> statement-breakpoint
CREATE INDEX `quiz_attempts_track_user_idx` ON `quiz_attempts` (`user_id`,`learning_track`,`created_at`);
--> statement-breakpoint
CREATE INDEX `quiz_attempts_track_week_idx` ON `quiz_attempts` (`user_id`,`learning_track`,`week_no`);
--> statement-breakpoint

ALTER TABLE `self_check` ADD `learning_track` text NOT NULL DEFAULT 'jlpt-ja';
--> statement-breakpoint
DROP INDEX `self_check_user_week_uk`;
--> statement-breakpoint
CREATE UNIQUE INDEX `self_check_track_week_uk` ON `self_check` (`user_id`,`learning_track`,`week_no`);
--> statement-breakpoint

ALTER TABLE `self_check_templates` ADD `learning_track` text NOT NULL DEFAULT 'jlpt-ja';
--> statement-breakpoint
CREATE INDEX `self_check_templates_track_level_idx` ON `self_check_templates` (`learning_track`,`level`,`category`,`sort_order`);
--> statement-breakpoint

CREATE TABLE `track_srs_settings` (
  `user_id` text NOT NULL,
  `learning_track` text NOT NULL,
  `fsrs_options` text,
  `fsrs_weights` text,
  `srs_settings` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL,
  PRIMARY KEY (`user_id`,`learning_track`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT OR IGNORE INTO `track_srs_settings`
  (`user_id`,`learning_track`,`fsrs_options`,`fsrs_weights`,`srs_settings`)
SELECT `id`, 'jlpt-ja', `fsrs_options`, `fsrs_weights`, `srs_settings`
FROM `users`;
--> statement-breakpoint

CREATE TABLE `track_content_sources` (
  `learning_track` text NOT NULL,
  `source_code` text NOT NULL,
  `title` text NOT NULL,
  `file_path` text NOT NULL,
  `source_version` text NOT NULL,
  `provenance_json` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL,
  PRIMARY KEY (`learning_track`,`source_code`)
);
--> statement-breakpoint

CREATE TABLE `track_exam_levels` (
  `learning_track` text NOT NULL,
  `exam_level` text NOT NULL,
  `sort_order` integer NOT NULL,
  `label_en` text NOT NULL,
  `label_ko` text NOT NULL,
  `sections_json` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL,
  PRIMARY KEY (`learning_track`,`exam_level`)
);
--> statement-breakpoint

CREATE TABLE `track_content_seed_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `learning_track` text NOT NULL,
  `content_version` text NOT NULL,
  `parser_version` text NOT NULL,
  `manifest_sha256` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  UNIQUE (`learning_track`,`content_version`)
);
--> statement-breakpoint

CREATE TABLE `track_content_seed_sources` (
  `seed_run_id` text NOT NULL,
  `learning_track` text NOT NULL,
  `source_code` text NOT NULL,
  `source_checksum` text NOT NULL,
  `parser_version` text NOT NULL,
  `provenance_json` text NOT NULL,
  PRIMARY KEY (`seed_run_id`,`source_code`),
  FOREIGN KEY (`seed_run_id`) REFERENCES `track_content_seed_runs`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`learning_track`,`source_code`)
    REFERENCES `track_content_sources`(`learning_track`,`source_code`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint

CREATE TABLE `topik_placement_questions` (
  `id` text PRIMARY KEY NOT NULL,
  `learning_track` text NOT NULL CHECK (`learning_track` = 'topik-ko'),
  `exam_level` text NOT NULL,
  `section` text NOT NULL,
  `skill` text NOT NULL,
  `difficulty` integer NOT NULL CHECK (`difficulty` BETWEEN 1 AND 5),
  `prompt_ko` text NOT NULL,
  `prompt_en` text NOT NULL,
  `gloss_en` text NOT NULL,
  `choices_json` text NOT NULL,
  `answer_index` integer NOT NULL CHECK (`answer_index` >= 0),
  `explanation_en` text NOT NULL,
  `explanation_ko` text NOT NULL,
  `source_code` text NOT NULL,
  `author_reviewer` text NOT NULL,
  `second_reviewer` text NOT NULL,
  `reviewed_at` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`learning_track`,`source_code`)
    REFERENCES `track_content_sources`(`learning_track`,`source_code`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`learning_track`,`exam_level`)
    REFERENCES `track_exam_levels`(`learning_track`,`exam_level`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `topik_placement_level_section_idx`
  ON `topik_placement_questions` (`learning_track`,`exam_level`,`section`,`difficulty`);
