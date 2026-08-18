/**
 * packages/db/src/schema.ts
 *
 * Drizzle ORM 스키마 — nihongo-n3 D1 데이터베이스
 *
 * 테이블 분류:
 *   콘텐츠계: sources, categories, vocab, grammar, kanji,
 *             sentences, sysprog_terms, curriculum_weeks, homophone_pairs
 *   학습계:   users, srs_cards, review_logs, daily_logs,
 *             learning_activity_events, quiz_attempts, self_check
 *
 * JSON 컬럼: SQLite text 저장, .$type<T>()로 타입 힌트.
 * FSRS-6:   stability / difficulty 필드가 srs_cards에 있음.
 * 발음:     브라우저 Google 음성만 사용하며 D1에는 텍스트 eligibility만 기록.
 */
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  primaryKey,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─────────────────────────────────────────────
// 공통 타임스탬프
// ─────────────────────────────────────────────
const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
};

// ═══════════════════════════════════════════════════════════════════
// ── 콘텐츠 계열
// ═══════════════════════════════════════════════════════════════════

export const sources = sqliteTable('sources', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  filePath: text('file_path').notNull(),
  version: text('version').notNull().default('1.0.0'),
  ...timestamps,
});

/** Separate source/provenance contract for each learning track. */
export const trackContentSources = sqliteTable(
  'track_content_sources',
  {
    learningTrack: text('learning_track', { enum: ['jlpt-ja', 'topik-ko'] }).notNull(),
    sourceCode: text('source_code').notNull(),
    title: text('title').notNull(),
    filePath: text('file_path').notNull(),
    sourceVersion: text('source_version').notNull(),
    provenanceJson: text('provenance_json').notNull(),
    ...timestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.learningTrack, t.sourceCode] }),
  }),
);

export const trackExamLevels = sqliteTable(
  'track_exam_levels',
  {
    learningTrack: text('learning_track', { enum: ['jlpt-ja', 'topik-ko'] }).notNull(),
    examLevel: text('exam_level').notNull(),
    sortOrder: integer('sort_order').notNull(),
    labelEn: text('label_en').notNull(),
    labelKo: text('label_ko').notNull(),
    sectionsJson: text('sections_json').notNull(),
    ...timestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.learningTrack, t.examLevel] }),
  }),
);

export const trackContentSeedRuns = sqliteTable(
  'track_content_seed_runs',
  {
    id: text('id').primaryKey(),
    learningTrack: text('learning_track', { enum: ['jlpt-ja', 'topik-ko'] }).notNull(),
    contentVersion: text('content_version').notNull(),
    parserVersion: text('parser_version').notNull(),
    manifestSha256: text('manifest_sha256').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    trackVersionUk: uniqueIndex('track_content_seed_runs_track_version_uk').on(t.learningTrack, t.contentVersion),
  }),
);

export const trackContentSeedSources = sqliteTable(
  'track_content_seed_sources',
  {
    seedRunId: text('seed_run_id').notNull().references(() => trackContentSeedRuns.id, { onDelete: 'cascade' }),
    learningTrack: text('learning_track', { enum: ['jlpt-ja', 'topik-ko'] }).notNull(),
    sourceCode: text('source_code').notNull(),
    sourceChecksum: text('source_checksum').notNull(),
    parserVersion: text('parser_version').notNull(),
    provenanceJson: text('provenance_json').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.seedRunId, t.sourceCode] }),
  }),
);

/**
 * Immutable provenance for content sources. The legacy R2-related columns
 * remain mapped only because migration 0017 created them; production guards
 * prohibit filling them for pronunciation.
 */
export const contentSourceAssets = sqliteTable(
  'content_source_assets',
  {
    id: text('id').primaryKey(),
    assetKind: text('asset_kind', {
      enum: ['self-authored-fixture', 'licensed-external-text', 'licensed-external-file', 'licensed-web-audio', 'tts-generated'],
    }).notNull(),
    sourceUrl: text('source_url').notNull(),
    licenseId: text('license_id').notNull(),
    licenseUrl: text('license_url').notNull(),
    attributionText: text('attribution_text').notNull(),
    allowedUse: text('allowed_use').notNull(),
    sourceSha256: text('source_sha256').notNull(),
    retrievedAt: integer('retrieved_at', { mode: 'timestamp' }),
    generatedAt: integer('generated_at', { mode: 'timestamp' }),
    storedAudioBytesSha256: text('stored_audio_bytes_sha256'),
    immutableR2Key: text('immutable_r2_key'),
    mimeType: text('mime_type'),
    provider: text('provider'),
    model: text('model'),
    language: text('language'),
    voice: text('voice'),
    providerVersion: text('provider_version'),
    inputTextSha256: text('input_text_sha256'),
    selectionReason: text('selection_reason'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ kindIdx: index('content_source_assets_kind_idx').on(t.assetKind, t.language) }),
);

