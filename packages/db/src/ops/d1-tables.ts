export type D1TableGroup = 'content' | 'mutable';

export type D1TableSpec = {
  name: string;
  group: D1TableGroup;
  primaryKey: string;
  verifyWhere?: string;
  checksum: boolean;
};

// Order is parent-first for import. Reverse it before deleting target data.
export const D1_TRANSFER_TABLES: readonly D1TableSpec[] = [
  { name: 'sources', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'categories', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'vocab', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'grammar', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'kanji', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'sentences', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'sysprog_terms', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'curriculum_weeks', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'homophone_pairs', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'reading_passages', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'reading_questions', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'self_check_templates', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'quiz_question_bank', group: 'content', primaryKey: 'id', checksum: true },
  { name: 'users', group: 'mutable', primaryKey: 'id', checksum: true },
  {
    name: 'auth_sessions',
    group: 'mutable',
    primaryKey: 'id',
    verifyWhere: 'revoked_at IS NULL AND expires_at > unixepoch()',
    checksum: false,
  },
  { name: 'login_events', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'srs_cards', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'review_logs', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'daily_logs', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'quiz_attempts', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'self_check', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'push_subscriptions', group: 'mutable', primaryKey: 'id', checksum: true },
  { name: 'audio_generation_log', group: 'mutable', primaryKey: 'id', checksum: true },
] as const;

export const EXCLUDED_TRANSIENT_TABLES = ['oauth_states', 'oauth_login_tokens'] as const;
export const REBUILT_VIRTUAL_TABLES = ['vocab_fts', 'sentences_fts'] as const;

export function tablesForPhase(phase: 'content' | 'mutable' | 'all'): D1TableSpec[] {
  if (phase === 'all') return [...D1_TRANSFER_TABLES];
  return D1_TRANSFER_TABLES.filter((table) => table.group === phase);
}
