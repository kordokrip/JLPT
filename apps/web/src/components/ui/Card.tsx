import * as React from 'react';
import { cn } from '../../lib/cn';

// ─────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ elevated = false, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-[var(--radius)] bg-[var(--card)] border border-[var(--card-border)]',
        elevated ? 'shadow-md' : 'shadow-sm',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1.5 p-5 pb-0', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('font-semibold text-base text-[var(--card-foreground)]', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center px-5 pb-5 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';
