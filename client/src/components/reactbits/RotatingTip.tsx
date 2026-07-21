// Adapted from reactbits.dev/text-animations/rotating-text (MIT).
//
// Cycles through a list of tips: the current tip slides up + fades out while
// the next one enters. Used for the between-question coaching strip so the
// learner picks up mindset advice ("read the docs first") without a modal.

import { useEffect, useState } from 'react';
import { m, AnimatePresence, useReducedMotion } from '../../lib/motion';
import type { CSSProperties } from 'react';

interface Props {
  tips: string[];
  /** Milliseconds each tip stays on screen. */
  intervalMs?: number;
  className?: string;
  style?: CSSProperties;
}

export function RotatingTip({ tips, intervalMs = 8000, className, style }: Props) {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (tips.length < 2 || reduce) return;
    const id = setInterval(() => setI((n) => (n + 1) % tips.length), intervalMs);
    return () => clearInterval(id);
  }, [tips.length, intervalMs, reduce]);

  const current = tips[i] ?? '';
  if (!current) return null;

  if (reduce) {
    return (
      <div className={className} style={style}>
        {current}
      </div>
    );
  }

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {current}
        </m.div>
      </AnimatePresence>
    </div>
  );
}
