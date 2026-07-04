import { useEffect, useRef, useState } from 'react';
import { Snackbar, Box, Typography } from '@mui/material';
import { onXpToast, type XpToast } from '../lib/xp';
import { useT } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { MotionPop } from '../lib/motion';

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

  const handleClose = (_e: unknown, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  // After the exit transition, clear `current` so the next item can show.
  const handleExited = () => setCurrent(null);

  if (!current) return null;
  const isRankUp = current.kind === 'rankup';
  seq.current += 1;

  return (
    <Snackbar
      key={seq.current}
      open={open}
      autoHideDuration={isRankUp ? RANKUP_MS : GAIN_MS}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      TransitionProps={{ onExited: handleExited }}
      sx={{ mb: { xs: 1, sm: 2 } }}
    >
      {/* Plain wrapper takes the Snackbar's Grow transition; MotionPop springs
          the content on a separate node so the two never fight over transform. */}
      <div>
      <MotionPop>
      {isRankUp ? (
        <Box
          role="status"
          className="rm-celebrate"
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.25, px: 2.5, py: 1.5, borderRadius: 3,
            color: '#3a2c00', fontWeight: 800,
            background: 'linear-gradient(150deg, #ffd54f, #f5a623)',
            boxShadow: '0 8px 24px rgba(245,166,35,0.5)',
          }}
        >
          <Box component="span" sx={{ fontSize: '1.6rem', lineHeight: 1 }} aria-hidden>🎉</Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 900, fontSize: '0.7rem', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.8 }}>
              {t('xp.rankUpKicker')}
            </Typography>
            <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {t('xp.rankUp', { title: current.title })}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box
          role="status"
          sx={{
            display: 'flex', alignItems: 'center', gap: 1, px: 2.25, py: 1.25, borderRadius: 999,
            color: '#fff', fontWeight: 800,
            background: 'linear-gradient(150deg, #2e841d, #2d7a2d)',
            boxShadow: '0 6px 18px rgba(46,132,29,0.45)',
          }}
        >
          <Box component="span" sx={{ fontSize: '1.15rem', lineHeight: 1 }} aria-hidden>⚡</Box>
          <Typography sx={{ fontWeight: 800 }}>
            {t(GAIN_KEY[current.source], { xp: current.amount })}
          </Typography>
        </Box>
      )}
      </MotionPop>
      </div>
    </Snackbar>
  );
}
