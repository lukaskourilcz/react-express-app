// Token shop. Currency = tokens (separate from XP), earned passively as 10% of
// every XP gain plus a one-time 200-token sign-up bonus. Spend them on a small
// catalogue of avatar rings and title flairs. Purchases are cosmetic and never
// bypass a learning prerequisite or influence competitive scoring.
//
// Redesigned on the Astryx design system: an accent-tinted wallet header, then
// purchasable items rendered as Cards in a responsive Grid.
// The shared app toast provides purchase feedback.

import { useState, type ReactNode } from 'react';
import { Avatar } from '@astryxdesign/core/Avatar';
import { AppToast } from './ui/AppToast';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { useT } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { useTokens } from '../lib/tokens';
import { CATALOGUE, purchase, priceOf, equip, useInventory, useEquippedRingColor, useEquippedFlair, type Product, type ProductKind } from '../lib/shop';
import { useAuth, getUserProfile } from '../lib/auth';
import { useActiveSubject, subjectNameKey } from '../lib/subjects';
import { IconTile, SparkleIcon } from './ui/icons';

const TokenIcon = ({ size = 24 }: { size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill={'var(--brand-accent)'} />
    <circle cx="12" cy="12" r="7" fill="none" stroke="var(--brand-on-accent)" strokeWidth="1.5" opacity="0.4" />
    <text
      x="12"
      y="16"
      textAnchor="middle"
      fontSize="11"
      fontFamily="-apple-system, sans-serif"
      fontWeight="700"
      fill="var(--brand-on-accent)"
    >
      T
    </text>
  </svg>
);

// A tinted rounded tile holding a controlled typographic marker. This avoids
// platform-dependent emoji artwork while keeping each product recognizable.
function MarkerTile({ marker, color, size = 46 }: { marker: string; color?: string; size?: number }) {
  const accent = color ?? 'var(--brand-accent)';
  return (
    <div
      aria-hidden
      className="ss-tile"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        fontWeight: 800,
        fontFamily: 'var(--font-family-mono, ui-monospace, monospace)',
        background: `color-mix(in srgb, ${accent} 12%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${accent} 30%, transparent)`,
      }}
    >
      {marker}
    </div>
  );
}

// One focused, fairness-neutral catalogue section.
const SECTIONS: { key: TranslationKey; kinds: ProductKind[]; icon: ReactNode }[] = [
  { key: 'shop.section.style', kinds: ['ring', 'flair'], icon: <SparkleIcon size={16} /> },
];

function Shop() {
  const t = useT();
  const tokens = useTokens();
  const inv = useInventory();
  // The shop is per subject: tokens and cosmetics stay with that context.
  const subject = useActiveSubject();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const handleBuy = (p: Product) => {
    const res = purchase(p.id);
    const displayName = t(`shop.item.${p.id}.name` as TranslationKey);
    if (res === 'ok') {
      setToast({ msg: t('shop.purchased', { name: displayName }), ok: true });
    } else if (res === 'owned') {
      setToast({ msg: t('shop.alreadyOwned'), ok: false });
    } else {
      setToast({ msg: t('shop.insufficient'), ok: false });
    }
  };

  return (
    <VStack gap={5} width="100%" maxWidth={1080}>
      <VStack gap={1}>
        <span className="ss-kicker">{t('shop.kicker')}</span>
        <Heading level={1} type="display-3">
          {t('shop.title')}
        </Heading>
        <Text type="large" color="secondary">
          {t('shop.subtitle')}
        </Text>
      </VStack>

      {/* Wallet: the accent-tinted balance is the anchor of the page. */}
      <div className="ss-raised ss-pop" style={{ display: 'flex', width: '100%' }}>
        <Card variant="muted" padding={5} width="100%">
          <HStack gap={3} align="center" wrap="wrap">
            <TokenIcon size={48} />
            <VStack gap={0.5}>
              <Text type="label" weight="bold" color="secondary">
                {t('shop.balanceLabel')}
              </Text>
              <HStack gap={1} align="end" wrap="wrap">
                <Heading level={2} type="display-2" color="accent">
                  {tokens.toLocaleString()}
                </Heading>
                <Text type="large" weight="bold" color="accent">
                  {t('shop.tokensUnit')}
                </Text>
              </HStack>
            </VStack>
            {/* The wallet is per platform — make the scope visible. */}
            <div style={{ marginLeft: 'auto' }}>
              <HStack gap={1} align="center" wrap="wrap" justify="end">
                <Badge variant="neutral" label={t(subjectNameKey(subject.id))} />
                <Badge variant="cyan" label={t('shop.earnRate')} />
              </HStack>
            </div>
          </HStack>
        </Card>
      </div>

      {SECTIONS.map(({ key, kinds, icon }) => (
        <VStack key={key} gap={2}>
          <VStack gap={0.5}>
            <HStack gap={1.5} align="center">
              <IconTile size={32}>{icon}</IconTile>
              <Heading level={3}>{t(key)}</Heading>
            </HStack>
          </VStack>
          {/* Style section: a live preview of YOUR avatar + name with the
              currently equipped ring/flair, so cosmetics are tangible before
              (and after) buying. */}
          {kinds.includes('ring') && <StylePreview />}
          <Grid columns={{ minWidth: 260, max: 3 }} gap={2} width="100%">
            {CATALOGUE.filter((p) => kinds.includes(p.kind))
              .map((p) => {
                const price = priceOf(p);
                return (
                  <ProductCard
                    key={p.id}
                    product={p}
                    price={price}
                    owned={inv.owned.includes(p.id)}
                    equipped={inv.ring === p.id || inv.flair === p.id}
                    canAfford={tokens >= price}
                    onBuy={() => handleBuy(p)}
                    onEquip={() => equip(p.id)}
                  />
                );
              })}
          </Grid>
        </VStack>
      ))}

      <AppToast
        open={!!toast}
        onClose={() => setToast(null)}
        severity={toast?.ok ? 'success' : 'info'}
        autoHideDuration={3000}
        message={toast?.msg ?? ''}
      />
    </VStack>
  );
}

