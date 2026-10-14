import type { DB } from './study-content.js';
import { learningTimezone, studyDate } from './motivation.js';

export type InsightDay = {
  date: string; studied: boolean;
  guided: { learned: number; reviews: number; answers: number; correct: number; retries: number };
  saved: { daily_log: boolean; quiz_attempts: number; owner_completions: number; reviews: number };
};
export type CompletedLesson = {
  session_id: string; lesson_id: string; lesson_version: string;
  title: { ko: string; ja: string; en: string }; level: string;
  completed_at: number; date: string; answers: number; correct: number;
};
export function validInsightYear(value: string, today: string): boolean {
  return /^\d{4}$/.test(value) && Number(value) >= 2000 && Number(value) <= Number(today.slice(0, 4));
}
export function validInsightDate(value: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !validInsightYear(value.slice(0, 4), today) || value > today) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function emptyInsightDay(date: string): InsightDay {
  return { date, studied: false, guided: { learned: 0, reviews: 0, answers: 0, correct: 0, retries: 0 }, saved: { daily_log: false, quiz_attempts: 0, owner_completions: 0, reviews: 0 } };
}
export type EvidenceRow = { date?: string | null; occurred_at?: number | null; kind: string; n: number; correct?: number; answers?: number };
/** Sources may overlap (a guided review also writes review_logs). Only union dates. */
export function aggregateInsightDays(rows: EvidenceRow[], timezone: string, start: string, end: string, today: string) {
  const days = new Map<string, InsightDay>();
  for (let time = Date.parse(start + 'T00:00:00Z'); time < Date.parse(end + 'T00:00:00Z'); time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10);
    days.set(date, emptyInsightDay(date));
  }
  for (const row of rows) {
    if (row.date == null && (row.occurred_at == null || !Number.isFinite(row.occurred_at))) continue;
    const date = row.date ?? studyDate(row.occurred_at!, timezone);
    const day = days.get(date);
    if (!day || date > today) continue;
    const n = Number(row.n);
    if (row.kind === 'daily') day.saved.daily_log = n > 0;
    else if (row.kind === 'quiz') day.saved.quiz_attempts += n;
    else if (row.kind === 'owner') day.saved.owner_completions += n;
    else if (row.kind === 'saved-review') day.saved.reviews += n;
    else if (row.kind === 'learn') day.guided.learned += n;
    else if (row.kind === 'review') day.guided.reviews += n;
    else if (row.kind === 'practice') { day.guided.answers += Number(row.answers ?? n); day.guided.correct += Number(row.correct ?? 0); }
    else if (row.kind === 'retry') day.guided.retries += n;
    // Retry alone is not a streak source in motivation.ts.
    if (n > 0 && ['daily', 'quiz', 'owner', 'saved-review', 'learn', 'review', 'practice'].includes(row.kind)) day.studied = true;
  }
  return [...days.values()];
}

/** Earliest instant of a local date, including DST and fractional-offset zones. */
export function insightDateStart(date: string, timezone: string): number {
  const nominal = Date.parse(date + 'T00:00:00Z') / 1000;
  let low = nominal - 86400, high = nominal + 86400;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (studyDate(mid, timezone) < date) low = mid + 1; else high = mid;
  }
  return low;
}

