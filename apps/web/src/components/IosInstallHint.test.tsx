// 강성호 2026-10-11: 설치 안내가 첫 학습을 가리지 않고 설정·닫기·standalone 계약을 보존하는 회귀다.
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { IosInstallHint } from './IosInstallHint';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone Safari');
  vi.spyOn(window, 'matchMedia').mockImplementation((media) => ({
    matches: false, media, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
});
afterEach(() => vi.restoreAllMocks());

function show(path: string, inline = true) {
  return render(<MemoryRouter initialEntries={[path]}><IosInstallHint inline={inline} /></MemoryRouter>);
}
it.each(['/', '/study/saved-session'])('inline install guidance never covers learning at %s', (path) => {
  show(path);
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('shows a nonfloating settings region and preserves one-time dismissal', () => {
  const view = show('/settings');
  expect(screen.getByRole('region')).not.toHaveClass('fixed');
  const close = screen.getByRole('button', { name: 'common.close' });
  expect(close).toHaveClass('min-h-11', 'min-w-11');
  fireEvent.click(close);
  expect(localStorage.getItem('ios-hint-dismissed')).toBe('1');
  view.unmount();
  show('/settings');
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
});
it('preserves the feature-flag-off legacy home dialog', () => {
  show('/', false);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
it('does not show install guidance in standalone mode', () => {
  vi.mocked(window.matchMedia).mockImplementation((media) => ({
    matches: true, media, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
  show('/settings');
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
});
it('does not show the iOS-only region on other browsers', () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android Chrome');
  show('/settings');
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
});
