import { useEffect, useMemo, useRef, useState } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { AppToast } from './ui/AppToast';
import { useAuth } from '../lib/auth';
import { useActiveSubject } from '../lib/subjects';
import {
  getCollection,
  claimPack,
  resolveCard,
  subjectCards,
  type CollectionResult,
  type ResolvedCard,
} from '../lib/cards';
import { useLanguage } from '../i18n/LanguageContext';
import { SharkFin, SwimmingFin } from './SharkFin';
import LoadingScreen from './LoadingScreen';
import './Cards.css';

// Shark Cards — the finite, cosmetic per-subject collectible album (route
// /collection). Cards are earned only by finishing the daily Today queue and
// never affect access, content, XP, scores, streaks, ranks, or AI. Every card
// face is procedural (a hue-derived gradient + a rarity glyph + the localized
// name); no raster art is shipped. The server owns the pack-ready flag and the
// grant, so `packAvailable` is never recomputed here.

interface OwnedState {
  count: number;
  firstEarnedAt: string;
}

/** One procedural card face — owned (coloured, named) or a locked silhouette. */
function CardFace({
  resolved,
  owned,
  dateFormatter,
  variant = 'grid',
}: {
  resolved: ResolvedCard;
  owned: OwnedState | null;
  dateFormatter: Intl.DateTimeFormat;
  variant?: 'grid' | 'reveal';
}) {
  const { t } = useLanguage();
  const { def } = resolved;
  const isOwned = !!owned;
  const name = isOwned ? t(resolved.nameKey) : t('cards.locked');
  const rarity = t(resolved.rarityLabelKey);
  // Procedural gradient seeded from the card's stable hue. The name lives on the
  // neutral card body (below the face), so no per-hue contrast risk on the text.
  const faceStyle = isOwned
    ? { background: `linear-gradient(150deg, hsl(${def.hue} 60% 44%), hsl(${(def.hue + 40) % 360} 55% 30%))` }
    : undefined;

  return (
    <div className={`sc-card sc-card--${def.rarity} ${isOwned ? 'is-owned' : 'is-locked'}`}>
      <div className={`sc-card__face${variant === 'reveal' ? ' sc-card__face--reveal' : ''}`} style={faceStyle}>
        {isOwned ? (
          <span className="sc-card__glyph" aria-hidden>{def.glyph}</span>
        ) : (
          <span className="sc-card__lockmark" aria-hidden>
            <SharkFin size={34} color="currentColor" />
          </span>
        )}
        {isOwned && owned.count > 1 && (
          <span className="sc-card__dup" aria-label={t('cards.dupCount', { count: owned.count })}>
            {t('cards.dupCount', { count: owned.count })}
          </span>
        )}
      </div>
      <div className="sc-card__body">
        <span className="sc-card__name">{name}</span>
        <span className="sc-card__rarity">{rarity}</span>
        {isOwned && owned.firstEarnedAt && (
          <span className="sc-card__earned">
            {t('cards.firstEarned', { date: dateFormatter.format(new Date(owned.firstEarnedAt)) })}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Cards() {
  const { t, lang } = useLanguage();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const subject = useActiveSubject();

  const album = useMemo(() => subjectCards(subject.id), [subject.id]);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(lang === 'cs' ? 'cs-CZ' : 'en', { dateStyle: 'medium' }),
    [lang],
  );

  const [collection, setCollection] = useState<CollectionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [reveal, setReveal] = useState<{ resolved: ResolvedCard; isNew: boolean }[] | null>(null);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' | 'info' } | null>(null);
  const revealRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    // Reset per-subject: a reveal from the previous subject must not linger.
    setReveal(null);
    if (!isAuthenticated) {
      setCollection(null);
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    // getCollection never throws: offline / signed-out / migration-missing all
    // resolve to an empty album with the correct total, so the full set still
    // renders as locked silhouettes.
    getCollection(subject.id).then((res) => {
      if (!active) return;
      setCollection(res);
      setLoading(false);
    });
    return () => { active = false; };
  }, [subject.id, isAuthenticated]);

  // Move focus to the reveal when a pack opens so keyboard users aren't stranded
  // on the (now-hidden) Open button.
  useEffect(() => {
    if (reveal && revealRef.current) revealRef.current.focus();
  }, [reveal]);

  const ownedMap = useMemo(() => {
    const map = new Map<string, OwnedState>();
    for (const c of collection?.cards ?? []) {
      map.set(c.card_id, { count: c.count, firstEarnedAt: c.first_earned_at });
    }
    return map;
  }, [collection]);

  const ownedCount = useMemo(
    () => album.reduce((n, def) => n + (ownedMap.has(def.id) ? 1 : 0), 0),
    [album, ownedMap],
  );
  const total = collection?.total ?? album.length;
  const complete = total > 0 && ownedCount >= total;

  const openPack = async () => {
    setOpening(true);
    // Snapshot ownership before the claim so each pull can be tagged new vs dup
    // (a card already owned, or repeated within the same pack).
    const seen = new Set(ownedMap.keys());
    try {
      const res = await claimPack(subject.id);
      if (res.status === 'granted' || res.status === 'claimed') {
        const pulled = res.cards
          .map((id) => resolveCard(subject.id, id))
          .filter((r): r is ResolvedCard => !!r)
          .map((r) => {
            const isNew = !seen.has(r.def.id);
            seen.add(r.def.id);
            return { resolved: r, isNew };
          });
        if (pulled.length > 0) {
          setReveal(pulled);
        } else {
          setToast({ message: t('cards.claimError'), severity: 'error' });
        }
        // Re-read the authoritative album (owned counts + packAvailable) without
        // flashing the page loader.
        const fresh = await getCollection(subject.id);
        setCollection(fresh);
      } else if (res.status === 'not-yet') {
        setToast({ message: t('cards.notYet'), severity: 'info' });
        const fresh = await getCollection(subject.id);
        setCollection(fresh);
      } else {
        setToast({ message: t('cards.claimError'), severity: 'error' });
      }
    } finally {
      setOpening(false);
    }
  };

  const header = (
    <VStack gap={0.5} width="100%">
      <span className="ss-kicker">{t('cards.kicker')}</span>
      <HStack gap={1} align="center" wrap="wrap">
        <Heading level={1}>{t('cards.title')}</Heading>
        <SwimmingFin size={22} />
      </HStack>
      <Text type="supporting" color="secondary">{t('cards.subtitle')}</Text>
    </VStack>
  );

  // The album grid — owned cards vs locked silhouettes. Shared by the signed-in,
  // signed-out (all locked) and loaded views.
  const albumGrid = (
    <ul className="sc-grid" aria-label={t('cards.album')}>
      {album.map((def) => {
        const resolved = resolveCard(subject.id, def.id);
        if (!resolved) return null;
        return (
          <li key={def.id} className="sc-grid__cell">
            <CardFace resolved={resolved} owned={ownedMap.get(def.id) ?? null} dateFormatter={dateFormatter} />
          </li>
        );
      })}
    </ul>
  );

  let body: React.ReactNode;
  if (authLoading) {
    body = <div className="sc-loading"><LoadingScreen label={t('cards.loading')} /></div>;
  } else if (!isAuthenticated) {
    body = (
      <>
        <div className="sc-panel">
          <SwimmingFin size={40} />
          <Heading level={2}>{t('cards.signInTitle')}</Heading>
          <Text color="secondary">{t('cards.signInBody')}</Text>
        </div>
        {albumGrid}
      </>
    );
  } else if (loading || !collection) {
    body = <div className="sc-loading"><LoadingScreen label={t('cards.loading')} /></div>;
  } else {
    body = (
      <>
        <HStack justify="between" align="center" gap={1} wrap="wrap">
          <Text weight="semibold">{t('cards.count', { owned: ownedCount, total })}</Text>
          {complete && <Badge variant="success" label={t('cards.complete')} />}
        </HStack>

        {collection.packAvailable && !reveal && (
          <div className="sc-pack-banner">
            <div className="sc-pack-banner__text">
              <HStack gap={1} align="center">
                <span aria-hidden style={{ color: 'var(--brand-accent)', display: 'inline-flex' }}>
                  <SharkFin size={20} />
                </span>
                <Text weight="bold">{t('cards.packReady')}</Text>
              </HStack>
              <Text type="supporting" size="sm" color="secondary">{t('cards.packReadyBody')}</Text>
            </div>
            <Button
              variant="primary"
              label={opening ? t('cards.opening') : t('cards.openPack')}
              isLoading={opening}
              isDisabled={opening}
              onClick={openPack}
            />
          </div>
        )}

        {reveal && (
          <section
            ref={revealRef}
            tabIndex={-1}
            className="sc-reveal"
            aria-label={t('cards.pull')}
          >
            <Heading level={2}>{t('cards.pull')}</Heading>
            <div className="sc-reveal__cards">
              {reveal.map((r, i) => (
                <div key={`${r.resolved.def.id}-${i}`} className="sc-reveal__item" style={{ animationDelay: `${i * 140}ms` }}>
                  <CardFace resolved={r.resolved} owned={{ count: 1, firstEarnedAt: '' }} dateFormatter={dateFormatter} variant="reveal" />
                  <span className={`sc-tag ${r.isNew ? 'sc-tag--new' : 'sc-tag--dup'}`}>
                    {r.isNew ? t('cards.newPull') : t('cards.dup')}
                  </span>
                  {!r.isNew && (
                    <Text type="supporting" size="xsm" color="secondary">{t('cards.dupHint')}</Text>
                  )}
                </div>
              ))}
            </div>
            <Button variant="secondary" label={t('cards.done')} onClick={() => setReveal(null)} />
          </section>
        )}

        {ownedCount === 0 && !collection.packAvailable && !reveal && (
          <div className="sc-note">
            <Text weight="semibold">{t('cards.emptyTitle')}</Text>
            <Text type="supporting" size="sm" color="secondary">{t('cards.emptyBody')}</Text>
          </div>
        )}

        {albumGrid}
      </>
    );
  }

  return (
    <div className="sc-page">
      <VStack gap={2} width="100%">
        {header}
        {body}
      </VStack>
      <AppToast
        open={!!toast}
        onClose={() => setToast(null)}
        severity={toast?.severity ?? 'info'}
        message={toast?.message ?? ''}
        autoHideDuration={toast?.severity === 'error' ? null : 4000}
      />
    </div>
  );
}
