import { useState, useEffect } from 'react';
import { Volume2, RotateCw } from 'lucide-react';

interface ReviewScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

interface ReviewCard {
  id: number;
  kanji: string;
  kana: string;
  korean: string;
  pos: string;
  example: string;
  exampleKorean: string;
}

const reviewCards: ReviewCard[] = [
  {
    id: 1,
    kanji: '趣味',
    kana: 'しゅみ',
    korean: '취미',
    pos: '名詞',
    example: '私の趣味は読書と映画鑑賞です。',
    exampleKorean: '제 취미는 독서와 영화 감상입니다.',
  },
  {
    id: 2,
    kanji: '最近',
    kana: 'さいきん',
    korean: '최근',
    pos: '副詞',
    example: '最近、日本語の勉強を始めました。',
    exampleKorean: '최근에 일본어 공부를 시작했습니다.',
  },
  {
    id: 3,
    kanji: '予定',
    kana: 'よてい',
    korean: '예정',
    pos: '名詞',
    example: '明日の予定は何ですか。',
    exampleKorean: '내일 예정이 뭐예요?',
  },
  {
    id: 4,
    kanji: '注文',
    kana: 'ちゅうもん',
    korean: '주문',
    pos: '名詞',
    example: 'ご注文は何になさいますか。',
    exampleKorean: '주문은 무엇으로 하시겠습니까?',
  },
  {
    id: 5,
    kanji: '支払い',
    kana: 'しはらい',
    korean: '지불',
    pos: '名詞',
    example: 'クレジットカードで支払います。',
    exampleKorean: '신용카드로 결제합니다.',
  },
];

