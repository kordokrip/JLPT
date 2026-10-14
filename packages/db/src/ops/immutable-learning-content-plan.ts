// 강성호 2026-10-11: 현재 checkout과 과거 hash를 섞지 않고, 고정 Git archive의 코드·자료를 함께 실행한다.
import { spawnSync } from "node:child_process";
import { mkdtempSync, symlinkSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { ContentSeedPlan } from "../seed/content-manifest.js";
import { REPO_ROOT } from "../seed/constants.js";
import { LEARNING_PATH_CONTENT_SOURCE } from "./learning-path-full-contract.js";

let cached: ContentSeedPlan | undefined;
export function immutableLearningContentPlan(): ContentSeedPlan {
  if (cached) return cached;
  const root = mkdtempSync(join(tmpdir(), "jlpt-immutable-content-"));
  const archive = spawnSync("git", ["archive", "--format=tar", LEARNING_PATH_CONTENT_SOURCE, "packages/db/src/seed", "packages/db/package.json", "docs", "package.json"], { cwd: REPO_ROOT, maxBuffer: 32 * 1024 * 1024 });
  if (archive.status !== 0) throw new Error("Immutable content-source archive unavailable");
  const extracted = spawnSync("tar", ["-x", "-C", root], { input: archive.stdout, maxBuffer: 1024 * 1024 });
  if (extracted.status !== 0) throw new Error("Immutable content-source archive extraction failed");
  // Installed third-party dependencies only; repository code and source data come from the fixed archive.
  symlinkSync(join(REPO_ROOT, "node_modules"), join(root, "node_modules"), "dir");
  symlinkSync(join(REPO_ROOT, "packages/db/node_modules"), join(root, "packages/db/node_modules"), "dir");
  const moduleURL = pathToFileURL(join(root, "packages/db/src/seed/content-manifest.ts")).href;
  const loader = createRequire(import.meta.url).resolve("tsx");
  const script = `const {buildContentSeedPlan}=await import(${JSON.stringify(moduleURL)});console.log(JSON.stringify(buildContentSeedPlan()));`;
  const result = spawnSync(process.execPath, ["--import", loader, "--input-type=module", "-e", script], { cwd: root, maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error("Immutable source plan execution failed; no current-checkout fallback allowed");
  cached = JSON.parse(result.stdout.toString("utf8")) as ContentSeedPlan;
  return cached;
}
