import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { env as workerEnv } from 'cloudflare:test';
import type { AppEnv } from '../types.js';
import { aggregateInsightDays, insightDateStart, learningInsights, hasAuthoritativeStudyOnDate, validInsightDate, validInsightYear } from '../lib/learning-insights.js';
import { learningStreak } from '../lib/motivation.js';
import { learningInsightsOA } from '../routes/learning-insights.js';

const env = workerEnv as unknown as AppEnv['Bindings'];

const tables = ['learning_profiles', 'daily_logs', 'study_sessions', 'study_steps', 'quiz_attempts', 'srs_cards', 'review_logs', 'topik_owner_curriculum_progress', 'topik_owner_srs_cards', 'topik_owner_review_logs', 'learning_lessons', 'learning_activity_events'];
const now = Date.parse('2026-10-14T12:00:00Z') / 1000;
const time = Date.parse('2026-10-13T16:00:00Z') / 1000;
beforeAll(async () => {
  // Disposable Workers test DB; deliberately no content/answers needed by insights.
  const definitions = [
    'learning_profiles(user_id TEXT,learning_track TEXT,timezone TEXT)',
    'daily_logs(user_id TEXT,learning_track TEXT,date TEXT,items_new INTEGER,items_review INTEGER)',
    'study_sessions(id TEXT,user_id TEXT,learning_track TEXT,level TEXT,status TEXT,lesson_id TEXT,lesson_version TEXT,updated_at INTEGER)',
    'study_steps(session_id TEXT,request_id TEXT,submitted_at INTEGER,phase TEXT,correct INTEGER)',
    'quiz_attempts(user_id TEXT,learning_track TEXT,finished_at TEXT,total INTEGER)',
    'srs_cards(id INTEGER,user_id TEXT,learning_track TEXT)',
    'review_logs(card_id INTEGER,reviewed_at INTEGER)',
    'topik_owner_curriculum_progress(user_id TEXT,status TEXT,completed_at INTEGER)',
    'topik_owner_srs_cards(id INTEGER,user_id TEXT)',
    'topik_owner_review_logs(card_id INTEGER,reviewed_at INTEGER)',
    'learning_lessons(id TEXT,version TEXT,learning_track TEXT,title_ko TEXT,title_ja TEXT,title_en TEXT)',
    'learning_activity_events(user_id TEXT,learning_track TEXT,event_type TEXT,occurred_at INTEGER)',
  ];
  for (const definition of definitions) await env.DB.prepare('CREATE TABLE ' + definition).run();
});
beforeEach(async () => { await env.DB.batch(tables.map(t => env.DB.prepare('DELETE FROM ' + t))); });
const insert = (sql: string, ...args: unknown[]) => env.DB.prepare(sql).bind(...args).run();
describe('learning insights authority', () => {
  it('unions saved dates and agrees with streak while excluding activity, future and unaccepted steps', async () => {
    await insert("INSERT INTO learning_profiles VALUES ('a','jlpt-ja','Asia/Seoul')");
    await insert("INSERT INTO daily_logs VALUES ('a','jlpt-ja','2026-10-14',1,1),('a','jlpt-ja','2026-10-15',2,0),('a','jlpt-ja','2026-10-12',0,0)");
    await insert("INSERT INTO study_sessions VALUES ('s','a','jlpt-ja','N3','active',NULL,NULL,?)", time);
    await insert("INSERT INTO study_steps VALUES ('s','r',?,'learn',NULL),('s','r2',?,'practice',0),('s',NULL,?,'practice',1),('s','r3',?,'retry',1)", time, time, time - 86400, time - 86400);
    await insert("INSERT INTO quiz_attempts VALUES ('a','jlpt-ja','2026-10-13T16:00:00Z',2),('a','jlpt-ja','2026-10-11T16:00:00Z',0)");
    await insert("INSERT INTO srs_cards VALUES (1,'a','jlpt-ja')");
    await insert("INSERT INTO review_logs VALUES (1,?)", time);
    await insert("INSERT INTO learning_activity_events VALUES ('a','jlpt-ja','content_completed',?)", time - 86400 * 3);
    const result = await learningInsights(env.DB, 'a', 'jlpt-ja', { year: 2026 }, now);
    if (!('days' in result)) throw new Error('Expected annual result');
    expect(result.total_study_days).toBe(1);
    expect(result.total_study_days).toBe((await learningStreak(env.DB, 'a', 'jlpt-ja', now)).totalDays);
    const day = result.days!.find(d => d.date === '2026-10-14')!;
    expect(day.guided).toEqual({ learned: 1, reviews: 0, answers: 1, correct: 0, retries: 0 });
    expect(day.saved).toEqual({ daily_log: true, quiz_attempts: 1, owner_completions: 0, reviews: 1 });
    expect(result.days!.find(d => d.date === '2026-10-13')!.studied).toBe(false);
  });
  it('keeps user and track separate including TOPIK owner and review evidence', async () => {
    await insert("INSERT INTO daily_logs VALUES ('a','jlpt-ja','2026-01-01',1,0),('b','topik-ko','2026-02-01',1,0)");
    await insert("INSERT INTO topik_owner_curriculum_progress VALUES ('a','completed',?),('b','completed',?),('a','started',?)", time, time - 86400, time - 86400 * 2);
    await insert("INSERT INTO topik_owner_srs_cards VALUES (1,'a'),(2,'b')");
    await insert('INSERT INTO topik_owner_review_logs VALUES (1,?),(2,?)', time, time - 86400 * 3);
    const result = await learningInsights(env.DB, 'a', 'topik-ko', { year: 2026 }, now);
    if (!('days' in result)) throw new Error('Expected annual result');
    expect(result.total_study_days).toBe(1);
    expect(result.days!.find(d => d.studied)?.saved).toEqual({ daily_log: false, quiz_attempts: 0, owner_completions: 1, reviews: 1 });
  });
  it('preserves daily-log dates but converts timestamps to the specified profile timezone', async () => {
    await insert("INSERT INTO learning_profiles VALUES ('a','jlpt-ja','America/Los_Angeles')");
    await insert("INSERT INTO daily_logs VALUES ('a','jlpt-ja','2026-10-14',1,0)");
    await insert("INSERT INTO quiz_attempts VALUES ('a','jlpt-ja','2026-10-14T01:00:00Z',1)");
    const result = await learningInsights(env.DB, 'a', 'jlpt-ja', { year: 2026 }, now);
    if (!('days' in result)) throw new Error('Expected annual result');
    expect(result.days!.filter(d => d.studied).map(d => d.date)).toEqual(['2026-10-13', '2026-10-14']);
    expect(await hasAuthoritativeStudyOnDate(env.DB, 'a', 'jlpt-ja', '2026-10-13', 'America/Los_Angeles', now)).toBe(true);
    expect(await hasAuthoritativeStudyOnDate(env.DB, 'a', 'jlpt-ja', '2026-10-13', 'Asia/Seoul', now)).toBe(false);
  });
  it('returns actual completed lesson titles and scores only, not active sessions or answers', async () => {
    await insert("INSERT INTO learning_lessons VALUES ('lesson','v1','jlpt-ja','한국어 제목','日本語の題名','Real title')");
    await insert("INSERT INTO study_sessions VALUES ('done','a','jlpt-ja','N3','completed','lesson','v1',?),('active','a','jlpt-ja','N3','active','lesson','v1',?),('other','b','jlpt-ja','N3','completed','lesson','v1',?)", time, time, time);
    await insert("INSERT INTO study_steps VALUES ('done','r',?,'practice',0),('done','retry',?,'retry',1)", time, time);
    const result = await learningInsights(env.DB, 'a', 'jlpt-ja', { date: '2026-10-14' }, now);
    if (!('day' in result)) throw new Error('Expected day result');
    expect(result.completed_lessons).toHaveLength(1);
    expect(result.completed_lessons[0]).toMatchObject({ title: { en: 'Real title' }, answers: 1, correct: 0 });
    expect(Object.keys(result.completed_lessons[0]!)).not.toContain('solution_json');
    expect(result.day?.guided.retries).toBe(1);
  });
  it('returns full leap-year empty grid without inventing completions', async () => {
    const result = await learningInsights(env.DB, 'a', 'jlpt-ja', { year: 2024 }, now);
    if (!('days' in result)) throw new Error('Expected annual result');
    expect(result.days).toHaveLength(366);
    expect(result.total_study_days).toBe(0);
    expect(result.completed_lessons).toEqual([]);
    expect(result.months).toHaveLength(12);
  });
  it('counts accepted ungraded practice as a study day without inventing graded answers', async () => {
    await insert("INSERT INTO study_sessions VALUES ('s','a','jlpt-ja','N3','active',NULL,NULL,?)", time);
    await insert("INSERT INTO study_steps VALUES ('s','r',?,'practice',NULL)", time);
    const result = await learningInsights(env.DB, 'a', 'jlpt-ja', { date: '2026-10-14' }, now);
    if (!('day' in result)) throw new Error('Expected day result');
    expect(result.day.studied).toBe(true);
    expect(result.day.guided.answers).toBe(0);
    expect(result.day.guided.correct).toBe(0);
  });
  it('bounds saved completions and reports truncation', async () => {
    await insert("INSERT INTO learning_lessons VALUES ('l','v','jlpt-ja','한','日','EN')");
    await env.DB.batch(Array.from({ length: 201 }, (_, i) => env.DB.prepare("INSERT INTO study_sessions VALUES (?,'a','jlpt-ja','N3','completed','l','v',?)").bind('s' + i, time)));
    const result = await learningInsights(env.DB, 'a', 'jlpt-ja', { date: '2026-10-14' }, now);
    expect(result.completed_lessons).toHaveLength(200);
    expect(result.completed_lessons_truncated).toBe(true);
  });
  it('requires auth and rejects invalid dates and stale track before querying evidence', async () => {
    expect((await learningInsightsOA.request('/learning/insights?year=2026', {}, { ...env, AUTH_MODE: 'app-session' })).status).toBe(401);
    for (const path of ['?year=1999', '?year=9999', '/day?date=2026-02-30', '/day?date=2026-2-01']) expect((await learningInsightsOA.request('/learning/insights' + path, {}, { ...env, AUTH_MODE: 'public-owner', ENVIRONMENT: 'test' })).status).toBe(400);
    expect((await learningInsightsOA.request('/learning/insights?year=2026&expected_track=topik-ko', {}, { ...env, AUTH_MODE: 'public-owner', ENVIRONMENT: 'test' })).status).toBe(409);
    const valid = await learningInsightsOA.request('/learning/insights?year=2024', {}, { ...env, AUTH_MODE: 'public-owner', ENVIRONMENT: 'test' });
    expect(valid.status).toBe(200);
    expect(valid.headers.get('cache-control')).toBe('private, no-store');
  });
});
describe('insights dates', () => {
  it('validates strict Gregorian dates and bounded years', () => {
    expect(validInsightYear('2026', '2026-10-14')).toBe(true);
    for (const y of ['1999', '2027', '2e3', '02026']) expect(validInsightYear(y, '2026-10-14')).toBe(false);
    expect(validInsightDate('2024-02-29', '2026-10-14')).toBe(true);
    for (const date of ['2026-02-29', '2026-04-31', '2026-10-15', '2026-00-01']) expect(validInsightDate(date, '2026-10-14')).toBe(false);
  });
  it('computes DST day boundaries and fractional offsets', () => {
    expect(insightDateStart('2026-03-09', 'America/New_York') - insightDateStart('2026-03-08', 'America/New_York')).toBe(23 * 3600);
    expect(new Date(insightDateStart('2026-10-14', 'Asia/Kathmandu') * 1000).toISOString()).toBe('2026-10-13T18:15:00.000Z');
  });
  it('ignores malformed timestamps, future dates and non-authoritative kinds', () => {
    const days = aggregateInsightDays([{ kind: 'activity', n: 1, date: '2026-01-01' }, { kind: 'learn', n: 1, occurred_at: null }, { kind: 'daily', n: 1, date: '2026-01-03' }], 'UTC', '2026-01-01', '2026-01-04', '2026-01-02');
    expect(days.every(d => !d.studied)).toBe(true);
  });
});
