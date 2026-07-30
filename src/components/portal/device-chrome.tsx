'use client';

// Cromo do aparelho: barra de status, ilha dinâmica e indicador de home.
// Nada disso é do app — é o que o iPhone desenha por cima dele. Fica aqui
// porque duas telas precisam: o mockup da página de marca (que simula o
// aparelho inteiro, ilha preta inclusive) e os screenshots das lojas, que
// levam só a barra de status, como num print de verdade do iPhone.

/** iPhone 16 Pro Max em pontos. Vezes 3 dá 1320×2868, o tamanho da App Store. */
export const IPHONE_16_PRO_MAX = { width: 440, height: 956 };

/** Área segura do topo: nada do app pode começar acima disso. */
export const SAFE_TOP = 62;
/** Área segura de baixo, onde mora o risquinho do gesto de home. */
export const SAFE_BOTTOM = 34;

/**
 * Barra de status. `scale` é 1 no tamanho do aparelho e menor no mockup, que
 * mostra o celular reduzido — todas as medidas acompanham. No Android ela é
 * bem mais baixa e discreta que no iPhone.
 */
export function StatusBar({
  color,
  scale = 1,
  variant = 'ios',
}: {
  color: string;
  scale?: number;
  variant?: 'ios' | 'android';
}) {
  const ios = variant === 'ios';
  const s = (n: number) => n * scale;
  const m = ios ? 1 : 0.78;

  return (
    <div
      className="pointer-events-none select-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: ios ? s(54) : s(30),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `0 ${ios ? s(28) : s(14)}px`,
        color,
      }}
    >
      {/* 9:41 — a hora que a Apple usa em todo material do iPhone. */}
      <span
        style={{
          fontSize: ios ? s(17) : s(13),
          fontWeight: 600,
          letterSpacing: '-0.01em',
          fontVariantNumeric: 'tabular-nums',
          paddingTop: ios ? s(4) : 0,
        }}
      >
        9:41
      </span>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: s(6) * m,
          paddingTop: ios ? s(4) : 0,
        }}
      >
        <svg width={s(18) * m} height={s(12) * m} viewBox="0 0 17 11" fill={color} aria-hidden>
          <rect x="0" y="7.5" width="3" height="3.5" rx="1" />
          <rect x="4.5" y="5.5" width="3" height="5.5" rx="1" />
          <rect x="9" y="3" width="3" height="8" rx="1" />
          <rect x="13.5" y="0.5" width="3" height="10.5" rx="1" />
        </svg>
        <svg width={s(17) * m} height={s(12) * m} viewBox="0 0 15 11" fill="none" stroke={color} aria-hidden>
          <path d="M1 3.6a9.5 9.5 0 0 1 13 0" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M3.6 6.4a5.8 5.8 0 0 1 7.8 0" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="7.5" cy="9.3" r="1.1" fill={color} stroke="none" />
        </svg>
        <svg width={s(27) * m} height={s(13) * m} viewBox="0 0 25 12" aria-hidden>
          <rect
            x="0.6"
            y="0.6"
            width="21"
            height="10.8"
            rx="3"
            fill="none"
            stroke={color}
            strokeOpacity="0.4"
            strokeWidth="1.2"
          />
          <rect x="2.4" y="2.4" width="16" height="7.2" rx="1.8" fill={color} />
          <path d="M23 4.2v3.6a2 2 0 0 0 0-3.6Z" fill={color} fillOpacity="0.5" />
        </svg>
      </span>
    </div>
  );
}

/**
 * A pílula preta do topo. Só no mockup: num print de verdade do iPhone ela
 * não aparece — o recorte é físico, não faz parte da imagem capturada.
 */
export function DynamicIsland({ scale = 1 }: { scale?: number }) {
  return (
    <div
      className="pointer-events-none"
      style={{
        position: 'absolute',
        top: 11 * scale,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 125 * scale,
        height: 37 * scale,
        borderRadius: 999,
        background: '#000',
      }}
    />
  );
}

/** O risquinho do gesto de home. */
export function HomeIndicator({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <div
      className="pointer-events-none"
      style={{
        position: 'absolute',
        bottom: 9 * scale,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 140 * scale,
        height: Math.max(3, 5 * scale),
        borderRadius: 999,
        background: color,
        opacity: 0.35,
      }}
    />
  );
}
