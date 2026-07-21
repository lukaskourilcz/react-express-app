// The landing page at "/" — the editorial "Deep End v2" redesign. Instead of a
// generic hero + three feature cards, it opens with a product-forward pitch: an
// interactive sample question wired to a real Level-1 question, a topic picker
// whose cards host schools of shark fins on hover, a live "Inside <Topic>"
// roadmap preview, the everything-else feature strip, the free pledge, and the
// shared product-family footer. The whole page re-skins per active subject from
// var(--brand-accent) + lib/subjects.ts — layout identical, accent + topic set
// swap. The app shell (App.tsx) supplies the header and the ocean footer.
//
// See DESIGN_RULES.md for the fin baseline, wave-variation and accent rules
// this file is the reference implementation of.

import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { SharkFin, Waterline } from './SharkFin';
import { CategoryGlyph } from './ui/techIcons';
import SubjectGlyph from './ui/SubjectGlyph';
import { useT } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { useAuth } from '../lib/auth';
import { useActiveSubject, subjectNameKey, subjectBlurbKey, type SubjectId } from '../lib/subjects';
import { TRACK_ORDER } from '../lib/tracks';
import { LANDING_TOPICS, type LandingTopic, type FinSpec } from '../lib/landingTopics';
import { AppToast } from './ui/AppToast';
import { Kicker, StatItem, FadeFinCta, SwimCta, SampleCard, type StatSpec } from './landing/LandingKit';
import { CURRENT_PRODUCT } from '../lib/products';

// ─────────────────────────────── Topic card ───────────────────────────────

function TopicIcon({ topic, subjectId }: { topic: LandingTopic; subjectId: SubjectId }) {
  if (subjectId === 'webdev') {
    return (
      <span className="ss-float" style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <CategoryGlyph category={topic.id} color="var(--brand-accent)" size={30} />
      </span>
    );
  }
  return (
    <span className="ss-float" aria-hidden style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', flexShrink: 0, color: 'var(--brand-accent)', lineHeight: 1 }}>
      <SubjectGlyph id={subjectId} size={28} />
    </span>
  );
}

