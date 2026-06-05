import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../lib/api';
import { useAuthStore } from '../stores/auth-store';
import type { FormEvent } from 'react';

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { status, user, error, config, login, loadConfig } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
        <Link to="/welcome" className="mb-6 text-sm font-semibold text-[var(--accent)]">JLPT N3</Link>
        <section className="surface-card p-6">
          <h1 className="text-2xl font-semibold">로그인</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">학습 기록과 복습 데이터를 계정에 연결합니다.</p>
          {params.get('error') && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Google 로그인 처리 중 오류가 발생했습니다.
            </p>
          )}
          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold">
              이메일
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
              비밀번호
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
              {submitting ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
            <span className="h-px flex-1 bg-[var(--border)]" />
            또는
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <a
            href={config?.google_enabled ? authApi.googleStartUrl() : undefined}
            aria-disabled={!config?.google_enabled}
            className={`flex min-h-12 items-center justify-center rounded-xl border border-[var(--border)] text-sm font-semibold ${
              config?.google_enabled ? '' : 'pointer-events-none opacity-50'
            }`}
          >
            Google로 로그인
          </a>
          {!config?.google_enabled && (
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              Google SSO는 운영 환경변수 설정 후 활성화됩니다.
            </p>
          )}
        </section>
        <p className="mt-5 text-center text-sm text-[var(--muted-foreground)]">
          계정이 없나요? <Link to="/register" className="font-semibold text-[var(--accent)]">회원가입</Link>
        </p>
      </div>
    </main>
  );
}
