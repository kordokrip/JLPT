import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { answerPositionFailures } from "./learning-path-answer-position.js";
import type { FrozenLearningPathV4 } from "./learning-path-v4-freeze.js";
test("preserved v4 has explicit answer-position explanation defects",()=>{
  const bank=JSON.parse(readFileSync(new URL("../content/learning-path-v4-2026-10-11/frozen-cohort-01/bundle.json",import.meta.url),"utf8")) as FrozenLearningPathV4;
  assert.ok(answerPositionFailures(bank.items).length>0);
  const item=structuredClone(bank.items.find(i=>i.id==="lp4-topik-3-reading-b2-authored-1")!);
  assert.match(answerPositionFailures([item]).join("\n"),/ordinal mismatch/);
  item.explanation={ko:"수영장 물을 교체하여 이용할 수 없습니다.",ja:"プールの水を交換するため利用できません。",en:"The pool is closed while its water is replaced."};
  assert.deepEqual(answerPositionFailures([item]),[]);
});
