import { useState } from 'react';
import { Volume2, Bookmark, ChevronRight } from 'lucide-react';

interface BrowseScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

interface VocabItem {
  id: number;
  kanji: string;
  kana: string;
  korean: string;
  pos: string;
  level: string;
  example: string;
  bookmarked: boolean;
}

const categories = [
  {
    id: 'level',
    name: 'レベル別',
    children: [
      { id: 'n5', name: 'N5', count: 800 },
      { id: 'n4', name: 'N4', count: 1500 },
      { id: 'n3', name: 'N3', count: 3000 },
      { id: 'n2', name: 'N2', count: 6000 },
    ],
  },
  {
    id: 'pos',
    name: '品詞別',
    children: [
      { id: 'noun', name: '名詞', count: 1200 },
      { id: 'verb', name: '動詞', count: 800 },
      { id: 'adjective', name: '形容詞', count: 400 },
      { id: 'adverb', name: '副詞', count: 350 },
    ],
  },
  {
    id: 'topic',
    name: 'トピック別',
    children: [
      { id: 'daily', name: '日常会話', count: 650 },
      { id: 'work', name: '仕事', count: 580 },
      { id: 'travel', name: '旅行', count: 420 },
      { id: 'health', name: '健康', count: 380 },
    ],
  },
];

const vocabData: VocabItem[] = [
  {
    id: 1,
    kanji: '趣味',
    kana: 'しゅみ',
    korean: '취미',
    pos: '名詞',
    level: 'N3',
    example: '趣味は読書です。',
    bookmarked: false,
  },
  {
    id: 2,
    kanji: '最近',
    kana: 'さいきん',
    korean: '최근',
    pos: '副詞',
    level: 'N3',
    example: '最近忙しいです。',
    bookmarked: true,
  },
  {
    id: 3,
    kanji: '予定',
    kana: 'よてい',
    korean: '예정',
    pos: '名詞',
    level: 'N3',
    example: '明日の予定は何ですか。',
    bookmarked: false,
  },
  {
    id: 4,
    kanji: '注文',
    kana: 'ちゅうもん',
    korean: '주문',
    pos: '名詞',
    level: 'N3',
    example: 'ご注文は何になさいますか。',
    bookmarked: false,
  },
  {
    id: 5,
    kanji: '支払い',
    kana: 'しはらい',
    korean: '지불',
    pos: '名詞',
    level: 'N3',
    example: 'クレジットカードで支払います。',
    bookmarked: true,
  },
  {
    id: 6,
    kanji: '乗り換え',
    kana: 'のりかえ',
    korean: '환승',
    pos: '名詞',
    level: 'N3',
    example: 'ここで乗り換えてください。',
    bookmarked: false,
  },
  {
    id: 7,
    kanji: '頭痛',
    kana: 'ずつう',
    korean: '두통',
    pos: '名詞',
    level: 'N3',
    example: '頭痛がします。',
    bookmarked: false,
  },
  {
    id: 8,
    kanji: '会議室',
    kana: 'かいぎしつ',
    korean: '회의실',
    pos: '名詞',
    level: 'N3',
    example: '会議室は3階にあります。',
    bookmarked: false,
  },
  {
    id: 9,
    kanji: '梅雨',
    kana: 'つゆ',
    korean: '장마',
    pos: '名詞',
    level: 'N3',
    example: '梅雨の季節が始まりました。',
    bookmarked: true,
  },
  {
    id: 10,
    kanji: '映画館',
    kana: 'えいがかん',
    korean: '영화관',
    pos: '名詞',
    level: 'N3',
    example: '映画館で映画を見ます。',
    bookmarked: false,
  },
];

