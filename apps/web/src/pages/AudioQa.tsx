import { useMemo, useState } from 'react';
import { audioPlayer, buildAudioUrl, type TtsProviderId } from '../lib/audio';
import { useSettingsStore } from '../stores/settings-store';

const SAMPLE_SENTENCES = [
  '今日は仕事が多くて、少し疲れています。',
  'この資料を明日までに確認していただけますか。',
  '駅まで歩いて十分ぐらいかかります。',
  '雨が降りそうなので、傘を持って行きましょう。',
  '新しい言葉を覚えるには、例文で練習することが大切です。',
  '会議の時間が変更になったので、予定を確認してください。',
  'この漢字の読み方をもう一度教えてください。',
  '週末は家でゆっくり休むつもりです。',
  '日本語の発音は、アクセントの位置によって意味が変わることがあります。',
  '分からない表現があれば、自然な言い方を一緒に確認しましょう。',
  '電車が遅れているため、到着が十分ほど遅れます。',
  'この問題は少し難しいですが、落ち着いて考えれば解けます。',
  '健康のために、毎日少しずつ運動しています。',
  '申し訳ありませんが、もう少しゆっくり話していただけますか。',
  '日本語で日記を書くと、文法と語彙を同時に練習できます。',
  'この店は料理がおいしいだけでなく、雰囲気もとても良いです。',
  '試験まであと一か月なので、復習の計画を立てました。',
  '友達に勧められて、この本を読むことにしました。',
  '使い方が分からない場合は、画面の案内に従ってください。',
  '昨日覚えた単語を、今日の会話で使ってみました。',
  'この文章は新聞記事のような硬い表現が多いです。',
  '旅行に行く前に、ホテルと交通手段を予約しておきます。',
  '彼は忙しいにもかかわらず、丁寧に説明してくれました。',
  '日本語らしい表現にするには、直訳を避けることも必要です。',
  '音声を聞いたあとで、同じ速さでまねして読んでください。',
  '予定が決まり次第、メールで連絡します。',
  'このアプリでは、単語、文法、読解、聴解をまとめて学習できます。',
  '最初は難しく感じても、毎日続ければ少しずつ慣れてきます。',
  '発音を確認するときは、一つ一つの音よりも文全体のリズムを意識しましょう。',
  '次の問題に進む前に、答えと解説を確認してください。',
] as const;

const PROVIDERS: Array<{
  id: TtsProviderId;
  label: string;
  status: 'ready' | 'partial' | 'not-connected';
  description: string;
}> = [
  {
    id: 'browser',
    label: 'iOS / Browser Native',
    status: 'ready',
    description: '현재 기기 브라우저에 설치된 일본어 음성을 직접 사용합니다.',
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare MeloTTS',
    status: 'partial',
    description: '운영 R2 오디오 경로를 재생합니다. 임의 문장 합성 endpoint는 공개하지 않습니다.',
  },
  {
    id: 'voicevox',
    label: 'VOICEVOX',
    status: 'partial',
    description: 'VOICEVOX_URL이 연결된 환경에서는 고정 샘플을 서버에서 생성해 비교합니다.',
  },
  {
    id: 'style-bert-vits2',
    label: 'Style-Bert-VITS2',
    status: 'not-connected',
    description: '자체 호스팅 API 서버 연결 후 감정/스타일 음성 후보로 평가합니다.',
  },
];

