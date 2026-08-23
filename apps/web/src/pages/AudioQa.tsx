import { useState } from 'react';
import { audioQaSamples, type AudioQaLanguage } from '@nihongo-n3/shared';

import { useKoreanAudio } from '../features/topik/useKoreanAudio';
import { audioPlayer } from '../lib/audio';

/**
 * A manual browser-voice check. It intentionally has no R2 object, provider
 * comparison, server request, or persisted audio-candidate state.
 */
export default function AudioQa() {
  const [language, setLanguage] = useState<AudioQaLanguage>('ja');
  const [sampleIndex, setSampleIndex] = useState(0);
  const [japanesePlaying, setJapanesePlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const koreanAudio = useKoreanAudio();
  const samples = audioQaSamples(language);
  const sample = samples[sampleIndex]!;
  const playing = language === 'ko' ? koreanAudio.playing : japanesePlaying;
  const error = playbackError ?? (language === 'ko' && koreanAudio.error ? '한국어 브라우저 음성을 사용할 수 없습니다. 기기 음성 설정을 확인하세요.' : null);

  const changeLanguage = (next: AudioQaLanguage) => {
    audioPlayer.stop();
    koreanAudio.stop();
    setLanguage(next);
    setSampleIndex(0);
    setPlaybackError(null);
  };

  const playSample = async () => {
    setPlaybackError(null);
    if (language === 'ko') {
      if (!await koreanAudio.speakText(sample)) setPlaybackError('한국어 브라우저 음성을 사용할 수 없습니다. 기기 음성 설정을 확인하세요.');
      return;
    }
    const played = await audioPlayer.speakText(sample, {
      lang: 'ja-JP',
      preferGoogleVoice: true,
      onStart: () => setJapanesePlaying(true),
      onEnd: () => setJapanesePlaying(false),
      onError: () => setJapanesePlaying(false),
    });
    if (!played) setPlaybackError('일본어 브라우저 음성을 사용할 수 없습니다. 기기 음성 설정을 확인하세요.');
  };

  return (
    <div className="mx-auto max-w-[760px] px-5 py-8 pb-24 sm:px-8">
      <header className="mb-8">
        <p className="mb-2 font-pretendard text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--accent)]">Browser voice check</p>
        <h1 className="font-pretendard text-[32px] font-semibold leading-tight text-foreground">브라우저 발음 음성 확인</h1>
        <p className="mt-3 max-w-[680px] font-pretendard text-[14px] leading-relaxed text-[var(--muted-foreground)]">
          발음은 Google 음성을 우선하며, 없으면 기기에 설치된 같은 언어의 브라우저 음성으로 재생합니다. 서버/R2 오디오는 사용하지 않습니다.
        </p>
      </header>

      <div className="mb-6 grid max-w-md grid-cols-2 gap-1 rounded-[var(--radius-md)] bg-[var(--surface-alt)] p-1" role="tablist" aria-label="음성 확인 언어">
        {([{ id: 'ja', label: '일본어' }, { id: 'ko', label: '한국어' }] as const).map(({ id, label }) => (
          <button key={id} type="button" role="tab" aria-selected={language === id} onClick={() => changeLanguage(id)} className={language === id ? 'min-h-11 rounded bg-[var(--card)] text-sm font-bold text-[var(--accent)] shadow-[var(--shadow-sm)]' : 'min-h-11 rounded text-sm font-semibold text-[var(--muted-foreground)]'}>{label}</button>
        ))}
      </div>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13px] text-[var(--muted-foreground)]">Sample {sampleIndex + 1} / {samples.length}</p>
            <p className="mt-2 font-serif-jp text-[22px] leading-relaxed text-foreground">{sample}</p>
          </div>
          <select value={sampleIndex} onChange={(event) => setSampleIndex(Number(event.target.value))} className="h-11 rounded border border-[var(--border)] bg-[var(--card)] px-3 text-sm" aria-label="샘플 문장 선택">
            {samples.map((text, index) => <option key={text} value={index}>{index + 1}. {text.slice(0, 24)}</option>)}
          </select>
        </div>
        <button type="button" disabled={playing} onClick={() => void playSample()} className="mt-6 min-h-11 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
          {playing ? '재생 중' : '브라우저 음성으로 재생'}
        </button>
      </section>

      {error && <p className="mt-6 rounded-lg border border-[var(--destructive)]/35 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
    </div>
  );
}
