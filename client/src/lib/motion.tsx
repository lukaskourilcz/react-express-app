// Motion (motion.dev, MIT) primitives — shared, bundle-conscious, and
// reduced-motion aware.
//
// Bundle discipline: we use the `m` component + LazyMotion in `strict` mode so
// the heavy DOM-animation feature set is *code-split and fetched lazily* on
// first paint rather than shipped in the initial bundle. `strict` bans the full
// `motion.*` components (which would silently pull the whole engine back in), so
// the whole app stays on the lean `m.*` path.
//
// Accessibility: every helper honours `prefers-reduced-motion` — transforms are
// dropped and only a short opacity fade remains (or nothing), so vestibular
// users don't get movement they didn't ask for.

import { LazyMotion, m, AnimatePresence, useReducedMotion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';

// Fetch only the DOM animation features, and only when needed. The `m`
// component + LazyMotion core are tiny; the feature bundle loads in the
// background so it's off the critical path. Imported via a dedicated wrapper
// module (not 'motion/react' directly) so Rollup actually code-splits it out —
// see lib/motion-features for why.
const loadFeatures = () => import('./motion-features').then((mod) => mod.default);

/** Wrap the app once so every `m.*` element below has its features. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}

/**
 * Fade + slide a block in on mount. Pass an `index` to stagger a list of
 * stacked siblings (the delay is capped so a long list never crawls in).
 */
export function MotionItem({
  children,
  index = 0,
  className,
  style,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion();
  const delay = Math.min(index * 0.06, 0.4);
  return (
    <m.div
      className={className}
      style={style}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: 'easeOut', delay }}
    >
      {children}
    </m.div>
  );
}

/** Spring-pop a small element in (score reveal, XP toast). */
export function MotionPop({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <m.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 480, damping: 26 }}
    >
      {children}
    </m.div>
  );
}

export { m, AnimatePresence, useReducedMotion };
