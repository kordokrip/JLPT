/**
 * Ruby — 후리가나 표시 컴포넌트
 * rubyMode: 'always' | 'hover' | 'never'
 */
import * as React from 'react';
import { cn } from '../../lib/cn';
import { useSettingsStore } from '../../stores/settings-store';

interface RubyProps {
  base:     string; // 한자 (기본 문자)
  reading:  string; // 요미가나 (ruby annotation)
  className?: string;
}

export const Ruby: React.FC<RubyProps> = ({ base, reading, className }) => {
  const mode = useSettingsStore((s) => s.furiganaMode);

  if (mode === 'never') {
    return <span className={className}>{base}</span>;
  }

  return (
    <ruby
      className={cn(
        'font-sans',
        mode === 'hover' && 'group',
        className,
      )}
    >
      {base}
      <rp>(</rp>
      <rt
        className={cn(
          'text-[0.6em] text-[var(--text-secondary)]',
          mode === 'hover' && 'opacity-0 group-hover:opacity-100 transition-opacity',
        )}
      >
        {reading}
      </rt>
      <rp>)</rp>
    </ruby>
  );
};
