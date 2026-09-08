// The devShark shop (issues #168, #169, #170, #173).
//
// Four branded items and one avatar cosmetic. Nothing here is authoritative:
// the balance is the server's ledger, prices and availability are the server's
// configuration, and every total is computed there — the browser names a SKU, a
// variant and a quantity, and reads back what it costs.
//
// While the owner has not supplied a quote, a currency, a region, stock, a
// supplier or a payment provider, the item plainly cannot be bought and the
// card says which piece is missing. No placeholder price is ever shown. Rings
// and flairs are no longer sold; accounts that own one keep it.

import { useMemo, useState } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Banner } from '@astryxdesign/core/Banner';
import { AppToast } from './ui/AppToast';
import { useLanguage, useT } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { useAuth, getUserProfile } from '../lib/auth';
import { useActiveSubject, subjectNameKey } from '../lib/subjects';
import { CrownIcon, IconTile, SparkleIcon } from './ui/icons';
import { LearnerAvatar } from './ui/LearnerAvatar';
import { useInventory, useEquippedRingColor, useEquippedFlair } from '../lib/shop';
import {
  formatCash,
  newIdempotencyKey,
  useCancelOrder,
  useCosmetics,
  useEquipCosmetic,
  useOrders,
  usePlaceOrder,
  useShopCatalog,
  useWallet,
} from '../lib/rewards';
import type { MerchListing } from '../../../shared/merchandise';
import type { ShippingAddress } from '../../../shared/rewards';

