import fs from "node:fs";
import path from "node:path";

import { assertContentExpansionDraft } from "../seed/content-expansion-quality.js";
import { REPO_ROOT } from "../seed/constants.js";

const report = assertContentExpansionDraft();
const outputPath = path.resolve(
  process.argv
    .find((argument) => argument.startsWith("--out="))
    ?.slice("--out=".length) ??
    path.join(
      REPO_ROOT,
      ".artifacts/content-quality/content-expansion-draft-2026-08-19.json",
    ),
);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      output_path: outputPath,
      artifact_sha256: report.artifact_sha256,
      checks: report.checks.length,
      passed: report.checks.every((check) => check.passed),
      publication_state: "reviewed-draft",
    },
    null,
    2,
  ),
);
