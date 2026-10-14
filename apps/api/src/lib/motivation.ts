import type { LearningMotivation } from '@nihongo-n3/shared';
import type { DB } from './study-content.js';
import { publishedOwnerItem } from './owner-publication.js';

/** 강성호 · 2026-09-25: 학습일은 프로필 시간대에서 계산하고 과거 일지는 원래 날짜를 유지한다. */
export function studyDate(seconds: number, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(seconds * 1000));
}
function previousDay(day: string) {
  return new Date(Date.parse(day + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
}
export async function learningTimezone(db: DB, user: string, track: string) {
  const row = await db.prepare('SELECT timezone FROM learning_profiles WHERE user_id=? AND learning_track=?').bind(user, track).first<{timezone:string}>();
  return row?.timezone ?? (track === 'topik-ko' ? 'Asia/Tokyo' : 'Asia/Seoul');
}
export async function learningStreak(db: DB, user: string, track: string, now = Math.floor(Date.now() / 1000)) {
  const timezone = await learningTimezone(db, user, track);
  const today = studyDate(now, timezone);
  const results = await db.batch<{date: string | null; occurred_at: number | null}>([
    db.prepare('SELECT date,NULL AS occurred_at FROM daily_logs WHERE user_id=? AND learning_track=? AND items_new+items_review>0').bind(user, track),
    db.prepare(`SELECT NULL AS date,st.submitted_at AS occurred_at FROM study_steps st JOIN study_sessions s ON s.id=st.session_id
      WHERE s.user_id=? AND s.learning_track=? AND st.request_id IS NOT NULL AND st.submitted_at<=? AND st.phase IN ('learn','review','practice')`).bind(user, track, now),
    // Activity batches are client-writable, so only authoritative saved learning
    // rows count. A forged completion/speech event cannot create a learning day.
    db.prepare(`SELECT NULL AS date,unixepoch(finished_at) AS occurred_at FROM quiz_attempts WHERE user_id=? AND learning_track=? AND finished_at IS NOT NULL AND total>0 AND unixepoch(finished_at)<=?`).bind(user, track, now),
    db.prepare(track === 'topik-ko'
      ? `SELECT NULL AS date,completed_at AS occurred_at FROM topik_owner_curriculum_progress WHERE user_id=? AND status='completed' AND completed_at<=?`
      : `SELECT NULL AS date,CASE WHEN typeof(r.reviewed_at)='integer' THEN r.reviewed_at ELSE unixepoch(r.reviewed_at) END AS occurred_at
        FROM review_logs r JOIN srs_cards c ON c.id=r.card_id WHERE c.user_id=? AND c.learning_track='jlpt-ja' AND (CASE WHEN typeof(r.reviewed_at)='integer' THEN r.reviewed_at ELSE unixepoch(r.reviewed_at) END)<=?`).bind(user, now),
    ...(track === 'topik-ko' ? [db.prepare(`SELECT NULL AS date,r.reviewed_at AS occurred_at FROM topik_owner_review_logs r JOIN topik_owner_srs_cards c ON c.id=r.card_id WHERE c.user_id=? AND r.reviewed_at<=?`).bind(user, now)] : []),
  ]);
  const dates = new Set(results.flatMap((r) => r.results ?? []).map((row) => row.date ?? studyDate(row.occurred_at!, timezone)).filter((date) => date <= today));
  const sorted = [...dates].sort();
  const lastStudyDate = sorted.at(-1) ?? null;
  let currentStreak = 0, longestStreak = 0, run = 0;
  const badgeDates = new Map<number, string>();
  for (let i = 0; i < sorted.length; i++) {
    run = i && previousDay(sorted[i]!) === sorted[i - 1] ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    if ([3, 7, 30].includes(run) && !badgeDates.has(run)) badgeDates.set(run, sorted[i]!);
  }
  if (lastStudyDate === today || lastStudyDate === previousDay(today)) {
    for (let date = lastStudyDate; date && dates.has(date); date = previousDay(date)) currentStreak++;
  }
  return { currentStreak, longestStreak, totalDays: dates.size, lastStudyDate, frozen: false, badgeDates };
}

/** 보상은 채점/FSRS 성공과 같은 원자적 batch에 포함하며 HTTP 재전송은 기존 원본 ID를 재사용한다. */
export function studyRewardStatement(db: DB, user: string, track: string, step: {id:string;phase:string}, requestId: string, timezone: string, now: number) {
  const points = step.phase === 'learn' ? 5 : step.phase === 'retry' ? 1 : 3;
  const date = studyDate(now, timezone);
  return db.prepare(`INSERT INTO study_reward_events(user_id,learning_track,source_id,phase,study_day,timezone,points,occurred_at)
    SELECT ?,?,'study:'||id,phase,?,?,min(?,max(0,100-COALESCE((SELECT sum(points) FROM study_reward_events WHERE user_id=? AND learning_track=? AND study_day=?),0))),?
    FROM study_steps WHERE id=? AND request_id=?
    ON CONFLICT(user_id,learning_track,source_id) DO NOTHING`).bind(user, track, date, timezone, points, user, track, date, now, step.id, requestId);
}

export async function learningMotivation(db: DB, user: string, track: string): Promise<LearningMotivation> {
  const now = Math.floor(Date.now() / 1000);
  const [streak, xp, firstLesson, reviewMilestone, due] = await Promise.all([
    learningStreak(db, user, track, now),
    db.prepare('SELECT COALESCE(sum(points),0) AS xp FROM study_reward_events WHERE user_id=? AND learning_track=?').bind(user, track).first<{xp:number}>(),
    db.prepare("SELECT min(updated_at) AS earned_at FROM study_sessions WHERE user_id=? AND learning_track=? AND status='completed'").bind(user, track).first<{earned_at:number|null}>(),
    db.prepare(track === 'topik-ko'
      ? 'SELECT r.reviewed_at FROM topik_owner_review_logs r JOIN topik_owner_srs_cards c ON c.id=r.card_id WHERE c.user_id=? ORDER BY r.reviewed_at LIMIT 1 OFFSET 19'
      : "SELECT r.reviewed_at FROM review_logs r JOIN srs_cards c ON c.id=r.card_id WHERE c.user_id=? AND c.learning_track='jlpt-ja' ORDER BY r.reviewed_at LIMIT 1 OFFSET 19").bind(user).first<{reviewed_at:number|string}>(),
    db.prepare(track === 'topik-ko'
      ? `SELECT count(*) AS n FROM topik_owner_srs_cards c JOIN topik_owner_authored_curriculum_items i ON i.id=c.item_id
        WHERE c.user_id=? AND c.due_at<=? AND ${publishedOwnerItem('i')} AND i.target_grade=COALESCE((SELECT target_level FROM learning_profiles WHERE user_id=c.user_id AND learning_track='topik-ko'),'1')`
      : `SELECT count(*) AS n FROM srs_cards c WHERE c.user_id=? AND c.learning_track='jlpt-ja' AND (CASE WHEN typeof(c.due_at)='integer' THEN c.due_at ELSE unixepoch(c.due_at) END)<=?
        AND EXISTS(SELECT 1 FROM learning_profiles p WHERE p.user_id=c.user_id AND p.learning_track=c.learning_track AND (
          (c.item_type='vocab' AND c.item_id IN (SELECT id FROM vocab WHERE level=p.target_level)) OR
          (c.item_type='grammar' AND c.item_id IN (SELECT id FROM grammar WHERE level=p.target_level)) OR
          (c.item_type='kanji' AND c.item_id IN (SELECT id FROM kanji WHERE jlpt_level=p.target_level)) OR
          (c.item_type='sentence' AND c.item_id IN (SELECT id FROM sentences WHERE level=p.target_level)) OR
          (c.item_type='homophone' AND c.item_id IN (SELECT id FROM homophone_pairs WHERE level=p.target_level))))`).bind(user, now).first<{n:number}>(),
  ]);
  const badges: LearningMotivation['badges'] = [...streak.badgeDates].map(([n, date]) => ({ id: `streak_${n}`, earned_at: date }));
  if (firstLesson?.earned_at) badges.unshift({ id: 'first_lesson', earned_at: new Date(firstLesson.earned_at * 1000).toISOString() });
  if (reviewMilestone) badges.push({ id: 'reviews_20', earned_at: typeof reviewMilestone.reviewed_at === 'number' ? new Date(reviewMilestone.reviewed_at * 1000).toISOString() : reviewMilestone.reviewed_at });
  const points = Number(xp?.xp ?? 0);
  return { streak: streak.currentStreak, longest_streak: streak.longestStreak, xp: points, level: 1 + Math.floor(points / 100), due_count: Number(due?.n ?? 0), badges,
    rules: { xp_scope: 'guided-sessions', daily_cap: 100, cap_scope: 'track-local-day', level_step: 100 } };
}