/** Stable identifiers bridge existing polymorphic learning tables to provenance. */
export const learningContentStableRefs = sqliteTable(
  'learning_content_stable_refs',
  {
    stableRef: text('stable_ref').primaryKey(),
    learningTrack: text('learning_track', { enum: ['jlpt-ja', 'topik-ko'] }).notNull(),
    itemType: text('item_type', {
      enum: ['jlpt-vocab', 'jlpt-grammar', 'jlpt-kanji', 'jlpt-sentence', 'jlpt-reading', 'topik-owner-item'],
    }).notNull(),
    itemId: text('item_id').notNull(),
    levelTag: text('level_tag').notNull(),
    sourceAssetId: text('source_asset_id').notNull().references(() => contentSourceAssets.id, { onDelete: 'restrict' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    itemUk: uniqueIndex('learning_content_stable_refs_item_type_item_id_uk').on(t.itemType, t.itemId),
    trackLevelIdx: index('learning_content_stable_refs_track_level_idx').on(t.learningTrack, t.levelTag, t.itemType),
  }),
);

/**
 * Stable audio metadata for authored content. Production accepts pending
 * metadata only; playback is browser Google speech and no R2-ready binding
 * may be inserted.
 */
export const contentAudioBindings = sqliteTable(
  'content_audio_bindings',
  {
    id: text('id').primaryKey(),
    stableRef: text('stable_ref').notNull().references(() => learningContentStableRefs.stableRef, { onDelete: 'restrict' }),
    itemType: text('item_type', {
      enum: ['jlpt-vocab', 'jlpt-kanji', 'jlpt-sentence', 'jlpt-reading', 'topik-owner-item'],
    }).notNull(),
    itemId: text('item_id').notNull(),
    language: text('language', { enum: ['ja', 'ko'] }).notNull(),
    audioRole: text('audio_role', { enum: ['pronunciation', 'listening'] }).notNull(),
    bindingState: text('binding_state', { enum: ['preparing', 'not-provided'] }).notNull(),
    assetId: text('asset_id').references(() => contentSourceAssets.id, { onDelete: 'restrict' }),
    unavailableReason: text('unavailable_reason'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    bindingUk: uniqueIndex('content_audio_bindings_item_language_role_uk').on(t.itemType, t.itemId, t.language, t.audioRole),
    stateIdx: index('content_audio_bindings_state_idx').on(t.bindingState, t.language, t.audioRole),
  }),
);

/** Google browser speech eligibility. It deliberately has no binary/R2 field. */
export const contentSpeechBindings = sqliteTable(
  'content_speech_bindings',
  {
    id: text('id').primaryKey(),
    stableRef: text('stable_ref').notNull().references(() => learningContentStableRefs.stableRef, { onDelete: 'restrict' }),
    itemType: text('item_type', {
      enum: ['jlpt-vocab', 'jlpt-kanji', 'jlpt-sentence', 'jlpt-reading', 'topik-owner-item'],
    }).notNull(),
    itemId: text('item_id').notNull(),
    language: text('language', { enum: ['ja', 'ko'] }).notNull(),
    speechRole: text('speech_role', { enum: ['pronunciation', 'listening'] }).notNull(),
    provider: text('provider', { enum: ['google-browser'] }).notNull().default('google-browser'),
    bindingState: text('binding_state', { enum: ['ready', 'unavailable'] }).notNull(),
    textSource: text('text_source', { enum: ['item', 'sentence', 'passage', 'audio-script'] }).notNull(),
    unavailableReason: text('unavailable_reason'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    bindingUk: uniqueIndex('content_speech_bindings_item_language_role_uk').on(t.itemType, t.itemId, t.language, t.speechRole),
    stateIdx: index('content_speech_bindings_state_idx').on(t.bindingState, t.language, t.speechRole),
  }),
);

/** Reuses a canonical item in another curriculum level without relabelling it. */
export const learningContentLevelReferences = sqliteTable(
  'learning_content_level_references',
  {
    id: text('id').primaryKey(),
    learningTrack: text('learning_track', { enum: ['jlpt-ja', 'topik-ko'] }).notNull(),
    curriculumLevel: text('curriculum_level').notNull(),
    itemType: text('item_type', {
      enum: ['jlpt-vocab', 'jlpt-grammar', 'jlpt-kanji', 'jlpt-sentence', 'jlpt-reading', 'topik-owner-item'],
    }).notNull(),
    itemId: text('item_id').notNull(),
    referenceKind: text('reference_kind', { enum: ['primary', 'prerequisite'] }).notNull(),
    sourceAssetId: text('source_asset_id').notNull().references(() => contentSourceAssets.id, { onDelete: 'restrict' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    itemUk: uniqueIndex('learning_content_level_references_uk').on(t.learningTrack, t.curriculumLevel, t.itemType, t.itemId, t.referenceKind),
    lookupIdx: index('learning_content_level_references_lookup_idx').on(t.learningTrack, t.curriculumLevel, t.itemType),
  }),
);

/** Owner-authored TOPIK grade 1–6 curriculum; separate from the reviewed practice bank. */
export const topikOwnerAuthoredCurriculumUnits = sqliteTable(
  'topik_owner_authored_curriculum_units',
  {
    id: text('id').primaryKey(),
    targetGrade: integer('target_grade').notNull(),
    stableRef: text('stable_ref').notNull().unique(),
    section: text('section', { enum: ['vocab', 'grammar', 'reading', 'listening', 'writing'] }).notNull(),
    titleKo: text('title_ko').notNull(),
    titleJa: text('title_ja').notNull(),
    titleEn: text('title_en').notNull(),
    sourceAssetId: text('source_asset_id').notNull().references(() => contentSourceAssets.id, { onDelete: 'restrict' }),
    ...timestamps,
  },
  (t) => ({ gradeIdx: index('topik_owner_curriculum_units_grade_idx').on(t.targetGrade, t.section) }),
);

export const topikOwnerAuthoredCurriculumItems = sqliteTable(
  'topik_owner_authored_curriculum_items',
  {
    id: text('id').primaryKey(),
    unitId: text('unit_id').notNull().references(() => topikOwnerAuthoredCurriculumUnits.id, { onDelete: 'restrict' }),
    targetGrade: integer('target_grade').notNull(),
    stableRef: text('stable_ref').notNull().unique(),
    itemType: text('item_type', { enum: ['vocab', 'grammar', 'reading', 'listening', 'writing'] }).notNull(),
    promptKo: text('prompt_ko').notNull(),
    promptJa: text('prompt_ja').notNull(),
    promptEn: text('prompt_en').notNull(),
    answerJson: text('answer_json').notNull().default('{}'),
    explanationKo: text('explanation_ko').notNull(),
    explanationJa: text('explanation_ja').notNull(),
    explanationEn: text('explanation_en').notNull(),
    audioRequired: integer('audio_required', { mode: 'boolean' }).notNull().default(false),
    /** Spoken Korean text; separate from the learner-facing question prompt. */
    audioTextKo: text('audio_text_ko'),
    sourceAssetId: text('source_asset_id').notNull().references(() => contentSourceAssets.id, { onDelete: 'restrict' }),
    ...timestamps,
  },
  (t) => ({ gradeIdx: index('topik_owner_curriculum_items_grade_idx').on(t.targetGrade, t.itemType) }),
);

/** Immutable, review-gated release ledger shared by track-specific content. */
export const contentReleases = sqliteTable(
  'content_releases',
  {
    id: text('id').primaryKey(),
    learningTrack: text('learning_track', { enum: ['jlpt-ja', 'topik-ko'] }).notNull(),
    contentVersion: text('content_version').notNull(),
    releaseState: text('release_state', {
      enum: ['draft', 'automated_checked', 'human_reviewed', 'preview', 'approved', 'published', 'withdrawn'],
    }).notNull().default('draft'),
    manifestSha256: text('manifest_sha256').notNull(),
    parserVersion: text('parser_version').notNull(),
    publishedAt: integer('published_at'),
    withdrawnAt: integer('withdrawn_at'),
    ...timestamps,
  },
  (t) => ({
    trackVersionUk: uniqueIndex('content_releases_track_version_uk').on(t.learningTrack, t.contentVersion),
    stateIdx: index('content_releases_state_idx').on(t.learningTrack, t.releaseState),
  }),
);

/** Provenance required before a release can advance beyond automated checks. */
export const contentReleaseSources = sqliteTable(
  'content_release_sources',
  {
    releaseId: text('release_id').notNull().references(() => contentReleases.id, { onDelete: 'cascade' }),
    sourceCode: text('source_code').notNull(),
    sourceType: text('source_type', { enum: ['self-authored', 'licensed-external', 'official-reference', 'fixture'] }).notNull(),
    sourceUrl: text('source_url').notNull(),
    retrievedAt: text('retrieved_at').notNull(),
    sourceSha256: text('source_sha256').notNull(),
    licenseId: text('license_id').notNull(),
    licenseUrl: text('license_url').notNull(),
    allowedUse: text('allowed_use').notNull(),
    attributionText: text('attribution_text').notNull(),
    author: text('author').notNull(),
    firstReviewer: text('first_reviewer').notNull(),
    secondReviewer: text('second_reviewer').notNull(),
    reviewedAt: text('reviewed_at').notNull(),
    firstReviewStatus: text('first_review_status', { enum: ['pending', 'signed'] }).notNull().default('pending'),
    firstReviewedAt: text('first_reviewed_at'),
    secondReviewStatus: text('second_review_status', { enum: ['pending', 'signed'] }).notNull().default('pending'),
    secondReviewedAt: text('second_reviewed_at'),
  },
  (t) => ({ pk: primaryKey({ columns: [t.releaseId, t.sourceCode] }) }),
);

/** Local release-control work references. Queue payloads contain no content body. */
export const contentReleaseJobs = sqliteTable(
  'content_release_jobs',
  {
    id: text('id').primaryKey(),
    releaseId: text('release_id').notNull().references(() => contentReleases.id, { onDelete: 'cascade' }),
    jobKind: text('job_kind', { enum: ['ingest', 'validate', 'ai_draft', 'qa', 'human_approval', 'preview_candidate'] }).notNull(),
    jobState: text('job_state', { enum: ['queued', 'processing', 'succeeded', 'waiting_for_approval', 'retryable_failed', 'failed', 'poisoned', 'cancelled'] }).notNull().default('queued'),
    artifactKey: text('artifact_key').notNull(),
    artifactSha256: text('artifact_sha256').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    queueAttempts: integer('queue_attempts').notNull().default(0),
    workflowInstanceId: text('workflow_instance_id'),
    errorCode: text('error_code'),
    ...timestamps,
  },
  (t) => ({
    idempotencyUk: uniqueIndex('content_release_jobs_idempotency_uk').on(t.idempotencyKey),
    releaseStateIdx: index('content_release_jobs_release_state_idx').on(t.releaseId, t.jobState),
  }),
);

/** Immutable evidence for production gates G0-G4. */
export const contentReleaseGateEvidence = sqliteTable(
  'content_release_gate_evidence',
  {
    releaseId: text('release_id').notNull().references(() => contentReleases.id, { onDelete: 'cascade' }),
    gate: text('gate', { enum: ['G0', 'G1', 'G2', 'G3', 'G4'] }).notNull(),
    gateState: text('gate_state', { enum: ['passed', 'failed'] }).notNull(),
    artifactKey: text('artifact_key').notNull(),
    artifactSha256: text('artifact_sha256').notNull(),
    recordedBy: text('recorded_by', { enum: ['system', 'operator'] }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ pk: primaryKey({ columns: [t.releaseId, t.gate] }) }),
);

/** An approved release can become a preview candidate but is never auto-published. */
export const contentReleasePreviewCandidates = sqliteTable(
  'content_release_preview_candidates',
  {
    id: text('id').primaryKey(),
    releaseId: text('release_id').notNull().references(() => contentReleases.id, { onDelete: 'cascade' }).unique(),
    candidateState: text('candidate_state', { enum: ['created', 'ready', 'withdrawn'] }).notNull().default('created'),
    manifestKey: text('manifest_key').notNull(),
    manifestSha256: text('manifest_sha256').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    readyAt: integer('ready_at', { mode: 'timestamp' }),
    withdrawnAt: integer('withdrawn_at', { mode: 'timestamp' }),
  },
);

/** DLQ record with references and error code only; no message body or PII. */
export const contentReleasePoisonReports = sqliteTable(
  'content_release_poison_reports',
  {
    id: text('id').primaryKey(),
    jobId: text('job_id').notNull().references(() => contentReleaseJobs.id, { onDelete: 'cascade' }),
    queueName: text('queue_name').notNull(),
    messageId: text('message_id').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    attempts: integer('attempts').notNull(),
    reasonCode: text('reason_code').notNull(),
    artifactKey: text('artifact_key').notNull(),
    artifactSha256: text('artifact_sha256').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ queueMessageUk: uniqueIndex('content_release_poison_reports_queue_message_uk').on(t.queueName, t.messageId) }),
);

/** TOPIK curriculum units remain separate from JLPT levels and source tables. */
export const topikCurriculumUnits = sqliteTable(
  'topik_curriculum_units',
  {
    id: text('id').primaryKey(),
    releaseId: text('release_id').notNull().references(() => contentReleases.id, { onDelete: 'restrict' }),
    learningTrack: text('learning_track', { enum: ['topik-ko'] }).notNull().default('topik-ko'),
    stableRef: text('stable_ref').notNull(),
    examLevel: text('exam_level', { enum: ['TOPIK-I', 'TOPIK-II'] }).notNull(),
    examBand: text('exam_band', { enum: ['beginner', 'intermediate', 'advanced'] }).notNull(),
    section: text('section', { enum: ['listening', 'writing', 'reading'] }).notNull(),
    titleKo: text('title_ko').notNull(),
    titleJa: text('title_ja').notNull(),
    titleEn: text('title_en').notNull(),
    instructionLanguagesJson: text('instruction_languages_json').notNull(),
    ...timestamps,
  },
  (t) => ({
    releaseStableUk: uniqueIndex('topik_curriculum_units_release_stable_uk').on(t.releaseId, t.stableRef),
    releaseSectionIdx: index('topik_curriculum_units_release_section_idx').on(t.releaseId, t.examLevel, t.section),
  }),
);

/** Release-controlled TOPIK items. Sensitive answer material is never public by default. */
export const topikContentItems = sqliteTable(
  'topik_content_items',
  {
    id: text('id').primaryKey(),
    releaseId: text('release_id').notNull().references(() => contentReleases.id, { onDelete: 'restrict' }),
    unitId: text('unit_id').notNull().references(() => topikCurriculumUnits.id, { onDelete: 'restrict' }),
    learningTrack: text('learning_track', { enum: ['topik-ko'] }).notNull().default('topik-ko'),
    stableRef: text('stable_ref').notNull(),
    examLevel: text('exam_level', { enum: ['TOPIK-I', 'TOPIK-II'] }).notNull(),
    examBand: text('exam_band', { enum: ['beginner', 'intermediate', 'advanced'] }).notNull(),
    section: text('section', { enum: ['listening', 'writing', 'reading'] }).notNull(),
    itemKind: text('item_kind', { enum: ['lesson', 'vocab', 'grammar', 'character', 'listening', 'reading', 'writing', 'practice'] }).notNull(),
    skill: text('skill').notNull(),
    difficulty: integer('difficulty').notNull(),
    promptKo: text('prompt_ko').notNull(),
    promptJa: text('prompt_ja').notNull(),
    promptEn: text('prompt_en').notNull(),
    answerPayloadJson: text('answer_payload_json').notNull(),
    explanationKo: text('explanation_ko').notNull(),
    explanationJa: text('explanation_ja').notNull(),
    explanationEn: text('explanation_en').notNull(),
    sourceCode: text('source_code').notNull(),
    ...timestamps,
  },
  (t) => ({
    releaseStableUk: uniqueIndex('topik_content_items_release_stable_uk').on(t.releaseId, t.stableRef),
    releaseLookupIdx: index('topik_content_items_release_lookup_idx').on(t.releaseId, t.examLevel, t.section, t.itemKind, t.difficulty),
  }),
);

/** Pseudonymous AI counters only. No email, IP, prompt, completion, or answer text. */
export const aiAssistanceUsageWindows = sqliteTable(
  'ai_assistance_usage_windows',
  {
    learningTrack: text('learning_track', { enum: ['jlpt-ja', 'topik-ko'] }).notNull(),
    feature: text('feature', { enum: ['content_lint', 'content_draft', 'grounded_explanation', 'topik_writing_feedback'] }).notNull(),
    userBucket: text('user_bucket').notNull(),
    windowKind: text('window_kind', { enum: ['minute', 'day', 'month'] }).notNull(),
    windowKey: text('window_key').notNull(),
    requestCount: integer('request_count').notNull().default(0),
    estimatedCostMicrousd: integer('estimated_cost_microusd').notNull().default(0),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.learningTrack, t.feature, t.userBucket, t.windowKind, t.windowKey] }),
    expiryIdx: index('ai_assistance_usage_window_expiry_idx').on(t.windowKind, t.windowKey, t.updatedAt),
  }),
);

