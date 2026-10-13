// 강성호 2026-10-13: 두 실제 빌드의 서비스워커 갱신을 격리 localhost에서 검증한다. Production/DB write는 없다.
import { spawnSync, execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  cpSync,
  openSync,
  closeSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(fileURLToPath(new URL("..", import.meta.url))),
  base = join(root, ".artifacts/operations/pwa-update-2026-10-13");
mkdirSync(base, { recursive: true });
const output = mkdtempSync(join(base, "cohort-"));
console.log(output);
const results = [];
const legacyRootArg = process.argv
  .find((value) => value.startsWith("--legacy-root="))
  ?.slice(14);
let legacySource = null;
if (legacyRootArg) {
  const legacyRoot = resolve(legacyRootArg);
  legacySource = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: legacyRoot,
    encoding: "utf8",
  }).trim();
  if (
    !/^[a-f0-9]{40}$/.test(legacySource) ||
    execFileSync("git", ["status", "--porcelain"], {
      cwd: legacyRoot,
      encoding: "utf8",
    }).trim()
  )
    throw new Error("Legacy source must be a clean Git worktree");
  cpSync(join(legacyRoot, "apps/web/dist"), join(output, "legacy"), {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
}
function run(name, args, extra = {}) {
  const fd = openSync(join(output, name + ".log"), "wx");
  const result = spawnSync("pnpm", args, {
    cwd: root,
    env: { ...process.env, ...extra },
    stdio: ["ignore", fd, fd],
  });
  closeSync(fd);
  results.push({
    name,
    exit_code: result.status,
    error: result.error?.message ?? null,
  });
  console.log(name, result.status);
  if (result.status !== 0)
    throw new Error(name + " failed; inspect preserved log");
}
try {
  for (const [name, release] of [
    ["v1", "1".repeat(40)],
    ["v2", "2".repeat(40)],
  ]) {
    run("build-" + name, ["-C", "apps/web", "build"], {
      PWA_TEST_BUILD: "1",
      VITE_APP_RELEASE: release,
      VITE_PWA_DEV_SW: "true",
      VITE_API_URL: "",
    });
    cpSync(join(root, "apps/web/dist"), join(output, name), {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
  }
  run(
    "browser",
    [
      "-C",
      "e2e",
      "exec",
      "playwright",
      "test",
      "--config=playwright.pwa-update.config.ts",
    ],
    {
      PWA_TEST_V1: join(output, "v1"),
      PWA_TEST_V2: join(output, "v2"),
      PWA_TEST_OUTPUT: output,
      ...(legacySource ? { PWA_TEST_LEGACY: join(output, "legacy") } : {}),
    },
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
writeFileSync(
  join(output, "summary.json"),
  JSON.stringify(
    {
      schema: "isolated-pwa-update-check-v1",
      passed: process.exitCode !== 1,
      production_evidence: false,
      voice_evidence: false,
      synthetic_build_shas: true,
      legacy_source_sha: legacySource,
      results,
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);
