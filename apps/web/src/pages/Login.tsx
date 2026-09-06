import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../lib/api';
import { useAuthStore } from '../stores/auth-store';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelect } from '../features/study/StudyComponents';
import { useSettingsStore } from '../stores/settings-store';

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const { status, user, error, config, login, loadConfig } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const learningTrack = useSettingsStore((state) => state.learningTrack);
  const rawNextPath = params.get('next') || '/';
  const nextPath = rawNextPath.startsWith('/') && !rawNextPath.startsWith('//') ? rawNextPath : '/';

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  if (status === 'authenticated' && user) return <Navigate to={nextPath} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (await login(email, password)) navigate(nextPath, { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-[var(--background)] px-5 py-8 text-foreground">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col justify-center">
        <Link to="/welcome" className="mb-6 text-sm font-semibold text-[var(--accent)]">JLPT · TOPIK Study</Link>
        <LanguageSelect />
        <section className="surface-card mt-4 p-6">
          <h1 className="text-2xl font-semibold">{t('study.auth.login')}</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">{t('study.auth.description')}</p>
          {params.get('error') && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {t('study.auth.failed')}
            </p>
          )}
          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t('study.auth.failed')}</p>}
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold">
              {t('study.auth.email')}
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                required
                className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
              />
            </label>
            <label className="block text-sm font-semibold">
              {t('study.auth.password')}
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                required
                className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-12 w-full rounded-xl bg-[var(--accent)] text-sm font-semibold text-white disabled:opacity-60"
            >
              {t(submitting ? 'study.loading' : 'study.auth.login')}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
            <span className="h-px flex-1 bg-[var(--border)]" />
            {t('study.auth.or')}
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <a
            href={config?.google_enabled ? authApi.googleStartUrl(learningTrack) : undefined}
            aria-disabled={!config?.google_enabled}
            className={`flex min-h-12 items-center justify-center rounded-xl border border-[var(--border)] text-sm font-semibold ${
              config?.google_enabled ? '' : 'pointer-events-none opacity-50'
            }`}
          >
            {t('study.auth.google')}
          </a>
          {!config?.google_enabled && (
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              {t('study.auth.googleUnavailable')}
            </p>
          )}
        </section>
        <p className="mt-5 text-center text-sm text-[var(--muted-foreground)]">
          {t('study.auth.newAccount')} <Link to="/register" className="font-semibold text-[var(--accent)]">{t('study.auth.register')}</Link>
        </p>
      </div>
    </main>
  );
}
