import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { REPO_ROOT } from '../seed/constants.js';
import { validateCohortIdentity, requireCohortRemoteTarget, type CohortRemoteTarget } from './learning-cohort-target.js';

const preview: CohortRemoteTarget = { remote:true, database:'nihongo-n3-topik-preview',env:'topik-preview',config:resolve(REPO_ROOT,'apps/api/wrangler.toml'), scope:'preview',worker:'nihongo-n3-api-topik-preview',pages:'https://abcdef12.nihongo-n3.pages.dev',releaseSha:'a'.repeat(40) };
const binding = {database:preview.database,id:'5c8863e9-09ea-4180-adb5-e097f4b8de34',worker:preview.worker};
describe('600-item remote target boundary',()=>{
  it('accepts only the exact Preview triple',()=>assert.doesNotThrow(()=>validateCohortIdentity(preview,binding)));
  it('checks the real config binding without a network request',()=>{
    assert.doesNotThrow(()=>requireCohortRemoteTarget(preview,false));
    const {env:_env,...base}=preview;
    const production:CohortRemoteTarget={...base,scope:'production',database:'nihongo-n3-prod-v2',worker:'nihongo-n3-api',pages:'https://nihongo-n3.pages.dev'};
    assert.doesNotThrow(()=>requireCohortRemoteTarget(production,false));
    assert.throws(()=>requireCohortRemoteTarget({...preview,worker:'nihongo-n3-api'},false));
    assert.throws(()=>requireCohortRemoteTarget({...production,database:preview.database},false));
  });
  it('rejects aliases, cross-environment bindings and mutable SHA',()=>{
    for (const update of [{database:'DB'},{env:undefined},{scope:'production'},{remote:false},{releaseSha:'main'},{pages:'https://nihongo-n3.pages.dev'}])
      assert.throws(()=>validateCohortIdentity({...preview,...update} as CohortRemoteTarget,binding));
  });
  it('prevents a Production DB being disguised as a rollback environment',()=>{
    const {env:_previewEnv,...base}=preview;
    const drill: CohortRemoteTarget = {...base,scope:'rollback-drill',database:'nihongo-n3-learning-rollback-20261013',worker:'nihongo-n3-learning-rollback-20261013',pages:'https://abcdef12.nihongo-n3-learning-rollback.pages.dev'};
    assert.throws(()=>validateCohortIdentity(drill,{database:drill.database,worker:drill.worker,id:'0a22d92a-4af5-486f-8934-84eb1890835c'}));
    assert.doesNotThrow(()=>validateCohortIdentity(drill,{database:drill.database,worker:drill.worker,id:'11111111-1111-4111-8111-111111111111'}));
  });
});
