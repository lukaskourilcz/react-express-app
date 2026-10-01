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

// Shield with a check: a raised streak shield on the Profile and the
// protection sold for coins, so the thing bought and the thing it becomes
// look alike.
export const ShieldIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
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

// Show and hide a password (the sign-in dialog and /reset-password).
export const EyeIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

/** Google's "G", in its own colours as Google's sign-in branding asks.
 * Decorative: the button beside it says "Continue with Google". */
export const GoogleIcon = ({ size = 18 }: { size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

/** A coin: the accent disc with an inner rim. Decorative; the number or the
 * word beside it carries the meaning. The Coins page and its header button. */
export const CoinIcon = ({ size = 24 }: { size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="var(--brand-accent)" />
    <circle cx="12" cy="12" r="6.5" fill="none" stroke="var(--brand-on-accent)" strokeWidth="1.6" opacity="0.55" />
  </svg>
);

// devShark's own social profiles, in the same stroke language (footer links).
export const InstagramIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

export const ThreadsIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <circle cx="12" cy="12" r="4" />
    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
  </svg>
);

export const LinkedInIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
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
