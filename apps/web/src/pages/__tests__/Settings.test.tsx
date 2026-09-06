import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LearningProfile } from '@nihongo-n3/shared';
import i18n from '../../i18n';
import { learningApi } from '../../lib/learning-experience';
import { useSettingsStore } from '../../stores/settings-store';
import { useAuthStore } from '../../stores/auth-store';
import Settings from '../Settings';

const flags = vi.hoisted(() => ({ enabled: true }));
vi.mock('../../lib/learning-experience', async (original) => ({
  ...await original<typeof import('../../lib/learning-experience')>(),
  get learningExperienceEnabled() { return flags.enabled; },
}));
const fixtureUser = { id: 'settings-user', email: 'settings@example.test', display_name: 'Settings fixture', role: 'user' as const, learning_track: 'jlpt-ja' as const };
const scope = 'user:settings-user|track:jlpt-ja';
vi.mock('../../lib/audio', () => ({ audioPlayer: { rate: 1 } }));
vi.mock('../../lib/push-subscribe', () => ({
  getNotificationPermission: () => 'default',
  getCurrentSubscription: async () => null,
  requestNotificationPermission: vi.fn(),
  subscribeToPush: vi.fn(),
  unsubscribeFromPush: vi.fn(),
}));

const savedProfile: LearningProfile = {
  learning_track: 'jlpt-ja', target_level: 'N5', instruction_language: 'ko',
  daily_minutes: 20, timezone: 'Asia/Seoul', configured: true,
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function instructionButton() {
  return within(screen.getByText('학습 해설 언어', { exact: true }).parentElement!.parentElement!)
    .getByRole('button', { name: 'English' });
}
function mount(client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })) {
  render(<I18nextProvider i18n={i18n}><QueryClientProvider client={client}><MemoryRouter><Settings /></MemoryRouter></QueryClientProvider></I18nextProvider>);
  return client;
}

beforeEach(async () => {
  vi.restoreAllMocks();
  flags.enabled = true;
  localStorage.clear();
  useAuthStore.setState({ status: 'authenticated', user: fixtureUser });
  useSettingsStore.setState({
    learningTrack: 'jlpt-ja', language: 'ko', languageExplicit: true,
    instructionLanguages: { 'jlpt-ja': 'ko', 'topik-ko': 'ja' },
  });
  await i18n.changeLanguage('ko');
});