export function BrowseScreen({ onNavigate }: BrowseScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('n3');
  const [expandedSection, setExpandedSection] = useState<string | null>('level');
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<number>>(
    new Set([2, 5, 9])
  );

  const toggleBookmark = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newBookmarked = new Set(bookmarkedItems);
    if (newBookmarked.has(id)) {
      newBookmarked.delete(id);
    } else {
      newBookmarked.add(id);
    }
    setBookmarkedItems(newBookmarked);
  };

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: 실제 기능 구현
  };

  const handleVocabClick = (item: VocabItem) => {
    // TODO: 실제 기능 구현
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <div className="h-full flex">
      {/* Left Column: Category Tree (280px) */}
      <div className="hidden md:block w-[280px] border-r border-border p-6 overflow-y-auto">
        <h2 className="font-sans-jp text-[15px] font-medium mb-6">カテゴリー</h2>

        <div className="space-y-4">
          {categories.map((section) => (
            <div key={section.id}>
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between py-2 text-left hover:text-accent transition-colors"
              >
                <span className="font-sans-jp text-[13px] text-foreground">
                  {section.name}
                </span>
                <ChevronRight
                  className={`w-4 h-4 text-muted transition-transform ${
                    expandedSection === section.id ? 'rotate-90' : ''
                  }`}
                  strokeWidth={1.5}
                />
              </button>

              {expandedSection === section.id && (
                <div className="ml-4 mt-2 space-y-1">
                  {section.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => setSelectedCategory(child.id)}
                      className={`w-full flex items-center justify-between py-2 px-3 rounded transition-colors relative ${
                        selectedCategory === child.id
                          ? 'bg-accent-soft text-accent border-l-2 border-accent pl-2'
                          : 'text-muted hover:text-foreground hover:bg-accent-soft/30'
                      }`}
                    >
                      <span className="font-sans-jp text-[13px] font-medium">{child.name}</span>
                      <span className="text-[11px]">{child.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Filters */}
        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="font-sans-jp text-[13px] text-muted mb-3">クイックフィルター</h3>
          <div className="space-y-2">
            <button className="w-full text-left py-2 px-3 rounded text-[13px] font-sans-jp text-muted hover:text-foreground hover:bg-accent-soft/30 transition-colors">
              ブックマーク済み
            </button>
            <button className="w-full text-left py-2 px-3 rounded text-[13px] font-sans-jp text-muted hover:text-foreground hover:bg-accent-soft/30 transition-colors">
              今週の学習
            </button>
            <button className="w-full text-left py-2 px-3 rounded text-[13px] font-sans-jp text-muted hover:text-foreground hover:bg-accent-soft/30 transition-colors">
              復習待ち
            </button>
          </div>
        </div>
      </div>

      {/* Middle Column: Vocab List */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto px-6 lg:px-12 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-serif-jp text-[36px] font-normal text-foreground leading-none mb-2">
              語彙ブラウザ
            </h1>
            <p className="text-[13px] text-muted">
              N3レベル · {vocabData.length}件の単語
            </p>
          </div>

          {/* Vocab Cards */}
          <div className="space-y-3">
            {vocabData.map((item) => (
              <div
                key={item.id}
                onClick={() => handleVocabClick(item)}
                className="card-hairline rounded-lg p-6 hover:border-accent/30 transition-all cursor-pointer hover-lift"
              >
                <div className="flex items-start gap-6">
                  {/* Kanji */}
                  <div className="flex-shrink-0">
                    <div className="font-serif-jp text-[32px] font-normal text-foreground">
                      {item.kanji}
                    </div>
                    <div className="font-sans-jp text-[13px] text-muted mt-1">
                      {item.kana}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-pretendard text-[15px] text-foreground">
                        {item.korean}
                      </span>
                      <span className="px-2 py-0.5 bg-background border border-border rounded text-[11px] text-muted">
                        {item.pos}
                      </span>
                      <span className="px-2 py-0.5 bg-accent-soft border border-accent/20 rounded text-[11px] text-accent">
                        {item.level}
                      </span>
                      {/* SRS Status Badge */}
                      {bookmarkedItems.has(item.id) && (
                        <span className="px-2 py-0.5 bg-accent-soft rounded-full text-[9px] text-accent font-medium uppercase tracking-wide flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                          Apprentice
                        </span>
                      )}
                    </div>
                    <p className="font-sans-jp text-[13px] text-muted">
                      例：{item.example}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={playAudio}
                      className="text-muted hover:text-foreground transition-colors press-feedback"
                    >
                      <Volume2 className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={(e) => toggleBookmark(item.id, e)}
                      className={`transition-colors press-feedback ${
                        bookmarkedItems.has(item.id)
                          ? 'text-accent'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      <Bookmark
                        className="w-5 h-5"
                        strokeWidth={1.5}
                        fill={bookmarkedItems.has(item.id) ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Spacer */}
          <div className="h-16" />
        </div>
      </div>
    </div>
  );
}