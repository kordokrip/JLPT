-- Local/testable release control plane. This migration only records evidence,
-- queue work, and preview candidates. It never publishes content automatically.

CREATE TABLE `content_release_jobs` (
  `id` text PRIMARY KEY NOT NULL,
  `release_id` text NOT NULL REFERENCES `content_releases`(`id`) ON DELETE cascade,
  `job_kind` text NOT NULL CHECK (`job_kind` IN ('ingest', 'validate', 'ai_draft', 'qa', 'human_approval', 'preview_candidate')),
  `job_state` text NOT NULL DEFAULT 'queued' CHECK (`job_state` IN ('queued', 'processing', 'succeeded', 'waiting_for_approval', 'retryable_failed', 'failed', 'poisoned', 'cancelled')),
  `artifact_key` text NOT NULL CHECK (`artifact_key` LIKE 'evidence/%' AND instr(`artifact_key`, '..') = 0),
  `artifact_sha256` text NOT NULL CHECK (length(`artifact_sha256`) = 64),
  `idempotency_key` text NOT NULL UNIQUE CHECK (`idempotency_key` LIKE 'crcp:v1:%'),
  `queue_attempts` integer NOT NULL DEFAULT 0 CHECK (`queue_attempts` >= 0),
  `workflow_instance_id` text,
  `error_code` text,
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  `updated_at` integer NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE INDEX `content_release_jobs_release_state_idx` ON `content_release_jobs` (`release_id`, `job_state`);
--> statement-breakpoint

CREATE TABLE `content_release_gate_evidence` (
  `release_id` text NOT NULL REFERENCES `content_releases`(`id`) ON DELETE cascade,
  `gate` text NOT NULL CHECK (`gate` IN ('G0', 'G1', 'G2', 'G3', 'G4')),
  `gate_state` text NOT NULL CHECK (`gate_state` IN ('passed', 'failed')),
  `artifact_key` text NOT NULL CHECK (`artifact_key` LIKE 'evidence/%' AND instr(`artifact_key`, '..') = 0),
  `artifact_sha256` text NOT NULL CHECK (length(`artifact_sha256`) = 64),
  `recorded_by` text NOT NULL CHECK (`recorded_by` IN ('system', 'operator')),
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (`release_id`, `gate`)
);
--> statement-breakpoint

CREATE TABLE `content_release_preview_candidates` (
  `id` text PRIMARY KEY NOT NULL,
  `release_id` text NOT NULL UNIQUE REFERENCES `content_releases`(`id`) ON DELETE cascade,
  `candidate_state` text NOT NULL DEFAULT 'created' CHECK (`candidate_state` IN ('created', 'ready', 'withdrawn')),
  `manifest_key` text NOT NULL CHECK (`manifest_key` LIKE 'evidence/manifest/%' AND instr(`manifest_key`, '..') = 0),
  `manifest_sha256` text NOT NULL CHECK (length(`manifest_sha256`) = 64),
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  `ready_at` integer,
  `withdrawn_at` integer
);
--> statement-breakpoint

CREATE TABLE `content_release_poison_reports` (
  `id` text PRIMARY KEY NOT NULL,
  `job_id` text NOT NULL REFERENCES `content_release_jobs`(`id`) ON DELETE cascade,
  `queue_name` text NOT NULL CHECK (length(trim(`queue_name`)) > 0),
  `message_id` text NOT NULL CHECK (length(trim(`message_id`)) > 0),
  `idempotency_key` text NOT NULL CHECK (`idempotency_key` LIKE 'crcp:v1:%'),
  `attempts` integer NOT NULL CHECK (`attempts` > 0),
  `reason_code` text NOT NULL CHECK (length(trim(`reason_code`)) > 0),
  `artifact_key` text NOT NULL CHECK (`artifact_key` LIKE 'evidence/%' AND instr(`artifact_key`, '..') = 0),
  `artifact_sha256` text NOT NULL CHECK (length(`artifact_sha256`) = 64),
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  UNIQUE (`queue_name`, `message_id`)
);
--> statement-breakpoint

CREATE TRIGGER `content_release_preview_requires_approval`
BEFORE INSERT ON `content_release_preview_candidates`
WHEN NOT EXISTS (
  SELECT 1 FROM `content_releases` r
  WHERE r.`id` = `NEW`.`release_id` AND r.`release_state` = 'approved'
)
BEGIN
  SELECT RAISE(ABORT, 'preview candidate requires an approved release');
END;
--> statement-breakpoint

CREATE TRIGGER `content_releases_operator_gates_before_publish`
BEFORE UPDATE OF `release_state` ON `content_releases`
WHEN `NEW`.`release_state` = 'published' AND (
  SELECT count(*) FROM `content_release_gate_evidence` e
  WHERE e.`release_id` = `NEW`.`id`
    AND e.`gate` IN ('G0', 'G1', 'G2', 'G3', 'G4')
    AND e.`gate_state` = 'passed'
) <> 5
BEGIN
  SELECT RAISE(ABORT, 'published content requires passed G0-G4 evidence');
END;
