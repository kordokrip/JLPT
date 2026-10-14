// 강성호 2026-10-11: 현재 초안만 증적으로 내보내며 구조 통과를 검수/공개 승인으로 바꾸지 않는다.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { CONCEPTS, ITEMS } from "../content/learning-path-2026-10-11/data.js";
import { buildLearningPathQualityReport } from "./learning-path-quality.js";
const directory = new URL(
  "../../../../.artifacts/learning-path-2026-10-11/",
  import.meta.url,
);
mkdirSync(directory, { recursive: true });
const report = buildLearningPathQualityReport();
const source = new URL(
  "../content/learning-path-source-intake-2026-10-11.json",
  import.meta.url,
);
writeFileSync(
  new URL("draft.json", directory),
  JSON.stringify({ concepts: CONCEPTS, items: ITEMS }, null, 2) + "\n",
);
writeFileSync(
  new URL("quality.json", directory),
  JSON.stringify(
    {
      ...report,
      source_evidence_sha256: createHash("sha256")
        .update(readFileSync(source))
        .digest("hex"),
      generated_at: new Date().toISOString(),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({ ...report, failures: report.failures.slice(0, 8) }),
);
if (!report.passed) process.exitCode = 1;
