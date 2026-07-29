import { useEffect, useMemo, useState } from 'react';
import { audioQaSamples, type AudioQaLanguage } from '@nihongo-n3/shared';
import { audioPlayer, buildAudioUrl } from '../lib/audio';
import {
  AUDIO_QA_CRITERIA,
  AUDIO_QA_PROVIDERS,
  audioQaProvidersForLanguage,
  audioQaProviderSummary,
  audioQaRatingKey,
  audioQaScorecardMarkdown,
  createAudioQaScorecard,
  isAudioQaApproved,
  isAudioQaScorecardComplete,
  type AudioQaCandidate,
  type AudioQaCriterion,
  type AudioQaProvider,
  type AudioQaScorecard,
} from '../features/audio-qa/scorecard';

const STORAGE_KEY_PREFIX = 'nihongo-n3:audio-qa-scorecard:v4';

const PROVIDER_INFO: Record<AudioQaProvider, {
  label: string;
  description: string;
}> = {
  cloudflare: {
    label: 'Cloudflare MeloTTS',
    description: '승인 전 비교용으로 R2에 고정된 30개 후보만 재생합니다.',
  },
  google: {
    label: 'Google Cloud TTS',
    description: '승인 토큰으로 사전 생성된 Neural2 30개 후보만 재생합니다.',
  },
  voicevox: {
    label: 'VOICEVOX',
    description: '연결된 HTTPS Engine에서 사전 생성한 R2 후보만 재생합니다.',
  },
};

