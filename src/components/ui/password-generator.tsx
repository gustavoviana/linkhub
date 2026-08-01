'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/portal/icons';
import { cn } from '@/lib/utils';

// Gerador de senha do painel.
//
// Duas decisões que valem explicação:
//
// `crypto.getRandomValues`, não Math.random. Math.random é previsível o
// bastante para que, sabendo o instante da geração, dê para reconstruir a
// senha — e aqui se gera senha de acesso a painel de provedor.
//
// O sorteio descarta valores acima do último múltiplo do tamanho do alfabeto
// em vez de usar `% tamanho` direto. O módulo puro faz os primeiros
// caracteres do alfabeto saírem com mais frequência que os últimos, e senha
// com distribuição torta rende menos entropia do que o medidor promete.

const GRUPOS = {
  minusculas: 'abcdefghijkmnopqrstuvwxyz',
  maiusculas: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  numeros: '23456789',
  simbolos: '!@#$%&*+-=?',
} as const;

// Com "evitar parecidos" desligado, entram os caracteres que se confundem.
const AMBIGUOS = {
  minusculas: 'l',
  maiusculas: 'IO',
  numeros: '01',
  simbolos: '',
} as const;

type Grupo = keyof typeof GRUPOS;

function sortear(alfabeto: string, tamanho: number) {
  const limite = Math.floor(256 / alfabeto.length) * alfabeto.length;
  const out: string[] = [];
  const buffer = new Uint8Array(tamanho * 2);

  while (out.length < tamanho) {
    crypto.getRandomValues(buffer);
    for (const byte of buffer) {
      if (out.length >= tamanho) break;
      if (byte >= limite) continue; // fora da faixa uniforme: descarta
      out.push(alfabeto[byte % alfabeto.length]);
    }
  }
  return out.join('');
}

export interface ForcaSenha {
  bits: number;
  rotulo: string;
  tom: 'danger' | 'warning' | 'success';
  /** 0 a 100, para a barra. */
  pct: number;
}

/**
 * Estimativa de força, em bits.
 *
 * Para senha sorteada aqui o cálculo é exato: tamanho × log2(alfabeto). Para
 * senha digitada é otimista, porque não conhece dicionário nem teclado — por
 * isso a tela chama de estimativa, e por isso há desconto para repetição e
 * sequência, que são os dois vícios mais comuns de senha inventada à mão.
 */
export function forcaDaSenha(senha: string): ForcaSenha {
  if (!senha) return { bits: 0, rotulo: 'vazia', tom: 'danger', pct: 0 };

  let alfabeto = 0;
  if (/[a-z]/.test(senha)) alfabeto += 26;
  if (/[A-Z]/.test(senha)) alfabeto += 26;
  if (/[0-9]/.test(senha)) alfabeto += 10;
  if (/[^a-zA-Z0-9]/.test(senha)) alfabeto += 20;

  let bits = senha.length * Math.log2(Math.max(alfabeto, 2));

  const distintos = new Set(senha).size;
  if (distintos < senha.length) bits *= distintos / senha.length;

  let sequencias = 0;
  for (let i = 2; i < senha.length; i++) {
    const [a, b, c] = [senha.charCodeAt(i - 2), senha.charCodeAt(i - 1), senha.charCodeAt(i)];
    if (b - a === 1 && c - b === 1) sequencias++;
  }
  bits -= sequencias * 3;

  bits = Math.max(0, Math.round(bits));

  const tom = bits >= 75 ? 'success' : bits >= 50 ? 'warning' : 'danger';
  const rotulo = bits >= 100 ? 'excelente' : bits >= 75 ? 'forte' : bits >= 50 ? 'razoável' : 'fraca';
  return { bits, rotulo, tom, pct: Math.min(100, Math.round((bits / 110) * 100)) };
}

