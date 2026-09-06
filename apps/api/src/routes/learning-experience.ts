import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { OpenAPIHono, z } from "@hono/zod-openapi";
import {
  learningProfileInputSchema,
  studySubmissionSchema,
  annotationInputSchema,
  learningProfileSchema,
  studySessionSchema,
  learningRecordsSchema,
  levelBelongsToTrack,
  studyRefKey,
  type LearningProfile,
  type StudySession,
  type StudyStep,
  type LearningRecords,
} from "@nihongo-n3/shared";
import type { AppEnv } from "../types.js";
import { cfAccessAuth } from "../middleware/auth.js";
import { ok, badRequest, conflict, notFound } from "../lib/response.js";
import {
  buildStudySteps,
  canonicalContent,
  contentStillPublished,
  contentsStillPublished,
  jsonValue,
  type DB,
  type DraftStep,
} from "../lib/study-content.js";
import {
  reviewStatements,
  topikCompletionStatements,
} from "../lib/learning-effects.js";
import {
  mountLegacyRouteWithOpenApiDocs,
  dataResponseSchema,
  problemSchema,
} from "./openapi-docs.js";

const routes = new Hono<AppEnv>();
routes.onError((error, c) => {
  if (error instanceof HTTPException && error.status === 410)
    return c.json(
      {
        type: "about:blank",
        title: "Gone",
        status: 410,
        detail: error.message,
      },
      410,
    );
  throw error;
});
for (const prefix of ["/learning/*", "/study/*"]) {
  routes.use(prefix, cfAccessAuth);
  routes.use(prefix, async (c, next) => {
    c.header("Cache-Control", "private, no-store");
    const expectedTrack = c.req.query("expected_track");
    if (expectedTrack && expectedTrack !== c.get("learningTrack"))
      return conflict(
        c,
        "Learning track changed on another device; reload before continuing",
      );
    return next();
  });
}
type SessionRow = {
  id: string;
  user_id: string;
  learning_track: "jlpt-ja" | "topik-ko";
  level: LearningProfile["target_level"];
  daily_minutes: number;
  status: StudySession["status"];
  created_at: number;
  updated_at: number;
  notices_json: string;
};
type StepRow = {
  id: string;
  session_id: string;
  ordinal: number;
  phase: StudyStep["phase"];
  content_ref: string;
  content_type: string;
  content_id: string;
  section: string;
  level: string;
  public_json: string;
  solution_json: string;
  card_id: number | null;
  revealed: number;
  request_id: string | null;
  answer: string | null;
  rating: string | null;
  correct: number | null;
  active_ms: number;
  submitted_at: number | null;
};
async function profileFor(
  db: DB,
  userId: string,
  track: "jlpt-ja" | "topik-ko",
): Promise<LearningProfile> {
  const row = await db
    .prepare(
      "SELECT learning_track,target_level,instruction_language,daily_minutes,timezone FROM learning_profiles WHERE user_id=? AND learning_track=?",
    )
    .bind(userId, track)
    .first<LearningProfile>();
  return row
    ? { ...row, configured: true }
    : {
        learning_track: track,
        target_level: track === "jlpt-ja" ? "N5" : "1",
        instruction_language: track === "jlpt-ja" ? "ko" : "ja",
        daily_minutes: 20,
        timezone: track === "jlpt-ja" ? "Asia/Seoul" : "Asia/Tokyo",
        configured: false,
      };
}
async function ownedSession(db: DB, id: string, userId: string, track: string) {
  return db
    .prepare(
      "SELECT * FROM study_sessions WHERE id=? AND user_id=? AND learning_track=?",
    )
    .bind(id, userId, track)
    .first<SessionRow>();
}
async function sessionDto(db: DB, row: SessionRow): Promise<StudySession> {
  const stored = await db
    .prepare("SELECT * FROM study_steps WHERE session_id=? ORDER BY ordinal")
    .bind(row.id)
    .all<StepRow>();
  const steps: StudyStep[] = [];
  const items = stored.results ?? [];
  const drafts = items.map((item) => JSON.parse(item.public_json) as DraftStep);
  const published =
    row.status === "abandoned"
      ? []
      : await contentsStillPublished(
          db,
          drafts.map((draft) => draft.ref),
        );
  for (const [index, item] of items.entries()) {
    const draft = drafts[index]!;
    // Never re-expose withdrawn content from an old snapshot.
    if (row.status === "abandoned") continue;
    if (!published[index])
      throw new HTTPException(410, {
        message: "Study content is no longer available",
      });
    steps.push({
      id: item.id,
      ordinal: item.ordinal,
      phase: item.phase,
      ref: draft.ref,
      section: item.section,
      level: item.level,
      prompt: draft.prompt,
      reading: draft.reading,
      choices: draft.choices,
      audio: draft.audio,
      mode: draft.mode,
      revealed: !!item.revealed,
      submitted: !!item.request_id,
      correct: item.correct === null ? null : !!item.correct,
      answer: item.answer,
      rating: item.rating,
      solution:
        item.revealed || item.request_id
          ? JSON.parse(item.solution_json)
          : null,
    });
  }
  return {
    id: row.id,
    learning_track: row.learning_track,
    level: row.level,
    daily_minutes: row.daily_minutes,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    steps,
    notices: JSON.parse(row.notices_json),
  };
}
routes.get("/learning/profile", async (c) =>
  ok(c, await profileFor(c.env.DB, c.get("userId"), c.get("learningTrack"))),
);
routes.put("/learning/profile", async (c) => {
  const parsed = learningProfileInputSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success) return badRequest(c, "Invalid learning profile");
  const p = parsed.data,
    track = c.get("learningTrack"),
    user = c.get("userId");
  if (!levelBelongsToTrack(track, p.target_level))
    return badRequest(c, "Level does not belong to this track");
  await c.env.DB.prepare(
    `INSERT INTO learning_profiles(user_id,learning_track,target_level,instruction_language,daily_minutes,timezone,updated_at)
    VALUES(?,?,?,?,?,?,unixepoch()) ON CONFLICT(user_id,learning_track) DO UPDATE SET
    target_level=excluded.target_level,instruction_language=excluded.instruction_language,daily_minutes=excluded.daily_minutes,timezone=excluded.timezone,updated_at=excluded.updated_at`,
  )
    .bind(
      user,
      track,
      p.target_level,
      p.instruction_language,
      p.daily_minutes,
      p.timezone,
    )
    .run();
  return ok(c, { ...p, learning_track: track, configured: true });
});
routes.get("/study/sessions", async (c) => {
  const row = await c.env.DB.prepare(
    "SELECT * FROM study_sessions WHERE user_id=? AND learning_track=? AND status IN ('active','paused') LIMIT 1",
  )
    .bind(c.get("userId"), c.get("learningTrack"))
    .first<SessionRow>();
  return ok(c, row ? await sessionDto(c.env.DB, row) : null);
});
routes.post("/study/sessions", async (c) => {
  const parsed = z
    .object({ request_id: z.string().uuid() })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return badRequest(c, "Invalid request ID");
  const db = c.env.DB,
    user = c.get("userId"),
    track = c.get("learningTrack");
  const existing = await db
    .prepare(
      "SELECT * FROM study_sessions WHERE user_id=? AND learning_track=? AND (request_id=? OR status IN ('active','paused')) ORDER BY created_at DESC LIMIT 1",
    )
    .bind(user, track, parsed.data.request_id)
    .first<SessionRow>();
  if (existing) return ok(c, await sessionDto(db, existing));
  const profile = await profileFor(db, user, track);
  if (!profile.configured)
    return conflict(c, "Configure your learning profile first");
  const draft = await buildStudySteps(db, user, profile);
  if (!draft.steps.length)
    return conflict(c, "No published content is available at this level");
  const id = crypto.randomUUID(),
    now = Math.floor(Date.now() / 1000);
  const statements = [
    db
      .prepare(
        `INSERT INTO study_sessions(id,user_id,learning_track,level,daily_minutes,status,request_id,notices_json,created_at,updated_at)
    VALUES(?,?,?,?,?,'active',?,?,?,?)`,
      )
      .bind(
        id,
        user,
        track,
        profile.target_level,
        profile.daily_minutes,
        parsed.data.request_id,
        JSON.stringify(draft.notices),
        now,
        now,
      ),
  ];
  draft.steps.forEach((step, i) => {
    const { solution, ...publicData } = step;
    statements.push(
      db
        .prepare(
          `INSERT INTO study_steps(id,session_id,ordinal,phase,content_ref,content_type,content_id,section,level,public_json,solution_json,card_id)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .bind(
          crypto.randomUUID(),
          id,
          i,
          step.phase,
          studyRefKey(step.ref),
          step.ref.type,
          step.ref.id,
          step.section,
          step.level,
          JSON.stringify(publicData),
          JSON.stringify(solution),
          step.card_id ?? null,
        ),
    );
  });
  try {
    await db.batch(statements);
  } catch (error) {
    const raced = await db
      .prepare(
        "SELECT * FROM study_sessions WHERE user_id=? AND learning_track=? AND status IN ('active','paused')",
      )
      .bind(user, track)
      .first<SessionRow>();
    if (raced) return ok(c, await sessionDto(db, raced));
    throw error;
  }
  return ok(
    c,
    await sessionDto(db, (await ownedSession(db, id, user, track))!),
  );
});
routes.get("/study/sessions/:id", async (c) => {
  const row = await ownedSession(
    c.env.DB,
    c.req.param("id"),
    c.get("userId"),
    c.get("learningTrack"),
  );
  return row ? ok(c, await sessionDto(c.env.DB, row)) : notFound(c);
});
routes.patch("/study/sessions/:id", async (c) => {
  const parsed = z
    .object({ status: z.enum(["active", "paused", "completed", "abandoned"]) })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return badRequest(c, "Invalid session state");
  const db = c.env.DB,
    row =
      c.req.param("id") === "current"
        ? await db
            .prepare(
              "SELECT * FROM study_sessions WHERE user_id=? AND learning_track=? AND status IN ('active','paused') LIMIT 1",
            )
            .bind(c.get("userId"), c.get("learningTrack"))
            .first<SessionRow>()
        : await ownedSession(
            db,
            c.req.param("id"),
            c.get("userId"),
            c.get("learningTrack"),
          );
  if (!row) return notFound(c);
  if (row.status === "completed" || row.status === "abandoned")
    return parsed.data.status === row.status
      ? ok(c, await sessionDto(db, row))
      : conflict(c, "Closed session is immutable");
  const pending = await db
    .prepare(
      "SELECT count(*) AS n FROM study_steps WHERE session_id=? AND request_id IS NULL",
    )
    .bind(row.id)
    .first<{ n: number }>();
  if (parsed.data.status === "completed" && pending?.n)
    return conflict(c, "There are unsubmitted steps");
  const updated = await db
    .prepare(
      "UPDATE study_sessions SET status=?,updated_at=unixepoch() WHERE id=? AND status IN ('active','paused')",
    )
    .bind(parsed.data.status, row.id)
    .run();
  if (!updated.meta.changes) return conflict(c, "Closed session is immutable");
  return ok(
    c,
    await sessionDto(
      db,
      (await ownedSession(db, row.id, row.user_id, row.learning_track))!,
    ),
  );
});
routes.post("/study/sessions/:id/steps/:stepId/reveal", async (c) => {
  const db = c.env.DB,
    row = await ownedSession(
      db,
      c.req.param("id"),
      c.get("userId"),
      c.get("learningTrack"),
    );
  if (!row) return notFound(c);
  const step = await db
    .prepare("SELECT * FROM study_steps WHERE id=? AND session_id=?")
    .bind(c.req.param("stepId"), row.id)
    .first<StepRow>();
  if (!step) return notFound(c);
  if (step.phase === "practice" || step.phase === "retry")
    return conflict(c, "Submit an answer before viewing the solution");
  await db
    .prepare("UPDATE study_steps SET revealed=1 WHERE id=?")
    .bind(step.id)
    .run();
  return ok(c, await sessionDto(db, row));
});
routes.post("/study/sessions/:id/steps/:stepId/submit", async (c) => {
  const parsed = studySubmissionSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success) return badRequest(c, "Invalid study submission");
  const input = parsed.data,
    db = c.env.DB,
    user = c.get("userId"),
    track = c.get("learningTrack");
  const row = await ownedSession(db, c.req.param("id"), user, track);
  if (!row) return notFound(c);
  const step = await db
    .prepare("SELECT * FROM study_steps WHERE id=? AND session_id=?")
    .bind(c.req.param("stepId"), row.id)
    .first<StepRow>();
  if (!step) return notFound(c);
  if (step.request_id)
    return step.request_id === input.request_id
      ? ok(c, await sessionDto(db, row))
      : conflict(c, "This step has already been submitted");
  if (row.status === "completed" || row.status === "abandoned")
    return conflict(c, "Session is closed");
  const previous = await db
    .prepare(
      "SELECT id FROM study_steps WHERE session_id=? AND ordinal<? AND request_id IS NULL LIMIT 1",
    )
    .bind(row.id, step.ordinal)
    .first();
  if (previous) return conflict(c, "Complete the previous step first");
  const draft = JSON.parse(step.public_json) as DraftStep,
    solution = JSON.parse(step.solution_json) as DraftStep["solution"];
  if (!(await contentStillPublished(db, draft.ref)))
    return conflict(c, "Content is no longer published");
  const isQuestion = step.phase === "practice" || step.phase === "retry";
  if (!isQuestion && (!step.revealed || !input.rating))
    return badRequest(c, "Reveal, recall, then rate the item");
  if (!isQuestion && draft.mode === "writing" && !input.answer?.trim())
    return badRequest(c, "Writing requires your own response");
  if (
    isQuestion &&
    (!input.answer?.trim() ||
      (draft.mode === "choice" && !draft.choices.includes(input.answer)))
  )
    return badRequest(c, "An answer is required");
  const correct =
    isQuestion && draft.mode === "choice"
      ? input.answer === solution.answer
      : null;
  const now = Math.floor(Date.now() / 1000);
  const statements = [
    db
      .prepare(
        `UPDATE study_steps SET request_id=?,answer=?,rating=?,correct=?,active_ms=?,submitted_at=? WHERE id=?`,
      )
      .bind(
        input.request_id,
        input.answer ?? null,
        isQuestion ? null : (input.rating ?? null),
        correct === null ? null : Number(correct),
        input.active_ms,
        now,
        step.id,
      ),
  ];
  if (step.phase === "learn") {
    if (track === "topik-ko") {
      statements.push(
        ...topikCompletionStatements(
          db,
          user,
          {
            id: step.content_id,
            target_grade: Number(row.level),
            item_type: step.section,
          },
          now,
        ),
      );
    } else {
      statements.push(
        db
          .prepare(
            `INSERT OR IGNORE INTO srs_cards(user_id,learning_track,item_type,item_id,state,stability,difficulty,lapses,reps,due_at,created_at,updated_at)
        VALUES(?,'jlpt-ja',?,?,'new',2.5,5.0,0,0,?,?,?)`,
          )
          .bind(
            user,
            step.content_type,
            Number(step.content_id),
            new Date().toISOString(),
            new Date().toISOString(),
            new Date().toISOString(),
          ),
      );
    }
  }
  if (step.phase === "review" && step.card_id && input.rating) {
    const mutation = await reviewStatements(
      db,
      user,
      track,
      step.card_id,
      input.rating,
      input.active_ms,
    );
    if (!mutation) return notFound(c, "Review card not found");
    statements.push(...mutation.statements);
  }
  // TOPIK complete/review already emits its canonical event in the shared service.
  const eventType =
    step.phase === "learn"
      ? "content_completed"
      : step.phase === "review"
        ? "review_rated"
        : step.phase === "practice" && correct !== null
          ? "quiz_answered"
          : null;
  if (
    eventType &&
    !(
      track === "topik-ko" &&
      (step.phase === "learn" || step.phase === "review")
    )
  ) {
    statements.push(
      db
        .prepare(
          `INSERT INTO learning_activity_events(event_id,user_id,learning_track,event_type,content_type,content_id,level_tag,section,correct,rating,duration_ms,occurred_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .bind(
          `study:${step.id}`,
          user,
          track,
          eventType,
          step.content_type,
          step.content_id,
          step.level,
          step.section,
          correct === null ? null : Number(correct),
          isQuestion ? null : (input.rating ?? null),
          input.active_ms,
          now,
        ),
    );
  }
  if (step.phase === "practice" && correct === false) {
    // A wrong answer is revisited only after another unsubmitted item. The last
    // question's error waits for the next session rather than immediate parroting.
    const later = await db
      .prepare(
        "SELECT count(*) AS n,max(ordinal) AS last FROM study_steps WHERE session_id=? AND ordinal>? AND request_id IS NULL",
      )
      .bind(row.id, step.ordinal)
      .first<{ n: number; last: number | null }>();
    if (later?.n) {
      const snapshot = { ...draft, phase: "retry", origin_step_id: step.id };
      statements.push(
        db
          .prepare(
            `INSERT INTO study_steps(id,session_id,ordinal,phase,content_ref,content_type,content_id,section,level,public_json,solution_json)
        VALUES(?,?,?,'retry',?,?,?,?,?,?,?)`,
          )
          .bind(
            crypto.randomUUID(),
            row.id,
            later.last! + 1,
            step.content_ref,
            step.content_type,
            step.content_id,
            step.section,
            step.level,
            JSON.stringify(snapshot),
            step.solution_json,
          ),
      );
    }
  }
  statements.push(
    db
      .prepare(
        `UPDATE study_sessions SET updated_at=?,status=CASE WHEN NOT EXISTS
    (SELECT 1 FROM study_steps WHERE session_id=? AND request_id IS NULL) THEN 'completed' ELSE 'active' END WHERE id=? AND status IN ('active','paused')`,
      )
      .bind(now, row.id, row.id),
  );
  try {
    await db.batch(statements);
  } catch (error) {
    const accepted = await db
      .prepare("SELECT request_id FROM study_steps WHERE id=?")
      .bind(step.id)
      .first<{ request_id: string | null }>();
    if (accepted?.request_id)
      return accepted.request_id === input.request_id
        ? ok(
            c,
            await sessionDto(
              db,
              (await ownedSession(db, row.id, user, track))!,
            ),
          )
        : conflict(c, "This step has already been submitted");
    const latest = await ownedSession(db, row.id, user, track);
    if (latest?.status === "completed" || latest?.status === "abandoned")
      return conflict(c, "Session is closed");
    throw error;
  }
  return ok(
    c,
    await sessionDto(db, (await ownedSession(db, row.id, user, track))!),
  );
});
routes.get("/learning/annotations", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT scope,ref,text,revision FROM learning_annotations WHERE user_id=? AND learning_track=? ORDER BY updated_at DESC LIMIT 500",
  )
    .bind(c.get("userId"), c.get("learningTrack"))
    .all();
  return ok(c, rows.results ?? []);
});
routes.put("/learning/annotations", async (c) => {
  const parsed = annotationInputSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success) return badRequest(c, "Invalid annotation");
  const a = parsed.data,
    db = c.env.DB,
    user = c.get("userId"),
    track = c.get("learningTrack");
  if (a.scope === "day" && !/^\d{4}-\d{2}-\d{2}$/.test(a.ref))
    return badRequest(c, "Invalid date");
  if (a.scope === "day") {
    const date = new Date(a.ref + "T00:00:00Z");
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== a.ref
    )
      return badRequest(c, "Invalid date");
  }
  if (a.scope === "content" && !a.ref.startsWith(`${track}:`))
    return badRequest(c, "Annotation track mismatch");
  const existing = await db
    .prepare(
      "SELECT text,revision FROM learning_annotations WHERE user_id=? AND learning_track=? AND scope=? AND ref=?",
    )
    .bind(user, track, a.scope, a.ref)
    .first<{ text: string; revision: number }>();
  // A response lost after commit can safely be retried with the old revision.
  if (existing?.text === a.text && existing.revision === a.revision + 1)
    return ok(c, { ...a, revision: existing.revision });
  const result = await db
    .prepare(
      `INSERT INTO learning_annotations(user_id,learning_track,scope,ref,text,revision,updated_at)
    SELECT ?,?,?,?,?,1,unixepoch() WHERE ?=0
    ON CONFLICT(user_id,learning_track,scope,ref) DO UPDATE SET text=excluded.text,revision=learning_annotations.revision+1,updated_at=excluded.updated_at
    WHERE learning_annotations.revision=?`,
    )
    .bind(user, track, a.scope, a.ref, a.text, a.revision, a.revision)
    .run();
  // Existing rows require an explicit revision and a compare-and-swap.
  if (!result.meta.changes && a.revision > 0) {
    const update = await db
      .prepare(
        "UPDATE learning_annotations SET text=?,revision=revision+1,updated_at=unixepoch() WHERE user_id=? AND learning_track=? AND scope=? AND ref=? AND revision=?",
      )
      .bind(a.text, user, track, a.scope, a.ref, a.revision)
      .run();
    if (!update.meta.changes)
      return conflict(
        c,
        "The note changed on another device; reload before saving",
      );
  } else if (!result.meta.changes)
    return conflict(c, "The note already exists");
  return ok(c, {
    scope: a.scope,
    ref: a.ref,
    text: a.text,
    revision: a.revision + 1,
  });
});
routes.get("/learning/records", async (c) => {
  const window = c.req.query("window") ?? "7d";
  if (window !== "7d" && window !== "30d")
    return badRequest(c, "Invalid window");
  const db = c.env.DB,
    user = c.get("userId"),
    track = c.get("learningTrack"),
    profile = await profileFor(db, user, track);
  const since =
    Math.floor(Date.now() / 1000) - (window === "7d" ? 7 : 30) * 86400;
  const rows = await db
    .prepare(
      `SELECT st.*,s.level AS target_level FROM study_steps st JOIN study_sessions s ON s.id=st.session_id
    WHERE s.user_id=? AND s.learning_track=? AND st.submitted_at>=? ORDER BY st.submitted_at`,
    )
    .bind(user, track, since)
    .all<StepRow>();
  const totals: LearningRecords["totals"] = {
    first_answers: 0,
    first_correct: 0,
    retry_answers: 0,
    retry_correct: 0,
    learned: 0,
    reviews: 0,
    active_ms: 0,
  };
  const days = new Map<string, LearningRecords["days"][number]>(),
    groups = new Map<string, LearningRecords["groups"][number]>();
  for (const step of rows.results ?? []) {
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: profile.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(step.submitted_at! * 1000));
    const day = days.get(date) ?? {
      date,
      completed: 0,
      reviews: 0,
      answers: 0,
      correct: 0,
      active_ms: 0,
    };
    day.active_ms += step.active_ms;
    totals.active_ms += step.active_ms;
    if (step.phase === "learn") {
      totals.learned++;
      day.completed++;
    }
    if (step.phase === "review") {
      totals.reviews++;
      day.reviews++;
    }
    if (step.correct !== null) {
      if (step.phase === "retry") {
        totals.retry_answers++;
        totals.retry_correct += step.correct;
      } else if (step.phase === "practice") {
        totals.first_answers++;
        totals.first_correct += step.correct;
        day.answers++;
        day.correct += step.correct;
        const key = `${step.level}:${step.section}`;
        const group = groups.get(key) ?? {
          level: step.level,
          section: step.section,
          answered: 0,
          correct: 0,
        };
        group.answered++;
        group.correct += step.correct;
        groups.set(key, group);
      }
    }
    days.set(date, day);
  }
  const sessions = await db
    .prepare(
      `SELECT s.id,s.level,s.status,s.created_at,s.updated_at,count(st.id) AS total,sum(st.request_id IS NOT NULL) AS done
    FROM study_sessions s LEFT JOIN study_steps st ON st.session_id=s.id WHERE s.user_id=? AND s.learning_track=? AND s.created_at>=?
    GROUP BY s.id ORDER BY s.created_at DESC LIMIT 100`,
    )
    .bind(user, track, since)
    .all<LearningRecords["sessions"][number]>();
  const due = await db
    .prepare(
      track === "topik-ko"
        ? "SELECT min(due_at) AS due FROM topik_owner_srs_cards WHERE user_id=?"
        : "SELECT min(CASE WHEN typeof(due_at)='integer' THEN due_at ELSE unixepoch(due_at) END) AS due FROM srs_cards WHERE user_id=? AND learning_track='jlpt-ja'",
    )
    .bind(user)
    .first<{ due: number | null }>();
  return ok(c, {
    window,
    totals,
    days: [...days.values()],
    groups: [...groups.values()],
    sessions: sessions.results ?? [],
    next_review_at: due?.due ?? null,
  } satisfies LearningRecords);
});
// Typed content adapter is also used by legacy review; IDs never cross types.
routes.get("/learning/content/:type/:id", async (c) => {
  if (c.get("learningTrack") !== "jlpt-ja") return notFound(c);
  const item = await canonicalContent(
    c.env.DB,
    c.req.param("type") as DraftStep["ref"]["type"],
    c.req.param("id"),
  );
  return item ? ok(c, item) : notFound(c);
});
export const learningExperienceOA = new OpenAPIHono<AppEnv>();
const expectedTrackQuery = z.object({
  expected_track: z.enum(["jlpt-ja", "topik-ko"]).optional().openapi({
    description:
      "Reject stale device scope with 409 before reading or writing a different track. Omit for legacy clients.",
  }),
});
const definitions = [
  ["get", "/learning/profile"],
  ["put", "/learning/profile"],
  ["get", "/study/sessions"],
  ["post", "/study/sessions"],
  ["get", "/study/sessions/{id}"],
  ["patch", "/study/sessions/{id}"],
  ["post", "/study/sessions/{id}/steps/{stepId}/reveal"],
  ["post", "/study/sessions/{id}/steps/{stepId}/submit"],
  ["get", "/learning/annotations"],
  ["put", "/learning/annotations"],
  ["get", "/learning/records"],
  ["get", "/learning/content/{type}/{id}"],
] as const;
mountLegacyRouteWithOpenApiDocs(
  learningExperienceOA,
  routes,
  definitions.map(([method, path]) => ({
    method,
    path,
    tags: ["Learning experience"],
    summary: `${method.toUpperCase()} ${path}`,
    request: {
      query:
        path === "/learning/records"
          ? expectedTrackQuery.extend({
              window: z.enum(["7d", "30d"]).optional(),
            })
          : expectedTrackQuery,
    },
    ...(method === "put" && path === "/learning/profile"
      ? {
          request: {
            query: expectedTrackQuery,
            body: {
              content: {
                "application/json": { schema: learningProfileInputSchema },
              },
            },
          },
        }
      : {}),
    ...(method === "post" && path === "/study/sessions"
      ? {
          request: {
            query: expectedTrackQuery,
            body: {
              content: {
                "application/json": {
                  schema: z.object({ request_id: z.string().uuid() }),
                },
              },
            },
          },
        }
      : {}),
    ...(method === "patch"
      ? {
          request: {
            query: expectedTrackQuery,
            body: {
              content: {
                "application/json": {
                  schema: z.object({
                    status: z.enum([
                      "active",
                      "paused",
                      "completed",
                      "abandoned",
                    ]),
                  }),
                },
              },
            },
          },
        }
      : {}),
    ...(path.endsWith("/submit")
      ? {
          request: {
            query: expectedTrackQuery,
            body: {
              content: {
                "application/json": { schema: studySubmissionSchema },
              },
            },
          },
        }
      : {}),
    ...(method === "put" && path === "/learning/annotations"
      ? {
          request: {
            query: expectedTrackQuery,
            body: {
              content: {
                "application/json": { schema: annotationInputSchema },
              },
            },
          },
        }
      : {}),
    responses: {
      200: {
        description: "Account and track scoped data",
        content: {
          "application/json": {
            schema:
              path === "/learning/profile"
                ? z.object({ data: learningProfileSchema })
                : path.startsWith("/study/")
                  ? z.object({
                      data:
                        method === "get" && path === "/study/sessions"
                          ? studySessionSchema.nullable()
                          : studySessionSchema,
                    })
                  : path === "/learning/annotations"
                    ? z.object({
                        data:
                          method === "get"
                            ? z.array(annotationInputSchema)
                            : annotationInputSchema,
                      })
                    : path === "/learning/records"
                      ? z.object({ data: learningRecordsSchema })
                      : dataResponseSchema,
          },
        },
      },
      400: {
        description: "Invalid input",
        content: { "application/json": { schema: problemSchema } },
      },
      401: {
        description: "Authentication required",
        content: { "application/json": { schema: problemSchema } },
      },
      404: {
        description: "Not found",
        content: { "application/json": { schema: problemSchema } },
      },
      409: {
        description: "Conflicting state",
        content: { "application/json": { schema: problemSchema } },
      },
      410: {
        description: "Study content withdrawn; saved history is retained",
        content: { "application/json": { schema: problemSchema } },
      },
    },
  })),
);
