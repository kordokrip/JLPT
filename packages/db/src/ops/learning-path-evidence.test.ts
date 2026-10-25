import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { currentRepresentativeEvidence, evidenceFailures } from "./learning-path-evidence.js";
test("v3 representative SHA and two independent 12-item approvals pass only their own scope",()=>{
  const {bundle,source,inventory,reviews}=currentRepresentativeEvidence();
  assert.deepEqual(evidenceFailures(bundle,source,inventory,reviews,"representative-contract-only"),[]);
  assert.match(evidenceFailures(bundle,source,inventory,reviews,"full-bank-only").join("\n"),/440 items/);
});
test("representative approvals cannot be widened by editing a passed flag or reviewer identity",()=>{
  const {bundle,source,inventory,reviews}=currentRepresentativeEvidence();
  const duplicate=structuredClone(reviews);duplicate[1]!.reviewer_id=duplicate[0]!.reviewer_id;
  assert.match(evidenceFailures(bundle,source,inventory,duplicate,"representative-contract-only").join("\n"),/distinct independent/);
  const widened=structuredClone(reviews);widened.forEach(review=>{review.full_bank_approval=true;review.scope="full-bank-only";});
  assert.match(evidenceFailures(bundle,source,inventory,widened,"full-bank-only").join("\n"),/source intake scope/);
  const wrongAnswer=structuredClone(reviews);wrongAnswer[0]!.items[0]!.answer_index=3;
  assert.match(evidenceFailures(bundle,source,inventory,wrongAnswer,"representative-contract-only").join("\n"),/independent answer mismatch/);
});
test("changed content/source and rejected v2 are not accepted as current evidence",()=>{
  const {bundle,source,inventory,reviews}=currentRepresentativeEvidence();
  assert.match(evidenceFailures(bundle,Buffer.from(source.toString()+" "),inventory,reviews,"representative-contract-only").join("\n"),/hash mismatch/);
  const changed=structuredClone(bundle);changed.items[0]!.explanation.ko="changed";
  assert.match(evidenceFailures(changed,source,inventory,reviews,"representative-contract-only").join("\n"),/hash mismatch/);
  for(const id of ["a","b"]){const rejected=JSON.parse(readFileSync(new URL(`../content/reviews/learning-path-v2-representatives-reviewer-${id}-2026-10-11.json`,import.meta.url),"utf8"));assert.equal(rejected.passed,false);}
});
test("review verdicts must be literal booleans and reviewer IDs must be nonblank canonical identities",()=>{
  const {bundle,source,inventory,reviews}=currentRepresentativeEvidence();
  const stringVerdict=structuredClone(reviews);
  (stringVerdict[0] as unknown as {passed:string}).passed="false";
  assert.match(evidenceFailures(bundle,source,inventory,stringVerdict,"representative-contract-only").join("\n"),/verdict mismatch/);
  const stringConsistency=structuredClone(reviews);
  (stringConsistency[0]!.items[0] as unknown as {explanation_consistent:string}).explanation_consistent="false";
  assert.match(evidenceFailures(bundle,source,inventory,stringConsistency,"representative-contract-only").join("\n"),/independent answer mismatch/);
  for(const identity of ["", "   ", ` ${reviews[0]!.reviewer_id}`]) {
    const invalid=structuredClone(reviews);invalid[0]!.reviewer_id=identity;
    assert.match(evidenceFailures(bundle,source,inventory,invalid,"representative-contract-only").join("\n"),/distinct independent/);
  }
});
test("unresolved lesson findings cannot be hidden behind a passed flag",()=>{
  const {bundle,source,inventory,reviews}=currentRepresentativeEvidence();
  const invalid=structuredClone(reviews);invalid[0]!.lesson_findings=[{reason:"unresolved concept/question meaning mismatch"}];
  assert.match(evidenceFailures(bundle,source,inventory,invalid,"representative-contract-only").join("\n"),/verdict mismatch/);
});
