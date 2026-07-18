import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';

export default function TopikFoundation() {
  const navigate = useNavigate();
  const switchTrack = useAuthStore((state) => state.switchTrack);

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-[800px] items-center px-5 py-12">
      <section className="w-full border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-10">
        <p className="text-sm font-bold text-[var(--accent)]">TOPIK · 한국어능력시험</p>
        <h1 className="mt-3 text-3xl font-bold">한국어 학습 트랙 기반을 준비했습니다.</h1>
        <p className="mt-4 max-w-2xl leading-7 text-[var(--muted-foreground)]">
          계정과 로컬 학습 데이터는 일본어 트랙과 분리됩니다. 검수된 TOPIK 문제은행과 채점 기준은 별도 콘텐츠 릴리스 후 이 화면에 연결됩니다.
        </p>
        <button
          type="button"
          onClick={() => void switchTrack('jlpt-ja').then((ok) => ok && navigate('/', { replace: true }))}
          className="mt-7 min-h-12 bg-[var(--accent)] px-5 font-semibold text-white"
        >
          JLPT 일본어 학습으로 전환
        </button>
      </section>
    </div>
  );
}
