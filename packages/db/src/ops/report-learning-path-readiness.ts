// 강성호 2026-10-11: 운영 DB를 쓰지 않고 현재 seed baseline의 정확한 연결과 검수 상태를 검사한다.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { buildContentSeedPlan } from "../seed/content-manifest.js";
import { learningPathReadiness } from "./learning-path-readiness.js";
const db = new DatabaseSync(":memory:");
try {
  const directory = new URL("../../drizzle-v2/", import.meta.url);
  for (const name of readdirSync(directory)
    .filter((n) => /^00\d\d_.*\.sql$/.test(n))
    .sort())
    db.exec(
      readFileSync(new URL(name, directory), "utf8").replaceAll(
        "--> statement-breakpoint",
        "",
      ),
    );
  db.exec(buildContentSeedPlan().statements.join("\n"));
  const report = learningPathReadiness(db);
  const artifacts = new URL(
    "../../../../.artifacts/learning-path-2026-10-11/",
    import.meta.url,
  );
  mkdirSync(artifacts, { recursive: true });
  writeFileSync(
    new URL("readiness.json", artifacts),
    JSON.stringify(
      { ...report, generated_at: new Date().toISOString() },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      content_ready: report.content_ready,
      structure_passed: report.structure.passed,
      automated_red_flags: report.automated_red_flags.length,
      missing_concepts: report.lookup_failures.length,
      independent_reviews: report.independent_reviews,
      blockers: report.blockers,
    }),
  );
  if (!report.content_ready) process.exitCode = 1;
} finally {
  db.close();
}
