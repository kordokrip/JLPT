// 강성호 2026-10-11: v4 동결 cohort의 구조·출처·독립 검토 gate를 읽기 전용으로 다시 계산한다.
import { evidenceFailures, type IndependentReview } from "./learning-path-evidence.js";
import { fullAuthoringFailures, fullSourceFailures, LEARNING_PATH_CONTENT_SOURCE, selectedConceptIdentity, type FullBankIntake } from "./learning-path-full-contract.js";
import type { SelectedConcept } from "./learning-path-v2-contract.js";
import { sha256, type FrozenLearningPathV4, type TrustedSourceBinding } from "./learning-path-v4-freeze.js";
import { revisionContractFailures } from "./learning-path-revision-contract.js";

export type LearningPathV4ReadinessInput = {
  bundle: FrozenLearningPathV4;
  sourceBytes: Buffer;
  inventoryBytes: Buffer;
  publicSelectionBytes: Buffer;
  trustedSourceBinding: TrustedSourceBinding;
  reviews: IndependentReview[];
};

export type LearningPathV4ReadinessReport = {
  scope: "full-bank-only";
  publication: "draft-unpublished";
  version: string;
  bundle: string;
  counts: { concepts: number; items: number; lessons: number; reviews: number; distinct_reviewer_ids: number; review_item_ids: Record<string, number> };
  hashes: { draft_sha256: string; source_evidence_sha256: string; concept_inventory_sha256: string; public_selection_sha256: string };
  full_bank_ready: boolean;
  failures: string[];
  remote_writes: 0;
};

function sourceFrom(bytes: Buffer): (FullBankIntake & { full_bank_source_complete?: boolean }) | undefined {
  try { return JSON.parse(bytes.toString("utf8")) as FullBankIntake & { full_bank_source_complete?: boolean }; }
  catch { return undefined; }
}

/** Pure readiness evaluation. It neither creates review approvals nor changes a cohort. */
export function learningPathV4Readiness(input: LearningPathV4ReadinessInput): LearningPathV4ReadinessReport {
  const failures: string[] = [];
  const source = sourceFrom(input.sourceBytes);
  const selectionSHA = sha256(input.publicSelectionBytes);
  const selected = (JSON.parse(input.publicSelectionBytes.toString("utf8")) as { concepts: SelectedConcept[] }).concepts;
  if (selected.length !== 220 || input.bundle.concepts.length !== selected.length || selected.some((concept, index) => !input.bundle.concepts[index] || selectedConceptIdentity(concept) !== selectedConceptIdentity(input.bundle.concepts[index]!))) failures.push("frozen concept identity differs from original public selection");
  if (!source) failures.push("frozen source must be valid UTF-8 JSON");
  if (input.trustedSourceBinding.trusted !== true || input.trustedSourceBinding.content_source_sha !== LEARNING_PATH_CONTENT_SOURCE) failures.push("trusted immutable content-source binding required");
  if (selectionSHA !== input.bundle.metadata.public_selection_sha256 || selectionSHA !== input.trustedSourceBinding.inventory_sha256) failures.push("public selection raw bytes/hash mismatch");
  if (!source || source.scope !== "full-bank-only" || source.full_bank_source_complete !== true) failures.push("source must declare complete full-bank-only coverage");
  if (source) failures.push(...fullSourceFailures(input.bundle.concepts, source, input.trustedSourceBinding));
  failures.push(...revisionContractFailures(input.bundle,source));
  failures.push(...fullAuthoringFailures(input.bundle.concepts, input.bundle.items, input.bundle.lessons));
  failures.push(...evidenceFailures(input.bundle, input.sourceBytes, input.inventoryBytes, input.reviews, "full-bank-only"));

  const reviewItemIDs = Object.fromEntries(input.reviews.map(review => [review.reviewer_id, new Set(review.items.map(item => item.id)).size]));
  return {
    scope: "full-bank-only",
    publication: "draft-unpublished",
    version: input.bundle.version,
    bundle: input.bundle.bundle,
    counts: { concepts: input.bundle.concepts.length, items: input.bundle.items.length, lessons: input.bundle.lessons.length, reviews: input.reviews.length, distinct_reviewer_ids: new Set(input.reviews.map(review => review.reviewer_id)).size, review_item_ids: reviewItemIDs },
    hashes: { draft_sha256: input.bundle.draft_sha256, source_evidence_sha256: input.bundle.source_evidence_sha256, concept_inventory_sha256: input.bundle.concept_inventory_sha256, public_selection_sha256: input.bundle.metadata.public_selection_sha256 },
    full_bank_ready: failures.length === 0,
    failures,
    remote_writes: 0,
  };
}
