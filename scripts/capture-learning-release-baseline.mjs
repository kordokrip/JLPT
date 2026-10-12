#!/usr/bin/env node
// 강성호 2026-10-13: 운영/Preview 대상과 복귀 ID를 읽기 전용으로 봉인하고 비밀값을 출력하지 않는다.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const output = process.argv.find(a => a.startsWith('--output='))?.slice(9);
if (!output || !resolve(output).startsWith(`${root}/.artifacts/`)) throw new Error('New .artifacts output path required');
const privateEnv = readFileSync(resolve(root, '.env.local'), 'utf8');
const secret = name => {
  const match = privateEnv.match(new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*(.*)$`, 'm'));
  const value = process.env[name] ?? match?.[1].trim().replace(/^(["'])(.*)\1$/, '$2');
  if (!value) throw new Error(`Missing local ${name}`);
  return value;
};
const token = secret('CLOUDFLARE_API_TOKEN'), account = secret('CLOUDFLARE_ACCOUNT_ID');
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function api(path) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  if (!response.ok || result.success !== true) throw new Error(`Cloudflare read-only request failed HTTP${response.status}; codes=${result.errors?.map(e=>e.code).join(',')}`);
  return result.result;
}
const workers = [];
for (const name of ['nihongo-n3-api', 'nihongo-n3-api-topik-preview']) {
  const path = `/workers/scripts/${name}`;
  const result = await api(`${path}/deployments`);
  const deployment = (result.deployments ?? result)[0];
  if (!deployment || deployment.versions.length !== 1 || deployment.versions[0].percentage !== 100) throw new Error('Single 100% Worker baseline required');
  const version = await api(`${path}/versions/${deployment.versions[0].version_id}`);
  const bindings = version.resources.bindings;
  workers.push({ name, deployment_id: deployment.id, version_id: version.id,
    db_id: bindings.find(b=>b.name==='DB')?.id,
    release_sha: bindings.find(b=>b.name==='RELEASE_SHA')?.text,
    maintenance_mode: bindings.find(b=>b.name==='MAINTENANCE_MODE')?.text,
    script_etag: version.resources.script.etag,
    runtime_hash: digest(version.resources.script_runtime),
    non_maintenance_bindings_hash: digest(bindings.filter(b=>b.name!=='MAINTENANCE_MODE').sort((a,b)=>a.name.localeCompare(b.name))),
    settings_hash: digest(await api(`${path}/script-settings`)),
  });
}
const project = await api('/pages/projects/nihongo-n3');
const report = { schema:'learning-release-baseline-v1', captured_at:new Date().toISOString(),
  remote_writes:0, workers,
  pages:{project:project.name, production_branch:project.production_branch,
    production_id:project.canonical_deployment?.id, production_url:project.canonical_deployment?.url,
    production_sha:project.canonical_deployment?.deployment_trigger?.metadata?.commit_hash,
    production_config_hash:digest(project.deployment_configs?.production),
    preview_config_hash:digest(project.deployment_configs?.preview)},
};
mkdirSync(resolve(output,'..'), {recursive:true, mode:0o700});
writeFileSync(resolve(output), JSON.stringify(report,null,2)+'\n', {flag:'wx',mode:0o600});
console.log(JSON.stringify(report));
