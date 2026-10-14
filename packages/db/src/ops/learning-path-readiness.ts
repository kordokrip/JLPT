// 강성호 2026-10-11: 구조 통과와 실제 출판 가능 여부를 분리하며 불합격 검수를 승인으로 바꾸지 않는다.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { CONCEPTS, ITEMS } from "../content/learning-path-2026-10-11/data.js";
import { buildLearningPathQualityReport } from "./learning-path-quality.js";
import { resolveLearningConcept } from "../seed/learning-path-draft.js";
type Review = {
  reviewer_id: string;
  draft_sha256: string;
  source_evidence_sha256: string;
  passed: boolean;
  items: Array<{ id: string; status: string }>;
  concept_findings?: unknown[];
};
type DB = Parameters<typeof resolveLearningConcept>[0];
export const latestLearningPathSource = new URL(
  "../content/learning-path-source-intake-2026-10-11-v2.json",
  import.meta.url,
);
export function learningPathReviews(): Review[] {
  return ["a", "b"].map(
    (id) =>
      JSON.parse(
        readFileSync(
          new URL(
            `../content/reviews/learning-path-reviewer-${id}-2026-10-11.json`,
            import.meta.url,
          ),
          "utf8",
        ),
      ) as Review,
  );
}
export function learningPathRedFlags() {
  const flags: Array<{ id: string; reason: string }> = [];
  for (const concept of CONCEPTS) {
    if (
      concept.track === "topik-ko" &&
      (concept.title.ja === `${concept.title.ko}（韓国語）` ||
        concept.title.en === `${concept.title.ko} (Korean)`)
    )
      flags.push({
        id: concept.key,
        reason: "untranslated concept title placeholder",
      });
    const pair = ITEMS.filter((i) => i.concept_key === concept.key);
    if (
      concept.section === "listening" &&
      pair.length === 2 &&
      pair[0]!.audio_script === pair[1]!.audio_script
    )
      flags.push({
        id: concept.key,
        reason: "identical listening script in paired contexts",
      });
    if (concept.track === "jlpt-ja" && concept.section === "vocab")
      for (const item of pair)
        if (
          item.choices?.[item.answer_index!]?.ja === concept.lookup.value &&
          item.question.ja.includes(concept.lookup.value)
        )
          flags.push({
            id: item.id,
            reason: "Japanese vocabulary choice repeats the queried lemma",
          });
  }
  return flags;
}
export function learningPathReadiness(
  db: DB,
  reviews: Review[] = learningPathReviews(),
) {
  const structure = buildLearningPathQualityReport();
  const source_evidence_sha256 = createHash("sha256")
    .update(readFileSync(latestLearningPathSource))
    .digest("hex");
  const lookup_failures: Array<{ key: string; reason: string }> = [];
  for (const concept of CONCEPTS)
    try {
      resolveLearningConcept(db, concept);
    } catch (error) {
      lookup_failures.push({ key: concept.key, reason: String(error) });
    }
  const expected = new Set(ITEMS.map((item) => item.id));
  const independent_reviews = reviews.map((review) => {
    const approved = review.items.filter(
      (item) => item.status === "approved",
    ).length;
    const complete =
      review.items.length === expected.size &&
      new Set(review.items.map((i) => i.id)).size === expected.size &&
      review.items.every((i) => expected.has(i.id));
    const hash_matches =
      review.draft_sha256 === structure.draft_sha256 &&
      review.source_evidence_sha256 === source_evidence_sha256;
    return {
      reviewer_id: review.reviewer_id,
      approved,
      rejected: review.items.length - approved,
      concept_findings: review.concept_findings?.length ?? 0,
      complete,
      hash_matches,
      passed:
        review.passed &&
        complete &&
        hash_matches &&
        approved === expected.size &&
        !review.concept_findings?.length,
    };
  });
  const distinct =
    reviews.length === 2 &&
    new Set(reviews.map((r) => r.reviewer_id)).size === 2;
  const blockers: string[] = [];
  const automated_red_flags = learningPathRedFlags();
  if (!structure.passed) blockers.push("structure");
  if (automated_red_flags.length)
    blockers.push("deterministic content regressions");
  if (lookup_failures.length) blockers.push("strict-level concept lookup");
  if (!distinct || independent_reviews.some((r) => !r.passed))
    blockers.push("two independent reviews on the current draft and source");
  // Ready is a CONTENT prerequisite, not permission to skip G0–G4/Preview/backup/approval.
  return {
    content_ready: blockers.length === 0,
    publication: "blocked until content readiness and release gates",
    draft_sha256: structure.draft_sha256,
    source_evidence_sha256,
    structure,
    automated_red_flags,
    lookup_failures,
    independent_reviews,
    blockers,
  };
}
