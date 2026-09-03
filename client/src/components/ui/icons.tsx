// Shared stroke icons (feather-style, 24×24, currentColor) — the app's visual
// anchors. One consistent icon language instead of per-surface emojis: chrome
// stays professional, while colour comes from the subject accent around them.

import type { CSSProperties, ReactNode } from 'react';

interface IconProps {
  size?: number;
  style?: CSSProperties;
}

const base = (size: number) =>
  ({
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: false,
  }) as const;

export const CompassIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

export const BoltIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export const MapIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

export const TrophyIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
    <path d="M5 4H3v2a3 3 0 0 0 3 3M19 4h2v2a3 3 0 0 1-3 3" />
  </svg>
);

export const CardsIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <rect x="3" y="6" width="13" height="15" rx="2" />
    <path d="M8 3h11a2 2 0 0 1 2 2v13" />
  </svg>
);

export const FlameIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

export const TargetIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export const CheckCircleIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const ClipboardIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" />
  </svg>
);

export const HelpCircleIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const LightbulbIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M9 18h6M10 22h4" />
    <path d="M12 2a7 7 0 0 1 4.9 12 4.6 4.6 0 0 0-1.4 3v1H8.5v-1a4.6 4.6 0 0 0-1.4-3A7 7 0 0 1 12 2z" />
  </svg>
);

export const KeyIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

export const UsersIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const SparkleIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M12 3l1.9 5.7a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z" />
  </svg>
);

export const BookmarkIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
  </svg>
);

export const FlagIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

export const GlobeIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export const BookIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

export const CalculatorIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="8" y1="12" x2="8" y2="12.01" />
    <line x1="12" y1="12" x2="12" y2="12.01" />
    <line x1="16" y1="12" x2="16" y2="12.01" />
    <line x1="8" y1="16" x2="8" y2="16.01" />
    <line x1="12" y1="16" x2="12" y2="16.01" />
    <line x1="16" y1="16" x2="16" y2="16.01" />
  </svg>
);

export const HeartPulseIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    <path d="M3.22 12H9l1.5-3 3 6 1.5-3h5.27" />
  </svg>
);

export const SunIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

export const MoonIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export const SoundOnIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

export const SoundOffIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

export const CloseIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/**
 * Accent-tinted rounded tile wrapping an icon — the standard visual anchor for
 * cards, stat tiles and empty states. Colour is the only playful note; the
 * geometry stays quiet.
 */
export function IconTile({
  color = 'var(--brand-accent)',
  size = 44,
  children,
  style,
}: {
  color?: string;
  size?: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className="ss-tile"
      style={{
        width: size,
        height: size,
        color,
        background: 'color-mix(in srgb, currentColor 10%, transparent)',
        boxShadow: 'inset 0 0 0 1px color-mix(in srgb, currentColor 22%, transparent)',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
