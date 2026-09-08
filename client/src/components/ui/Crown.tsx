// The devShark crown: the one cosmetic a learner can buy.
//
// Drawn here rather than picked from an emoji font, because an emoji is a
// different picture on every platform and this one has to sit on an avatar at
// 24px and still read as a crown. Three points, a flat band, and a fin-shaped
// centre spike that ties it to the rest of the brand — the same silhouette the
// dorsal fin uses, stood upright.
//
// It conveys nothing. It is not a rank, it does not mark a score, and owning it
// changes no access, no content and no position on any board. It is a picture
// somebody liked enough to spend tokens on.

interface CrownProps {
  /** Square size in px. Readable down to 16. */
  size?: number;
  /** Fill; defaults to the subject accent so it re-skins with everything else. */
  color?: string;
}

/**
 * The crown mark. Decorative by default — the avatar it sits on carries the
 * accessible description, so this adds nothing a screen reader would read out
 * twice.
 */
export function Crown({ size = 20, color = 'var(--brand-accent)' }: CrownProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Band and points in one path: the outline drops from the left point,
          rises through the centre fin, falls to the right point, and closes
          along the flat band so the shape reads at any size. */}
      <path
        d="M3 18 L3 10 L7 13 L12 4 Q 13.6 9 17 13 L21 10 L21 18 Z"
        style={{ fill: color }}
      />
      {/* The same shading the dorsal fin uses down its trailing edge, so the
          crown belongs to the same set of marks. */}
      <path d="M12 4 Q 13.6 9 17 13 L14.5 15 Q 12.6 9.5 12 4 Z" fill="#000" opacity="0.12" />
      {/* A hairline under the band keeps the silhouette from dissolving into a
          dark avatar ring at small sizes. */}
      <path d="M3 17.2 H21" stroke="#000" strokeOpacity="0.18" strokeWidth="0.8" />
    </svg>
  );
}

/**
 * The crown as worn: positioned above an avatar, tilted very slightly so it
 * looks placed rather than pasted. Purely presentational; the wearer's name is
 * announced by the avatar, and the crown is described there in one word rather
 * than announced separately here.
 */
export function CrownBadge({ size = 20 }: { size?: number }) {
  return (
    <span
      className="ss-crown"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Crown size={size} />
    </span>
  );
}
