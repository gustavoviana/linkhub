'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconHome, IconFile, IconHelp, IconUser } from './icons';
import { cn } from '@/lib/utils';

const items = [
  { href: '/', label: 'Início', icon: IconHome, match: (p: string) => p === '/' || p === '/portal' },
  { href: '/fatura', label: 'Faturas', icon: IconFile, match: (p: string) => p.startsWith('/fatura') },
  { href: '/suporte', label: 'Suporte', icon: IconHelp, match: (p: string) => p.startsWith('/suporte') },
  { href: '/conta', label: 'Conta', icon: IconUser, match: (p: string) => p.startsWith('/conta') },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg-2 border-t border-border z-30 md:relative md:bottom-auto md:border-t-0 md:border-r md:w-60 md:min-h-screen">
      <div className="flex md:flex-col md:gap-1 md:p-3 justify-around md:justify-start max-w-md mx-auto md:max-w-none">
        {items.map((it) => {
          const Icon = it.icon;
          const active = it.match(pathname);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                'flex flex-col md:flex-row items-center md:gap-3 py-3 md:py-2 px-4 md:rounded-md flex-1 md:flex-initial',
                active ? 'text-brand md:bg-brand/10' : 'text-fg-3 hover:text-fg',
              )}
            >
              <Icon size={20} />
              <span className="text-[10px] md:text-sm font-medium mt-0.5 md:mt-0">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
