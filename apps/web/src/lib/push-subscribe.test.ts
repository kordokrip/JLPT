import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { unsubscribeFromPush } from './push-subscribe';
import { useAuthStore } from '../stores/auth-store';

const user = {id:'push-a',email:'a@example.test',display_name:'A',role:'user' as const,learning_track:'jlpt-ja' as const};
const remove = vi.fn();
const original = Object.getOwnPropertyDescriptor(navigator,'serviceWorker');
beforeEach(()=>{
  useAuthStore.setState({status:'authenticated',user});
  remove.mockReset().mockResolvedValue(true);
  Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{ready:Promise.resolve({pushManager:{getSubscription:async()=>({endpoint:'https://push.example.test/a',unsubscribe:remove})}})}});
});
afterEach(()=>{vi.unstubAllGlobals(); if(original)Object.defineProperty(navigator,'serviceWorker',original);else Reflect.deleteProperty(navigator,'serviceWorker');});
it('does not unsubscribe a device after an account changes during server DELETE',async()=>{
  let complete!:(response:Response)=>void;
  const fetch=vi.fn(()=>new Promise<Response>(resolve=>{complete=resolve;}));vi.stubGlobal('fetch',fetch);
  const pending=unsubscribeFromPush();
  await vi.waitFor(()=>expect(fetch).toHaveBeenCalledOnce());
  useAuthStore.setState({user:{...user,id:'push-b'}});
  complete(new Response(null,{status:204}));
  expect(await pending).toBe(false);expect(remove).not.toHaveBeenCalled();
});
it('preserves the device subscription when the server rejects deletion',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(null,{status:503})));
  expect(await unsubscribeFromPush()).toBe(false);expect(remove).not.toHaveBeenCalled();
});
it('does not report success when the browser refuses to unsubscribe',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(null,{status:204})));remove.mockResolvedValue(false);
  expect(await unsubscribeFromPush()).toBe(false);
});
it('allows idempotent deletion only for the unchanged owner',async()=>{
  const fetch=vi.fn().mockResolvedValue(new Response(null,{status:404}));vi.stubGlobal('fetch',fetch);
  expect(await unsubscribeFromPush()).toBe(true);
  expect(fetch.mock.calls[0]?.[1].headers['X-Account-Id']).toBe('push-a');expect(remove).toHaveBeenCalledOnce();
});
