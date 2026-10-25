import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAuthoredPatchSnapshot } from "./learning-content-patch-snapshot.js";
import { sha256 } from "./learning-path-v4-freeze.js";
test("executed patch and recorded hash use the same bytes instead of a cached module",()=>{
  const first=Buffer.from("export const JLPT_V5_ITEM_PATCHES:Record<string,unknown>={x:{question:'first'}}; export const JLPT_V5_CUE_PATCHES={};");
  const changed=Buffer.from(first.toString().replace("first","changed"));
  const a=evaluateAuthoredPatchSnapshot(first,"JLPT"), b=evaluateAuthoredPatchSnapshot(changed,"JLPT");
  assert.equal(a.source_sha256,sha256(first)); assert.equal(b.source_sha256,sha256(changed));
  assert.notDeepEqual(a.items,b.items); assert.notEqual(a.payload_sha256,b.payload_sha256);
  assert.throws(()=>evaluateAuthoredPatchSnapshot(Buffer.from("import fs from 'node:fs'; export const JLPT_V5_ITEM_PATCHES={};export const JLPT_V5_CUE_PATCHES={};"),"JLPT"),/runtime imports/);
  for(const external of ["await import/*comment*/('node:path');","export {join} from 'node:path';","process.getBuiltinModule('fs');"]) assert.throws(()=>evaluateAuthoredPatchSnapshot(Buffer.from(`${external} export const JLPT_V5_ITEM_PATCHES={};export const JLPT_V5_CUE_PATCHES={};`),"JLPT"),/self-contained/);
});
