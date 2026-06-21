// Token shop. Currency = tokens (separate from XP), earned passively as 10% of
// every XP gain plus a one-time 200-token sign-up bonus. Spend them on a small
// catalogue: a stackable Double-XP booster, avatar rings, and title flairs.

import { useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Snackbar, Alert, Stack, Typography } from '@mui/material';
import { useT } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { useTokens } from '../lib/tokens';
import { CATALOGUE, purchase, equip, useInventory, type Product, type ProductKind } from '../lib/shop';
import { BRAND, brandButtonSx } from '../theme/MuiTheme';

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

const SECTION_ORDER: ProductKind[] = ['booster', 'ring', 'flair'];
const SECTION_KEY: Record<ProductKind, TranslationKey> = {
  booster: 'shop.section.boosters',
  ring: 'shop.section.rings',
  flair: 'shop.section.flairs',
};

function Shop() {
  const t = useT();
  const tokens = useTokens();
  const inv = useInventory();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const handleBuy = (p: Product) => {
    const res = purchase(p.id);
    if (res === 'ok') {
      setToast({ msg: t('shop.purchased', { name: t(`shop.item.${p.id}.name` as TranslationKey) }), ok: true });
    } else if (res === 'owned') {
      setToast({ msg: t('shop.alreadyOwned'), ok: false });
    } else {
      setToast({ msg: t('shop.insufficient'), ok: false });
    }
  };

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

      {SECTION_ORDER.map((kind) => (
        <Stack key={kind} spacing={1.5}>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.6px' }}>
            {t(SECTION_KEY[kind])}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
            {CATALOGUE.filter((p) => p.kind === kind).map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                owned={inv.owned.includes(p.id)}
                equipped={inv.ring === p.id || inv.flair === p.id}
                charges={p.kind === 'booster' ? inv.doubleXp : 0}
                canAfford={tokens >= p.price}
                onBuy={() => handleBuy(p)}
                onEquip={() => equip(p.id)}
              />
            ))}
          </Box>
        </Stack>
      ))}

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert
            severity={toast.ok ? 'success' : 'warning'}
            variant="filled"
            onClose={() => setToast(null)}
            sx={toast.ok ? { backgroundColor: BRAND.green } : undefined}
          >
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Stack>
  );
}

interface ProductCardProps {
  product: Product;
  owned: boolean;
  equipped: boolean;
  charges: number;
  canAfford: boolean;
  onBuy: () => void;
  onEquip: () => void;
}

function ProductCard({ product, owned, equipped, charges, canAfford, onBuy, onEquip }: ProductCardProps) {
  const t = useT();
  const name = t(`shop.item.${product.id}.name` as TranslationKey);
  const desc = t(`shop.item.${product.id}.desc` as TranslationKey);
  const isBooster = product.kind === 'booster';

  return (
    <Card sx={{ display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            aria-hidden
            sx={{ fontSize: 28, lineHeight: 1, flexShrink: 0, ...(product.color ? { color: product.color } : null) }}
          >
            {product.emoji}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }}>{name}</Typography>
            <Typography variant="caption" color="text.secondary">{desc}</Typography>
          </Box>
        </Stack>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 'auto', pt: 1 }}>
          <Chip
            size="small"
            label={`${product.price.toLocaleString()} ${t('shop.tokensUnit')}`}
            sx={{ backgroundColor: BRAND.greenSoft, color: BRAND.green, fontWeight: 700 }}
          />
          {isBooster ? (
            <Stack direction="row" spacing={1} alignItems="center">
              {charges > 0 && (
                <Typography variant="caption" sx={{ color: BRAND.green, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {t('shop.armed', { count: charges })}
                </Typography>
              )}
              <Button size="small" variant="contained" disabled={!canAfford} onClick={onBuy} sx={brandButtonSx}>
                {t('shop.buy')}
              </Button>
            </Stack>
          ) : owned ? (
            <Button
              size="small"
              variant={equipped ? 'contained' : 'outlined'}
              onClick={onEquip}
              sx={equipped ? brandButtonSx : { color: BRAND.green, borderColor: BRAND.green, textTransform: 'none' }}
            >
              {equipped ? t('shop.equipped') : t('shop.equip')}
            </Button>
          ) : (
            <Button size="small" variant="contained" disabled={!canAfford} onClick={onBuy} sx={brandButtonSx}>
              {t('shop.buy')}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default Shop;
