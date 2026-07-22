// The StudyShark umbrella landing ("Deep End v2" / studyShark Landing v2): the
// pre-choice gate shown until the learner picks a subject. Same editorial
// layout as the per-subject Home, but the picker cards are SUBJECTS. Choosing a
// subject (a card, the roadmap "Start" CTA, or the hero CTA target) sets the
// active subject and drops into the normal app scoped to it.
//
// Shares the hero / sample-question / stat / CTA primitives with Home via
// LandingKit; the per-subject accent drives each card + the live preview.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage, useT } from '../i18n/LanguageContext';
import { SUBJECT_SCOPE_CATALOG } from '../../../shared/subject-catalog';
import type { TranslationKey } from '../i18n/translations';
import { useAuth } from '../lib/auth';
import {
  SUBJECTS, AVAILABLE_SUBJECT_ORDER, useSubject, setSubjectValue,
  subjectNameKey, subjectBlurbKey, isSubjectId, type SubjectId,
} from '../lib/subjects';
import { LANDING_TOPICS } from '../lib/landingTopics';
import {
  Kicker, StatItem, FadeFinCta, SwimCta, SampleCard, CheckpointNode, pathWave, type StatSpec,
} from './landing/LandingKit';
import { AppToast } from './ui/AppToast';
import SubjectGlyph from './ui/SubjectGlyph';
import { localizeLandingTopic } from '../lib/localizeLandingTopic';
import SubjectPlate from './ui/SubjectPlate';

// A soft tint / accent override for a subject, so the sample card + roadmap
// preview re-skin to whichever subject is selected.
const accentVars = (accent: string): CSSProperties =>
  ({ ['--brand-accent' as string]: accent, ['--brand-accent-soft' as string]: `${accent}1f` } as CSSProperties);

// ───────────────────────────── Subject card ───────────────────────────────

function SubjectCard({
  id, selected, onSelect,
}: {
  id: SubjectId; selected: boolean; onSelect: () => void;
}) {
  const t = useT();
  const s = SUBJECTS[id];
  const accentText = `light-dark(${s.accent}, ${s.accentBright})`;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={t('subject.study', { subject: t(subjectNameKey(id)) })}
      aria-pressed={selected}
      style={{
        display: 'grid', gridTemplateColumns: '88px minmax(0,1fr) auto', alignItems: 'center', gap: 12, textAlign: 'left',
        background: selected ? `${s.accent}14` : 'var(--ss-card-bg)',
        border: `1px solid ${selected ? s.accent : 'var(--ss-card-line)'}`,
        borderBottom: '2px solid var(--ss-card-edge)',
        boxShadow: selected ? `inset 0 0 0 1px ${s.accent}` : '0 2px 10px light-dark(rgba(23,39,46,0.06), rgba(0,0,0,0.4))',
        borderRadius: 'var(--radius-container)', padding: '14px 16px', cursor: 'pointer', minHeight: 132,
        transition: 'box-shadow 0.15s ease, background 0.2s ease, border-color 0.2s ease',
      }}
    >
      <span aria-hidden style={{ display: 'grid', placeItems: 'center', alignSelf: 'stretch', overflow: 'hidden', borderRadius: 'var(--radius-inner)', color: s.accent, lineHeight: 1, background: `${s.accent}14`, ...accentVars(s.accent) }}>
        <SubjectPlate id={id} compact />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <span style={{ fontFamily: 'var(--font-family-heading)', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em', color: accentText }}>
          <span aria-hidden style={{ display: 'inline-flex', marginRight: 6, verticalAlign: 'middle' }}><SubjectGlyph id={id} size={17} /></span>
          {t(subjectNameKey(id))}
        </span>
        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
          {t('subject.catalogCounts', { questions: SUBJECT_SCOPE_CATALOG[id].questionCount.toLocaleString(), topics: s.topics.length })}
        </span>
        <span style={{ fontSize: '0.78rem', lineHeight: 1.4, color: 'var(--color-text-secondary)' }}>{t(subjectBlurbKey(id))}</span>
      </span>
      <span style={{ marginLeft: 'auto', fontSize: '0.9rem', fontWeight: 700, color: accentText, opacity: selected ? 1 : 0 }}>✓</span>
    </button>
  );
}

// ───────────────────────────── Roadmap preview ────────────────────────────

function SubjectPreview({ id, onStart }: { id: SubjectId; onStart: () => void }) {
  const { t, lang } = useLanguage();
  const s = SUBJECTS[id];
  const name = t(subjectNameKey(id));
  const featured = (LANDING_TOPICS[id] ?? []).map((topic) => localizeLandingTopic(topic, lang, t));
  const pathTopics = featured.slice(0, 5);
  const moreCount = s.topics.length - pathTopics.length;
  return (
    <section
      aria-label={t('home.insideTopic', { name })}
      className="ss-panel"
      style={{ ...accentVars(s.accent), padding: 28, display: 'flex', flexDirection: 'column', gap: 22, position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-page)' }}
    >
      <div aria-hidden style={{ position: 'absolute', right: '-4%', bottom: '-42%', opacity: 0.04, transform: 'rotate(-8deg)', pointerEvents: 'none', color: 'var(--ss-ink)' }}>
        <svg width="420" height="420" viewBox="0 0 24 24" fill="none"><path d="M3 18 Q 6 6 15 3 Q 17 11 21 18 Z" fill="currentColor" /></svg>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', position: 'relative' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-family-heading)', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.015em' }}>
          {t('home.insideTopic', { name })}
        </h2>
        <span style={{ borderRadius: 999, padding: '3px 10px', fontWeight: 600, fontSize: '0.75rem', color: 'var(--brand-accent)', background: 'var(--brand-accent-soft)' }}>
          {t('subject.meta', { count: s.topics.length })}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-secondary)', maxWidth: '70ch', position: 'relative' }}>{t(subjectBlurbKey(id))}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '6px 2px', position: 'relative' }}>
        {pathTopics.map((tp, i) => {
          const first = i === 0;
          return (
            <div key={tp.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 96 }}>
                <span style={{
                  display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%',
                  background: first ? 'var(--brand-accent)' : 'var(--brand-accent-soft)',
                  color: first ? 'var(--brand-on-accent)' : 'var(--brand-accent)',
                  border: `2px solid ${first ? 'var(--brand-accent)' : 'transparent'}`,
                  fontFamily: 'var(--font-family-heading)', fontWeight: 800, fontSize: '0.95rem',
                }}>{i + 1}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'center', whiteSpace: 'nowrap' }}>{tp.name}</span>
              </div>
              <svg aria-hidden width="40" height="8" viewBox="0 0 40 8" style={{ display: 'block', margin: '0 2px 24px', opacity: 0.3, flexShrink: 0 }}>
                <path d={pathWave(i)} fill="none" stroke="var(--ss-ink)" strokeWidth={1.6} strokeLinecap="round" />
              </svg>
            </div>
          );
        })}
        <CheckpointNode label={t('home.checkpoint')} />
        {moreCount > 0 && (
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', flexShrink: 0, margin: '0 8px 24px' }}>
            {t('subject.andMoreTopics', { n: moreCount })}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
        <SwimCta label={t('home.startLevel1', { name })} onClick={onStart} dir={-1} />
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{t('subject.roadmapNote')}</span>
      </div>
    </section>
  );
}

