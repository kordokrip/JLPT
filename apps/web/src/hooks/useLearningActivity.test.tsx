import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ summary: vi.fn() }));

vi.mock('../hooks/useDataScope', () => ({ useDataScope: () => 'user:member-1|track:topik-ko' }));
vi.mock('../lib/api', () => ({ activityApi: { summary: mocks.summary } }));

import { useLearningActivitySummary } from './useLearningActivity';

describe('useLearningActivitySummary', () => {
  it('keys the aggregate by account, track, and time window', async () => {
    const summary = {
      window: '30d' as const,
      from: '2026-07-20T00:00:00.000Z',
      totals: { events: 0, completed: 0, quiz_answered: 0, quiz_correct: 0, reviews: 0, speech_attempts: 0, speech_played: 0, speech_unavailable: 0, speech_errors: 0 },
      groups: [],
    };
    mocks.summary.mockResolvedValueOnce({ ok: true, data: summary });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useLearningActivitySummary('30d'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(['learning-activity-summary', 'user:member-1|track:topik-ko', '30d'])).toEqual(summary);
  });
});
