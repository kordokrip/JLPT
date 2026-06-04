import { Link } from 'react-router-dom';

export default function Welcome() {
  return (
    <main className="min-h-dvh bg-[var(--background)] px-5 py-8 text-foreground">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section>
          <p className="mb-3 text-sm font-semibold text-[var(--accent)]">JLPT N3 학습 운영 시스템</p>
          <h1 className="font-serif-jp text-[44px] leading-tight sm:text-[56px]">
            매일의 일본어 학습을 개인 계정으로 안전하게 관리합니다.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
            어휘, 한자, 문법, 퀴즈, 복습 기록을 계정별로 저장하고 관리자 화면에서 접속 기록과 회원 상태를 확인할 수 있습니다.
            로그인 후 학습 데이터가 사용자별로 분리됩니다.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link to="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--accent)] px-5 text-sm font-semibold text-white">
              로그인
            </Link>
            <Link to="/register" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--border)] px-5 text-sm font-semibold">
              회원가입
            </Link>
          </div>
        </section>

        <section className="grid gap-3">
          {[
            ['계정 기반 학습', 'SRS, 퀴즈, 자가진단 기록을 로그인 세션과 연결합니다.'],
            ['Google SSO 준비', 'Google OAuth가 설정되면 같은 로그인 화면에서 바로 사용할 수 있습니다.'],
            ['관리자 대시보드', '회원 목록, 활성 세션, 접속 이벤트를 한 화면에서 확인합니다.'],
          ].map(([title, desc]) => (
            <article key={title} className="surface-card p-5">
              <h2 className="text-base font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{desc}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
