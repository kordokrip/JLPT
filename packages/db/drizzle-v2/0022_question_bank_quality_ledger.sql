-- Immutable audit results for authored question banks.  The rows deliberately
-- store only evidence hashes and review outcomes, never third-party source text.

DROP INDEX `topik_practice_prompt_uk`;
--> statement-breakpoint
CREATE UNIQUE INDEX `topik_practice_prompt_version_uk`
  ON `topik_practice_questions` (`learning_track`, `bank_version`, `exam_level`, `section`, `prompt_ko`);
--> statement-breakpoint

CREATE TABLE `content_quality_audits` (
  `id` text PRIMARY KEY NOT NULL,
  `learning_track` text NOT NULL CHECK (`learning_track` IN ('jlpt-ja', 'topik-ko')),
  `content_type` text NOT NULL CHECK (`content_type` IN ('topik-practice', 'topik-placement', 'jlpt-reading', 'jlpt-quiz')),
  `content_id` text NOT NULL CHECK (length(trim(`content_id`)) > 0),
  `content_version` text NOT NULL CHECK (length(trim(`content_version`)) > 0),
  `evidence_sha256` text NOT NULL CHECK (length(`evidence_sha256`) = 64),
  `validator_version` text NOT NULL CHECK (length(trim(`validator_version`)) > 0),
  `automated_status` text NOT NULL CHECK (`automated_status` IN ('passed', 'failed')),
  `author_review_status` text NOT NULL CHECK (`author_review_status` IN ('pending', 'signed', 'rejected')),
  `adversarial_review_status` text NOT NULL CHECK (`adversarial_review_status` IN ('pending', 'signed', 'rejected')),
  `author_reviewer` text NOT NULL CHECK (length(trim(`author_reviewer`)) > 0),
  `adversarial_reviewer` text NOT NULL CHECK (length(trim(`adversarial_reviewer`)) > 0),
  `release_state` text NOT NULL DEFAULT 'draft' CHECK (`release_state` IN ('draft', 'approved', 'published', 'withdrawn')),
  `details_json` text NOT NULL DEFAULT '{}',
  `checked_at` text NOT NULL CHECK (length(`checked_at`) = 10),
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  `updated_at` integer NOT NULL DEFAULT (unixepoch()),
  UNIQUE (`learning_track`, `content_type`, `content_id`, `content_version`),
  CHECK (`author_reviewer` <> `adversarial_reviewer`)
);
--> statement-breakpoint
CREATE INDEX `content_quality_audits_release_idx`
  ON `content_quality_audits` (`learning_track`, `content_type`, `content_version`, `release_state`);
--> statement-breakpoint

CREATE TRIGGER `content_quality_audits_publish_gate_insert`
BEFORE INSERT ON `content_quality_audits`
WHEN NEW.`release_state` IN ('approved', 'published') AND (
  NEW.`automated_status` <> 'passed'
  OR NEW.`author_review_status` <> 'signed'
  OR NEW.`adversarial_review_status` <> 'signed'
  OR trim(NEW.`author_reviewer`) = ''
  OR trim(NEW.`adversarial_reviewer`) = ''
  OR NEW.`author_reviewer` = NEW.`adversarial_reviewer`
)
BEGIN
  SELECT RAISE(ABORT, 'approved question-bank content requires automated and two independent review passes');
END;
--> statement-breakpoint
CREATE TRIGGER `content_quality_audits_publish_gate_update`
BEFORE UPDATE OF `release_state`, `automated_status`, `author_review_status`, `adversarial_review_status`, `author_reviewer`, `adversarial_reviewer` ON `content_quality_audits`
WHEN NEW.`release_state` IN ('approved', 'published') AND (
  NEW.`automated_status` <> 'passed'
  OR NEW.`author_review_status` <> 'signed'
  OR NEW.`adversarial_review_status` <> 'signed'
  OR trim(NEW.`author_reviewer`) = ''
  OR trim(NEW.`adversarial_reviewer`) = ''
  OR NEW.`author_reviewer` = NEW.`adversarial_reviewer`
)
BEGIN
  SELECT RAISE(ABORT, 'approved question-bank content requires automated and two independent review passes');
END;
