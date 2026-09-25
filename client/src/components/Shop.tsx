// Rewards (the /shop route; the navigation says Rewards since #227).
//
// Coins are the server ledger of migration 028: product copy says coins, the
// API keeps `token`. The balance, the ledger lines, the prices, the stock and
// the orders all come from the server. Nothing on this page computes what
// anything costs or what anything earns, and nothing on it can credit a coin:
// it asks, and the server decides and records.
//
// Sections, in the order of the second handoff (section 7.4): the wallet with
// its last 25 ledger lines, "How to earn" with live progress, "Invite a
// friend" (#228), merchandise, the crown and streak protection, orders and
// claims, and "Find devShark elsewhere". Redeeming merchandise is Premium
// only: a free account sees the items and the upgrade sheet, and the server
// answers a redemption with 402. Buying is Spreadshop's (#229): each tile links
// to the item in the devShark shop there when client/product-catalog.ts has
// its URL, and a tile shows a mockup only when the build found one under
// client/public/merch.
//
// Nothing here changes access, content, XP, scores, streaks, ranks,
// leaderboards or what is unlocked.

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { AppToast } from './ui/AppToast';
import { Crown } from './ui/Crown';
import { Kicker } from './landing/LandingKit';
import { SocialProfiles } from './SocialProfiles';
import { ReferralInvite } from './ReferralInvite';
import { useLanguage, useT } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { useAuth } from '../lib/auth';
import { friendlyError } from '../lib/api';
import { useEntitlement } from '../lib/entitlement';
import { useGameConfig } from '../lib/gameConfig';
import { openUpgradeSheet } from '../lib/upgradeSheet';
import { categoryLabelKey } from '../lib/categories';
import {
  formatMoney,
  useCosmeticMutation,
  useOrderMutation,
  useOrders,
  useShop,
  useProtectionMutation,
  useWallet,
  type EarnSummary,
  type ShopItem,
  type WalletEntry,
} from '../lib/rewards';
import { MERCH_IMAGES } from '../lib/merchImages';
import { MERCH_SHOP } from '../../product-catalog';
import { EVOLVING_CHALLENGES } from '../../../shared/evolving';
import { SHIRT_SIZES, type MerchPromo, type MerchSku, type ShippingAddress } from '../../../shared/rewards';
import './Rewards.css';

type TFn = ReturnType<typeof useT>;

/** A coin: the accent disc with an inner rim. Decorative; the number beside it
 * carries the meaning. */
const CoinIcon = ({ size = 24 }: { size?: number }) => (
  <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="var(--brand-accent)" />
    <circle cx="12" cy="12" r="6.5" fill="none" stroke="var(--brand-on-accent)" strokeWidth="1.6" opacity="0.55" />
  </svg>
);

const skuNameKey = (sku: MerchSku) => `shop.merch.${sku}.name` as TranslationKey;
const skuBlurbKey = (sku: MerchSku) => `shop.merch.${sku}.blurb` as TranslationKey;
const skuAltKey = (sku: MerchSku) => `shop.merch.${sku}.alt` as TranslationKey;

/** Where each field of the redemption form points the browser's autofill. */
const ADDRESS_AUTOCOMPLETE: Record<keyof ShippingAddress, string> = {
  name: 'shipping name',
  line1: 'shipping address-line1',
  line2: 'shipping address-line2',
  city: 'shipping address-level2',
  postalCode: 'shipping postal-code',
  country: 'shipping country',
};

const EMPTY_ADDRESS: ShippingAddress = { name: '', line1: '', line2: '', city: '', postalCode: '', country: '' };
const LEDGER_PREVIEW = 5;

const projectTitle = (id: string): string => EVOLVING_CHALLENGES.find((one) => one.id === id)?.title.en ?? id;
const isShortPath = (id: string): boolean => EVOLVING_CHALLENGES.find((one) => one.id === id)?.short === true;
const percent = (rate: number): string => String(Math.round(rate * 1000) / 10);

