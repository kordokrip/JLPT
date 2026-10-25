import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import { CharacterLesson, type Letter } from './CharacterLesson';
import type { CharacterStage } from './types';

const letters: Letter[] = ['あ', 'い', 'う', 'え', 'お', 'か'].map((char, index) => ({
  id: String(index), char, reading: ['a', 'i', 'u', 'e', 'o', 'ka'][index]!, strokeCount: 2,
  example: `example-${index}`,
}));
function Fixture({ save = vi.fn() }: { save?: (ok: boolean) => void }) {
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<CharacterStage>('observe');
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  return <CharacterLesson letters={letters} controls={null} language="ja" audio={() => null}
    model={{ index, stage, revealed, answer, choices: ['a', 'i', 'u', 'e', 'o', 'ka'], progress: 0,
      expected: letters[index]!.reading, correct: answer === letters[index]!.reading,
      onAnswer: setAnswer, onReveal: setRevealed,
      onStage: next => { setStage(next); setRevealed(false); setAnswer(null); },
      onSelect: next => { setIndex(next); setStage('observe'); setRevealed(false); setAnswer(null); },
      onComplete: save,
    }} />;
}
afterEach(cleanup);
async function mount(save = vi.fn(), language = 'ko') {
  await i18n.changeLanguage(language);
  return { save, ...render(<I18nextProvider i18n={i18n}><Fixture save={save} /></I18nextProvider>) };
}
it('recall hides the character and example but supplies a reading cue; navigation does not save', async () => {
  const { save, container } = await mount();
  fireEvent.click(screen.getByRole('button', { name: '가리고 떠올리기' }));
  expect(container.querySelector('.character-glyph')).toHaveTextContent('?');
  expect(screen.queryByText('example-0')).not.toBeInTheDocument();
  expect(screen.getByText('a')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '답 확인' }));
  expect(container.querySelector('.character-glyph')).toHaveTextContent('あ');
  expect(save).not.toHaveBeenCalled();
});
it('locks a first answer, keeps rechecks separate, and saves the actual result only on next', async () => {
  const { save, container } = await mount();
  for (let i = 0; i < 5; i++) {
    fireEvent.click(screen.getByRole('button', { name: '구별하기' }));
    expect(screen.queryByText(`example-${i}`)).not.toBeInTheDocument();
    fireEvent.click(within(container.querySelector('.character-choices') as HTMLElement).getByRole('button', { name: i === 0 ? 'ka' : letters[i]!.reading }));
    expect(within(container.querySelector('.character-choices') as HTMLElement).getByRole('button', { name: 'a' })).toBeDisabled();
    expect(save).toHaveBeenCalledTimes(i);
    fireEvent.click(screen.getByRole('button', { name: i === 4 ? '이번 묶음 확인' : '다음 문자' }));
  }
  expect(save.mock.calls.map(call => call[0])).toEqual([false, true, true, true, true]);
  expect(screen.getByText('4 / 5')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '틀린 문자 다시 확인' }));
  fireEvent.click(within(container.querySelector('.character-choices') as HTMLElement).getByRole('button', { name: 'a' }));
  fireEvent.click(screen.getByRole('button', { name: '이번 묶음 확인' }));
  expect(screen.getByText('4 / 5')).toBeInTheDocument();
  expect(screen.getByText('1 / 1')).toBeInTheDocument();
});
it('supports a final partial group and Japanese controls without inventing mastery', async () => {
  const { container } = await mount(vi.fn(), 'ja');
  fireEvent.click(screen.getByRole('button', { name: /練習セット 1/ }));
  fireEvent.change(screen.getByLabelText('練習セット', { selector: 'select' }), { target: { value: '1' } });
  expect(container.querySelector('.character-glyph')).toHaveTextContent('か');
  expect(screen.getByText('1 / 1')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '隠して思い出す' })).toBeInTheDocument();
  expect(screen.getByText(/FSRS・XP・試験/)).toBeInTheDocument();
});
it('does not advance or claim a result when local persistence fails', async () => {
  const save = vi.fn(() => { throw new Error('quota'); });
  const { container } = await mount(save);
  fireEvent.click(screen.getByRole('button', { name: '구별하기' }));
  fireEvent.click(within(container.querySelector('.character-choices') as HTMLElement).getByRole('button', { name: 'a' }));
  fireEvent.click(screen.getByRole('button', { name: '다음 문자' }));
  expect(screen.getByRole('alert')).toHaveTextContent('저장하지 못했어요');
  expect(container.querySelector('.character-glyph')).toHaveTextContent('あ');
  expect(screen.getByRole('button', { name: '구별하기' })).toBeDisabled();
});