function TopicCard({
  topic, subjectId, selected, onSelect,
}: {
  topic: LandingTopic; subjectId: SubjectId; selected: boolean; onSelect: () => void;
}) {
  const [hover, setHover] = useState(false);
  const t = useT();
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={`${t('nav.learn')} ${topic.name}`}
      aria-pressed={selected}
      style={{
        position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
        background: selected ? 'var(--brand-accent-soft)' : 'var(--ss-card-bg)',
        border: `1px solid ${selected ? 'var(--brand-accent)' : 'var(--ss-card-line)'}`,
        borderBottom: '2px solid var(--ss-card-edge)',
        boxShadow: hover
          ? `0 8px 20px light-dark(rgba(23,39,46,0.12), rgba(0,0,0,0.5))${selected ? ', inset 0 0 0 1px var(--brand-accent)' : ''}`
          : selected ? 'inset 0 0 0 1px var(--brand-accent)' : '0 2px 10px light-dark(rgba(23,39,46,0.06), rgba(0,0,0,0.4))',
        borderRadius: 'var(--radius-container)', padding: '14px 16px 18px', cursor: 'pointer',
        transition: 'box-shadow 0.25s ease, background 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* Waterline that fades in near the card bottom on hover. */}
      <span aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 3, opacity: hover ? 0.85 : 0, transition: 'opacity 0.35s ease', pointerEvents: 'none' }}>
        <Waterline />
      </span>
      {/* The card's fin school gliding across the waterline. */}
      {topic.fins.map((f: FinSpec, i) => {
        const flip = f.dir === 1 ? -1 : 1;
        const rock = f.rock && hover ? ` rotate(${f.dir * -4}deg)` : '';
        return (
          <span
            key={i}
            aria-hidden
            style={{
              position: 'absolute', left: f.left, bottom: Math.round(5 - f.size * 0.25) + 'px', lineHeight: 0,
              opacity: hover ? 1 : 0,
              transform: `translateX(${hover ? f.dir * 140 : 0}px) scaleX(${flip})${rock}`,
              transition: `transform ${f.dur}s ease-in-out ${f.delay}s, opacity 0.3s ease`,
              pointerEvents: 'none',
            }}
          >
            <SharkFin size={f.size} />
          </span>
        );
      })}
      <TopicIcon topic={topic} subjectId={subjectId} />
      <span style={{ fontFamily: 'var(--font-family-heading)', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em', color: 'var(--color-text-primary)', minWidth: 0 }}>
        {topic.name}
      </span>
      <span style={{ marginLeft: 'auto', fontSize: '0.9rem', fontWeight: 700, color: 'var(--brand-accent)', opacity: selected ? 1 : 0 }}>✓</span>
    </button>
  );
}

// ───────────────────────────── Roadmap preview ────────────────────────────

function RoadmapPreview({ topic, onStart }: { topic: LandingTopic; onStart: () => void }) {
  const t = useT();
  return (
    <section
      aria-label={t('home.insideTopic', { name: topic.name })}
      className="ss-panel"
      style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 22, position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-page)' }}
    >
      <div aria-hidden style={{ position: 'absolute', right: '-4%', bottom: '-42%', opacity: 0.04, transform: 'rotate(-8deg)', pointerEvents: 'none', color: 'var(--ss-ink)' }}>
        <SharkFin size={420} color="currentColor" />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', position: 'relative' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-family-heading)', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.015em' }}>
          {t('home.insideTopic', { name: topic.name })}
        </h2>
        <span style={{ borderRadius: 999, padding: '3px 10px', fontWeight: 600, fontSize: '0.75rem', color: 'var(--brand-accent)', background: 'var(--brand-accent-soft)' }}>
          {t('home.insideChip')}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-secondary)', maxWidth: '70ch', position: 'relative' }}>{topic.blurb}</p>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, overflowX: 'auto', padding: '6px 2px', position: 'relative' }}>
        {topic.levels.map((label, i) => {
          // Each connector gets its own swell (see DESIGN_RULES §4).
          const amp = 1.2 + ((i * 7) % 4) * 0.55;
          const dir = i % 2 === 0 ? -1 : 1;
          const y1 = 4 + dir * amp;
          const wavePath = i % 3 === 0
            ? `M0 4 Q 5 ${y1} 10 4 T 20 4 T 30 4 T 40 4`
            : `M0 4 Q 7 ${y1} 14 4 T 28 4 T 42 4`;
          const first = i === 0;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 118 }}>
                <span style={{
                  display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%',
                  background: first ? 'var(--brand-accent)' : 'var(--brand-accent-soft)',
                  color: first ? '#fff' : 'var(--brand-accent)',
                  border: `2px solid ${first ? 'var(--brand-accent)' : 'transparent'}`,
                  fontFamily: 'var(--font-family-heading)', fontWeight: 800, fontSize: '0.95rem',
                }}>{i + 1}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
              </div>
              <svg aria-hidden width="40" height="8" viewBox="0 0 40 8" style={{ display: 'block', margin: '16px 2px 0', opacity: 0.3, flexShrink: 0 }}>
                <path d={wavePath} fill="none" stroke="var(--ss-ink)" strokeWidth={1.6} strokeLinecap="round" />
              </svg>
            </div>
          );
        })}
        {/* Gold checkpoint node. */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 110, flexShrink: 0 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', background: 'rgba(245,166,35,0.14)', color: '#c77f00', border: '2px solid rgba(245,166,35,0.5)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M5 4H3v2a3 3 0 0 0 3 3M19 4h2v2a3 3 0 0 1-3 3" />
            </svg>
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#c77f00', whiteSpace: 'nowrap' }}>{t('home.checkpoint')}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
        <SwimCta label={t('home.startLevel1', { name: topic.name })} onClick={onStart} dir={-1} />
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{t('home.roadmapNote')}</span>
      </div>
    </section>
  );
}

// ─────────────────────────────── Feature strip ────────────────────────────

interface StripItem { titleKey: TranslationKey; textKey: TranslationKey; color: string; icon: ReactNode; to: string; }
const STRIP_ICON = (path: ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{path}</svg>
);

// ───────────────────────────────── Landing ────────────────────────────────

