// Conjunto mínimo de ícones para o portal — todos com 24x24 stroke.
type IconProps = { className?: string; size?: number };

const ico = (path: React.ReactNode) =>
  function Icon({ className, size = 18 }: IconProps) {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {path}
      </svg>
    );
  };

export const IconHome = ico(
  <>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 22V12h6v10" />
  </>,
);
export const IconBolt = ico(<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />);
export const IconWifi = ico(
  <>
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
  </>,
);
export const IconFile = ico(
  <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </>,
);
export const IconUser = ico(
  <>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </>,
);
export const IconHelp = ico(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </>,
);
export const IconCheck = ico(<polyline points="20 6 9 17 4 12" />);
export const IconArrow = ico(
  <>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </>,
);
export const IconCopy = ico(
  <>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </>,
);
export const IconBarcode = ico(
  <>
    <line x1="3" y1="6" x2="3" y2="18" />
    <line x1="6" y1="6" x2="6" y2="18" />
    <line x1="9" y1="6" x2="9" y2="18" strokeWidth="3" />
    <line x1="12" y1="6" x2="12" y2="18" />
    <line x1="15" y1="6" x2="15" y2="18" strokeWidth="3" />
    <line x1="18" y1="6" x2="18" y2="18" />
    <line x1="21" y1="6" x2="21" y2="18" />
  </>,
);
export const IconPix = ico(
  <>
    <path d="M21 12L12 21l-9-9 9-9z" />
    <path d="M8 12l4-4 4 4-4 4z" />
  </>,
);
export const IconDownload = ico(
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </>,
);
export const IconLogout = ico(
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </>,
);