export function PasswordGenerator({
  value,
  onChange,
  label = 'Senha',
}: {
  value: string;
  onChange: (senha: string) => void;
  label?: string;
}) {
  const [tamanho, setTamanho] = useState(16);
  const [grupos, setGrupos] = useState<Record<Grupo, boolean>>({
    minusculas: true,
    maiusculas: true,
    numeros: true,
    simbolos: true,
  });
  const [evitarParecidos, setEvitarParecidos] = useState(true);
  const [visivel, setVisivel] = useState(true);
  const [copiado, setCopiado] = useState(false);

  const gerar = useCallback(() => {
    const ativos = (Object.keys(GRUPOS) as Grupo[]).filter((g) => grupos[g]);
    if (ativos.length === 0) return;

    const alfabeto = ativos
      .map((g) => GRUPOS[g] + (evitarParecidos ? '' : AMBIGUOS[g]))
      .join('');

    // Garante ao menos um de cada grupo ativo: senha "sem número" por azar do
    // sorteio é recusada por metade dos formulários por aí.
    let senha = sortear(alfabeto, tamanho);
    for (const g of ativos) {
      const conjunto = GRUPOS[g] + (evitarParecidos ? '' : AMBIGUOS[g]);
      if (![...senha].some((c) => conjunto.includes(c))) {
        const pos = crypto.getRandomValues(new Uint8Array(1))[0] % senha.length;
        senha = senha.slice(0, pos) + sortear(conjunto, 1) + senha.slice(pos + 1);
      }
    }
    onChange(senha);
  }, [tamanho, grupos, evitarParecidos, onChange]);

  // Primeira senha ao abrir. Depois disso, só quando o usuário pedir.
  useEffect(() => {
    if (!value) gerar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const forca = forcaDaSenha(value);
  const nenhumGrupo = !Object.values(grupos).some(Boolean);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-fg-2 mb-1.5">{label}</label>
        <div className="flex gap-2">
          <input
            type={visivel ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 h-10 px-3 rounded-md border border-border bg-bg-2 font-mono text-sm tracking-wide"
            autoComplete="new-password"
            spellCheck={false}
          />
          <button
            type="button"
            title={visivel ? 'Ocultar' : 'Mostrar'}
            onClick={() => setVisivel((v) => !v)}
            className={cn(
              'w-10 h-10 rounded-md border border-border flex items-center justify-center transition-colors',
              visivel ? 'text-fg' : 'text-fg-3 hover:text-fg-2',
            )}
          >
            <Icon name="eye" size={14} />
          </button>
          <button
            type="button"
            title="Gerar outra"
            onClick={gerar}
            className="w-10 h-10 rounded-md border border-border text-fg-2 hover:text-fg hover:border-fg-3 flex items-center justify-center transition-colors"
          >
            <Icon name="refresh" size={14} />
          </button>
          <button
            type="button"
            title="Copiar"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(value);
                setCopiado(true);
                window.setTimeout(() => setCopiado(false), 2000);
              } catch {
                setCopiado(false);
              }
            }}
            className="w-10 h-10 rounded-md border border-border text-fg-2 hover:text-fg hover:border-fg-3 flex items-center justify-center transition-colors"
          >
            <Icon name={copiado ? 'check' : 'copy'} size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 rounded-full bg-bg-3 overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300',
              forca.tom === 'success' && 'bg-success',
              forca.tom === 'warning' && 'bg-warning',
              forca.tom === 'danger' && 'bg-danger',
            )}
            style={{ width: `${forca.pct}%` }}
          />
        </div>
        <span
          className={cn(
            'text-xs font-medium whitespace-nowrap',
            forca.tom === 'success' && 'text-success',
            forca.tom === 'warning' && 'text-warning',
            forca.tom === 'danger' && 'text-danger',
          )}
        >
          {forca.rotulo} · ~{forca.bits} bits
        </span>
      </div>

      <div className="rounded-md border border-border p-3 space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-xs text-fg-2 w-20 shrink-0">Tamanho</label>
          <input
            type="range"
            min={8}
            max={40}
            value={tamanho}
            onChange={(e) => setTamanho(Number(e.target.value))}
            className="flex-1 accent-[rgb(var(--brand))]"
          />
          <span className="text-xs font-mono tabular-nums w-6 text-right">{tamanho}</span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {(Object.keys(GRUPOS) as Grupo[]).map((g) => (
            <label key={g} className="flex items-center gap-1.5 text-xs text-fg-2 cursor-pointer">
              <input
                type="checkbox"
                checked={grupos[g]}
                onChange={() => setGrupos((p) => ({ ...p, [g]: !p[g] }))}
                className="w-3.5 h-3.5 accent-[rgb(var(--brand))]"
              />
              {g === 'minusculas' && 'a-z'}
              {g === 'maiusculas' && 'A-Z'}
              {g === 'numeros' && '0-9'}
              {g === 'simbolos' && '!@#$'}
            </label>
          ))}
          <label className="flex items-center gap-1.5 text-xs text-fg-2 cursor-pointer">
            <input
              type="checkbox"
              checked={evitarParecidos}
              onChange={() => setEvitarParecidos((v) => !v)}
              className="w-3.5 h-3.5 accent-[rgb(var(--brand))]"
            />
            evitar parecidos (0/O, 1/l)
          </label>
        </div>

        {nenhumGrupo && (
          <p className="text-xs text-danger">Marque pelo menos um conjunto de caracteres.</p>
        )}
      </div>
    </div>
  );
}
