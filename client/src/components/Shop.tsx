// Token shop. Currency = tokens (separate from XP), earned passively as 10% of
// every XP gain plus a one-time 200-token sign-up bonus. Spend them on a small
// catalogue: a stackable Double-XP booster, avatar rings, title flairs, and
// instant unlocks for individual Learn paths.
//
// Redesigned on the Astryx design system: an accent-tinted wallet header, then
// three sections of purchasable items rendered as Cards in a responsive Grid.
// MUI Snackbar/Alert is kept for the toast behaviour.

import { useState } from 'react';
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
import {
  CATALOGUE,
  purchase,
  priceOf,
  equip,
  useInventory,
  isPathAlreadyUnlocked,
  useEquippedRingColor,
  useEquippedFlair,
  type Product,
  type ProductKind,
} from '../lib/shop';
import { useGameConfig } from '../lib/gameConfig';
import {
  pushProgressToServer,
  useExtraUnlocks,
  useRoadmapProgress,
} from '../lib/roadmap';
import { getCategoryLabel } from '../lib/categories';
import { useAuth, getUserProfile } from '../lib/auth';
import { useActiveSubject } from '../lib/subjects';

const TokenIcon = ({ size = 24 }: { size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill={'var(--brand-accent)'} />
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

// A tinted rounded tile holding the product/emoji, coloured by the product's
// accent (path topics) or the brand accent otherwise — mirrors SubjectPicker.
function EmojiTile({ emoji, color, size = 46 }: { emoji: string; color?: string; size?: number }) {
  const accent = color ?? 'var(--brand-accent)';
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        display: 'grid',
        placeItems: 'center',
        fontSize: size * 0.55,
        lineHeight: 1,
        flexShrink: 0,
        background: `color-mix(in srgb, ${accent} 15%, transparent)`,
        boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${accent} 40%, transparent)`,
      }}
    >
      {emoji}
    </div>
  );
}

// Sections ordered by value to the learner: functional unlocks first (paths),
// then boosters, then cosmetics — with rings + flairs merged into one "Style"
// section so the shop reads as three clear ideas instead of four lists.
const SECTIONS: { key: TranslationKey; kinds: ProductKind[]; emoji: string }[] = [
  { key: 'shop.section.paths', kinds: ['path'], emoji: '🧭' },
  { key: 'shop.section.boosters', kinds: ['booster'], emoji: '⚡' },
  { key: 'shop.section.style', kinds: ['ring', 'flair'], emoji: '✨' },
];

function Shop() {
  const t = useT();
  const tokens = useTokens();
  const inv = useInventory();
  const config = useGameConfig();
  // The shop is per platform: tokens, inventory and the path list all belong
  // to the active subject.
  const subject = useActiveSubject();
  const { isAuthenticated } = useAuth();
  // Subscribe so the "Unlocked" badge updates the moment a buy lands.
  useRoadmapProgress();
  useExtraUnlocks();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const handleBuy = (p: Product) => {
    const res = purchase(p.id);
    const displayName =
      p.kind === 'path' && p.topic ? getCategoryLabel(p.topic) : t(`shop.item.${p.id}.name` as TranslationKey);
    if (res === 'ok') {
      setToast({ msg: t('shop.purchased', { name: displayName }), ok: true });
      // Path purchases live in the synced roadmap blob — push immediately so
      // the unlock follows the learner across devices.
      if (p.kind === 'path' && isAuthenticated) {
        pushProgressToServer().catch(() => {});
      }
    } else if (res === 'owned') {
      setToast({ msg: p.kind === 'path' ? t('shop.pathAlreadyUnlocked') : t('shop.alreadyOwned'), ok: false });
    } else {
      setToast({ msg: t('shop.insufficient'), ok: false });
    }
  };

  return (
    <VStack gap={5} width="100%" maxWidth={1080}>
      <VStack gap={1}>
        <Text type="label" weight="bold" color="accent">
          {t('shop.kicker')}
        </Text>
        <HStack gap={1.5} align="center" wrap="wrap">
          <span aria-hidden className="ss-float" style={{ display: 'inline-flex', fontSize: '1.9rem', lineHeight: 1 }}>
            🛒
          </span>
          <Heading level={1} type="display-3">
            <span className="ss-gradient-text">{t('shop.title')}</span>
          </Heading>
        </HStack>
        <Text type="large" color="secondary">
          {t('shop.subtitle')}
        </Text>
      </VStack>

      {/* Wallet: the accent-tinted balance is the anchor of the page — a big,
          bold token count with a gently bobbing coin to make spending feel fun. */}
      <div className="ss-lift ss-pop" style={{ display: 'flex', width: '100%' }}>
        <Card variant="muted" padding={4} width="100%">
          <HStack gap={3} align="center" wrap="wrap">
            <span className="ss-float" style={{ display: 'inline-flex' }}>
              <TokenIcon size={52} />
            </span>
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
                <Badge variant="neutral" label={`${subject.emoji} ${subject.label}`} />
                <Badge variant="cyan" label={t('shop.earnRate')} />
              </HStack>
            </div>
          </HStack>
        </Card>
      </div>

      {SECTIONS.map(({ key, kinds, emoji }) => (
        <VStack key={key} gap={2}>
          <VStack gap={0.5}>
            <HStack gap={1.5} align="center">
              <span
                aria-hidden
                className="ss-emoji-tile"
                style={{ width: 34, height: 34, fontSize: '1.15rem', background: 'var(--ss-card-bg)' }}
              >
                {emoji}
              </span>
              <Heading level={3}>{t(key)}</Heading>
            </HStack>
            {kinds.includes('path') && (
              <Text type="supporting" color="secondary">
                {t('shop.section.pathsHint', { price: config.shop.pathUnlockPrice })}
              </Text>
            )}
          </VStack>
          {/* Style section: a live preview of YOUR avatar + name with the
              currently equipped ring/flair, so cosmetics are tangible before
              (and after) buying. */}
          {kinds.includes('ring') && <StylePreview />}
          <Grid columns={{ minWidth: 260, max: 3 }} gap={2} width="100%">
            {CATALOGUE.filter((p) => kinds.includes(p.kind))
              // Path products exist for every subject; show only the active one's.
              .filter((p) => p.kind !== 'path' || p.subject === subject.id)
              .map((p) => {
                const ownedPath = p.kind === 'path' && p.topic ? isPathAlreadyUnlocked(p.topic) : false;
                const price = priceOf(p, config);
                return (
                  <ProductCard
                    key={p.id}
                    product={p}
                    price={price}
                    owned={p.kind === 'path' ? ownedPath : inv.owned.includes(p.id)}
                    equipped={inv.ring === p.id || inv.flair === p.id}
                    charges={p.kind === 'booster' ? inv.doubleXp : 0}
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
  charges: number;
  canAfford: boolean;
  onBuy: () => void;
  onEquip: () => void;
}

function ProductCard({ product, price, owned, equipped, charges, canAfford, onBuy, onEquip }: ProductCardProps) {
  const t = useT();
  const isBooster = product.kind === 'booster';
  const isPath = product.kind === 'path';
  const name = isPath && product.topic
    ? t('shop.path.name', { topic: getCategoryLabel(product.topic) })
    : t(`shop.item.${product.id}.name` as TranslationKey);
  const desc = isPath
    ? t('shop.path.desc')
    : t(`shop.item.${product.id}.desc` as TranslationKey);

  // Accent-tinted price pill with a mini token coin — reads as "spend me",
  // coloured by the product's own accent (path topics) or the brand accent.
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
  if (isPath) {
    action = owned ? (
      <Badge variant="success" label={t('shop.pathUnlocked')} />
    ) : (
      <Button size="sm" variant="primary" label={t('shop.unlockPath')} isDisabled={!canAfford} onClick={onBuy} />
    );
  } else if (!isBooster && owned) {
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
        {isBooster && charges > 0 && (
          <Text type="supporting" color="accent" weight="bold" textWrap="nowrap">
            {t('shop.armed', { count: charges })}
          </Text>
        )}
        <Button size="sm" variant="primary" label={t('shop.buy')} isDisabled={!canAfford} onClick={onBuy} />
      </HStack>
    );
  }

  return (
    <div className="ss-lift" style={{ display: 'flex', width: '100%' }}>
      <Card padding={3} width="100%">
        <VStack gap={2} height="100%" justify="between">
          <HStack gap={1.5} align="center">
            <EmojiTile emoji={product.emoji} color={product.color} size={44} />
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
