export const publishedOwnerItem = (alias: string) => `(
  NOT EXISTS (
    SELECT 1 FROM content_quality_audits pending_audit
    WHERE pending_audit.learning_track = 'topik-ko'
      AND pending_audit.content_type = 'topik-owner'
      AND pending_audit.content_id = ${alias}.id
  )
  OR EXISTS (
    SELECT 1
    FROM content_quality_audits published_audit
    JOIN content_release_quality_audit_links release_link
      ON release_link.audit_id = published_audit.id
    JOIN content_releases published_release
      ON published_release.id = release_link.release_id
    WHERE published_audit.learning_track = 'topik-ko'
      AND published_audit.content_type = 'topik-owner'
      AND published_audit.content_id = ${alias}.id
      AND published_audit.release_state = 'published'
      AND published_release.release_state = 'published'
  )
)`;
