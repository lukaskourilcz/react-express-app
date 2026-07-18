// The landing page at "/" — the editorial "Deep End v2" redesign. Instead of a
// generic hero + three feature cards, it opens with a product-forward pitch: an
// interactive sample question wired to a real Level-1 question, a topic picker
// whose cards host schools of shark fins on hover, a live "Inside <Topic>"
// roadmap preview, the everything-else feature strip, the free pledge, and the
// studyShark family line. The whole page re-skins per active subject from
// var(--brand-accent) + lib/subjects.ts — layout identical, accent + topic set
// swap. The app shell (App.tsx) supplies the header and the ocean footer.
//
// See DESIGN_RULES.md for the fin baseline, wave-variation and accent rules
// this file is the reference implementation of.

import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { SharkFin, Waterline } from './SharkFin';
import { CategoryGlyph } from './ui/techIcons';
import { useT } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { useAuth } from '../lib/auth';
import {
  useActiveSubject, useSubject, subjectNameKey, subjectBlurbKey,
  isSubjectLocked, SIBLING_PLATFORMS_URL, SUBJECT_ORDER, SUBJECTS, type SubjectId,
} from '../lib/subjects';
import { TRACK_ORDER } from '../lib/tracks';
import { LANDING_TOPICS, type LandingTopic, type FinSpec } from '../lib/landingTopics';
import { AppToast } from './ui/AppToast';

// The fin glyph path, base at y=18 in a 24-unit box (see DESIGN_RULES §1).
const FIN_PATH = 'M3 18 Q 6 6 15 3 Q 17 11 21 18 Z';

// A ghost-fin CSS background (effect §2): low-opacity fin in the accent colour,
// used as a hover relief on stats and buttons. The '#' in the hex is encoded.
const finBg = (hex: string, opacity: number): string =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='${FIN_PATH}' fill='${encodeURIComponent(hex)}' fill-opacity='${opacity}'/%3E%3C/svg%3E")`;

// ───────────────────────── Small brand primitives ─────────────────────────

/** Editorial kicker: uppercase accent label with a waterline tick beneath. */
function Kicker({ children, center }: { children: ReactNode; center?: boolean }) {
  return <span className={`ss-kicker${center ? ' ss-kicker--center' : ''}`}>{children}</span>;
}

/** A raw fin SVG (fades/swims as a positioned child). */
function Fin({ size, color = 'var(--brand-accent)', opacity = 1 }: { size: number; color?: string; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d={FIN_PATH} fill={color} fillOpacity={opacity} />
    </svg>
  );
}

// ─────────────────────────────── Hero stats ───────────────────────────────

interface StatSpec { value: string; label: string; pos: string; size: number; }

function StatItem({ value, label, pos, size, accent }: StatSpec & { accent: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', cursor: 'default',
        transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
        transform: hover ? 'translateY(-2px)' : 'none',
        backgroundImage: hover ? finBg(accent, 0.14) : 'none',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: pos,
        backgroundSize: `${size}px ${size}px`,
      }}
    >
      <span style={{ fontFamily: 'var(--font-family-heading)', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.015em' }}>
        {value}
      </span>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
        {label}
      </span>
    </div>
  );
}

// ─────────────────────── Hero CTAs (fade-in fin reveal) ────────────────────

/** A hero CTA whose fin fades in on hover (no drift — see DESIGN_RULES §3). */
function FadeFinCta({
  label, primary, onClick, finLeft, finSize, accent,
}: {
  label: string; primary?: boolean; onClick: () => void;
  finLeft: string; finSize: number; accent: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: primary ? 'var(--brand-accent)' : 'var(--color-background-surface)',
        color: primary ? '#fff' : 'var(--color-text-primary)',
        border: primary ? 'none' : '1px solid var(--ss-card-edge)',
        borderRadius: 'var(--radius-element)', padding: '12px 22px',
        fontFamily: 'var(--font-family-body)', fontWeight: 600, fontSize: '1rem', cursor: 'pointer',
        filter: hover && primary ? 'brightness(0.92)' : 'none',
        transition: 'filter 0.2s ease, background 0.2s ease',
        backgroundColor: hover && !primary ? 'var(--color-background-muted)' : undefined,
      }}
    >
      <span aria-hidden style={{ position: 'absolute', left: finLeft, bottom: Math.round(finSize * -0.25) + 'px', lineHeight: 0, opacity: hover ? 1 : 0, transition: 'opacity 0.35s ease', pointerEvents: 'none' }}>
        <Fin size={finSize} color={primary ? '#fff' : accent} opacity={primary ? 0.35 : 0.22} />
      </span>
      <span style={{ position: 'relative' }}>{label}</span>
    </button>
  );
}

/** A CTA whose fin swims the full width on hover (see DESIGN_RULES §3). */
function SwimCta({
  label, onClick, dir,
}: {
  label: string; onClick: () => void; dir: 1 | -1;
}) {
  const [hover, setHover] = useState(false);
  const distance = 260;
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--brand-accent)', color: '#fff', border: 'none',
        borderRadius: 'var(--radius-element)', padding: '10px 18px',
        fontFamily: 'var(--font-family-body)', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
        filter: hover ? 'brightness(0.92)' : 'none', transition: 'filter 0.2s ease',
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: dir === 1 ? '0' : '100%', right: dir === -1 ? undefined : '100%',
          bottom: -8, lineHeight: 0,
          opacity: hover ? 1 : 0,
          transform: `translateX(${hover ? dir * distance : 0}px)${dir === 1 ? ' scaleX(-1)' : ''}`,
          transition: `transform ${dir === 1 ? 3.8 : 2.6}s ease-in-out, opacity 0.4s ease`,
          pointerEvents: 'none',
        }}
      >
        <Fin size={38} color="#fff" opacity={0.28} />
      </span>
      <span style={{ position: 'relative' }}>{label}</span>
    </button>
  );
}

