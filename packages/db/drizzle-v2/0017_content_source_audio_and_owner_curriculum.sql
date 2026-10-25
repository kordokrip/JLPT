-- Additive source and audio provenance for personal learning-content intake.
-- This is intentionally independent from content_releases and from the reviewed
-- TOPIK practice bank: those public-release contracts remain unchanged.

CREATE TABLE `content_source_assets` (
  `id` text PRIMARY KEY NOT NULL,
  `asset_kind` text NOT NULL CHECK (`asset_kind` IN (
    'self-authored-fixture',
    'licensed-external-text',
    'licensed-external-file',
    'licensed-web-audio',
    'tts-generated'
  )),
  `source_url` text NOT NULL CHECK (length(trim(`source_url`)) > 0),
  `license_id` text NOT NULL CHECK (length(trim(`license_id`)) > 0),
  `license_url` text NOT NULL CHECK (length(trim(`license_url`)) > 0),
  `attribution_text` text NOT NULL,
  `allowed_use` text NOT NULL CHECK (length(trim(`allowed_use`)) > 0),
  `source_sha256` text NOT NULL CHECK (length(`source_sha256`) = 64),
  `retrieved_at` integer,
  `generated_at` integer,
  `stored_audio_bytes_sha256` text CHECK (`stored_audio_bytes_sha256` IS NULL OR length(`stored_audio_bytes_sha256`) = 64),
  `immutable_r2_key` text CHECK (`immutable_r2_key` IS NULL OR `immutable_r2_key` GLOB 'private-audio/*'),
  `mime_type` text,
  `provider` text,
  `model` text,
  `language` text,
  `voice` text,
  `provider_version` text,
  `input_text_sha256` text CHECK (`input_text_sha256` IS NULL OR length(`input_text_sha256`) = 64),
  `selection_reason` text,
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  CHECK (
    (`immutable_r2_key` IS NULL AND `stored_audio_bytes_sha256` IS NULL)
    OR (`immutable_r2_key` IS NOT NULL AND `stored_audio_bytes_sha256` IS NOT NULL)
  ),
  CHECK (
    `asset_kind` <> 'tts-generated' OR (
      `generated_at` IS NOT NULL
      AND `immutable_r2_key` IS NOT NULL
      AND `stored_audio_bytes_sha256` IS NOT NULL
      AND length(trim(COALESCE(`provider`, ''))) > 0
      AND length(trim(COALESCE(`model`, ''))) > 0
      AND length(trim(COALESCE(`language`, ''))) > 0
      AND length(trim(COALESCE(`voice`, ''))) > 0
      AND length(trim(COALESCE(`provider_version`, ''))) > 0
      AND `input_text_sha256` IS NOT NULL
      AND length(trim(COALESCE(`selection_reason`, ''))) > 0
    )
  ),
  CHECK (
    `asset_kind` <> 'licensed-web-audio' OR (
      `retrieved_at` IS NOT NULL
      AND `immutable_r2_key` IS NOT NULL
      AND `stored_audio_bytes_sha256` IS NOT NULL
      AND length(trim(COALESCE(`mime_type`, ''))) > 0
    )
  )
);
--> statement-breakpoint
CREATE INDEX `content_source_assets_kind_idx` ON `content_source_assets` (`asset_kind`, `language`);
--> statement-breakpoint

-- Maps polymorphic learning records to stable, source-backed identifiers without
-- changing the existing N5–N3 tables or learner-history foreign keys.
CREATE TABLE `learning_content_stable_refs` (
  `stable_ref` text PRIMARY KEY NOT NULL,
  `learning_track` text NOT NULL CHECK (`learning_track` IN ('jlpt-ja', 'topik-ko')),
  `item_type` text NOT NULL CHECK (`item_type` IN (
    'jlpt-vocab', 'jlpt-grammar', 'jlpt-kanji', 'jlpt-sentence', 'jlpt-reading', 'topik-owner-item'
  )),
  `item_id` text NOT NULL CHECK (length(trim(`item_id`)) > 0),
  `level_tag` text NOT NULL CHECK (length(trim(`level_tag`)) > 0),
  `source_asset_id` text NOT NULL REFERENCES `content_source_assets`(`id`) ON DELETE RESTRICT,
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  UNIQUE (`item_type`, `item_id`)
);
--> statement-breakpoint
CREATE INDEX `learning_content_stable_refs_track_level_idx`
  ON `learning_content_stable_refs` (`learning_track`, `level_tag`, `item_type`);
