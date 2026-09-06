import { useEffect, useRef, useState } from 'react';
import { audioQaSamples, type AudioQaLanguage } from '@nihongo-n3/shared';

import { useKoreanAudio } from '../features/topik/useKoreanAudio';
import { audioPlayer } from '../lib/audio';

type VoiceCounts = Record<AudioQaLanguage, number>;
type PlaybackSnapshot = { language: AudioQaLanguage; voices: VoiceCounts | null };
type PlaybackResult = PlaybackSnapshot & { outcome: 'played' | 'failed' | 'stopped' };
const languageLabels = { ja: '일본어', ko: '한국어' } as const;

function captureVoiceCounts(): VoiceCounts | null {
  try {
    const voices = window.speechSynthesis.getVoices();
    return {
      ja: voices.filter((voice) => /^ja(?:-|$)/i.test(voice.lang)).length,
      ko: voices.filter((voice) => /^ko(?:-|$)/i.test(voice.lang)).length,
    };
  } catch {
    return null;
  }
}

/**
 * A manual browser-voice check. It intentionally has no R2 object, provider
 * comparison, server request, or persisted audio-candidate state.
 */
export default function AudioQa() {
  const [language, setLanguage] = useState<AudioQaLanguage>('ja');
  const [sampleIndex, setSampleIndex] = useState(0);
  const [japanesePlaying, setJapanesePlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [lastPlayback, setLastPlayback] = useState<PlaybackResult | null>(null);
  const [completed, setCompleted] = useState<VoiceCounts>({ ja: 0, ko: 0 });
  const operation = useRef(0);
  const activePlayback = useRef<(PlaybackSnapshot & { id: number }) | null>(null);
  const koreanAudio = useKoreanAudio();
  const samples = audioQaSamples(language);
  const sample = samples[sampleIndex]!;
  const playing = language === 'ko' ? koreanAudio.playing : japanesePlaying;
  const error = playbackError ?? (language === 'ko' && koreanAudio.error ? '한국어 브라우저 음성을 사용할 수 없습니다. 기기 음성 설정을 확인하세요.' : null);

  useEffect(() => () => {
    operation.current += 1;
    activePlayback.current = null;
    audioPlayer.stop();
    koreanAudio.stop();
  }, [koreanAudio.stop]);

  const stopPlayback = () => {
    const active = activePlayback.current;
    operation.current += 1;
    activePlayback.current = null;
    audioPlayer.stop();
    koreanAudio.stop();
    setPending(false);
    setJapanesePlaying(false);
    if (active) setLastPlayback({ ...active, outcome: 'stopped' });
  };

  const changeLanguage = (next: AudioQaLanguage) => {
    stopPlayback();
    setLanguage(next);
    setSampleIndex(0);
    setPlaybackError(null);
  };

  const playSample = async () => {
    const id = ++operation.current;
    // Read-only snapshot: no wait or listener before the existing speech call.
    const snapshot = { language, voices: captureVoiceCounts() };
    activePlayback.current = { ...snapshot, id };
    setPending(true);
    setPlaybackError(null);
    let played = false;
    try {
      played = language === 'ko'
        ? await koreanAudio.speakText(sample)
        : await audioPlayer.speakText(sample, {
          lang: 'ja-JP',
          preferGoogleVoice: true,
          onStart: () => { if (operation.current === id) setJapanesePlaying(true); },
          onEnd: () => { if (operation.current === id) setJapanesePlaying(false); },
          onError: () => { if (operation.current === id) setJapanesePlaying(false); },
        });
    } catch {
      played = false;
    }
    if (operation.current !== id || activePlayback.current?.id !== id) return;
    activePlayback.current = null;
    setPending(false);
    setJapanesePlaying(false);
    setLastPlayback({ ...snapshot, outcome: played ? 'played' : 'failed' });
    if (played) setCompleted((counts) => ({ ...counts, [language]: counts[language] + 1 }));
    else setPlaybackError(`${languageLabels[language]} 브라우저 음성을 사용할 수 없습니다. 기기 음성 설정을 확인하세요.`);
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
        <button type="button" disabled={pending || playing} onClick={() => void playSample()} className="mt-6 min-h-11 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
          {playing ? '재생 중' : pending ? '재생 시작 대기' : '브라우저 음성으로 재생'}
        </button>
        <button type="button" disabled={!pending && !playing} onClick={stopPlayback} className="ml-3 mt-6 min-h-11 rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm disabled:opacity-40">
          재생 중단
        </button>
      </section>

      <section role="status" aria-label="재생 진단 결과" aria-live="polite" aria-atomic="true" className="mt-6 rounded-lg border border-[var(--border)] p-4 text-sm leading-relaxed">
        <p>이 페이지의 정상 종료 횟수: 일본어 {completed.ja}회 · 한국어 {completed.ko}회</p>
        {lastPlayback ? <>
          <p>마지막 재생 언어: {languageLabels[lastPlayback.language]}</p>
          <p>{lastPlayback.outcome === 'played' ? '정상 종료 확인(실제 가청 여부는 별도 확인)' : lastPlayback.outcome === 'failed' ? '재생 실패' : '재생 중단'}</p>
          <p>클릭 시 브라우저 음성 수: {lastPlayback.voices ? `일본어 ${lastPlayback.voices.ja}개 · 한국어 ${lastPlayback.voices.ko}개` : '확인 불가'}</p>
          <p>클릭 시 음성 목록 기준: {lastPlayback.voices ? lastPlayback.voices[lastPlayback.language] > 0 ? 'enumerated-voice' : 'utterance-lang' : '확인 불가'}</p>
          <p className="text-[var(--muted-foreground)]">음성 목록 기준 경로이며 실제 선택된 음성을 확인한 것은 아닙니다. 횟수는 페이지를 새로 열면 초기화됩니다.</p>
        </> : <p>아직 재생 완료 기록이 없습니다.</p>}
      </section>

      {error && <p className="mt-6 rounded-lg border border-[var(--destructive)]/35 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
    </div>
  );
}
