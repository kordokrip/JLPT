// 강성호 2026-10-11: v5 실패 동결과 두 review bytes를 보존하고, 명시 v6 repairs만 결합한다.
import { readFileSync } from "node:fs";
import { buildLearningPathLessons, fullAuthoringFailures } from "./learning-path-full-contract.js";
import { sha256, type FrozenLearningPathV4 } from "./learning-path-v4-freeze.js";
import type { IndependentReview } from "./learning-path-evidence.js";
import { answerPositionFailures } from "./learning-path-answer-position.js";
import { readAuthoredPatchSnapshot } from "./learning-content-patch-snapshot.js";
const v5=new URL("../content/learning-path-v5-2026-10-11/frozen-cohort-01/",import.meta.url);
const reviews=["a","b"].map(id=>new URL(`../content/reviews/learning-path-v5-full-reviewer-${id}-cohort01-2026-10-11.json`,import.meta.url));
const reviewSHA=["7ebacd6b3af85daea52b17a3f461d30c3f1e06be95e71e6b47095a3bd55de2b2","2b907fa58324164872c36fe8c034969c872e5fe72dc2c9f39b977eee1a4ad450"];
export function fullV6Authoring() {
  const prior=JSON.parse(readFileSync(new URL("bundle.json",v5),"utf8")) as FrozenLearningPathV4, {draft_sha256,source_evidence_sha256,concept_inventory_sha256,...payload}=prior;
  if(sha256(JSON.stringify(payload))!==draft_sha256||sha256(readFileSync(new URL("source.json",v5)))!==source_evidence_sha256||sha256(readFileSync(new URL("concepts.json",v5)))!==concept_inventory_sha256) throw new Error("preserved v5 frozen baseline has changed");
  const patch=readAuthoredPatchSnapshot(new URL("../content/learning-path-v6-2026-10-11/revisions.ts",import.meta.url),"JLPT","V6");
  const patches=patch.items, cues=patch.cues;
  for(const [index,path] of reviews.entries()) { const bytes=readFileSync(path); if(sha256(bytes)!==reviewSHA[index]) throw new Error("preserved v5 failed review bytes have changed"); const review=JSON.parse(bytes.toString()) as IndependentReview & {concept_findings?:{concept_key?:string;concept_keys?:string[]}[]}; if(review.draft_sha256!==prior.draft_sha256||review.source_evidence_sha256!==prior.source_evidence_sha256||review.concept_inventory_sha256!==prior.concept_inventory_sha256||review.items.length!==440||new Set(review.items.map(i=>i.id)).size!==440) throw new Error("revision requires complete, matching preserved v5 reviews"); for(const item of review.items.filter(i=>i.status!=="approved")) if(!patches[item.id]) throw new Error(`missing explicit v6 item repair: ${item.id}`); for(const finding of review.concept_findings??[]) for(const key of finding.concept_keys??(finding.concept_key?[finding.concept_key]:[])) if(!cues[key]) throw new Error(`missing explicit v6 cue repair: ${key}`); }
  for(const id of Object.keys(patches)) if(!prior.items.some(i=>i.id===id)) throw new Error(`unknown repair item: ${id}`); for(const key of Object.keys(cues)) if(!prior.concepts.some(c=>c.key===key)) throw new Error(`unknown repair concept: ${key}`);
  const concepts=prior.concepts.map(c=>({...c,cue:cues[c.key]??c.cue}));
  const items=prior.items.map(item=>{const edit=patches[item.id]??{}; if(["id","track","level","section","concept_key","answer_index"].some(key=>key in edit&&edit[key as keyof typeof edit]!==item[key as keyof typeof item])) throw new Error(`repair changes protected identity/answer: ${item.id}`); return {...item,...edit,id:item.id.replace(/^lp5-/u,"lp6-")};});
  const lessons=buildLearningPathLessons(concepts,items,"lp6"), failures=[...fullAuthoringFailures(concepts,items,lessons),...answerPositionFailures(items)]; if(failures.length) throw new Error(failures.join("\n"));
  return {concepts,items,lessons,patch_file_sha256:{"revisions.ts":patch.source_sha256},patch_payload_sha256:{V6:patch.payload_sha256},concept_inventory_sha256:sha256(readFileSync(new URL("../content/learning-path-v4-2026-10-11/selected-concepts.json",import.meta.url)))};
}