export async function fetchInsightEvidence(db: DB, user: string, track: 'jlpt-ja' | 'topik-ko', start: string, end: string, timezone: string, now: number): Promise<EvidenceRow[]> {
  const from = insightDateStart(start, timezone), until = Math.min(insightDateStart(end, timezone), now + 1);
  const reviewTime = "CASE WHEN typeof(r.reviewed_at)='integer' THEN r.reviewed_at ELSE unixepoch(r.reviewed_at) END";
  const queries = [
    db.prepare("SELECT date,'daily' AS kind,count(*) AS n FROM daily_logs WHERE user_id=? AND learning_track=? AND date>=? AND date<? AND items_new+items_review>0 GROUP BY date").bind(user, track, start, end),
    db.prepare(`SELECT st.submitted_at AS occurred_at,st.phase AS kind,count(*) AS n,coalesce(sum(st.correct),0) AS correct,sum(st.correct IS NOT NULL) AS answers
      FROM study_steps st JOIN study_sessions s ON s.id=st.session_id WHERE s.user_id=? AND s.learning_track=? AND st.request_id IS NOT NULL
      AND st.submitted_at>=? AND st.submitted_at<? AND st.phase IN ('learn','review','practice','retry') GROUP BY st.submitted_at,st.phase`).bind(user, track, from, until),
    db.prepare("SELECT unixepoch(finished_at) AS occurred_at,'quiz' AS kind,count(*) AS n FROM quiz_attempts WHERE user_id=? AND learning_track=? AND total>0 AND finished_at IS NOT NULL AND unixepoch(finished_at)>=? AND unixepoch(finished_at)<? GROUP BY unixepoch(finished_at)").bind(user, track, from, until),
    db.prepare(track === 'topik-ko'
      ? "SELECT r.reviewed_at AS occurred_at,'saved-review' AS kind,count(*) AS n FROM topik_owner_review_logs r JOIN topik_owner_srs_cards c ON c.id=r.card_id WHERE c.user_id=? AND r.reviewed_at>=? AND r.reviewed_at<? GROUP BY r.reviewed_at"
      : `SELECT ${reviewTime} AS occurred_at,'saved-review' AS kind,count(*) AS n FROM review_logs r JOIN srs_cards c ON c.id=r.card_id WHERE c.user_id=? AND c.learning_track='jlpt-ja' AND (${reviewTime})>=? AND (${reviewTime})<? GROUP BY (${reviewTime})`).bind(user, from, until),
    ...(track === 'topik-ko' ? [db.prepare("SELECT completed_at AS occurred_at,'owner' AS kind,count(*) AS n FROM topik_owner_curriculum_progress WHERE user_id=? AND status='completed' AND completed_at>=? AND completed_at<? GROUP BY completed_at").bind(user, from, until)] : []),
  ];
  const results = await db.batch<EvidenceRow>(queries);
  return results.flatMap(r => r.results ?? []);
}
export async function hasAuthoritativeStudyOnDate(db: DB, user: string, track: 'jlpt-ja' | 'topik-ko', date: string, timezone: string, now: number): Promise<boolean> {
  const end = new Date(Date.parse(date + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
  const rows = await fetchInsightEvidence(db, user, track, date, end, timezone, now);
  return aggregateInsightDays(rows, timezone, date, end, studyDate(now, timezone))[0]?.studied ?? false;
}
export async function learningInsights(db: DB, user: string, track: 'jlpt-ja' | 'topik-ko', range: { year: number } | { date: string }, now = Math.floor(Date.now() / 1000)) {
  const timezone = await learningTimezone(db, user, track), today = studyDate(now, timezone);
  const start = 'year' in range ? `${range.year}-01-01` : range.date;
  const end = 'year' in range ? `${range.year + 1}-01-01` : new Date(Date.parse(start + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
  const from = insightDateStart(start, timezone), until = Math.min(insightDateStart(end, timezone), now + 1);
  const [rows, lessons] = await Promise.all([
    fetchInsightEvidence(db, user, track, start, end, timezone, now),
    db.prepare(`SELECT s.id AS session_id,s.lesson_id,s.lesson_version,s.level,s.updated_at AS completed_at,l.title_ko,l.title_ja,l.title_en,
      coalesce(sum(CASE WHEN st.request_id IS NOT NULL AND st.phase='practice' AND st.correct IS NOT NULL THEN 1 ELSE 0 END),0) AS answers,
      coalesce(sum(CASE WHEN st.request_id IS NOT NULL AND st.phase='practice' THEN st.correct ELSE 0 END),0) AS correct
      FROM study_sessions s JOIN learning_lessons l ON l.id=s.lesson_id AND l.version=s.lesson_version AND l.learning_track=s.learning_track
      LEFT JOIN study_steps st ON st.session_id=s.id WHERE s.user_id=? AND s.learning_track=? AND s.status='completed' AND s.updated_at>=? AND s.updated_at<?
      GROUP BY s.id ORDER BY s.updated_at DESC,s.id LIMIT 201`).bind(user, track, from, until).all<{ session_id: string; lesson_id: string; lesson_version: string; level: string; completed_at: number; title_ko: string; title_ja: string; title_en: string; answers: number; correct: number }>(),
  ]);
  const days = aggregateInsightDays(rows, timezone, start, end, today);
  const completed_lessons: CompletedLesson[] = (lessons.results ?? []).slice(0, 200).map(l => ({ session_id: l.session_id, lesson_id: l.lesson_id, lesson_version: l.lesson_version, level: l.level, completed_at: l.completed_at, date: studyDate(l.completed_at, timezone), title: { ko: l.title_ko, ja: l.title_ja, en: l.title_en }, answers: l.answers, correct: l.correct }));
  const common = { learning_track: track, timezone, today, completed_lessons, completed_lessons_truncated: (lessons.results?.length ?? 0) > 200 };
  if ('date' in range) return { ...common, date: range.date, day: days[0]! };
  return { ...common, year: range.year, total_study_days: days.filter(d => d.studied).length,
    months: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, study_days: days.filter(d => Number(d.date.slice(5, 7)) === i + 1 && d.studied).length })), days };
}
