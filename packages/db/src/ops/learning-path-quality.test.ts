import assert from "node:assert/strict";
import test from "node:test";
import { CONCEPTS, ITEMS } from "../content/learning-path-2026-10-11/data.js";
import { buildLearningPathQualityReport } from "./learning-path-quality.js";
import { learningPathRedFlags } from "./learning-path-readiness.js";

test("learning path structural validator reports its version, hash, and source counts", () => {
  const report = buildLearningPathQualityReport();
  assert.equal(report.validator_version, "learning-path-quality-v1");
  assert.match(report.draft_sha256, /^[a-f0-9]{64}$/u);
  assert.deepEqual(report.counts, {
    concepts: 220,
    items: 440,
    jlpt: 200,
    topik: 240,
    listening: 98,
  });
});

test("publication preflight catches literal-answer leakage, untranslated titles and paired audio reuse", () => {
  const flags = learningPathRedFlags();
  for (const pattern of [
    "queried lemma",
    "untranslated concept title",
    "identical listening script",
  ])
    assert.ok(
      flags.some((f) => f.reason.includes(pattern)),
      pattern,
    );
});

test("learning path validator rejects audio on a non-listening item", () => {
  const items = ITEMS.map((item, index) =>
    index === 0 ? { ...item, audio_script: "forbidden" } : item,
  );
  assert.equal(
    buildLearningPathQualityReport(items, CONCEPTS).failures.some((failure) =>
      failure.message.includes("non-listening item has audio"),
    ),
    true,
  );
});

test("generated test fixture rejects a listening prompt that exposes its full script", () => {
  // Test-only mutation: this deliberately incomplete fixture is never release content.
  const listening = ITEMS.find((item) => item.section === "listening")!;
  const items = ITEMS.map((item) =>
    item.id === listening.id
      ? {
          ...item,
          question: {
            ...item.question,
            ja: `${item.question.ja} ${item.audio_script}`,
          },
        }
      : item,
  );
  assert.equal(
    buildLearningPathQualityReport(items, CONCEPTS).failures.some((failure) =>
      failure.message.includes("prompt exposes the full listening script"),
    ),
    true,
  );
});

test("learning path validator rejects a duplicate localized prompt", () => {
  const items = ITEMS.map((item, index) =>
    index === 1 ? { ...item, question: ITEMS[0]!.question } : item,
  );
  assert.equal(
    buildLearningPathQualityReport(items, CONCEPTS).failures.some((failure) =>
      failure.message.includes("duplicate prompt"),
    ),
    true,
  );
});
