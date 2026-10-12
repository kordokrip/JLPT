// 강성호 2026-10-11: v4 첫 작성 배치120개의 자동 구조만 기록한다. 전체은행/검수/DB staging/공개로 확대하지 않는다.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { N3_ITEMS, N3_CONCEPT_CUES } from "../content/learning-path-v4-2026-10-11/n3-authored.js";
import { TOPIK34_ITEMS, TOPIK34_CONCEPT_CUES } from "../content/learning-path-v4-2026-10-11/topik34-authored.js";
import { authoringStructureFailures } from "./learning-path-authoring-structure.js";
import { sha256, type SelectedConcept } from "./learning-path-v2-contract.js";
const inventory=JSON.parse(readFileSync(new URL("../content/learning-path-v4-2026-10-11/selected-concepts.json",import.meta.url),"utf8")) as {concepts:SelectedConcept[]};
const concepts=inventory.concepts.filter(concept=>concept.track==="jlpt-ja"?concept.level==="N3":["3","4"].includes(concept.level));
const items=[...N3_ITEMS,...TOPIK34_ITEMS],cues={...N3_CONCEPT_CUES,...TOPIK34_CONCEPT_CUES};
const flags=authoringStructureFailures(items,concepts,cues);
const report={generated_at:new Date().toISOString(),version:"learning-path-v4-2026-10-11",scope:"first-authorship-cohort-structure-only",
  snapshot_sha256:sha256(JSON.stringify({concepts,items,cues})),items:items.length,concepts:concepts.length,writing:items.filter(item=>item.section==="writing").length,
  listening:items.filter(item=>item.section==="listening").length,expected_full_bank_items:440,remaining_items:440-items.length,
  structure_passed:flags.length===0,automated_structure_flags:flags,independent_review_approvals:0,full_bank_source_complete:false,
  lessons_materialized_in_db:0,full_bank_ready:false,publication:"draft-unpublished",remote_writes:0};
const output=new URL("../../../../.artifacts/learning-path-v4-2026-10-11/first-authoring-cohort.json",import.meta.url);
mkdirSync(new URL(".",output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify(report));
if(flags.length)process.exitCode=1;
