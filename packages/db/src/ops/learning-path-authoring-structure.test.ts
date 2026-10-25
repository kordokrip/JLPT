import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {N3_ITEMS,N3_CONCEPT_CUES} from "../content/learning-path-v4-2026-10-11/n3-authored.js";
import {TOPIK34_ITEMS,TOPIK34_CONCEPT_CUES} from "../content/learning-path-v4-2026-10-11/topik34-authored.js";
import {authoringStructureFailures} from "./learning-path-authoring-structure.js";
import type {SelectedConcept} from "./learning-path-v2-contract.js";
const inventory=JSON.parse(readFileSync(new URL("../content/learning-path-v4-2026-10-11/selected-concepts.json",import.meta.url),"utf8")) as {concepts:SelectedConcept[]};
const concepts=inventory.concepts.filter(concept=>concept.track==="jlpt-ja"&&concept.level==="N3");
test("N3 authorship is 40 structured drafts with 20 cues, not independent quality approval",()=>{
  assert.equal(N3_ITEMS.length,40);assert.deepEqual(authoringStructureFailures(N3_ITEMS,concepts,N3_CONCEPT_CUES),[]);
});
test("wrong level, translated test choices, repeated audio and missing cue are detected",()=>{
  const items=structuredClone(N3_ITEMS);items[0]!.level="N2";items[0]!.choices![0]!.en="Translated answer";
  const audio=items.filter(item=>item.section==="listening");audio[1]!.audio_script=audio[0]!.audio_script!;
  const cues={...N3_CONCEPT_CUES};delete cues[concepts[0]!.key];
  const failures=authoringStructureFailures(items,concepts,cues).join("\n");
  assert.match(failures,/level\/section mismatch/);assert.match(failures,/test choices translated/);assert.match(failures,/repeated listening/);assert.match(failures,/cue key coverage/);
});
test("TOPIK 3/4 drafts contain 80 original-situation items and concrete writing samples, not approvals",()=>{
  const selected=inventory.concepts.filter(concept=>concept.track==="topik-ko"&&["3","4"].includes(concept.level));
  assert.equal(TOPIK34_ITEMS.length,80);
  assert.deepEqual(authoringStructureFailures(TOPIK34_ITEMS,selected,TOPIK34_CONCEPT_CUES),[]);
  const writing=TOPIK34_ITEMS.filter(item=>item.section==="writing");
  assert.equal(writing.length,16);assert.equal(new Set(writing.map(item=>item.sample!.ko)).size,16);
});
