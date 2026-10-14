import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DevicePushStatus } from './DevicePushStatus';
import { useAuthStore } from '../../stores/auth-store';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'ko' } }) }));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it.each([true, false])('distinguishes provider acceptance from actual receipt; accepted=%s', async (accepted) => {
  useAuthStore.setState({ user: { id: 'push-user' } as never });
  vi.stubGlobal('Notification', { permission: 'granted' });
  vi.stubGlobal('PushManager', {});
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {
    getRegistration: async () => ({ pushManager: { getSubscription: async () => ({ endpoint: 'https://push.example.test/fixture' }) } }),
  } });
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => new Response(JSON.stringify({ data:
    init?.method === 'POST' ? { sent: accepted ? 1 : 0, failed: accepted ? 0 : 1 } : { endpoints: ['https://push.example.test/fixture'] },
  }), { status: 200 }));
  vi.stubGlobal('fetch', fetcher);
  render(<DevicePushStatus userId="push-user" />);
  fireEvent.click(await screen.findByRole('button', { name: '등록 기기에 테스트 알림 보내기' }));
  expect(await screen.findByText(accepted ? /발송 요청이 수락/ : /테스트 알림 발송에 실패/)).toBeVisible();
  expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('/notifications/test'), expect.objectContaining({ method: 'POST', headers: { 'X-Account-Id': 'push-user' } }));
});
