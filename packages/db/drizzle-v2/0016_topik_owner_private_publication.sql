-- Owner-private TOPIK publication is deliberately separate from the public
-- content-release lifecycle. The owner subject is bound only by an authenticated
-- admin-session claim in the Worker; it is never part of a seed or manifest.

CREATE TABLE `content_release_private_policies` (
  `release_id` text PRIMARY KEY NOT NULL REFERENCES `content_releases`(`id`) ON DELETE restrict,
  `manifest_sha256` text NOT NULL CHECK (length(`manifest_sha256`) = 64),
  `owner_ref` text NOT NULL CHECK (length(trim(`owner_ref`)) > 0),
  `owner_attested_at` text NOT NULL CHECK (length(`owner_attested_at`) = 10),
  `attestation_sha256` text NOT NULL CHECK (length(`attestation_sha256`) = 64),
  `claim_method` text NOT NULL CHECK (`claim_method` = 'authenticated_admin_session'),
  `public_publish_prohibited` integer NOT NULL DEFAULT 1 CHECK (`public_publish_prohibited` = 1),
  `created_at` integer NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint

CREATE TABLE `content_release_private_publications` (
  `release_id` text PRIMARY KEY NOT NULL REFERENCES `content_releases`(`id`) ON DELETE restrict,
  `owner_user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE restrict,
  `manifest_sha256` text NOT NULL CHECK (length(`manifest_sha256`) = 64),
  `private_state` text NOT NULL DEFAULT 'owner_published' CHECK (`private_state` IN ('owner_published', 'withdrawn')),
  `claimed_at` integer NOT NULL DEFAULT (unixepoch()),
  `withdrawn_at` integer
);
--> statement-breakpoint
CREATE INDEX `content_release_private_publications_owner_state_idx`
  ON `content_release_private_publications` (`owner_user_id`, `private_state`);
--> statement-breakpoint

CREATE TRIGGER `content_release_private_policy_requires_owner_private_draft`
BEFORE INSERT ON `content_release_private_policies`
WHEN NOT EXISTS (
  SELECT 1
  FROM `content_releases` r
  JOIN `content_release_sources` s ON s.`release_id` = r.`id`
  WHERE r.`id` = `NEW`.`release_id`
    AND r.`learning_track` = 'topik-ko'
    AND r.`manifest_sha256` = `NEW`.`manifest_sha256`
    AND r.`release_state` IN ('draft', 'automated_checked')
    AND s.`source_type` = 'self-authored'
    AND s.`author` = `NEW`.`owner_ref`
    AND s.`first_review_status` = 'pending'
    AND s.`second_review_status` = 'pending'
)
BEGIN
  SELECT RAISE(ABORT, 'owner-private policy requires a self-authored draft with pending public reviews');
END;
--> statement-breakpoint

CREATE TRIGGER `content_release_private_policy_is_immutable`
BEFORE UPDATE ON `content_release_private_policies`
BEGIN
  SELECT RAISE(ABORT, 'owner-private policy is immutable');
END;
--> statement-breakpoint

CREATE TRIGGER `content_release_private_policy_no_delete`
BEFORE DELETE ON `content_release_private_policies`
BEGIN
  SELECT RAISE(ABORT, 'owner-private policy cannot be deleted');
END;
--> statement-breakpoint

CREATE TRIGGER `content_release_private_publication_requires_matching_policy`
BEFORE INSERT ON `content_release_private_publications`
WHEN `NEW`.`private_state` <> 'owner_published'
  OR NOT EXISTS (
    SELECT 1
    FROM `content_release_private_policies` p
    JOIN `content_releases` r ON r.`id` = p.`release_id`
    JOIN `content_release_sources` s ON s.`release_id` = r.`id`
    WHERE p.`release_id` = `NEW`.`release_id`
      AND p.`manifest_sha256` = `NEW`.`manifest_sha256`
      AND p.`claim_method` = 'authenticated_admin_session'
      AND p.`public_publish_prohibited` = 1
      AND r.`manifest_sha256` = `NEW`.`manifest_sha256`
      AND r.`release_state` IN ('draft', 'automated_checked')
      AND s.`source_type` = 'self-authored'
      AND s.`author` = p.`owner_ref`
      AND s.`first_review_status` = 'pending'
      AND s.`second_review_status` = 'pending'
  )
BEGIN
  SELECT RAISE(ABORT, 'owner-private publication requires the matching pending-review policy');
END;
--> statement-breakpoint

CREATE TRIGGER `content_release_private_publication_only_withdraws`
BEFORE UPDATE ON `content_release_private_publications`
WHEN NOT (
  `OLD`.`private_state` = 'owner_published'
  AND `NEW`.`private_state` = 'withdrawn'
  AND `NEW`.`release_id` = `OLD`.`release_id`
  AND `NEW`.`owner_user_id` = `OLD`.`owner_user_id`
  AND `NEW`.`manifest_sha256` = `OLD`.`manifest_sha256`
  AND `NEW`.`claimed_at` = `OLD`.`claimed_at`
  AND `NEW`.`withdrawn_at` IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'owner-private publication is immutable except withdrawal');
END;
--> statement-breakpoint

CREATE TRIGGER `content_release_private_publication_no_delete`
BEFORE DELETE ON `content_release_private_publications`
BEGIN
  SELECT RAISE(ABORT, 'owner-private publication cannot be deleted');
END;
--> statement-breakpoint

CREATE TRIGGER `topik_private_content_items_immutable_after_claim`
BEFORE UPDATE ON `topik_content_items`
WHEN EXISTS (
  SELECT 1 FROM `content_release_private_publications` p
  WHERE p.`release_id` = `OLD`.`release_id`
)
BEGIN
  SELECT RAISE(ABORT, 'owner-private content items are immutable');
END;
--> statement-breakpoint

CREATE TRIGGER `topik_private_content_items_no_delete_after_claim`
BEFORE DELETE ON `topik_content_items`
WHEN EXISTS (
  SELECT 1 FROM `content_release_private_publications` p
  WHERE p.`release_id` = `OLD`.`release_id`
)
BEGIN
  SELECT RAISE(ABORT, 'owner-private content items cannot be deleted');
END;
--> statement-breakpoint

CREATE TRIGGER `topik_private_units_immutable_after_claim`
BEFORE UPDATE ON `topik_curriculum_units`
WHEN EXISTS (
  SELECT 1 FROM `content_release_private_publications` p
  WHERE p.`release_id` = `OLD`.`release_id`
)
BEGIN
  SELECT RAISE(ABORT, 'owner-private curriculum units are immutable');
END;
--> statement-breakpoint

CREATE TRIGGER `topik_private_units_no_delete_after_claim`
BEFORE DELETE ON `topik_curriculum_units`
WHEN EXISTS (
  SELECT 1 FROM `content_release_private_publications` p
  WHERE p.`release_id` = `OLD`.`release_id`
)
BEGIN
  SELECT RAISE(ABORT, 'owner-private curriculum units cannot be deleted');
END;
--> statement-breakpoint

CREATE TRIGGER `topik_private_sources_immutable_after_claim`
BEFORE UPDATE ON `content_release_sources`
WHEN EXISTS (
  SELECT 1 FROM `content_release_private_publications` p
  WHERE p.`release_id` = `OLD`.`release_id`
)
BEGIN
  SELECT RAISE(ABORT, 'owner-private release sources are immutable');
END;
--> statement-breakpoint

CREATE TRIGGER `topik_private_sources_no_delete_after_claim`
BEFORE DELETE ON `content_release_sources`
WHEN EXISTS (
  SELECT 1 FROM `content_release_private_publications` p
  WHERE p.`release_id` = `OLD`.`release_id`
)
BEGIN
  SELECT RAISE(ABORT, 'owner-private release sources cannot be deleted');
END;
--> statement-breakpoint

CREATE TRIGGER `topik_private_release_identity_immutable_after_claim`
BEFORE UPDATE OF `learning_track`, `content_version`, `manifest_sha256`, `parser_version` ON `content_releases`
WHEN EXISTS (
  SELECT 1 FROM `content_release_private_publications` p
  WHERE p.`release_id` = `OLD`.`id`
)
BEGIN
  SELECT RAISE(ABORT, 'owner-private release identity is immutable');
END;
