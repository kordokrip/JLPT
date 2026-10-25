-- Historical filename retained because this pending migration has not been
-- applied to production. Pronunciation is browser Google speech only: R2
-- assets and activations are prohibited at the database boundary as well as
-- in the Worker routes and bindings.

CREATE TRIGGER `content_source_assets_google_only_pronunciation_insert`
BEFORE INSERT ON `content_source_assets`
WHEN NEW.`asset_kind` IN ('licensed-web-audio', 'tts-generated')
  OR NEW.`immutable_r2_key` IS NOT NULL
  OR NEW.`stored_audio_bytes_sha256` IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'R2 pronunciation assets are disabled; use browser Google speech only');
END;
--> statement-breakpoint

CREATE TRIGGER `content_audio_bindings_google_only_insert`
BEFORE INSERT ON `content_audio_bindings`
WHEN NEW.`binding_state` = 'r2-ready'
  OR NEW.`asset_id` IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'R2 pronunciation bindings are disabled; use browser Google speech only');
END;
--> statement-breakpoint
