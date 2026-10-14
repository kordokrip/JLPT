import test from 'node:test';
import assert from 'node:assert/strict';
import { assertQaTestTarget } from '../lib/qa-target-policy.mjs';
import { QA_ORIGIN, QA_PROFILES, keychainStore, withQaSession } from '../qa-accounts.mjs';

test('blocks production and arbitrary remote signup E2E before execution', () => {
  for (const base of ['https://nihongo-n3.pages.dev', 'https://4d0589d0.nihongo-n3.pages.dev', 'https://evil.test', 'https://localhost.evil.test']) assert.throws(() => assertQaTestTarget(base, false));
  assert.throws(() => assertQaTestTarget('https://nihongo-n3.pages.dev', true));
  assertQaTestTarget('http://127.0.0.1:4173', false);
  assertQaTestTarget(undefined, false);
  assertQaTestTarget('https://123abcde.nihongo-n3.pages.dev', true); // suite still validates receipt chain/backend before writes
});

test('Keychain secret is passed on stdin, not process arguments; locked store fails closed', () => {
  const secret = 'Aa0_' + 'x'.repeat(43), calls = [];
  const store = keychainStore((bin, args, options) => { calls.push({ bin, args, options }); return { status: 0, stdout: args[0] === '-i' ? '' : secret }; });
  store.create('jlpt', secret);
  assert.ok(calls[0].options.input.includes(secret));
  assert.ok(calls.every(call => !call.args.join(' ').includes(secret)));
  assert.throws(() => keychainStore(() => ({ status: 1 })).read('jlpt'), /no plaintext fallback/);
  assert.throws(() => store.create('admin', secret));
});

function harness({ missing = false, loginStatus = 200, registerStatus = 201, role = 'user', loginTrack = 'jlpt-ja', meUser = {}, meStatus = 200, malformedPath } = {}) {
  const calls = [], secrets = new Map(missing ? [] : [['jlpt', 'existing-test-secret']]);
  let creates = 0;
  const store = { read: id => secrets.get(id) ?? null, create: (id, value) => { creates++; secrets.set(id, value); } };
  const fetcher = async (url, init) => {
    calls.push({ url, init });
    assert.ok(url.startsWith(QA_ORIGIN + '/'));
    assert.equal(init.redirect, 'error');
    if (malformedPath && url.endsWith(malformedPath)) return new Response('SECRET_SYNTHETIC_INVALID_JSON', { headers: { 'Set-Cookie': '__Host-n3_session=synthetic; Secure; HttpOnly' } });
    if (url.endsWith('/health')) return Response.json({ status: 'ok', maintenanceMode: 'off' });
    if (url.endsWith('/logout')) return Response.json({ data: {} });
    if (url.endsWith('/track')) return Response.json({ data: {} });
    if (url.endsWith('/me')) return Response.json({ data: { user: { id: 'qa', email: QA_PROFILES.jlpt.email, role, learning_track: 'jlpt-ja', ...meUser } } }, { status: meStatus });
    const status = url.endsWith('/register') ? registerStatus : loginStatus;
    return Response.json({ data: { user: { id: 'qa', email: QA_PROFILES.jlpt.email, role, learning_track: loginTrack } } }, { status, headers: { 'Set-Cookie': '__Host-n3_session=synthetic; Secure; HttpOnly' } });
  };
  return { calls, store, fetcher, creates: () => creates };
}

test('existing fixed identity logs in and logs out without register or credential rotation', async () => {
  const h = harness();
  await withQaSession('jlpt', async value => assert.equal(value.created, false), h);
  assert.equal(h.creates(), 0);
  assert.equal(h.calls.filter(c => c.url.endsWith('/register')).length, 0);
  assert.ok(h.calls.at(-1).url.endsWith('/logout'));
});
test('provision stores generated secret before registering the one fixed identity', async () => {
  const h = harness({ missing: true, loginStatus: 401 });
  await withQaSession('jlpt', async value => assert.equal(value.created, true), { ...h, provision: true });
  assert.equal(h.creates(), 1);
  assert.equal(h.calls.filter(c => c.url.endsWith('/register')).length, 1);
});
test('check does not register when credential missing; conflicting account is not reset', async () => {
  const missing = harness({ missing: true });
  await assert.rejects(withQaSession('jlpt', () => {}, missing), /missing/);
  assert.equal(missing.creates(), 0);
  const conflict = harness({ loginStatus: 401, registerStatus: 409 });
  await assert.rejects(withQaSession('jlpt', () => {}, { ...conflict, provision: true }), /409/);
  assert.equal(conflict.creates(), 0);
});
test('rejects elevated role and logs out even when callback fails', async () => {
  const admin = harness({ role: 'admin' });
  await assert.rejects(withQaSession('jlpt', () => {}, admin), /least-privilege/);
  assert.ok(admin.calls.at(-1).url.endsWith('/logout'));
  const h = harness();
  await assert.rejects(withQaSession('jlpt', () => { throw new Error('test failure'); }, h), /test failure/);
  assert.ok(h.calls.at(-1).url.endsWith('/logout'));
});

test('confirms session identity, role and changed track before callback', async () => {
  const h = harness({ loginTrack: 'topik-ko' });
  await withQaSession('jlpt', async () => {
    assert.ok(h.calls.at(-1).url.endsWith('/me'));
    assert.ok(h.calls.some(call => call.url.endsWith('/track')));
  }, h);
  for (const meUser of [{ id: 'another-user' }, { email: 'another@nihongo-n3.local' }, { role: 'admin' }, { learning_track: 'topik-ko' }]) {
    const mismatch = harness({ loginTrack: 'topik-ko', meUser });
    let actionRan = false;
    await assert.rejects(withQaSession('jlpt', () => { actionRan = true; }, mismatch), /session identity\/role\/track verification failed/);
    assert.equal(actionRan, false);
    assert.ok(mismatch.calls.at(-1).url.endsWith('/logout'));
  }
  const unavailable = harness({ meStatus: 401 });
  await assert.rejects(withQaSession('jlpt', () => assert.fail('callback must not run'), unavailable), /session identity\/role\/track verification failed/);
  assert.ok(unavailable.calls.at(-1).url.endsWith('/logout'));
});

test('JSON parse failures omit response body and stop callback, logging out authenticated sessions', async () => {
  for (const malformedPath of ['/health', '/login', '/register', '/me']) {
    const h = harness({ malformedPath, loginStatus: malformedPath === '/register' ? 401 : 200 });
    await assert.rejects(withQaSession('jlpt', () => assert.fail('callback must not run'), { ...h, provision: malformedPath === '/register' }), error => {
      assert.equal(error.message, 'QA response JSON invalid; response body omitted');
      assert.equal(error.stack.includes('SECRET_SYNTHETIC_INVALID_JSON'), false);
      assert.equal(error.cause, undefined);
      return true;
    });
    if (malformedPath !== '/health') assert.ok(h.calls.at(-1).url.endsWith('/logout'));
  }
});
