/**
 * Button — shadcn/ui 스타일, asChild 패턴 지원
 */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
export type ButtonSize    = 'sm' | 'md' | 'lg' | 'icon';

const variantClasses: Record<ButtonVariant, string> = {
  primary:     'bg-primary text-white hover:bg-primary-hover active:scale-95',
  secondary:   'bg-[var(--muted)] text-[var(--text-primary)] hover:bg-[var(--surface-raised)]',
  ghost:       'text-[var(--text-primary)] hover:bg-[var(--muted)]',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
  outline:     'border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--muted)]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm:   'h-8  px-3 text-sm',
  md:   'h-10 px-4 text-sm',
  lg:   'h-12 px-6 text-base',
  icon: 'h-10 w-10',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?:    ButtonSize;
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', asChild = false, loading, className, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium',
          'transition-all duration-[var(--transition-fast)] select-none',
          'focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] focus-visible:outline-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <>
            <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden />
            {children}
          </>
        ) : children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';