export default function AudioQa() {
  const [language, setLanguage] = useState<AudioQaLanguage>('ja');
  const [sampleIndex, setSampleIndex] = useState(0);
  const [playing, setPlaying] = useState<AudioQaProvider | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [scorecard, setScorecard] = useState<AudioQaScorecard>(() => loadScorecard('ja'));
  const samples = audioQaSamples(language);
  const providers = audioQaProvidersForLanguage(language);
  const sample = samples[sampleIndex]!;

  useEffect(() => {
    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}:${scorecard.language}`, JSON.stringify(scorecard));
  }, [scorecard]);

  const changeLanguage = (next: AudioQaLanguage) => {
    setLanguage(next);
    setSampleIndex(0);
    setScorecard(loadScorecard(next));
  };

  const summaries = useMemo(() => Object.fromEntries(
    providers.map((provider) => [provider, audioQaProviderSummary(scorecard, provider)]),
  ) as Partial<Record<AudioQaProvider, ReturnType<typeof audioQaProviderSummary>>>, [scorecard, providers]);
  const qaComplete = isAudioQaScorecardComplete(scorecard);
  const batchApproved = isAudioQaApproved(scorecard);

  const playProvider = async (provider: AudioQaProvider) => {
    setPlaying(provider);
    setPlaybackError(null);
    try {
      const candidate = await playServerCandidate(provider, sampleIndex, language);
      const key = audioQaRatingKey(provider, sampleIndex);
      setScorecard((current) => ({
        ...current,
        ratings: {
          ...current.ratings,
          [key]: {
            candidate,
            scores: current.ratings[key]?.scores ?? {},
            notes: current.ratings[key]?.notes ?? '',
            playedAt: new Date().toISOString(),
          },
        },
      }));
    } catch (error) {
      setPlaybackError(error instanceof Error ? error.message : '오디오 후보를 재생할 수 없습니다.');
    } finally {
      setPlaying(null);
    }
  };

  const updateScore = (provider: AudioQaProvider, criterion: AudioQaCriterion, score: number) => {
    const key = audioQaRatingKey(provider, sampleIndex);
    setScorecard((current) => {
      const rating = current.ratings[key];
      if (!rating?.candidate || !rating.playedAt) return current;
      return {
        ...current,
        ratings: {
          ...current.ratings,
          [key]: { ...rating, scores: { ...rating.scores, [criterion]: score } },
        },
      };
    });
  };

  const updateNotes = (provider: AudioQaProvider, notes: string) => {
    const key = audioQaRatingKey(provider, sampleIndex);
    setScorecard((current) => {
      const rating = current.ratings[key];
      if (!rating) return current;
      return { ...current, ratings: { ...current.ratings, [key]: { ...rating, notes } } };
    });
  };

  const exportScorecard = () => {
    const blob = new Blob([audioQaScorecardMarkdown(scorecard)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `audio-qa-scorecard-${scorecard.evaluatedOn || 'draft'}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-[1040px] px-5 py-8 pb-24 sm:px-8 lg:px-12">
      <header className="mb-8">
        <p className="mb-2 font-pretendard text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--accent)]">
          Audio QA
        </p>
        <h1 className="font-pretendard text-[32px] font-semibold leading-tight text-foreground">
          한국어 · 일본어 발음 엔진 비교
        </h1>
        <p className="mt-3 max-w-[720px] font-pretendard text-[14px] leading-relaxed text-[var(--muted-foreground)]">
          언어별 동일 30문장을 직접 듣고 자연스러움, 억양, 발음 단위, 잡음과 속도를 기록합니다. Google 후보는 관리자 승인 배치로 R2에 준비된 경우에만 재생됩니다.
        </p>
      </header>

      <div className="mb-6 grid max-w-md grid-cols-2 gap-1 rounded-[var(--radius-md)] bg-[var(--surface-alt)] p-1" role="tablist" aria-label="청감 평가 언어">
        {([{ id: 'ja', label: '일본어 30문장' }, { id: 'ko', label: '한국어 30문장' }] as const).map(({ id, label }) => (
          <button key={id} type="button" role="tab" aria-selected={language === id} onClick={() => changeLanguage(id)} className={language === id ? 'min-h-11 rounded bg-[var(--card)] text-sm font-bold text-[var(--accent)] shadow-[var(--shadow-sm)]' : 'min-h-11 rounded text-sm font-semibold text-[var(--muted-foreground)]'}>{label}</button>
        ))}
      </div>

      <section className="mb-6 grid gap-4 border-y border-[var(--border)] py-5 md:grid-cols-2">
        <label className="text-sm font-medium text-foreground">
          평가자
          <input
            value={scorecard.evaluator}
            onChange={(event) => setScorecard((current) => ({ ...current, evaluator: event.target.value }))}
            className="mt-2 h-11 w-full rounded border border-[var(--border)] bg-[var(--card)] px-3 font-normal"
            autoComplete="name"
          />
        </label>
        <label className="text-sm font-medium text-foreground">
          평가 기기
          <input
            value={scorecard.device}
            onChange={(event) => setScorecard((current) => ({ ...current, device: event.target.value }))}
            placeholder="예: iPhone 15 Plus"
            className="mt-2 h-11 w-full rounded border border-[var(--border)] bg-[var(--card)] px-3 font-normal"
          />
        </label>
        <label className="text-sm font-medium text-foreground">
          브라우저 / OS
          <input
            value={scorecard.browser}
            onChange={(event) => setScorecard((current) => ({ ...current, browser: event.target.value }))}
            className="mt-2 h-11 w-full rounded border border-[var(--border)] bg-[var(--card)] px-3 font-normal"
          />
        </label>
        <label className="text-sm font-medium text-foreground">
          평가일
          <input
            type="date"
            value={scorecard.evaluatedOn}
            onChange={(event) => setScorecard((current) => ({ ...current, evaluatedOn: event.target.value }))}
            className="mt-2 h-11 w-full rounded border border-[var(--border)] bg-[var(--card)] px-3 font-normal"
          />
        </label>
      </section>

      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[13px] text-[var(--muted-foreground)]">
              Sample {sampleIndex + 1} / {samples.length}
            </div>
            <p className="mt-2 font-serif-jp text-[22px] leading-relaxed text-foreground">{sample}</p>
          </div>
          <select
            value={sampleIndex}
            onChange={(event) => setSampleIndex(Number(event.target.value))}
            className="h-11 rounded border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
            aria-label="샘플 문장 선택"
          >
            {samples.map((text, index) => (
              <option key={text} value={index}>{index + 1}. {text.slice(0, 24)}</option>
            ))}
          </select>
        </div>
      </section>

      {playbackError && (
        <p className="mb-6 rounded-lg border border-[var(--destructive)]/35 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {playbackError}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        {providers.map((provider) => {
          const info = PROVIDER_INFO[provider];
          const key = audioQaRatingKey(provider, sampleIndex);
          const rating = scorecard.ratings[key];
          return (
            <article key={provider} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-semibold text-foreground">{info.label}</h2>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]">{info.description}</p>
                </div>
                <span className="shrink-0 rounded border border-[var(--border)] px-2 py-1 text-[10px] uppercase text-[var(--muted-foreground)]">
                  {summaries[provider]?.completedSamples ?? 0}/30
                </span>
              </div>

              <button
                type="button"
                disabled={playing !== null}
                onClick={() => void playProvider(provider)}
                className="min-h-11 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {playing === provider ? '재생 중' : '샘플 듣기'}
              </button>

              {rating?.candidate && (
                <dl className="mt-3 grid grid-cols-[64px_1fr] gap-x-2 gap-y-1 text-[11px] text-[var(--muted-foreground)]">
                  <dt>Model</dt><dd className="break-all">{rating.candidate.model}</dd>
                  <dt>Voice</dt><dd className="break-all">{rating.candidate.voice}</dd>
                  <dt>Version</dt><dd className="break-all">{rating.candidate.version}</dd>
                </dl>
              )}

              <div className="mt-4 space-y-3">
                {AUDIO_QA_CRITERIA.map((criterion) => (
                  <div key={criterion.id}>
                    <div className="mb-1 text-[12px] text-[var(--muted-foreground)]">{criterion.label}</div>
                    <div className="flex gap-1" role="radiogroup" aria-label={`${info.label} ${criterion.label}`}>
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          type="button"
                          role="radio"
                          aria-checked={rating?.scores[criterion.id] === score}
                          disabled={!rating?.candidate}
                          onClick={() => updateScore(provider, criterion.id, score)}
                          className={`h-10 min-w-10 flex-1 rounded-[var(--radius-md)] border text-sm font-medium ${
                            rating?.scores[criterion.id] === score
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                              : 'border-[var(--border)] text-[var(--muted-foreground)] disabled:opacity-35'
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <label className="mt-4 block text-[12px] text-[var(--muted-foreground)]">
                메모
                <textarea
                  value={rating?.notes ?? ''}
                  disabled={!rating?.candidate}
                  onChange={(event) => updateNotes(provider, event.target.value)}
                  className="mt-1 min-h-20 w-full resize-y rounded border border-[var(--border)] bg-[var(--card)] p-2 text-sm text-foreground disabled:opacity-35"
                />
              </label>
            </article>
          );
        })}
      </section>

      <section className="mt-6 border-y border-[var(--border)] py-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-foreground">
            최종 판정
            <select
              value={scorecard.approval}
              onChange={(event) => setScorecard((current) => ({
                ...current,
                approval: event.target.value as AudioQaScorecard['approval'],
              }))}
              className="mt-2 h-11 w-full rounded border border-[var(--border)] bg-[var(--card)] px-3 font-normal"
            >
              <option value="pending">평가 중</option>
              <option value="approved">배치 승인</option>
              <option value="rejected">전체 보류</option>
            </select>
          </label>
          <label className="text-sm font-medium text-foreground">
            승인 Provider
            <select
              value={scorecard.approvedProvider ?? ''}
              onChange={(event) => setScorecard((current) => ({
                ...current,
                approvedProvider: (event.target.value || null) as AudioQaProvider | null,
              }))}
              className="mt-2 h-11 w-full rounded border border-[var(--border)] bg-[var(--card)] px-3 font-normal"
            >
              <option value="">미선택</option>
              {providers.map((provider) => (
                <option key={provider} value={provider}>{PROVIDER_INFO[provider].label}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-4 block text-sm font-medium text-foreground">
          승인 또는 보류 근거
          <textarea
            value={scorecard.approvalNotes}
            onChange={(event) => setScorecard((current) => ({ ...current, approvalNotes: event.target.value }))}
            className="mt-2 min-h-24 w-full resize-y rounded border border-[var(--border)] bg-[var(--card)] p-3 font-normal"
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-[var(--muted-foreground)]">
            {batchApproved
              ? `배치 승인 완료: ${scorecard.approvedProvider}`
              : qaComplete
                ? '청감 입력 완료, 최종 승인과 근거가 필요합니다.'
                : 'R2 provenance가 기록된 모든 후보의 30문장을 재생하고 다섯 기준을 평가해야 합니다.'}
          </p>
          <button
            type="button"
            onClick={exportScorecard}
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-medium text-foreground hover:border-[var(--accent)]"
          >
            청감표 내보내기
          </button>
        </div>
      </section>
    </div>
  );
}

function loadScorecard(language: AudioQaLanguage): AudioQaScorecard {
  const initial = createAudioQaScorecard({
    language,
    browser: typeof navigator === 'undefined' ? '' : navigator.userAgent,
  });
  if (typeof window === 'undefined') return initial;
  try {
    const stored = JSON.parse(window.localStorage.getItem(`${STORAGE_KEY_PREFIX}:${language}`) ?? 'null') as AudioQaScorecard | null;
    return stored?.schemaVersion === 2 && stored.language === language && stored.sampleSet === initial.sampleSet ? stored : initial;
  } catch {
    return initial;
  }
}

async function playServerCandidate(provider: AudioQaProvider, sampleIndex: number, language: AudioQaLanguage): Promise<AudioQaCandidate> {
  const key = language === 'ja' ? `audio/qa/${provider}/${sampleIndex + 1}.wav` : `audio/qa/${language}/${provider}/${sampleIndex + 1}.wav`;
  const url = buildAudioUrl(key);
  const metadata = await fetch(url, { method: 'HEAD', credentials: 'include' });
  if (!metadata.ok) {
    throw new Error(`${provider} 30문장 R2 후보가 준비되지 않았습니다. (HTTP ${metadata.status})`);
  }
  const actualProvider = metadata.headers.get('x-audio-provider');
  const model = metadata.headers.get('x-audio-model');
  const version = metadata.headers.get('x-audio-version');
  if (actualProvider !== provider || !model || !version) {
    throw new Error(`${provider} 후보의 provider/model/version metadata가 불완전합니다.`);
  }

  const audio = new Audio(url);
  audio.playbackRate = audioPlayer.rate;
  await audio.play();
  return { provider, model, voice: model, version };
}
