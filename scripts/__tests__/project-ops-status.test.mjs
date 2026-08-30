import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseCurrentState,
  parseR2AbsenceReport,
  validateAuthProxyResponse,
  validateTopikTrackStatusResponse,
  validateWorkflowPolicy,
} from '../project-ops-status.mjs';

test('parseCurrentState extracts the immutable production identifiers', () => {
  const state = parseCurrentState(`
| D1 migration | \`0000–0027\` |
| Worker | \`worker-version\` |
| Pages | \`https://9cc58a1f.nihongo-n3.pages.dev\` (canonical) |
| web source SHA | \`2bd657e96d8a43c6d28efe414acd468c1abd0861\` |
- 최종 Preview는 \`preview-id\`, Production은 \`9cc58a1f-4772-4129-b90d-c819ca20d700\`, source는 current입니다.
`);
  assert.deepEqual(state, {
    migration: '0000–0027',
    workerVersion: 'worker-version',
    pagesUrl: 'https://9cc58a1f.nihongo-n3.pages.dev',
    pagesSourceSha: '2bd657e96d8a43c6d28efe414acd468c1abd0861',
    productionDeployment: '9cc58a1f-4772-4129-b90d-c819ca20d700',
  });
});

test('validateWorkflowPolicy accepts the disabled manual placeholder', () => {
  const errors = validateWorkflowPolicy(`
on:
  workflow_dispatch:
jobs:
  disabled:
    if: false
`);
  assert.deepEqual(errors, []);
});

test('validateWorkflowPolicy rejects automatic CI triggers', () => {
  const errors = validateWorkflowPolicy(`
on:
  push:
jobs:
  test:
    runs-on: ubuntu-latest
`);
  assert.equal(errors.length, 3);
});

test('parseR2AbsenceReport requires structured zero-reference evidence', () => {
  assert.deepEqual(parseR2AbsenceReport(JSON.stringify({
    policy: 'google-preferred-same-language-browser-pronunciation-no-r2',
    references: [],
    total: 0,
  })), {
    policy: 'google-preferred-same-language-browser-pronunciation-no-r2',
    references: [],
    total: 0,
  });
  assert.throws(() => parseR2AbsenceReport('{"total":"0"}'), /invalid R2 absence report/u);
});

test('validateAuthProxyResponse verifies JSON and the production auth contract', () => {
  assert.deepEqual(validateAuthProxyResponse(200, 'application/json; charset=UTF-8', {
    data: { google_enabled: true, auth_mode: 'app-session' },
  }), []);
  assert.deepEqual(validateAuthProxyResponse(200, 'text/html', null), [
    'content-type text/html, expected application/json',
    'data.google_enabled must be true',
    'data.auth_mode must be app-session',
  ]);
});

test('validateTopikTrackStatusResponse requires the complete published v2 surface', () => {
  assert.deepEqual(validateTopikTrackStatusResponse(200, 'application/json', {
    data: {
      content_release: 'topik-i-ii',
      write_enabled: true,
      available_levels: ['TOPIK-I', 'TOPIK-II'],
      available_sections: ['listening', 'writing', 'reading'],
    },
  }), []);
  assert.deepEqual(validateTopikTrackStatusResponse(200, 'application/json', {
    data: {
      content_release: 'placement-v2',
      write_enabled: false,
      available_levels: ['TOPIK-I'],
      available_sections: ['listening', 'reading'],
    },
  }), [
    'data.content_release must be topik-i-ii',
    'data.write_enabled must be true',
    'data.available_levels must include TOPIK-I and TOPIK-II',
    'data.available_sections must include listening, writing, and reading',
  ]);
});
