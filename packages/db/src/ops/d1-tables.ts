export type D1TableGroup = 'content' | 'mutable';
export type D1BackupSchemaProfile = '0027' | '0028' | '0029' | '0030' | '0031' | '0033';

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
// Wrangler/Miniflare creates this platform metadata table outside migrations;
// its own D1 explorer excludes it. Do not exempt arbitrary `_cf_*` tables.
export const EXCLUDED_GENERATED_METADATA_TABLES = ['_cf_METADATA'] as const;

export const D1_LEARNING_TRANSFER_TABLES: readonly D1TableSpec[] = [
  { name: 'content_learning_links', group: 'content', primaryKey: 'learning_track,question_ref,concept_ref', checksum: true },
  { name: 'learning_profiles', group: 'mutable', primaryKey: 'user_id,learning_track', checksum: true },
  { name: 'study_sessions', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'study_steps', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'learning_annotations', group: 'mutable', primaryKey: 'user_id,learning_track,scope,ref', checksum: true },
];

export const D1_REWARD_TRANSFER_TABLES: readonly D1TableSpec[] = [
  { name: 'study_reward_events', group: 'mutable', primaryKey: 'user_id,learning_track,source_id', checksum: true },
];

export const D1_NOTIFICATION_TRANSFER_TABLES: readonly D1TableSpec[] = [
  { name: 'push_notification_deliveries', group: 'mutable', primaryKey: 'id', checksum: true },
];
export const D1_LESSON_TRANSFER_TABLES: readonly D1TableSpec[] = [
  { name:'learning_lessons',group:'content',primaryKey:'id,version',checksum:true },
  { name:'learning_lesson_entries',group:'content',primaryKey:'lesson_id,lesson_version,ordinal',checksum:true },
];
// 0033 account data references users. Keep these immediately after users in
// the restore order, before the remaining user-owned mutable rows.
export const D1_ACCOUNT_PERSONALIZATION_TRANSFER_TABLES: readonly D1TableSpec[] = [
  { name: 'account_preferences', group: 'mutable', primaryKey: 'user_id', checksum: true },
  { name: 'account_avatars', group: 'mutable', primaryKey: 'user_id', checksum: true },
  { name: 'custom_reminder_deliveries', group: 'mutable', primaryKey: 'endpoint,local_date', checksum: true },
];

// Preserve the legacy constant/default for existing transfer/cleanup consumers.
// Backup and restore must choose an explicit profile, never the default.
export function tablesForPhase(
  phase: 'content' | 'mutable' | 'all',
  schemaProfile: D1BackupSchemaProfile = '0027',
): D1TableSpec[] {
  if (!['0027', '0028', '0029', '0030', '0031', '0033'].includes(schemaProfile)) {
    throw new Error('Unknown D1 backup schema profile');
  }
  const accountTables = schemaProfile === '0033' ? D1_ACCOUNT_PERSONALIZATION_TRANSFER_TABLES : [];
  const usersIndex = D1_TRANSFER_TABLES.findIndex((table) => table.name === 'users');
  const tables = [
    ...D1_TRANSFER_TABLES.slice(0, usersIndex + 1),
    ...accountTables,
    ...D1_TRANSFER_TABLES.slice(usersIndex + 1),
    ...(schemaProfile === '0027' ? [] : D1_LEARNING_TRANSFER_TABLES),
    ...(['0029', '0030', '0031', '0033'].includes(schemaProfile) ? D1_REWARD_TRANSFER_TABLES : []),
    ...(['0030', '0031', '0033'].includes(schemaProfile) ? D1_NOTIFICATION_TRANSFER_TABLES : []),
    ...(['0031', '0033'].includes(schemaProfile) ? D1_LESSON_TRANSFER_TABLES : []),
  ];
  return phase === 'all' ? tables : tables.filter((table) => table.group === phase);
}

/**
 * 0032 is trigger-only, so its actual migration ledger shares the 0031
 * 74-table backup profile. Operators may reconstruct that exact source before
 * importing, but no other source-ledger override is valid.
 */
