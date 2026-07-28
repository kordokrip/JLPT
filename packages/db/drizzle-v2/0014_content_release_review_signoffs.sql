-- A non-empty reviewer string is not a human approval. Keep draft provenance
-- records separate from two independent, dated reviewer sign-offs.

ALTER TABLE `content_release_sources`
  ADD COLUMN `first_review_status` text NOT NULL DEFAULT 'pending'
  CHECK (`first_review_status` IN ('pending', 'signed'));
--> statement-breakpoint
ALTER TABLE `content_release_sources`
  ADD COLUMN `first_reviewed_at` text;
--> statement-breakpoint
ALTER TABLE `content_release_sources`
  ADD COLUMN `second_review_status` text NOT NULL DEFAULT 'pending'
  CHECK (`second_review_status` IN ('pending', 'signed'));
--> statement-breakpoint
ALTER TABLE `content_release_sources`
  ADD COLUMN `second_reviewed_at` text;
--> statement-breakpoint

CREATE TRIGGER `content_releases_human_review_signoff_gate`
BEFORE UPDATE OF `release_state` ON `content_releases`
WHEN `NEW`.`release_state` = 'human_reviewed' AND (
  NOT EXISTS (
    SELECT 1 FROM `content_release_sources` s
    WHERE s.`release_id` = `NEW`.`id`
  ) OR EXISTS (
    SELECT 1 FROM `content_release_sources` s
    WHERE s.`release_id` = `NEW`.`id`
      AND (
        s.`first_review_status` <> 'signed'
        OR s.`second_review_status` <> 'signed'
        OR s.`first_reviewed_at` IS NULL
        OR s.`second_reviewed_at` IS NULL
        OR length(s.`first_reviewed_at`) <> 10
        OR length(s.`second_reviewed_at`) <> 10
        OR trim(s.`first_reviewer`) = ''
        OR trim(s.`second_reviewer`) = ''
        OR s.`first_reviewer` = s.`second_reviewer`
      )
  )
)
BEGIN
  SELECT RAISE(ABORT, 'human review requires two signed, dated, distinct reviewers');
END;
