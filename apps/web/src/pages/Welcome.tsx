import { Link } from 'react-router-dom';

const FEATURES = [
  ['01', '계정 기반 학습', 'SRS, 퀴즈, 자가진단 기록을 로그인 세션과 연결합니다.'],
  ['02', 'Google SSO 준비', 'OAuth가 설정되면 같은 로그인 화면에서 바로 사용할 수 있습니다.'],
  ['03', '관리자 대시보드', '회원 목록, 활성 세션, 접속 이벤트를 한 화면에서 확인합니다.'],
] as const;

export default function Welcome() {
  return (
    <main className="min-h-dvh overflow-hidden bg-[#fff8ef] text-[#211815]">
      <div className="mx-auto grid min-h-dvh max-w-7xl items-center gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-10">
        <section className="relative z-10 flex min-h-[min(820px,calc(100dvh-4rem))] flex-col justify-between overflow-hidden rounded-[28px] border border-[#f3aac1] bg-[#ffe6eb] shadow-[0_28px_80px_rgba(180,38,91,0.20)]">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-45"
            style={{
              backgroundImage:
                'linear-gradient(#f5a8bc 1px, transparent 1px), linear-gradient(90deg, #f5a8bc 1px, transparent 1px)',
              backgroundSize: '10px 10px',
            }}
          />
          <div className="relative px-6 pt-8 text-center sm:px-10 sm:pt-10">
            <p className="text-sm font-black tracking-tight text-[#8e1542]">
              더욱 새로워진 JLPT N3 계정형 학습 프로그램
            </p>
            <div className="mt-5 inline-flex rotate-[-9deg] rounded-full bg-[#e63179] px-4 py-1 text-sm font-black uppercase text-white shadow-[0_8px_0_rgba(142,21,66,0.25)]">
              NEW
            </div>
            <h1 className="mt-1 font-serif-jp text-[56px] font-black leading-[0.9] tracking-tight text-[#e63179] sm:text-[82px] lg:text-[92px]">
              わくわく
            </h1>
            <div className="mt-2 flex items-end justify-center gap-2">
              <span className="text-[44px] font-black leading-none sm:text-[68px]">일본어</span>
              <span className="mb-2 text-xl font-black sm:text-3xl">STEP</span>
              <span className="flex h-16 w-16 items-center justify-center rounded-full border-[5px] border-[#ffde73] bg-[#17120f] text-3xl font-black text-white shadow-[0_8px_0_rgba(142,21,66,0.22)] sm:h-20 sm:w-20 sm:text-4xl">
                1
              </span>
            </div>
            <p className="mt-5 text-xs font-semibold text-[#7a5b5d]">
              로그인 기반 복습 · 문자 암기 · 퀴즈 · 관리자 운영
            </p>
          </div>

          <div className="relative mt-8 border-y-2 border-[#f39ab8] bg-[#ffe9d8] px-6 py-4 sm:px-10">
            <div className="mx-auto flex max-w-[420px] items-center justify-center border-4 border-[#e63179] bg-[#fff8ef] px-4 py-3 shadow-[0_0_0_4px_rgba(255,255,255,0.7)]">
              <span className="font-serif-jp text-3xl font-black tracking-wide text-[#e63179] sm:text-5xl">東京</span>
              <span className="mx-3 h-9 w-[3px] bg-[#e63179]" />
              <span className="text-2xl font-black tracking-wide text-[#e63179] sm:text-4xl">TOKYO</span>
            </div>
          </div>

          <div className="relative bg-[#f63b86] px-5 pb-8 pt-7 text-[#fff8ef] sm:px-8">
            <div className="absolute left-0 right-0 top-4 h-[3px] bg-[#fff8ef]/85" aria-hidden="true" />
            <div className="absolute left-0 right-0 top-11 h-[3px] bg-[#fff8ef]/85" aria-hidden="true" />
            <div className="relative mx-auto max-w-[560px] rounded-2xl border-4 border-[#fff8ef] bg-[#f85a99] px-4 pb-5 pt-8 shadow-[0_18px_0_rgba(142,21,66,0.18)]">
              <div className="grid grid-cols-[1fr_88px_1fr] items-end gap-3">
                <div className="h-20 rounded-t-xl border-4 border-[#fff8ef] bg-[#ffd8e4]" />
                <div className="flex h-28 items-center justify-center rounded-t-2xl border-4 border-[#fff8ef] bg-[#fff8ef] text-center text-[10px] font-black text-[#e63179]">
                  NIHONGO<br />N3
                </div>
                <div className="h-20 rounded-t-xl border-4 border-[#fff8ef] bg-[#ffd8e4]" />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 text-[11px] font-semibold">
                <span className="rounded-full bg-[#8e1542] px-4 py-3 shadow-[0_6px_0_rgba(0,0,0,0.12)]">최신<br />계정판</span>
                <ul className="flex-1 space-y-1 leading-5">
                  <li>· 한자/가나/어휘/문법 통합 복습</li>
                  <li>· 로그인 세션 기반 개인 기록 저장</li>
                  <li>· 관리자 접속 기록 대시보드 포함</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-2xl lg:max-w-none">
          <p className="mb-3 text-sm font-black text-[#d72d35]">JLPT N3 학습 운영 시스템</p>
          <h2 className="max-w-3xl text-[42px] font-black leading-tight tracking-tight sm:text-[58px] lg:text-[68px]">
            계정으로 이어지는<br />일본어 학습 플랫폼
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[#746f7e] sm:text-lg">
            어휘, 한자, 문법, 퀴즈, 복습 기록을 계정별로 저장하고 관리자 화면에서 접속 기록과 회원 상태를 확인할 수 있습니다.
            로그인 후 학습 데이터가 사용자별로 분리됩니다.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/login" className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#d9322e] px-7 text-base font-black text-white shadow-[0_10px_24px_rgba(217,50,46,0.28)]">
              로그인
            </Link>
            <Link to="/register" className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-[#ddd5cf] bg-white px-7 text-base font-black shadow-sm">
              회원가입
            </Link>
          </div>

          <div className="mt-10 grid gap-4">
            {FEATURES.map(([number, title, desc]) => (
              <article key={title} className="group flex gap-4 rounded-3xl border border-[#eadfd8] bg-white/86 p-5 shadow-[0_20px_55px_rgba(72,50,40,0.08)] backdrop-blur transition-transform hover:-translate-y-0.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ffe4ec] text-sm font-black text-[#e63179]">
                  {number}
                </div>
                <div>
                  <h3 className="text-lg font-black">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#746f7e]">{desc}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
