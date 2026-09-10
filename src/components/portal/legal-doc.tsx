'use client';

// Página de documento jurídico — política de privacidade e termos de uso.
//
// O texto nasce corrido, para caber num campo de copiar e colar da loja. Aqui
// ele ganha hierarquia: título, data, seções numeradas e listas. Quem lê isto
// é o assinante procurando uma cláusula específica e o revisor da loja
// conferindo se o documento existe e fala do app certo — os dois precisam
// varrer a página com o olho, não ler do começo ao fim.

import Link from 'next/link';
import type { Tenant } from '@/lib/supabase/types';
import type { DocumentoLegal } from '@/lib/tenant/legal';
import { usePortalTokens } from './theme';
import { BrandMark } from './ui';
import type { PortalTokens } from './tokens';

/** "POLÍTICA DE PRIVACIDADE — APLICATIVO LM NET" vira título e subtítulo. */
function partirTitulo(titulo: string): { principal: string; complemento: string | null } {
  const [principal, ...resto] = titulo.split('—');
  return {
    principal: (principal ?? titulo).trim(),
    complemento: resto.length ? resto.join('—').trim() : null,
  };
}

/** Um bloco pode ser parágrafo ou lista. Os textos usam dois tipos de lista:
 *  traço, que vira marcador de verdade, e alínea ("a)", "b)"), que já carrega
 *  o próprio marcador e não pode ganhar outro em cima. */
function Bloco({ texto, t }: { texto: string; t: PortalTokens }) {
  const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean);
  const multiplas = linhas.length > 1;
  const comTraco = multiplas && linhas.every((l) => /^-\s/.test(l));
  const comAlinea = multiplas && linhas.every((l) => /^[a-z]\)\s/.test(l));

  if (comTraco || comAlinea) {
    return (
      <ul
        style={{
          margin: '0 0 14px',
          paddingLeft: 20,
          // O preflight do Tailwind zera list-style em toda lista da página.
          // Sem reativar aqui, o marcador some e o item vira parágrafo torto.
          listStyleType: comTraco ? 'disc' : 'none',
          display: 'grid',
          gap: 7,
        }}
      >
        {linhas.map((linha, i) => (
          <li key={i} style={{ fontSize: 14.5, lineHeight: 1.65, color: t.text2 }}>
            {comTraco ? linha.replace(/^-\s/, '') : linha}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      {linhas.map((linha, i) => (
        <p key={i} style={{ margin: '0 0 14px', fontSize: 14.5, lineHeight: 1.7, color: t.text2 }}>
          {linha}
        </p>
      ))}
    </>
  );
}

export function LegalDoc({
  tenant,
  documento,
  outro,
}: {
  tenant: Tenant;
  documento: DocumentoLegal;
  outro: { label: string; href: string };
}) {
  const t = usePortalTokens(tenant);
  const { principal, complemento } = partirTitulo(documento.titulo);

  return (
    <div style={{ background: t.bg, minHeight: '100vh', color: t.text }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 64px' }}>
        <Link
          href="/"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: t.text }}
        >
          <BrandMark tenant={tenant} t={t} size={28} showName={false} />
          {!tenant.logo_url && <span style={{ fontSize: 14, fontWeight: 700 }}>{tenant.name}</span>}
        </Link>

        <header style={{ margin: '28px 0 24px', paddingBottom: 20, borderBottom: `1px solid ${t.border}` }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {principal}
          </h1>
          {complemento && (
            <div style={{ marginTop: 6, fontSize: 13.5, color: t.text3 }}>{complemento}</div>
          )}
          {documento.atualizadoEm && (
            <div style={{ marginTop: 14, fontSize: 12.5, color: t.text3 }}>
              Última atualização: {documento.atualizadoEm}
            </div>
          )}
        </header>

        {documento.secoes.map((secao, i) => (
          <section key={i} style={{ marginBottom: 26 }}>
            {secao.titulo && (
              <h2
                style={{
                  margin: '0 0 10px',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: t.accent,
                }}
              >
                {secao.titulo}
              </h2>
            )}
            {secao.paragrafos.map((p, j) => (
              <Bloco key={j} texto={p} t={t} />
            ))}
          </section>
        ))}

        <footer
          style={{
            marginTop: 40,
            paddingTop: 20,
            borderTop: `1px solid ${t.border}`,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            fontSize: 13.5,
          }}
        >
          <Link href={outro.href} style={{ color: t.accent, textDecoration: 'none', fontWeight: 600 }}>
            {outro.label}
          </Link>
          <Link href="/suporte" style={{ color: t.text2, textDecoration: 'none' }}>
            Falar com o suporte
          </Link>
          <Link href="/" style={{ color: t.text2, textDecoration: 'none' }}>
            Voltar para a central
          </Link>
        </footer>
      </div>
    </div>
  );
}
