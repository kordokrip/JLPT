import { expect, it } from 'vitest';
import i18n from '../../i18n';
import { foundationUnitIndex } from '../TopikLearn';

it('resumes the exact foundation unit named in the URL', () => {
  expect(foundationUnitIndex('shopping-food')).toBe(3);
  expect(foundationUnitIndex('missing-unit')).toBe(0);
});

it('has Japanese copy for the Korean browser voice and foundation labels', () => {
  expect(i18n.getResource('ja', 'translation', 'topik.placement.browserAudio')).toBe('ブラウザーの韓国語音声を準備中');
  expect(i18n.getResource('ja', 'translation', 'topik.learn.objective')).toBe('目標');
  expect(i18n.getResource('ja', 'translation', 'topik.skills.reading')).toBe('読解');
});
