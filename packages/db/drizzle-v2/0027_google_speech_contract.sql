-- Browser Google speech is the only pronunciation route. This new contract
-- stores text-to-speech eligibility only and has no asset, object or R2 key.

CREATE TABLE `content_speech_bindings` (
  `id` text PRIMARY KEY NOT NULL,
  `stable_ref` text NOT NULL REFERENCES `learning_content_stable_refs`(`stable_ref`) ON DELETE restrict,
  `item_type` text NOT NULL CHECK (`item_type` IN (
    'jlpt-vocab', 'jlpt-kanji', 'jlpt-sentence', 'jlpt-reading', 'topik-owner-item'
  )),
  `item_id` text NOT NULL CHECK (length(trim(`item_id`)) > 0),
  `language` text NOT NULL CHECK (`language` IN ('ja', 'ko')),
  `speech_role` text NOT NULL CHECK (`speech_role` IN ('pronunciation', 'listening')),
  `provider` text NOT NULL DEFAULT 'google-browser' CHECK (`provider` = 'google-browser'),
  `binding_state` text NOT NULL CHECK (`binding_state` IN ('ready', 'unavailable')),
  `text_source` text NOT NULL CHECK (`text_source` IN ('item', 'sentence', 'passage', 'audio-script')),
  `unavailable_reason` text,
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  UNIQUE (`item_type`, `item_id`, `language`, `speech_role`),
  CHECK (
    (`binding_state` = 'ready' AND `unavailable_reason` IS NULL)
    OR (`binding_state` = 'unavailable' AND length(trim(COALESCE(`unavailable_reason`, ''))) > 0)
  )
);
--> statement-breakpoint
CREATE INDEX `content_speech_bindings_state_idx`
  ON `content_speech_bindings` (`binding_state`, `language`, `speech_role`);
--> statement-breakpoint
INSERT INTO `content_speech_bindings`
  (`id`, `stable_ref`, `item_type`, `item_id`, `language`, `speech_role`, `provider`, `binding_state`, `text_source`, `unavailable_reason`, `created_at`)
SELECT
  'speech-binding:' || b.`stable_ref`,
  b.`stable_ref`,
  b.`item_type`,
  b.`item_id`,
  b.`language`,
  b.`audio_role`,
  'google-browser',
  CASE WHEN b.`binding_state` = 'not-provided' THEN 'unavailable' ELSE 'ready' END,
  CASE
    WHEN b.`item_type` = 'jlpt-sentence' THEN 'sentence'
    WHEN b.`item_type` = 'jlpt-reading' THEN 'passage'
    WHEN b.`item_type` = 'topik-owner-item' AND b.`audio_role` = 'listening' THEN 'audio-script'
    ELSE 'item'
  END,
  CASE WHEN b.`binding_state` = 'not-provided'
    THEN COALESCE(NULLIF(trim(b.`unavailable_reason`), ''), 'browser speech text is unavailable')
    ELSE NULL
  END,
  b.`created_at`
FROM `content_audio_bindings` b;
--> statement-breakpoint
CREATE TRIGGER `content_speech_bindings_match_stable_ref`
BEFORE INSERT ON `content_speech_bindings`
WHEN NOT EXISTS (
  SELECT 1 FROM `learning_content_stable_refs` r
  WHERE r.`stable_ref` = NEW.`stable_ref`
    AND r.`item_type` = NEW.`item_type`
    AND r.`item_id` = NEW.`item_id`
)
BEGIN
  SELECT RAISE(ABORT, 'speech binding must match its stable content ref');
END;
--> statement-breakpoint
CREATE TRIGGER `content_speech_bindings_immutable_update`
BEFORE UPDATE ON `content_speech_bindings`
BEGIN
  SELECT RAISE(ABORT, 'content speech bindings are immutable');
END;
--> statement-breakpoint
CREATE TRIGGER `content_speech_bindings_immutable_delete`
BEFORE DELETE ON `content_speech_bindings`
BEGIN
  SELECT RAISE(ABORT, 'content speech bindings cannot be deleted');
END;
--> statement-breakpoint
CREATE TRIGGER `content_audio_bindings_legacy_insert_blocked`
BEFORE INSERT ON `content_audio_bindings`
BEGIN
  SELECT RAISE(ABORT, 'legacy audio bindings are disabled; use Google browser speech bindings only');
END;

