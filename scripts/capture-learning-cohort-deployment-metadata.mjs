// 강성호 2026-10-13: 실제 Preview GET 응답의 비밀 없는 필드만 새 파일에 봉인한다. 배포/DB 쓰기는 하지 않는다.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
const root = resolve(import.meta.dirname, "..");
const arg = (name) =>
  process.argv
    .find((value) => value.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
const output = arg("output"),
  deployment = arg("deployment-id");
if (
  !output ||
  !resolve(output).startsWith(root + "/.artifacts/") ||
  !deployment ||
  !/^[a-f0-9-]{36}$/.test(deployment)
)
  throw new Error(
    "New private output directory and exact Preview deployment ID required",
  );
const privateEnv = readFileSync(join(root, ".env.local"), "utf8");
function secret(name) {
  const match = privateEnv.match(
    new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*(.*)$`, "m"),
  );
  const value =
    process.env[name] ?? match?.[1].trim().replace(/^(["'])(.*)\1$/, "$2");
  if (!value) throw new Error("Missing local credential");
  return value;
}
const token = secret("CLOUDFLARE_API_TOKEN"),
  account = secret("CLOUDFLARE_ACCOUNT_ID");
mkdirSync(resolve(output), { recursive: false, mode: 0o700 });
const refs = {};
async function capture(name, path, project) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${account}${path}`;
  const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20000),
    }),
    body = await response.json();
  if (!response.ok || body.success !== true)
    throw new Error(`Read-only ${name} GET failed HTTP${response.status}`);
  const result = project(body.result),
    proof = {
      schema: "cloudflare-readonly-get-proof-v1",
      collected_at: new Date().toISOString(),
      request: { method: "GET", url },
      status: response.status,
      response: { success: body.success, result },
      sanitized: true,
    };
  const pathOut = join(resolve(output), name + ".json"),
    bytes = JSON.stringify(proof, null, 2) + "\n";
  writeFileSync(pathOut, bytes, { flag: "wx", mode: 0o600 });
  refs[name] = {
    path: pathOut,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
  return result;
}
await capture(
  "database",
  "/d1/database/5c8863e9-09ea-4180-adb5-e097f4b8de34",
  (result) => ({ uuid: result.uuid, name: result.name }),
);
await capture(
  "worker",
  "/workers/scripts/nihongo-n3-api-topik-preview/settings",
  (result) => ({
    bindings: result.bindings.filter(
      (binding) =>
        binding.type === "d1" ||
        ["RELEASE_SHA", "MAINTENANCE_MODE"].includes(binding.name),
    ),
  }),
);
const pages = await capture(
  "pages",
  `/pages/projects/nihongo-n3/deployments/${deployment}`,
  (result) => ({
    id: result.id,
    project_name: result.project_name,
    environment: result.environment,
    url: result.url,
    latest_stage: result.latest_stage,
    deployment_trigger: result.deployment_trigger,
    env_vars: result.env_vars?.API_ORIGIN
      ? { API_ORIGIN: result.env_vars.API_ORIGIN }
      : undefined,
  }),
);
writeFileSync(
  join(resolve(output), "refs.json"),
  JSON.stringify(refs, null, 2) + "\n",
  { flag: "wx", mode: 0o600 },
);
console.log(
  JSON.stringify({
    output: resolve(output),
    remote_writes: 0,
    pages_api_origin_present: !!pages.env_vars?.API_ORIGIN,
    preview: pages.environment === "preview",
  }),
);