export default function AudioQa() {
  const { selectedVoiceURI, setTtsProvider, ttsProvider, voiceGender } = useSettingsStore();
  const [sampleIndex, setSampleIndex] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const sample = SAMPLE_SENTENCES[sampleIndex]!;
  const bestProvider = useMemo(() => {
    const entries = Object.entries(ratings);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1] - a[1])[0] ?? null;
  }, [ratings]);

  const playProvider = async (provider: TtsProviderId) => {
    setPlaying(provider);
    try {
      if (provider === 'browser') {
        await audioPlayer.speakText(sample, { voiceGender, voiceURI: selectedVoiceURI });
        return;
      }
      if (provider === 'cloudflare' || provider === 'voicevox') {
        const key = `audio/qa/${provider}/${sampleIndex + 1}.wav`;
        const audio = new Audio(buildAudioUrl(key));
        audio.playbackRate = audioPlayer.rate;
        await audio.play();
        return;
      }
    } finally {
      window.setTimeout(() => setPlaying(null), 500);
    }
  };

  const chooseProvider = (provider: TtsProviderId) => {
    setTtsProvider(provider);
    audioPlayer.sourcePreference = provider === 'browser' ? 'browser' : 'server';
  };

  return (
    <div className="mx-auto max-w-[1040px] px-5 py-8 pb-24 sm:px-8 lg:px-12">
      <header className="mb-8">
        <p className="mb-2 font-pretendard text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--accent)]">
          Audio QA
        </p>
        <h1 className="font-pretendard text-[32px] font-semibold leading-tight text-foreground">
          일본어 발음 엔진 비교
        </h1>
        <p className="mt-3 max-w-[720px] font-pretendard text-[14px] leading-relaxed text-[var(--muted-foreground)]">
          30개 고정 샘플로 현재 브라우저 음성과 서버 생성 오디오 후보를 비교합니다. VOICEVOX와
          Style-Bert-VITS2는 외부 유료 API 없이 자체 호스팅 URL이 연결된 뒤 배치 생성 후보로 평가합니다.
        </p>
      </header>

      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-pretendard text-[13px] text-[var(--muted-foreground)]">
              Sample {sampleIndex + 1} / {SAMPLE_SENTENCES.length}
            </div>
            <p className="mt-2 font-serif-jp text-[22px] leading-relaxed text-foreground">{sample}</p>
          </div>
          <select
            value={sampleIndex}
            onChange={(event) => setSampleIndex(Number(event.target.value))}
            className="rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[13px]"
            aria-label="샘플 문장 선택"
          >
            {SAMPLE_SENTENCES.map((text, index) => (
              <option key={text} value={index}>
                {index + 1}. {text.slice(0, 24)}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {PROVIDERS.map((provider) => {
          const ratingKey = `${provider.id}:${sampleIndex}`;
          const canPlay = provider.id === 'browser' || provider.id === 'cloudflare' || provider.id === 'voicevox';
          return (
            <article key={provider.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-pretendard text-[16px] font-semibold text-foreground">{provider.label}</h2>
                  <p className="mt-1 font-pretendard text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                    {provider.description}
                  </p>
                </div>
                <span className="rounded border border-[var(--border)] px-2 py-1 text-[10px] uppercase text-[var(--muted-foreground)]">
                  {provider.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!canPlay || playing === provider.id}
                  onClick={() => void playProvider(provider.id)}
                  className="rounded bg-[var(--accent)] px-3 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {playing === provider.id ? '재생 중' : canPlay ? '샘플 듣기' : '엔진 미연결'}
                </button>
                <button
                  type="button"
                  onClick={() => chooseProvider(provider.id)}
                  className={`rounded border px-3 py-2 text-[12px] transition-colors ${
                    ttsProvider === provider.id
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-foreground'
                  }`}
                >
                  기본 후보로 표시
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className="text-[12px] text-[var(--muted-foreground)]">품질 점수</span>
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setRatings((prev) => ({ ...prev, [ratingKey]: score }))}
                    className={`h-8 w-8 rounded border text-[12px] ${
                      ratings[ratingKey] === score
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--muted-foreground)]'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] p-4">
        <h2 className="font-pretendard text-[15px] font-semibold text-foreground">판정 메모</h2>
        <p className="mt-2 font-pretendard text-[13px] leading-relaxed text-[var(--muted-foreground)]">
          현재 최고 점수 후보:{' '}
          <span className="font-medium text-foreground">
            {bestProvider ? `${bestProvider[0].split(':')[0]} (${bestProvider[1]}/5)` : '아직 평가 없음'}
          </span>
          . 전체 배치 생성은 이 페이지에서 최소 30개 샘플을 비교한 뒤, 자체 호스팅 엔진 URL과 라이선스가
          확정된 provider만 R2 생성 파이프라인에 연결하는 순서가 안전합니다.
        </p>
      </section>
    </div>
  );
}
