import { createHash } from "node:crypto";
import {
  CONCEPTS,
  ITEMS,
  type DraftItem,
} from "../content/learning-path-2026-10-11/data.js";
import type {
  ConceptSpec,
  Localized,
} from "../content/learning-path-2026-10-11/concept-specs.js";

export const LEARNING_PATH_VALIDATOR_VERSION = "learning-path-quality-v1";
type Failure = Readonly<{ id: string; message: string }>;
type Counts = Readonly<{
  concepts: number;
  items: number;
  jlpt: number;
  topik: number;
  listening: number;
}>;
export type LearningPathQualityReport = Readonly<{
  passed: boolean;
  counts: Counts;
  failures: readonly Failure[];
  validator_version: typeof LEARNING_PATH_VALIDATOR_VERSION;
  draft_sha256: string;
}>;

const languages = ["ko", "ja", "en"] as const;
const jlptSection: Record<string, string> = {
  vocab: "vocab_mc",
  grammar: "grammar_fill",
  kanji: "kanji_reading",
  listening: "listening",
};
const canonical = (
  concepts: readonly ConceptSpec[],
  items: readonly DraftItem[],
) => JSON.stringify({ concepts, items });
const complete = (value: Localized | undefined) =>
  Boolean(value && languages.every((language) => value[language].trim()));

