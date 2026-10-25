import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { useSettingsStore } from '../stores/settings-store';
import { useAccountPreferences } from './useAccountPreferences';

const preferences = vi.hoisted(() => vi.fn()); const savePreferences = vi.hoisted(() => vi.fn());
vi.mock('../lib/account-api', () => ({ accountApi: { preferences, savePreferences } }));
function deferred<T>() { let resolve!: (value: T) => void; return { promise: new Promise<T>((done) => { resolve = done; }), resolve }; }
const payload = { theme: 'dark' as const, accent: 'sea' as const, reminder_enabled: false, reminder_time: '09:00', timezone: 'Asia/Seoul', custom_reminder_configured: false };
const user = { id: 'preferences-a', email: 'a@example.test', display_name: 'A', role: 'user' as const, learning_track: 'jlpt-ja' as const };
function wrapper({ children }: { children: ReactNode }) { return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>; }

beforeEach(() => { preferences.mockReset(); savePreferences.mockReset(); useAuthStore.setState({ status: 'authenticated', user }); useSettingsStore.setState({ theme: 'system', accent: 'track', themeExplicit: false }); });
describe('useAccountPreferences', () => {
  it('shares two observers and ignores a delayed GET after an accepted PUT',async()=>{
    const old=deferred<typeof payload>();preferences.mockReturnValue(old.promise);savePreferences.mockResolvedValue({...payload,theme:'light',accent:'ink'});
    const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
    const Wrap=({children}:{children:ReactNode})=><QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const {result}=renderHook(()=>({root:useAccountPreferences(),settings:useAccountPreferences()}),{wrapper:Wrap});
    expect(preferences).toHaveBeenCalledTimes(1);
    await act(async()=>{await result.current.settings.save({theme:'light',accent:'ink'});});
    await act(async()=>old.resolve(payload));
    await waitFor(()=>expect(useSettingsStore.getState().accent).toBe('ink'));
    expect(useSettingsStore.getState().theme).toBe('light');
    expect(result.current.root.preferences?.accent).toBe('ink');
  });
  it('resets an unconfigured second account to system and track',async()=>{
    preferences.mockResolvedValueOnce(payload).mockResolvedValueOnce({...payload,theme:null,accent:null});
    const {result}=renderHook(()=>useAccountPreferences(),{wrapper});
    await waitFor(()=>expect(result.current.preferences?.accent).toBe('sea'));
    await act(async()=>useAuthStore.setState({user:{...user,id:'empty-account'}}));
    await waitFor(()=>expect(result.current.preferences?.accent).toBeNull());
    expect(useSettingsStore.getState()).toMatchObject({theme:'system',accent:'track'});
    expect(savePreferences).not.toHaveBeenCalled();
  });
  it('blocks a late account response after an account switch', async () => {
    const old = deferred<typeof payload>(); preferences.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ ...payload, theme: 'light', accent: 'forest' });
    renderHook(() => useAccountPreferences(), { wrapper });
    await act(async () => { useAuthStore.setState({ user: { ...user, id: 'preferences-b' } }); });
    await act(async () => old.resolve(payload));
    await waitFor(() => expect(useSettingsStore.getState().accent).toBe('forest'));
    expect(useSettingsStore.getState().theme).toBe('light');
  });

  it('does not change local preferences when saving fails', async () => {
    preferences.mockResolvedValue(payload); savePreferences.mockRejectedValue(new Error('server error'));
    const { result } = renderHook(() => useAccountPreferences(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await expect(result.current.save({ accent: 'ink' })).rejects.toThrow('server error');
    expect(useSettingsStore.getState().accent).toBe('sea');
  });
});
