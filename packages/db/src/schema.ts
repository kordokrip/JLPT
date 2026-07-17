/**
 * packages/db/src/schema.ts
 *
 * Drizzle ORM 스키마 — nihongo-n3 D1 데이터베이스
 *
 * 테이블 분류:
 *   콘텐츠계: sources, categories, vocab, grammar, kanji,
 *             sentences, sysprog_terms, curriculum_weeks, homophone_pairs
 *   학습계:   users, srs_cards, review_logs, daily_logs,
 *             quiz_attempts, self_check
 *
 * JSON 컬럼: SQLite text 저장, .$type<T>()로 타입 힌트.
 * FSRS-6:   stability / difficulty 필드가 srs_cards에 있음.
 * 오디오:   바이너리는 R2 저장, D1에는 audio_r2_key만 기록.
 */
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
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
    dueIdx: index('srs_cards_due_idx').on(t.userId, t.dueAt),
    naturalUk: uniqueIndex('srs_cards_natural_uk').on(t.userId, t.itemType, t.itemId),
    stateIdx: index('srs_cards_state_idx').on(t.userId, t.state),
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

export const dailyLogs = sqliteTable(
  'daily_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
    userDateUk: uniqueIndex('daily_logs_user_date_uk').on(t.userId, t.date),
  }),
);

export const quizAttempts = sqliteTable(
  'quiz_attempts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
    userIdx: index('quiz_attempts_user_idx').on(t.userId),
    weekIdx: index('quiz_attempts_week_idx').on(t.userId, t.weekNo),
  }),
);

export const selfCheck = sqliteTable(
  'self_check',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
    userWeekUk: uniqueIndex('self_check_user_week_uk').on(t.userId, t.weekNo),
  }),
);

export const selfCheckTemplates = sqliteTable(
  'self_check_templates',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    code: text('code').notNull().unique(),
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
    levelIdx: index('self_check_templates_level_idx').on(t.level, t.category, t.sortOrder),
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
export type AudioGenerationLog = typeof audioGenerationLog.$inferSelect;
export type NewAudioGenerationLog = typeof audioGenerationLog.$inferInsert;
export type ReadingPassage = typeof readingPassages.$inferSelect;
export type NewReadingPassage = typeof readingPassages.$inferInsert;
export type ReadingQuestion = typeof readingQuestions.$inferSelect;
export type NewReadingQuestion = typeof readingQuestions.$inferInsert;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
