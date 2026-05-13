import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-border bg-bg-2 px-3 text-sm text-fg placeholder:text-fg-3',
        'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[80px] w-full rounded-md border border-border bg-bg-2 px-3 py-2 text-sm text-fg placeholder:text-fg-3',
        'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand',
        className,
      )}
      {...rest}
    />
  ),
);
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...rest }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-border bg-bg-2 px-3 text-sm text-fg',
        'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand',
        className,
      )}
      {...rest}
    />
  ),
);
Select.displayName = 'Select';

export function Label({ children, htmlFor, className }: { children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn('block text-xs font-medium text-fg-2 mb-1.5', className)}>
      {children}
    </label>
  );
}

export function Field({ label, children, error, hint }: { label?: string; children: React.ReactNode; error?: string; hint?: string }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-fg-3">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
