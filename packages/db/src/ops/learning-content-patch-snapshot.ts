// 강성호 2026-10-11: 같은 로컬 TS bytes를 해시하고 실행해 모듈 캐시와 디스크 사이 증적 불일치를 막는다.
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { spawnSync } from "node:child_process";
import ts from "typescript";
import { sha256 } from "./learning-path-v4-freeze.js";
import type { DraftItem } from "../content/learning-path-2026-10-11/data.js";
export function evaluateAuthoredPatchSnapshot(bytes:Buffer,prefix:"JLPT"|"TOPIK",revision:"V5"|"V6"|"V7"="V5") {
  const code=stripTypeScriptTypes(bytes.toString("utf8"),{mode:"strip"});
  const parsed=ts.createSourceFile("authored-patch.mjs",code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  function check(node:ts.Node) {
    if(ts.isImportDeclaration(node)||ts.isImportEqualsDeclaration(node)||node.kind===ts.SyntaxKind.ImportKeyword||(ts.isExportDeclaration(node)&&node.moduleSpecifier)|| (ts.isIdentifier(node)&&["process","global","globalThis","require","fetch","eval","Function"].includes(node.text))) throw new Error("authored patches must be self-contained; runtime imports and external capabilities are not allowed");
    ts.forEachChild(node,check);
  }
  check(parsed);
  const names=revision==="V5"?{items:`${prefix}_V5_ITEM_PATCHES`,cues:`${prefix}_V5_CUE_PATCHES`}:revision==="V6"?{items:"V6_ITEM_REVISIONS",cues:"V6_CUE_REVISIONS"}:{items:"V7_ITEM_REVISIONS",cues:"V7_CUE_REVISIONS"};
  const child=spawnSync(process.execPath,["--input-type=module"],{input:`${code}\nprocess.stdout.write(JSON.stringify({items:${names.items},cues:${names.cues}}));`,encoding:"utf8",maxBuffer:4*1024*1024,timeout:10000,env:{PATH:process.env.PATH}});
  if(child.status!==0||child.error) throw new Error(`authored patch snapshot evaluation failed for ${prefix}`);
  const data=JSON.parse(child.stdout) as {items:Record<string,Partial<DraftItem>>;cues:Record<string,{ko:string;ja:string;en:string}>};
  return {...data,source_sha256:sha256(bytes),payload_sha256:sha256(JSON.stringify(data))};
}
export function readAuthoredPatchSnapshot(path:URL,prefix:"JLPT"|"TOPIK",revision:"V5"|"V6"|"V7"="V5") { return evaluateAuthoredPatchSnapshot(readFileSync(path),prefix,revision); }
