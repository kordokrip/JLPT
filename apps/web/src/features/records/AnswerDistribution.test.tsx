import {render,screen} from '@testing-library/react';
import {I18nextProvider} from 'react-i18next';
import {expect,it} from 'vitest';
import i18n from '../../i18n';
import {AnswerDistribution} from './AnswerDistribution';
it('shows denominators and selected period without mixing retry totals',async()=>{
  await i18n.changeLanguage('ko');
  render(<I18nextProvider i18n={i18n}><AnswerDistribution groups={[{level:'N3',section:'vocab_mc',answered:4,correct:2},{level:'N3',section:'listening',answered:6,correct:0}]} window="30d"/></I18nextProvider>);
  expect(screen.getByText(/4\/10 · 정답률: 50% \(2\/4\)/)).toBeVisible();
  expect(screen.getByText(/6\/10 · 정답률: 0% \(0\/6\)/)).toBeVisible();
  expect(screen.getByText(/최근 30일/)).toBeVisible();
});
it('does not invent zero accuracy for an empty record',async()=>{
  await i18n.changeLanguage('ja');
  render(<I18nextProvider i18n={i18n}><AnswerDistribution groups={[]} window="7d"/></I18nextProvider>);
  expect(screen.getByText('回答なし')).toBeVisible();expect(screen.queryByText(/0%/)).toBeNull();
});