--> statement-breakpoint

-- An R2 object is optional while an asset is being prepared, but a normal
-- learning UI may only play a binding in r2-ready state.
CREATE TABLE `content_audio_bindings` (
  `id` text PRIMARY KEY NOT NULL,
  `stable_ref` text NOT NULL REFERENCES `learning_content_stable_refs`(`stable_ref`) ON DELETE RESTRICT,
  `item_type` text NOT NULL CHECK (`item_type` IN (
    'jlpt-vocab', 'jlpt-kanji', 'jlpt-sentence', 'jlpt-reading', 'topik-owner-item'
  )),
  `item_id` text NOT NULL CHECK (length(trim(`item_id`)) > 0),
  `language` text NOT NULL CHECK (`language` IN ('ja', 'ko')),
  `audio_role` text NOT NULL CHECK (`audio_role` IN ('pronunciation', 'listening')),
  `binding_state` text NOT NULL CHECK (`binding_state` IN ('r2-ready', 'preparing', 'not-provided')),
  `asset_id` text REFERENCES `content_source_assets`(`id`) ON DELETE RESTRICT,
  `unavailable_reason` text,
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  UNIQUE (`item_type`, `item_id`, `language`, `audio_role`),
  CHECK (
    (`binding_state` = 'r2-ready' AND `asset_id` IS NOT NULL AND `unavailable_reason` IS NULL)
    OR (`binding_state` <> 'r2-ready' AND `asset_id` IS NULL AND length(trim(COALESCE(`unavailable_reason`, ''))) > 0)
  )
);
--> statement-breakpoint
CREATE INDEX `content_audio_bindings_state_idx`
  ON `content_audio_bindings` (`binding_state`, `language`, `audio_role`);
--> statement-breakpoint

