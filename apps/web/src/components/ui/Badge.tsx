import * as React from 'react';
import { cn } from '../../lib/cn';

type BadgeVariant = 'default' | 'level-n5' | 'level-n4' | 'level-n3' | 'level-n2' | 'level-n1'
                 | 'srs-new' | 'srs-learning' | 'srs-review' | 'srs-relearning';

const variantMap: Record<BadgeVariant, string> = {
  'default':        'bg-[var(--muted)] text-[var(--text-secondary)]',
  'level-n5':       'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  'level-n4':       'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'level-n3':       'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'level-n2':       'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'level-n1':       'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  'srs-new':        'bg-gray-100 text-gray-600',
  'srs-learning':   'bg-amber-100 text-amber-700',
  'srs-review':     'bg-green-100 text-green-700',
  'srs-relearning': 'bg-red-100 text-red-700',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variantMap[variant],
        className,
      )}
      {...props}
    />
  ),
);
Badge.displayName = 'Badge';

/** JLPT 레벨에서 Badge variant 자동 선택 */
export function levelVariant(level: string): BadgeVariant {
  const l = level.toLowerCase();
  if (l === 'n5') return 'level-n5';
  if (l === 'n4') return 'level-n4';
  if (l === 'n3') return 'level-n3';
  if (l === 'n2') return 'level-n2';
  if (l === 'n1') return 'level-n1';
  return 'default';
}