export const aiAssistanceCircuitBreakers = sqliteTable(
  'ai_assistance_circuit_breakers',
  {
    learningTrack: text('learning_track', { enum: ['jlpt-ja', 'topik-ko'] }).notNull(),
    feature: text('feature', { enum: ['content_lint', 'content_draft', 'grounded_explanation', 'topik_writing_feedback'] }).notNull(),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    openedUntil: integer('opened_until'),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ pk: primaryKey({ columns: [t.learningTrack, t.feature] }) }),
);

export const aiAssistanceAuditEvents = sqliteTable(
  'ai_assistance_audit_events',
  {
    id: text('id').primaryKey(),
    requestId: text('request_id').notNull().unique(),
    learningTrack: text('learning_track', { enum: ['jlpt-ja', 'topik-ko'] }).notNull(),
    releaseId: text('release_id').references(() => contentReleases.id, { onDelete: 'set null' }),
    feature: text('feature', { enum: ['content_lint', 'content_draft', 'grounded_explanation', 'topik_writing_feedback'] }).notNull(),
    promptVersion: text('prompt_version').notNull(),
    provider: text('provider', { enum: ['disabled', 'workers-ai', 'ai-gateway', 'fallback'] }).notNull(),
    model: text('model'),
    userBucket: text('user_bucket').notNull(),
    outcome: text('outcome', { enum: ['success', 'fallback', 'blocked', 'disabled', 'invalid_output', 'provider_error'] }).notNull(),
    inputChars: integer('input_chars').notNull().default(0),
    outputChars: integer('output_chars').notNull().default(0),
    estimatedCostMicrousd: integer('estimated_cost_microusd').notNull().default(0),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ expiryIdx: index('ai_assistance_audit_expiry_idx').on(t.expiresAt) }),
);

/** Optional saved feedback contains a hash and sanitized rubric only, never raw writing. */
export const aiWritingFeedbackRecords = sqliteTable(
  'ai_writing_feedback_records',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    learningTrack: text('learning_track', { enum: ['topik-ko'] }).notNull().default('topik-ko'),
    releaseId: text('release_id').notNull().references(() => contentReleases.id, { onDelete: 'restrict' }),
    itemId: text('item_id').notNull().references(() => topikContentItems.id, { onDelete: 'restrict' }),
    inputSha256: text('input_sha256').notNull(),
    feedbackJson: text('feedback_json').notNull(),
    promptVersion: text('prompt_version').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ userExpiryIdx: index('ai_writing_feedback_user_expiry_idx').on(t.userId, t.learningTrack, t.expiresAt) }),
);

/** Official TOPIK test-format reference, kept separate from self-authored learning questions. */
export const topikExamBlueprints = sqliteTable(
  'topik_exam_blueprints',
  {
    id: text('id').primaryKey(),
    learningTrack: text('learning_track', { enum: ['topik-ko'] }).notNull().default('topik-ko'),
    examLevel: text('exam_level').notNull(),
    deliveryMode: text('delivery_mode').notNull(),
    section: text('section').notNull(),
    questionCount: integer('question_count').notNull(),
    sectionScore: integer('section_score').notNull(),
    totalScore: integer('total_score').notNull(),
    gradeMin: integer('grade_min').notNull(),
    gradeMax: integer('grade_max').notNull(),
    sourceCode: text('source_code').notNull(),
    sourceUrl: text('source_url').notNull(),
    sourceVersion: text('source_version').notNull(),
    ...timestamps,
  },
  (t) => ({
    levelIdx: index('topik_exam_blueprint_level_idx').on(t.learningTrack, t.examLevel, t.deliveryMode),
  }),
);

