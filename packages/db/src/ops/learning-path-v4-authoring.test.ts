import test from "node:test";
import assert from "node:assert/strict";
import { fullV4Authoring } from "./learning-path-v4-authoring.js";
import { fullAuthoringFailures } from "./learning-path-full-contract.js";
test("all authored grades provide 440 items / 220 exact cues / 220 lessons without inherited review",()=>{
  const payload=fullV4Authoring();
  assert.equal(payload.items.length,440); assert.equal(payload.concepts.length,220); assert.equal(payload.lessons.length,220);
  assert.deepEqual(fullAuthoringFailures(payload.concepts,payload.items,payload.lessons),[]);
  assert.equal(payload.items.filter(i=>i.section==="listening").length,98);
  assert.equal(payload.items.filter(i=>i.section==="writing").length,48);
});
