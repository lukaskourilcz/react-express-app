// The shop: four pieces of devShark merchandise and one crown.
//
// The rings and flairs are gone. What replaced them is real: a sticker set, a
// mug, a T-shirt and a cap, which cost money to make and to post, plus an SVG
// crown that costs tokens and ships nothing.
//
// The balance, the prices, the stock and the orders all come from the server.
// Nothing on this page computes what anything costs, and nothing on this page
// can spend anything — it asks, and the server decides and records. An item
// whose supplier quote has not been entered says so plainly instead of showing
// an invented price, and cannot be ordered through any route.
//
// Everything here is decoration and objects. No purchase changes access,
// content, XP, scores, streaks, ranks, leaderboards or what is unlocked.

import { useMemo, useState } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Banner } from '@astryxdesign/core/Banner';
import { AppToast } from './ui/AppToast';
import { Crown } from './ui/Crown';
import { Kicker } from './landing/LandingKit';
import { useLanguage, useT } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { useAuth } from '../lib/auth';
import { useActiveSubject, subjectNameKey } from '../lib/subjects';
import { friendlyError } from '../lib/api';
import {
  formatMoney,
  useCosmeticMutation,
  useOrderMutation,
  useOrders,
  useShop,
  useWallet,
  type ShopItem,
} from '../lib/rewards';
import { SHIRT_SIZES, type MerchSku, type ShippingAddress } from '../../../shared/rewards';

