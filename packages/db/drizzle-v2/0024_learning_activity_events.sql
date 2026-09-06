-- Normalized, privacy-minimized learning activity. Event ownership is always
-- assigned by the authenticated Worker; clients never provide a user id.

CREATE TABLE `learning_activity_events` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `event_id` text NOT NULL CHECK (length(trim(`event_id`)) BETWEEN 1 AND 128),
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
  `learning_track` text NOT NULL CHECK (`learning_track` IN ('jlpt-ja', 'topik-ko')),
  `event_type` text NOT NULL CHECK (`event_type` IN (
    'content_opened', 'content_completed', 'quiz_answered', 'review_rated', 'speech_attempted'
  )),
  `content_type` text CHECK (`content_type` IS NULL OR length(trim(`content_type`)) BETWEEN 1 AND 64),
  `content_id` text CHECK (`content_id` IS NULL OR length(trim(`content_id`)) BETWEEN 1 AND 128),
  `level_tag` text CHECK (`level_tag` IS NULL OR length(trim(`level_tag`)) BETWEEN 1 AND 32),
  `section` text CHECK (`section` IS NULL OR length(trim(`section`)) BETWEEN 1 AND 32),
  `mode` text CHECK (`mode` IS NULL OR `mode` IN ('vocab_mc', 'grammar_fill', 'kanji_reading', 'listening')),
  `correct` integer CHECK (`correct` IS NULL OR `correct` IN (0, 1)),
  `rating` text CHECK (`rating` IS NULL OR `rating` IN ('again', 'hard', 'good', 'easy')),
  `duration_ms` integer CHECK (`duration_ms` IS NULL OR `duration_ms` >= 0),
  `speech_outcome` text CHECK (`speech_outcome` IS NULL OR `speech_outcome` IN ('played', 'unavailable', 'error')),
  `occurred_at` integer NOT NULL CHECK (`occurred_at` > 0),
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  UNIQUE (`user_id`, `event_id`),
  CHECK (`event_type` <> 'quiz_answered' OR (`content_type` IS NOT NULL AND `content_id` IS NOT NULL AND `correct` IS NOT NULL)),
  CHECK (`event_type` <> 'review_rated' OR (`content_type` IS NOT NULL AND `content_id` IS NOT NULL AND `rating` IS NOT NULL)),
  CHECK (`event_type` <> 'speech_attempted' OR (`content_type` IS NOT NULL AND `content_id` IS NOT NULL AND `speech_outcome` IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX `learning_activity_events_user_track_time_idx`
  ON `learning_activity_events` (`user_id`, `learning_track`, `occurred_at` DESC);
--> statement-breakpoint
CREATE INDEX `learning_activity_events_user_content_time_idx`
  ON `learning_activity_events` (`user_id`, `learning_track`, `content_type`, `content_id`, `occurred_at` DESC);

