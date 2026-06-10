import { useMemo, useState } from 'react';
import { Box, Paper, Typography, TextField, Chip } from '@mui/material';
import { useT } from '../i18n/LanguageContext';
import { BRAND } from '../theme/MuiTheme';
import { ABBREVIATION_GROUPS, ABBREVIATION_COUNT } from '../lib/abbreviations';

function Abbreviations() {
  const t = useT();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const groups = useMemo(() => {
    if (!q) return ABBREVIATION_GROUPS;
    return ABBREVIATION_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter(
        (a) =>
          a.term.toLowerCase().includes(q) ||
          a.full.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q),
      ),
    })).filter((g) => g.items.length > 0);
  }, [q]);

  const visibleCount = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto' }}>
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            {t('abbr.heading')}
          </Typography>
          <Chip label={t('abbr.count', { count: ABBREVIATION_COUNT })} sx={{ fontWeight: 700 }} />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('abbr.subtitle')}
        </Typography>
      </Box>

      <TextField
        fullWidth
        size="small"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('abbr.searchPlaceholder')}
        inputProps={{ 'aria-label': t('abbr.searchPlaceholder') }}
        sx={{ mb: 3 }}
      />

      {visibleCount === 0 ? (
        <Paper
          elevation={0}
          sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}
        >
          <Typography variant="body2" color="text.secondary">
            {t('abbr.noResults', { query })}
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {groups.map((group) => (
            <Box key={group.id} component="section" aria-label={group.label}>
              <Typography
                variant="overline"
                component="h2"
                color="text.secondary"
                sx={{ display: 'block', mb: 1, fontWeight: 700 }}
              >
                {group.label}
              </Typography>
              <Paper
                elevation={0}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
              >
                <Box component="dl" sx={{ m: 0 }}>
                  {group.items.map((a, i) => (
                    <Box
                      key={a.term}
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: { xs: 0.25, sm: 2 },
                        p: { xs: 1.5, sm: 2 },
                        borderTop: i === 0 ? 'none' : '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ minWidth: { sm: 160 }, flexShrink: 0 }}>
                        <Typography
                          component="dt"
                          sx={{ fontFamily: 'monospace', fontWeight: 700, color: BRAND.green }}
                        >
                          {a.term}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {a.full}
                        </Typography>
                      </Box>
                      <Typography component="dd" variant="body2" sx={{ m: 0, color: 'text.primary' }}>
                        {a.description}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default Abbreviations;