// ───────────────────────── Interactive sample card ────────────────────────

function SampleCard({ topic }: { topic: LandingTopic }) {
  const t = useT();
  const [picked, setPicked] = useState<number | null>(null);
  const q = topic.question;
  const answered = picked !== null;
  const correct = q.a;
  const right = answered && picked === correct;

  return (
    <div
      className="ss-panel"
      style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, borderRadius: 'var(--radius-container)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ borderRadius: 999, padding: '3px 10px', background: 'var(--brand-accent-soft)', color: 'var(--brand-accent)', fontSize: '0.75rem', fontWeight: 600 }}>
          {topic.name} · {t('home.sampleChip', { level: topic.levels[0] })}
        </span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginLeft: 'auto' }}>
          {t('home.tryOne')}
        </span>
      </div>
      <p style={{ margin: 0, fontFamily: 'var(--font-family-heading)', fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.01em' }}>
        {q.text}
      </p>
      {q.code && (
        <pre style={{ margin: 0, background: 'var(--color-background-muted)', border: '1px solid var(--ss-card-line)', borderRadius: 'var(--radius-inner)', padding: '10px 14px', fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: '0.9rem', color: 'var(--color-text-primary)', overflowX: 'auto' }}>
          {q.code}
        </pre>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {q.opts.map((label, i) => {
          const isCorrect = answered && i === correct;
          const isWrong = answered && i === picked && picked !== correct;
          const dim = answered && !isCorrect && !isWrong;
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => { if (picked === null) setPicked(i); }}
              className="ss-radio-card"
              data-tone={isCorrect ? 'success' : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', fontSize: '0.95rem',
                opacity: dim ? 0.6 : 1,
                borderColor: isWrong ? 'var(--ss-error)' : undefined,
                boxShadow: isWrong ? 'inset 0 0 0 1px var(--ss-error)' : undefined,
                background: isWrong ? 'var(--ss-error-soft)' : undefined,
              }}
            >
              <span style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: 6, background: 'var(--color-background-muted)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                {String.fromCharCode(65 + i)}
              </span>
              <span>{label}</span>
              {(isCorrect || isWrong) && (
                <span style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 700, color: isCorrect ? 'var(--ss-success)' : 'var(--ss-error)' }}>
                  {isCorrect ? '✓' : '✕'}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {answered && (
        <div style={{
          borderRadius: 'var(--radius-element)', padding: '12px 14px',
          background: right ? 'var(--ss-success-soft)' : 'var(--ss-error-soft)',
          border: `1px solid ${right ? 'var(--ss-success)' : 'var(--ss-error)'}`,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: right ? 'var(--ss-success)' : 'var(--ss-error)' }}>
            {right ? t('home.answerCorrect') : t('home.answerWrong', { answer: q.opts[correct] })}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{q.e}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{t('home.checkpointBlurb')}</span>
        </div>
      )}
    </div>
  );
}

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
    <span className="ss-float" aria-hidden style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: '1.5rem', lineHeight: 1 }}>
      {topic.emoji}
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
  const [, setSubject] = useSubject();
  const { isAuthenticated, signInWithGoogle } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const topicsRef = useRef<HTMLElement>(null);

  const featured = LANDING_TOPICS[subject.id] ?? [];
  const [selectedId, setSelectedId] = useState<string>(featured[0]?.id ?? '');
  const selected = featured.find((x) => x.id === selectedId) ?? featured[0];

  const subjectName = t(subjectNameKey(subject.id));
  const brand = subject.standaloneBrand ?? subjectName;
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

  // Sibling subjects for the studyShark family line (umbrella app switches the
  // active subject; a locked deploy links out to the umbrella site instead).
  const siblings = SUBJECT_ORDER.filter((id) => id !== subject.id);

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
        {selected && <SampleCard key={selected.id} topic={selected} />}
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

      {/* ── studyShark family line ── */}
      <section aria-label="studyShark family" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '8px 0 4px', borderTop: '1px solid var(--ss-header-border)' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textAlign: 'center', paddingTop: 12 }}>
          {brand} {t('home.familyLine')}{' '}
          {isSubjectLocked() ? (
            SIBLING_PLATFORMS_URL && <a href={SIBLING_PLATFORMS_URL} style={{ fontWeight: 600 }}>studyShark</a>
          ) : (
            siblings.map((id, i) => (
              <span key={id}>
                <button
                  type="button"
                  onClick={() => setSubject(id)}
                  style={{ color: SUBJECTS[id].accent, fontWeight: 600, background: 'none', border: 'none', padding: 0, margin: '0 5px', cursor: 'pointer', font: 'inherit' }}
                >
                  {SUBJECTS[id].standaloneBrand ?? SUBJECTS[id].label}
                </button>
                {i < siblings.length - 1 ? '·' : ''}
              </span>
            ))
          )}
        </span>
      </section>

      <AppToast open={!!authError} onClose={() => setAuthError(null)} severity="error" message={authError} autoHideDuration={5000} />
    </div>
  );
}
