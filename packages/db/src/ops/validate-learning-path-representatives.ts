// 강성호 2026-10-11: 같은 hash의 실제 두 대표 리뷰만 portable validator에 전달한다. 440문항 승인을 생성하지 않는다.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { currentRepresentativeEvidence, evidenceFailures } from "./learning-path-evidence.js";
import { sha256 } from "./learning-path-v2-contract.js";
const {bundle,source,inventory,reviews}=currentRepresentativeEvidence();
const failures=evidenceFailures(bundle,source,inventory,reviews,"representative-contract-only");
if(failures.length)throw new Error(failures.join("\n"));
const bank={bank_id:"learning-path-representatives-only",bank_version:bundle.version,scope:bundle.scope,
  items:bundle.items.map(item=>({id:item.id,section:`${item.track}/${item.level}/${item.section}`,question_type:"choice",authorship:"self-authored",source_evidence_hash:bundle.source_evidence_sha256,
    difficulty:{exam:item.track==="jlpt-ja"?"JLPT":"TOPIK",level:item.level},question:item.question,choices:item.choices,answer_index:item.answer_index,explanation:item.explanation,
    reviewers:reviews.map(review=>{const verdict=review.items.find(entry=>entry.id===item.id)!;return {reviewer_id:review.reviewer_id,verdict:verdict.status,answer_index:verdict.answer_index,explanation_consistent:verdict.explanation_consistent};})}))};
const dir=new URL("../../../../.artifacts/learning-path-v3-2026-10-11/representative-quality/",import.meta.url);
mkdirSync(dir,{recursive:true});
const input=new URL("bank.json",dir),output=new URL("validator.json",dir);
writeFileSync(input,JSON.stringify(bank,null,2)+"\n");
const validator=new URL("../../../../.codex/skills/question-bank-quality/scripts/check_question_bank.py",import.meta.url);
const child=spawnSync("python3",[validator.pathname,"--input",input.pathname,"--output",output.pathname,"--max-answer-imbalance","1"],{encoding:"utf8"});
if(child.status!==0)throw new Error(child.stderr||child.stdout||"Representative validator failed");
const report={scope:bundle.scope,items_checked:bundle.items.length,draft_sha256:bundle.draft_sha256,source_evidence_sha256:bundle.source_evidence_sha256,validator_report_sha256:sha256(readFileSync(output)),reviewers:reviews.map(review=>review.reviewer_id),passed:true,full_bank_approval:false,publication:"draft-unpublished"};
writeFileSync(new URL("ledger.json",dir),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report));
