import type { AppEnv } from "../types.js";
import type { QuizGenerateBody } from "@nihongo-n3/shared";
import { safeErrorName } from "./safe-log.js";
import {
  buildBalancedChoices,
  cryptoRandomIndex,
  rotatingAnswerIndex,
} from "./quiz-choice-order.js";
export class QuizPoolError extends Error {}
function firstExampleJa(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    const first = parsed[0];
    const value =
      first?.ja ?? first?.jp ?? first?.example_ja ?? first?.example_jp;
    return typeof value === "string" && value.trim() ? value : null;
  } catch {
    return null;
  }
}

async function loadRows<T>(
  db: AppEnv["Bindings"]["DB"],
  sql: string,
  bindings: unknown[],
): Promise<T[]> {
  const rows = await db
    .prepare(sql)
    .bind(...bindings)
    .all<T>();
  return rows.results ?? [];
}

export async function generateQuizQuestions(
  db: AppEnv["Bindings"]["DB"],
  userId: string,
  body: QuizGenerateBody,
) {
  const { mode, level, count, strategy } = body;
  type Question = {
    id: string;
    type: string;
    prompt: string;
    choices: string[];
    answer: string;
    item_id: string | number;
    script_ja?: string;
    script_ko?: string;
  };

  const questions: Question[] = [];
  const answerPositionOffset = cryptoRandomIndex(4);
  let answerPositionOrdinal = 0;
  const nextChoices = (answer: string, candidates: string[]): string[] => {
    const choices = buildBalancedChoices(
      answer,
      candidates,
      rotatingAnswerIndex(answerPositionOffset, answerPositionOrdinal),
    );
    answerPositionOrdinal += 1;
    return choices;
  };
  const ordering = (
    tableAlias: string,
    requestedCount: number,
  ): { sql: string; bindings: unknown[] } => {
    const poolSize = Math.max(requestedCount * 4, requestedCount + 3);
    if (strategy === "random")
      return { sql: "ORDER BY RANDOM() LIMIT ?", bindings: [poolSize] };
    return {
      sql: `ORDER BY (
        SELECT count(*) FROM learning_activity_events activity
        WHERE activity.user_id = ?
          AND activity.learning_track = 'jlpt-ja'
          AND activity.event_type = 'quiz_answered'
          AND (activity.content_type = ? OR activity.section = ?)
          AND activity.content_id = CAST(${tableAlias}.id AS TEXT)
          AND activity.correct = 0
          AND activity.occurred_at >= unixepoch() - 2592000
      ) DESC, RANDOM() LIMIT ?`,
      bindings: [userId, mode, mode, poolSize],
    };
  };

  try {
    const staticBankEligible =
      level === "N2" ||
      level === "N1" ||
      (strategy === "weakest" &&
        level === "N3" &&
        (mode === "kanji_reading" || mode === "listening"));
    if (staticBankEligible) {
      type LocalizedChoice = { ko: string; ja: string; en: string };
      const staticLimit =
        level === "N2" || level === "N1" ? Math.min(count, 15) : count;
      const staticOrder =
        strategy === "weakest"
          ? `ORDER BY (
            SELECT count(*) FROM learning_activity_events activity
             WHERE activity.user_id = ?
               AND activity.learning_track = 'jlpt-ja'
               AND activity.event_type = 'quiz_answered'
               AND (activity.content_type = ? OR activity.section = ?)
               AND activity.content_id = bank.id
               AND activity.correct = 0
               AND activity.occurred_at >= unixepoch() - 2592000
          ) DESC, RANDOM()`
          : "ORDER BY RANDOM()";
      const staticRows = await loadRows<{
        id: string;
        prompt_ko: string;
        prompt_ja: string;
        choices_json: string;
        answer_index: number;
        audio_script_ja: string | null;
      }>(
        db,
        `SELECT bank.id, bank.prompt_ko, bank.prompt_ja, bank.choices_json,
                bank.answer_index, bank.audio_script_ja
           FROM jlpt_practice_questions bank
          WHERE bank.learning_track = 'jlpt-ja'
            AND bank.level = ?
            AND bank.mode = ?
            AND bank.is_published = 1
          ${staticOrder}
          LIMIT ?`,
        strategy === "weakest"
          ? [level, mode, userId, mode, mode, staticLimit]
          : [level, mode, staticLimit],
      );
      const mapped = staticRows.flatMap((row): Question[] => {
        let localized: LocalizedChoice[];
        try {
          localized = JSON.parse(row.choices_json) as LocalizedChoice[];
        } catch {
          return [];
        }
        const language =
          mode === "vocab_mc" || mode === "listening" ? "ko" : "ja";
        const choices = localized
          .map((choice) => choice?.[language]?.trim())
          .filter((choice): choice is string => Boolean(choice));
        const answer = choices[row.answer_index];
        if (choices.length !== 4 || new Set(choices).size !== 4 || !answer)
          return [];
        return [
          {
            id: `q_${row.id}`,
            type: mode,
            prompt: mode === "listening" ? row.prompt_ko : row.prompt_ja,
            choices: nextChoices(
              answer,
              choices.filter((choice) => choice !== answer),
            ),
            answer,
            item_id: row.id,
            ...(mode === "listening" && row.audio_script_ja
              ? { script_ja: row.audio_script_ja }
              : {}),
          },
        ];
      });
      if (staticRows.length > 0 && mapped.length !== staticLimit) {
        throw new QuizPoolError(
          `${level} 레벨 ${mode} 검수 문제은행 데이터가 부족합니다`,
        );
      }
      questions.push(...mapped);
    }

    const remaining = count - questions.length;
    if (remaining > 0 && mode === "vocab_mc") {
      const order = ordering("vocab", remaining);
      const pool = await loadRows<{
        id: number;
        word: string;
        meaning_ko: string;
      }>(
        db,
        `SELECT id, ja AS word, ko AS meaning_ko FROM vocab
         WHERE level = ?
           AND ja != ''
           AND ko != ''
         ${order.sql}`,
        [level, ...order.bindings],
      );
      const answers = pool.slice(0, remaining);

      for (const ans of answers) {
        const distractorCandidates = pool
          .filter((r) => r.id !== ans.id)
          .map((r) => r.meaning_ko);

        questions.push({
          id: `q_${ans.id}`,
          type: "vocab_mc",
          prompt: ans.word,
          choices: nextChoices(ans.meaning_ko, distractorCandidates),
          answer: ans.meaning_ko,
          item_id: ans.id,
        });
      }
    } else if (remaining > 0 && mode === "kanji_reading") {
      const order = ordering("kanji", remaining);
      const pool = await loadRows<{
        id: number;
        kanji: string;
        primary_reading: string;
      }>(
        db,
        `SELECT id, char AS kanji, COALESCE(on_yomi, kun_yomi, '') AS primary_reading FROM kanji
         WHERE jlpt_level = ?
           AND COALESCE(on_yomi, kun_yomi, '') != ''
         ${order.sql}`,
        [level, ...order.bindings],
      );
      const answers = pool.slice(0, remaining);

      for (const ans of answers) {
        const distractorCandidates = pool
          .filter((r) => r.id !== ans.id)
          .map((r) => r.primary_reading);

        questions.push({
          id: `q_${ans.id}`,
          type: "kanji_reading",
          prompt: ans.kanji,
          choices: nextChoices(ans.primary_reading, distractorCandidates),
          answer: ans.primary_reading,
          item_id: ans.id,
        });
      }
    } else if (remaining > 0 && mode === "grammar_fill") {
      const order = ordering("grammar", remaining);
      const rawPool = await loadRows<{
        id: number;
        pattern: string;
        examples: string;
      }>(
        db,
        `SELECT id, pattern, examples FROM grammar
         WHERE level = ?
           AND examples IS NOT NULL
           AND examples != '[]'
         ${order.sql}`,
        [level, ...order.bindings],
      );

      const pool = rawPool
        .map((row) => ({ ...row, example_ja: firstExampleJa(row.examples) }))
        .filter(
          (
            row,
          ): row is {
            id: number;
            pattern: string;
            examples: string;
            example_ja: string;
          } => Boolean(row.example_ja),
        );
      const answers = pool.slice(0, remaining);

      for (const ans of answers) {
        const prompt = ans.example_ja.replace(ans.pattern, "＿＿＿");
        const distractorCandidates = pool
          .filter((r) => r.id !== ans.id)
          .map((r) => r.pattern);

        questions.push({
          id: `q_${ans.id}`,
          type: "grammar_fill",
          prompt,
          choices: nextChoices(ans.pattern, distractorCandidates),
          answer: ans.pattern,
          item_id: ans.id,
        });
      }
    } else if (remaining > 0 && mode === "listening") {
      const order = ordering("sentences", remaining);
      const pool = await loadRows<{
        id: number;
        sentence_ja: string;
        sentence_ko: string;
        level: string;
      }>(
        db,
        `SELECT id, ja AS sentence_ja, ko AS sentence_ko, level
         FROM sentences
         WHERE level = ?
           AND ja != ''
           AND ko != ''
         ${order.sql}`,
        [level, ...order.bindings],
      );
      const answers = pool.slice(0, remaining);

      for (const ans of answers) {
        const distractorCandidates = pool
          .filter((r) => r.id !== ans.id)
          .map((r) => r.sentence_ko);

        questions.push({
          id: `q_${ans.id}`,
          type: "listening",
          prompt: "음성을 듣고 올바른 해석을 고르세요.",
          choices: nextChoices(ans.sentence_ko, distractorCandidates),
          answer: ans.sentence_ko,
          item_id: ans.id,
          script_ja: ans.sentence_ja,
          script_ko: ans.sentence_ko,
        });
      }
    }
  } catch (err) {
    console.error({
      event: "quiz_generation_error",
      error_name: safeErrorName(err),
    });
    throw err;
  }

  if (
    questions.length !== count ||
    questions.some((question) => question.choices.length !== 4)
  ) {
    throw new QuizPoolError(`${level} 레벨 ${mode} 문제 데이터가 부족합니다`);
  }

  return questions;
}
