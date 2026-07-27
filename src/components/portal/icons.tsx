// Ícones do portal. Os traçados vêm do protótipo (docs/prototipo/src/shared.jsx)
// para o desenho bater com o que foi aprovado.
//
// Dois formatos convivem: <Icon name="pix"/>, usado nas telas portadas do
// protótipo, e os exports nomeados (IconHome, IconFile...) que já estavam em uso.

export type IconName =
  | 'wifi' | 'pix' | 'barcode' | 'download' | 'check' | 'chevron' | 'home' | 'file'
  | 'ticket' | 'user' | 'flash' | 'settings' | 'lock' | 'eye' | 'arrow-right' | 'plus'
  | 'copy' | 'bell' | 'shield' | 'help' | 'speed' | 'logout' | 'menu' | 'qr' | 'card'
  | 'phone' | 'mail' | 'sun' | 'moon' | 'send' | 'chat' | 'refresh' | 'router'
  | 'stats' | 'globe' | 'building' | 'x' | 'logo' | 'search' | 'clock';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
}

export function Icon({ name, size = 16, color, className, style, strokeWidth = 1.8 }: IconProps) {
  const c = color ?? 'currentColor';
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: c,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    style: { flexShrink: 0, ...style },
    'aria-hidden': true,
  };

  switch (name) {
    case 'wifi':
      return <svg {...p}><path d="M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0M2 8.82a15 15 0 0 1 20 0" /><circle cx="12" cy="20" r="1" fill={c} /></svg>;
    case 'pix':
      return <svg {...p}><path d="M9.4 5.6 5.6 9.4a2.4 2.4 0 0 0 0 3.4l3.8 3.8a2.4 2.4 0 0 0 3.4 0l3.8-3.8a2.4 2.4 0 0 0 0-3.4L12.8 5.6a2.4 2.4 0 0 0-3.4 0Z" /><path d="m8 8 1 1m6-1-1 1M8 15l1-1m6 1-1-1" /></svg>;
    case 'barcode':
      return <svg {...p}><path d="M4 6v12M7 6v12M10 6v12M13 6v12M17 6v12M20 6v12" /></svg>;
    case 'download':
      return <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>;
    case 'check':
      return <svg {...p}><path d="M20 6 9 17l-5-5" /></svg>;
    case 'chevron':
      return <svg {...p}><path d="m9 18 6-6-6-6" /></svg>;
    case 'home':
      return <svg {...p}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2h-4v-7H10v7H6a2 2 0 0 1-2-2Z" /></svg>;
    case 'file':
      return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h4" /></svg>;
    case 'ticket':
      return <svg {...p}><path d="M3 10V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4Z" /><path d="M13 5v2M13 11v2M13 17v2" /></svg>;
    case 'user':
      return <svg {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
    case 'flash':
      return <svg {...p}><path d="M13 2 3 14h9l-1 8 10-12h-9z" /></svg>;
    case 'settings':
      return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
    case 'lock':
      return <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
    case 'eye':
      return <svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
    case 'arrow-right':
      return <svg {...p}><path d="M5 12h14M12 5l7 7-7 7" /></svg>;
    case 'plus':
      return <svg {...p}><path d="M12 5v14M5 12h14" /></svg>;
    case 'copy':
      return <svg {...p}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
    case 'bell':
      return <svg {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>;
    case 'shield':
      return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>;
    case 'help':
      return <svg {...p}><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" /></svg>;
    case 'speed':
      return <svg {...p}><path d="M12 2v4M22 12h-4M12 22v-4M2 12h4" /><circle cx="12" cy="12" r="6" /><path d="m9 12 6-3" /></svg>;
    case 'logout':
      return <svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>;
    case 'menu':
      return <svg {...p}><path d="M3 6h18M3 12h18M3 18h18" /></svg>;
    case 'qr':
      return <svg {...p}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3M21 14v3M14 21h3M21 18v3" /></svg>;
    case 'card':
      return <svg {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>;
    case 'phone':
      return <svg {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92Z" /></svg>;
    case 'mail':
      return <svg {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>;
    case 'sun':
      return <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>;
    case 'moon':
      return <svg {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>;
    case 'send':
      return <svg {...p}><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>;
    case 'chat':
      return <svg {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>;
    case 'refresh':
      return <svg {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" /></svg>;
    case 'router':
      return <svg {...p}><rect x="2" y="14" width="20" height="8" rx="2" /><path d="M6.01 18H6M10 18h-.01M15 10v4M9 10v4M18 10v4M6 6v4" /></svg>;
    case 'stats':
      return <svg {...p}><path d="M3 3v18h18" /><path d="m7 14 4-4 4 4 5-5" /></svg>;
    case 'globe':
      return <svg {...p}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
    case 'building':
      return <svg {...p}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4" /></svg>;
    case 'search':
      return <svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
    case 'clock':
      return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case 'x':
      return <svg {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>;
    case 'logo':
      return <svg {...p}><path d="M12 2 4 7v10l8 5 8-5V7Z" /><path d="m12 22-8-5 8-5 8 5z" /><path d="M12 12V2" /></svg>;
    default:
      return <svg {...p}><circle cx="12" cy="12" r="9" /></svg>;
  }
}

// ── Exports nomeados (compatibilidade com as telas antigas) ────────────
type LegacyProps = { className?: string; size?: number };
const legacy = (name: IconName) =>
  function LegacyIcon({ className, size = 18 }: LegacyProps) {
    return <Icon name={name} size={size} className={className} strokeWidth={2} />;
  };

export const IconHome = legacy('home');
export const IconBolt = legacy('flash');
export const IconWifi = legacy('wifi');
export const IconFile = legacy('file');
export const IconUser = legacy('user');
export const IconHelp = legacy('help');
export const IconCheck = legacy('check');
export const IconArrow = legacy('arrow-right');
export const IconCopy = legacy('copy');
export const IconBarcode = legacy('barcode');
export const IconPix = legacy('pix');
export const IconDownload = legacy('download');
export const IconLogout = legacy('logout');