const TokenIcon = ({ size = 24 }: { size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill={'var(--brand-accent)'} />
    <circle cx="12" cy="12" r="7" fill="none" stroke="var(--brand-on-accent)" strokeWidth="1.5" opacity="0.4" />
    <text x="12" y="16" textAnchor="middle" fontSize="11" fontFamily="-apple-system, sans-serif" fontWeight="700" fill="var(--brand-on-accent)">T</text>
  </svg>
);

const EMPTY_ADDRESS: ShippingAddress = { name: '', line1: '', city: '', postcode: '', country: '' };

function Shop() {
  const t = useT();
  const { lang } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const subject = useActiveSubject();
  const wallet = useWallet(isAuthenticated);
  const catalog = useShopCatalog(isAuthenticated);
  const cosmetics = useCosmetics(isAuthenticated);
  const orders = useOrders(isAuthenticated);
  const place = usePlaceOrder();
  const cancel = useCancelOrder();
  const equip = useEquipCosmetic();
  const legacy = useInventory();
  const legacyRingColor = useEquippedRingColor();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const balance = wallet.data?.wallet.balance ?? 0;
  const ownedSkus = useMemo(() => new Set((cosmetics.data?.owned ?? []).map((one) => one.sku)), [cosmetics.data]);
  const equipped = cosmetics.data?.equipped ?? null;
  const profile = getUserProfile(user);
  const displayName = profile.name?.split(' ')[0] || profile.email?.split('@')[0] || t('auth.account');

  const buy = (listing: MerchListing, payment: 'tokens' | 'cash', variantId: string | null, address?: ShippingAddress) => {
    place.mutate(
      {
        sku: listing.product.sku,
        variantId,
        quantity: 1,
        payment,
        ...(address ? { address } : {}),
        idempotencyKey: newIdempotencyKey(),
      },
      {
        onSuccess: () => setToast({ msg: t('shop.orderPlaced'), ok: true }),
        onError: (error) => setToast({ msg: (error as Error).message || t('shop.orderFailed'), ok: false }),
      },
    );
  };

  if (!isAuthenticated) {
    return (
      <VStack gap={3} width="100%" maxWidth={1080}>
        <Heading level={1} type="display-3">{t('shop.title')}</Heading>
        <Banner status="info" title={t('shop.signIn')} />
      </VStack>
    );
  }

  return (
    <VStack gap={5} width="100%" maxWidth={1080}>
      <VStack gap={1}>
        <span className="ss-kicker">{t('shop.kicker')}</span>
        <Heading level={1} type="display-3">{t('shop.title')}</Heading>
        <Text type="large" color="secondary">{t('shop.subtitle')}</Text>
      </VStack>

      {/* The wallet, as the ledger has it. */}
      <div className="ss-raised ss-pop" style={{ display: 'flex', width: '100%' }}>
        <Card variant="muted" padding={5} width="100%">
          <HStack gap={3} align="center" wrap="wrap">
            <TokenIcon size={48} />
            <VStack gap={0.5}>
              <Text type="label" weight="bold" color="secondary">{t('shop.balanceLabel')}</Text>
              <HStack gap={1} align="end" wrap="wrap">
                <Heading level={2} type="display-2" color="accent">{balance.toLocaleString()}</Heading>
                <Text type="large" weight="bold" color="accent">{t('shop.tokensUnit')}</Text>
              </HStack>
              <Text type="supporting" color="secondary">{t('shop.walletVerified')}</Text>
            </VStack>
            <div style={{ marginLeft: 'auto' }}>
              <HStack gap={1} align="center" wrap="wrap" justify="end">
                <Badge variant="neutral" label={t(subjectNameKey(subject.id))} />
                <Badge variant="cyan" label={t('shop.earnRate')} />
              </HStack>
            </div>
          </HStack>
        </Card>
      </div>

      {wallet.isLoading && <Banner status="info" title={t('shop.syncing')} />}
      {wallet.isError && <Banner status="error" title={t('shop.walletError')} />}
      {catalog.data && !catalog.data.paymentConfigured && (
        <Banner status="info" title={t('shop.noPayments')} description={t('shop.noPaymentsBody')} />
      )}
      {catalog.data?.paymentConfigured && catalog.data.testMode && (
        <Banner status="warning" title={t('shop.testMode')} description={t('shop.testModeBody')} />
      )}
      {(wallet.data?.legacy.reported ?? 0) > 0 && (
        <Banner status="info" title={t('shop.legacyTitle')} description={t('shop.legacyBody', { n: wallet.data!.legacy.reported! })} />
      )}

      <VStack gap={2}>
        <HStack gap={1.5} align="center">
          <IconTile size={32}><SparkleIcon size={16} /></IconTile>
          <Heading level={3}>{t('shop.section.merch')}</Heading>
        </HStack>
        {catalog.isLoading && <Text type="supporting" color="secondary" role="status">{t('common.loading')}</Text>}
        {catalog.isError && <Banner status="error" title={t('shop.catalogError')} />}
        <Grid columns={{ minWidth: 280, max: 3 }} gap={2} width="100%">
          {(catalog.data?.listings ?? []).map((listing) => (
            <ProductCard
              key={listing.product.sku}
              listing={listing}
              lang={lang}
              balance={balance}
              owned={ownedSkus.has(listing.product.sku)}
              equipped={equipped === listing.product.sku}
              busy={place.isPending}
              onBuy={buy}
              onEquip={(next) => equip.mutate({ sku: listing.product.sku, equip: next })}
            />
          ))}
        </Grid>
      </VStack>

      {/* What the crown looks like on this learner's own avatar. */}
      <Card variant="muted" padding={2} width="fit-content">
        <HStack gap={1.5} align="center">
          <LearnerAvatar
            src={profile.picture}
            name={displayName}
            size="medium"
            crowned={equipped === 'crown'}
            ringColor={legacyRingColor}
          />
          <VStack gap={0.5}>
            <Text type="label" color="secondary">{t('shop.stylePreview')}</Text>
            <Text weight="semibold">{displayName}<LegacyFlair /></Text>
          </VStack>
        </HStack>
      </Card>

      {legacy.owned.length > 0 && (
        <Banner status="info" title={t('shop.retiredTitle')} description={t('shop.retiredBody')} />
      )}

      <OrderHistory
        lang={lang}
        loading={orders.isLoading}
        error={orders.isError}
        orders={orders.data?.orders ?? []}
        onCancel={(orderId) => cancel.mutate(orderId, {
          onSuccess: () => setToast({ msg: t('shop.orderCancelled'), ok: true }),
          onError: () => setToast({ msg: t('shop.orderFailed'), ok: false }),
        })}
      />

      <AppToast open={!!toast} onClose={() => setToast(null)} severity={toast?.ok ? 'success' : 'info'} autoHideDuration={3500} message={toast?.msg ?? ''} />
    </VStack>
  );
}

function LegacyFlair() {
  const flair = useEquippedFlair();
  if (!flair) return null;
  return <span aria-hidden style={{ marginLeft: 4 }}>{flair}</span>;
}

function ProductCard({ listing, lang, balance, owned, equipped, busy, onBuy, onEquip }: {
  listing: MerchListing;
  lang: 'en' | 'cs';
  balance: number;
  owned: boolean;
  equipped: boolean;
  busy: boolean;
  onBuy: (listing: MerchListing, payment: 'tokens' | 'cash', variantId: string | null, address?: ShippingAddress) => void;
  onEquip: (next: boolean) => void;
}) {
  const t = useT();
  const { product, pricing, availability } = listing;
  const [variantId, setVariantId] = useState<string | null>(product.variants[0]?.id ?? null);
  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [showAddress, setShowAddress] = useState(false);
  const cash = formatCash(pricing?.cashMinor ?? null, pricing?.currency ?? null, lang === 'cs' ? 'cs-CZ' : 'en-GB');
  const affordable = pricing?.tokens !== null && pricing?.tokens !== undefined && balance >= pricing.tokens;

  return (
    <div className="ss-raised" style={{ display: 'flex', width: '100%' }}>
      <Card padding={3} width="100%">
        <VStack gap={2} height="100%" justify="between">
          <VStack gap={1}>
            <HStack gap={1.5} align="center">
              {product.sku === 'crown'
                ? <span className="ss-tile" style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', color: 'var(--brand-gold, #d4af37)' }}><CrownIcon size={26} /></span>
                : <span className="ss-tile" style={{ width: 44, height: 44, display: 'grid', placeItems: 'center' }}><SparkleIcon size={20} /></span>}
              <VStack gap={0.5}>
                <Text weight="bold">{product.name[lang] || product.name.en}</Text>
                <Text type="supporting" color="secondary">{product.blurb[lang] || product.blurb.en}</Text>
              </VStack>
            </HStack>
            <Text type="supporting" size="xsm" color="secondary">{product.spec[lang] || product.spec.en}</Text>
            {product.kind === 'physical' && <Text type="supporting" size="xsm" color="secondary">{t('shop.deliveryNote')}</Text>}
            {product.kind === 'cosmetic' && <Text type="supporting" size="xsm" color="secondary">{t('shop.crownNote')}</Text>}
          </VStack>

          {product.variants.length > 0 && (
            <VStack gap={0.5}>
              <label htmlFor={`variant-${product.sku}`}>
                <Text type="label" color="secondary">{t('shop.variantLabel')}</Text>
              </label>
              <select
                id={`variant-${product.sku}`}
                className="cd-input"
                value={variantId ?? ''}
                onChange={(event) => setVariantId(event.target.value)}
              >
                {product.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>{variant.label[lang] || variant.label.en}</option>
                ))}
              </select>
            </VStack>
          )}

          <VStack gap={1}>
            <HStack gap={1} align="center" wrap="wrap">
              {pricing?.tokens !== null && pricing?.tokens !== undefined
                ? <Badge variant="cyan" label={t('shop.tokenPrice', { n: pricing.tokens })} />
                : <Badge variant="neutral" label={t('shop.noTokenPrice')} />}
              {cash && <Badge variant="neutral" label={cash} />}
            </HStack>

            {availability.blockers.length > 0 && (
              <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                {[...new Set(availability.blockers)].map((blocker) => (
                  <li key={blocker}>
                    <Text type="supporting" size="xsm" color="secondary">{t(`shop.blocker.${blocker}` as TranslationKey)}</Text>
                  </li>
                ))}
              </ul>
            )}

            {owned && product.kind === 'cosmetic' ? (
              <Button size="sm" variant={equipped ? 'primary' : 'secondary'} label={equipped ? t('shop.unequip') : t('shop.equip')} onClick={() => onEquip(!equipped)} />
            ) : (
              <HStack gap={1} wrap="wrap">
                <Button
                  size="sm"
                  variant="primary"
                  label={t('shop.redeem')}
                  isDisabled={busy || !availability.tokens || !affordable || (product.kind === 'physical' && !showAddress)}
                  onClick={() => onBuy(listing, 'tokens', variantId, product.kind === 'physical' ? address : undefined)}
                />
                {product.kind === 'physical' && (
                  <Button size="sm" variant="secondary" label={showAddress ? t('shop.hideAddress') : t('shop.addAddress')} onClick={() => setShowAddress((prev) => !prev)} />
                )}
              </HStack>
            )}
            {!affordable && availability.tokens && <Text type="supporting" size="xsm" color="secondary">{t('shop.insufficient')}</Text>}
          </VStack>

          {showAddress && product.kind === 'physical' && (
            <AddressFields value={address} onChange={setAddress} sku={product.sku} />
          )}
        </VStack>
      </Card>
    </div>
  );
}