interface ProductCardProps {
  product: Product;
  price: number;
  owned: boolean;
  equipped: boolean;
  canAfford: boolean;
  onBuy: () => void;
  onEquip: () => void;
}

function ProductCard({ product, price, owned, equipped, canAfford, onBuy, onEquip }: ProductCardProps) {
  const t = useT();
  const name = t(`shop.item.${product.id}.name` as TranslationKey);
  const desc = t(`shop.item.${product.id}.desc` as TranslationKey);

  // Accent-tinted price badge keeps cost visible without implying performance.
  const accent = product.color ?? 'var(--brand-accent)';
  const priceBadge = (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: 999,
        fontWeight: 700,
        fontSize: '0.8125rem',
        lineHeight: 1.2,
        color: accent,
        background: `color-mix(in srgb, ${accent} 14%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${accent} 30%, transparent)`,
      }}
    >
      <TokenIcon size={14} />
      {price.toLocaleString()} {t('shop.tokensUnit')}
    </span>
  );

  // The action shown in the card footer depends on the product kind + state.
  let action;
  if (owned) {
    // Ring / flair the learner already owns: toggle equip (idempotent).
    action = (
      <Button
        size="sm"
        variant={equipped ? 'primary' : 'secondary'}
        label={equipped ? t('shop.equipped') : t('shop.equip')}
        onClick={onEquip}
      />
    );
  } else {
    action = (
      <HStack gap={1} align="center">
        <Button size="sm" variant="primary" label={t('shop.buy')} isDisabled={!canAfford} onClick={onBuy} />
      </HStack>
    );
  }

  return (
    <div className="ss-raised" style={{ display: 'flex', width: '100%' }}>
      <Card padding={3} width="100%">
        <VStack gap={2} height="100%" justify="between">
          <HStack gap={1.5} align="center">
            <MarkerTile marker={product.marker} color={product.color} size={44} />
            <VStack gap={0.5}>
              <Text weight="bold">{name}</Text>
              <Text type="supporting" color="secondary">
                {desc}
              </Text>
            </VStack>
          </HStack>

          <HStack gap={1} align="center" justify="between" wrap="wrap">
            {priceBadge}
            {action}
          </HStack>
        </VStack>
      </Card>
    </div>
  );
}

/**
 * Live "this is you" preview for the Style section: the learner's own avatar
 * and name rendered with whatever ring/flair is currently equipped, updating
 * the moment they equip something. Makes cosmetics tangible without any
 * marketing copy.
 */
function StylePreview() {
  const t = useT();
  const { user } = useAuth();
  const profile = getUserProfile(user);
  const ringColor = useEquippedRingColor();
  const flair = useEquippedFlair();
  const displayName = profile.name?.split(' ')[0] || profile.email?.split('@')[0] || t('auth.account');

  return (
    <Card variant="muted" padding={2} width="fit-content">
      <HStack gap={1.5} align="center">
        <div
          style={{
            borderRadius: '50%',
            display: 'inline-flex',
            flexShrink: 0,
            ...(ringColor
              ? { boxShadow: `0 0 0 2px ${ringColor}, 0 0 0 3.5px ${ringColor}33` }
              : null),
          }}
        >
          <Avatar src={profile.picture} name={displayName} alt="" size="medium" />
        </div>
        <VStack gap={0.5}>
          <Text type="label" color="secondary">
            {t('shop.stylePreview')}
          </Text>
          <Text weight="semibold">
            {displayName}
            {flair && (
              <span aria-hidden style={{ marginLeft: 4 }}>
                {flair}
              </span>
            )}
          </Text>
        </VStack>
      </HStack>
    </Card>
  );
}

export default Shop;
