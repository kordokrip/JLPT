export type D1TableGroup = 'content' | 'mutable';

export type D1TableSpec = {
  name: string;
  group: D1TableGroup;
  primaryKey: string;
  verifyWhere?: string;
  checksum: boolean;
  /** Columns added by the target schema with a deterministic default. */
  checksumIgnoreColumns?: readonly string[];
};

// Parent-first for import; restore deletes in reverse. This is the complete
// regular-table allowlist for migrations 0000-0027, not the pre-TOPIK legacy
// subset. Keeping release, quality, owner, activity, and FSRS state in the
// backup is mandatory before a content publication.
export const D1_TRANSFER_TABLES: readonly D1TableSpec[] = [
  { name: 'sources', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'categories', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'content_source_assets', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'content_releases', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'track_content_sources', group: 'content', primaryKey: 'learning_track,source_code', checksum: true },
  { name: 'track_exam_levels', group: 'content', primaryKey: 'learning_track,exam_level', checksum: true },
  { name: 'vocab', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'grammar', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'kanji', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'sentences', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'sysprog_terms', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'curriculum_weeks', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'homophone_pairs', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'reading_passages', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'reading_questions', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'self_check_templates', group: 'content', primaryKey: 'id', checksum: true, checksumIgnoreColumns: ['learning_track'] },
  { name: 'quiz_question_bank', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'content_seed_runs', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'content_seed_sources', group: 'content', primaryKey: 'seed_run_id,source_code', checksum: true },
  { name: 'track_content_seed_runs', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'track_content_seed_sources', group: 'content', primaryKey: 'seed_run_id,source_code', checksum: true },
  { name: 'topik_exam_blueprints', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'topik_official_statistics', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'topik_placement_questions', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'topik_practice_questions', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'jlpt_practice_questions', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'content_release_sources', group: 'content', primaryKey: 'release_id,source_code', checksum: true },
  { name: 'content_release_jobs', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'content_release_poison_reports', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'content_release_preview_candidates', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'content_release_private_policies', group: 'content', primaryKey: 'release_id', checksum: true },
  { name: 'content_release_private_publications', group: 'content', primaryKey: 'release_id', checksum: true },
  { name: 'content_release_gate_evidence', group: 'content', primaryKey: 'release_id,gate', checksum: true },
  { name: 'content_release_quality_requirements', group: 'content', primaryKey: 'release_id', checksum: true },
  { name: 'content_quality_audits', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'content_release_quality_audit_links', group: 'content', primaryKey: 'release_id,audit_id', checksum: true },
  { name: 'topik_curriculum_units', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'topik_content_items', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'topik_owner_authored_curriculum_units', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'topik_owner_authored_curriculum_items', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'learning_content_stable_refs', group: 'content', primaryKey: 'stable_ref', checksum: true },
  { name: 'learning_content_level_references', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'content_audio_bindings', group: 'content', primaryKey: 'stable_ref', checksum: true },
  { name: 'content_speech_bindings', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'users', group: 'mutable', primaryKey: 'id', checksum: true, checksumIgnoreColumns: ['fsrs_options', 'learning_track'] },
  { name: 'auth_sessions', group: 'mutable', primaryKey: 'id', verifyWhere: 'revoked_at IS NULL AND expires_at > unixepoch()', checksum: false },
  { name: 'login_events', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'srs_cards', group: 'mutable', primaryKey: 'id', checksum: true, checksumIgnoreColumns: ['learning_track'] },
  { name: 'review_logs', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'daily_logs', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'quiz_attempts', group: 'mutable', primaryKey: 'id', checksum: true, checksumIgnoreColumns: ['score', 'learning_track'] },
  { name: 'self_check', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'push_subscriptions', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'audio_generation_log', group: 'mutable', primaryKey: 'id', checksum: true, checksumIgnoreColumns: ['provider', 'content_hash'] },
  { name: 'topik_placement_attempts', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'topik_placement_responses', group: 'mutable', primaryKey: 'attempt_id,question_id', checksum: true },
  { name: 'topik_owner_curriculum_progress', group: 'mutable', primaryKey: 'user_id,item_id', checksum: true },
  { name: 'topik_owner_srs_cards', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'topik_owner_review_logs', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'learning_activity_events', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'track_srs_settings', group: 'mutable', primaryKey: 'user_id,learning_track', checksum: true },
  { name: 'ai_assistance_usage_windows', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'ai_assistance_circuit_breakers', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'ai_assistance_audit_events', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'ai_writing_feedback_records', group: 'mutable', primaryKey: 'id', checksum: true },
] as const;

export const EXCLUDED_TRANSIENT_TABLES = ['_cf_KV', 'd1_migrations', 'oauth_states', 'oauth_login_tokens'] as const;
export const REBUILT_VIRTUAL_TABLES = ['vocab_fts', 'sentences_fts'] as const;

export function tablesForPhase(phase: 'content' | 'mutable' | 'all'): D1TableSpec[] {
  if (phase === 'all') return [...D1_TRANSFER_TABLES];
  return D1_TRANSFER_TABLES.filter((table) => table.group === phase);
}