describe('Settings instruction-language server binding', () => {
  it('cannot mistake a pending configured-profile GET for an unconfigured account', async () => {
    const delayed = deferred<LearningProfile>();
    vi.spyOn(learningApi, 'profile').mockReturnValue(delayed.promise);
    const save = vi.spyOn(learningApi, 'saveProfile').mockResolvedValue({ ...savedProfile, instruction_language: 'en' });
    const client = mount();
    await waitFor(() => expect(learningApi.profile).toHaveBeenCalledTimes(1));

    fireEvent.click(instructionButton());
    await act(async () => { await Promise.resolve(); });
    expect(useSettingsStore.getState().instructionLanguages['jlpt-ja']).toBe('ko');
    expect(save).not.toHaveBeenCalled();
    expect(instructionButton()).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('불러오는 중');

    await act(async () => delayed.resolve(savedProfile));
    await waitFor(() => expect(instructionButton()).toBeEnabled());
    fireEvent.click(instructionButton());
    await waitFor(() => expect(save).toHaveBeenCalledWith({ ...savedProfile, instruction_language: 'en' }));
    await waitFor(() => expect(useSettingsStore.getState().instructionLanguages['jlpt-ja']).toBe('en'));
    expect(client.getQueryData(['learning-profile', scope])).toMatchObject({ configured: true, instruction_language: 'en' });
  });

  it('keeps preferences local only after the server confirms the profile is unconfigured', async () => {
    vi.spyOn(learningApi, 'profile').mockResolvedValue({ ...savedProfile, configured: false });
    const save = vi.spyOn(learningApi, 'saveProfile').mockResolvedValue({ ...savedProfile, instruction_language: 'en' });
    const client = mount();
    await waitFor(() => expect(client.getQueryData(['learning-profile', scope])).toMatchObject({ configured: false }));

    fireEvent.click(instructionButton());

    await waitFor(() => expect(useSettingsStore.getState().instructionLanguages['jlpt-ja']).toBe('en'));
    expect(save).not.toHaveBeenCalled();
  });

  it('preserves local-only instruction preferences when the learning-experience feature is disabled', async () => {
    flags.enabled = false;
    const read = vi.spyOn(learningApi, 'profile');
    const save = vi.spyOn(learningApi, 'saveProfile');
    mount();

    expect(instructionButton()).toBeEnabled();
    fireEvent.click(instructionButton());

    await waitFor(() => expect(useSettingsStore.getState().instructionLanguages['jlpt-ja']).toBe('en'));
    expect(read).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('does not treat a failed profile GET as a new unconfigured account', async () => {
    vi.spyOn(learningApi, 'profile').mockRejectedValue(new Error('Synthetic profile failure'));
    const save = vi.spyOn(learningApi, 'saveProfile');
    mount();

    await waitFor(() => expect(screen.getByRole('alert')).toBeVisible(), { timeout: 2500 });
    expect(instructionButton()).toBeDisabled();
    fireEvent.click(instructionButton());
    await act(async () => { await Promise.resolve(); });

    expect(useSettingsStore.getState().instructionLanguages['jlpt-ja']).toBe('ko');
    expect(save).not.toHaveBeenCalled();
  });

  it('does not replace the current local language when saving the configured profile fails', async () => {
    vi.spyOn(learningApi, 'profile').mockResolvedValue(savedProfile);
    vi.spyOn(learningApi, 'saveProfile').mockRejectedValue(new Error('Synthetic save failure'));
    const client = mount();
    await waitFor(() => expect(client.getQueryData(['learning-profile', scope])).toMatchObject({ configured: true }));
    fireEvent.click(instructionButton());

    await waitFor(() => expect(screen.getByRole('alert')).toBeVisible());
    expect(useSettingsStore.getState().instructionLanguages['jlpt-ja']).toBe('ko');
    expect(client.getQueryData(['learning-profile', scope])).toEqual(savedProfile);
  });

  it.each(['track', 'account'] as const)('does not apply a late instruction-language response to another %s', async (changed) => {
    const delayed = deferred<LearningProfile>();
    vi.spyOn(learningApi, 'profile').mockResolvedValue(savedProfile);
    const save = vi.spyOn(learningApi, 'saveProfile').mockReturnValue(delayed.promise);
    const client = mount();
    await waitFor(() => expect(client.getQueryData(['learning-profile', scope])).toMatchObject({ configured: true }));
    fireEvent.click(instructionButton());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));

    const otherUser = changed === 'account' ? { ...fixtureUser, id: 'other-settings-user' } : fixtureUser;
    const otherTrack = changed === 'track' ? 'topik-ko' : 'jlpt-ja';
    const otherScope = `user:${otherUser.id}|track:${otherTrack}`;
    const otherProfile: LearningProfile = { ...savedProfile, learning_track: otherTrack, target_level: otherTrack === 'topik-ko' ? '1' : 'N5', instruction_language: 'ja' };
    await act(async () => {
      client.setQueryData(['learning-profile', otherScope], otherProfile);
      useSettingsStore.getState().setLearningTrack(otherTrack);
      useAuthStore.setState({ user: { ...otherUser, learning_track: otherTrack } });
    });
    await waitFor(() => expect(useSettingsStore.getState().instructionLanguages[otherTrack]).toBe('ja'));
    await act(async () => delayed.resolve({ ...savedProfile, instruction_language: 'en' }));

    await waitFor(() => expect(client.getQueryData(['learning-profile', scope])).toMatchObject({ instruction_language: 'en' }));
    expect(useSettingsStore.getState().instructionLanguages[otherTrack]).toBe('ja');
    expect(client.getQueryData(['learning-profile', otherScope])).toEqual(otherProfile);
  });
});
