import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Text } from '@astryxdesign/core/Text';
import { onXpToast, type XpToast } from '../lib/xp';
import { useT } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { MotionPop, m, AnimatePresence } from '../lib/motion';
import { useIsMobile } from '../lib/useMediaQuery';
import { BoltIcon, TrophyIcon } from './ui/icons';

// A global, self-contained listener for XP events. Mounted once at the app root
// so XP gains and rank-ups toast from anywhere (quiz results, the learning path,
// etc.). Events are queued so a burst (e.g. a gain immediately followed by a
// rank-up) shows one after another instead of clobbering each other.

const GAIN_MS = 2200;
const RANKUP_MS = 4800;

type GainSource = Extract<XpToast, { kind: 'gain' }>['source'];
const GAIN_KEY: Record<GainSource, TranslationKey> = {
  learn: 'xp.gainLearn',
  quiz: 'xp.gainQuiz',
  practice: 'xp.gainPractice',
};

export default function XpToaster() {
  const t = useT();
  const isMobile = useIsMobile();
  const [queue, setQueue] = useState<XpToast[]>([]);
  const [current, setCurrent] = useState<XpToast | null>(null);
  const [open, setOpen] = useState(false);
  const seq = useRef(0);

  useEffect(() => onXpToast((toast) => setQueue((q) => [...q, toast])), []);

  // Pull the next toast when nothing is showing.
  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((q) => q.slice(1));
      setOpen(true);
    }
  }, [queue, current]);

  // Auto-hide, then let the exit transition run before clearing `current`.
  useEffect(() => {
    if (!open || !current) return;
    const ms = current.kind === 'rankup' ? RANKUP_MS : GAIN_MS;
    const id = window.setTimeout(() => setOpen(false), ms);
    return () => window.clearTimeout(id);
  }, [open, current]);

  // After the exit transition, clear `current` so the next item can show.
  const handleExited = () => setCurrent(null);

  if (!current) return null;
  const isRankUp = current.kind === 'rankup';
  seq.current += 1;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: isMobile ? 32 : 40,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 1400,
        padding: '0 16px',
      }}
    >
      {/* AnimatePresence provides the exit transition (was the Snackbar's Grow);
          MotionPop springs the content on a separate node so the two never fight
          over transform. */}
      <AnimatePresence onExitComplete={handleExited}>
        {open && (
          <m.div
            key={seq.current}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ pointerEvents: 'auto' }}
          >
            <MotionPop>
              {isRankUp ? (
                <div
                  role="status"
                  className="rm-celebrate"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px',
                    borderRadius: 'var(--radius-element)',
                    color: '#3a2c00', fontWeight: 700,
                    background: '#fbc94a',
                    boxShadow: 'var(--shadow-med)',
                  }}
                >
                  <span style={{ display: 'inline-flex' }} aria-hidden>
                    <TrophyIcon size={22} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 800, fontSize: '0.7rem', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.8 }}>
                      {t('xp.rankUpKicker')}
                    </span>
                    <Text as="div" color="inherit" weight="bold">
                      {t('xp.rankUp', { title: t(current.titleKey, current.titleVars) })}
                    </Text>
                  </div>
                </div>
              ) : (
                <div
                  role="status"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 999,
                    color: '#fff', fontWeight: 700,
                    background: 'var(--ss-success-strong)',
                    boxShadow: 'var(--shadow-med)',
                  }}
                >
                  <span style={{ display: 'inline-flex' }} aria-hidden>
                    <BoltIcon size={16} />
                  </span>
                  <Text as="span" color="inherit" weight="bold">
                    {t(GAIN_KEY[current.source], { xp: current.amount })}
                  </Text>
                </div>
              )}
            </MotionPop>
          </m.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