/** Aggregate public applicant data. No individual score, answer, or identity is stored. */
export const topikOfficialStatistics = sqliteTable(
  'topik_official_statistics',
  {
    learningTrack: text('learning_track', { enum: ['topik-ko'] }).notNull().default('topik-ko'),
    sourceCode: text('source_code').notNull(),
    countryNameKo: text('country_name_ko').notNull(),
    examLevel: text('exam_level').notNull(),
    ageBand: text('age_band').notNull(),
    applicantCount: integer('applicant_count').notNull(),
    sourceRow: integer('source_row').notNull(),
    ...timestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.learningTrack, t.sourceCode, t.countryNameKo, t.examLevel, t.ageBand] }),
    levelIdx: index('topik_official_statistics_level_idx').on(t.learningTrack, t.sourceCode, t.examLevel, t.ageBand),
  }),
);

export const categories = sqliteTable(
  'categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sourceId: integer('source_id').notNull().references(() => sources.id),
    code: text('code').notNull(),
    nameKo: text('name_ko').notNull(),
    nameJa: text('name_ja'),
    orderIdx: integer('order_idx').notNull().default(0),
    ...timestamps,
  },
  (t) => ({
    sourceCodeUk: uniqueIndex('categories_source_code_uk').on(t.sourceId, t.code),
  }),
);

export const vocab = sqliteTable(
  'vocab',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sourceId: integer('source_id').notNull().references(() => sources.id),
    categoryId: integer('category_id').references(() => categories.id),
    level: text('level', { enum: ['N5', 'N4', 'N3', 'N2', 'N1'] }).notNull(),
    ja: text('ja').notNull(),
    kana: text('kana').notNull().default(''),
    ko: text('ko').notNull(),
    pos: text('pos').notNull().default(''),
    kanjiHint: text('kanji_hint'),
    trapNote: text('trap_note'),
    frequencyRank: integer('frequency_rank'),
    tags: text('tags').notNull().default('[]').$type<string>(),
    audioR2Key: text('audio_r2_key'),
    audioGenerationAttempts: integer('audio_generation_attempts').notNull().default(0),
    ...timestamps,
  },
  (t) => ({
    levelIdx: index('vocab_level_idx').on(t.level),
    categoryIdx: index('vocab_category_idx').on(t.categoryId),
    naturalUk: uniqueIndex('vocab_natural_uk').on(t.level, t.ja, t.kana),
  }),
);

export const grammar = sqliteTable(
  'grammar',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sourceId: integer('source_id').notNull().references(() => sources.id),
    categoryId: integer('category_id').references(() => categories.id),
    level: text('level', { enum: ['N5', 'N4', 'N3', 'N2', 'N1'] }).notNull(),
    pattern: text('pattern').notNull(),
    connection: text('connection'),
    meaningKo: text('meaning_ko').notNull(),
    contrastKo: text('contrast_ko'),
    errorNote: text('error_note'),
    examples: text('examples').notNull().default('[]').$type<string>(),
    ...timestamps,
  },
  (t) => ({
    levelIdx: index('grammar_level_idx').on(t.level),
    naturalUk: uniqueIndex('grammar_natural_uk').on(t.level, t.pattern),
  }),
);

export const kanji = sqliteTable(
  'kanji',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    char: text('char').notNull().unique(),
    onYomi: text('on_yomi'),
    kunYomi: text('kun_yomi'),
    meaningKo: text('meaning_ko').notNull(),
    strokeCount: integer('stroke_count'),
    radical: text('radical'),
    jlptLevel: text('jlpt_level', {
      enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
    }).notNull(),
    frequencyRank: integer('frequency_rank'),
    koreanHanjaPronu: text('korean_hanja_pronunciation'),
    relatedVocabIds: text('related_vocab_ids').notNull().default('[]').$type<string>(),
    audioR2Key: text('audio_r2_key'),
    audioGenerationAttempts: integer('audio_generation_attempts').notNull().default(0),
    ...timestamps,
  },
  (t) => ({
    jlptLevelIdx: index('kanji_jlpt_level_idx').on(t.jlptLevel),
  }),
);

export const sentences = sqliteTable(
  'sentences',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sourceId: integer('source_id').notNull().references(() => sources.id),
    level: text('level', { enum: ['N5', 'N4', 'N3', 'N2', 'N1'] }).notNull(),
    register: text('register', {
      enum: ['conversation', 'newspaper', 'business'],
    }).notNull(),
    seqNo: integer('seq_no').notNull().default(0),
    ja: text('ja').notNull(),
    kana: text('kana'),
    ko: text('ko').notNull(),
    audioR2Key: text('audio_r2_key'),
    audioGenerationAttempts: integer('audio_generation_attempts').notNull().default(0),
    vocabIds: text('vocab_ids').notNull().default('[]').$type<string>(),
    grammarIds: text('grammar_ids').notNull().default('[]').$type<string>(),
    ...timestamps,
  },
  (t) => ({
    levelRegisterIdx: index('sentences_level_register_idx').on(t.level, t.register),
    sourceSeqUk: uniqueIndex('sentences_source_seq_uk').on(
      t.sourceId, t.level, t.register, t.seqNo,
    ),
  }),
);

export const sysProgTerms = sqliteTable(
  'sysprog_terms',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    categoryCode: text('category_code').notNull(),
    ja: text('ja').notNull(),
    kana: text('kana'),
    ko: text('ko').notNull(),
    domain: text('domain', {
      enum: [
        'programming', 'architecture', 'ml',
        'semiconductor_front', 'semiconductor_back',
        'manufacturing', 'automotive', 'pm', 'business',
      ],
    }).notNull(),
    starFreq: integer('star_freq', { mode: 'boolean' }).notNull().default(false),
    note: text('note'),
    ...timestamps,
  },
  (t) => ({
    naturalUk: uniqueIndex('sysprog_natural_uk').on(t.ja, t.domain),
    domainIdx: index('sysprog_domain_idx').on(t.domain),
    categoryIdx: index('sysprog_category_idx').on(t.categoryCode),
  }),
);

export const curriculumWeeks = sqliteTable('curriculum_weeks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  weekNo: integer('week_no').notNull().unique(),
  theme: text('theme').notNull(),
  vocabTarget: integer('vocab_target').notNull().default(0),
  grammarTarget: integer('grammar_target').notNull().default(0),
  kanjiTarget: integer('kanji_target').notNull().default(0),
  sentenceTarget: integer('sentence_target').notNull().default(0),
  milestoneTest: text('milestone_test'),
  ...timestamps,
});

export const homophonePairs = sqliteTable(
  'homophone_pairs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    level: text('level', { enum: ['N5', 'N4', 'N3', 'N2', 'N1'] }).notNull(),
    wordAId: integer('word_a_id').notNull().references(() => vocab.id),
    wordBId: integer('word_b_id').notNull().references(() => vocab.id),
    wordASourceCode: text('word_a_source_code').notNull().default(''),
    wordBSourceCode: text('word_b_source_code').notNull().default(''),
    noteKo: text('note_ko'),
    accentSource: text('accent_source').notNull().default(''),
    accentSourceUrl: text('accent_source_url').notNull().default(''),
    accentA: text('accent_a').notNull().default(''),
    accentB: text('accent_b').notNull().default(''),
    exampleAJa: text('example_a_ja').notNull().default(''),
    exampleAKo: text('example_a_ko').notNull().default(''),
    exampleBJa: text('example_b_ja').notNull().default(''),
    exampleBKo: text('example_b_ko').notNull().default(''),
    reviewer: text('reviewer').notNull().default(''),
    reviewedAt: text('reviewed_at').notNull().default(''),
    ...timestamps,
  },
  (t) => ({
    pairUk: uniqueIndex('homophone_pair_uk').on(t.wordAId, t.wordBId),
    levelIdx: index('homophone_level_idx').on(t.level),
    reviewedIdx: index('homophone_reviewed_idx').on(t.reviewedAt),
  }),
);

