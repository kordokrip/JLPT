import { Link } from 'react-router-dom';

const POINTS = [
  ['01', '문자부터 N3까지', '히라가나, 가타카나, 한자, 어휘, 문법을 한 흐름으로 학습합니다.'],
  ['02', '매일 이어지는 복습', '퀴즈와 SRS 기록을 계정에 저장해 다음 학습으로 자연스럽게 연결합니다.'],
  ['03', '운영 가능한 학습 시스템', '관리자 화면에서 회원, 세션, 접속 기록을 확인할 수 있습니다.'],
] as const;

export default function Welcome() {
  return (
    <main className="min-h-dvh overflow-hidden bg-[#060807] text-[#fffaf0]">
      <div className="relative min-h-dvh">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(196,32,24,0.28),transparent_34%),linear-gradient(120deg,#060807_0%,#07140f_54%,#150302_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,8,7,0.98)_0%,rgba(6,8,7,0.94)_42%,rgba(6,8,7,0.64)_72%,rgba(6,8,7,0.34)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#E9D7B3]/60 to-transparent" />

        <div className="relative z-10 mx-auto grid min-h-dvh max-w-7xl items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[0.96fr_1.04fr] lg:px-10">
          <section className="max-w-xl py-12 lg:py-16">
            <div className="flex items-center gap-3">
              <img
                src="/brand-mark.png"
                alt="Nihongo N3 브랜드 로고"
                className="h-14 w-14 rounded-2xl border border-white/15 object-cover shadow-[0_18px_40px_rgba(0,0,0,0.38)]"
              />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.32em] text-[#F05A4C]">JLPT N3 Learning OS</p>
                <p className="mt-1 font-serif-jp text-lg tracking-[0.08em] text-[#F6E8D0]">日本語 学習</p>
              </div>
            </div>

            <h1 className="mt-9 text-[44px] font-black leading-[0.98] tracking-tight sm:text-[64px] lg:text-[76px]">
              계정으로 이어지는<br />일본어 학습 루틴.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#D8CDBB] sm:text-lg">
              문자, 어휘, 문법, 퀴즈, 복습 기록을 하나의 계정으로 관리합니다.
              학습자는 매일의 흐름을 이어가고, 관리자는 회원과 접속 상태를 확인합니다.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#D82920] px-8 text-base font-black text-white shadow-[0_16px_34px_rgba(216,41,32,0.34)] transition-transform hover:-translate-y-0.5"
              >
                로그인
              </Link>
              <Link
                to="/register"
                className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-[#E9D7B3]/35 bg-[#FFF7E8]/10 px-8 text-base font-black text-[#FFF7E8] backdrop-blur transition-colors hover:bg-[#FFF7E8]/16"
              >
                회원가입
              </Link>
            </div>

            <div className="mt-9 overflow-hidden border border-[#E9D7B3]/18 bg-black/26 p-3 shadow-[0_24px_60px_rgba(0,0,0,0.32)] lg:hidden">
              <img
                src="/brand-hero.png"
                alt="붉은 일본 우산과 학 일러스트"
                className="mx-auto h-[360px] w-full object-contain object-center"
                draggable={false}
              />
            </div>

            <div className="mt-10 grid gap-3">
              {POINTS.map(([number, title, desc]) => (
                <article key={title} className="border border-[#E9D7B3]/18 bg-black/24 p-5 backdrop-blur-md">
                  <div className="grid grid-cols-[3.25rem_1fr] gap-4">
                    <span className="font-serif-jp text-2xl text-[#F05A4C]">{number}</span>
                    <div>
                      <h2 className="text-lg font-black text-[#FFF7E8]">{title}</h2>
                      <p className="mt-1 text-sm leading-6 text-[#C9BFAA]">{desc}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="relative hidden min-h-[720px] lg:block">
            <div className="absolute right-0 top-1/2 h-[82vh] max-h-[850px] w-[50vw] max-w-[740px] -translate-y-1/2 overflow-hidden">
              <img
                src="/brand-hero.png"
                alt="붉은 일본 우산과 학 일러스트"
                className="h-full w-full object-contain object-right-center drop-shadow-[0_34px_80px_rgba(0,0,0,0.46)]"
                draggable={false}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
