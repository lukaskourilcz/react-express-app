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

export const BoltIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export const TrophyIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
    <path d="M5 4H3v2a3 3 0 0 0 3 3M19 4h2v2a3 3 0 0 1-3 3" />
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

export const BookIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
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
