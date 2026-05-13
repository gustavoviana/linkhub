import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LinkHub — Central do Cliente para Provedores',
  description: 'Plataforma multi-tenant de central do cliente para provedores de internet. Integra com IXC, SGP, Hubsoft e mais.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
