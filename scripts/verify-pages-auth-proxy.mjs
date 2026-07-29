import assert from 'node:assert/strict';

const origin = (process.env.PAGES_ORIGIN ?? 'https://nihongo-n3.pages.dev').replace(/\/$/, '');
const expectedOrigin = new URL(origin).origin;

async function request(path, init) {
  const response = await fetch(`${origin}${path}`, { redirect: 'manual', ...init });
  return response;
}

async function expectJson(path, init, expectedStatus) {
  const response = await request(path, init);
  const contentType = response.headers.get('content-type') ?? '';
  assert.equal(response.status, expectedStatus, `${path} returned HTTP ${response.status}`);
  assert.match(contentType, /application\/json/i, `${path} must be proxied API JSON, not a Pages document`);
  return response.json();
}

const config = await expectJson('/api/v1/auth/config', undefined, 200);
assert.equal(config?.data?.google_enabled, true, 'Google OAuth must be enabled in the production auth config');

await expectJson('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'auth-proxy-smoke.invalid', password: 'not-a-real-password' }),
}, 401);

const oauth = await request('/api/v1/auth/google/start?source=auth-proxy-smoke&track=jlpt-ja');
assert.equal(oauth.status, 302, `Google OAuth start returned HTTP ${oauth.status}`);
const location = oauth.headers.get('location');
assert.ok(location, 'Google OAuth start must include a redirect location');
const oauthUrl = new URL(location);
assert.equal(oauthUrl.hostname, 'accounts.google.com', 'Google OAuth must redirect to Google Accounts');
assert.equal(
  oauthUrl.searchParams.get('redirect_uri'),
  `${expectedOrigin}/api/v1/auth/google/callback`,
  'Google OAuth redirect_uri must use the canonical Pages origin',
);

console.log(JSON.stringify({
  status: 'ok',
  origin: expectedOrigin,
  checks: ['auth-config-json', 'login-json-401', 'google-oauth-302'],
}));
