-- TOPIK owner-authored curriculum uses stable string item identifiers, while
-- the legacy JLPT SRS table is intentionally integer-keyed. Keep the two
-- domains separate so existing JLPT review history remains immutable.

CREATE TABLE `topik_owner_curriculum_progress` (
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `item_id` text NOT NULL REFERENCES `topik_owner_authored_curriculum_items`(`id`) ON DELETE RESTRICT,
  `status` text NOT NULL DEFAULT 'not_started'
    CHECK (`status` IN ('not_started', 'in_progress', 'completed')),
  `completed_at` integer,
  `last_studied_at` integer,
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  `updated_at` integer NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (`user_id`, `item_id`)
);
--> statement-breakpoint
CREATE INDEX `topik_owner_progress_user_status_idx`
  ON `topik_owner_curriculum_progress` (`user_id`, `status`, `updated_at`);
--> statement-breakpoint

CREATE TABLE `topik_owner_srs_cards` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `item_id` text NOT NULL REFERENCES `topik_owner_authored_curriculum_items`(`id`) ON DELETE RESTRICT,
  `state` text NOT NULL DEFAULT 'new'
    CHECK (`state` IN ('new', 'learning', 'review', 'relearning')),
  `stability` real NOT NULL DEFAULT 0,
  `difficulty` real NOT NULL DEFAULT 5,
  `due_at` integer NOT NULL DEFAULT (unixepoch()),
  `last_reviewed_at` integer,
  `lapses` integer NOT NULL DEFAULT 0,
  `reps` integer NOT NULL DEFAULT 0,
  `learning_steps_idx` integer NOT NULL DEFAULT 0,
  `desired_retention` real NOT NULL DEFAULT 0.9,
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  `updated_at` integer NOT NULL DEFAULT (unixepoch()),
  UNIQUE (`user_id`, `item_id`)
);
--> statement-breakpoint
CREATE INDEX `topik_owner_srs_cards_user_due_idx`
  ON `topik_owner_srs_cards` (`user_id`, `due_at`);
--> statement-breakpoint
CREATE INDEX `topik_owner_srs_cards_user_state_idx`
  ON `topik_owner_srs_cards` (`user_id`, `state`);
--> statement-breakpoint

CREATE TABLE `topik_owner_review_logs` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `card_id` integer NOT NULL REFERENCES `topik_owner_srs_cards`(`id`) ON DELETE CASCADE,
  `reviewed_at` integer NOT NULL DEFAULT (unixepoch()),
  `rating` text NOT NULL CHECK (`rating` IN ('again', 'hard', 'good', 'easy')),
  `elapsed_days` real NOT NULL DEFAULT 0,
  `scheduled_days` real NOT NULL DEFAULT 0,
  `response_ms` integer
);
--> statement-breakpoint
CREATE INDEX `topik_owner_review_logs_card_idx`
  ON `topik_owner_review_logs` (`card_id`);
--> statement-breakpoint
CREATE INDEX `topik_owner_review_logs_reviewed_at_idx`
  ON `topik_owner_review_logs` (`reviewed_at`);