function monthLabel(month: string): string {
  const [year, index] = month.split('-').map(Number);
  if (!year || !index) return month;
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, index - 1, 1)));
}

/** What a ledger line was for, from its reason and the reference the server
 * wrote beside it. */
export function ledgerLabel(entry: Pick<WalletEntry, 'reason' | 'reference'>, t: TFn): string {
  const reference = entry.reference ?? '';
  const [head, ...rest] = reference.split(':');
  if (entry.reason === 'verified-xp') {
    if (head === 'quiz') return t('rewards.ledger.quiz');
    if (head === 'learn') return t('rewards.ledger.learn');
    if (head === 'coding') return t('rewards.ledger.coding');
    if (head === 'challenge') return t('rewards.ledger.challenge');
  }
  if (entry.reason === 'milestone') {
    const value = rest.join(':');
    if (head === 'streak') return t('rewards.ledger.streak', { days: value });
    if (head === 'topic') return t('rewards.ledger.topic', { topic: t(categoryLabelKey(value)) });
    if (head === 'project') return t('rewards.ledger.project', { project: projectTitle(value) });
    if (head === 'month-top') return t('rewards.ledger.monthTop', { month: monthLabel(value) });
  }
  if (entry.reason === 'referral') {
    return reference === 'referral:friend' ? t('rewards.ledger.referralFriend') : t('rewards.ledger.referralInvited');
  }
  if (entry.reason === 'purchase') {
    if (reference === 'crown') return t('rewards.ledger.crown');
    if (reference === 'streak-protection') return t('rewards.ledger.protection');
    return t('rewards.ledger.merch');
  }
  return t(`shop.reason.${entry.reason}` as TranslationKey);
}

/* ── the wallet ────────────────────────────────────────────────────────── */

function Wallet({ signedIn, rules }: { signedIn: boolean; rules: EarnSummary['rules'] }) {
  const t = useT();
  const wallet = useWallet(signedIn);
  const [showAll, setShowAll] = useState(false);
  const entries = wallet.data?.entries ?? [];
  const visible = showAll ? entries : entries.slice(0, LEDGER_PREVIEW);
  const loading = signedIn && wallet.isPending;

  return (
    <section className="rw-wallet ss-raised" aria-labelledby="rw-wallet-title" aria-busy={loading || undefined}>
      <div className="rw-wallet__head">
        <CoinIcon size={44} />
        <div className="rw-wallet__balance">
          <h2 id="rw-wallet-title" className="rw-label">{t('shop.balanceLabel')}</h2>
          <p className="rw-wallet__amount">
            <strong>{signedIn && wallet.data ? wallet.data.balance.toLocaleString('en-GB') : '—'}</strong>
            <span>{t('shop.tokensUnit')}</span>
          </p>
        </div>
        <ul className="rw-wallet__rates" aria-label={t('rewards.earn.xp')}>
          <li>{t('rewards.earnRate', { rate: percent(rules.xpRate) })}</li>
          <li>{t('rewards.earnRatePremium', { rate: percent(rules.xpRate * rules.premiumMultiplier) })}</li>
        </ul>
      </div>

      {!signedIn && <p className="rw-muted">{t('shop.signInForWallet')}</p>}
      {loading && <p className="rw-muted" role="status">{t('common.loading')}</p>}
      {signedIn && wallet.isError && !wallet.data && (
        <div className="rw-inline-error" role="alert">
          <span>{t('rewards.walletError')}</span>
          <Button variant="ghost" size="sm" label={t('quiz.retry')} onClick={() => void wallet.refetch()} />
        </div>
      )}
      {signedIn && wallet.data && entries.length === 0 && <p className="rw-muted">{t('rewards.ledgerEmpty')}</p>}
      {signedIn && entries.length > 0 && (
        <>
          <h3 className="rw-label rw-ledger-title">{t('rewards.ledgerTitle')}</h3>
          <ul className="ss-ledger rw-ledger" id="rw-ledger">
            {visible.map((entry) => (
              <li key={entry.eventId}>
                <span>{ledgerLabel(entry, t)}</span>
                <span className={entry.amount > 0 ? 'ss-ledger__in' : 'ss-ledger__out'}>
                  {entry.amount > 0 ? '+' : '−'}{Math.abs(entry.amount).toLocaleString('en-GB')}
                </span>
              </li>
            ))}
          </ul>
          {entries.length > LEDGER_PREVIEW && (
            <button
              type="button"
              className="rw-btn rw-btn--quiet rw-ledger-toggle"
              aria-expanded={showAll}
              aria-controls="rw-ledger"
              onClick={() => setShowAll((open) => !open)}
            >
              {showAll ? t('rewards.ledgerShowFewer') : t('rewards.ledgerShowAll', { n: entries.length })}
            </button>
          )}
        </>
      )}
    </section>
  );
}

