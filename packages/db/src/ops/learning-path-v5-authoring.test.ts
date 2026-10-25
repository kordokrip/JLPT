import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fullV5Authoring } from "./learning-path-v5-authoring.js";
import { writeFrozenLearningPathV5 } from "./freeze-learning-path-v5.js";
import { answerPositionFailures } from "./learning-path-answer-position.js";
import { sha256, type FrozenLearningPathV4 } from "./learning-path-v4-freeze.js";
const base=new URL("../content/learning-path-v4-2026-10-11/frozen-cohort-01/",import.meta.url);
test("v5 repairs union coverage while preserving concept/level/answer position and immutable v4",()=>{
  const priorBytes=readFileSync(new URL("bundle.json",base)), prior=JSON.parse(priorBytes.toString()) as FrozenLearningPathV4;
  const revised=fullV5Authoring();
  assert.equal(revised.items.length,440);assert.equal(revised.concepts.length,220);assert.equal(revised.lessons.length,220);
  assert.deepEqual(answerPositionFailures(revised.items),[]);
  revised.items.forEach((item,index)=>{
    assert.equal(item.id,prior.items[index]!.id.replace(/^lp4-/u,"lp5-"));
    for(const key of ["track","level","concept_key","answer_index"] as const) assert.equal(item[key],prior.items[index]![key]);
  });
  assert.deepEqual(readFileSync(new URL("bundle.json",base)),priorBytes);
});
test("v5 writer creates new draft/source/inventory hashes without changing acquisition or granting review",()=>{
  const priorSourceBytes=readFileSync(new URL("source.json",base)), prior=JSON.parse(readFileSync(new URL("bundle.json",base),"utf8")) as FrozenLearningPathV4;
  const output=join(mkdtempSync(join(tmpdir(),"lp5-freeze-test-")),"cohort");
  const frozen=writeFrozenLearningPathV5(output), sourceBytes=readFileSync(join(output,"source.json"));
  const source=JSON.parse(sourceBytes.toString()), earlier=JSON.parse(priorSourceBytes.toString());
  assert.equal(frozen.version,"lp5-2026-10-11");assert.equal(frozen.publication,"draft-unpublished");
  assert.notEqual(frozen.draft_sha256,prior.draft_sha256);assert.notEqual(frozen.source_evidence_sha256,prior.source_evidence_sha256);assert.notEqual(frozen.concept_inventory_sha256,prior.concept_inventory_sha256);
  assert.equal(frozen.source_evidence_sha256,sha256(sourceBytes));
  assert.deepEqual(source.records,earlier.records);assert.equal(source.revision.acquisition_reused,true);
  assert.deepEqual(readFileSync(new URL("source.json",base)),priorSourceBytes);
  assert.throws(()=>writeFrozenLearningPathV5(output),/EEXIST/);
});