export function ReviewScreen({ onNavigate }: ReviewScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const currentCard = reviewCards[currentIndex];
  const totalCards = reviewCards.length;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleRating = (rating: number) => {
    if (!isFlipped) return;

    // Move to next card
    if (currentIndex < totalCards - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setCompletedCount(completedCount + 1);
    } else {
      // Finished all cards
      setCompletedCount(completedCount + 1);
      setTimeout(() => {
        onNavigate('home');
      }, 1000);
    }
  };

  const handlePlayAudio = () => {
    // TODO: 실제 기능 구현
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!isFlipped) {
          handleFlip();
        }
      } else if (isFlipped) {
        if (e.key === '1') handleRating(1);
        else if (e.key === '2') handleRating(2);
        else if (e.key === '3') handleRating(3);
        else if (e.key === '4') handleRating(4);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentIndex]);

  if (completedCount === totalCards) {
    return (
      <div className="max-w-[880px] mx-auto px-8 py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-6">
            <RotateCw className="w-10 h-10 text-accent" strokeWidth={1.5} />
          </div>
          <h1 className="font-serif-jp text-[48px] font-normal text-foreground mb-4">
            お疲れ様でした
          </h1>
          <p className="font-pretendard text-[15px] text-muted mb-8">
            {totalCards}장의 카드를 복습했습니다
          </p>
          <button
            onClick={() => onNavigate('home')}
            className="px-6 py-3 bg-accent text-accent-foreground rounded-lg text-[14px] font-medium hover:opacity-90 transition-opacity"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[880px] mx-auto px-7 py-5">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="font-serif-jp text-[22px] font-normal text-foreground leading-none">
            復習
          </h1>
          <p className="text-[10px] text-muted mt-0.5">
            SRS 스페이스드 리피티션
          </p>
        </div>
        <div className="text-right">
          <div className="font-medium text-[18px] text-foreground">
            {currentIndex + 1} / {totalCards}
          </div>
          <div className="text-[9px] text-muted">
            {completedCount} completed
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-[2px] bg-border rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
        />
      </div>

      {/* Card Flip Container */}
      <div className="perspective-1000 mb-3">
        <div
          className="relative w-full transition-transform duration-[500ms] preserve-3d cursor-pointer"
          style={{
            height: '210px',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transformStyle: 'preserve-3d',
          }}
          onClick={handleFlip}
        >
          {/* Front Side */}
          <div
            className="absolute inset-0 backface-hidden border-[0.5px] border-border rounded-2xl bg-card p-5 flex flex-col items-center justify-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="text-center w-full">
              {/* SRS Level Badge */}
              <div className="mb-3">
                <span className="px-2 py-0.5 bg-accent-soft rounded-full text-[8px] text-accent font-medium uppercase tracking-[0.1em] inline-flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-accent"></span>
                  Apprentice
                </span>
              </div>

              {/* Kanji */}
              <div className="font-serif-jp text-[60px] font-light text-foreground mb-1">
                {currentCard.kanji}
              </div>

              {/* POS */}
              <div className="text-[9px] text-muted uppercase tracking-[0.12em]">
                {currentCard.pos}
              </div>

              {/* Hint - Single instance at bottom */}
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <p className="text-[10px] text-muted tracking-[0.04em]">
                  탭하여 확인 →
                </p>
              </div>
            </div>
          </div>

          {/* Back Side */}
          <div
            className="absolute inset-0 backface-hidden border-[0.5px] border-border rounded-2xl bg-card p-5 flex flex-col"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            {/* SRS Level Badge */}
            <div className="mb-2">
              <span className="px-2 py-0.5 bg-accent-soft rounded-full text-[8px] text-accent font-medium uppercase tracking-[0.1em] inline-flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-accent"></span>
                Apprentice
              </span>
            </div>

            {/* Reading + Meaning */}
            <div className="mb-2">
              <div className="font-serif-jp text-[20px] font-light text-foreground mb-1 tracking-[0.06em]">
                {currentCard.kana}
              </div>
              <div className="font-pretendard text-[13px] text-foreground font-medium">
                {currentCard.korean}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t-[0.5px] border-border my-2" />

            {/* Example */}
            <div>
              <div className="text-[8px] uppercase tracking-[0.12em] text-muted mb-1">예문 · 例文</div>
              <p className="font-sans-jp text-[11px] text-muted text-jp-body mb-0.5">
                {currentCard.example}
              </p>
              <p className="font-pretendard text-[10px] text-muted">
                {currentCard.exampleKorean}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Buttons - Only show when flipped */}
      {isFlipped && (
        <>
          <div className="text-center mb-2">
            <p className="text-[9px] uppercase tracking-[0.1em] text-muted">
              평가를 선택하세요
            </p>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRating(1);
            }}
            className="flex flex-col items-center gap-0.5 py-2 bg-card border-[0.5px] border-accent rounded-lg hover:bg-accent-soft/30 transition-all press-feedback"
          >
            <div className="font-sans-jp text-[18px] text-foreground mb-1">また</div>
            <div className="text-[9px] uppercase tracking-wide text-muted">Again</div>
            <div className="text-[9px] text-muted mt-1">&lt; 1分</div>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRating(2);
            }}
            className="flex flex-col items-center gap-0.5 py-2 bg-card border-[0.5px] border-border rounded-lg hover:bg-background transition-all press-feedback"
          >
            <div className="font-sans-jp text-[18px] text-foreground mb-1">難</div>
            <div className="text-[9px] uppercase tracking-wide text-muted">Hard</div>
            <div className="text-[9px] text-muted mt-1">10分</div>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRating(3);
            }}
            className="flex flex-col items-center gap-0.5 py-2 bg-card border-[0.5px] border-success rounded-lg hover:bg-success/10 transition-all press-feedback"
          >
            <div className="font-sans-jp text-[18px] text-foreground mb-1">良</div>
            <div className="text-[9px] uppercase tracking-wide text-muted">Good</div>
            <div className="text-[9px] text-muted mt-1">1日</div>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRating(4);
            }}
            className="flex flex-col items-center gap-0.5 py-2 bg-card border-[0.5px] border-info rounded-lg hover:bg-info/10 transition-all press-feedback"
          >
            <div className="font-sans-jp text-[18px] text-foreground mb-1">易</div>
            <div className="text-[9px] uppercase tracking-wide text-muted">Easy</div>
            <div className="text-[9px] text-muted mt-1">4日</div>
          </button>
        </div>
        </>
      )}

      {/* Keyboard Hints */}
      {!isFlipped && (
        <div className="text-center mb-8">
          <p className="text-[11px] text-muted">
            Space / Enter / クリックで裏返す
          </p>
        </div>
      )}
    </div>
  );
}