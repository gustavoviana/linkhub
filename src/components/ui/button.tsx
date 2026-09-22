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
    const base =
      'inline-flex items-center justify-center gap-2 font-bold tracking-[-0.01em] rounded-[10px] select-none ' +
      'transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.98] ' +
      'disabled:opacity-55 disabled:cursor-not-allowed disabled:active:scale-100';
    const sizes: Record<Size, string> = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-[13px]',
      lg: 'h-12 px-6 text-sm',
    };
    const variants: Record<Variant, string> = {
      primary: 'bg-brand text-brand-fg hover:bg-brand/85',
      secondary: 'bg-bg-3 text-fg border border-border hover:border-border-strong',
      ghost: 'text-fg-2 hover:text-fg hover:bg-bg-3',
      danger: 'bg-danger/12 text-danger border border-danger/30 hover:bg-danger/20',
      outline: 'border border-border-strong bg-transparent text-fg hover:bg-bg-3 hover:border-fg-3',
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
