-- Versioned, self-authored JLPT practice bank. Spoken Japanese remains text;
-- playback is browser Google speech and this contract has no R2 field.

CREATE TABLE `jlpt_practice_questions` (
  `id` text PRIMARY KEY NOT NULL,
  `learning_track` text NOT NULL DEFAULT 'jlpt-ja' CHECK (`learning_track` = 'jlpt-ja'),
  `level` text NOT NULL CHECK (`level` IN ('N5', 'N4', 'N3', 'N2', 'N1')),
  `mode` text NOT NULL CHECK (`mode` IN ('vocab_mc', 'grammar_fill', 'kanji_reading', 'listening')),
  `skill` text NOT NULL CHECK (length(trim(`skill`)) > 0),
  `difficulty` integer NOT NULL CHECK (`difficulty` BETWEEN 1 AND 5),
  `prompt_ko` text NOT NULL CHECK (length(trim(`prompt_ko`)) > 0),
  `prompt_ja` text NOT NULL CHECK (length(trim(`prompt_ja`)) > 0),
  `prompt_en` text NOT NULL CHECK (length(trim(`prompt_en`)) > 0),
  `choices_json` text NOT NULL CHECK (json_valid(`choices_json`) AND json_array_length(`choices_json`) = 4),
  `answer_index` integer NOT NULL CHECK (`answer_index` BETWEEN 0 AND 3),
  `explanation_ko` text NOT NULL CHECK (length(trim(`explanation_ko`)) > 0),
  `explanation_ja` text NOT NULL CHECK (length(trim(`explanation_ja`)) > 0),
  `explanation_en` text NOT NULL CHECK (length(trim(`explanation_en`)) > 0),
  `audio_script_ja` text,
  `source_code` text NOT NULL CHECK (length(trim(`source_code`)) > 0),
  `source_evidence_sha256` text NOT NULL CHECK (length(`source_evidence_sha256`) = 64),
  `bank_version` text NOT NULL CHECK (length(trim(`bank_version`)) > 0),
  `is_published` integer NOT NULL DEFAULT 0 CHECK (`is_published` IN (0, 1)),
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  `updated_at` integer NOT NULL DEFAULT (unixepoch()),
  CHECK (`mode` <> 'listening' OR length(trim(COALESCE(`audio_script_ja`, ''))) > 0),
  UNIQUE (`learning_track`, `bank_version`, `level`, `mode`, `prompt_ja`)
);
--> statement-breakpoint
CREATE INDEX `jlpt_practice_release_idx`
  ON `jlpt_practice_questions` (`learning_track`, `bank_version`, `is_published`, `level`, `mode`, `difficulty`);
--> statement-breakpoint
CREATE TRIGGER `jlpt_practice_choices_multilingual_insert`
BEFORE INSERT ON `jlpt_practice_questions`
WHEN EXISTS (
  SELECT 1 FROM json_each(NEW.`choices_json`) choice
  WHERE json_type(choice.value) <> 'object'
     OR length(trim(COALESCE(json_extract(choice.value, '$.ko'), ''))) = 0
     OR length(trim(COALESCE(json_extract(choice.value, '$.ja'), ''))) = 0
     OR length(trim(COALESCE(json_extract(choice.value, '$.en'), ''))) = 0
)
BEGIN
  SELECT RAISE(ABORT, 'JLPT practice choices require non-empty ko, ja and en text');
END;