export const contentSeedRuns = sqliteTable('content_seed_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  runId: text('run_id').notNull().unique(),
  contentVersion: text('content_version').notNull(),
  parserVersion: text('parser_version').notNull(),
  manifestSha256: text('manifest_sha256').notNull(),
  generatedAt: text('generated_at').notNull(),
  appliedAt: integer('applied_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const contentSeedSources = sqliteTable(
  'content_seed_sources',
  {
    seedRunId: integer('seed_run_id')
      .notNull()
      .references(() => contentSeedRuns.id, { onDelete: 'cascade' }),
    sourceCode: text('source_code').notNull(),
    sourceChecksum: text('source_checksum').notNull(),
    parserVersion: text('parser_version').notNull(),
    provenanceJson: text('provenance_json').notNull(),
  },
  (t) => ({
    runSourceUk: uniqueIndex('content_seed_sources_run_source_uk').on(t.seedRunId, t.sourceCode),
    sourceIdx: index('content_seed_sources_source_idx').on(t.sourceCode),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// ── 학습 계열
// ═══════════════════════════════════════════════════════════════════

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('user'),
  authProvider: text('auth_provider').notNull().default('password'),
  learningTrack: text('learning_track', { enum: ['jlpt-ja', 'topik-ko'] }).notNull().default('jlpt-ja'),
  googleSub: text('google_sub'),
  lastLoginAt: integer('last_login_at'),
  fsrsOptions: text('fsrs_options'), // JSON: FsrsOptions (nullable)
  fsrsWeights: text('fsrs_weights'),
  srsSettings: text('srs_settings'),
  ...timestamps,
});

/**
 * Owner-private policy records contain only the attestation reference and hash.
 * They deliberately do not contain an account subject; that subject is captured
 * only by an authenticated admin-session claim in the Worker.
 */
export const contentReleasePrivatePolicies = sqliteTable(
  'content_release_private_policies',
  {
    releaseId: text('release_id').primaryKey().references(() => contentReleases.id, { onDelete: 'restrict' }),
    manifestSha256: text('manifest_sha256').notNull(),
    ownerRef: text('owner_ref').notNull(),
    ownerAttestedAt: text('owner_attested_at').notNull(),
    attestationSha256: text('attestation_sha256').notNull(),
    claimMethod: text('claim_method', { enum: ['authenticated_admin_session'] }).notNull(),
    publicPublishProhibited: integer('public_publish_prohibited', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
);

/**
 * A one-owner private publication. `ownerUserId` is never seeded or included in
 * evidence; the claim endpoint binds it from the authenticated admin session.
 */
export const contentReleasePrivatePublications = sqliteTable(
  'content_release_private_publications',
  {
    releaseId: text('release_id').primaryKey().references(() => contentReleases.id, { onDelete: 'restrict' }),
    ownerUserId: text('owner_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    manifestSha256: text('manifest_sha256').notNull(),
    privateState: text('private_state', { enum: ['owner_published', 'withdrawn'] }).notNull().default('owner_published'),
    claimedAt: integer('claimed_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    withdrawnAt: integer('withdrawn_at', { mode: 'timestamp' }),
  },
  (t) => ({ ownerStateIdx: index('content_release_private_publications_owner_state_idx').on(t.ownerUserId, t.privateState) }),
);

export const authSessions = sqliteTable('auth_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  lastSeenAt: integer('last_seen_at').notNull().default(sql`(unixepoch())`),
  revokedAt: integer('revoked_at'),
  userAgent: text('user_agent'),
  ip: text('ip'),
}, (t) => ({
  userIdx: index('auth_sessions_user_idx').on(t.userId),
  expiresIdx: index('auth_sessions_expires_idx').on(t.expiresAt),
}));

export const loginEvents = sqliteTable('login_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  email: text('email'),
  provider: text('provider').notNull(),
  eventType: text('event_type').notNull(),
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
}, (t) => ({
  userIdx: index('login_events_user_idx').on(t.userId, t.createdAt),
  createdIdx: index('login_events_created_idx').on(t.createdAt),
}));

/**
 * srs_cards — FSRS-6 호환 카드 상태 테이블
 *
 * stability : 90% 보유율 유지 구간 (일 단위, 0이면 미학습)
 * difficulty: 카드 난이도 1.0(쉬움) ~ 10.0(어려움), 초기값 5.0
 */
export const srsCards = sqliteTable(
  'srs_cards',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    learningTrack: text('learning_track', { enum: ['jlpt-ja', 'topik-ko'] }).notNull().default('jlpt-ja'),
    itemType: text('item_type', {
      enum: ['vocab', 'grammar', 'kanji', 'sentence', 'sysprog', 'homophone'],
    }).notNull(),
    itemId: integer('item_id').notNull(),
    state: text('state', {
      enum: ['new', 'learning', 'review', 'relearning'],
    }).notNull().default('new'),
    // ── FSRS-6 ────────────────────────────
    stability: real('stability').notNull().default(0.0),
    difficulty: real('difficulty').notNull().default(5.0),
    dueAt: integer('due_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    lastReviewedAt: integer('last_reviewed_at', { mode: 'timestamp' }),
    lapses: integer('lapses').notNull().default(0),
    reps: integer('reps').notNull().default(0),
    learningStepsIdx: integer('learning_steps_idx').notNull().default(0),
    desiredRetention: real('desired_retention').notNull().default(0.9),
    // ──────────────────────────────────────
    ...timestamps,
  },
  (t) => ({
    dueIdx: index('srs_cards_track_due_idx').on(t.userId, t.learningTrack, t.dueAt),
    naturalUk: uniqueIndex('srs_cards_track_natural_uk').on(t.userId, t.learningTrack, t.itemType, t.itemId),
    stateIdx: index('srs_cards_track_state_idx').on(t.userId, t.learningTrack, t.state),
  }),
);

export const reviewLogs = sqliteTable(
  'review_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    cardId: integer('card_id').notNull().references(() => srsCards.id, { onDelete: 'cascade' }),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    rating: text('rating', { enum: ['again', 'hard', 'good', 'easy'] }).notNull(),
    elapsedDays: real('elapsed_days').notNull().default(0),
    scheduledDays: real('scheduled_days').notNull().default(0),
    responseMs: integer('response_ms'),
  },
  (t) => ({
    cardIdx: index('review_logs_card_idx').on(t.cardId),
    reviewedAtIdx: index('review_logs_reviewed_at_idx').on(t.reviewedAt),
  }),
);

/** Server-persisted study completion for string-keyed TOPIK owner curriculum items. */
export const topikOwnerCurriculumProgress = sqliteTable(
  'topik_owner_curriculum_progress',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    itemId: text('item_id').notNull().references(() => topikOwnerAuthoredCurriculumItems.id, { onDelete: 'restrict' }),
    status: text('status', { enum: ['not_started', 'in_progress', 'completed'] }).notNull().default('not_started'),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
    lastStudiedAt: integer('last_studied_at', { mode: 'timestamp' }),
    ...timestamps,
  },
  (t) => ({
    naturalPk: primaryKey({ columns: [t.userId, t.itemId] }),
    userStatusIdx: index('topik_owner_progress_user_status_idx').on(t.userId, t.status, t.updatedAt),
  }),
);

/** FSRS-6 cards for TOPIK owner curriculum; kept separate from integer-keyed JLPT SRS cards. */
export const topikOwnerSrsCards = sqliteTable(
  'topik_owner_srs_cards',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    itemId: text('item_id').notNull().references(() => topikOwnerAuthoredCurriculumItems.id, { onDelete: 'restrict' }),
    state: text('state', { enum: ['new', 'learning', 'review', 'relearning'] }).notNull().default('new'),
    stability: real('stability').notNull().default(0),
    difficulty: real('difficulty').notNull().default(5),
    dueAt: integer('due_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    lastReviewedAt: integer('last_reviewed_at', { mode: 'timestamp' }),
    lapses: integer('lapses').notNull().default(0),
    reps: integer('reps').notNull().default(0),
    learningStepsIdx: integer('learning_steps_idx').notNull().default(0),
    desiredRetention: real('desired_retention').notNull().default(0.9),
    ...timestamps,
  },
  (t) => ({
    naturalUk: uniqueIndex('topik_owner_srs_cards_user_item_uk').on(t.userId, t.itemId),
    dueIdx: index('topik_owner_srs_cards_user_due_idx').on(t.userId, t.dueAt),
    stateIdx: index('topik_owner_srs_cards_user_state_idx').on(t.userId, t.state),
  }),
);

export const topikOwnerReviewLogs = sqliteTable(
  'topik_owner_review_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    cardId: integer('card_id').notNull().references(() => topikOwnerSrsCards.id, { onDelete: 'cascade' }),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    rating: text('rating', { enum: ['again', 'hard', 'good', 'easy'] }).notNull(),
    elapsedDays: real('elapsed_days').notNull().default(0),
    scheduledDays: real('scheduled_days').notNull().default(0),
    responseMs: integer('response_ms'),
  },
  (t) => ({
    cardIdx: index('topik_owner_review_logs_card_idx').on(t.cardId),
    reviewedAtIdx: index('topik_owner_review_logs_reviewed_at_idx').on(t.reviewedAt),
  }),
);

export const dailyLogs = sqliteTable(
  'daily_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    learningTrack: text('learning_track', { enum: ['jlpt-ja', 'topik-ko'] }).notNull().default('jlpt-ja'),
    date: text('date').notNull(),
    sourceCode: text('source_code'),
    itemsNew: integer('items_new').notNull().default(0),
    itemsReview: integer('items_review').notNull().default(0),
    accuracy: real('accuracy'),
    timeMin: real('time_min').notNull().default(0),
    audioMin: real('audio_min').notNull().default(0),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => ({
    userDateUk: uniqueIndex('daily_logs_track_date_uk').on(t.userId, t.learningTrack, t.date),
  }),
);

/** Privacy-minimized activity used for learning recommendations and aggregates. */
export const learningActivityEvents = sqliteTable(
  'learning_activity_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    eventId: text('event_id').notNull(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    learningTrack: text('learning_track', { enum: ['jlpt-ja', 'topik-ko'] }).notNull(),
    eventType: text('event_type', {
      enum: ['content_opened', 'content_completed', 'quiz_answered', 'review_rated', 'speech_attempted'],
    }).notNull(),
    contentType: text('content_type'),
    contentId: text('content_id'),
    levelTag: text('level_tag'),
    section: text('section'),
    mode: text('mode', { enum: ['vocab_mc', 'grammar_fill', 'kanji_reading', 'listening'] }),
    correct: integer('correct', { mode: 'boolean' }),
    rating: text('rating', { enum: ['again', 'hard', 'good', 'easy'] }),
    durationMs: integer('duration_ms'),
    speechOutcome: text('speech_outcome', { enum: ['played', 'unavailable', 'error'] }),
    occurredAt: integer('occurred_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    userEventUk: uniqueIndex('learning_activity_events_user_event_uk').on(t.userId, t.eventId),
    userTrackTimeIdx: index('learning_activity_events_user_track_time_idx').on(t.userId, t.learningTrack, t.occurredAt),
    userContentTimeIdx: index('learning_activity_events_user_content_time_idx').on(t.userId, t.learningTrack, t.contentType, t.contentId, t.occurredAt),
  }),
);

