// 강성호 2026-10-11: 명시된 immutable cohort와 두 review 입력만 읽고 새 report 파일을 exclusive-create 한다.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveLearningPathV4SourceBinding } from "./learning-path-v4-source-binding.js";
import { learningPathV4Readiness } from "./learning-path-v4-readiness.js";
import type { IndependentReview } from "./learning-path-evidence.js";
import type { FrozenLearningPathV4 } from "./learning-path-v4-freeze.js";

const option = (name: string) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const fixedSelection = new URL("../content/learning-path-v4-2026-10-11/selected-concepts.json", import.meta.url);

export function reportLearningPathV4Readiness(cohort: string, reviewA: string, reviewB: string, output: string) {
  if (existsSync(output)) throw new Error("readiness report already exists; choose a new path rather than overwrite evidence");
  const publicSelectionBytes = readFileSync(fixedSelection);
  const report = learningPathV4Readiness({
    bundle: JSON.parse(readFileSync(resolve(cohort, "bundle.json"), "utf8")) as FrozenLearningPathV4,
    sourceBytes: readFileSync(resolve(cohort, "source.json")),
    inventoryBytes: readFileSync(resolve(cohort, "concepts.json")),
    publicSelectionBytes,
    trustedSourceBinding: resolveLearningPathV4SourceBinding(publicSelectionBytes),
    reviews: [reviewA, reviewB].map(path => JSON.parse(readFileSync(resolve(path), "utf8")) as IndependentReview),
  });
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.slice(2).some(arg => !/^--(?:cohort|review-a|review-b|output)=.+$/u.test(arg))) throw new Error("readiness accepts only explicit cohort/review/output flags; no database or remote flags");
  const cohort = option("cohort"), reviewA = option("review-a"), reviewB = option("review-b"), output = option("output");
  if (!cohort || !reviewA || !reviewB || !output) throw new Error("--cohort, --review-a, --review-b, and --output are all required");
  const report = reportLearningPathV4Readiness(resolve(cohort), resolve(reviewA), resolve(reviewB), resolve(output));
  console.log(JSON.stringify({ full_bank_ready: report.full_bank_ready, failures: report.failures.length, counts: report.counts, remote_writes: report.remote_writes }));
  if (!report.full_bank_ready) process.exitCode = 1;
}
