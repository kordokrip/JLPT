import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readdirSync,readFileSync} from "node:fs";
import {buildContentSeedPlan} from "../seed/content-manifest.js";
import {SELECTED_CONCEPTS,REPRESENTATIVE_ITEMS,REPRESENTATIVE_LESSONS,resolveSelectedConcept,representativeStructureFailures} from "./learning-path-v2-contract.js";
function database(){const db=new DatabaseSync(":memory:");const dir=new URL("../../drizzle-v2/",import.meta.url);
  for(const name of readdirSync(dir).filter(n=>/^00\d\d_.*\.sql$/.test(n)).sort())db.exec(readFileSync(new URL(name,dir),"utf8").replaceAll("--> statement-breakpoint",""));
  db.exec(buildContentSeedPlan().statements.join("\n"));return db;}
test("v2 selects exactly 20 real Production-public concepts at each of 11 strict levels",()=>{
  const db=database();try{assert.equal(SELECTED_CONCEPTS.length,220);
    for(const [track,levels] of [["jlpt-ja",["N5","N4","N3","N2","N1"]],["topik-ko",["1","2","3","4","5","6"]]] as const)
      for(const level of levels){const concepts=SELECTED_CONCEPTS.filter(c=>c.track===track&&c.level===level);assert.equal(concepts.length,20);
        for(const c of concepts){const ref=resolveSelectedConcept(db,c);assert.equal(ref.type,c.lookup.type);assert.equal(ref.track,c.track);assert.match(ref.version,/^[a-f0-9]{64}$/);}}
    assert.equal(new Set(SELECTED_CONCEPTS.map(c=>`${c.track}:${c.lookup.type}:${c.canonical_ref.id}`)).size,220);
  }finally{db.close();}});
test("selected concepts never use a same-spelling different-level fallback",()=>{const db=database();try{
  const original=SELECTED_CONCEPTS.find(c=>c.key==="lp2-jlpt-n3-vocab-1")!;
  assert.throws(()=>resolveSelectedConcept(db,{...original,level:"N2"}),/Public strict-level ID lookup failed/);
  assert.throws(()=>resolveSelectedConcept(db,{...original,lookup:{...original.lookup,value:"変更"}}),/Public strict-level ID lookup failed/);
  const changed=structuredClone(original);changed.authoring_context.ko="changed meaning";
  assert.throws(()=>resolveSelectedConcept(db,changed),/Selected concept content changed/);
}finally{db.close();}});
test("representative-only contract is three lessons with distinct contexts and no translated answer stimulus",()=>{
  assert.equal(REPRESENTATIVE_LESSONS.length,3);assert.equal(REPRESENTATIVE_ITEMS.length,12);
  assert.deepEqual(representativeStructureFailures(),[]);
  for(const track of ["jlpt-ja","topik-ko"]){const counts=[0,0,0,0];REPRESENTATIVE_ITEMS.filter(i=>i.track===track).forEach(i=>{const index=i.answer_index!;counts[index]=(counts[index]??0)+1;});
    assert.deepEqual(counts,track==="jlpt-ja"?[1,1,1,1]:[2,2,2,2]);}
  const changed=structuredClone(REPRESENTATIVE_ITEMS);changed[0]!.question.ja="Instruction\ntranslated answer";
  assert.match(representativeStructureFailures(changed).join("\n"),/translated or mismatched stimulus/);
  changed[0]!.choices![0]!.en="translated choice";assert.match(representativeStructureFailures(changed).join("\n"),/translated test choices/);
});
