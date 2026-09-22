import './globals.css';
import type { Metadata } from 'next';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';

// As duas fontes do protótipo, servidas pelo próprio app. Antes o CSS pedia
// 'Plus Jakarta Sans' e ninguém carregava: quem não tinha a fonte instalada
// via a central em Segoe UI. E o Chrome que tira os screenshots das lojas não
// tem fonte nenhuma instalada — sem isto, print de app com quadradinho.

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'LinkHub — Central do Cliente para Provedores',
  description: 'Plataforma multi-tenant de central do cliente para provedores de internet. Integra com IXC, SGP, Hubsoft e mais.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Marca que ha JavaScript, antes da primeira pintura. E o que autoriza
            o CSS a esconder as secoes que entram com scroll — ver .lh-reveal
            em globals.css. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.dataset.js='on'" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
