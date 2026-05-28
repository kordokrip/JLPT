import * as React from 'react';
import { cn } from '../../lib/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:   string;
  error?:   string;
  leading?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leading, className, id, ...props }, ref) => {
    const inputId = id ?? React.useId();
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--text-primary)]">
            {label}
          </label>
        )}
        <div className="relative">
          {leading && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              {leading}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'h-10 w-full rounded-[var(--radius)] bg-[var(--input-bg)] px-3 text-sm',
              'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
              'border border-[var(--border)] outline-none',
              'focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
              'transition-colors duration-[var(--transition-fast)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              leading ? 'pl-9' : '',
              error ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-200' : '',
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
