// 강성호 2026-10-11: 승인된 대표의 작성 계약을 새 전체은행 작업공간으로 옮기되 이전 승인을 상속하지 않는다.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const parent = new URL("../content/learning-path-v3-2026-10-11/", import.meta.url);
const target = new URL("../content/learning-path-v4-2026-10-11/", import.meta.url);
const output = new URL("selected-concepts.json", target);
if (existsSync(output)) throw new Error("Existing authoring inventory must not be overwritten");
const prior = JSON.parse(readFileSync(new URL("representatives.json", parent), "utf8"));
for (const reviewer of ["a","b"]) {
  const review = JSON.parse(readFileSync(new URL(`../content/reviews/learning-path-v3-representatives-reviewer-${reviewer}-2026-10-11.json`, import.meta.url), "utf8"));
  if (!review.passed || review.scope !== "representative-contract-only" || review.full_bank_approval !== false || review.draft_sha256 !== prior.draft_sha256 || review.source_evidence_sha256 !== prior.source_evidence_sha256 || review.items.length !== 12 || review.items.some((item: {status:string}) => item.status !== "approved")) throw new Error("Both representative-only approvals are required to proceed to authorship");
}
const inventoryBytes = readFileSync(new URL("concepts.json", parent));
const inventory = JSON.parse(inventoryBytes.toString());
inventory.version = "learning-path-v4-2026-10-11";
inventory.supersedes_inventory_sha256 = createHash("sha256").update(inventoryBytes).digest("hex");
inventory.concepts.forEach((concept: {key:string}) => {concept.key = concept.key.replace(/^lp3-/,"lp4-");});
inventory.status = "authoring-only; full-bank intake/reviews/staging not completed";
mkdirSync(target, {recursive:true});
writeFileSync(output, JSON.stringify(inventory, null, 2)+"\n");
const prototype = {scope:"authorship-reference-only", prior_representative_draft_sha256:prior.draft_sha256, inherited_approval:false,
  items:JSON.parse(JSON.stringify(prior.items).replaceAll("lp3-","lp4-"))};
writeFileSync(new URL("authorship-reference.json",target),JSON.stringify(prototype,null,2)+"\n");
console.log(JSON.stringify({concepts:inventory.concepts.length,publication:"draft-unpublished",review_approval_inherited:false}));
