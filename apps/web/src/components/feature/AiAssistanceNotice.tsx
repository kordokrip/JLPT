import type { ReactNode } from 'react';

type AiAssistanceNoticeProps = {
  tone: 'info' | 'error';
  children: ReactNode;
};

/**
 * Shared accessible status surface for opt-in AI learning assistance.
 * The caller owns the translated copy and must never place learner text here.
 */
export function AiAssistanceNotice({ tone, children }: AiAssistanceNoticeProps) {
  const error = tone === 'error';
  return (
    <div
      role={error ? 'alert' : 'status'}
      aria-live={error ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={`mt-4 rounded-[var(--radius-md)] border p-4 text-sm leading-6 ${error
        ? 'border-red-300 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200'
        : 'border-[var(--border)] bg-[var(--accent-soft)] text-[var(--foreground)]'}`}
    >
      {children}
    </div>
  );
}
