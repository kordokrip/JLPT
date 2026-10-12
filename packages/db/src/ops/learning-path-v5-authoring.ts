// 강성호 2026-10-11: 불합격 동결 v4를 보존하고 검수 지적에 대응한 별도 v5 패치만 결합한다.
import { readFileSync } from "node:fs";
import { buildLearningPathLessons, fullAuthoringFailures } from "./learning-path-full-contract.js";
import { sha256, type FrozenLearningPathV4 } from "./learning-path-v4-freeze.js";
import type { IndependentReview } from "./learning-path-evidence.js";
import { answerPositionFailures } from "./learning-path-answer-position.js";
import { readAuthoredPatchSnapshot } from "./learning-content-patch-snapshot.js";
const v4=new URL("../content/learning-path-v4-2026-10-11/frozen-cohort-01/",import.meta.url);
const reviews=["a","b"].map(id=>new URL(`../content/reviews/learning-path-v4-full-reviewer-${id}-cohort01-2026-10-11.json`,import.meta.url));
const preservedReviewSHA=["9598342a7688ee2878c9f6b5ed5cb117b3e1121ee66ccfd68b5f597d511c47ed","f3c7d9a76d8728b53843e5b061e7bf9920d7080da64fa36fb5974ff662e698be"];
export function fullV5Authoring() {
  const prior=JSON.parse(readFileSync(new URL("bundle.json",v4),"utf8")) as FrozenLearningPathV4;
  const {draft_sha256,source_evidence_sha256,concept_inventory_sha256,...payload}=prior;
  if(draft_sha256!=="b51c2934f9f80f4939f28ab4ca7c3bd5839274250cfd2343ce7cda21560c21c1"||sha256(JSON.stringify(payload))!==draft_sha256||sha256(readFileSync(new URL("source.json",v4)))!==source_evidence_sha256||sha256(readFileSync(new URL("concepts.json",v4)))!==concept_inventory_sha256) throw new Error("preserved v4 frozen baseline has changed");
  const jlpt=readAuthoredPatchSnapshot(new URL("../content/learning-path-v5-2026-10-11/jlpt-revisions.ts",import.meta.url),"JLPT");
  const topik=readAuthoredPatchSnapshot(new URL("../content/learning-path-v5-2026-10-11/topik-revisions.ts",import.meta.url),"TOPIK");
  const patches={...jlpt.items,...topik.items}, cues={...jlpt.cues,...topik.cues};
  for(const [index,path] of reviews.entries()) {
    const bytes=readFileSync(path);
    if(sha256(bytes)!==preservedReviewSHA[index]) throw new Error("preserved v4 failed review bytes have changed");
    const review=JSON.parse(bytes.toString("utf8")) as IndependentReview & {concept_findings?:{concept_key?:string;concept_keys?:string[]}[]};
    if(review.draft_sha256!==prior.draft_sha256||review.source_evidence_sha256!==prior.source_evidence_sha256||review.concept_inventory_sha256!==prior.concept_inventory_sha256||review.items.length!==440||new Set(review.items.map(i=>i.id)).size!==440) throw new Error("revision requires complete, matching preserved v4 reviews");
    for(const item of review.items.filter(i=>i.status!=="approved")) if(!patches[item.id]) throw new Error(`missing explicit v5 item repair: ${item.id}`);
    for(const finding of review.concept_findings??[]) for(const key of finding.concept_keys??(finding.concept_key?[finding.concept_key]:[])) if(!cues[key]) throw new Error(`missing explicit v5 cue repair: ${key}`);
  }
  for(const id of Object.keys(patches)) if(!prior.items.some(i=>i.id===id)) throw new Error(`unknown repair item: ${id}`);
  for(const key of Object.keys(cues)) if(!prior.concepts.some(c=>c.key===key)) throw new Error(`unknown repair concept: ${key}`);
  const concepts=prior.concepts.map(c=>({...c,cue:cues[c.key]??c.cue}));
  const contextTags:Record<string,string>={"lp4-n5-listening-4":"computer-help-referral","lp4-n5-kanji_reading-10":"river-fish-observation","lp4-n4-kanji_reading-2":"spring-flower-outing","lp4-n4-kanji_reading-4":"summer-sea-swimming","lp4-n4-kanji_reading-5":"autumn-leaf-outing","lp4-n4-kanji_reading-6":"autumn-school-sports","lp4-n4-kanji_reading-8":"winter-town-snow"};
  const items=prior.items.map(item=> {
    const patch=patches[item.id]??{};
    // Semantic fixes cannot silently change selected concept, track, level, section or balanced answer position.
    if(["id","track","level","section","concept_key","answer_index"].some(key=>key in patch && patch[key as keyof typeof patch]!==item[key as keyof typeof item])) throw new Error(`repair changes protected identity/answer: ${item.id}`);
    return {...item,...patch,context_tag:contextTags[item.id]??item.context_tag,id:item.id.replace(/^lp4-/u,"lp5-")};
  });
  const lessons=buildLearningPathLessons(concepts,items,"lp5");
  const failures=[...fullAuthoringFailures(concepts,items,lessons),...answerPositionFailures(items)];
  if(failures.length) throw new Error(failures.join("\n"));
  return {concepts,items,lessons,patch_file_sha256:{"jlpt-revisions.ts":jlpt.source_sha256,"topik-revisions.ts":topik.source_sha256},patch_payload_sha256:{JLPT:jlpt.payload_sha256,TOPIK:topik.payload_sha256},concept_inventory_sha256:sha256(readFileSync(new URL("../content/learning-path-v4-2026-10-11/selected-concepts.json",import.meta.url)))};
}
