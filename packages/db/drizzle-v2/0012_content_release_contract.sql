-- Immutable, review-gated content release contract.
-- This migration creates a new path only; it does not rewrite N5~N3 IDs,
-- current TOPIK placement/practice rows, user data, or learning history.

CREATE TABLE `content_releases` (
  `id` text PRIMARY KEY NOT NULL,
  `learning_track` text NOT NULL CHECK (`learning_track` IN ('jlpt-ja', 'topik-ko')),
  `content_version` text NOT NULL,
  `release_state` text NOT NULL DEFAULT 'draft' CHECK (`release_state` IN ('draft', 'automated_checked', 'human_reviewed', 'preview', 'approved', 'published', 'withdrawn')),
  `manifest_sha256` text NOT NULL CHECK (length(`manifest_sha256`) = 64),
  `parser_version` text NOT NULL CHECK (length(trim(`parser_version`)) > 0),
  `published_at` integer,
  `withdrawn_at` integer,
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  `updated_at` integer NOT NULL DEFAULT (unixepoch()),
  UNIQUE (`learning_track`, `content_version`)
);
--> statement-breakpoint
CREATE INDEX `content_releases_state_idx` ON `content_releases` (`learning_track`, `release_state`);
--> statement-breakpoint

CREATE TABLE `content_release_sources` (
  `release_id` text NOT NULL REFERENCES `content_releases`(`id`) ON DELETE cascade,
  `source_code` text NOT NULL CHECK (length(trim(`source_code`)) > 0),
  `source_type` text NOT NULL CHECK (`source_type` IN ('self-authored', 'licensed-external', 'official-reference', 'fixture')),
  `source_url` text NOT NULL CHECK (`source_url` LIKE 'https://%'),
  `retrieved_at` text NOT NULL CHECK (length(`retrieved_at`) = 10),
  `source_sha256` text NOT NULL CHECK (length(`source_sha256`) = 64),
  `license_id` text NOT NULL CHECK (length(trim(`license_id`)) > 0),
  `license_url` text NOT NULL CHECK (`license_url` LIKE 'https://%'),
  `allowed_use` text NOT NULL CHECK (length(trim(`allowed_use`)) > 0),
  `attribution_text` text NOT NULL CHECK (length(trim(`attribution_text`)) > 0),
  `author` text NOT NULL CHECK (length(trim(`author`)) > 0),
  `first_reviewer` text NOT NULL CHECK (length(trim(`first_reviewer`)) > 0),
  `second_reviewer` text NOT NULL CHECK (length(trim(`second_reviewer`)) > 0 AND `second_reviewer` <> `first_reviewer`),
  `reviewed_at` text NOT NULL CHECK (length(`reviewed_at`) = 10),
  PRIMARY KEY (`release_id`, `source_code`)
);
--> statement-breakpoint

CREATE TABLE `topik_curriculum_units` (
  `id` text PRIMARY KEY NOT NULL,
  `release_id` text NOT NULL REFERENCES `content_releases`(`id`) ON DELETE restrict,
  `learning_track` text NOT NULL DEFAULT 'topik-ko' CHECK (`learning_track` = 'topik-ko'),
  `stable_ref` text NOT NULL CHECK (length(trim(`stable_ref`)) > 0),
  `exam_level` text NOT NULL CHECK (`exam_level` IN ('TOPIK-I', 'TOPIK-II')),
  `exam_band` text NOT NULL CHECK (`exam_band` IN ('beginner', 'intermediate', 'advanced')),
  `section` text NOT NULL CHECK (`section` IN ('listening', 'writing', 'reading')),
  `title_ko` text NOT NULL CHECK (length(trim(`title_ko`)) > 0),
  `title_ja` text NOT NULL CHECK (length(trim(`title_ja`)) > 0),
  `title_en` text NOT NULL CHECK (length(trim(`title_en`)) > 0),
  `instruction_languages_json` text NOT NULL CHECK (json_valid(`instruction_languages_json`)),
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  `updated_at` integer NOT NULL DEFAULT (unixepoch()),
  UNIQUE (`release_id`, `stable_ref`)
);
--> statement-breakpoint
CREATE INDEX `topik_curriculum_units_release_section_idx` ON `topik_curriculum_units` (`release_id`, `exam_level`, `section`);
--> statement-breakpoint

