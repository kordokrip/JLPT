-- Preserve the established N5–N3 representative level for an existing kanji.
-- A higher-level curriculum can refer to the same character through the
-- additive level-reference table below; it must not relabel the canonical row.

CREATE TABLE `learning_content_level_references` (
  `id` text PRIMARY KEY NOT NULL,
  `learning_track` text NOT NULL CHECK (`learning_track` IN ('jlpt-ja', 'topik-ko')),
  `curriculum_level` text NOT NULL CHECK (length(trim(`curriculum_level`)) > 0),
  `item_type` text NOT NULL CHECK (`item_type` IN (
    'jlpt-vocab', 'jlpt-grammar', 'jlpt-kanji', 'jlpt-sentence', 'jlpt-reading', 'topik-owner-item'
  )),
  `item_id` text NOT NULL CHECK (length(trim(`item_id`)) > 0),
  `reference_kind` text NOT NULL CHECK (`reference_kind` IN ('primary', 'prerequisite')),
  `source_asset_id` text NOT NULL REFERENCES `content_source_assets`(`id`) ON DELETE RESTRICT,
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  UNIQUE (`learning_track`, `curriculum_level`, `item_type`, `item_id`, `reference_kind`)
);
--> statement-breakpoint
CREATE INDEX `learning_content_level_references_lookup_idx`
  ON `learning_content_level_references` (`learning_track`, `curriculum_level`, `item_type`);
--> statement-breakpoint

CREATE TRIGGER `learning_content_level_references_existing_kanji`
BEFORE INSERT ON `learning_content_level_references`
WHEN NEW.`learning_track` = 'jlpt-ja'
  AND NEW.`item_type` = 'jlpt-kanji'
  AND NOT EXISTS (SELECT 1 FROM `kanji` WHERE CAST(`id` AS TEXT) = NEW.`item_id`)
BEGIN
  SELECT RAISE(ABORT, 'JLPT kanji curriculum reference requires an existing canonical kanji row');
END;
--> statement-breakpoint

CREATE TRIGGER `learning_content_level_references_immutable_update`
BEFORE UPDATE ON `learning_content_level_references`
BEGIN
  SELECT RAISE(ABORT, 'learning content level references are immutable');
END;
--> statement-breakpoint
CREATE TRIGGER `learning_content_level_references_immutable_delete`
BEFORE DELETE ON `learning_content_level_references`
BEGIN
  SELECT RAISE(ABORT, 'learning content level references cannot be deleted');
END;
--> statement-breakpoint

CREATE TRIGGER `kanji_preserve_existing_n5_n3_representative_level`
BEFORE UPDATE OF `jlpt_level` ON `kanji`
WHEN OLD.`jlpt_level` IN ('N5', 'N4', 'N3')
  AND NEW.`jlpt_level` <> OLD.`jlpt_level`
BEGIN
  SELECT RAISE(ABORT, 'existing N5-N3 kanji representative level cannot be relabeled by a later curriculum');
END;
