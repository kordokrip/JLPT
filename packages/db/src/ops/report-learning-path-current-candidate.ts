// 강성호 2026-10-11: 실제 canonical seed 조회와 대표 승인을 검사하되 전체 출판이 미완료면 exit1을 유지한다.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { buildContentSeedPlan } from "../seed/content-manifest.js";
import { resolveSelectedConcept, type SelectedConcept } from "./learning-path-v2-contract.js";
import { currentRepresentativeEvidence, evidenceFailures } from "./learning-path-evidence.js";
const {bundle,source,inventory,reviews}=currentRepresentativeEvidence();
const concepts=(JSON.parse(inventory.toString()) as {concepts:SelectedConcept[]}).concepts;
const db=new DatabaseSync(":memory:");
try {
  const directory=new URL("../../drizzle-v2/",import.meta.url);
  for(const name of readdirSync(directory).filter(name=>/^00\d\d_.*\.sql$/.test(name)).sort())db.exec(readFileSync(new URL(name,directory),"utf8").replaceAll("--> statement-breakpoint",""));
  db.exec(buildContentSeedPlan().statements.join("\n"));
  const lookup_failures: {key:string;reason:string}[]=[];
  for(const concept of concepts)try{resolveSelectedConcept(db,concept);}catch(error){lookup_failures.push({key:concept.key,reason:String(error)});}
  const representative_failures=evidenceFailures(bundle,source,inventory,reviews,"representative-contract-only");
  const full_bank_blockers=evidenceFailures(bundle,source,inventory,reviews,"full-bank-only");
  const report={generated_at:new Date().toISOString(),candidate_version:bundle.version,draft_sha256:bundle.draft_sha256,source_evidence_sha256:bundle.source_evidence_sha256,
    selected_public_concepts:concepts.length,canonical_seed_lookup_failures:lookup_failures,representative:{items:bundle.items.length,lessons:bundle.lessons.length,passed:!representative_failures.length,failures:representative_failures},
    full_bank:{expected_items:440,content_ready:false,blockers:full_bank_blockers},actual_new_lesson_db_staging:false,remote_writes:0,audible_verification:"not-run",publication:"blocked"};
  const output=new URL("../../../../.artifacts/learning-path-v3-2026-10-11/current-candidate.json",import.meta.url);
  mkdirSync(new URL(".",output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify({selected_public_concepts:concepts.length,strict_lookup_failures:lookup_failures.length,representative_passed:report.representative.passed,full_bank_ready:false,blockers:full_bank_blockers,remote_writes:0}));
  process.exitCode=1;
} finally {db.close();}
