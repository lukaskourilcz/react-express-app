// One place a learner's avatar is drawn (issue #173).
//
// Before this, the avatar appeared at six call sites with three different ring
// treatments and no shared wrapper, so "consistent" was not true even before a
// crown existed. This component is the wrapper: it renders the Astryx avatar
// and, when the learner has the crown equipped, draws it above.
//
// The crown cannot go inside Astryx's own content element (it clips) and cannot
// use the status slot (hard-coded to the bottom-right and invisible at 36px), so
// it is a sibling positioned over the top edge. It is decorative — no rank, no
// access, no advantage — so the mark itself is aria-hidden and the fact of it is
// carried in the avatar's accessible name instead.

import type { CSSProperties } from 'react';
import { Avatar, type AvatarSize as AstryxAvatarSize } from '@astryxdesign/core/Avatar';
import { CrownIcon } from './icons';
import { useT } from '../../i18n/LanguageContext';

export type AvatarSize = AstryxAvatarSize;

const PIXELS: Record<string, number> = { tiny: 24, xsmall: 32, small: 36, medium: 48, large: 64 };
const sizeInPx = (size: AvatarSize): number => (typeof size === 'number' ? size : PIXELS[size] ?? 40);

export interface LearnerAvatarProps {
  src?: string;
  name: string;
  size?: AvatarSize;
  /** The learner wears the crown. */
  crowned?: boolean;
  /** An owned avatar ring colour, kept for accounts that bought one. */
  ringColor?: string | null;
  /** Overrides the accessible name; pass '' for a decorative avatar. */
  alt?: string;
  style?: CSSProperties;
}

export function LearnerAvatar({ src, name, size = 'medium', crowned = false, ringColor = null, alt, style }: LearnerAvatarProps) {
  const t = useT();
  const px = sizeInPx(size);
  // The crown scales with the avatar and overhangs the top edge by a third of
  // its own height, which is enough to read at 36px without changing the row.
  const crownSize = Math.max(14, Math.round(px * 0.42));
  const label = alt !== undefined ? alt : crowned ? t('shop.crown.wearing', { name }) : name;

  return (
    <span
      className="ss-learner-avatar"
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexShrink: 0,
        borderRadius: '50%',
        ...(ringColor ? { boxShadow: `0 0 0 2px ${ringColor}, 0 0 0 3.5px ${ringColor}33` } : null),
        ...style,
      }}
    >
      <Avatar src={src} name={name} alt={label} size={size} />
      {crowned && (
        <span
          className="ss-learner-avatar__crown"
          style={{
            position: 'absolute',
            top: -Math.round(crownSize * 0.34),
            left: '50%',
            transform: 'translateX(-50%)',
            lineHeight: 0,
            color: 'var(--brand-gold, #d4af37)',
            // A dark outline keeps the gold legible on a light photo and a
            // light theme alike, without a second asset.
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.45))',
            pointerEvents: 'none',
          }}
        >
          <CrownIcon size={crownSize} />
        </span>
      )}
    </span>
  );
}