export const quizAttempts = sqliteTable(
  'quiz_attempts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    learningTrack: text('learning_track', { enum: ['jlpt-ja', 'topik-ko'] }).notNull().default('jlpt-ja'),
    quizType: text('quiz_type').notNull(),
    mode: text('mode'),
    level: text('level'),
    weekNo: integer('week_no'),
    total: integer('total').notNull().default(0),
    correct: integer('correct').notNull().default(0),
    score: integer('score'),
    durationSec: integer('duration_sec'),
    detailJson: text('detail_json'),
    questionsJson: text('questions_json'),
    startedAt: text('started_at'),
    finishedAt: text('finished_at'),
    ...timestamps,
  },
  (t) => ({
    userIdx: index('quiz_attempts_track_user_idx').on(t.userId, t.learningTrack, t.createdAt),
    weekIdx: index('quiz_attempts_track_week_idx').on(t.userId, t.learningTrack, t.weekNo),
  }),
);

export const selfCheck = sqliteTable(
  'self_check',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    learningTrack: text('learning_track', { enum: ['jlpt-ja', 'topik-ko'] }).notNull().default('jlpt-ja'),
    weekNo: integer('week_no').notNull(),
    vocabScore: integer('vocab_score'),
    grammarScore: integer('grammar_score'),
    readingScore: integer('reading_score'),
    listeningScore: integer('listening_score'),
    speakingScore: integer('speaking_score'),
    writingScore: integer('writing_score'),
    domainScore: integer('domain_score'),
    notes: text('notes'),
    checkedAt: integer('checked_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    ...timestamps,
  },
  (t) => ({
    userWeekUk: uniqueIndex('self_check_track_week_uk').on(t.userId, t.learningTrack, t.weekNo),
  }),
);

export const selfCheckTemplates = sqliteTable(
  'self_check_templates',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    code: text('code').notNull().unique(),
    learningTrack: text('learning_track', { enum: ['jlpt-ja', 'topik-ko'] }).notNull().default('jlpt-ja'),
    level: text('level').notNull().default('N3'),
    category: text('category').notNull(),
    sortOrder: integer('sort_order').notNull(),
    itemKo: text('item_ko').notNull(),
    evidenceKo: text('evidence_ko'),
    recommendationKo: text('recommendation_ko').notNull(),
    sourceName: text('source_name').notNull(),
    sourceUrl: text('source_url').notNull(),
    ...timestamps,
  },
  (t) => ({
    levelIdx: index('self_check_templates_track_level_idx').on(t.learningTrack, t.level, t.category, t.sortOrder),
  }),
);

export const trackSrsSettings = sqliteTable(
  'track_srs_settings',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    learningTrack: text('learning_track', { enum: ['jlpt-ja', 'topik-ko'] }).notNull(),
    fsrsOptions: text('fsrs_options'),
    fsrsWeights: text('fsrs_weights'),
    srsSettings: text('srs_settings'),
    ...timestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.learningTrack] }),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// ── 운영 기능 계열
// ═══════════════════════════════════════════════════════════════════

export const oauthStates = sqliteTable('oauth_states', {
  stateHash: text('state_hash').primaryKey(),
  learningTrack: text('learning_track', { enum: ['jlpt-ja', 'topik-ko'] }).notNull().default('jlpt-ja'),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  consumedAt: integer('consumed_at'),
}, (t) => ({
  expiresIdx: index('oauth_states_expires_idx').on(t.expiresAt),
}));

export const oauthLoginTokens = sqliteTable('oauth_login_tokens', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  consumedAt: integer('consumed_at'),
}, (t) => ({
  expiresIdx: index('oauth_login_tokens_expires_idx').on(t.expiresAt),
}));

export const quizQuestionBank = sqliteTable('quiz_question_bank', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  mode: text('mode').notNull(),
  level: text('level').notNull(),
  itemId: integer('item_id').notNull(),
  itemType: text('item_type').notNull(),
  prompt: text('prompt').notNull(),
  correct: text('correct').notNull(),
  distractors: text('distractors').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  modeLevelIdx: index('quiz_question_bank_mode_level_idx').on(t.mode, t.level),
}));

/** Self-authored TOPIK placement QA bank. Rows remain hidden until isPublished is enabled. */
export const topikPlacementQuestions = sqliteTable(
  'topik_placement_questions',
  {
    id: text('id').primaryKey(),
    learningTrack: text('learning_track', { enum: ['topik-ko'] }).notNull().default('topik-ko'),
    examLevel: text('exam_level').notNull(),
    section: text('section').notNull(),
    skill: text('skill').notNull(),
    difficulty: integer('difficulty').notNull(),
    promptKo: text('prompt_ko').notNull(),
    promptJa: text('prompt_ja').notNull(),
    promptEn: text('prompt_en').notNull(),
    glossEn: text('gloss_en').notNull(),
    choicesJson: text('choices_json').notNull(),
    answerIndex: integer('answer_index').notNull(),
    explanationEn: text('explanation_en').notNull(),
    explanationKo: text('explanation_ko').notNull(),
    explanationJa: text('explanation_ja').notNull(),
    sourceCode: text('source_code').notNull(),
    authorReviewer: text('author_reviewer').notNull(),
    secondReviewer: text('second_reviewer').notNull(),
    reviewedAt: text('reviewed_at').notNull(),
    bankVersion: text('bank_version').notNull().default('v1'),
    audioScriptKo: text('audio_script_ko'),
    audioR2Key: text('audio_r2_key'),
    isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (t) => ({
    levelSectionIdx: index('topik_placement_level_section_idx').on(
      t.learningTrack,
      t.examLevel,
      t.section,
      t.difficulty,
    ),
    releaseIdx: index('topik_placement_release_idx').on(
      t.learningTrack,
      t.bankVersion,
      t.isPublished,
      t.section,
      t.difficulty,
    ),
  }),
);

export const topikPlacementAttempts = sqliteTable(
  'topik_placement_attempts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    learningTrack: text('learning_track', { enum: ['topik-ko'] }).notNull().default('topik-ko'),
    bankVersion: text('bank_version').notNull(),
    instructionLanguage: text('instruction_language', { enum: ['ko', 'en', 'ja'] }).notNull().default('en'),
    status: text('status', { enum: ['in_progress', 'completed'] }).notNull().default('in_progress'),
    questionIdsJson: text('question_ids_json').notNull(),
    scoreTotal: integer('score_total'),
    scoreListening: integer('score_listening'),
    scoreReading: integer('score_reading'),
    resultBand: text('result_band', { enum: ['starter', 'foundation', 'ready'] }),
    startedAt: integer('started_at').notNull().default(sql`(unixepoch())`),
    completedAt: integer('completed_at'),
  },
  (t) => ({
    userIdx: index('topik_placement_attempt_user_idx').on(t.userId, t.learningTrack, t.startedAt),
  }),
);

