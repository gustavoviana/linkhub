import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-bg-2 border border-border rounded-lg shadow-sm', className)}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4 border-b border-border', className)} {...rest} />;
}

export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={cn('text-base font-semibold leading-tight', className)}>{children}</h3>;
}

export function CardSubtitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn('text-xs text-fg-2 mt-0.5', className)}>{children}</p>;
}

export function CardBody({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-3 border-t border-border bg-bg-3/50 rounded-b-lg', className)} {...rest} />;
}
