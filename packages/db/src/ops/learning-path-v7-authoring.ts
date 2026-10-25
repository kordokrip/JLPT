// 강성호 2026-10-11: v6 실패 동결과 두 review bytes를 보존하고, 명시 v7 repairs만 결합한다.
import { readFileSync } from "node:fs";
import { buildLearningPathLessons, fullAuthoringFailures } from "./learning-path-full-contract.js";
import { sha256, type FrozenLearningPathV4 } from "./learning-path-v4-freeze.js";
import type { IndependentReview } from "./learning-path-evidence.js";
import { answerPositionFailures } from "./learning-path-answer-position.js";
import { readAuthoredPatchSnapshot } from "./learning-content-patch-snapshot.js";

const v6=new URL("../content/learning-path-v6-2026-10-11/frozen-cohort-01/",import.meta.url);
const reviews=["a","b"].map(id=>new URL(`../content/reviews/learning-path-v6-full-reviewer-${id}-cohort01-2026-10-11.json`,import.meta.url));
const reviewSHA=["8957bfa431d605946112c983af0e7765cd97936126d0eee0d459e6dc95463705","bbd423cb9af805472e92e49944e600c9462e4b78f901dee18abdf1fd0f33d1a5"];

export function fullV7Authoring() {
  const prior=JSON.parse(readFileSync(new URL("bundle.json",v6),"utf8")) as FrozenLearningPathV4, {draft_sha256,source_evidence_sha256,concept_inventory_sha256,...payload}=prior;
  if(sha256(JSON.stringify(payload))!==draft_sha256||sha256(readFileSync(new URL("source.json",v6)))!==source_evidence_sha256||sha256(readFileSync(new URL("concepts.json",v6)))!==concept_inventory_sha256) throw new Error("preserved v6 frozen baseline has changed");
  const patch=readAuthoredPatchSnapshot(new URL("../content/learning-path-v7-2026-10-11/revisions.ts",import.meta.url),"JLPT","V7"), patches=patch.items, cues=patch.cues, rejected=new Set<string>();
  for(const [index,path] of reviews.entries()) { const bytes=readFileSync(path); if(sha256(bytes)!==reviewSHA[index]) throw new Error("preserved v6 failed review bytes have changed"); const review=JSON.parse(bytes.toString()) as IndependentReview & {concept_findings?:{concept_key?:string;concept_keys?:string[]}[]}; if(review.draft_sha256!==prior.draft_sha256||review.source_evidence_sha256!==prior.source_evidence_sha256||review.concept_inventory_sha256!==prior.concept_inventory_sha256||review.items.length!==440||new Set(review.items.map(i=>i.id)).size!==440) throw new Error("revision requires complete, matching preserved v6 reviews"); for(const item of review.items.filter(i=>i.status!=="approved")) rejected.add(item.id); for(const finding of review.concept_findings??[]) for(const key of finding.concept_keys??(finding.concept_key?[finding.concept_key]:[])) if(!cues[key]) throw new Error(`missing explicit v7 cue repair: ${key}`); }
  if(rejected.size!==2||Object.keys(patches).length!==2||Object.keys(cues).length!==0||[...rejected].some(id=>!patches[id])||Object.keys(patches).some(id=>!rejected.has(id))) throw new Error("v7 repairs must exactly cover the two-item v6 review union and no cues");
  for(const id of Object.keys(patches)) if(!prior.items.some(i=>i.id===id)) throw new Error(`unknown repair item: ${id}`);
  const concepts=prior.concepts;
  const items=prior.items.map(item=>{const edit=patches[item.id]??{}; if(Object.keys(edit).some(key=>key!=="rubric"&&key!=="explanation")||["id","track","level","section","concept_key","answer_index","question","choices","sample","audio_script"].some(key=>key in edit&&edit[key as keyof typeof edit]!==item[key as keyof typeof item])) throw new Error(`repair changes protected v7 content: ${item.id}`); return {...item,...edit,id:item.id.replace(/^lp6-/u,"lp7-")};});
  const lessons=buildLearningPathLessons(concepts,items,"lp7"), failures=[...fullAuthoringFailures(concepts,items,lessons),...answerPositionFailures(items)]; if(failures.length) throw new Error(failures.join("\n"));
  return {concepts,items,lessons,patch_file_sha256:{"revisions.ts":patch.source_sha256},patch_payload_sha256:{V7:patch.payload_sha256},concept_inventory_sha256:sha256(readFileSync(new URL("../content/learning-path-v4-2026-10-11/selected-concepts.json",import.meta.url)))};
}
