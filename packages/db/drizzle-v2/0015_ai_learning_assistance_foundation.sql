-- AI learning-assistance foundation. This migration stores no email, IP,
-- gateway payload, prompt cache, or raw learner free-text response.
-- It is forward-only and does not modify content releases, users, sessions,
-- SRS, or existing TOPIK/JLPT records.

CREATE TABLE `ai_assistance_usage_windows` (
  `learning_track` text NOT NULL CHECK (`learning_track` IN ('jlpt-ja', 'topik-ko')),
  `feature` text NOT NULL CHECK (`feature` IN ('content_lint', 'content_draft', 'grounded_explanation', 'topik_writing_feedback')),
  `user_bucket` text NOT NULL CHECK (length(`user_bucket`) = 64),
  `window_kind` text NOT NULL CHECK (`window_kind` IN ('minute', 'day', 'month')),
  `window_key` text NOT NULL CHECK (length(trim(`window_key`)) > 0),
  `request_count` integer NOT NULL DEFAULT 0 CHECK (`request_count` >= 0),
  `estimated_cost_microusd` integer NOT NULL DEFAULT 0 CHECK (`estimated_cost_microusd` >= 0),
  `updated_at` integer NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (`learning_track`, `feature`, `user_bucket`, `window_kind`, `window_key`)
);
--> statement-breakpoint
CREATE INDEX `ai_assistance_usage_window_expiry_idx`
  ON `ai_assistance_usage_windows` (`window_kind`, `window_key`, `updated_at`);
--> statement-breakpoint

CREATE TABLE `ai_assistance_circuit_breakers` (
  `learning_track` text NOT NULL CHECK (`learning_track` IN ('jlpt-ja', 'topik-ko')),
  `feature` text NOT NULL CHECK (`feature` IN ('content_lint', 'content_draft', 'grounded_explanation', 'topik_writing_feedback')),
  `consecutive_failures` integer NOT NULL DEFAULT 0 CHECK (`consecutive_failures` >= 0),
  `opened_until` integer,
  `updated_at` integer NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (`learning_track`, `feature`)
);
--> statement-breakpoint

CREATE TABLE `ai_assistance_audit_events` (
  `id` text PRIMARY KEY NOT NULL,
  `request_id` text NOT NULL UNIQUE,
  `learning_track` text NOT NULL CHECK (`learning_track` IN ('jlpt-ja', 'topik-ko')),
  `release_id` text REFERENCES `content_releases`(`id`) ON DELETE set null,
  `feature` text NOT NULL CHECK (`feature` IN ('content_lint', 'content_draft', 'grounded_explanation', 'topik_writing_feedback')),
  `prompt_version` text NOT NULL,
  `provider` text NOT NULL CHECK (`provider` IN ('disabled', 'workers-ai', 'ai-gateway', 'fallback')),
  `model` text,
  `user_bucket` text NOT NULL CHECK (length(`user_bucket`) = 64),
  `outcome` text NOT NULL CHECK (`outcome` IN ('success', 'fallback', 'blocked', 'disabled', 'invalid_output', 'provider_error')),
  `input_chars` integer NOT NULL DEFAULT 0 CHECK (`input_chars` >= 0),
  `output_chars` integer NOT NULL DEFAULT 0 CHECK (`output_chars` >= 0),
  `estimated_cost_microusd` integer NOT NULL DEFAULT 0 CHECK (`estimated_cost_microusd` >= 0),
  `expires_at` integer NOT NULL,
  `created_at` integer NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE INDEX `ai_assistance_audit_expiry_idx` ON `ai_assistance_audit_events` (`expires_at`);
--> statement-breakpoint

CREATE TABLE `ai_writing_feedback_records` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
  `learning_track` text NOT NULL CHECK (`learning_track` = 'topik-ko'),
  `release_id` text NOT NULL REFERENCES `content_releases`(`id`) ON DELETE restrict,
  `item_id` text NOT NULL REFERENCES `topik_content_items`(`id`) ON DELETE restrict,
  `input_sha256` text NOT NULL CHECK (length(`input_sha256`) = 64),
  `feedback_json` text NOT NULL CHECK (json_valid(`feedback_json`)),
  `prompt_version` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE INDEX `ai_writing_feedback_user_expiry_idx`
  ON `ai_writing_feedback_records` (`user_id`, `learning_track`, `expires_at`);