/* ── how to earn ───────────────────────────────────────────────────────── */

interface EarnRow {
  key: string;
  label: string;
  detail?: string;
  premium?: boolean;
  /** The right-hand figure: "+25", "Earned", "Today: 40 of 400". */
  figure?: string;
  done?: boolean;
}

/** The rows of "How to earn", from the rules and, when the server sent it,
 * the learner's progress. Pure, so the tests can read it. */
export function earnRows(earn: EarnSummary, t: TFn, welcomeReceived: boolean): EarnRow[] {
  const { rules, progress } = earn;
  const earned = new Set(progress?.earned ?? []);
  const rows: EarnRow[] = [{
    key: 'xp',
    label: t('rewards.earn.xp'),
    detail: t('rewards.earn.xpDetail', {
      rate: percent(rules.xpRate),
      premiumRate: percent(rules.xpRate * rules.premiumMultiplier),
      cap: rules.dailyXpCap,
    }),
    figure: progress ? t('rewards.earn.xpToday', { n: progress.todayXpCoins, cap: rules.dailyXpCap }) : undefined,
  }];
  if (rules.welcomeGrant > 0) {
    rows.push({
      key: 'welcome',
      label: t('rewards.earn.welcome'),
      detail: t('rewards.earn.welcomeDetail'),
      figure: welcomeReceived ? t('rewards.earn.received') : t('rewards.earn.coins', { n: rules.welcomeGrant }),
      done: welcomeReceived,
    });
  }
  for (const milestone of rules.streakMilestones) {
    if (milestone.coins <= 0) continue;
    const done = earned.has(`streak:${milestone.days}`);
    rows.push({
      key: `streak-${milestone.days}`,
      label: progress && !done
        ? t('rewards.earn.streakProgress', { days: milestone.days, n: Math.min(progress.streak, milestone.days) })
        : t('rewards.earn.streak', { days: milestone.days }),
      premium: true,
      figure: done ? t('rewards.earn.done') : t('rewards.earn.coins', { n: milestone.coins }),
      done,
    });
  }
  if (rules.topicComplete > 0) {
    const open = (progress?.topics ?? [])
      .filter((topic) => topic.passed < topic.total && !earned.has(`topic:${topic.id}`))
      .sort((a, b) => (a.total - a.passed) - (b.total - b.passed) || a.id.localeCompare(b.id))
      .slice(0, 3);
    const doneTopics = [...earned].filter((ref) => ref.startsWith('topic:'));
    for (const ref of doneTopics) {
      rows.push({
        key: ref, label: t('rewards.ledger.topic', { topic: t(categoryLabelKey(ref.slice(6))) }),
        premium: true, figure: t('rewards.earn.done'), done: true,
      });
    }
    if (open.length === 0) {
      rows.push({ key: 'topic-any', label: t('rewards.earn.topicAny'), premium: true, figure: t('rewards.earn.coins', { n: rules.topicComplete }) });
    }
    for (const topic of open) {
      rows.push({
        key: `topic-${topic.id}`,
        label: t('rewards.earn.topic', { topic: t(categoryLabelKey(topic.id)), n: topic.passed, total: topic.total }),
        premium: true,
        figure: t('rewards.earn.coins', { n: rules.topicComplete }),
      });
    }
  }
  const open = (progress?.projects ?? [])
    .filter((project) => project.passed < project.total && !earned.has(`project:${project.id}`))
    .sort((a, b) => (a.total - a.passed) - (b.total - b.passed) || a.id.localeCompare(b.id))
    .slice(0, 2);
  for (const ref of [...earned].filter((one) => one.startsWith('project:'))) {
    rows.push({
      key: ref, label: t('rewards.ledger.project', { project: projectTitle(ref.slice(8)) }),
      premium: true, figure: t('rewards.earn.done'), done: true,
    });
  }
  for (const project of open) {
    const coins = isShortPath(project.id) ? rules.shortPathComplete : rules.projectComplete;
    if (coins <= 0) continue;
    rows.push({
      key: `project-${project.id}`,
      label: t('rewards.earn.project', { project: projectTitle(project.id), n: project.passed, total: project.total }),
      premium: true,
      figure: t('rewards.earn.coins', { n: coins }),
    });
  }
  if (open.length === 0) {
    if (rules.projectComplete > 0) {
      rows.push({ key: 'project-any', label: t('rewards.earn.projectAny'), premium: true, figure: t('rewards.earn.coins', { n: rules.projectComplete }) });
    }
    if (rules.shortPathComplete > 0) {
      rows.push({ key: 'short-any', label: t('rewards.earn.shortPathAny'), premium: true, figure: t('rewards.earn.coins', { n: rules.shortPathComplete }) });
    }
  }
  const [first = 0, second = 0, third = 0] = rules.monthTop;
  if (first + second + third > 0) {
    rows.push({
      key: 'month-top',
      label: t('rewards.earn.monthTop'),
      detail: t('rewards.earn.monthTopDetail', { first, second, third }),
      premium: true,
    });
  }
  return rows;
}

