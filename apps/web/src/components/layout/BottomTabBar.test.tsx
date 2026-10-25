import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { expect, it } from 'vitest';
import i18n from '../../i18n';
import { useSettingsStore } from '../../stores/settings-store';
import { BottomTabBar } from './BottomTabBar';

it.each(['jlpt-ja', 'topik-ko'] as const)('gives all four learner destinations equal columns: %s', (track) => {
  useSettingsStore.setState({ learningTrack: track });
  render(<I18nextProvider i18n={i18n}><MemoryRouter><BottomTabBar /></MemoryRouter></I18nextProvider>);
  const nav = screen.getByRole('navigation');
  expect(nav.querySelectorAll('a')).toHaveLength(4);
  expect(nav.querySelector('ul')).toHaveStyle({ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' });
});
