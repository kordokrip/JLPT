// 강성호 2026-10-11: 대표 검수와 전체 440문항 공개 조건을 분리하며 hash/범위/정답/독립성을 모두 확인한다.
import { readFileSync } from "node:fs";
import { sha256, representativeStructureFailures, type SelectedConcept } from "./learning-path-v2-contract.js";
import type { DraftItem } from "../content/learning-path-2026-10-11/data.js";
type Item = DraftItem & { context_tag: string };
export type DraftEvidence = {
  scope: string; publication: string; version: string;
  draft_sha256: string; source_evidence_sha256: string; concept_inventory_sha256: string;
  concepts: SelectedConcept[]; items: Item[]; lessons: unknown[];
  [key: string]: unknown;
};
export type IndependentReview = {
  reviewer_id: string; scope: string; passed: boolean; full_bank_approval: boolean;
  draft_sha256: string; source_evidence_sha256: string; concept_inventory_sha256: string;
  items: {id: string; status: string; answer_index?: number; explanation_consistent: boolean}[];
  concept_findings?: unknown[]; screen_contract_findings?: unknown[]; lesson_findings?: unknown[];
};
export const currentRepresentativeDirectory = new URL("../content/learning-path-v3-2026-10-11/", import.meta.url);
export function currentRepresentativeEvidence() {
  const bundle = JSON.parse(readFileSync(new URL("representatives.json", currentRepresentativeDirectory), "utf8")) as DraftEvidence;
  const source = readFileSync(new URL("prototype-intake.json", currentRepresentativeDirectory));
  const inventory = readFileSync(new URL("concepts.json", currentRepresentativeDirectory));
  const reviews = ["a","b"].map(id => JSON.parse(readFileSync(new URL(`../content/reviews/learning-path-v3-representatives-reviewer-${id}-2026-10-11.json`, import.meta.url), "utf8")) as IndependentReview);
  return { bundle, source, inventory, reviews };
}
export function evidenceFailures(bundle: DraftEvidence, source: Buffer, inventory: Buffer, reviews: IndependentReview[], requiredScope: "representative-contract-only" | "full-bank-only"): string[] {
  const failures: string[] = [];
  const {draft_sha256,source_evidence_sha256,concept_inventory_sha256,...payload} = bundle;
  if (sha256(JSON.stringify(payload)) !== draft_sha256 || sha256(source) !== source_evidence_sha256 || sha256(inventory) !== concept_inventory_sha256) failures.push("current immutable draft/source/inventory hash mismatch");
  if (bundle.scope !== requiredScope) failures.push(`scope must be ${requiredScope}; representative approval never means 440 approval`);
  if (bundle.publication !== "draft-unpublished") failures.push("expected unpublished candidate");
  const expectedIds = new Set(bundle.items.map(item=>item.id));
  if (expectedIds.size !== bundle.items.length) failures.push("duplicate draft item ids");
  const selected=(JSON.parse(inventory.toString()) as {concepts:SelectedConcept[]}).concepts;
  if(new Set(bundle.concepts.map(concept=>concept.key)).size!==bundle.concepts.length||bundle.concepts.some(concept=>JSON.stringify(selected.find(entry=>entry.key===concept.key))!==JSON.stringify(concept)))failures.push("draft concept identity/learning cue differs from frozen inventory");
  if (reviews.length !== 2 || reviews.some(review => typeof review.reviewer_id !== "string" || !review.reviewer_id.trim() || review.reviewer_id !== review.reviewer_id.trim()) || new Set(reviews.map(review => typeof review.reviewer_id === "string" ? review.reviewer_id.trim() : "")).size !== 2) failures.push("exactly two distinct independent reviewers required");
  for (const review of reviews) {
    if (review.passed !== true || review.scope !== requiredScope || review.full_bank_approval !== (requiredScope === "full-bank-only") || review.draft_sha256 !== draft_sha256 || review.source_evidence_sha256 !== source_evidence_sha256 || review.concept_inventory_sha256 !== concept_inventory_sha256 || review.concept_findings?.length || review.screen_contract_findings?.length || review.lesson_findings?.length) failures.push(`review scope/hash/verdict mismatch: ${review.reviewer_id}`);
    if (review.items.length !== bundle.items.length || new Set(review.items.map(item=>item.id)).size !== expectedIds.size || review.items.some(item=>!expectedIds.has(item.id) || item.status !== "approved" || item.explanation_consistent !== true || item.answer_index !== bundle.items.find(draft=>draft.id===item.id)?.answer_index)) failures.push(`review item coverage/independent answer mismatch: ${review.reviewer_id}`);
  }
  const sourceScope = (JSON.parse(source.toString()) as {scope?: string}).scope;
  if (sourceScope !== requiredScope) failures.push("source intake scope does not cover the requested bank");
  if (requiredScope === "representative-contract-only") {
    failures.push(...representativeStructureFailures(bundle.items));
    if (bundle.concepts.length !== 6 || bundle.lessons.length !== 3) failures.push("expected 6 concepts and 3 representative lessons");
  } else {
    if (bundle.items.length !== 440 || bundle.concepts.length !== 220 || bundle.lessons.length !== 220) failures.push("full bank requires 440 items, 220 concepts, 220 lessons");
  }
  return failures;
}
