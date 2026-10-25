import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { BrowseSidebar, MobileBrowseTabs } from './BrowseFilters';
import { useBrowse } from './useBrowse';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../hooks/useTrackStatus', () => ({ useTrackStatus: () => ({ levels: ['N5', 'N4', 'N3', 'N2', 'N1'] }) }));
vi.mock('../../stores/settings-store', () => ({ useSettingsStore: (select: (s: unknown) => unknown) => select({ learningTrack: 'jlpt-ja' }) }));
vi.mock('../../hooks/useContent', () => ({
  useGrammarList: () => ({ items: [{ id: 22 }], loading: false }),
  useKanjiList: () => ({ items: [{ id: 33 }], loading: false }),
}));
vi.mock('../../hooks/useVocab', () => ({
  useVocabList: () => ({ items: [{ id: 11 }], loading: false }),
  useVocabSearch: () => ({ data: [{ id: 99 }] }),
}));
vi.mock('../../lib/api', () => ({ homophonesApi: { list: vi.fn(async () => ({ ok: true, data: [{ id: 44 }] })) } }));

function Fixture({ desktop }: { desktop: boolean }) {
  const browse = useBrowse();
  const location = useLocation();
  const navigate = useNavigate();
  return <>
    {desktop ? <BrowseSidebar currentType={browse.currentType} onType={browse.switchType}
      level={browse.level} levels={browse.levels} onLevel={browse.setLevel} />
      : <MobileBrowseTabs currentType={browse.currentType} onType={browse.switchType} />}
    <output data-testid="location">{location.pathname}{location.search}</output>
    <output data-testid="type">{browse.currentType}</output>
    <output data-testid="query">{browse.query}</output>
    <output data-testid="level">{browse.level ?? 'all'}</output>
    <output data-testid="items">{browse.items.map(item => item.id).join(',')}</output>
    <button onClick={() => browse.setLevel('N3')}>set N3</button>
    <button onClick={() => navigate(-1)}>back</button>
  </>;
}
function mount(desktop: boolean, initial = '/browse/grammar?q=stale') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[initial]}>
    <Routes><Route path="/browse/:type" element={<Fixture desktop={desktop} />} /></Routes>
  </MemoryRouter></QueryClientProvider>);
}
afterEach(cleanup);

for (const desktop of [false, true]) {
  for (const [target, id] of [['vocab', 11], ['kanji', 33], ['homophones', 44]] as const) {
    it(`${desktop ? 'sidebar' : 'mobile tabs'} switches grammar to ${target}, clears filters and displays target data`, async () => {
      mount(desktop);
      fireEvent.click(screen.getByRole('button', { name: 'set N3' }));
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^browse\\.${target}`) }));
      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(`/browse/${target}`));
      expect(screen.getByTestId('location').textContent).toBe(`/browse/${target}`);
      expect(screen.getByTestId('type')).toHaveTextContent(target);
      expect(screen.getByTestId('query')).toBeEmptyDOMElement();
      expect(screen.getByTestId('level')).toHaveTextContent('all');
      await waitFor(() => expect(screen.getByTestId('items')).toHaveTextContent(String(id)));
    });
  }
}
it('switches back to grammar and browser Back restores the previous category and search URL', async () => {
  mount(false, '/browse/vocab?q=remember');
  expect(screen.getByTestId('items')).toHaveTextContent('99');
  fireEvent.click(screen.getByRole('button', { name: 'browse.grammar' }));
  await waitFor(() => expect(screen.getByTestId('type')).toHaveTextContent('grammar'));
  expect(screen.getByTestId('items')).toHaveTextContent('22');
  fireEvent.click(screen.getByRole('button', { name: 'back' }));
  await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/browse/vocab?q=remember'));
  expect(screen.getByTestId('query')).toHaveTextContent('remember');
  expect(screen.getByTestId('items')).toHaveTextContent('99');
});
