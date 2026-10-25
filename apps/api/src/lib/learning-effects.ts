import type { AppEnv } from "../types.js";
import { schedule, type CardSnapshot, type Rating } from "./fsrs.js";
type DB = AppEnv["Bindings"]["DB"];
export function topikCompletionStatements(
  db: DB,
  userId: string,
  item: { id: string; target_grade: number; item_type: string },
  now: number,
) {
  return [
    db
      .prepare(
        `INSERT INTO topik_owner_curriculum_progress (user_id,item_id,status,completed_at,last_studied_at,created_at,updated_at)
      VALUES (?,?,'completed',?,?,?,?) ON CONFLICT(user_id,item_id) DO UPDATE SET status='completed',
      completed_at=COALESCE(topik_owner_curriculum_progress.completed_at,excluded.completed_at),
      last_studied_at=excluded.last_studied_at,updated_at=excluded.updated_at`,
      )
      .bind(userId, item.id, now, now, now, now),
    db
      .prepare(
        `INSERT OR IGNORE INTO topik_owner_srs_cards
      (user_id,item_id,state,stability,difficulty,due_at,lapses,reps,learning_steps_idx,desired_retention,created_at,updated_at)
      VALUES (?,?,'new',2.5,5.0,?,0,0,0,0.9,?,?)`,
      )
      .bind(userId, item.id, now, now, now),
    db
      .prepare(
        `INSERT OR IGNORE INTO learning_activity_events
      (event_id,user_id,learning_track,event_type,content_type,content_id,level_tag,section,occurred_at)
      VALUES (?,?,'topik-ko','content_completed','topik-owner-item',?,?,?,?)`,
      )
      .bind(
        `topik-complete:${item.id}`,
        userId,
        item.id,
        `grade-${item.target_grade}`,
        item.item_type,
        now,
      ),
  ];
}
export async function reviewStatements(
  db: DB,
  userId: string,
  track: "jlpt-ja" | "topik-ko",
  cardId: number,
  rating: Rating,
  responseMs?: number,
) {
  const topik = track === "topik-ko";
  const table = topik ? "topik_owner_srs_cards" : "srs_cards";
  const card = await db
    .prepare(
      `SELECT * FROM ${table} WHERE id=? AND user_id=?${topik ? "" : " AND learning_track='jlpt-ja'"}`,
    )
    .bind(cardId, userId)
    .first<{
      id: number;
      item_id: string | number;
      item_type?: string;
      state: CardSnapshot["state"];
      stability: number;
      difficulty: number;
      lapses: number;
      reps: number;
      last_reviewed_at: string | number | null;
    }>();
  if (!card) return null;
  const now = new Date();
  const snapshot: CardSnapshot = {
    ...card,
    lastReviewedAt: card.last_reviewed_at
      ? new Date(
          typeof card.last_reviewed_at === "number"
            ? card.last_reviewed_at * 1000
            : card.last_reviewed_at,
        )
      : null,
  };
  const result = schedule(snapshot, rating, now);
  const time = topik ? Math.floor(now.getTime() / 1000) : now.toISOString();
  const due = topik
    ? Math.floor(result.dueAt.getTime() / 1000)
    : result.dueAt.toISOString();
  const elapsed = snapshot.lastReviewedAt
    ? Math.round((now.getTime() - snapshot.lastReviewedAt.getTime()) / 86400000)
    : 0;
  const interval = Math.round(
    (result.dueAt.getTime() - now.getTime()) / 86400000,
  );
  const statements = [
    db
      .prepare(
        `UPDATE ${table} SET state=?,stability=?,difficulty=?,lapses=?,reps=?,due_at=?,last_reviewed_at=?,updated_at=? WHERE id=? AND user_id=?`,
      )
      .bind(
        result.state,
        result.stability,
        result.difficulty,
        result.lapses,
        result.reps,
        due,
        time,
        time,
        cardId,
        userId,
      ),
    db
      .prepare(
        `INSERT INTO ${topik ? "topik_owner_review_logs" : "review_logs"} (card_id,rating,elapsed_days,scheduled_days,response_ms,reviewed_at) VALUES (?,?,?,?,?,?)`,
      )
      .bind(cardId, rating, elapsed, interval, responseMs ?? null, time),
  ];
  if (topik)
    statements.push(
      db
        .prepare(
          "UPDATE topik_owner_curriculum_progress SET last_studied_at=?,updated_at=? WHERE user_id=? AND item_id=?",
        )
        .bind(time, time, userId, card.item_id),
      db
        .prepare(
          `INSERT OR IGNORE INTO learning_activity_events (event_id,user_id,learning_track,event_type,content_type,content_id,rating,duration_ms,occurred_at)
      VALUES (?,?,'topik-ko','review_rated','topik-owner-item',?,?,?,?)`,
        )
        .bind(
          `topik-review:${cardId}:rep:${result.reps}`,
          userId,
          card.item_id,
          rating,
          responseMs ?? null,
          time,
        ),
    );
  return { statements, result, due_at: due, card };
}
