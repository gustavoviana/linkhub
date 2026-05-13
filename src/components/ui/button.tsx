import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', size = 'md', className, loading, disabled, children, ...rest }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 rounded-md disabled:opacity-50 disabled:cursor-not-allowed select-none';
    const sizes: Record<Size, string> = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };
    const variants: Record<Variant, string> = {
      primary: 'bg-brand text-brand-fg hover:bg-brand/90 shadow-sm',
      secondary: 'bg-bg-3 text-fg hover:bg-bg-3/70',
      ghost: 'text-fg hover:bg-bg-3',
      danger: 'bg-danger text-white hover:bg-danger/90',
      outline: 'border border-border bg-bg-2 text-fg hover:bg-bg-3',
    };
    return (
      <button
        ref={ref}
        className={cn(base, sizes[size], variants[variant], className)}
        disabled={disabled || loading}
        {...rest}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
            <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
