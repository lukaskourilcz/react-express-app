// Token shop. Currency = tokens (separate from XP), earned passively as 10% of
// every XP gain plus a one-time 200-token sign-up bonus. The product catalogue
// is empty for now — this page shows the live balance and an explanatory
// empty state so the section is real on day one and products can be added
// without scaffold churn later.

import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { useT } from '../i18n/LanguageContext';
import { useTokens } from '../lib/tokens';
import { BRAND } from '../theme/MuiTheme';

const TokenIcon = () => (
  <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill={BRAND.green} />
    <circle cx="12" cy="12" r="7" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.4" />
    <text
      x="12"
      y="16"
      textAnchor="middle"
      fontSize="11"
      fontFamily="-apple-system, sans-serif"
      fontWeight="700"
      fill="#fff"
    >
      T
    </text>
  </svg>
);

function Shop() {
  const t = useT();
  const tokens = useTokens();

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="overline" sx={{ color: BRAND.green, letterSpacing: '0.8px' }}>
          {t('shop.kicker')}
        </Typography>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          {t('shop.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('shop.subtitle')}
        </Typography>
      </Stack>

      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ flexShrink: 0 }}>
              <TokenIcon />
            </Box>
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {t('shop.balanceLabel')}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: BRAND.green }}>
                {tokens.toLocaleString()} {t('shop.tokensUnit')}
              </Typography>
            </Stack>
            <Chip
              label={t('shop.earnRate')}
              size="small"
              sx={{ backgroundColor: BRAND.greenSoft, color: BRAND.green, fontWeight: 600 }}
            />
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ textAlign: 'center', py: { xs: 5, sm: 7 } }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            {t('shop.comingSoonTitle')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360, mx: 'auto' }}>
            {t('shop.comingSoonBody')}
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}

export default Shop;
