// Adapted from reactbits.dev/text-animations/split-text (MIT).
//
// Fades the string in one word at a time with a small stagger. Words don't
// wrap mid-character, unlike a per-character reveal. Used for celebration
// headlines ("Level complete", "Perfect run") so the moment feels alive
// without stealing focus.

import { m, useReducedMotion } from '../../lib/motion';
import type { ReactNode } from 'react';

interface Props {
  text: string;
  className?: string;
  /** Delay per word, seconds. */
  stagger?: number;
  /** Total per-word transition. */
  duration?: number;
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'p';
  children?: ReactNode;
}

export function SplitText({
  text,
  className,
  stagger = 0.05,
  duration = 0.42,
  as = 'h2',
  children,
}: Props) {
  const reduce = useReducedMotion();
  const words = text.split(/(\s+)/); // keep spaces so kerning stays natural

  if (reduce) {
    const Tag = as;
    return (
      <Tag className={className}>
        {text}
        {children}
      </Tag>
    );
  }

  const Tag = as;
  return (
    <Tag className={className}>
    <m.span
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
      style={{ display: 'inline-block' }}
    >
      {words.map((w, i) =>
        /\s+/.test(w) ? (
          <span key={i} style={{ whiteSpace: 'pre' }}>
            {w}
          </span>
        ) : (
          <m.span
            key={i}
            variants={{
              hidden: { opacity: 0, y: '0.6em', filter: 'blur(6px)' },
              visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
            }}
            transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: 'inline-block', willChange: 'transform, opacity, filter' }}
          >
            {w}
          </m.span>
        ),
      )}
    </m.span>
    {children}
    </Tag>
  );
}
