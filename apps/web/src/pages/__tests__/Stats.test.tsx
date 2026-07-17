import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import Stats from '../Stats';

const mocks = vi.hoisted(() => ({
  streak: vi.fn(),
}));

vi.mock('../../components/feature/Heatmap.js', () => ({
  Heatmap: () => <div data-testid="heatmap">heatmap</div>,
}));

vi.mock('../../hooks/useDataScope', () => ({
  useDataScope: () => 'member-1:jlpt-ja',
}));

vi.mock('../../lib/api', () => ({
  logsApi: {
    streak: mocks.streak,
  },
}));

function renderStats() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Stats />
    </QueryClientProvider>,
  );
}

describe('Stats page snapshot', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ko');
    mocks.streak.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders streak metrics and the heatmap after a successful fetch', async () => {
    mocks.streak.mockResolvedValue({
      ok: true,
      data: {
        currentStreak: 7,
        longestStreak: 21,
        totalDays: 48,
        lastStudyDate: '2026-07-17',
        frozen: false,
      },
    });

    const { asFragment } = renderStats();

    await screen.findByText('7일');
    expect(screen.getByTestId('heatmap')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  it('keeps the metrics shell and shows the translated error state on failure', async () => {
    mocks.streak.mockResolvedValue({
      ok: false,
      status: 503,
      message: 'maintenance',
    });

    const { asFragment } = renderStats();

    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent('통계를 불러오지 못했습니다.');
    expect(asFragment()).toMatchSnapshot();
  });
});
