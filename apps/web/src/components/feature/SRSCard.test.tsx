import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SrsCard } from '../../lib/db';
import { SRSCard } from './SRSCard';

const mocks = vi.hoisted(() => ({ play: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../stores/settings-store', () => ({ useSettingsStore: (select: (state: { autoPronounce: boolean }) => unknown) => select({ autoPronounce: false }) }));
vi.mock('../../lib/audio', () => ({ audioPlayer: { playPronunciation: mocks.play } }));

const card: SrsCard = {
  id: 1, user_id: 'unit-only', item_type: 'vocab', item_id: 4,
  state: 'new', stability: 2.5, difficulty: 5, lapses: 0, reps: 0,
  due_at: '2026-09-06T00:00:00.000Z', created_at: '2026-09-06T00:00:00.000Z', updated_at: '2026-09-06T00:00:00.000Z',
};
const props = { card, heading: '確認', reading: 'かくにん', meaning: '확인' };

describe('SRSCard accessible faces and keyboard controls', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.play.mockResolvedValue(true); });

  it('keeps the hidden face inert and out of the accessibility tree, then transfers focus after revealing', () => {
    render(<SRSCard {...props} onRate={vi.fn()} />);
    const front = screen.getByTestId('card-front');
    const back = screen.getByTestId('card-back');
    expect(back).toHaveAttribute('aria-hidden', 'true');
    expect(back).toHaveAttribute('inert');
    expect(screen.queryByRole('button', { name: 'browse.playPronunciation' })).not.toBeInTheDocument();
    front.focus();
    fireEvent.click(front);
    expect(front).toHaveAttribute('aria-hidden', 'true');
    expect(front).toHaveAttribute('inert');
    expect(front).toHaveAttribute('tabindex', '-1');
    expect(front).toBeDisabled();
    expect(back).toHaveAttribute('aria-hidden', 'false');
    expect(back).not.toHaveAttribute('inert');
    expect(back).toHaveFocus();
    expect(screen.getByRole('button', { name: 'browse.playPronunciation' })).toBeEnabled();
  });

  it.each(['Enter', ' '])('does not cancel native %s activation on the front, pronunciation, or rating button', (key) => {
    const onRate = vi.fn();
    render(<SRSCard {...props} onRate={onRate} />);
    const front = screen.getByTestId('card-front');
    front.focus();
    expect(fireEvent.keyDown(front, { key })).toBe(true);
    // Happy DOM does not synthesize native keyboard clicks: test the uncanceled
    // key event and the button click separately, without claiming browser proof.
    fireEvent.click(front);
    const pronunciation = screen.getByRole('button', { name: 'browse.playPronunciation' });
    pronunciation.focus();
    expect(fireEvent.keyDown(pronunciation, { key })).toBe(true);
    fireEvent.click(pronunciation);
    expect(mocks.play).toHaveBeenCalledOnce();
    expect(onRate).not.toHaveBeenCalled();
    const good = screen.getByRole('button', { name: 'review.rating.good — 1d' });
    good.focus();
    expect(fireEvent.keyDown(good, { key })).toBe(true);
    fireEvent.click(good);
    expect(onRate).toHaveBeenCalledExactlyOnceWith('good');
  });

  it('retains unfocused Space and number shortcuts without rating from a focused control', () => {
    const onRate = vi.fn();
    render(<SRSCard {...props} onRate={onRate} />);
    expect(fireEvent.keyDown(window, { key: ' ' })).toBe(false);
    const pronunciation = screen.getByRole('button', { name: 'browse.playPronunciation' });
    pronunciation.focus();
    fireEvent.keyDown(pronunciation, { key: '3' });
    expect(onRate).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByTestId('card-back'), { key: '3' });
    expect(onRate).toHaveBeenCalledExactlyOnceWith('good');
  });

  it('does not hijack editing keys or modified shortcuts', () => {
    const onRate = vi.fn();
    render(<><textarea aria-label="Unit note" /><SRSCard {...props} onRate={onRate} /></>);
    const note = screen.getByRole('textbox', { name: 'Unit note' });
    note.focus();
    expect(fireEvent.keyDown(note, { key: 'Enter' })).toBe(true);
    expect(screen.queryByRole('group', { name: 'review.ratingGroup' })).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    expect(screen.queryByRole('group', { name: 'review.ratingGroup' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('card-front'));
    fireEvent.keyDown(note, { key: '3' });
    expect(onRate).not.toHaveBeenCalled();
  });

  it('does not bypass disabled ratings through keyboard or swipe while saving', () => {
    const onRate = vi.fn();
    const { rerender } = render(<SRSCard {...props} onRate={onRate} />);
    fireEvent.click(screen.getByTestId('card-front'));
    rerender(<SRSCard {...props} onRate={onRate} loading />);
    fireEvent.keyDown(window, { key: '3' });
    const flipArea = screen.getByTestId('card-front').parentElement!;
    fireEvent.touchStart(flipArea, { touches: [{ clientX: 0, clientY: 0 }] });
    fireEvent.touchEnd(flipArea, { changedTouches: [{ clientX: 100, clientY: 0 }] });
    expect(onRate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'review.rating.good — 1d' })).toBeDisabled();
  });
});