// ───────────────────────────── Feature strip ──────────────────────────────

interface StripItem { titleKey: TranslationKey; textKey: TranslationKey; color: string; icon: ReactNode; to: string; }
const stripIcon = (path: ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{path}</svg>
);

// ───────────────────────────────── Landing ────────────────────────────────

export default function SubjectPicker() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [current] = useSubject();
  const { isAuthenticated, signInWithGoogle } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const subjectsRef = useRef<HTMLElement>(null);

  const requestedSubject = searchParams.get('subject');
  const requestedId = isSubjectId(requestedSubject) && AVAILABLE_SUBJECT_ORDER.includes(requestedSubject)
    ? requestedSubject
    : null;
  const [selectedId, setSelectedId] = useState<SubjectId>(requestedId ?? current);
  useEffect(() => {
    if (requestedId) setSelectedId(requestedId);
  }, [requestedId]);
  const sel = SUBJECTS[selectedId];
  const featuredRaw = LANDING_TOPICS[selectedId]?.[0];
  const featured = featuredRaw ? localizeLandingTopic(featuredRaw, lang, t) : undefined;

  const totalTopics = AVAILABLE_SUBJECT_ORDER.reduce((sum, id) => sum + SUBJECTS[id].topics.length, 0);
  const totalQuestions = AVAILABLE_SUBJECT_ORDER.reduce((sum, id) => sum + SUBJECT_SCOPE_CATALOG[id].questionCount, 0);
  const stats: StatSpec[] = [
    { value: `${totalTopics * 25}+`, label: t('home.statLevels'), pos: 'right top', size: 40 },
    { value: totalQuestions.toLocaleString(), label: t('home.statQuestions'), pos: 'left bottom', size: 34 },
    { value: String(AVAILABLE_SUBJECT_ORDER.length), label: t('subject.statSubjects'), pos: 'center top', size: 32 },
    { value: '$0', label: t('home.statForever'), pos: 'right bottom', size: 38 },
  ];

  const choose = (id: SubjectId) => { setSubjectValue(id); navigate('/'); };
  const scrollToSubjects = () => subjectsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const handleSignIn = async () => {
    setSigningIn(true);
    try { await signInWithGoogle(); }
    catch { setAuthError(t('auth.signInFailed')); setSigningIn(false); }
  };

  const strip: StripItem[] = [
    { titleKey: 'home.stripDailyTitle', textKey: 'home.stripDailyText', color: 'var(--brand-accent)', to: '/challenge', icon: stripIcon(<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />) },
    { titleKey: 'home.stripLiveTitle', textKey: 'home.stripLiveText', color: 'var(--ss-info)', to: '/play', icon: stripIcon(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>) },
    { titleKey: 'subject.stripCardsTitle', textKey: 'subject.stripCardsText', color: 'var(--brand-accent)', to: '/cards', icon: stripIcon(<><rect x="3" y="6" width="13" height="15" rx="2" /><path d="M8 3h11a2 2 0 0 1 2 2v13" /></>) },
    { titleKey: 'home.stripXpTitle', textKey: 'home.stripXpText', color: 'var(--ss-warning)', to: '/leaderboard', icon: stripIcon(<><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M5 4H3v2a3 3 0 0 0 3 3M19 4h2v2a3 3 0 0 1-3 3" /></>) },
  ];

  const brand = 'StudyShark';

  return (
    <div className="ss-pop" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 56 }}>
      {/* ── Hero ── */}
      <section aria-label={t('home.introAria')} className="ss-hero-grid">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 20 }}>
          <Kicker>{brand} · {t('home.freeForever')}</Kicker>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-family-heading)', fontWeight: 800, fontSize: 'clamp(2.6rem,4.8vw,3.5rem)', lineHeight: 1.06, letterSpacing: '-0.02em' }}>
            {t('subject.landingTitle')}
          </h1>
          <p style={{ margin: 0, fontSize: '1.125rem', color: 'var(--color-text-secondary)', maxWidth: '46ch' }}>{t('subject.landingSubtitle')}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <FadeFinCta label={t('subject.chooseSubject')} primary onClick={scrollToSubjects} finLeft="-2px" finSize={58} accent={sel.accent} />
            {isAuthenticated ? (
              <FadeFinCta label={t('home.ctaLearn')} onClick={() => choose(selectedId)} finLeft="80%" finSize={58} accent={sel.accent} />
            ) : (
              <FadeFinCta disabled={signingIn} label={signingIn ? t('home.ctaSignIn') : t('home.signInGoogle')} onClick={handleSignIn} finLeft="80%" finSize={58} accent={sel.accent} />
            )}
          </div>
          <div className="ss-hero-stats">
            {stats.map((s) => <StatItem key={s.label} {...s} accent="#2d7a2d" />)}
          </div>
        </div>
        {featured && (
          <div style={accentVars(sel.accent)}>
            <SampleCard key={selectedId} chip={`${featured.name} · ${t('home.sampleChip', { level: featured.levels[0] })}`} question={featured.question} />
          </div>
        )}
      </section>

      {/* ── Subject picker ── */}
      <section id="subjects" ref={subjectsRef} aria-label={t('subject.pickTitle')} style={{ display: 'flex', flexDirection: 'column', gap: 20, scrollMarginTop: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Kicker>{t('home.topicsKicker')}</Kicker>
          <h2 style={{ margin: '6px 0 0', fontFamily: 'var(--font-family-heading)', fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.015em' }}>
            {t('subject.pickTitle')}
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 14 }}>
          {AVAILABLE_SUBJECT_ORDER.map((id) => (
            <SubjectCard key={id} id={id} selected={id === selectedId} onSelect={() => setSelectedId(id)} />
          ))}
        </div>
      </section>

      {/* ── Roadmap preview ── */}
      <SubjectPreview id={selectedId} onStart={() => choose(selectedId)} />

      {/* ── Everything-else feature strip ── */}
      <section aria-label={t('home.moreKicker')} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Kicker>{t('home.moreKicker')}</Kicker>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '12px 28px' }}>
          {strip.map((item) => (
            <button key={item.titleKey} type="button" onClick={() => navigate(item.to)} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
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
        <SwimCta label={t('home.startFree')} onClick={scrollToSubjects} dir={1} />
      </section>

      <AppToast open={!!authError} onClose={() => setAuthError(null)} severity="error" message={authError} autoHideDuration={5000} />
    </div>
  );
}
