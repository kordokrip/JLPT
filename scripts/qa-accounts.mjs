// 강성호 · 2026-10-14: 고정 Preview 계정 2개를 재사용한다. 비밀번호는 Keychain에만 두고 출력하지 않는다.
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const QA_ORIGIN = 'https://nihongo-n3-api-topik-preview.kordokrip.workers.dev';
export const QA_SERVICE = 'org.nihongo-n3.qa.preview';
export const QA_PROFILES = Object.freeze({
  jlpt: { email: 'agent-jlpt@nihongo-n3.local', name: 'QA JLPT · reusable', track: 'jlpt-ja' },
  topik: { email: 'agent-topik@nihongo-n3.local', name: 'QA TOPIK · reusable', track: 'topik-ko' },
});

async function readQaJson(response) {
  try { return await response.json(); }
  catch { throw new Error('QA response JSON invalid; response body omitted'); }
}

export function keychainStore(run = spawnSync) {
  const read = (role) => {
    if (!Object.hasOwn(QA_PROFILES, role)) throw new Error('Unknown QA role');
    const result = run('/usr/bin/security', ['find-generic-password', '-s', QA_SERVICE, '-a', role, '-w'], { encoding: 'utf8', timeout: 15000 });
    if (result.status === 44) return null;
    if (result.status !== 0 || !result.stdout?.trim()) throw new Error('QA Keychain unavailable; no plaintext fallback');
    return result.stdout.trim();
  };
  return { read, create(role, password) {
    if (!Object.hasOwn(QA_PROFILES, role) || !/^[A-Za-z0-9_-]{40,100}$/.test(password)) throw new Error('Invalid QA secret input');
    // -i의 stdin으로 전달: 명령 인자/ps/Git/콘솔에 비밀번호를 남기지 않는다. 기존 항목을 덮어쓰지 않는다.
    const result = run('/usr/bin/security', ['-i'], {
      input: `add-generic-password -s ${QA_SERVICE} -a ${role} -w ${password}\n`,
      encoding: 'utf8', timeout: 15000,
    });
    if (result.status !== 0) throw new Error('QA Keychain save failed');
    const saved = read(role);
    const expected = Buffer.from(password), actual = Buffer.from(saved ?? '');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('QA Keychain save was not confirmed');
  } };
}

export async function withQaSession(role, action, { provision = false, store = keychainStore(), fetcher = fetch } = {}) {
  const profile = QA_PROFILES[role];
  if (!profile) throw new Error('Unknown QA role');
  const request = async (path, init = {}) => {
    if (!/^\/(?:health$|api\/v1\/)/.test(path) || path.includes('..')) throw new Error('Invalid QA path');
    try { return await fetcher(QA_ORIGIN + path, { ...init, redirect: 'error', signal: AbortSignal.timeout(15000) }); }
    catch { throw new Error('Dedicated Preview request failed; credentials were not logged'); }
  };
  const health = await request('/health');
  const status = health.ok ? await readQaJson(health) : null;
  if (status?.status !== 'ok' || status.maintenanceMode !== 'off') throw new Error('Dedicated Preview is not ready');
  let password = store.read(role);
  if (!password) {
    if (!provision) throw new Error('QA credential missing; explicitly provision once');
    password = 'Aa0_' + randomBytes(32).toString('base64url');
    store.create(role, password);
  }
  const post = (path, body, cookie) => request(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
  let response = await post('/api/v1/auth/login', { email: profile.email, password });
  let created = false;
  if (response.status === 401 && provision) {
    response = await post('/api/v1/auth/register', { email: profile.email, password, display_name: profile.name });
    created = response.status === 201;
  }
  if (!response.ok) throw new Error(`QA authentication failed (HTTP ${response.status}); no new identity or password reset attempted`);
  const cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  if (!cookie) throw new Error('QA session cookie missing');
  try {
    const body = await readQaJson(response);
    const user = body?.data?.user;
    if (typeof user?.id !== 'string' || !user.id || user.email !== profile.email || user.role !== 'user') throw new Error('QA account identity/least-privilege mismatch');
    if (user.learning_track !== profile.track) {
      const changed = await request('/api/v1/auth/track', { method: 'PATCH', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ track: profile.track }) });
      if (!changed.ok) throw new Error('QA track binding failed');
    }
    const me = await request('/api/v1/auth/me', { headers: { Cookie: cookie } });
    const confirmed = me.ok ? (await readQaJson(me))?.data?.user : null;
    if (confirmed?.id !== user.id || confirmed.email !== profile.email || confirmed.role !== 'user' || confirmed.learning_track !== profile.track) throw new Error('QA session identity/role/track verification failed');
    return await action({ role, userId: user.id, created, request: (path, init = {}) => request(path, { ...init, headers: { ...init.headers, Cookie: cookie } }) });
  } finally {
    const logout = await post('/api/v1/auth/logout', {}, cookie);
    if (!logout.ok) throw new Error('QA logout failed; revoke this test session before reuse');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.platform !== 'darwin') throw new Error('This QA credential adapter requires macOS Keychain');
    const args = process.argv.slice(2);
    if (args.some(arg => !['--provision', '--check'].includes(arg))) throw new Error('Use --provision or --check only; remote target cannot be overridden');
    for (const role of Object.keys(QA_PROFILES)) {
      const result = await withQaSession(role, async ({ created }) => {
        return { role, environment: 'dedicated-preview', created, verified: true };
      }, { provision: args.includes('--provision') });
      console.log(JSON.stringify(result));
    }
  } catch (error) { console.error(error instanceof Error ? error.message : 'QA account operation failed'); process.exitCode = 1; }
}
