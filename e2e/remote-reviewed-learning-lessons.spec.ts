// 강성호 2026-10-13: 실제 공개 검증 receipt가 있는 전용 Preview에서11급수 대표 레슨과 저장을 검사한다.
// 합성 QA 계정만 생성하며 가족 관찰·물리 가청의 증거로 사용하지 않는다.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, test, type APIResponse } from '@playwright/test';

const input=process.env.E2E_REMOTE_COHORT_RECEIPT;
const base=process.env.E2E_BASE_URL;
if(!input || !base || !/^https:\/\/[a-f0-9]{8}\.nihongo-n3\.pages\.dev$/.test(base)) throw new Error('Exact immutable dedicated Preview URL and remote receipt required; Production is prohibited');
const receipt=JSON.parse(readFileSync(input,'utf8'));
if(receipt.schema!=='learning-cohort-remote-receipt-v1' || receipt.passed!==true || receipt.target?.scope!=='preview' || receipt.target.pages!==base || receipt.state!=='published' || receipt.questions!==600 || receipt.lessons!==220 || !/^[a-f0-9]{40}$/.test(receipt.candidate_sha)) throw new Error('Passed same-candidate published600/220 remote verification required');
const bankBytes=readFileSync(new URL('../packages/db/src/content/learning-path-v7-2026-10-11/frozen-cohort-01/bundle.json',import.meta.url));
if(createHash('sha256').update(bankBytes).digest('hex')!==receipt.cohort_hashes?.v7?.bundle || receipt.target.worker!=='nihongo-n3-api-topik-preview') throw new Error('Exact immutable bank and dedicated Worker binding required');
const bank=JSON.parse(bankBytes.toString('utf8'));
const copy={
  ko:{name:'이름',email:'이메일',password:'비밀번호',create:'계정 만들기',target:'목표 급수',save:'저장',start:'추천 레슨 시작',pause:'저장하고 중단',resume:'이어서 공부',records:'기록'},
  ja:{name:'名前',email:'メールアドレス',password:'パスワード',create:'アカウント作成',target:'目標レベル',save:'保存',start:'おすすめレッスンを開始',pause:'保存して中断',resume:'続きから学習',records:'記録'},
};
async function data(response:APIResponse) {
  expect(response.ok(),`HTTP${response.status()} ${response.url()}`).toBe(true);
  return (await response.json()).data;
}
for(const level of ['N5','N4','N3','N2','N1','1','2','3','4','5','6']) {
  test(`Preview representative start/save/resume/records/FSRS ${level}`,async({page})=>{
    test.setTimeout(180000);
    page.setDefaultTimeout(5000);
    const language=level.startsWith('N')?'ko':'ja',track=language==='ko'?'jlpt-ja':'topik-ko',labels=copy[language];
    const prohibited:string[]=[];
    page.on('request',request=>{if(/r2\.dev|\/api\/v1\/audio\//.test(request.url())) prohibited.push(request.url());});
    const runtime=await page.request.get('https://nihongo-n3-api-topik-preview.kordokrip.workers.dev/health',{timeout:5000});
    expect(runtime.ok()).toBe(true);
    const runtimeData=await runtime.json();
    expect(runtimeData.release).toBe(receipt.candidate_sha);
    expect(runtimeData.maintenanceMode).toBe('off');
    const health=await page.request.get('/api/v1/auth/config',{timeout:5000});
    expect(health.ok()).toBe(true);
    // 등록 전 proxy source를 대조한다. 아직 기존 source인 Production으로 잘못 연결되면 쓰기 전에 중단한다.
    expect(health.headers()['x-release']).toBe(receipt.candidate_sha);
    await page.goto('/welcome');
    await page.getByRole('combobox').selectOption(language);
    if(language==='ja') await page.getByRole('radio',{name:/韓国語.*TOPIK/}).click();
    await page.goto('/register');
    await page.getByLabel(labels.name,{exact:true}).fill('Preview cohort synthetic QA');
    await page.getByLabel(labels.email,{exact:true}).fill(`cohort-qa-${crypto.randomUUID()}@example.com`);
    await page.getByLabel(labels.password,{exact:true}).fill('Passw0rd1234');
    await page.getByRole('button',{name:labels.create,exact:true}).click();
    await page.getByLabel(labels.target,{exact:true}).selectOption(level);
    await page.getByRole('button',{name:labels.save,exact:true}).click();
    const get=async(path:string)=>data(await page.request.get(path,{timeout:5000}));
    const post=async(path:string,body:object={})=>data(await page.request.post(path,{data:body,timeout:5000}));
    const expected=bank.lessons.filter((lesson:any)=>lesson.track===track&&lesson.level===level);
    const catalog=await get(`/api/v1/learning/lessons?expected_track=${track}&level=${level}`);
    expect(catalog.lessons.map((lesson:any)=>lesson.id)).toEqual(expected.map((lesson:any)=>lesson.id));
    expect(catalog.lessons).toHaveLength(20);
    expect(catalog.lessons.every((lesson:any)=>!lesson.completed&&!('answer_index' in lesson))).toBe(true);
    await page.goto('/learn');
    await expect(page.locator('[aria-labelledby="lesson-library-title"] article')).toHaveCount(20);
    await page.getByRole('button',{name:labels.start,exact:true}).click();
    await expect(page).toHaveURL(/\/study\/[\w-]+$/);
    const sessionURL=page.url(),id=sessionURL.split('/').pop()!;
    let session=await get(`/api/v1/study/sessions/${id}`);
    expect(session.lesson_id).toBe(expected[0].id);
    expect(session.lesson_version).toBe(bank.version);
    expect(session.steps.map((step:any)=>step.phase)).toEqual(['learn','learn','practice','practice']);
    expect(session.steps.every((step:any)=>step.level===level&&step.ref.track===track&&step.solution===null)).toBe(true);
    expect(session.steps.filter((step:any)=>step.phase==='practice').map((step:any)=>step.ref.id)).toEqual(expected[0].question_ids);
    for(const [index,step] of session.steps.entries()) {
      const path=`/api/v1/study/sessions/${id}/steps/${step.id}`;
      const body:any={request_id:crypto.randomUUID(),active_ms:100};
      if(step.phase==='learn') {
        const revealed=await post(`${path}/reveal`);
        const revealedStep=revealed.steps.find((s:any)=>s.id===step.id);
        expect(revealedStep.solution.explanation).toContain(bank.concepts.find((concept:any)=>concept.key===expected[0].concept_keys[index]).cue[language]);
        body.rating='good';
        if(step.mode==='writing') body.answer='오늘 한국어를 공부합니다.';
      } else {
        const item=bank.items.find((item:any)=>item.id===step.ref.id);
        body.answer=step.mode==='choice'?item.choices[item.answer_index][language]:item.sample.ko;
        if(step.mode==='choice') expect(step.choices).toContain(body.answer);
      }
      session=await post(`${path}/submit`,body);
      const repeated=await post(`${path}/submit`,body);
      expect(repeated.steps.find((s:any)=>s.id===step.id)).toEqual(session.steps.find((s:any)=>s.id===step.id));
      if(index===0) {
        await page.reload();
        await page.getByRole('button',{name:labels.pause,exact:true}).click();
        await page.getByRole('button',{name:labels.resume,exact:true}).click();
        await expect(page).toHaveURL(sessionURL);
        await page.reload();
        expect((await get(`/api/v1/study/sessions/${id}`)).steps).toEqual(session.steps);
      }
    }
    expect(session.status).toBe('completed');
    const records=await get('/api/v1/learning/records');
    expect(records.totals.learned).toBe(2);
    expect(records.totals.first_answers).toBe(2);
    expect(records.totals.first_correct).toBe(2);
    const review=await post('/api/v1/study/sessions',{request_id:crypto.randomUUID(),mode:'quick'});
    expect(review.steps[0].phase).toBe('review');
    const reviewPath=`/api/v1/study/sessions/${review.id}/steps/${review.steps[0].id}`;
    await post(`${reviewPath}/reveal`);
    const rating={request_id:crypto.randomUUID(),rating:'good',active_ms:100};
    await post(`${reviewPath}/submit`,rating);
    await post(`${reviewPath}/submit`,rating);
    expect((await get('/api/v1/learning/records')).totals.reviews).toBe(1);
    await page.goto('/records');
    await expect(page.getByRole('heading',{name:labels.records,exact:true})).toBeVisible();
    expect(prohibited).toEqual([]);
    await test.info().attach('actual-remote-scope',{body:JSON.stringify({candidate_sha:receipt.candidate_sha,preview:base,level,lessons_listed:20,representative_completed:1,synthetic_account:true,family_observed:false,audible_audio:false}),contentType:'application/json'});
  });
}
