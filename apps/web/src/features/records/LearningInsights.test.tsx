import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { api } from '../../lib/api';
import { accuracyLabel, getLearningInsights, type AnnualInsights, type DayInsights } from '../../lib/learning-insights';
import { localUserIdFor } from '../../lib/db';
import { useAuthStore } from '../../stores/auth-store';
import { useSettingsStore } from '../../stores/settings-store';
import { LearningInsights } from './LearningInsights';

const today = '2026-10-14';
const emptyDay = (date = today) => ({ date, studied: false, guided: { learned: 0, reviews: 0, answers: 0, correct: 0, retries: 0 }, saved: { daily_log: false, quiz_attempts: 0, owner_completions: 0, reviews: 0 } });
const annual: AnnualInsights = { learning_track: 'jlpt-ja', timezone: 'Asia/Seoul', today, year: 2026, total_study_days: 1, months: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, study_days: i === 9 ? 1 : 0 })), days: Array.from({ length: 365 }, (_, i) => emptyDay(new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10))), completed_lessons: [{ session_id: 'real', lesson_id: 'l', lesson_version: 'v', title: { ko: '실제 저장 제목', ja: '保存された題名', en: 'Saved title' }, level: 'N3', completed_at: 1, date: today, answers: 1, correct: 0 }], completed_lessons_truncated: false };
const detail: DayInsights = { learning_track: 'jlpt-ja', timezone: 'Asia/Seoul', today, date: today, day: emptyDay(), completed_lessons: [], completed_lessons_truncated: false };
const clients: QueryClient[] = [];
function account(id: string) { useAuthStore.setState({ status: 'authenticated', user: { id, email: `${id}@example.test`, display_name: id, role: 'user', learning_track: 'jlpt-ja' } }); }
function mount() { const client = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } }); clients.push(client); return render(<MemoryRouter><I18nextProvider i18n={i18n}><QueryClientProvider client={client}><LearningInsights today={today} /></QueryClientProvider></I18nextProvider></MemoryRouter>); }
beforeEach(async () => { vi.restoreAllMocks(); account('a'); useSettingsStore.setState({ learningTrack: 'jlpt-ja' }); await i18n.changeLanguage('ko'); });
afterEach(() => { cleanup(); clients.splice(0).forEach(c => c.clear()); });
it('distinguishes no answers from a measured zero percent', () => { expect(accuracyLabel(0, 0)).toBeNull(); expect(accuracyLabel(0, 2)).toBe('0%'); });
it('renders real lesson title, accessible summary and empty day without invented accuracy', async () => {
  vi.spyOn(api, 'get').mockImplementation(async path => ({ ok: true, data: path.includes('/day?') ? detail : annual }) as never);
  mount();
  expect(await screen.findByText('실제 저장 제목')).toBeTruthy();
  expect(screen.getByRole('link', { name: '실제 저장 제목' })).toHaveAttribute('href', '/study/real');
  expect(screen.getByText('응답 없음')).toBeTruthy();
  expect(screen.getByText(/첫 응답: 0\/1 · 정답률: 0%/)).toBeTruthy();
  expect(screen.getByRole('table', { name: '월별 학습일' })).toBeTruthy();
  expect(screen.getByRole('region', { name: '연간 학습일 지도' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '2026-10-13: 학습일 0' }));
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/learning/insights/day?expected_track=jlpt-ja&date=2026-10-13'));
});
it.each(['ja', 'en'])('localizes records in %s without raw translation keys', async language => {
  await i18n.changeLanguage(language);
  vi.spyOn(api, 'get').mockImplementation(async path => ({ ok: true, data: path.includes('/day?') ? detail : annual }) as never);
  mount();
  expect(await screen.findByText(language === 'ja' ? '保存された題名' : 'Saved title')).toBeTruthy();
  expect(screen.getByText(language === 'ja' ? '回答なし' : 'No answers')).toBeTruthy();
});
it('rejects a late response after account change and does not leak it into the new scope', async () => {
  let resolve!: (value: unknown) => void;
  vi.spyOn(api, 'get').mockImplementation(() => new Promise(r => { resolve = r; }) as never);
  const pending = getLearningInsights<AnnualInsights>(localUserIdFor('a', 'jlpt-ja'), 'jlpt-ja', { year: 2026 });
  account('b'); resolve({ ok: true, data: annual });
  await expect(pending).rejects.toThrow('Learning scope changed');
});
it('rejects a stale scope before making a request and mismatched response tracks', async () => {
  const get = vi.spyOn(api, 'get').mockResolvedValue({ ok: true, data: { ...annual, learning_track: 'topik-ko' } });
  await expect(getLearningInsights(localUserIdFor('old', 'jlpt-ja'), 'jlpt-ja', { year: 2026 })).rejects.toThrow();
  expect(get).not.toHaveBeenCalled();
  await expect(getLearningInsights(localUserIdFor('a', 'jlpt-ja'), 'jlpt-ja', { year: 2026 })).rejects.toThrow('Learning scope mismatch');
});
it('separates annual cache and selected-day requests on track change', async () => {
  const get = vi.spyOn(api, 'get').mockImplementation(async path => ({ ok: true, data: { ...(path.includes('/day?') ? detail : annual), learning_track: path.includes('topik-ko') ? 'topik-ko' : 'jlpt-ja' } }) as never);
  mount(); await screen.findByText('실제 저장 제목');
  act(() => useSettingsStore.setState({ learningTrack: 'topik-ko' }));
  await waitFor(() => expect(get).toHaveBeenCalledWith('/learning/insights?expected_track=topik-ko&year=2026'));
  expect(get).toHaveBeenCalledWith('/learning/insights/day?expected_track=topik-ko&date=2026-10-14');
});
it('shows load errors instead of an empty achievement report', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({ ok: false, status: 503, message: 'Unavailable' });
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('기록을 불러오지 못했습니다.');
  expect(screen.queryByText('저장된 학습 기록이 없습니다.')).toBeNull();
  expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy();
});
