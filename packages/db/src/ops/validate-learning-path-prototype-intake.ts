// 강성호 2026-10-11: 스킬 validator로 지정 intake의 record 구조만 검사한다. 디렉터리 정규화·불변 출력으로 과거 증적을 보호한다.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { intakeDirectoryUrl } from "./source-intake-checkpoint.js";
import { currentRepresentativeDirectory } from "./learning-path-evidence.js";
import { sha256 } from "./learning-path-v2-contract.js";
const option=(name:string)=>process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3);
const bytes=readFileSync(option("input") ?? new URL("prototype-intake.json",currentRepresentativeDirectory));
const intake=JSON.parse(bytes.toString()) as {scope?:string;collection_scope?:string;records:unknown[]};
const output=option("output") ? intakeDirectoryUrl(option("output")!) : new URL("../../../../.artifacts/learning-path-v3-2026-10-11/intake-structure/",import.meta.url);
const validator=new URL("../../../../.codex/skills/learning-source-intake/scripts/record_intake.py",import.meta.url);
if(existsSync(output))throw new Error("Intake structure output exists; use a new evidence directory");
mkdirSync(output,{recursive:true});
let validated=0;
for(const [index,record] of intake.records.entries()) {
  const input=new URL(`record-${index+1}.json`,output),result=new URL(`validated-${index+1}.json`,output);
  writeFileSync(input,JSON.stringify(record,null,2)+"\n",{flag:"wx"});
  const child=spawnSync("python3",[validator.pathname,"--input",input.pathname,"--output",result.pathname],{encoding:"utf8"});
  if(child.status!==0)throw new Error(child.stderr||child.stdout||"Source structure failed");
  validated++;
}
const report={scope:intake.scope??intake.collection_scope,source_evidence_sha256:sha256(bytes),validated_records:validated,source_acquisition_repeated:false,full_bank_approval:false};
writeFileSync(new URL("report.json",output),JSON.stringify(report,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify(report));