export default function Home() {
  const t = useT();
  const navigate = useNavigate();
  const subject = useActiveSubject();
  const { isAuthenticated, signInWithGoogle } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const topicsRef = useRef<HTMLElement>(null);

  const featured = LANDING_TOPICS[subject.id] ?? [];
  const [selectedId, setSelectedId] = useState<string>(featured[0]?.id ?? '');
  const selected = featured.find((x) => x.id === selectedId) ?? featured[0];

  const subjectName = t(subjectNameKey(subject.id));
  const brand = CURRENT_PRODUCT.brand;
  const heroTitle = subject.id === 'webdev' ? t('home.title') : t('home.titleSubject', { label: subjectName });
  const heroSubtitle = subject.id === 'webdev' ? t('home.subtitle') : t(subjectBlurbKey(subject.id));
  const moreCount = subject.topics.length - featured.length;

  // Stats derived from the real roadmap shape: 25 levels per topic.
  const stats: StatSpec[] = [
    { value: String(subject.topics.length), label: t('home.statTracks'), pos: 'right top', size: 40 },
    { value: `${subject.topics.length * 25}+`, label: t('home.statLevels'), pos: 'left bottom', size: 34 },
    { value: String(TRACK_ORDER.length), label: t('home.statPaths'), pos: 'center top', size: 32 },
    { value: '$0', label: t('home.statForever'), pos: 'right bottom', size: 38 },
  ];

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : t('auth.signInFailed'));
      setSigningIn(false);
    }
  };

  const scrollToTopics = () => topicsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const strip: StripItem[] = [
    { titleKey: 'home.stripCareerTitle', textKey: 'home.stripCareerText', color: '#7c3aed', to: '/roadmap', icon: STRIP_ICON(<><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></>) },
    { titleKey: 'home.stripDailyTitle', textKey: 'home.stripDailyText', color: '#1565c0', to: '/challenge', icon: STRIP_ICON(<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />) },
    { titleKey: 'home.stripLiveTitle', textKey: 'home.stripLiveText', color: '#0e7490', to: '/play', icon: STRIP_ICON(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>) },
    { titleKey: 'home.stripXpTitle', textKey: 'home.stripXpText', color: '#c77f00', to: '/leaderboard', icon: STRIP_ICON(<><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M5 4H3v2a3 3 0 0 0 3 3M19 4h2v2a3 3 0 0 1-3 3" /></>) },
  ];

  return (
    <div className="ss-pop" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 56 }}>
      {/* ── Hero ── */}
      <section aria-label="Intro" className="ss-hero-grid">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 20 }}>
          <Kicker>{brand} · {t('home.freeForever')}</Kicker>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-family-heading)', fontWeight: 800, fontSize: 'clamp(2.6rem,4.8vw,3.5rem)', lineHeight: 1.06, letterSpacing: '-0.02em' }}>
            {heroTitle}
          </h1>
          <p style={{ margin: 0, fontSize: '1.125rem', color: 'var(--color-text-secondary)', maxWidth: '46ch' }}>{heroSubtitle}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <FadeFinCta label={t('home.chooseTopic')} primary onClick={scrollToTopics} finLeft="-2px" finSize={58} accent={subject.accent} />
            {isAuthenticated ? (
              <FadeFinCta label={t('home.ctaLearn')} onClick={() => navigate('/learn')} finLeft="80%" finSize={58} accent={subject.accent} />
            ) : (
              <FadeFinCta label={signingIn ? t('home.ctaSignIn') : t('home.signInGoogle')} onClick={handleSignIn} finLeft="80%" finSize={58} accent={subject.accent} />
            )}
          </div>
          <div className="ss-hero-stats">
            {stats.map((s) => <StatItem key={s.label} {...s} accent={subject.accent} />)}
          </div>
        </div>
        {selected && (
          <SampleCard
            key={selected.id}
            chip={`${selected.name} · ${t('home.sampleChip', { level: selected.levels[0] })}`}
            question={selected.question}
          />
        )}
      </section>

      {/* ── Topic picker ── */}
      <section id="topics" ref={topicsRef} aria-label={t('home.topicsTitle')} style={{ display: 'flex', flexDirection: 'column', gap: 20, scrollMarginTop: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Kicker>{t('home.topicsKicker')}</Kicker>
          <h2 style={{ margin: '6px 0 0', fontFamily: 'var(--font-family-heading)', fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.015em' }}>
            {t('home.topicsTitle')}
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 14 }}>
          {featured.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              subjectId={subject.id}
              selected={topic.id === selected?.id}
              onSelect={() => setSelectedId(topic.id)}
            />
          ))}
          {moreCount > 0 && (
            <button
              type="button"
              onClick={() => navigate('/learn')}
              aria-label={t('home.seeAllTopics')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', background: 'var(--color-background-muted)', border: '1px dashed var(--ss-card-edge)', borderRadius: 'var(--radius-container)', padding: '14px 16px', cursor: 'pointer' }}
            >
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: 'var(--font-family-heading)', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em', color: 'var(--brand-accent)' }}>
                  {t('home.andMore', { n: String(moreCount) })}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{t('home.seeAllTopics')}</span>
              </span>
            </button>
          )}
        </div>
      </section>

      {/* ── Roadmap preview ── */}
      {selected && <RoadmapPreview topic={selected} onStart={() => navigate('/learn')} />}

      {/* ── Everything-else feature strip (no hover) ── */}
      <section aria-label={t('home.moreKicker')} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Kicker>{t('home.moreKicker')}</Kicker>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '12px 28px' }}>
          {strip.map((item) => (
            <button
              key={item.titleKey}
              type="button"
              onClick={() => navigate(item.to)}
              style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
            >
              <span aria-hidden style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 'var(--radius-inner)', color: item.color, background: `color-mix(in srgb, ${item.color} 8%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${item.color} 22%, transparent)`, flexShrink: 0 }}>
                {item.icon}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: 'var(--font-family-heading)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>{t(item.titleKey)}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{t(item.textKey)}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Free pledge ── */}
      <section aria-label={t('home.pledge')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '8px 0 0' }}>
        <div className="ss-waterline-rule" style={{ width: 84 }} />
        <p style={{ margin: 0, fontFamily: 'var(--font-family-heading)', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.01em', textAlign: 'center', maxWidth: '34ch' }}>
          {t('home.pledge')}
        </p>
        <SwimCta label={t('home.startFree')} onClick={scrollToTopics} dir={1} />
      </section>

      <AppToast open={!!authError} onClose={() => setAuthError(null)} severity="error" message={authError} autoHideDuration={5000} />
    </div>
  );
}
