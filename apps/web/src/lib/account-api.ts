import { apiUrl } from './api-base';

export type AccountTheme = 'light' | 'dark' | 'system';
export type AccountAccent = 'track' | 'forest' | 'sea' | 'ink';
export interface AccountPreferences {
  theme: AccountTheme | null;
  accent: AccountAccent | null;
  reminder_enabled: boolean;
  reminder_time: string;
  timezone: string;
  custom_reminder_configured: boolean;
}
export type AccountPreferenceUpdate = Partial<Omit<AccountPreferences, 'custom_reminder_configured'>> & {initialize_theme?:AccountTheme};

function accountHeaders(userId: string, headers?: HeadersInit) { return { 'X-Account-Id': userId, ...headers }; }
async function json<T>(path: string, userId: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    credentials: 'include',
    ...init,
    headers: accountHeaders(userId, { Accept: 'application/json', ...init?.headers }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json() as { data?: T } | T;
  return typeof body === 'object' && body !== null && 'data' in body ? (body as { data: T }).data : body as T;
}

export const accountApi = {
  preferences: (userId: string, signal?: AbortSignal) => json<AccountPreferences>('/account/preferences', userId, signal ? { signal } : undefined),
  savePreferences: (userId: string, changes: AccountPreferenceUpdate) => json<AccountPreferences>('/account/preferences', userId, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes),
  }),
  avatar: async (userId: string): Promise<Blob | null> => {
    const response = await fetch(apiUrl('/account/avatar'), { credentials: 'include', headers: accountHeaders(userId, { Accept: 'image/jpeg' }) });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.blob();
  },
  uploadAvatar: async (userId: string, jpeg: Blob) => {
    const response = await fetch(apiUrl('/account/avatar'), {
      method: 'PUT', credentials: 'include', headers: accountHeaders(userId, { 'Content-Type': 'image/jpeg' }), body: jpeg,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  },
  deleteAvatar: async (userId: string) => {
    const response = await fetch(apiUrl('/account/avatar'), { method: 'DELETE', credentials: 'include', headers: accountHeaders(userId) });
    if (!response.ok && response.status !== 404) throw new Error(`HTTP ${response.status}`);
  },
};