// 강성호 2026-10-11: 이 검사는 draft 구조만 검증하며 source/reviewer/release gate 증명은 별도 단계다.
export function buildLearningPathQualityReport(
  items: readonly DraftItem[] = ITEMS,
  concepts: readonly ConceptSpec[] = CONCEPTS,
): LearningPathQualityReport {
  const failures: Failure[] = [];
  const fail = (id: string, message: string) => failures.push({ id, message });
  const ids = new Set<string>();
  const conceptByKey = new Map(
    concepts.map((concept) => [concept.key, concept]),
  );
  const prompts = new Map<string, Set<string>>();
  for (const concept of concepts) {
    if (ids.has(concept.key)) fail(concept.key, "duplicate concept id");
    ids.add(concept.key);
    if (!complete(concept.title) || !complete(concept.cue))
      fail(concept.key, "incomplete localized concept");
  }
  if (concepts.length !== 220)
    fail("counts", `expected 220 concepts, found ${concepts.length}`);
  if (items.length !== 440)
    fail("counts", `expected 440 items, found ${items.length}`);
  for (const [track, levels] of [
    ["jlpt-ja", ["N5", "N4", "N3", "N2", "N1"]],
    ["topik-ko", ["1", "2", "3", "4", "5", "6"]],
  ] as const)
    for (const level of levels) {
      const selectedConcepts = concepts.filter(
        (value) => value.track === track && value.level === level,
      );
      const selectedItems = items.filter(
        (value) => value.track === track && value.level === level,
      );
      if (selectedConcepts.length !== 20)
        fail(
          `${track}/${level}`,
          `expected 20 concepts, found ${selectedConcepts.length}`,
        );
      if (selectedItems.length !== 40)
        fail(
          `${track}/${level}`,
          `expected 40 items, found ${selectedItems.length}`,
        );
    }
  ids.clear();
  for (const item of items) {
    if (ids.has(item.id)) fail(item.id, "duplicate item id");
    ids.add(item.id);
    const concept = conceptByKey.get(item.concept_key);
    const expectedSection =
      concept &&
      (concept.track === "jlpt-ja"
        ? jlptSection[concept.section]
        : concept.section);
    if (
      !concept ||
      concept.track !== item.track ||
      concept.level !== item.level ||
      expectedSection !== item.section
    )
      fail(item.id, "concept track/level/section mismatch");
    if (!complete(item.question) || !complete(item.explanation))
      fail(item.id, "incomplete localized prompt or explanation");
    if (item.difficulty < 1 || item.difficulty > 5)
      fail(item.id, "difficulty outside 1..5");
    for (const language of languages) {
      const seen = prompts.get(language) ?? new Set<string>();
      const prompt = item.question[language].trim();
      if (seen.has(prompt)) fail(item.id, `${language} duplicate prompt`);
      seen.add(prompt);
      prompts.set(language, seen);
    }
    const isWriting = item.section === "writing";
    if (isWriting) {
      if (
        item.choices ||
        item.answer_index !== undefined ||
        !complete(item.rubric) ||
        !complete(item.sample)
      )
        fail(item.id, "writing contract is invalid");
    } else {
      if (
        !item.choices ||
        item.choices.length !== 4 ||
        item.answer_index === undefined ||
        item.answer_index < 0 ||
        item.answer_index > 3
      )
        fail(item.id, "multiple-choice contract is invalid");
      for (const language of languages)
        if (
          !item.choices ||
          new Set(item.choices.map((choice) => choice[language].trim()))
            .size !== 4 ||
          item.choices.some((choice) => !choice[language].trim())
        )
          fail(
            item.id,
            `${language} choices must be four unique nonempty values`,
          );
    }
    const text = JSON.stringify(item);
    if (/(?:r2|audio_url|audioUrl|legacy|https?:\/\/)/iu.test(text))
      fail(item.id, "legacy, R2, or audio URL reference");
    if (
      /(Target pattern|目標文型|사용할 문형)/u.test(
        item.question.ko + item.question.ja + item.question.en,
      )
    )
      fail(item.id, "answer-revealing prompt label");
    if (item.section === "listening") {
      if (!item.audio_script?.trim()) fail(item.id, "missing listening script");
      else if (item.question.ja.includes(item.audio_script))
        fail(item.id, "prompt exposes the full listening script");
    } else if (item.audio_script !== undefined)
      fail(item.id, "non-listening item has audio");
  }
  for (const concept of concepts)
    if (items.filter((item) => item.concept_key === concept.key).length !== 2)
      fail(concept.key, "concept must have exactly two items");
  for (const level of ["N5", "N4", "N3", "N2", "N1"]) {
    const selected = items.filter(
      (item) => item.track === "jlpt-ja" && item.level === level,
    );
    for (const answer of [0, 1, 2, 3])
      if (selected.filter((item) => item.answer_index === answer).length !== 10)
        fail(`jlpt/${level}`, `answer ${answer} must occur 10 times`);
    for (const section of [
      "vocab_mc",
      "grammar_fill",
      "kanji_reading",
      "listening",
    ]) {
      const group = selected.filter((item) => item.section === section);
      if (group.length !== 10)
        fail(`jlpt/${level}/${section}`, "expected 10 items");
      const values = [0, 1, 2, 3].map(
        (answer) => group.filter((item) => item.answer_index === answer).length,
      );
      if (Math.max(...values) - Math.min(...values) > 1)
        fail(
          `jlpt/${level}/${section}`,
          "answer distribution difference exceeds 1",
        );
    }
  }
  for (const level of ["1", "2", "3", "4", "5", "6"]) {
    const selected = items.filter(
      (item) => item.track === "topik-ko" && item.level === level,
    );
    const multipleChoice = selected.filter(
      (item) => item.section !== "writing",
    );
    if (
      multipleChoice.length !== 32 ||
      selected.filter((item) => item.section === "writing").length !== 8
    )
      fail(`topik/${level}`, "expected 32 MC and 8 writing items");
    for (const section of ["vocab", "grammar", "reading", "listening"]) {
      const group = selected.filter((item) => item.section === section);
      if (group.length !== 8)
        fail(`topik/${level}/${section}`, "expected 8 items");
      for (const answer of [0, 1, 2, 3])
        if (group.filter((item) => item.answer_index === answer).length !== 2)
          fail(
            `topik/${level}/${section}`,
            `answer ${answer} must occur twice`,
          );
    }
  }
  const listening = items.filter((item) => item.section === "listening");
  const jlptListening = listening.filter(
    (item) => item.track === "jlpt-ja",
  ).length;
  const topikListening = listening.filter(
    (item) => item.track === "topik-ko",
  ).length;
  if (jlptListening !== 50 || topikListening !== 48)
    fail(
      "listening",
      `expected JLPT 50 and TOPIK 48 scripts, found ${jlptListening}/${topikListening}`,
    );
  return {
    passed: failures.length === 0,
    counts: {
      concepts: concepts.length,
      items: items.length,
      jlpt: items.filter((item) => item.track === "jlpt-ja").length,
      topik: items.filter((item) => item.track === "topik-ko").length,
      listening: listening.length,
    },
    failures,
    validator_version: LEARNING_PATH_VALIDATOR_VERSION,
    draft_sha256: createHash("sha256")
      .update(canonical(concepts, items))
      .digest("hex"),
  };
}
