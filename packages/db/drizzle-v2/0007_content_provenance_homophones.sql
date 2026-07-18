ALTER TABLE `homophone_pairs` ADD COLUMN `word_a_source_code` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `homophone_pairs` ADD COLUMN `word_b_source_code` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `homophone_pairs` ADD COLUMN `accent_source` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `homophone_pairs` ADD COLUMN `accent_source_url` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `homophone_pairs` ADD COLUMN `accent_a` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `homophone_pairs` ADD COLUMN `accent_b` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `homophone_pairs` ADD COLUMN `example_a_ja` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `homophone_pairs` ADD COLUMN `example_a_ko` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `homophone_pairs` ADD COLUMN `example_b_ja` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `homophone_pairs` ADD COLUMN `example_b_ko` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `homophone_pairs` ADD COLUMN `reviewer` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `homophone_pairs` ADD COLUMN `reviewed_at` text NOT NULL DEFAULT '';--> statement-breakpoint
CREATE INDEX `homophone_reviewed_idx` ON `homophone_pairs` (`reviewed_at`);--> statement-breakpoint

CREATE TABLE `content_seed_runs` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `run_id` text NOT NULL,
  `content_version` text NOT NULL,
  `parser_version` text NOT NULL,
  `manifest_sha256` text NOT NULL,
  `generated_at` text NOT NULL,
  `applied_at` integer DEFAULT (unixepoch()) NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `content_seed_runs_run_id_uk` ON `content_seed_runs` (`run_id`);--> statement-breakpoint
CREATE INDEX `content_seed_runs_content_version_idx` ON `content_seed_runs` (`content_version`);--> statement-breakpoint

CREATE TABLE `content_seed_sources` (
  `seed_run_id` integer NOT NULL,
  `source_code` text NOT NULL,
  `source_checksum` text NOT NULL,
  `parser_version` text NOT NULL,
  `provenance_json` text NOT NULL,
  PRIMARY KEY (`seed_run_id`, `source_code`),
  FOREIGN KEY (`seed_run_id`) REFERENCES `content_seed_runs`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `content_seed_sources_source_idx` ON `content_seed_sources` (`source_code`);
