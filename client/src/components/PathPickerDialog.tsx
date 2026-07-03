// The learning-path picker shown from the landing hero. Lets a signed-in
// learner choose Frontend / Backend / Fullstack, each with a short description.
// The parent (Home) handles applying + autosaving the choice; this component
// only presents the options and reports the selection.

import { Dialog, DialogTitle, DialogContent, Box, Typography } from '@mui/material';
import { TRACKS, TRACK_ORDER, type Track } from '../lib/tracks';
import { BRAND } from '../theme/MuiTheme';
import { useT } from '../i18n/LanguageContext';

export default function PathPickerDialog({
  open,
  onClose,
  current,
  onChoose,
}: {
  open: boolean;
  onClose: () => void;
  current: Track;
  onChoose: (track: Track) => void;
}) {
  const t = useT();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="path-dialog-title">
      <DialogTitle id="path-dialog-title" sx={{ pb: 0.5, fontWeight: 800 }}>
        {t('home.pathDialogTitle')}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('home.pathDialogSubtitle')}
        </Typography>
        <Box
          role="radiogroup"
          aria-label={t('home.pathDialogTitle')}
          sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}
        >
          {TRACK_ORDER.map((tk) => {
            const selected = tk === current;
            return (
              <Box
                key={tk}
                role="radio"
                aria-checked={selected}
                tabIndex={0}
                onClick={() => onChoose(tk)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onChoose(tk);
                  }
                }}
                sx={{
                  cursor: 'pointer',
                  p: 2,
                  borderRadius: 2,
                  border: '2px solid',
                  borderColor: selected ? BRAND.green : 'divider',
                  backgroundColor: selected ? BRAND.greenSoft : 'background.paper',
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                  '&:hover': { borderColor: BRAND.green },
                  '&:focus-visible': { outline: `2px solid ${BRAND.green}`, outlineOffset: 2 },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                  <Typography sx={{ fontWeight: 700 }}>{TRACKS[tk].label}</Typography>
                  {selected && (
                    <Typography component="span" sx={{ color: BRAND.green, fontWeight: 700, fontSize: '0.75rem', letterSpacing: 0.5 }}>
                      {t('home.pathCurrent')}
                    </Typography>
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {TRACKS[tk].blurb}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
