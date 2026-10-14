// 강성호 2026-10-11: v4 is staged only in a caller-chosen new local SQLite file; remote/D1 targets are rejected.
import { DatabaseSync } from "node:sqlite";
import { closeSync, openSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { buildContentSeedPlan } from "../seed/content-manifest.js";
import { applyLearningPathV4DraftStage } from "../seed/learning-path-v4-draft.js";
import { resolveLearningPathV4SourceBinding } from "./learning-path-v4-source-binding.js";
import type { FrozenLearningPathV4 } from "./learning-path-v4-freeze.js";
import type { IndependentReview } from "./learning-path-evidence.js";
import { learningPathV4Readiness } from "./learning-path-v4-readiness.js";
const opt=(name:string)=>process.argv.find(v=>v.startsWith(`--${name}=`))?.slice(name.length+3);
const selection=new URL("../content/learning-path-v4-2026-10-11/selected-concepts.json",import.meta.url);

export function stageLearningPathV4Local(cohort:string,reviewA:string,reviewB:string,tempFile:string) {
  const publicSelectionBytes=readFileSync(selection);
  const input={bundle:JSON.parse(readFileSync(resolve(cohort,"bundle.json"),"utf8")) as FrozenLearningPathV4,sourceBytes:readFileSync(resolve(cohort,"source.json")),inventoryBytes:readFileSync(resolve(cohort,"concepts.json")),publicSelectionBytes,trustedSourceBinding:resolveLearningPathV4SourceBinding(publicSelectionBytes),reviews:[reviewA,reviewB].map(path=>JSON.parse(readFileSync(resolve(path),"utf8")) as IndependentReview)};
  const readiness=learningPathV4Readiness(input);
  if(!readiness.full_bank_ready) throw new Error(`v4 local staging blocked before DB creation: ${readiness.failures.join("; ")}`);
  // 강성호 2026-10-11: 승인 전 파일 생성 금지 및 기존/경쟁 파일 덮어쓰기 방지.
  const withinTemp=relative(realpathSync(tmpdir()),realpathSync(dirname(tempFile)));
  if(withinTemp.startsWith("..")||isAbsolute(withinTemp)||!tempFile.endsWith(".sqlite")) throw new Error("staging requires a new .sqlite file inside the system temporary directory");
  closeSync(openSync(tempFile,"wx",0o600));
  const db=new DatabaseSync(tempFile);
  try {
    const migrations=new URL("../../drizzle-v2/",import.meta.url);
    for(const name of readdirSync(migrations).filter(n=>/^00\d\d_.*\.sql$/.test(n)).sort()) db.exec(readFileSync(new URL(name,migrations),"utf8").replaceAll("--> statement-breakpoint",""));
    db.exec(buildContentSeedPlan().statements.join("\n"));
    return applyLearningPathV4DraftStage(db,input);
  } finally { db.close(); }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  if(process.argv.slice(2).some(arg=>!/^--(?:cohort|review-a|review-b|temp-file)=.+$/u.test(arg))) throw new Error("only explicit local cohort/review/temp-file flags are allowed; remote/D1 flags are rejected");
  const cohort=opt("cohort"), reviewA=opt("review-a"), reviewB=opt("review-b"), tempFile=opt("temp-file");
  if(!cohort||!reviewA||!reviewB||!tempFile) throw new Error("--cohort, --review-a, --review-b, and --temp-file are required");
  const result=stageLearningPathV4Local(resolve(cohort),resolve(reviewA),resolve(reviewB),resolve(tempFile));
  console.log(JSON.stringify({counts:{...result.counts},full_bank_ready:true,remote_writes:0}));
}