-- TOPIK 1–6 owner-authored curriculum is deliberately not the reviewed 28-item
-- `topik_practice_questions` bank and has no reviewer/public-release columns.
CREATE TABLE `topik_owner_authored_curriculum_units` (
  `id` text PRIMARY KEY NOT NULL,
  `target_grade` integer NOT NULL CHECK (`target_grade` BETWEEN 1 AND 6),
  `stable_ref` text NOT NULL UNIQUE,
  `section` text NOT NULL CHECK (`section` IN ('vocab', 'grammar', 'reading', 'listening', 'writing')),
  `title_ko` text NOT NULL,
  `title_ja` text NOT NULL,
  `title_en` text NOT NULL,
  `source_asset_id` text NOT NULL REFERENCES `content_source_assets`(`id`) ON DELETE RESTRICT,
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  `updated_at` integer NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE INDEX `topik_owner_curriculum_units_grade_idx`
  ON `topik_owner_authored_curriculum_units` (`target_grade`, `section`);
--> statement-breakpoint

CREATE TABLE `topik_owner_authored_curriculum_items` (
  `id` text PRIMARY KEY NOT NULL,
  `unit_id` text NOT NULL REFERENCES `topik_owner_authored_curriculum_units`(`id`) ON DELETE RESTRICT,
  `target_grade` integer NOT NULL CHECK (`target_grade` BETWEEN 1 AND 6),
  `stable_ref` text NOT NULL UNIQUE,
  `item_type` text NOT NULL CHECK (`item_type` IN ('vocab', 'grammar', 'reading', 'listening', 'writing')),
  `prompt_ko` text NOT NULL,
  `prompt_ja` text NOT NULL,
  `prompt_en` text NOT NULL,
  `answer_json` text NOT NULL DEFAULT '{}',
  `explanation_ko` text NOT NULL,
  `explanation_ja` text NOT NULL,
  `explanation_en` text NOT NULL,
  `audio_required` integer NOT NULL DEFAULT 0 CHECK (`audio_required` IN (0, 1)),
  `source_asset_id` text NOT NULL REFERENCES `content_source_assets`(`id`) ON DELETE RESTRICT,
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  `updated_at` integer NOT NULL DEFAULT (unixepoch()),
  UNIQUE (`unit_id`, `stable_ref`)
);
--> statement-breakpoint
CREATE INDEX `topik_owner_curriculum_items_grade_idx`
  ON `topik_owner_authored_curriculum_items` (`target_grade`, `item_type`);
--> statement-breakpoint

CREATE TRIGGER `content_source_assets_immutable_update`
BEFORE UPDATE ON `content_source_assets`
BEGIN
  SELECT RAISE(ABORT, 'content source assets are immutable');
END;
--> statement-breakpoint
CREATE TRIGGER `content_source_assets_immutable_delete`
BEFORE DELETE ON `content_source_assets`
BEGIN
  SELECT RAISE(ABORT, 'content source assets cannot be deleted');
END;
--> statement-breakpoint

CREATE TRIGGER `learning_content_stable_refs_immutable_update`
BEFORE UPDATE ON `learning_content_stable_refs`
BEGIN
  SELECT RAISE(ABORT, 'learning content stable refs are immutable');
END;
--> statement-breakpoint
CREATE TRIGGER `learning_content_stable_refs_immutable_delete`
BEFORE DELETE ON `learning_content_stable_refs`
BEGIN
  SELECT RAISE(ABORT, 'learning content stable refs cannot be deleted');
END;
--> statement-breakpoint

CREATE TRIGGER `content_audio_bindings_match_stable_ref`
BEFORE INSERT ON `content_audio_bindings`
WHEN NOT EXISTS (
  SELECT 1 FROM `learning_content_stable_refs` r
  WHERE r.`stable_ref` = NEW.`stable_ref`
    AND r.`item_type` = NEW.`item_type`
    AND r.`item_id` = NEW.`item_id`
)
BEGIN
  SELECT RAISE(ABORT, 'audio binding must match its stable content ref');
END;
--> statement-breakpoint
CREATE TRIGGER `content_audio_bindings_ready_asset_is_playable`
BEFORE INSERT ON `content_audio_bindings`
WHEN NEW.`binding_state` = 'r2-ready' AND NOT EXISTS (
  SELECT 1 FROM `content_source_assets` a
  WHERE a.`id` = NEW.`asset_id`
    AND a.`asset_kind` IN ('licensed-web-audio', 'tts-generated')
    AND a.`immutable_r2_key` IS NOT NULL
    AND a.`stored_audio_bytes_sha256` IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'r2-ready binding requires an immutable licensed or TTS audio asset');
END;
--> statement-breakpoint
CREATE TRIGGER `content_audio_bindings_immutable_update`
BEFORE UPDATE ON `content_audio_bindings`
BEGIN
  SELECT RAISE(ABORT, 'content audio bindings are immutable');
END;
--> statement-breakpoint
CREATE TRIGGER `content_audio_bindings_immutable_delete`
BEFORE DELETE ON `content_audio_bindings`
BEGIN
  SELECT RAISE(ABORT, 'content audio bindings cannot be deleted');
END;
--> statement-breakpoint

CREATE TRIGGER `topik_owner_curriculum_item_matches_unit_grade`
BEFORE INSERT ON `topik_owner_authored_curriculum_items`
WHEN NOT EXISTS (
  SELECT 1 FROM `topik_owner_authored_curriculum_units` u
  WHERE u.`id` = NEW.`unit_id` AND u.`target_grade` = NEW.`target_grade`
)
BEGIN
  SELECT RAISE(ABORT, 'TOPIK owner-authored item grade must match its unit');
END;