export const topikPlacementResponses = sqliteTable(
  'topik_placement_responses',
  {
    attemptId: text('attempt_id').notNull().references(() => topikPlacementAttempts.id, { onDelete: 'cascade' }),
    questionId: text('question_id').notNull().references(() => topikPlacementQuestions.id, { onDelete: 'restrict' }),
    selectedIndex: integer('selected_index').notNull(),
    isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
    answeredAt: integer('answered_at').notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.attemptId, t.questionId] }),
    questionIdx: index('topik_placement_response_question_idx').on(t.questionId, t.isCorrect),
  }),
);

/**
 * Self-authored TOPIK I/II learning questions. They are intentionally separate
 * from official format/statistics references and never contain official items.
 */
export const topikPracticeQuestions = sqliteTable(
  'topik_practice_questions',
  {
    id: text('id').primaryKey(),
    learningTrack: text('learning_track', { enum: ['topik-ko'] }).notNull().default('topik-ko'),
    examLevel: text('exam_level', { enum: ['TOPIK-I', 'TOPIK-II'] }).notNull(),
    section: text('section', { enum: ['listening', 'writing', 'reading'] }).notNull(),
    questionType: text('question_type', { enum: ['choice', 'writing'] }).notNull(),
    skill: text('skill').notNull(),
    difficulty: integer('difficulty').notNull(),
    promptKo: text('prompt_ko').notNull(),
    promptJa: text('prompt_ja').notNull(),
    promptEn: text('prompt_en').notNull(),
    choicesJson: text('choices_json').notNull().default('[]'),
    answerIndex: integer('answer_index'),
    explanationKo: text('explanation_ko').notNull(),
    explanationJa: text('explanation_ja').notNull(),
    explanationEn: text('explanation_en').notNull(),
    sampleAnswerKo: text('sample_answer_ko'),
    sampleAnswerJa: text('sample_answer_ja'),
    sampleAnswerEn: text('sample_answer_en'),
    audioScriptKo: text('audio_script_ko'),
    audioR2Key: text('audio_r2_key'),
    sourceCode: text('source_code').notNull(),
    authorReviewer: text('author_reviewer').notNull(),
    secondReviewer: text('second_reviewer').notNull(),
    reviewedAt: text('reviewed_at').notNull(),
    bankVersion: text('bank_version').notNull(),
    isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (t) => ({
    releaseIdx: index('topik_practice_release_idx').on(
      t.learningTrack, t.bankVersion, t.isPublished, t.examLevel, t.section, t.difficulty,
    ),
    promptUk: uniqueIndex('topik_practice_prompt_version_uk').on(
      t.learningTrack, t.bankVersion, t.examLevel, t.section, t.promptKo,
    ),
  }),
);

/** Versioned, self-authored JLPT practice. Listening stores script text only. */
export const jlptPracticeQuestions = sqliteTable(
  'jlpt_practice_questions',
  {
    id: text('id').primaryKey(),
    learningTrack: text('learning_track', { enum: ['jlpt-ja'] }).notNull().default('jlpt-ja'),
    level: text('level', { enum: ['N5', 'N4', 'N3', 'N2', 'N1'] }).notNull(),
    mode: text('mode', { enum: ['vocab_mc', 'grammar_fill', 'kanji_reading', 'listening'] }).notNull(),
    skill: text('skill').notNull(),
    difficulty: integer('difficulty').notNull(),
    promptKo: text('prompt_ko').notNull(),
    promptJa: text('prompt_ja').notNull(),
    promptEn: text('prompt_en').notNull(),
    choicesJson: text('choices_json').notNull(),
    answerIndex: integer('answer_index').notNull(),
    explanationKo: text('explanation_ko').notNull(),
    explanationJa: text('explanation_ja').notNull(),
    explanationEn: text('explanation_en').notNull(),
    audioScriptJa: text('audio_script_ja'),
    sourceCode: text('source_code').notNull(),
    sourceEvidenceSha256: text('source_evidence_sha256').notNull(),
    bankVersion: text('bank_version').notNull(),
    isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (t) => ({
    releaseIdx: index('jlpt_practice_release_idx').on(
      t.learningTrack, t.bankVersion, t.isPublished, t.level, t.mode, t.difficulty,
    ),
    promptUk: uniqueIndex('jlpt_practice_prompt_version_uk').on(
      t.learningTrack, t.bankVersion, t.level, t.mode, t.promptJa,
    ),
  }),
);

/** Evidence and independent-review outcome for a versioned authored question. */
export const contentQualityAudits = sqliteTable(
  'content_quality_audits',
  {
    id: text('id').primaryKey(),
    learningTrack: text('learning_track', { enum: ['jlpt-ja', 'topik-ko'] }).notNull(),
    contentType: text('content_type', { enum: ['topik-practice', 'topik-placement', 'topik-owner', 'jlpt-reading', 'jlpt-quiz'] }).notNull(),
    contentId: text('content_id').notNull(),
    contentVersion: text('content_version').notNull(),
    evidenceSha256: text('evidence_sha256').notNull(),
    validatorVersion: text('validator_version').notNull(),
    automatedStatus: text('automated_status', { enum: ['passed', 'failed'] }).notNull(),
    authorReviewStatus: text('author_review_status', { enum: ['pending', 'signed', 'rejected'] }).notNull(),
    adversarialReviewStatus: text('adversarial_review_status', { enum: ['pending', 'signed', 'rejected'] }).notNull(),
    authorReviewer: text('author_reviewer').notNull(),
    adversarialReviewer: text('adversarial_reviewer').notNull(),
    releaseState: text('release_state', { enum: ['draft', 'approved', 'published', 'withdrawn'] }).notNull().default('draft'),
    detailsJson: text('details_json').notNull().default('{}'),
    checkedAt: text('checked_at').notNull(),
    ...timestamps,
  },
  (t) => ({
    contentUk: uniqueIndex('content_quality_audits_content_uk').on(t.learningTrack, t.contentType, t.contentId, t.contentVersion),
    releaseIdx: index('content_quality_audits_release_idx').on(t.learningTrack, t.contentType, t.contentVersion, t.releaseState),
  }),
);

/** Expected item-audit coverage for a future quality-gated release. */
export const contentReleaseQualityRequirements = sqliteTable(
  'content_release_quality_requirements',
  {
    releaseId: text('release_id').primaryKey().references(() => contentReleases.id, { onDelete: 'cascade' }),
    contentType: text('content_type', {
      enum: ['topik-practice', 'topik-placement', 'topik-owner', 'jlpt-reading', 'jlpt-quiz'],
    }).notNull(),
    expectedAuditCount: integer('expected_audit_count').notNull(),
    validatorVersion: text('validator_version').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
);

/** Immutable association between a release and already-reviewed item audits. */
export const contentReleaseQualityAuditLinks = sqliteTable(
  'content_release_quality_audit_links',
  {
    releaseId: text('release_id').notNull().references(() => contentReleases.id, { onDelete: 'cascade' }),
    auditId: text('audit_id').notNull().references(() => contentQualityAudits.id, { onDelete: 'restrict' }),
    linkedAt: integer('linked_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.releaseId, t.auditId] }),
    auditIdx: index('content_release_quality_audit_links_audit_idx').on(t.auditId, t.releaseId),
  }),
);

export const audioGenerationLog = sqliteTable('audio_generation_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemType: text('item_type', { enum: ['sentence', 'vocab', 'kanji'] }).notNull(),
  itemId: integer('item_id').notNull(),
  r2Key: text('r2_key'),
  success: integer('success', { mode: 'boolean' }).notNull().default(false),
  provider: text('provider'),
  contentHash: text('content_hash'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  createdIdx: index('audio_generation_log_created_idx').on(t.createdAt),
  itemIdx: index('audio_generation_log_item_idx').on(t.itemType, t.itemId),
}));

export const readingPassages = sqliteTable('reading_passages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  level: text('level', { enum: ['N5', 'N4', 'N3', 'N2', 'N1'] }).notNull(),
  genre: text('genre', {
    enum: ['email', 'ad', 'essay', 'news', 'instruction', 'conversation', 'notice'],
  }).notNull(),
  titleJa: text('title_ja').notNull(),
  bodyJa: text('body_ja').notNull(),
  bodyKo: text('body_ko').notNull(),
  wordCount: integer('word_count').notNull().default(0),
  vocabIds: text('vocab_ids').notNull().default('[]'),
  grammarIds: text('grammar_ids').notNull().default('[]'),
  audioR2Key: text('audio_r2_key'),
  sourceAttribution: text('source_attribution'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
}, (t) => ({
  levelGenreIdx: index('reading_passages_level_genre_idx').on(t.level, t.genre),
}));

export const readingQuestions = sqliteTable('reading_questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  passageId: integer('passage_id').notNull().references(() => readingPassages.id, { onDelete: 'cascade' }),
  questionJa: text('question_ja').notNull(),
  questionKo: text('question_ko').notNull(),
  choicesJson: text('choices_json').notNull(),
  answerIndex: integer('answer_index').notNull(),
  explanationKo: text('explanation_ko'),
}, (t) => ({
  passageIdx: index('reading_questions_passage_idx').on(t.passageId),
}));

export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: text('user_agent'),
  morningOn: integer('morning_on', { mode: 'boolean' }).notNull().default(true),
  eveningOn: integer('evening_on', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  lastSeenAt: integer('last_seen_at'),
}, (t) => ({
  userIdx: index('push_subscriptions_user_idx').on(t.userId),
}));

