// The StudyShark landing: pick what to study. Choosing a subject sets the
// active subject (persisted) and drops the learner into the normal app, now
// scoped to that subject's roadmap, quiz, categories and accent. Reachable any
// time at /subjects to switch subjects.

import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { SwimmingFin } from './SharkFin';
import {
  SUBJECTS,
  SUBJECT_ORDER,
  useSubject,
  setSubjectValue,
  type SubjectId,
} from '../lib/subjects';

export default function SubjectPicker() {
  const navigate = useNavigate();
  const [current] = useSubject();

  const choose = (id: SubjectId) => {
    setSubjectValue(id);
    navigate('/');
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 1, sm: 2 } }}>
      <Box sx={{ textAlign: 'center', mb: { xs: 3, sm: 4 } }}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <SwimmingFin size={30} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
            StudyShark
          </Typography>
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
          What do you want to learn?
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Pick a subject to start. You can switch any time.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 1.5, sm: 2 },
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
        }}
      >
        {SUBJECT_ORDER.map((id) => {
          const s = SUBJECTS[id];
          const active = id === current;
          return (
            <Paper
              key={id}
              elevation={0}
              onClick={() => choose(id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  choose(id);
                }
              }}
              aria-label={`Study ${s.label}`}
              sx={{
                cursor: 'pointer',
                p: { xs: 2.5, sm: 3 },
                borderRadius: 3,
                border: '2px solid',
                borderColor: active ? s.accent : 'divider',
                borderTop: `6px solid ${s.accent}`,
                transition: 'transform .15s ease, box-shadow .15s ease, border-color .15s ease',
                '&:hover, &:focus-visible': {
                  transform: 'translateY(-3px)',
                  borderColor: s.accent,
                  boxShadow: 6,
                  outline: 'none',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
                <Box aria-hidden sx={{ fontSize: '2rem', lineHeight: 1 }}>{s.emoji}</Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: s.accent }}>
                  {s.label}
                </Typography>
                {active && (
                  <Chip
                    size="small"
                    label="Current"
                    sx={{ ml: 'auto', fontWeight: 700, backgroundColor: s.accent, color: '#fff' }}
                  />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {s.blurb}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {s.topics.length} topics · Learn path, quizzes & leaderboards
              </Typography>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
