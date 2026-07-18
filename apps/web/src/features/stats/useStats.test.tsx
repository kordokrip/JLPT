import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useStats } from './useStats';

const mocks = vi.hoisted(() => ({
  dataScope: 'member-1:jlpt-ja',
  streak: vi.fn(),
}));

vi.mock('../../hooks/useDataScope', () => ({
  useDataScope: () => mocks.dataScope,
}));

vi.mock('../../lib/api', () => ({
  logsApi: {
    streak: mocks.streak,
  },
}));

describe('useStats', () => {
  it('keys the streak response by the user and learning track data scope', async () => {
    const resultData = {
      currentStreak: 7,
      longestStreak: 21,
      totalDays: 48,
      lastStudyDate: '2026-07-17',
      frozen: false,
    };
    mocks.streak.mockResolvedValueOnce({ ok: true, data: resultData });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useStats(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mocks.streak).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(['streak', 'member-1:jlpt-ja'])).toEqual(resultData);
  });
});
