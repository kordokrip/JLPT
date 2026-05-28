import { useState } from 'react';
import { Bookmark, Volume2 } from 'lucide-react';

interface GrammarScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

const grammarData = {
  pattern: '〜ながら',
  level: 'N3',
  meaning: '~하면서 (동시 동작)',
  structure: 'Verb (ます-stem) + ながら',
  explanation: '두 가지 동작이 동시에 일어날 때 사용합니다. 주된 동작은 문장의 뒷부분에 옵니다.',
  examples: [
    {
      japanese: '音楽を聞きながら、勉強します。',
      korean: '음악을 들으면서 공부합니다.',
      note: '「聞く」의 ます형 「聞き」＋ながら',
    },
    {
      japanese: 'コーヒーを飲みながら、新聞を読みます。',
      korean: '커피를 마시면서 신문을 읽습니다.',
      note: '주된 동작은 「新聞を読む」',
    },
    {
      japanese: '歩きながら、話しましょう。',
      korean: '걸으면서 이야기합시다.',
      note: '두 동작의 주체는 같아야 함',
    },
    {
      japanese: 'テレビを見ながら、ご飯を食べてはいけません。',
      korean: 'TV를 보면서 밥을 먹으면 안 됩니다.',
      note: '부정문에서도 사용 가능',
    },
  ],
  comparisons: [
    {
      pattern: '〜たり〜たりする',
      difference: '「ながら」는 동시 동작, 「たり」는 여러 동작의 나열',
      example: '音楽を聞いたり、本を読んだりします。(여러 행동 중 일부)',
    },
    {
      pattern: '〜てから',
      difference: '「ながら」는 동시, 「てから」는 순차적 동작',
      example: '手を洗ってから、食べます。(먼저 손 씻고, 그 다음 먹음)',
    },
  ],
  notes: [
    '같은 주체가 두 동작을 동시에 해야 합니다',
    '主な動作（main action）は文の後ろに来ます',
    'ながら 앞의 동작은 보조적/부수적 동작입니다',
    '名詞＋ながら の形もあります (例：残念ながら)',
  ],
  relatedGrammar: [
    '〜たり〜たりする',
    '〜ついでに',
    '〜つつ',
    '〜かたわら',
  ],
};

export function GrammarScreen({ onNavigate }: GrammarScreenProps) {
  const [activeTab, setActiveTab] = useState<'examples' | 'comparison' | 'notes'>('examples');
  const [isBookmarked, setIsBookmarked] = useState(false);

  const tabs = [
    { id: 'examples' as const, label: '例文', labelKr: '예문' },
    { id: 'comparison' as const, label: '比較', labelKr: '비교' },
    { id: 'notes' as const, label: 'メモ', labelKr: '노트' },
  ];

  return (
    <div className="max-w-[880px] mx-auto px-8 lg:px-20 py-12 pb-24">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-accent-soft border border-accent/20 rounded text-[13px] text-accent font-medium">
                {grammarData.level}
              </span>
              <span className="px-3 py-1 bg-background border border-border rounded text-[13px] text-muted">
                文法
              </span>
            </div>
            <h1 className="font-serif-jp text-[72px] font-normal text-foreground leading-none mb-4">
              {grammarData.pattern}
            </h1>
            <p className="font-pretendard text-[24px] text-accent mb-2">
              {grammarData.meaning}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => // TODO: 실제 기능 구현
              className="text-muted hover:text-foreground transition-colors press-feedback"
            >
              <Volume2 className="w-6 h-6" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`transition-colors press-feedback ${
                isBookmarked ? 'text-accent' : 'text-muted hover:text-foreground'
              }`}
            >
              <Bookmark
                className="w-6 h-6"
                strokeWidth={1.5}
                fill={isBookmarked ? 'currentColor' : 'none'}
              />
            </button>
          </div>
        </div>

        {/* Structure */}
        <div className="card-hairline rounded-lg p-8 bg-accent-soft/30">
          <h3 className="font-sans-jp text-[13px] text-muted mb-3">構造</h3>
          <p className="font-sans-jp text-[18px] text-foreground font-medium">
            {grammarData.structure}
          </p>
        </div>
      </div>

      {/* Explanation */}
      <div className="mb-12">
        <h2 className="font-sans-jp text-[18px] font-medium mb-4">説明</h2>
        <p className="font-pretendard text-[15px] text-foreground leading-relaxed">
          {grammarData.explanation}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="flex gap-2 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 relative transition-colors ${
                activeTab === tab.id
                  ? 'text-accent'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-sans-jp text-[14px]">{tab.label}</span>
                <span className="font-pretendard text-[12px]">({tab.labelKr})</span>
              </div>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'examples' && (
          <div className="space-y-8">
            {grammarData.examples.map((example, index) => (
              <div key={index} className="card-hairline rounded-lg p-8">
                {/* Japanese Example */}
                <div className="font-sans-jp text-[24px] text-foreground mb-4 text-jp-body">
                  {example.japanese}
                </div>

                {/* Korean Translation */}
                <div className="font-pretendard text-[15px] text-muted mb-4">
                  {example.korean}
                </div>

                {/* Note */}
                <div className="pt-4 border-t border-border">
                  <p className="font-pretendard text-[13px] text-accent">
                    💡 {example.note}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'comparison' && (
          <div className="space-y-6">
            {grammarData.comparisons.map((comp, index) => (
              <div key={index} className="card-hairline rounded-lg p-8">
                <h3 className="font-serif-jp text-[24px] text-foreground mb-3">
                  {comp.pattern}
                </h3>
                <p className="font-pretendard text-[14px] text-muted mb-4">
                  {comp.difference}
                </p>
                <div className="pt-4 border-t border-border">
                  <p className="font-sans-jp text-[15px] text-foreground text-jp-body">
                    {comp.example}
                  </p>
                </div>
              </div>
            ))}

            {/* Related Grammar */}
            <div className="mt-8">
              <h3 className="font-sans-jp text-[15px] font-medium mb-4">関連文法</h3>
              <div className="flex flex-wrap gap-3">
                {grammarData.relatedGrammar.map((pattern, index) => (
                  <button
                    key={index}
                    className="px-4 py-2 card-hairline rounded-lg hover:border-accent/30 transition-all hover-lift"
                  >
                    <span className="font-sans-jp text-[14px] text-foreground">
                      {pattern}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-4">
            {grammarData.notes.map((note, index) => (
              <div
                key={index}
                className="flex gap-4 p-6 card-hairline rounded-lg bg-background"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-soft flex items-center justify-center text-accent text-[13px] font-medium">
                  {index + 1}
                </div>
                <p className="font-pretendard text-[14px] text-foreground leading-relaxed">
                  {note}
                </p>
              </div>
            ))}

            {/* Add to SRS */}
            <div className="mt-8 pt-8 border-t border-border">
              <button className="w-full py-4 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity press-feedback">
                <span className="font-sans-jp text-[14px]">SRSに追加する</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Spacer */}
      <div className="h-16" />
    </div>
  );
}