const TokenIcon = ({ size = 24 }: { size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill={'var(--brand-accent)'} />
    <circle cx="12" cy="12" r="7" fill="none" stroke="var(--brand-on-accent)" strokeWidth="1.5" opacity="0.4" />
    <text x="12" y="16" textAnchor="middle" fontSize="11" fontFamily="-apple-system, sans-serif" fontWeight="700" fill="var(--brand-on-accent)">T</text>
  </svg>
);

const skuNameKey = (sku: MerchSku) => `shop.merch.${sku}.name` as TranslationKey;
const skuBlurbKey = (sku: MerchSku) => `shop.merch.${sku}.blurb` as TranslationKey;

const EMPTY_ADDRESS: ShippingAddress = { name: '', line1: '', line2: '', city: '', postalCode: '', country: '' };

/** One merchandise card. It shows a price only when a real quote produced one,
 * and says why it cannot be ordered when it cannot. */
function MerchCard({
  item,
  onOrder,
  busy,
}: {
  item: ShopItem;
  onOrder: (sku: MerchSku, variant: string) => void;
  busy: boolean;
}) {
  const t = useT();
  const { lang } = useLanguage();
  const [variant, setVariant] = useState(item.variants[0] ?? '');
  const orderable = item.availability === 'available';

  return (
    <Card variant="default" padding={3} width="100%">
      <VStack gap={1.5}>
        <HStack gap={1} align="center" justify="between">
          <Heading level={4}>{t(skuNameKey(item.sku))}</Heading>
          {!orderable && (
            <Badge variant="neutral" label={t(`shop.availability.${item.availability}` as TranslationKey)} />
          )}
        </HStack>
        <Text type="supporting" color="secondary">{t(skuBlurbKey(item.sku))}</Text>

        {item.price ? (
          <HStack gap={1} align="end" wrap="wrap">
            <Text weight="bold">{formatMoney(item.price.minor, item.price.currency, lang)}</Text>
            <Text type="supporting" size="xsm" color="secondary">
              {t(item.price.taxIncluded ? 'shop.taxIncluded' : 'shop.taxExtra')}
            </Text>
            {item.price.tokenPrice !== null && (
              <Text type="supporting" size="xsm" color="secondary">
                {t('shop.orTokens', { n: item.price.tokenPrice })}
              </Text>
            )}
          </HStack>
        ) : (
          <Text type="supporting" size="xsm" color="secondary">{t('shop.noPriceYet')}</Text>
        )}

        {item.variants.length > 0 && (
          <>
            <label className="ss-field-label" htmlFor={`size-${item.sku}`}>{t('shop.sizeLabel')}</label>
            <select
              id={`size-${item.sku}`}
              className="ss-select"
              value={variant}
              disabled={!orderable}
              onChange={(event) => setVariant(event.target.value)}
            >
              {item.variants.map((one) => {
                const free = item.variantStock.find((row) => row.variant === one)?.free ?? 0;
                return (
                  <option key={one} value={one} disabled={free <= 0}>
                    {one}{free <= 0 ? ` — ${t('shop.availability.out_of_stock')}` : ''}
                  </option>
                );
              })}
            </select>
          </>
        )}

        <button
          type="button"
          className="lp-btn lp-btn--primary"
          disabled={!orderable || busy}
          onClick={() => onOrder(item.sku, variant)}
        >
          {t('shop.order')}
        </button>
      </VStack>
    </Card>
  );
}

function Shop() {
  const t = useT();
  const { lang } = useLanguage();
  const { isAuthenticated } = useAuth();
  const subject = useActiveSubject();
  const shop = useShop();
  const wallet = useWallet(isAuthenticated);
  const orders = useOrders(isAuthenticated);
  const cosmetic = useCosmeticMutation();
  const order = useOrderMutation();

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [checkout, setCheckout] = useState<{ sku: MerchSku; variant: string } | null>(null);
  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);

  const balance = wallet.data?.balance ?? 0;
  const ownsCrown = useMemo(
    () => (wallet.data?.cosmetics ?? []).some((one) => one.id === 'crown'),
    [wallet.data],
  );
  const wearingCrown = useMemo(
    () => (wallet.data?.cosmetics ?? []).some((one) => one.id === 'crown' && one.equipped),
    [wallet.data],
  );

  const submitOrder = (paymentKind: 'tokens' | 'cash') => {
    if (!checkout) return;
    order.mutate(
      { items: [{ ...checkout, quantity: 1 }], address, paymentKind },
      {
        onSuccess: (result) => {
          setCheckout(null);
          setAddress(EMPTY_ADDRESS);
          setToast({
            msg: result.state === 'paid' ? t('shop.orderPlaced') : t('shop.orderAwaitingPayment'),
            ok: true,
          });
        },
        onError: (error) => setToast({ msg: friendlyError(error), ok: false }),
      },
    );
  };

  return (
    <VStack gap={5} width="100%" maxWidth={1080}>
      <VStack gap={1}>
        <Kicker>{t('shop.kicker')}</Kicker>
        <Heading level={1} type="display-3">{t('shop.title')}</Heading>
        <Text type="large" color="secondary">{t('shop.subtitle')}</Text>
      </VStack>

      {shop.data?.testMode && <Banner status="warning" title={t('shop.testMode')} />}

      {/* The wallet. The recent movements are shown beside the balance because
          a balance nobody can account for is what this replaced. */}
      <div className="ss-raised ss-pop" style={{ display: 'flex', width: '100%' }}>
        <Card variant="muted" padding={5} width="100%">
          <HStack gap={3} align="center" wrap="wrap">
            <TokenIcon size={48} />
            <VStack gap={0.5}>
              <Text type="label" weight="bold" color="secondary">{t('shop.balanceLabel')}</Text>
              <HStack gap={1} align="end" wrap="wrap">
                <Heading level={2} type="display-2" color="accent">
                  {isAuthenticated ? balance.toLocaleString() : '—'}
                </Heading>
                <Text type="large" weight="bold" color="accent">{t('shop.tokensUnit')}</Text>
              </HStack>
            </VStack>
            <div style={{ marginLeft: 'auto' }}>
              <HStack gap={1} align="center" wrap="wrap" justify="end">
                <Badge variant="neutral" label={t(subjectNameKey(subject.id))} />
                <Badge variant="cyan" label={t('shop.earnRate')} />
              </HStack>
            </div>
          </HStack>
          {!isAuthenticated && <Text type="supporting" color="secondary">{t('shop.signInForWallet')}</Text>}
          {isAuthenticated && (wallet.data?.entries.length ?? 0) > 0 && (
            <ul className="ss-ledger">
              {wallet.data!.entries.slice(0, 5).map((entry) => (
                <li key={entry.eventId}>
                  <span>{t(`shop.reason.${entry.reason}` as TranslationKey)}</span>
                  <span className={entry.amount > 0 ? 'ss-ledger__in' : 'ss-ledger__out'}>
                    {entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {shop.isLoading && <Text type="supporting" color="secondary" role="status">{t('common.loading')}</Text>}
      {shop.isError && <Banner status="warning" title={t('shop.loadError')} />}

      {/* The crown: cosmetic, token-priced, and nothing is posted. */}
      {shop.data?.crown.available && (
        <VStack gap={2}>
          <Heading level={3}>{t('shop.crownSection')}</Heading>
          <Card variant="default" padding={3} width="100%">
            <HStack gap={2} align="center" wrap="wrap">
              <Crown size={44} />
              <VStack gap={0.5}>
                <Heading level={4}>{t('shop.crownName')}</Heading>
                <Text type="supporting" color="secondary">{t('shop.crownBlurb')}</Text>
              </VStack>
              <div style={{ marginLeft: 'auto' }}>
                <HStack gap={1} align="center" wrap="wrap">
                  {!ownsCrown && <Text weight="bold">{t('shop.tokenPrice', { n: shop.data.crown.tokenPrice })}</Text>}
                  {ownsCrown ? (
                    <button
                      type="button"
                      className="lp-btn"
                      disabled={cosmetic.isPending}
                      onClick={() => cosmetic.mutate({ op: wearingCrown ? 'unequip' : 'equip' })}
                    >
                      {t(wearingCrown ? 'shop.crownRemove' : 'shop.crownWear')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="lp-btn lp-btn--primary"
                      disabled={!isAuthenticated || cosmetic.isPending || balance < shop.data.crown.tokenPrice}
                      onClick={() => cosmetic.mutate({ op: 'buy' }, {
                        onSuccess: () => setToast({ msg: t('shop.crownBought'), ok: true }),
                        onError: (error) => setToast({ msg: friendlyError(error), ok: false }),
                      })}
                    >
                      {t('shop.buy')}
                    </button>
                  )}
                </HStack>
              </div>
            </HStack>
          </Card>
        </VStack>
      )}

      {/* Merchandise. */}
      <VStack gap={2}>
        <Heading level={3}>{t('shop.merchSection')}</Heading>
        {!shop.data?.enabled && <Banner status="info" title={t('shop.merchClosed')} />}
        <Grid columns={{ minWidth: 260, max: 3 }} gap={2} width="100%">
          {(shop.data?.items ?? []).map((item) => (
            <MerchCard
              key={item.sku}
              item={item}
              busy={order.isPending}
              onOrder={(sku, variant) => setCheckout({ sku, variant })}
            />
          ))}
        </Grid>
        {shop.data?.policyUrl && (
          <a className="cd-link" href={shop.data.policyUrl} target="_blank" rel="noreferrer">
            {t('shop.policyLink')}
          </a>
        )}
      </VStack>

      {/* Checkout. Only the fields a parcel needs, and nothing beyond them. */}
      {checkout && (
        <Card variant="muted" padding={3} width="100%">
          <VStack gap={1.5}>
            <Heading level={4}>{t('shop.checkoutTitle', { item: t(skuNameKey(checkout.sku)) })}</Heading>
            {([
              ['name', 'shop.address.name'],
              ['line1', 'shop.address.line1'],
              ['line2', 'shop.address.line2'],
              ['city', 'shop.address.city'],
              ['postalCode', 'shop.address.postalCode'],
              ['country', 'shop.address.country'],
            ] as const).map(([field, key]) => (
              <div key={field}>
                <label className="ss-field-label" htmlFor={`addr-${field}`}>{t(key)}</label>
                <input
                  id={`addr-${field}`}
                  className="ss-input"
                  autoComplete={field === 'country' ? 'country' : field === 'postalCode' ? 'postal-code' : 'off'}
                  maxLength={field === 'country' ? 2 : 120}
                  value={address[field] ?? ''}
                  onChange={(event) => setAddress((current) => ({ ...current, [field]: event.target.value }))}
                />
              </div>
            ))}
            <Text type="supporting" size="xsm" color="secondary">{t('shop.addressNote')}</Text>
            <HStack gap={1} wrap="wrap">
              <button
                type="button"
                className="lp-btn lp-btn--primary"
                disabled={order.isPending}
                onClick={() => submitOrder('tokens')}
              >
                {t('shop.payWithTokens')}
              </button>
              {shop.data?.cashCheckoutEnabled && (
                <button type="button" className="lp-btn" disabled={order.isPending} onClick={() => submitOrder('cash')}>
                  {t('shop.payWithMoney')}
                </button>
              )}
              <button type="button" className="lp-btn lp-btn--quiet" onClick={() => setCheckout(null)}>
                {t('shop.cancelCheckout')}
              </button>
            </HStack>
          </VStack>
        </Card>
      )}

      {/* Orders. */}
      {isAuthenticated && (orders.data?.orders.length ?? 0) > 0 && (
        <VStack gap={2}>
          <Heading level={3}>{t('shop.ordersSection')}</Heading>
          <ul className="ss-orders">
            {orders.data!.orders.map((one) => (
              <li key={one.orderId}>
                <span className="ss-orders__items">
                  {one.items.map((line) => `${t(skuNameKey(line.sku as MerchSku))}${line.variant ? ` (${line.variant})` : ''} ×${line.quantity}`).join(', ')}
                </span>
                <span className="ss-orders__state">{t(`shop.state.${one.state}` as TranslationKey)}</span>
                {one.totalMinor !== null && one.currency && (
                  <span>{formatMoney(one.totalMinor, one.currency, lang)}</span>
                )}
                {one.trackingRef && <span>{one.carrier} · {one.trackingRef}</span>}
                {one.testMode && <Badge variant="neutral" label={t('shop.testOrder')} />}
              </li>
            ))}
          </ul>
        </VStack>
      )}

      <Text type="supporting" size="xsm" color="secondary">{t('shop.fairnessNote')}</Text>

      <AppToast
        open={!!toast}
        onClose={() => setToast(null)}
        severity={toast?.ok ? 'success' : 'info'}
        autoHideDuration={4000}
        message={toast?.msg ?? ''}
      />
    </VStack>
  );
}

export default Shop;
export { SHIRT_SIZES };