export function exactRestoreSourceMigration(
  schemaProfile: D1BackupSchemaProfile,
  requested?: string,
): D1BackupSchemaProfile | '0032' {
  if (requested === undefined) return schemaProfile;
  if (schemaProfile === '0031' && requested === '0032') return '0032';
  throw new Error('Exact source migration must equal its backup profile, except explicit 0032 with backup profile 0031');
}

// Only schema metadata is read. Known FTS storage is rebuilt; unknown regular
// tables must fail closed instead of silently losing their rows in a backup.
export const D1_BACKUP_SCHEMA_QUERY = "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT GLOB 'sqlite_*' ORDER BY name";

export function parseD1SchemaTableNames(raw: string): string[] {
  const result = JSON.parse(raw) as Array<{ success?: boolean; results?: Array<{ name?: unknown }> }>;
  if (!Array.isArray(result) || result.length !== 1 || result[0]?.success !== true ||
      !Array.isArray(result[0].results) || result[0].results.some((row) => !row || typeof row.name !== 'string')) {
    throw new Error('D1 schema metadata query returned an invalid response');
  }
  return result[0].results.map((row) => row.name as string);
}

export function detectD1BackupSchemaProfile(tableNames: readonly string[]): D1BackupSchemaProfile {
  if (tableNames.some((name) => typeof name !== 'string') || new Set(tableNames).size !== tableNames.length) {
    throw new Error('Invalid or duplicate D1 schema table metadata');
  }
  const ignored = new Set<string>([
    ...EXCLUDED_TRANSIENT_TABLES,
    ...EXCLUDED_GENERATED_METADATA_TABLES,
    ...REBUILT_VIRTUAL_TABLES,
    ...REBUILT_VIRTUAL_TABLES.flatMap((table) => ['data', 'idx', 'content', 'docsize', 'config'].map((suffix) => `${table}_${suffix}`)),
  ]);
  const names = tableNames.filter((name) => !ignored.has(name) && !name.startsWith('sqlite_'));
  const learningCount = D1_LEARNING_TRANSFER_TABLES.filter((table) => names.includes(table.name)).length;
  if (learningCount !== 0 && learningCount !== D1_LEARNING_TRANSFER_TABLES.length) {
    const missing = D1_LEARNING_TRANSFER_TABLES.filter((table) => !names.includes(table.name)).map((table) => table.name);
    throw new Error(`Partial 0028 learning schema cannot be backed up; missing=${JSON.stringify(missing)}`);
  }
  const rewardCount = D1_REWARD_TRANSFER_TABLES.filter((table) => names.includes(table.name)).length;
  const notificationCount = D1_NOTIFICATION_TRANSFER_TABLES.filter((table) => names.includes(table.name)).length;
  const lessonCount=D1_LESSON_TRANSFER_TABLES.filter(table=>names.includes(table.name)).length;
  const accountCount = D1_ACCOUNT_PERSONALIZATION_TRANSFER_TABLES.filter((table) => names.includes(table.name)).length;
  if(lessonCount && (lessonCount!==2 || !notificationCount))throw new Error('Partial 0031 lesson schema cannot be backed up');
  if ((rewardCount && learningCount !== D1_LEARNING_TRANSFER_TABLES.length) || (notificationCount && !rewardCount)) {
    throw new Error('Partial 0029/0030 learning schema cannot be backed up');
  }
  if (accountCount && accountCount !== D1_ACCOUNT_PERSONALIZATION_TRANSFER_TABLES.length) {
    throw new Error('Partial 0033 account personalization schema cannot be backed up');
  }
  if (accountCount && (!lessonCount || !notificationCount || !rewardCount)) {
    throw new Error('Partial 0033 schema cannot be backed up');
  }
  const profile: D1BackupSchemaProfile = accountCount ? '0033' : lessonCount ? '0031' : notificationCount ? '0030' : rewardCount ? '0029' : learningCount ? '0028' : '0027';
  const expected = tablesForPhase('all', profile).map((table) => table.name).sort();
  if (JSON.stringify([...names].sort()) !== JSON.stringify(expected)) {
    const missing = expected.filter((name) => !names.includes(name));
    const unknown = names.filter((name) => !expected.includes(name)).sort();
    throw new Error(`D1 schema has missing or unknown regular tables; missing=${JSON.stringify(missing)} unknown=${JSON.stringify(unknown)}; backup profile is not supported`);
  }
  return profile;
}