// ═══════════════════════════════════════════════════════════════════
// ── 타입 내보내기
// ═══════════════════════════════════════════════════════════════════
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type ContentSourceAsset = typeof contentSourceAssets.$inferSelect;
export type NewContentSourceAsset = typeof contentSourceAssets.$inferInsert;
export type LearningContentStableRef = typeof learningContentStableRefs.$inferSelect;
export type NewLearningContentStableRef = typeof learningContentStableRefs.$inferInsert;
export type ContentAudioBinding = typeof contentAudioBindings.$inferSelect;
export type NewContentAudioBinding = typeof contentAudioBindings.$inferInsert;
export type LearningContentLevelReference = typeof learningContentLevelReferences.$inferSelect;
export type NewLearningContentLevelReference = typeof learningContentLevelReferences.$inferInsert;
export type TopikOwnerAuthoredCurriculumUnit = typeof topikOwnerAuthoredCurriculumUnits.$inferSelect;
export type NewTopikOwnerAuthoredCurriculumUnit = typeof topikOwnerAuthoredCurriculumUnits.$inferInsert;
export type TopikOwnerAuthoredCurriculumItem = typeof topikOwnerAuthoredCurriculumItems.$inferSelect;
export type NewTopikOwnerAuthoredCurriculumItem = typeof topikOwnerAuthoredCurriculumItems.$inferInsert;
export type TopikOwnerCurriculumProgress = typeof topikOwnerCurriculumProgress.$inferSelect;
export type NewTopikOwnerCurriculumProgress = typeof topikOwnerCurriculumProgress.$inferInsert;
export type TopikOwnerSrsCard = typeof topikOwnerSrsCards.$inferSelect;
export type NewTopikOwnerSrsCard = typeof topikOwnerSrsCards.$inferInsert;
export type TopikOwnerReviewLog = typeof topikOwnerReviewLogs.$inferSelect;
export type NewTopikOwnerReviewLog = typeof topikOwnerReviewLogs.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Vocab = typeof vocab.$inferSelect;
export type NewVocab = typeof vocab.$inferInsert;
export type Grammar = typeof grammar.$inferSelect;
export type NewGrammar = typeof grammar.$inferInsert;
export type Kanji = typeof kanji.$inferSelect;
export type NewKanji = typeof kanji.$inferInsert;
export type Sentence = typeof sentences.$inferSelect;
export type NewSentence = typeof sentences.$inferInsert;
export type SysProgTerm = typeof sysProgTerms.$inferSelect;
export type NewSysProgTerm = typeof sysProgTerms.$inferInsert;
export type CurriculumWeek = typeof curriculumWeeks.$inferSelect;
export type NewCurriculumWeek = typeof curriculumWeeks.$inferInsert;
export type HomophonePair = typeof homophonePairs.$inferSelect;
export type NewHomophonePair = typeof homophonePairs.$inferInsert;
export type ContentSeedRun = typeof contentSeedRuns.$inferSelect;
export type NewContentSeedRun = typeof contentSeedRuns.$inferInsert;
export type ContentSeedSource = typeof contentSeedSources.$inferSelect;
export type NewContentSeedSource = typeof contentSeedSources.$inferInsert;
export type ContentRelease = typeof contentReleases.$inferSelect;
export type NewContentRelease = typeof contentReleases.$inferInsert;
export type ContentReleaseJob = typeof contentReleaseJobs.$inferSelect;
export type NewContentReleaseJob = typeof contentReleaseJobs.$inferInsert;
export type ContentReleaseGateEvidence = typeof contentReleaseGateEvidence.$inferSelect;
export type NewContentReleaseGateEvidence = typeof contentReleaseGateEvidence.$inferInsert;
export type ContentReleasePreviewCandidate = typeof contentReleasePreviewCandidates.$inferSelect;
export type NewContentReleasePreviewCandidate = typeof contentReleasePreviewCandidates.$inferInsert;
export type ContentReleasePoisonReport = typeof contentReleasePoisonReports.$inferSelect;
export type NewContentReleasePoisonReport = typeof contentReleasePoisonReports.$inferInsert;
export type AiAssistanceUsageWindow = typeof aiAssistanceUsageWindows.$inferSelect;
export type NewAiAssistanceUsageWindow = typeof aiAssistanceUsageWindows.$inferInsert;
export type AiAssistanceCircuitBreaker = typeof aiAssistanceCircuitBreakers.$inferSelect;
export type NewAiAssistanceCircuitBreaker = typeof aiAssistanceCircuitBreakers.$inferInsert;
export type AiAssistanceAuditEvent = typeof aiAssistanceAuditEvents.$inferSelect;
export type NewAiAssistanceAuditEvent = typeof aiAssistanceAuditEvents.$inferInsert;
export type AiWritingFeedbackRecord = typeof aiWritingFeedbackRecords.$inferSelect;
export type NewAiWritingFeedbackRecord = typeof aiWritingFeedbackRecords.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type SrsCard = typeof srsCards.$inferSelect;
export type NewSrsCard = typeof srsCards.$inferInsert;
export type ReviewLog = typeof reviewLogs.$inferSelect;
export type NewReviewLog = typeof reviewLogs.$inferInsert;
export type DailyLog = typeof dailyLogs.$inferSelect;
export type NewDailyLog = typeof dailyLogs.$inferInsert;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type NewQuizAttempt = typeof quizAttempts.$inferInsert;
export type SelfCheck = typeof selfCheck.$inferSelect;
export type NewSelfCheck = typeof selfCheck.$inferInsert;
export type SelfCheckTemplate = typeof selfCheckTemplates.$inferSelect;
export type NewSelfCheckTemplate = typeof selfCheckTemplates.$inferInsert;
export type OauthState = typeof oauthStates.$inferSelect;
export type NewOauthState = typeof oauthStates.$inferInsert;
export type OauthLoginToken = typeof oauthLoginTokens.$inferSelect;
export type NewOauthLoginToken = typeof oauthLoginTokens.$inferInsert;
export type QuizQuestion = typeof quizQuestionBank.$inferSelect;
export type NewQuizQuestion = typeof quizQuestionBank.$inferInsert;
export type TopikPlacementQuestion = typeof topikPlacementQuestions.$inferSelect;
export type NewTopikPlacementQuestion = typeof topikPlacementQuestions.$inferInsert;
export type TopikPlacementAttempt = typeof topikPlacementAttempts.$inferSelect;
export type NewTopikPlacementAttempt = typeof topikPlacementAttempts.$inferInsert;
export type TopikPlacementResponse = typeof topikPlacementResponses.$inferSelect;
export type NewTopikPlacementResponse = typeof topikPlacementResponses.$inferInsert;
export type TopikPracticeQuestion = typeof topikPracticeQuestions.$inferSelect;
export type NewTopikPracticeQuestion = typeof topikPracticeQuestions.$inferInsert;
export type AudioGenerationLog = typeof audioGenerationLog.$inferSelect;
export type NewAudioGenerationLog = typeof audioGenerationLog.$inferInsert;
export type ReadingPassage = typeof readingPassages.$inferSelect;
export type NewReadingPassage = typeof readingPassages.$inferInsert;
export type ReadingQuestion = typeof readingQuestions.$inferSelect;
export type NewReadingQuestion = typeof readingQuestions.$inferInsert;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
