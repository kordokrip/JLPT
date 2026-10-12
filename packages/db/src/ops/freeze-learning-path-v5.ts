// 강성호 2026-10-11: v4 실패·출처 원본을 보존하며 별도 v5 세 hash를 독점 생성한다. 검수 승인은 만들지 않는다.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fullV5Authoring } from "./learning-path-v5-authoring.js";
import { freezeLearningPathV4Payload } from "./learning-path-v4-freeze.js";
import { resolveLearningPathV4SourceBinding } from "./learning-path-v4-source-binding.js";
export function writeFrozenLearningPathV5(output:string) {
  const base=new URL("../content/learning-path-v4-2026-10-11/frozen-cohort-01/",import.meta.url);
  const source=JSON.parse(readFileSync(new URL("source.json",base),"utf8"));
  const v4=JSON.parse(readFileSync(new URL("bundle.json",base),"utf8"));
  const authoring=fullV5Authoring();
  const sourceBytes=Buffer.from(`${JSON.stringify({...source,revision:{version:"lp5-2026-10-11",based_on_draft_sha256:v4.draft_sha256,based_on_source_sha256:v4.source_evidence_sha256,acquisition_reused:true,patch_hash_basis:"same-bytes-executed-snapshot",patch_sha256:authoring.patch_file_sha256,patch_payload_sha256:authoring.patch_payload_sha256}},null,2)}\n`);
  const selection=readFileSync(new URL("../content/learning-path-v4-2026-10-11/selected-concepts.json",import.meta.url));
  const {payload,conceptsBytes}=freezeLearningPathV4Payload({sourceBytes,publicSelectionBytes:selection,trustedSourceBinding:resolveLearningPathV4SourceBinding(selection),authoring,revision:{version:"lp5-2026-10-11",bundle:"learning-path-v5-2026-10-11"}});
  mkdirSync(dirname(output),{recursive:true}); mkdirSync(output);
  for(const [name,bytes] of [["source.json",sourceBytes],["concepts.json",conceptsBytes],["bundle.json",`${JSON.stringify(payload,null,2)}\n`]] as const) writeFileSync(resolve(output,name),bytes,{flag:"wx"});
  return payload;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  if(process.argv.length!==3||!process.argv[2]?.startsWith("--output=")) throw new Error("only --output=<NEW cohort absolute path> is accepted; no DB/remote flags");
  const payload=writeFrozenLearningPathV5(resolve(process.argv[2].slice(9)));
  console.log(JSON.stringify({version:payload.version,items:payload.items.length,concepts:payload.concepts.length,lessons:payload.lessons.length,draft_sha256:payload.draft_sha256,source_evidence_sha256:payload.source_evidence_sha256,concept_inventory_sha256:payload.concept_inventory_sha256,semantic_approval:false,remote_writes:0}));
}
