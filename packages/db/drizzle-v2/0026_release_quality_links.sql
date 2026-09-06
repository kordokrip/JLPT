-- Links immutable item audits to a release without copying audit content.
-- Existing releases remain compatible; future quality-gated releases opt in by
-- recording an explicit expected audit count.

-- SQLite cannot widen the 0022 content_type CHECK in place. Rebuild the table
-- transactionally through this migration while preserving every immutable row.
DROP TRIGGER `content_quality_audits_publish_gate_insert`;
--> statement-breakpoint
DROP TRIGGER `content_quality_audits_publish_gate_update`;
--> statement-breakpoint
DROP INDEX `content_quality_audits_release_idx`;
--> statement-breakpoint
ALTER TABLE `content_quality_audits` RENAME TO `content_quality_audits_legacy_0026`;
--> statement-breakpoint
CREATE TABLE `content_quality_audits` (
  `id` text PRIMARY KEY NOT NULL,
  `learning_track` text NOT NULL CHECK (`learning_track` IN ('jlpt-ja', 'topik-ko')),
  `content_type` text NOT NULL CHECK (`content_type` IN ('topik-practice', 'topik-placement', 'topik-owner', 'jlpt-reading', 'jlpt-quiz')),
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
INSERT INTO `content_quality_audits`
  (`id`, `learning_track`, `content_type`, `content_id`, `content_version`,
   `evidence_sha256`, `validator_version`, `automated_status`,
   `author_review_status`, `adversarial_review_status`, `author_reviewer`,
   `adversarial_reviewer`, `release_state`, `details_json`, `checked_at`,
   `created_at`, `updated_at`)
SELECT
  `id`, `learning_track`, `content_type`, `content_id`, `content_version`,
  `evidence_sha256`, `validator_version`, `automated_status`,
  `author_review_status`, `adversarial_review_status`, `author_reviewer`,
  `adversarial_reviewer`, `release_state`, `details_json`, `checked_at`,
  `created_at`, `updated_at`
FROM `content_quality_audits_legacy_0026`;
--> statement-breakpoint
DROP TABLE `content_quality_audits_legacy_0026`;
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
--> statement-breakpoint

CREATE TABLE `content_release_quality_requirements` (
  `release_id` text PRIMARY KEY NOT NULL REFERENCES `content_releases`(`id`) ON DELETE cascade,
  `content_type` text NOT NULL CHECK (`content_type` IN ('topik-practice', 'topik-placement', 'topik-owner', 'jlpt-reading', 'jlpt-quiz')),
  `expected_audit_count` integer NOT NULL CHECK (`expected_audit_count` > 0),
  `validator_version` text NOT NULL CHECK (length(trim(`validator_version`)) > 0),
  `created_at` integer NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `content_release_quality_audit_links` (
  `release_id` text NOT NULL REFERENCES `content_releases`(`id`) ON DELETE cascade,
  `audit_id` text NOT NULL REFERENCES `content_quality_audits`(`id`) ON DELETE restrict,
  `linked_at` integer NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (`release_id`, `audit_id`)
);
--> statement-breakpoint
CREATE INDEX `content_release_quality_audit_links_audit_idx`
  ON `content_release_quality_audit_links` (`audit_id`, `release_id`);
--> statement-breakpoint
CREATE TRIGGER `content_release_quality_link_contract`
BEFORE INSERT ON `content_release_quality_audit_links`
WHEN NOT EXISTS (
  SELECT 1
  FROM `content_releases` r
  JOIN `content_quality_audits` a ON a.`id` = NEW.`audit_id`
  JOIN `content_release_quality_requirements` q ON q.`release_id` = r.`id`
  WHERE r.`id` = NEW.`release_id`
    AND r.`learning_track` = a.`learning_track`
    AND r.`content_version` = a.`content_version`
    AND q.`content_type` = a.`content_type`
    AND q.`validator_version` = a.`validator_version`
    AND a.`automated_status` = 'passed'
    AND a.`author_review_status` = 'signed'
    AND a.`adversarial_review_status` = 'signed'
    AND a.`author_reviewer` <> a.`adversarial_reviewer`
    AND a.`release_state` IN ('approved', 'published')
)
BEGIN
  SELECT RAISE(ABORT, 'release quality link must match a passed independent audit and release requirement');
END;
--> statement-breakpoint
CREATE TRIGGER `jlpt_practice_publish_quality_insert`
BEFORE INSERT ON `jlpt_practice_questions`
WHEN NEW.`is_published` = 1 AND NOT EXISTS (
  SELECT 1
  FROM `content_quality_audits` a
  JOIN `content_release_quality_audit_links` l ON l.`audit_id` = a.`id`
  JOIN `content_release_quality_requirements` q
    ON q.`release_id` = l.`release_id` AND q.`content_type` = 'jlpt-quiz'
  JOIN `content_releases` r ON r.`id` = l.`release_id`
  WHERE a.`learning_track` = 'jlpt-ja'
    AND a.`content_type` = 'jlpt-quiz'
    AND a.`content_id` = NEW.`id`
    AND a.`content_version` = NEW.`bank_version`
    AND a.`automated_status` = 'passed'
    AND a.`author_review_status` = 'signed'
    AND a.`adversarial_review_status` = 'signed'
    AND a.`author_reviewer` <> a.`adversarial_reviewer`
    AND a.`release_state` IN ('approved', 'published')
    AND r.`learning_track` = 'jlpt-ja'
    AND r.`content_version` = NEW.`bank_version`
    AND r.`release_state` IN ('approved', 'published')
)
BEGIN
  SELECT RAISE(ABORT, 'published JLPT practice requires a passed independent quality audit');
END;
--> statement-breakpoint
CREATE TRIGGER `jlpt_practice_publish_quality_update`
BEFORE UPDATE OF `is_published` ON `jlpt_practice_questions`
WHEN NEW.`is_published` = 1 AND NOT EXISTS (
  SELECT 1
  FROM `content_quality_audits` a
  JOIN `content_release_quality_audit_links` l ON l.`audit_id` = a.`id`
  JOIN `content_release_quality_requirements` q
    ON q.`release_id` = l.`release_id` AND q.`content_type` = 'jlpt-quiz'
  JOIN `content_releases` r ON r.`id` = l.`release_id`
  WHERE a.`learning_track` = 'jlpt-ja'
    AND a.`content_type` = 'jlpt-quiz'
    AND a.`content_id` = NEW.`id`
    AND a.`content_version` = NEW.`bank_version`
    AND a.`automated_status` = 'passed'
    AND a.`author_review_status` = 'signed'
    AND a.`adversarial_review_status` = 'signed'
    AND a.`author_reviewer` <> a.`adversarial_reviewer`
    AND a.`release_state` IN ('approved', 'published')
    AND r.`learning_track` = 'jlpt-ja'
    AND r.`content_version` = NEW.`bank_version`
    AND r.`release_state` IN ('approved', 'published')
)
BEGIN
  SELECT RAISE(ABORT, 'published JLPT practice requires a passed independent quality audit');
END;
--> statement-breakpoint
CREATE TRIGGER `content_releases_quality_requirement_publish_gate`
BEFORE UPDATE OF `release_state` ON `content_releases`
WHEN NEW.`release_state` = 'published'
  AND EXISTS (SELECT 1 FROM `content_release_quality_requirements` q WHERE q.`release_id` = NEW.`id`)
  AND (
    SELECT count(*)
    FROM `content_release_quality_audit_links` l
    WHERE l.`release_id` = NEW.`id`
  ) <> (
    SELECT q.`expected_audit_count`
    FROM `content_release_quality_requirements` q
    WHERE q.`release_id` = NEW.`id`
  )
BEGIN
  SELECT RAISE(ABORT, 'published release requires its complete linked quality audit set');
END;
--> statement-breakpoint

-- Replace the original curriculum-only TOPIK gate. A reviewed practice bank
-- has no topik_content_items rows and instead proves complete item-level audit
-- coverage through the quality requirement and links above. G0-G4 remains a
-- separate mandatory gate from migration 0013.
DROP TRIGGER `content_releases_publish_gate`;
--> statement-breakpoint
CREATE TRIGGER `content_releases_publish_gate`
BEFORE UPDATE OF `release_state` ON `content_releases`
WHEN NEW.`release_state` = 'published'
  AND NEW.`learning_track` = 'topik-ko'
  AND NOT EXISTS (
    SELECT 1 FROM `topik_content_items` i WHERE i.`release_id` = NEW.`id`
  )
  AND NOT (
    EXISTS (
      SELECT 1 FROM `content_release_quality_requirements` q
      WHERE q.`release_id` = NEW.`id`
    )
    AND (
      SELECT count(*) FROM `content_release_quality_audit_links` l
      WHERE l.`release_id` = NEW.`id`
    ) = (
      SELECT q.`expected_audit_count`
      FROM `content_release_quality_requirements` q
      WHERE q.`release_id` = NEW.`id`
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'published TOPIK release requires content items or complete linked quality audits');
END;
