CREATE TABLE `audio_generation_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_type` text NOT NULL,
	`item_id` integer NOT NULL,
	`r2_key` text,
	`success` integer DEFAULT false NOT NULL,
	`provider` text,
	`content_hash` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audio_generation_log_created_idx` ON `audio_generation_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `audio_generation_log_item_idx` ON `audio_generation_log` (`item_type`,`item_id`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch()) NOT NULL,
	`revoked_at` integer,
	`user_agent` text,
	`ip` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_sessions_token_hash_unique` ON `auth_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_idx` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `auth_sessions_expires_idx` ON `auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`code` text NOT NULL,
	`name_ko` text NOT NULL,
	`name_ja` text,
	`order_idx` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_source_code_uk` ON `categories` (`source_id`,`code`);--> statement-breakpoint
CREATE TABLE `curriculum_weeks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week_no` integer NOT NULL,
	`theme` text NOT NULL,
	`vocab_target` integer DEFAULT 0 NOT NULL,
	`grammar_target` integer DEFAULT 0 NOT NULL,
	`kanji_target` integer DEFAULT 0 NOT NULL,
	`sentence_target` integer DEFAULT 0 NOT NULL,
	`milestone_test` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `curriculum_weeks_week_no_unique` ON `curriculum_weeks` (`week_no`);--> statement-breakpoint
CREATE TABLE `daily_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`source_code` text,
	`items_new` integer DEFAULT 0 NOT NULL,
	`items_review` integer DEFAULT 0 NOT NULL,
	`accuracy` real,
	`time_min` real DEFAULT 0 NOT NULL,
	`audio_min` real DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_logs_user_date_uk` ON `daily_logs` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `grammar` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`category_id` integer,
	`level` text NOT NULL,
	`pattern` text NOT NULL,
	`connection` text,
	`meaning_ko` text NOT NULL,
	`contrast_ko` text,
	`error_note` text,
	`examples` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `grammar_level_idx` ON `grammar` (`level`);--> statement-breakpoint
CREATE UNIQUE INDEX `grammar_natural_uk` ON `grammar` (`level`,`pattern`);--> statement-breakpoint
CREATE TABLE `homophone_pairs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`level` text NOT NULL,
	`word_a_id` integer NOT NULL,
	`word_b_id` integer NOT NULL,
	`note_ko` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`word_a_id`) REFERENCES `vocab`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`word_b_id`) REFERENCES `vocab`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `homophone_pair_uk` ON `homophone_pairs` (`word_a_id`,`word_b_id`);--> statement-breakpoint