CREATE TABLE `topik_content_items` (
  `id` text PRIMARY KEY NOT NULL,
  `release_id` text NOT NULL REFERENCES `content_releases`(`id`) ON DELETE restrict,
  `unit_id` text NOT NULL REFERENCES `topik_curriculum_units`(`id`) ON DELETE restrict,
  `learning_track` text NOT NULL DEFAULT 'topik-ko' CHECK (`learning_track` = 'topik-ko'),
  `stable_ref` text NOT NULL CHECK (length(trim(`stable_ref`)) > 0),
  `exam_level` text NOT NULL CHECK (`exam_level` IN ('TOPIK-I', 'TOPIK-II')),
  `exam_band` text NOT NULL CHECK (`exam_band` IN ('beginner', 'intermediate', 'advanced')),
  `section` text NOT NULL CHECK (`section` IN ('listening', 'writing', 'reading')),
  `item_kind` text NOT NULL CHECK (`item_kind` IN ('lesson', 'vocab', 'grammar', 'character', 'listening', 'reading', 'writing', 'practice')),
  `skill` text NOT NULL CHECK (length(trim(`skill`)) > 0),
  `difficulty` integer NOT NULL CHECK (`difficulty` BETWEEN 1 AND 5),
  `prompt_ko` text NOT NULL CHECK (length(trim(`prompt_ko`)) > 0),
  `prompt_ja` text NOT NULL CHECK (length(trim(`prompt_ja`)) > 0),
  `prompt_en` text NOT NULL CHECK (length(trim(`prompt_en`)) > 0),
  `answer_payload_json` text NOT NULL CHECK (json_valid(`answer_payload_json`)),
  `explanation_ko` text NOT NULL CHECK (length(trim(`explanation_ko`)) > 0),
  `explanation_ja` text NOT NULL CHECK (length(trim(`explanation_ja`)) > 0),
  `explanation_en` text NOT NULL CHECK (length(trim(`explanation_en`)) > 0),
  `source_code` text NOT NULL,
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  `updated_at` integer NOT NULL DEFAULT (unixepoch()),
  UNIQUE (`release_id`, `stable_ref`),
  FOREIGN KEY (`release_id`, `source_code`) REFERENCES `content_release_sources`(`release_id`, `source_code`)
);
--> statement-breakpoint
CREATE INDEX `topik_content_items_release_lookup_idx` ON `topik_content_items` (`release_id`, `exam_level`, `section`, `item_kind`, `difficulty`);
--> statement-breakpoint

CREATE TRIGGER `content_releases_state_transition`
BEFORE UPDATE OF `release_state` ON `content_releases`
WHEN NOT (
  (`OLD`.`release_state` = 'draft' AND `NEW`.`release_state` = 'automated_checked') OR
  (`OLD`.`release_state` = 'automated_checked' AND `NEW`.`release_state` = 'human_reviewed') OR
  (`OLD`.`release_state` = 'human_reviewed' AND `NEW`.`release_state` = 'preview') OR
  (`OLD`.`release_state` = 'preview' AND `NEW`.`release_state` = 'approved') OR
  (`OLD`.`release_state` = 'approved' AND `NEW`.`release_state` = 'published') OR
  (`OLD`.`release_state` = 'published' AND `NEW`.`release_state` = 'withdrawn')
)
BEGIN
  SELECT RAISE(ABORT, 'invalid content release state transition');
END;
--> statement-breakpoint

CREATE TRIGGER `content_releases_review_gate`
BEFORE UPDATE OF `release_state` ON `content_releases`
WHEN `NEW`.`release_state` = 'human_reviewed' AND NOT EXISTS (
  SELECT 1 FROM `content_release_sources` s
  WHERE s.`release_id` = `NEW`.`id`
)
BEGIN
  SELECT RAISE(ABORT, 'human review requires complete provenance');
END;
--> statement-breakpoint

CREATE TRIGGER `content_releases_publish_gate`
BEFORE UPDATE OF `release_state` ON `content_releases`
WHEN `NEW`.`release_state` = 'published'
  AND `NEW`.`learning_track` = 'topik-ko'
  AND NOT EXISTS (
  SELECT 1 FROM `topik_content_items` i WHERE i.`release_id` = `NEW`.`id`
)
BEGIN
  SELECT RAISE(ABORT, 'published TOPIK release requires content items');
END;
--> statement-breakpoint

CREATE TRIGGER `topik_content_items_release_unit_match`
BEFORE INSERT ON `topik_content_items`
WHEN NOT EXISTS (
  SELECT 1 FROM `topik_curriculum_units` u
  WHERE u.`id` = `NEW`.`unit_id` AND u.`release_id` = `NEW`.`release_id`
)
BEGIN
  SELECT RAISE(ABORT, 'TOPIK item unit must belong to the same release');
END;
--> statement-breakpoint

CREATE TRIGGER `topik_content_items_immutable_after_publish`
BEFORE UPDATE ON `topik_content_items`
WHEN EXISTS (
  SELECT 1 FROM `content_releases` r
  WHERE r.`id` = `OLD`.`release_id` AND r.`release_state` IN ('published', 'withdrawn')
)
BEGIN
  SELECT RAISE(ABORT, 'published content items are immutable');
END;
--> statement-breakpoint

CREATE TRIGGER `topik_content_items_no_delete_after_publish`
BEFORE DELETE ON `topik_content_items`
WHEN EXISTS (
  SELECT 1 FROM `content_releases` r
  WHERE r.`id` = `OLD`.`release_id` AND r.`release_state` IN ('published', 'withdrawn')
)
BEGIN
  SELECT RAISE(ABORT, 'published content items cannot be deleted');
END;
