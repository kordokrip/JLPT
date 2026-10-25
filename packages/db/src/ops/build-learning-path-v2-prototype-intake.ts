// 강성호 2026-10-11: 대표 계약의 출처만 별도 동결한다. 재사용 사전 증적의 취득시각은 바꾸지 않고 440문항 전체 intake로 주장하지 않는다.
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {existsSync,readFileSync,writeFileSync} from "node:fs";
const output=new URL("../content/learning-path-v2-2026-10-11/prototype-intake.json",import.meta.url);
if(existsSync(output))throw new Error("Prototype intake already frozen; create a new version");
const original=readFileSync(new URL("../content/learning-path-source-intake-2026-10-11-v2.json",import.meta.url));
const parent=JSON.parse(original.toString()) as {records:Array<{source:{id:string};facts:unknown[]}>};
const sha=(bytes:string|Buffer)=>createHash("sha256").update(bytes).digest("hex");
const sourceSHA="3485c6ef8addda3cd3e209730646c296175cf3c9",path="packages/db/src/seed/topik-owner-curriculum-batch1.ts";
const own=spawnSync("git",["show",`${sourceSHA}:${path}`],{cwd:new URL("../../../../",import.meta.url),maxBuffer:1024*1024});
if(own.status!==0)throw new Error("Owned immutable source unavailable");
const forms=["변경","기 때문에","민원실","는 바람에"];
if(forms.some(form=>!own.stdout.toString().includes(form)))throw new Error("Owned source does not contain required language forms");
const acquired=new Date().toISOString();
const record={source:{id:"project-owned-public-topik-batch1-forms",url:`https://github.com/kordokrip/JLPT/blob/${sourceSHA}/${path}`,
  license:{id:"LicenseRef-nihongo-n3-self-authored",url:`https://github.com/kordokrip/JLPT/blob/${sourceSHA}/docs/ATTRIBUTIONS.md`},
  attribution:"JLPT project self-authored TOPIK owner Batch 1; public baseline metadata only",allowed_use:"language-facts-and-metadata-only",retrieved_at:acquired,sha256:sha(own.stdout)},
  facts:forms.map((value,index)=>({id:`owned-ko-form-${index+1}`,kind:"lexical-form",language:"ko",value,source_locator:"self-authored learning form; no question, explanation or audio copied"}))};
const prototype={schema_version:"learning-path-prototype-intake-v2",scope:"representative-contract-only",
  created_at:acquired,reused_intake_sha256:sha(original),reused_records_keep_original_retrieved_at:true,
  acquisition_note:"Dictionary evidence is reused from the immutable same-day v2 intake, not reported as a new HTTP download. Owned baseline forms are separately verified at the immutable repository source. Full-bank v3 collection remains incomplete after KRdict timeout and is not replaced by this prototype artifact.",
  records:[...parent.records.filter(r=>["edrdg-terms","krdict-terms",`jmdict-${encodeURIComponent("確認")}`,`krdict-${encodeURIComponent("예약")}`,`krdict-${encodeURIComponent("문의")}`].includes(r.source.id)),record]};
writeFileSync(output,JSON.stringify(prototype,null,2)+"\n");
console.log(JSON.stringify({scope:prototype.scope,records:prototype.records.length,source_evidence_sha256:sha(readFileSync(output)),full_bank_intake_complete:false}));
