interface HomeScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  return (
    <div className="max-w-[880px] mx-auto px-7 py-6 pb-24">
      {/* Date Header */}
      <div className="mb-4">
        <h1 className="font-serif-jp text-[34px] font-extralight text-foreground leading-none tracking-tight mb-1">
          5月 24日
        </h1>
        <p className="text-[11px] text-muted tracking-[0.08em]">
          日曜日 · Week 7 of 16
        </p>
      </div>

      {/* Personal Greeting */}
      <div className="mb-5">
        <p className="font-pretendard text-[15px] font-normal text-foreground">
          성호님, 오늘도 천천히.
        </p>
      </div>

      {/* THE FOCUS CARD */}
      <div className="rounded-xl bg-background p-5 mb-5 border-[0.5px] border-border">
        <div className="flex items-center gap-5">
          {/* Left: Progress Ring */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="relative w-[80px] h-[80px]">
              {/* SVG Progress Ring */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                {/* Track */}
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  fill="none"
                  stroke="#DDD8D0"
                  strokeWidth="5"
                />
                {/* Progress */}
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="5"
                  strokeDasharray={`${0.64 * 2 * Math.PI * 32} ${2 * Math.PI * 32}`}
                  strokeLinecap="round"
                />
              </svg>
              {/* Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-medium text-[16px] text-foreground">
                  64%
                </div>
                <div className="text-[8px] text-muted">이번 주</div>
              </div>
            </div>
          </div>

          {/* Right: Progress Bars */}
          <div className="flex-1 space-y-2">
            {/* Vocab */}
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] text-foreground font-medium">어휘 (語彙)</span>
                <span className="text-[10px] text-muted">234/360</span>
              </div>
              <div className="h-[3px] bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{ width: '65%' }}
                />
              </div>
            </div>

            {/* Grammar */}
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] text-foreground font-medium">문법 (文法)</span>
                <span className="text-[10px] text-muted">28/45</span>
              </div>
              <div className="h-[3px] bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{ width: '62%' }}
                />
              </div>
            </div>

            {/* Listening */}
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] text-foreground font-medium">청해 (聴解)</span>
                <span className="text-[10px] text-muted">1.2h/2.0h</span>
              </div>
              <div className="h-[3px] bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{ width: '60%' }}
                />
              </div>
            </div>

            {/* Link */}
            <div className="pt-2">
              <button
                onClick={() => onNavigate('curriculum')}
                className="text-[10px] text-accent hover:opacity-80 transition-opacity"
              >
                今週の詳細 →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Tasks */}
      <div className="mb-5">
        <h2 className="text-[14px] font-medium mb-3">
          오늘 할 일
        </h2>
        <div className="space-y-0 border-t-[0.5px] border-border">
          <button
            onClick={() => onNavigate('review')}
            className="w-full flex items-center gap-2 py-3 border-b-[0.5px] border-border hover:bg-accent-soft/30 transition-colors"
          >
            <span className="text-accent font-medium text-[12px] min-w-[14px]">1.</span>
            <div className="flex-1 text-left">
              <div className="font-sans-jp text-[12px] font-medium">復習カード 28枚</div>
              <div className="font-pretendard text-[10px] text-muted mt-0.5">SRS 복습</div>
            </div>
            <span className="text-[10px] text-muted">약 12분</span>
          </button>

          <button
            onClick={() => onNavigate('browse', { filter: 'N3' })}
            className="w-full flex items-center gap-2 py-3 border-b-[0.5px] border-border hover:bg-accent-soft/30 transition-colors"
          >
            <span className="text-accent font-medium text-[12px] min-w-[14px]">2.</span>
            <div className="flex-1 text-left">
              <div className="font-sans-jp text-[12px] font-medium">新しい単語 30個</div>
              <div className="font-pretendard text-[10px] text-muted mt-0.5">신규 어휘</div>
            </div>
            <span className="text-[10px] text-muted">약 18분</span>
          </button>

          <button
            onClick={() => // TODO: 실제 기능 구현
            className="w-full flex items-center gap-2 py-3 border-b-[0.5px] border-border hover:bg-accent-soft/30 transition-colors"
          >
            <span className="text-accent font-medium text-[12px] min-w-[14px]">3.</span>
            <div className="flex-1 text-left">
              <div className="font-sans-jp text-[12px] font-medium">リスニング Track 03</div>
              <div className="font-pretendard text-[10px] text-muted mt-0.5">청해</div>
            </div>
            <span className="text-[10px] text-muted">10분</span>
          </button>
        </div>
      </div>

      {/* Daily Sentence */}
      <div className="mt-5">
        <h2 className="font-sans-jp text-[14px] mb-3">今日の一文</h2>

        <div className="border-[0.5px] border-border rounded-xl p-5 bg-card">
          {/* Japanese Sentence with Furigana */}
          <div className="font-serif-jp text-[18px] font-light mb-1.5 text-jp-body">
            <ruby>
              天気<rt className="text-[10px]">てんき</rt>
            </ruby>
            が
            <ruby>
              良<rt className="text-[10px]">よ</rt>
            </ruby>
            ければ、
            <ruby>
              公園<rt className="text-[10px]">こうえん</rt>
            </ruby>
            に
            <ruby>
              行<rt className="text-[10px]">い</rt>
            </ruby>
            きます。
          </div>

          {/* Korean Translation */}
          <p className="font-pretendard text-[11px] text-muted mb-3">
            날씨가 좋으면 공원에 갑니다.
          </p>

          {/* Tags */}
          <div className="flex gap-1.5 mb-3">
            <span className="px-2 py-0.5 bg-accent-soft text-[9px] text-accent rounded-full tracking-[0.04em]">
              N3
            </span>
            <span className="px-2 py-0.5 bg-accent-soft text-[9px] text-accent rounded-full tracking-[0.04em]">
              문법
            </span>
            <span className="px-2 py-0.5 bg-accent-soft text-[9px] text-accent rounded-full tracking-[0.04em]">
              Week 07
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-3 border-t-[0.5px] border-border">
            <button className="text-muted hover:text-foreground transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
            </button>
            <button className="text-muted hover:text-foreground transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
            </button>
            <button className="text-accent hover:opacity-80 transition-opacity flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-[11px] font-sans-jp">SRS追加</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