CREATE INDEX `homophone_level_idx` ON `homophone_pairs` (`level`);--> statement-breakpoint
CREATE TABLE `kanji` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`char` text NOT NULL,
	`on_yomi` text,
	`kun_yomi` text,
	`meaning_ko` text NOT NULL,
	`stroke_count` integer,
	`radical` text,
	`jlpt_level` text NOT NULL,
	`frequency_rank` integer,
	`korean_hanja_pronunciation` text,
	`related_vocab_ids` text DEFAULT '[]' NOT NULL,
	`audio_r2_key` text,
	`audio_generation_attempts` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kanji_char_unique` ON `kanji` (`char`);--> statement-breakpoint
CREATE INDEX `kanji_jlpt_level_idx` ON `kanji` (`jlpt_level`);--> statement-breakpoint
CREATE TABLE `login_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`email` text,
	`provider` text NOT NULL,
	`event_type` text NOT NULL,
	`ip` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `login_events_user_idx` ON `login_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `login_events_created_idx` ON `login_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `oauth_login_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`consumed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `oauth_login_tokens_expires_idx` ON `oauth_login_tokens` (`expires_at`);--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`state_hash` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`consumed_at` integer
);
--> statement-breakpoint
CREATE INDEX `oauth_states_expires_idx` ON `oauth_states` (`expires_at`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`user_agent` text,
	`morning_on` integer DEFAULT true NOT NULL,
	`evening_on` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_seen_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_idx` ON `push_subscriptions` (`user_id`);--> statement-breakpoint
CREATE TABLE `quiz_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`quiz_type` text NOT NULL,
	`mode` text,
	`level` text,
	`week_no` integer,
	`total` integer DEFAULT 0 NOT NULL,
	`correct` integer DEFAULT 0 NOT NULL,
	`score` integer,
	`duration_sec` integer,
	`detail_json` text,
	`questions_json` text,
	`started_at` text,
	`finished_at` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quiz_attempts_user_idx` ON `quiz_attempts` (`user_id`);--> statement-breakpoint
CREATE INDEX `quiz_attempts_week_idx` ON `quiz_attempts` (`user_id`,`week_no`);--> statement-breakpoint
CREATE TABLE `quiz_question_bank` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mode` text NOT NULL,
	`level` text NOT NULL,
	`item_id` integer NOT NULL,
	`item_type` text NOT NULL,
	`prompt` text NOT NULL,
	`correct` text NOT NULL,
	`distractors` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `quiz_question_bank_mode_level_idx` ON `quiz_question_bank` (`mode`,`level`);--> statement-breakpoint
CREATE TABLE `reading_passages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`level` text NOT NULL,
	`genre` text NOT NULL,
	`title_ja` text NOT NULL,
	`body_ja` text NOT NULL,
	`body_ko` text NOT NULL,
	`word_count` integer DEFAULT 0 NOT NULL,
	`vocab_ids` text DEFAULT '[]' NOT NULL,
	`grammar_ids` text DEFAULT '[]' NOT NULL,
	`audio_r2_key` text,
	`source_attribution` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reading_passages_level_genre_idx` ON `reading_passages` (`level`,`genre`);--> statement-breakpoint
CREATE TABLE `reading_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`passage_id` integer NOT NULL,
	`question_ja` text NOT NULL,
	`question_ko` text NOT NULL,
	`choices_json` text NOT NULL,
	`answer_index` integer NOT NULL,
	`explanation_ko` text,
	FOREIGN KEY (`passage_id`) REFERENCES `reading_passages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reading_questions_passage_idx` ON `reading_questions` (`passage_id`);--> statement-breakpoint
CREATE TABLE `review_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`card_id` integer NOT NULL,
	`reviewed_at` integer DEFAULT (unixepoch()) NOT NULL,
	`rating` text NOT NULL,
	`elapsed_days` real DEFAULT 0 NOT NULL,
	`scheduled_days` real DEFAULT 0 NOT NULL,
	`response_ms` integer,
	FOREIGN KEY (`card_id`) REFERENCES `srs_cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `review_logs_card_idx` ON `review_logs` (`card_id`);--> statement-breakpoint
CREATE INDEX `review_logs_reviewed_at_idx` ON `review_logs` (`reviewed_at`);--> statement-breakpoint
CREATE TABLE `self_check` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`week_no` integer NOT NULL,
	`vocab_score` integer,
	`grammar_score` integer,
	`reading_score` integer,
	`listening_score` integer,
	`speaking_score` integer,
	`writing_score` integer,
	`domain_score` integer,
	`notes` text,
	`checked_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `self_check_user_week_uk` ON `self_check` (`user_id`,`week_no`);--> statement-breakpoint
CREATE TABLE `self_check_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`level` text DEFAULT 'N3' NOT NULL,
	`category` text NOT NULL,
	`sort_order` integer NOT NULL,
	`item_ko` text NOT NULL,
	`evidence_ko` text,
	`recommendation_ko` text NOT NULL,
	`source_name` text NOT NULL,
	`source_url` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `self_check_templates_code_unique` ON `self_check_templates` (`code`);--> statement-breakpoint
CREATE INDEX `self_check_templates_level_idx` ON `self_check_templates` (`level`,`category`,`sort_order`);--> statement-breakpoint
CREATE TABLE `sentences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`level` text NOT NULL,
	`register` text NOT NULL,
	`seq_no` integer DEFAULT 0 NOT NULL,
	`ja` text NOT NULL,
	`kana` text,
	`ko` text NOT NULL,
	`audio_r2_key` text,
	`audio_generation_attempts` integer DEFAULT 0 NOT NULL,
	`vocab_ids` text DEFAULT '[]' NOT NULL,
	`grammar_ids` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sentences_level_register_idx` ON `sentences` (`level`,`register`);--> statement-breakpoint
CREATE UNIQUE INDEX `sentences_source_seq_uk` ON `sentences` (`source_id`,`level`,`register`,`seq_no`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`file_path` text NOT NULL,
	`version` text DEFAULT '1.0.0' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sources_code_unique` ON `sources` (`code`);--> statement-breakpoint
CREATE TABLE `srs_cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`item_type` text NOT NULL,
	`item_id` integer NOT NULL,
	`state` text DEFAULT 'new' NOT NULL,
	`stability` real DEFAULT 0 NOT NULL,
	`difficulty` real DEFAULT 5 NOT NULL,
	`due_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_reviewed_at` integer,
	`lapses` integer DEFAULT 0 NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`learning_steps_idx` integer DEFAULT 0 NOT NULL,
	`desired_retention` real DEFAULT 0.9 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `srs_cards_due_idx` ON `srs_cards` (`user_id`,`due_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `srs_cards_natural_uk` ON `srs_cards` (`user_id`,`item_type`,`item_id`);--> statement-breakpoint
CREATE INDEX `srs_cards_state_idx` ON `srs_cards` (`user_id`,`state`);--> statement-breakpoint
CREATE TABLE `sysprog_terms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_code` text NOT NULL,
	`ja` text NOT NULL,
	`kana` text,
	`ko` text NOT NULL,
	`domain` text NOT NULL,
	`star_freq` integer DEFAULT false NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sysprog_natural_uk` ON `sysprog_terms` (`ja`,`domain`);--> statement-breakpoint
CREATE INDEX `sysprog_domain_idx` ON `sysprog_terms` (`domain`);--> statement-breakpoint
CREATE INDEX `sysprog_category_idx` ON `sysprog_terms` (`category_code`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`password_hash` text,
	`role` text DEFAULT 'user' NOT NULL,
	`auth_provider` text DEFAULT 'password' NOT NULL,
	`google_sub` text,
	`last_login_at` integer,
	`fsrs_options` text,
	`fsrs_weights` text,
	`srs_settings` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `vocab` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`category_id` integer,
	`level` text NOT NULL,
	`ja` text NOT NULL,
	`kana` text DEFAULT '' NOT NULL,
	`ko` text NOT NULL,
	`pos` text DEFAULT '' NOT NULL,
	`kanji_hint` text,
	`trap_note` text,
	`frequency_rank` integer,
	`tags` text DEFAULT '[]' NOT NULL,
	`audio_r2_key` text,
	`audio_generation_attempts` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `vocab_level_idx` ON `vocab` (`level`);--> statement-breakpoint
CREATE INDEX `vocab_category_idx` ON `vocab` (`category_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `vocab_natural_uk` ON `vocab` (`level`,`ja`,`kana`);