import * as React from 'react';
import { cn } from '../../lib/cn';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value:   number;   // 0–100
  max?:    number;
  size?:   'sm' | 'md';
  color?:  'primary' | 'green' | 'amber';
}

const colorMap = {
  primary: 'bg-primary',
  green:   'bg-green-500',
  amber:   'bg-amber-500',
};

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, max = 100, size = 'md', color = 'primary', className, ...props }, ref) => {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemax={max}
        aria-valuemin={0}
        className={cn(
          'w-full rounded-full bg-[var(--muted)] overflow-hidden',
          size === 'sm' ? 'h-1.5' : 'h-2.5',
          className,
        )}
        {...props}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', colorMap[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  },
);
Progress.displayName = 'Progress';
