import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelect } from '../features/study/StudyComponents';

export default function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { status, user, error, register } = useAuthStore();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated' && user) return <Navigate to="/" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (await register(email, password, displayName)) navigate('/', { replace: true });
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
          <h1 className="text-2xl font-semibold">{t('study.auth.register')}</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">{t('study.auth.requirement')}</p>
          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t('study.auth.failed')}</p>}
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold">
              {t('study.auth.name')}
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name"
                required
                className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
              />
            </label>
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
                autoComplete="new-password"
                required
                minLength={10}
                className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-12 w-full rounded-xl bg-[var(--accent)] text-sm font-semibold text-white disabled:opacity-60"
            >
              {t(submitting ? 'study.loading' : 'study.auth.create')}
            </button>
          </form>
        </section>
        <p className="mt-5 text-center text-sm text-[var(--muted-foreground)]">
          {t('study.auth.existing')} <Link to="/login" className="font-semibold text-[var(--accent)]">{t('study.auth.login')}</Link>
        </p>
      </div>
    </main>
  );
}