function AddressFields({ value, onChange, sku }: { value: ShippingAddress; onChange: (next: ShippingAddress) => void; sku: string }) {
  const t = useT();
  const field = (key: keyof ShippingAddress, label: TranslationKey, maxLength: number) => (
    <VStack gap={0.5} key={key}>
      <label htmlFor={`${sku}-${key}`}><Text type="label" color="secondary">{t(label)}</Text></label>
      <input
        id={`${sku}-${key}`}
        className="cd-input"
        maxLength={maxLength}
        value={(value[key] as string) ?? ''}
        onChange={(event) => onChange({ ...value, [key]: event.target.value })}
      />
    </VStack>
  );
  return (
    <VStack gap={1}>
      <Text type="supporting" size="xsm" color="secondary">{t('shop.addressNote')}</Text>
      {field('name', 'shop.address.name', 120)}
      {field('line1', 'shop.address.line1', 160)}
      {field('city', 'shop.address.city', 100)}
      {field('postcode', 'shop.address.postcode', 20)}
      {field('country', 'shop.address.country', 2)}
    </VStack>
  );
}

function OrderHistory({ lang, loading, error, orders, onCancel }: {
  lang: 'en' | 'cs';
  loading: boolean;
  error: boolean;
  orders: import('../../../shared/rewards').Order[];
  onCancel: (orderId: string) => void;
}) {
  const t = useT();
  return (
    <VStack gap={2}>
      <Heading level={3}>{t('shop.ordersTitle')}</Heading>
      {loading && <Text type="supporting" color="secondary" role="status">{t('common.loading')}</Text>}
      {error && <Banner status="error" title={t('shop.ordersError')} />}
      {!loading && orders.length === 0 && <Text type="supporting" color="secondary">{t('shop.ordersEmpty')}</Text>}
      {orders.map((order) => (
        <Card key={order.orderId} padding={3} width="100%">
          <VStack gap={1}>
            <HStack gap={1} align="center" wrap="wrap" justify="between">
              <Text weight="bold">{order.lines.map((line) => `${line.quantity}× ${line.sku}${line.variantId ? ` (${line.variantId})` : ''}`).join(', ')}</Text>
              <Badge variant="neutral" label={t(`shop.status.${order.status}` as TranslationKey)} />
            </HStack>
            <Text type="supporting" size="xsm" color="secondary">
              {order.payment === 'tokens'
                ? t('shop.paidTokens', { n: order.totalTokens ?? 0 })
                : formatCash(order.totalCashMinor, order.currency, lang === 'cs' ? 'cs-CZ' : 'en-GB') ?? ''}
            </Text>
            {order.trackingCode && (
              <Text type="supporting" size="xsm" color="secondary">
                {t('shop.tracking', { carrier: order.trackingCarrier ?? '', code: order.trackingCode })}
              </Text>
            )}
            {(order.status === 'pending' || order.status === 'paid') && (
              <HStack>
                <Button size="sm" variant="secondary" label={t('shop.cancelOrder')} onClick={() => onCancel(order.orderId)} />
              </HStack>
            )}
          </VStack>
        </Card>
      ))}
    </VStack>
  );
}

export default Shop;
