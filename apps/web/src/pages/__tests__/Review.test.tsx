import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import Review from '../Review';

const reviewFixtures = vi.hoisted(() => ({
  cards: [] as Array<Record<string, unknown>>,
  vocabItems: [] as Array<Record<string, unknown>>,
  vocabItem: undefined as Record<string, unknown> | undefined,
  refetch: vi.fn(),
  review: vi.fn(),
  init: vi.fn(),
}));

vi.mock('../../hooks/useSRS', () => ({
  useDueCards: () => ({ cards: reviewFixtures.cards, refetch: reviewFixtures.refetch, isLoading: false }),
  useReviewCard: () => ({ review: reviewFixtures.review, reviewing: false }),
  useInitCards: () => ({ mutateAsync: reviewFixtures.init, isPending: false, isError: false }),
}));

vi.mock('../../hooks/useVocab', () => ({
  useVocabList: () => ({ items: reviewFixtures.vocabItems, loading: false }),
  useVocabItem: () => ({ item: reviewFixtures.vocabItem, loading: false }),
}));

vi.mock('../../components/feature/SRSCard', () => ({
  SRSCard: ({ heading, meaning }: { heading: string; meaning: string }) => (
    <div data-testid="srs-card">{heading} / {meaning}</div>
  ),
}));

function renderReview() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/review']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Review />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe('Review page baseline', () => {
  beforeEach(() => {
    reviewFixtures.cards = [];
    reviewFixtures.vocabItems = [];
    reviewFixtures.vocabItem = undefined;
    reviewFixtures.refetch.mockReset();
    reviewFixtures.review.mockReset();
    reviewFixtures.init.mockReset();
    reviewFixtures.init.mockResolvedValue({ ok: true });
  });

  it('keeps the empty review screen stable before feature extraction', () => {
    const { asFragment } = renderReview();

    expect(asFragment()).toMatchSnapshot();
  });

  it('keeps the due-card review screen stable before feature extraction', () => {
    reviewFixtures.cards = [{
      id: 1,
      user_id: 'user-1:jlpt-ja',
      item_type: 'vocab',
      item_id: 101,
      state: 'new',
      stability: 0,
      difficulty: 0,
      lapses: 0,
      reps: 0,
      due_at: '2026-07-17T00:00:00.000Z',
      created_at: '2026-07-17T00:00:00.000Z',
      updated_at: '2026-07-17T00:00:00.000Z',
    }];
    reviewFixtures.vocabItem = {
      id: 101,
      word: '確認',
      reading: 'かくにん',
      meaning: '확인',
      part_of_speech: 'noun',
      example_jp: '内容を確認します。',
      example_ko: '내용을 확인합니다.',
    };

    const { asFragment } = renderReview();

    expect(asFragment()).toMatchSnapshot();
  });
});
