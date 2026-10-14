// 강성호 2026-10-11: 두 독립 reviewer가 같은 초안·출처를 검토하도록 대표 계약을 불변 파일로 동결한다.
import {existsSync,writeFileSync} from "node:fs";
import {representativeBundle,representativeStructureFailures} from "./learning-path-v2-contract.js";
const output=new URL("../content/learning-path-v2-2026-10-11/representatives.json",import.meta.url);
if(existsSync(output))throw new Error("Frozen representative already exists; create a new version rather than overwrite evidence");
const failures=representativeStructureFailures();if(failures.length)throw new Error(failures.join("\n"));
const bundle=representativeBundle();writeFileSync(output,JSON.stringify(bundle,null,2)+"\n");
console.log(JSON.stringify({scope:bundle.scope,lessons:bundle.lessons.length,concepts:bundle.concepts.length,items:bundle.items.length,draft_sha256:bundle.draft_sha256,source_evidence_sha256:bundle.source_evidence_sha256}));