function HowToEarn({ earn, welcomeReceived, premium }: { earn: EarnSummary; welcomeReceived: boolean; premium: boolean }) {
  const t = useT();
  const rows = earnRows(earn, t, welcomeReceived);
  return (
    <section className="rw-section" aria-labelledby="rw-earn-title">
      <Kicker as="h2" id="rw-earn-title">{t('rewards.earnTitle')}</Kicker>
      <p className="rw-muted">{t('rewards.earnIntro')}</p>
      <ul className="rw-earn">
        {rows.map((row) => (
          <li key={row.key} className={row.done ? 'rw-earn__row is-done' : 'rw-earn__row'}>
            <div className="rw-earn__main">
              <span className="rw-earn__label">{row.label}</span>
              {row.detail && <span className="rw-earn__detail">{row.detail}</span>}
            </div>
            <div className="rw-earn__meta">
              {row.premium && <span className="rw-tag">{t('premium.badge')}</span>}
              {row.figure && <span className={row.done ? 'rw-earn__figure is-done' : 'rw-earn__figure'}>{row.figure}</span>}
            </div>
          </li>
        ))}
      </ul>
      {!premium && (
        <div className="rw-premium-note">
          <p>{t('rewards.earn.premiumNote')}</p>
          <button type="button" className="rw-btn" onClick={() => openUpgradeSheet({})}>
            {t('rewards.seePremium')}
          </button>
        </div>
      )}
    </section>
  );
}

/* ── merchandise ───────────────────────────────────────────────────────── */

/** One merchandise tile: the mockup when the build found one, the item, a
 * link to buy it in the devShark shop on Spreadshop when its URL is set, and
 * redemption with coins. The coin price shows only when the owner set one,
 * and the tile says why it cannot be redeemed when it cannot. On a free
 * account the Redeem button stays focusable, reads "Premium" beside it and
 * opens the upgrade sheet. */
