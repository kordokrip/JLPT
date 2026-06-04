import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { authApi } from '../lib/api';
import { useAuthStore } from '../stores/auth-store';

function formatTs(value?: number | null): string {
  if (!value) return '-';
  return new Date(value * 1000).toLocaleString('ko-KR');
}

export default function AdminUsers() {
  const user = useAuthStore((s) => s.user);
  const query = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await authApi.adminUsers();
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    enabled: user?.role === 'admin',
  });

  if (user && user.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6 lg:px-10">
      <header className="mb-5">
        <p className="mb-2 text-xs font-semibold uppercase text-[var(--accent)]">Admin</p>
        <h1 className="text-3xl font-semibold text-foreground">회원 관리</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">회원, 활성 세션, 최근 접속 이벤트를 확인합니다.</p>
      </header>

      {query.isLoading && <div className="surface-card p-6 text-sm">회원 데이터를 불러오는 중입니다.</div>}
      {query.error && <div className="surface-card p-6 text-sm text-red-700">{query.error.message}</div>}
      {query.data && (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['전체 회원', query.data.stats.total_users],
              ['관리자', query.data.stats.admin_users],
              ['활성 세션', query.data.stats.active_sessions],
              ['24시간 이벤트', query.data.stats.login_events_24h],
            ].map(([label, value]) => (
              <div key={label} className="surface-card p-4">
                <div className="text-xs text-[var(--muted-foreground)]">{label}</div>
                <div className="mt-2 text-2xl font-semibold">{value}</div>
              </div>
            ))}
          </section>

          <section className="surface-card overflow-hidden p-0">
            <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">회원 목록</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--surface-alt)] text-xs text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-4 py-3">이메일</th>
                    <th className="px-4 py-3">이름</th>
                    <th className="px-4 py-3">권한</th>
                    <th className="px-4 py-3">제공자</th>
                    <th className="px-4 py-3">활성 세션</th>
                    <th className="px-4 py-3">마지막 로그인</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.users.map((row) => (
                    <tr key={row.id} className="border-t border-[var(--border)]">
                      <td className="px-4 py-3 font-semibold">{row.email}</td>
                      <td className="px-4 py-3">{row.display_name}</td>
                      <td className="px-4 py-3">{row.role}</td>
                      <td className="px-4 py-3">{row.auth_provider}</td>
                      <td className="px-4 py-3">{row.active_sessions}</td>
                      <td className="px-4 py-3">{formatTs(row.last_login_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="surface-card overflow-hidden p-0">
            <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">최근 접속 기록</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--surface-alt)] text-xs text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-4 py-3">시간</th>
                    <th className="px-4 py-3">이메일</th>
                    <th className="px-4 py-3">유형</th>
                    <th className="px-4 py-3">제공자</th>
                    <th className="px-4 py-3">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.events.map((row) => (
                    <tr key={row.id} className="border-t border-[var(--border)]">
                      <td className="px-4 py-3">{formatTs(row.created_at)}</td>
                      <td className="px-4 py-3">{row.email ?? '-'}</td>
                      <td className="px-4 py-3">{row.event_type}</td>
                      <td className="px-4 py-3">{row.provider}</td>
                      <td className="px-4 py-3">{row.ip ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
