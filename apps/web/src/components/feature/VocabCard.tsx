/**
 * VocabCard — 어휘 단어 카드 (읽기, 의미, 레벨 배지, 오디오)
 */
import { cn } from '../../lib/cn';
import { useTranslation } from 'react-i18next';
import { Badge, levelVariant } from '../ui/Badge';
import { Ruby } from '../ui/Ruby';
import { PronunciationButton } from './PronunciationButton';
import type { VocabItem } from '../../lib/db';

interface VocabCardProps {
  item:      VocabItem;
  onClick?:  () => void;
  className?: string;
}

export function VocabCard({ item, onClick, className }: VocabCardProps) {
  const { t } = useTranslation();
  const pronunciationText = item.reading || item.word;

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
        <PronunciationButton
          compact
          text={pronunciationText}
          audioPath={item.audio_path}
          label={`${item.word} ${t('browse.playPronunciation')}`}
          className="border-0 bg-transparent p-1"
        />
      </div>
    </article>
  );
}
