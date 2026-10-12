// 강성호 2026-10-11: 440문항·220개념·220레슨의 자동 작성 검사를 새 증적으로 남긴다. 동결·의미 검수·DB staging 결과가 아니다.
import { mkdirSync } from "node:fs";
import { fullV4Authoring } from "./learning-path-v4-authoring.js";
import { fullAuthoringFailures } from "./learning-path-full-contract.js";
import { sha256 } from "./learning-path-v2-contract.js";
import { writeImmutableIntake } from "./source-intake-checkpoint.js";
const payload = fullV4Authoring(), flags = fullAuthoringFailures(payload.concepts,payload.items,payload.lessons);
const grades = [...new Set(payload.concepts.map(c=>`${c.track}/${c.level}`))].map(grade=>{
  const concepts=payload.concepts.filter(c=>`${c.track}/${c.level}`===grade), items=payload.items.filter(i=>`${i.track}/${i.level}`===grade);
  return {grade,concepts:concepts.length,items:items.length,lessons:payload.lessons.filter(l=>`${l.track}/${l.level}`===grade).length,
    answer_positions:[0,1,2,3].map(answer=>items.filter(i=>i.answer_index===answer).length)};
});
const report = { generated_at:new Date().toISOString(),version:"learning-path-v4-2026-10-11",scope:"full-authorship-structure-only",
  state:"authored-unfrozen-awaiting-source-and-independent-review",authorship_snapshot_sha256:sha256(JSON.stringify(payload)),
  concept_inventory_sha256:payload.concept_inventory_sha256,items:payload.items.length,concepts:payload.concepts.length,lessons:payload.lessons.length,
  listening:payload.items.filter(i=>i.section==="listening").length,writing:payload.items.filter(i=>i.section==="writing").length,grades,
  structure_passed:flags.length===0,automated_structure_flags:flags,remaining_items:0,
  independent_review_approvals:0,full_bank_source_complete:false,full_bank_frozen:false,full_bank_ready:false,
  lessons_materialized_in_db:0,publication:"draft-unpublished",remote_writes:0 };
const output = new URL("../../../../.artifacts/learning-path-v4-2026-10-11/full-authoring-cohort-01.json",import.meta.url);
mkdirSync(new URL(".",output),{recursive:true}); writeImmutableIntake(output,report);
console.log(JSON.stringify(report)); if(flags.length) process.exitCode=1;