export function MerchCard({
  item,
  onOrder,
  busy,
  premiumLocked,
  balance,
  image = MERCH_IMAGES[item.sku],
  productUrl = MERCH_SHOP.products[item.sku],
}: {
  item: ShopItem;
  onOrder: (sku: MerchSku, variant: string) => void;
  busy: boolean;
  premiumLocked: boolean;
  /** The learner's coins, or null while they are unknown (the server decides). */
  balance: number | null;
  /** The mockup under /merch, when one exists. */
  image?: string;
  /** The item's page in the devShark shop, when the owner has set it. */
  productUrl?: string | null;
}) {
  const t = useT();
  const coinsId = useId();
  const freeIn = (size: string) => item.variantStock.find((row) => row.variant === size)?.free ?? 0;
  // Start on a size that can still be sent this month.
  const [variant, setVariant] = useState(item.variants.find((size) => freeIn(size) > 0) ?? item.variants[0] ?? '');
  const orderable = item.availability === 'available';
  const sizeGone = item.variants.length > 0 && freeIn(variant) <= 0;
  const tokenPrice = item.price?.tokenPrice ?? null;
  const short = orderable && balance !== null && tokenPrice !== null && balance < tokenPrice;

  return (
    <article className="rw-merch ss-raised">
      {image && (
        <div className="rw-merch__media">
          <img src={image} alt={t(skuAltKey(item.sku))} width={600} height={600} loading="lazy" decoding="async" />
        </div>
      )}
      <div className="rw-merch__body">
        <h3 className="rw-merch__name">{t(skuNameKey(item.sku))}</h3>
        <p className="rw-muted">{t(skuBlurbKey(item.sku))}</p>
        {productUrl && (
          <a className="rw-merch__buy" href={productUrl} target="_blank" rel="noopener noreferrer">
            {t('shop.buyAtShop')}
            <span aria-hidden="true">&nbsp;↗</span>
            <span className="rw-sr-only"> {t('rewards.social.newTab')}</span>
          </a>
        )}

        <div className="rw-merch__coins" role="group" aria-labelledby={coinsId}>
          <div className="rw-merch__price">
            <span id={coinsId} className="rw-label">{t('shop.withCoins')}</span>
            {tokenPrice !== null && <strong>{t('shop.tokenPrice', { n: tokenPrice.toLocaleString('en-GB') })}</strong>}
            {!orderable && <span className="rw-tag">{t(`shop.availability.${item.availability}` as TranslationKey)}</span>}
            {orderable && tokenPrice === null && <span className="rw-muted">{t('shop.noCoinPrice')}</span>}
          </div>

          {item.variants.length > 0 && orderable && (
            <div className="rw-merch__size">
              <label className="ss-field-label" htmlFor={`size-${item.sku}`}>{t('shop.sizeLabel')}</label>
              <select
                id={`size-${item.sku}`}
                className="ss-select"
                value={variant}
                disabled={premiumLocked}
                onChange={(event) => setVariant(event.target.value)}
              >
                {item.variants.map((one) => (
                  <option key={one} value={one} disabled={freeIn(one) <= 0}>
                    {one}{freeIn(one) <= 0 ? ` (${t('shop.availability.out_of_stock')})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {premiumLocked ? (
            <div className="rw-merch-lock">
              <button
                type="button"
                className="rw-btn"
                aria-disabled="true"
                aria-describedby="rw-merch-premium"
                onClick={() => openUpgradeSheet({ kind: 'merch-redemption', ref: item.sku })}
              >
                {t('shop.order')}
              </button>
              <span className="rw-tag">{t('premium.badge')}</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                id={`redeem-${item.sku}`}
                className="rw-btn rw-btn--primary"
                disabled={!orderable || busy || short || tokenPrice === null || sizeGone}
                onClick={() => onOrder(item.sku, variant)}
              >
                {t('shop.order')}
              </button>
              {short && <p className="rw-muted rw-merch__note">{t('shop.insufficient')}</p>}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

/** Spreadshop's own offer this month, when the server read one and the shop
 * link is set. Coins have nothing to do with it, and the note says so. */
export function MerchPromoNote({ promo }: { promo: MerchPromo }) {
  const t = useT();
  const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(promo.validUntil));
  return (
    <div className="rw-promo" role="note">
      <p>
        {promo.code
          ? t('shop.promo', { description: promo.description, code: promo.code, date })
          : t('shop.promoNoCode', { description: promo.description, date })}
      </p>
      <p className="rw-muted">{t('shop.promoNote')}</p>
    </div>
  );
}

// Shield-with-check, the same mark the profile uses for a raised shield, so the
// thing being bought and the thing it becomes look like each other.
function ShieldGlyph({ size = 40 }: { size?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function Shop() {
  const t = useT();
  const { lang } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { tier } = useEntitlement();
  const config = useGameConfig();
  const shop = useShop();
  const wallet = useWallet(isAuthenticated);
  const orders = useOrders(isAuthenticated);
  const cosmetic = useCosmeticMutation();
  const protection = useProtectionMutation();
  const order = useOrderMutation();

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [checkout, setCheckout] = useState<{ sku: MerchSku; variant: string } | null>(null);
  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const checkoutHeading = useRef<HTMLHeadingElement>(null);
  const checkoutSku = checkout?.sku ?? null;

  // The form opens below every tile, off screen on a phone: take the reader
  // (and a screen reader's focus) to it, and back to the tile when it closes.
  useEffect(() => {
    if (!checkoutSku) return;
    const heading = checkoutHeading.current;
    heading?.scrollIntoView?.({ block: 'start', behavior: 'auto' });
    heading?.focus({ preventScroll: true });
  }, [checkoutSku]);
  const closeCheckout = () => {
    const sku = checkout?.sku;
    setCheckout(null);
    if (sku) window.setTimeout(() => document.getElementById(`redeem-${sku}`)?.focus(), 0);
  };

  // Links out to the devShark shop on Spreadshop, from client/product-catalog.ts.
  const shopLinked = Boolean(MERCH_SHOP.shopUrl) || Object.values(MERCH_SHOP.products).some(Boolean);

  // Merchandise is Premium only. While the plan is still loading the server
  // decides: a 402 opens the upgrade sheet on its own.
  const premium = tier === 'premium' || wallet.data?.earn?.progress?.premium === true;
  const merchLocked = tier === 'free' && !premium;
  const earn: EarnSummary = wallet.data?.earn ?? { rules: config.coins, progress: null };
  const welcomeReceived = (wallet.data?.entries ?? []).some((entry) => entry.reason === 'signup');

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
          closeCheckout();
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

      {/* The wallet. The recent movements sit beside the balance because a
          balance nobody can account for is what this replaced. */}
      <Wallet signedIn={isAuthenticated} rules={earn.rules} />

      <HowToEarn earn={earn} welcomeReceived={welcomeReceived} premium={premium} />

      <ReferralInvite signedIn={isAuthenticated} />

      {shop.isLoading && <Text type="supporting" color="secondary" role="status">{t('common.loading')}</Text>}
      {shop.isError && (
        <div className="rw-inline-error" role="alert">
          <span>{t('shop.loadError')}</span>
          <Button variant="ghost" size="sm" label={t('quiz.retry')} onClick={() => void shop.refetch()} />
        </div>
      )}

      {/* Merchandise. Premium members redeem coins for it. */}
      <section className="rw-section" aria-labelledby="rw-merch-title">
        <Kicker as="h2" id="rw-merch-title">{t('shop.merchSection')}</Kicker>
        {shopLinked && (
          <div className="rw-merch-intro">
            <p className="rw-muted">{t('shop.shopIntro')}</p>
            {MERCH_SHOP.shopUrl && (
              <a className="rw-btn" href={MERCH_SHOP.shopUrl} target="_blank" rel="noopener noreferrer">
                {t('shop.visitShop')}
                <span aria-hidden="true">&nbsp;↗</span>
                <span className="rw-sr-only"> {t('rewards.social.newTab')}</span>
              </a>
            )}
          </div>
        )}
        {shopLinked && config.merchPromo && <MerchPromoNote promo={config.merchPromo} />}
        {!shop.data?.enabled && shop.data && <p className="rw-muted">{t('shop.merchClosed')}</p>}
        {merchLocked && (
          <div className="rw-premium-note" id="rw-merch-premium">
            <p>{t('rewards.merchPremium')}</p>
            <button type="button" className="rw-btn" onClick={() => openUpgradeSheet({ kind: 'merch-redemption' })}>
              {t('rewards.seePremium')}
            </button>
          </div>
        )}
        <Grid columns={{ minWidth: 240, max: 3 }} gap={2} width="100%">
          {(shop.data?.items ?? []).map((item) => (
            <MerchCard
              key={item.sku}
              item={item}
              busy={order.isPending}
              premiumLocked={merchLocked}
              balance={isAuthenticated && wallet.data ? balance : null}
              onOrder={(sku, variant) => setCheckout({ sku, variant })}
            />
          ))}
        </Grid>
        {shop.data?.policyUrl && (
          <a className="cd-link" href={shop.data.policyUrl} target="_blank" rel="noreferrer">
            {t('shop.policyLink')}
          </a>
        )}
      </section>

      {/* Redeeming. Only the fields a parcel needs, and nothing beyond them. */}
      {checkout && (
        <form
          className="rw-checkout ss-raised"
          aria-labelledby="rw-checkout-title"
          onSubmit={(event) => {
            event.preventDefault();
            submitOrder('tokens');
          }}
        >
          <h3 id="rw-checkout-title" ref={checkoutHeading} tabIndex={-1} className="rw-checkout__title">
            {t('shop.checkoutTitle', { item: t(skuNameKey(checkout.sku)) })}
            {checkout.variant ? ` (${checkout.variant})` : ''}
          </h3>
          {([
            ['name', 'shop.address.name'],
            ['line1', 'shop.address.line1'],
            ['line2', 'shop.address.line2'],
            ['city', 'shop.address.city'],
            ['postalCode', 'shop.address.postalCode'],
            ['country', 'shop.address.country'],
          ] as const).map(([field, key]) => (
            <div key={field} className="rw-checkout__field">
              <label className="ss-field-label" htmlFor={`addr-${field}`}>{t(key)}</label>
              <input
                id={`addr-${field}`}
                className="ss-input"
                autoComplete={ADDRESS_AUTOCOMPLETE[field]}
                required={field !== 'line2'}
                maxLength={field === 'country' ? 2 : 120}
                value={address[field] ?? ''}
                onChange={(event) => setAddress((current) => ({ ...current, [field]: event.target.value }))}
              />
            </div>
          ))}
          <p className="rw-muted rw-checkout__note">{t('shop.addressNote')}</p>
          <div className="rw-checkout__actions">
            <button type="submit" className="rw-btn rw-btn--primary" disabled={order.isPending}>
              {t('shop.payWithTokens')}
            </button>
            {shop.data?.cashCheckoutEnabled && (
              <button type="button" className="rw-btn" disabled={order.isPending} onClick={() => submitOrder('cash')}>
                {t('shop.payWithMoney')}
              </button>
            )}
            <button type="button" className="rw-btn rw-btn--quiet" onClick={closeCheckout}>
              {t('shop.cancelCheckout')}
            </button>
          </div>
        </form>
      )}

      {/* The crown and streak protection: every account, coins only. */}
      {(shop.data?.crown.available || shop.data?.protection?.available) && (
        <section className="rw-section" aria-labelledby="rw-spend-title">
          <Kicker as="h2" id="rw-spend-title">{t('shop.crownSection')}</Kicker>
          <VStack gap={2}>
            {shop.data?.crown.available && (
              <Card variant="default" padding={3} width="100%">
                <HStack gap={2} align="center" wrap="wrap">
                  <Crown size={44} />
                  <VStack gap={0.5}>
                    <Heading level={3}>{t('shop.crownName')}</Heading>
                    <Text type="supporting" color="secondary">{t('shop.crownBlurb')}</Text>
                  </VStack>
                  <div className="rw-spend__action">
                    <HStack gap={1} align="center" wrap="wrap">
                      {!ownsCrown && <Text weight="bold">{t('shop.tokenPrice', { n: shop.data.crown.tokenPrice.toLocaleString('en-GB') })}</Text>}
                      {ownsCrown ? (
                        <button
                          type="button"
                          className="rw-btn"
                          disabled={cosmetic.isPending}
                          onClick={() => cosmetic.mutate({ op: wearingCrown ? 'unequip' : 'equip' })}
                        >
                          {t(wearingCrown ? 'shop.crownRemove' : 'shop.crownWear')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="rw-btn rw-btn--primary"
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
            )}

            {/* Streak protection: consumable, capped, and the one thing sold
                here that touches learning at all (the bounded exception in
                shared/rewards.ts). It costs coins earned by learning, restores
                the same two-a-month budget and never exceeds it, and no
                leaderboard in this product ranks by streak. */}
            {shop.data?.protection?.available && (
              <Card variant="default" padding={3} width="100%">
                <HStack gap={2} align="center" wrap="wrap">
                  <span aria-hidden style={{ color: 'var(--ss-warning)', display: 'inline-flex' }}>
                    <ShieldGlyph size={40} />
                  </span>
                  <VStack gap={0.5}>
                    <Heading level={3}>{t('shop.protectionName')}</Heading>
                    <Text type="supporting" color="secondary">
                      {t('shop.protectionBlurb', { cap: shop.data.protection.cap })}
                    </Text>
                    <Text type="supporting" size="xsm" color="secondary">
                      {t('shop.protectionFair')}
                    </Text>
                  </VStack>
                  <div className="rw-spend__action">
                    <HStack gap={1} align="center" wrap="wrap">
                      <Text weight="bold">{t('shop.tokenPrice', { n: shop.data.protection.tokenPrice.toLocaleString('en-GB') })}</Text>
                      <button
                        type="button"
                        className="rw-btn rw-btn--primary"
                        disabled={!isAuthenticated || protection.isPending || balance < shop.data.protection.tokenPrice}
                        onClick={() => protection.mutate(undefined, {
                          onSuccess: (result) => setToast({
                            // At the cap nothing was charged, and saying "bought"
                            // would be a lie about a balance that did not move.
                            msg: result.bought
                              ? t('shop.protectionBought', { n: result.remaining })
                              : t('shop.protectionAtCap', { n: result.remaining }),
                            ok: true,
                          }),
                          onError: (error) => setToast({ msg: friendlyError(error), ok: false }),
                        })}
                      >
                        {t('shop.buy')}
                      </button>
                    </HStack>
                  </div>
                </HStack>
              </Card>
            )}
          </VStack>
        </section>
      )}

      {/* Orders and claims: coin redemptions and the learning-path package. */}
      {isAuthenticated && (orders.data?.orders.length ?? 0) > 0 && (
        <section className="rw-section" aria-labelledby="rw-orders-title">
          <Kicker as="h2" id="rw-orders-title">{t('shop.ordersSection')}</Kicker>
          <ul className="ss-orders">
            {orders.data!.orders.map((one) => (
              <li key={one.orderId}>
                <span className="ss-orders__items">
                  {one.items.map((line) => `${t(skuNameKey(line.sku as MerchSku))}${line.variant ? ` (${line.variant})` : ''} ×${line.quantity}`).join(', ')}
                </span>
                <span className="ss-orders__state">
                  {one.package && one.state === 'awaiting_payment'
                    ? t('shop.state.package')
                    : t(`shop.state.${one.state}` as TranslationKey)}
                </span>
                {one.tokenTotal !== null && one.tokenTotal > 0 && (
                  <span>{t('shop.tokenPrice', { n: one.tokenTotal.toLocaleString('en-GB') })}</span>
                )}
                {one.tokenTotal === null && one.totalMinor !== null && one.currency && (
                  <span>{formatMoney(one.totalMinor, one.currency, lang)}</span>
                )}
                {one.trackingRef && <span>{one.carrier} · {one.trackingRef}</span>}
                {one.testMode && <Badge variant="neutral" label={t('shop.testOrder')} />}
              </li>
            ))}
          </ul>
        </section>
      )}

      <SocialProfiles />

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
