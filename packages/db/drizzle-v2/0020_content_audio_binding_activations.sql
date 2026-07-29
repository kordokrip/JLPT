-- A pending binding is immutable evidence of the original learning item.  A
-- generated R2 asset must therefore be attached by appending an activation,
-- never by mutating the pending row in place.
CREATE TABLE `content_audio_binding_activations` (
  `id` text PRIMARY KEY NOT NULL,
  `binding_id` text NOT NULL REFERENCES `content_audio_bindings`(`id`) ON DELETE RESTRICT,
  `asset_id` text NOT NULL REFERENCES `content_source_assets`(`id`) ON DELETE RESTRICT,
  `activated_at` integer NOT NULL DEFAULT (unixepoch()),
  `selection_reason` text NOT NULL CHECK (length(trim(`selection_reason`)) > 0),
  UNIQUE (`binding_id`),
  UNIQUE (`asset_id`)
);
--> statement-breakpoint
CREATE INDEX `content_audio_binding_activations_binding_idx`
  ON `content_audio_binding_activations` (`binding_id`);
--> statement-breakpoint

CREATE TRIGGER `content_audio_binding_activations_asset_is_playable`
BEFORE INSERT ON `content_audio_binding_activations`
WHEN NOT EXISTS (
  SELECT 1 FROM `content_source_assets` a
  WHERE a.`id` = NEW.`asset_id`
    AND a.`asset_kind` IN ('licensed-web-audio', 'tts-generated')
    AND a.`immutable_r2_key` IS NOT NULL
    AND a.`stored_audio_bytes_sha256` IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'audio activation requires an immutable playable asset');
END;
--> statement-breakpoint

CREATE TRIGGER `content_audio_binding_activations_immutable_update`
BEFORE UPDATE ON `content_audio_binding_activations`
BEGIN
  SELECT RAISE(ABORT, 'content audio binding activations are immutable');
END;
--> statement-breakpoint

CREATE TRIGGER `content_audio_binding_activations_immutable_delete`
BEFORE DELETE ON `content_audio_binding_activations`
BEGIN
  SELECT RAISE(ABORT, 'content audio binding activations cannot be deleted');
END;
