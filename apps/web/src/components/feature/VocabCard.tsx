/**
 * VocabCard — 어휘 단어 카드 (읽기, 의미, 레벨 배지, 오디오)
 */
import { cn } from '../../lib/cn';
import { useTranslation } from 'react-i18next';
import { Badge, levelVariant } from '../ui/Badge';
import { Ruby } from '../ui/Ruby';
import { audioPlayer } from '../../lib/audio';
import type { VocabItem } from '../../lib/db';

interface VocabCardProps {
  item:      VocabItem;
  onClick?:  () => void;
  className?: string;
}

export function VocabCard({ item, onClick, className }: VocabCardProps) {
  const { t } = useTranslation();
  const handleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.audio_path) {
      audioPlayer.play(item.audio_path, item.reading || item.word).catch(() => {/* ignore */});
    }
  };

  return (
    <article
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      onClick={onClick}
      className={cn(
        'flex items-start justify-between gap-4 rounded-[var(--radius)] bg-[var(--card)]',
        'border border-[var(--card-border)] shadow-sm p-4',
        onClick && 'cursor-pointer hover:bg-[var(--surface-raised)] transition-colors',
        className,
      )}
    >
      <div className="flex flex-col gap-1 min-w-0">
        {/* 표기 + 요미가나 */}
        <div className="text-xl font-bold text-[var(--text-primary)]">
          {item.reading ? (
            <Ruby base={item.word} reading={item.reading} />
          ) : (
            item.word
          )}
        </div>
        {/* 의미 */}
        <p className="text-sm text-[var(--text-secondary)] truncate">
          {item.meaning}
        </p>
        {/* 예문 (있으면) */}
        {item.example_jp && (
          <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{item.example_jp}</p>
        )}
      </div>

      {/* 우측: 레벨 배지 + 오디오 */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <Badge variant={levelVariant(item.level)}>{item.level.toUpperCase()}</Badge>
        {item.audio_path && (
          <button
            onClick={handleAudio}
            aria-label={`${item.word} ${t('browse.playPronunciation')}`}
            className="text-[var(--text-muted)] hover:text-primary transition-colors rounded-full p-1"
          >
            <SpeakerIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </article>
  );
}

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  );
}
