import { beforeAll, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import jpeg from 'jpeg-js';
import { accountOA } from '../routes/account.js';
import { normalizeAvatar, googlePicture, preferenceInput } from '../lib/account-personalization.js';
import type { AppEnv } from '../types.js';
// @ts-ignore Vite SQL fixture
import schema from '../../../../packages/db/drizzle-v2/0033_account_personalization.sql?raw';
const db = (env as typeof env & {DB:D1Database}).DB;
const app = new Hono<AppEnv>().route('/api/v1',accountOA);
const fixture = () => new Uint8Array(jpeg.encode({width:256,height:256,data:new Uint8Array(256*256*4).fill(255)},80).data);
const call = (path:string,init?:RequestInit, authMode='public-owner') => app.request('/api/v1/account/'+path,init,{...env,AUTH_MODE:authMode,ENVIRONMENT:'test'});
beforeAll(async () => {
  await db.prepare('CREATE TABLE users(id TEXT PRIMARY KEY)').run();
  await db.prepare("INSERT INTO users VALUES('owner'),('other')").run();
  for (const sql of schema.split('--> statement-breakpoint')) await db.prepare(sql).run();
});
describe('private account preferences and avatar (local D1)',()=>{
  it('requires auth and rejects stale-account writes',async()=>{
    expect((await call('preferences',undefined,'app-session')).status).toBe(401);
    expect((await call('avatar',{method:'DELETE',headers:{'X-Account-Id':'other'}})).status).toBe(409);
  });
  it('validates quarter hours/timezone/unknown fields',()=>{
    for (const value of [{reminder_time:'25:00'},{reminder_time:'19:07'},{timezone:'wrong'},{theme:'auto'},{google_picture_url:'https://evil.test'},{}]) expect(preferenceInput.safeParse(value).success).toBe(false);
    expect(preferenceInput.safeParse({reminder_time:'23:45',timezone:'Asia/Kathmandu'}).success).toBe(true);
  });
  it('preserves independently saved settings and only opts out legacy when reminder saved',async()=>{
    const put = (body:unknown) => call('preferences',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    expect((await put({theme:'dark',accent:'forest'})).status).toBe(200);
    let response = await (await call('preferences')).json<{data:Record<string,unknown>}>();
    expect(response.data).toMatchObject({theme:'dark',custom_reminder_configured:false});
    expect((await put({reminder_enabled:true,reminder_time:'18:15',timezone:'America/New_York'})).status).toBe(200);
    await put({accent:'sea'});
    // Another device must not initialize over a preference that was already saved.
    expect((await put({initialize_theme:'light'})).status).toBe(200);
    expect((await put({initialize_theme:'light',accent:'ink'})).status).toBe(400);
    response = await (await call('preferences')).json();
    expect(response.data).toMatchObject({theme:'dark',accent:'sea',reminder_enabled:true,reminder_time:'18:15',custom_reminder_configured:true});
    expect(await db.prepare("SELECT count(*) AS n FROM account_preferences WHERE user_id='other'").first()).toEqual({n:0});
  });
  it('checks actual JPEG, rejects truncation/SVG/oversized/dimensions',()=>{
    const valid=fixture(); expect(normalizeAvatar(valid).length).toBeLessThan(131072);
    for(const bytes of [new TextEncoder().encode('<svg/>'),valid.slice(0,-1),new Uint8Array(131073),new Uint8Array(jpeg.encode({width:1,height:1,data:new Uint8Array(4)},80).data)]) expect(()=>normalizeAvatar(bytes)).toThrow();
  });
  it('keeps only private normalized photo and falls back after idempotent delete',async()=>{
    const put=await call('avatar',{method:'PUT',headers:{'Content-Type':'image/jpeg'},body:fixture()});
    expect(put.status).toBe(200);
    const res=await call('avatar'); expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    const image=jpeg.decode(new Uint8Array(await res.arrayBuffer()),{useTArray:true});
    expect([image.width,image.height]).toEqual([256,256]);
    expect(await db.prepare("SELECT typeof(jpeg) AS type,count(*) AS n FROM account_avatars").first()).toEqual({type:'blob',n:1});
    expect((await call('avatar',{method:'PUT',headers:{'Content-Type':'image/svg+xml'},body:'<svg/>'})).status).toBe(400);
    expect((await call('avatar',{method:'DELETE'})).status).toBe(204);
    expect((await call('avatar',{method:'DELETE'})).status).toBe(204);
    expect((await call('avatar')).status).toBe(404);
  });
  it('allows only verified Google image hosts without credentials',()=>{
    expect(googlePicture('https://lh3.googleusercontent.com/a/photo')).toBeTruthy();
    for(const url of ['javascript:alert(1)','https://googleusercontent.com.evil.test/a','https://user@lh3.googleusercontent.com/a','http://lh3.googleusercontent.com/a']) expect(googlePicture(url)).toBeNull();
  });
});
