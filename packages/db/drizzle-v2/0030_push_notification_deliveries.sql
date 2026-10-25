-- Store the chosen UI language with the subscription. It is intentionally
-- separate from instruction_language because TOPIK content remains Korean while
-- a Japanese learner expects Japanese controls and reminders.
ALTER TABLE `push_subscriptions` ADD `notification_language` text
  CHECK (`notification_language` IS NULL OR `notification_language` IN ('ko', 'ja', 'en'));
--> statement-breakpoint
-- Idempotent daily Push delivery claims. A claim is created before network I/O
-- so duplicate or overlapping cron invocations cannot notify the same endpoint twice.
CREATE TABLE `push_notification_deliveries` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `endpoint` text NOT NULL,
  `local_date` text NOT NULL CHECK (`local_date` GLOB '????-??-??'),
  `schedule` text NOT NULL CHECK (`schedule` IN ('morning', 'evening')),
  `status` text NOT NULL CHECK (`status` IN ('claimed', 'sent')),
  `claimed_at` integer NOT NULL,
  `sent_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_notification_deliveries_endpoint_date_schedule_uk`
  ON `push_notification_deliveries` (`endpoint`, `local_date`, `schedule`);
