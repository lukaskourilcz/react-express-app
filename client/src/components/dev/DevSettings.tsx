import { useEffect, useId, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Switch } from '@astryxdesign/core/Switch';
import { Button } from '@astryxdesign/core/Button';
import LoadingScreen from '../LoadingScreen';
import ErrorRetry from '../ErrorRetry';
import { AppToast } from '../ui/AppToast';
import { friendlyError } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { getAdminSettings, saveAdminSettings, type GameSettings } from '../../lib/devApi';

const SETTINGS_KEY = ['admin', 'settings'] as const;
import { RANK_TITLES, setRankThresholds } from '../../lib/leveling';
import { CATEGORY_OPTIONS, onCategoryColorText } from '../../lib/categories';
import { useActiveSubject } from '../../lib/subjects';

const DIFFICULTY_MODES = ['basics', 'easy', 'zero-to-hero', 'advanced', 'mixed'];

const parseNum = (s: string, fallback: number): number => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
};

const parseList = (s: string): number[] =>
  s
    .split(',')
    .map((part) => parseInt(part.trim(), 10))
    .filter((n) => Number.isFinite(n));

// The form keeps numeric/list fields as raw strings for smooth typing; they are
// parsed back into a GameSettings object on save (the server re-validates too).
interface FormState {
  quizDefaultCount: string;
  quizMaxCount: string;
  quizCountOptions: string;
  quizDefaultDifficulty: string;
  quizMinImportance: string;
  /** Category ids the quiz home shows by default (rest hidden behind "Show all"). */
  quizDefaultCategoryIds: string[];
  dailyCount: string;
  playDefaultDurationS: string;
  playDurationOptionsS: string;
  playCountOptions: string;
  playMinQuestions: string;
  playMaxQuestions: string;
  playMaxSpeedBonus: string;
  featDaily: boolean;
  featMulti: boolean;
  featLeader: boolean;
  featFlash: boolean;
  supportEnabled: boolean;
  supportKofiUrl: string;
  supportGithubUrl: string;
  supportMonthlyTarget: string;
  supportAmountCovered: string;
  supportLastUpdatedAt: string;
  supportCostBreakdown: string;
  supportPublicThanks: boolean;
  /** XP threshold per career rank, kept as raw strings while editing. */
  levelThresholds: string[];
  /** Token price per shop product id, kept as raw strings while editing. */
  shopPrices: Record<string, string>;
  /** Token price to unlock any one learning path. */
  /** One-liner loading-screen dev tips, one per line while editing. */
  devTips: string;
  ownerEmail: string;
}

// Friendly labels for the configurable shop products (ids match the catalogue).
const SHOP_PRICE_LABELS: Record<string, string> = {
  'double-xp': 'Double-XP booster',
  'ring-emerald': 'Ring · Emerald',
  'ring-gold': 'Ring · Gold',
  'ring-violet': 'Ring · Violet',
  'flair-rocket': 'Flair · Rocket',
  'flair-flame': 'Flair · Flame',
  'flair-crown': 'Flair · Crown',
};

const toForm = (s: GameSettings): FormState => ({
  quizDefaultCount: String(s.quiz.defaultCount),
  quizMaxCount: String(s.quiz.maxCount),
  quizCountOptions: s.quiz.countOptions.join(', '),
  quizDefaultDifficulty: s.quiz.defaultDifficulty,
  quizMinImportance: String(s.quiz.minImportance),
  quizDefaultCategoryIds: [...s.quiz.defaultCategoryIds],
  dailyCount: String(s.daily.count),
  playDefaultDurationS: String(s.play.defaultDurationS),
  playDurationOptionsS: s.play.durationOptionsS.join(', '),
  playCountOptions: s.play.countOptions.join(', '),
  playMinQuestions: String(s.play.minQuestions),
  playMaxQuestions: String(s.play.maxQuestions),
  playMaxSpeedBonus: String(s.play.maxSpeedBonus),
  featDaily: s.features.dailyChallenge,
  featMulti: s.features.multiplayer,
  featLeader: s.features.leaderboard,
  featFlash: s.features.flashcards,
  supportEnabled: s.support.enabled,
  supportKofiUrl: s.support.kofiUrl,
  supportGithubUrl: s.support.githubSponsorsUrl,
  supportMonthlyTarget: String(s.support.monthlyTarget),
  supportAmountCovered: String(s.support.amountCovered),
  supportLastUpdatedAt: s.support.lastUpdatedAt,
  supportCostBreakdown: s.support.costBreakdown.map((row) => `${row.label}: ${row.amount}`).join('\n'),
  supportPublicThanks: s.support.publicThanksEnabled,
  levelThresholds: s.leveling.rankThresholds.map(String),
  shopPrices: Object.fromEntries(Object.entries(s.shop.prices).map(([k, v]) => [k, String(v)])),
  devTips: s.devTips.join('\n'),
  ownerEmail: s.ownerEmail,
});

// Split the multiline tips editor into a clean list: trim each line, drop blanks.
const parseTips = (s: string): string[] =>
  s
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const parseCosts = (s: string): Array<{ label: string; amount: number }> =>
  s.split('\n').flatMap((line) => {
    const separator = line.lastIndexOf(':');
    if (separator < 1) return [];
    const label = line.slice(0, separator).trim();
    const amount = Number(line.slice(separator + 1).trim());
    return label && Number.isFinite(amount) ? [{ label, amount }] : [];
  });

const toSettings = (f: FormState, base: GameSettings): GameSettings => ({
  quiz: {
    defaultCount: parseNum(f.quizDefaultCount, base.quiz.defaultCount),
    maxCount: parseNum(f.quizMaxCount, base.quiz.maxCount),
    countOptions: parseList(f.quizCountOptions),
    defaultDifficulty: f.quizDefaultDifficulty,
    minImportance: parseNum(f.quizMinImportance, base.quiz.minImportance),
    defaultCategoryIds: f.quizDefaultCategoryIds,
  },
  daily: { count: parseNum(f.dailyCount, base.daily.count) },
  play: {
    defaultDurationS: parseNum(f.playDefaultDurationS, base.play.defaultDurationS),
    durationOptionsS: parseList(f.playDurationOptionsS),
    countOptions: parseList(f.playCountOptions),
    minQuestions: parseNum(f.playMinQuestions, base.play.minQuestions),
    maxQuestions: parseNum(f.playMaxQuestions, base.play.maxQuestions),
    maxSpeedBonus: parseNum(f.playMaxSpeedBonus, base.play.maxSpeedBonus),
  },
  features: {
    dailyChallenge: f.featDaily,
    multiplayer: f.featMulti,
    leaderboard: f.featLeader,
    flashcards: f.featFlash,
  },
  leveling: {
    rankThresholds: f.levelThresholds.map((v, i) => parseNum(v, base.leveling.rankThresholds[i] ?? 0)),
  },
  shop: {
    prices: Object.fromEntries(
      Object.keys(base.shop.prices).map((k) => [k, parseNum(f.shopPrices[k] ?? '', base.shop.prices[k])]),
    ),
    pathUnlockPrice: base.shop.pathUnlockPrice,
  },
  support: {
    enabled: f.supportEnabled,
    kofiUrl: f.supportKofiUrl.trim(),
    githubSponsorsUrl: f.supportGithubUrl.trim(),
    monthlyTarget: parseNum(f.supportMonthlyTarget, base.support.monthlyTarget),
    amountCovered: parseNum(f.supportAmountCovered, base.support.amountCovered),
    lastUpdatedAt: f.supportLastUpdatedAt.trim(),
    costBreakdown: parseCosts(f.supportCostBreakdown),
    publicThanksEnabled: f.supportPublicThanks,
  },
  devTips: parseTips(f.devTips),
  ownerEmail: f.ownerEmail.trim(),
});

const captionStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--color-text-secondary)',
};

const selectStyle: React.CSSProperties = {
  height: 40,
  borderRadius: 'var(--radius-element)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-background-surface)',
  color: 'var(--color-text-primary)',
  padding: '0 12px',
  fontFamily: 'inherit',
  fontSize: '0.9rem',
};

// A native <select> dressed to sit alongside the Astryx TextInputs — replaces
// MUI's <TextField select>. Renders a Field-style label + optional helper.
function SelectField({
  label,
  value,
  onChange,
  helperText,
  style,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      <label htmlFor={id} style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
        {children}
      </select>
      {helperText && <span style={captionStyle}>{helperText}</span>}
    </div>
  );
}

export default function DevSettings() {
  const activeSubject = useActiveSubject();
  const settingsQuery = useQuery({ queryKey: SETTINGS_KEY, queryFn: getAdminSettings });
  const base = settingsQuery.data?.settings ?? null;
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  // Hydrate (and re-hydrate after a save/refetch) the editable form from the
  // server settings. Edits live in `form`; `base` stays the server truth.
  useEffect(() => {
    if (settingsQuery.data) setForm(toForm(settingsQuery.data.settings));
  }, [settingsQuery.data]);

  if (settingsQuery.isPending) return <LoadingScreen label="Loading settings…" />;
  if (settingsQuery.error) {
    return <ErrorRetry message={friendlyError(settingsQuery.error)} onRetry={() => settingsQuery.refetch()} />;
  }
  if (!form || !base) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const setThreshold = (i: number, value: string) =>
    setForm((f) => {
      if (!f) return f;
      const next = [...f.levelThresholds];
      next[i] = value;
      return { ...f, levelThresholds: next };
    });

  const setShopPrice = (id: string, value: string) =>
    setForm((f) => (f ? { ...f, shopPrices: { ...f.shopPrices, [id]: value } } : f));

  const toggleDefaultCategory = (id: string) =>
    setForm((f) => {
      if (!f) return f;
      const next = f.quizDefaultCategoryIds.includes(id)
        ? f.quizDefaultCategoryIds.filter((c) => c !== id)
        : [...f.quizDefaultCategoryIds, id];
      return { ...f, quizDefaultCategoryIds: next };
    });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { settings } = await saveAdminSettings(toSettings(form, base));
      // Update the cache (the hydrate effect re-fills the form, reflecting any
      // server-side clamping).
      queryClient.setQueryData(SETTINGS_KEY, { settings });
      // Apply the (validated) thresholds to the live leveling module so ranks
      // update across the app without a reload.
      setRankThresholds(settings.leveling.rankThresholds);
      setSnack('Settings saved');
    } catch (err) {
      setSnack(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const num = (key: keyof FormState, label: string) => (
    <TextInput
      label={label}
      value={form[key] as string}
      onChange={(v) => set(key, v)}
      size="sm"
      style={{ width: 160 }}
    />
  );

  return (
    <div style={{ maxWidth: 720 }}>
      <p style={{ ...captionStyle, marginTop: 0, marginBottom: 16 }}>
        Values are validated and clamped server-side. Lists are comma-separated. Changes take effect within a few
        seconds.
      </p>

      <Section title="Quiz">
        {num('quizDefaultCount', 'Default count')}
        {num('quizMaxCount', 'Max count')}
        <SelectField
          label="Default difficulty"
          value={form.quizDefaultDifficulty}
          onChange={(v) => set('quizDefaultDifficulty', v)}
          style={{ width: 180 }}
        >
          {DIFFICULTY_MODES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Min importance"
          helperText="Hide questions below this score from the quiz (1 = no floor)"
          value={form.quizMinImportance}
          onChange={(v) => set('quizMinImportance', v)}
          style={{ width: 200 }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={String(n)}>
              {n}
            </option>
          ))}
        </SelectField>
        <TextInput
          label="Count options"
          value={form.quizCountOptions}
          onChange={(v) => set('quizCountOptions', v)}
          size="sm"
          style={{ flex: 1, minWidth: 200 }}
        />
      </Section>

      <Section title="Quiz — default visible categories">
        <span style={{ ...captionStyle, width: '100%', marginBottom: 4 }}>
          Shown on the quiz home by default; the rest appear when the learner clicks "Show all".
          Select none to show every category by default.
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, width: '100%' }}>
          {CATEGORY_OPTIONS.filter((cat) => activeSubject.categories.includes(cat.value)).map((cat) => {
            const selected = form.quizDefaultCategoryIds.includes(cat.value);
            return (
              <button
                key={cat.value}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleDefaultCategory(cat.value)}
                style={{
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 10px',
                  fontSize: '0.75rem',
                  borderRadius: 999,
                  backgroundColor: selected ? cat.color : 'var(--color-background-surface)',
                  color: selected ? onCategoryColorText(cat.value) : 'var(--color-text-secondary)',
                  border: '1px solid',
                  borderColor: selected ? cat.color : 'var(--color-border)',
                  borderLeft: `3px solid ${cat.color}`,
                  fontWeight: selected ? 600 : 500,
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
        <span style={{ ...captionStyle, width: '100%', marginTop: 4 }}>
          {form.quizDefaultCategoryIds.length === 0
            ? 'All categories visible by default'
            : `${form.quizDefaultCategoryIds.length} category(ies) visible by default`}
        </span>
      </Section>

      <Section title="Daily challenge">{num('dailyCount', 'Question count')}</Section>

      <Section title="Multiplayer / Play">
        {num('playDefaultDurationS', 'Default time (s)')}
        {num('playMinQuestions', 'Min questions')}
        {num('playMaxQuestions', 'Max questions')}
        {num('playMaxSpeedBonus', 'Max speed bonus')}
        <TextInput
          label="Time options (s, 0 = none)"
          value={form.playDurationOptionsS}
          onChange={(v) => set('playDurationOptionsS', v)}
          size="sm"
          style={{ flex: 1, minWidth: 200 }}
        />
        <TextInput
          label="Question-count options"
          value={form.playCountOptions}
          onChange={(v) => set('playCountOptions', v)}
          size="sm"
          style={{ flex: 1, minWidth: 200 }}
        />
      </Section>

      <Section title="Features">
        <Switch label="Daily challenge" value={form.featDaily} onChange={(c) => set('featDaily', c)} />
        <Switch label="Multiplayer / Play" value={form.featMulti} onChange={(c) => set('featMulti', c)} />
        <Switch label="Leaderboard" value={form.featLeader} onChange={(c) => set('featLeader', c)} />
        <Switch label="Flashcards" value={form.featFlash} onChange={(c) => set('featFlash', c)} />
      </Section>

      <Section title="Voluntary support (disabled by default)">
        <span style={{ ...captionStyle, width: '100%', marginBottom: 4 }}>
          Enabling this only reveals transparent external support links. It never unlocks learning, XP, ranks, or other benefits.
        </span>
        <Switch label="Enable public support links" value={form.supportEnabled} onChange={(c) => set('supportEnabled', c)} />
        <Switch label="Show public thank-you section" value={form.supportPublicThanks} onChange={(c) => set('supportPublicThanks', c)} />
        <TextInput label="Ko-fi HTTPS URL" value={form.supportKofiUrl} onChange={(v) => set('supportKofiUrl', v)} size="sm" style={{ flex: 1, minWidth: 260 }} />
        <TextInput label="GitHub Sponsors HTTPS URL" value={form.supportGithubUrl} onChange={(v) => set('supportGithubUrl', v)} size="sm" style={{ flex: 1, minWidth: 260 }} />
        {num('supportMonthlyTarget', 'Monthly target')}
        {num('supportAmountCovered', 'Net amount covered')}
        <TextInput label="Last updated (YYYY-MM-DD)" value={form.supportLastUpdatedAt} onChange={(v) => set('supportLastUpdatedAt', v)} size="sm" style={{ width: 220 }} />
        <TextArea
          label="Cost breakdown (Label: amount, one per line)"
          rows={4}
          size="sm"
          value={form.supportCostBreakdown}
          onChange={(v) => set('supportCostBreakdown', v)}
          style={{ width: '100%' }}
        />
      </Section>

      <Section title="Career levels — total XP to reach each rank">
        <span style={{ ...captionStyle, width: '100%', marginBottom: 4 }}>
          Must be strictly increasing and start at 0; invalid values revert to the defaults on save.
        </span>
        {RANK_TITLES.map((title, i) => (
          <TextInput
            key={title}
            label={`${i + 1}. ${title}`}
            value={form.levelThresholds[i] ?? ''}
            onChange={(v) => setThreshold(i, v)}
            isDisabled={i === 0}
            description={i === 0 ? 'Always 0' : undefined}
            size="sm"
            style={{ width: 190 }}
          />
        ))}
      </Section>

      <Section title="Shop — token prices">
        <span style={{ ...captionStyle, width: '100%', marginBottom: 4 }}>
          Token cost of each cosmetic shop item. Shop purchases never affect learning access, XP, or scores. 0 makes an item free.
        </span>
        {Object.keys(base.shop.prices).map((id) => (
          <TextInput
            key={id}
            label={SHOP_PRICE_LABELS[id] ?? id}
            value={form.shopPrices[id] ?? ''}
            onChange={(v) => setShopPrice(id, v)}
            size="sm"
            style={{ width: 190 }}
          />
        ))}
      </Section>

      <Section title="Loading-screen dev tips">
        <span style={{ ...captionStyle, width: '100%', marginBottom: 4 }}>
          One tip per line. A random tip fades in under the shark after ~2.5s on longer, full-page loads. Keep them short
          one-liners so they're readable at a glance. Leave empty to show no tip.
        </span>
        <TextArea
          label="Dev tips (one per line)"
          rows={4}
          size="sm"
          value={form.devTips}
          onChange={(v) => set('devTips', v)}
          style={{ width: '100%' }}
        />
        <span style={{ ...captionStyle, width: '100%', marginTop: 4 }}>
          {parseTips(form.devTips).length} tip(s)
        </span>
      </Section>

      <Section title="Owner">
        <TextInput
          label="Owner email (sees private categories)"
          value={form.ownerEmail}
          onChange={(v) => set('ownerEmail', v)}
          size="sm"
          style={{ flex: 1, minWidth: 260 }}
        />
      </Section>

      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <Button variant="primary" label={saving ? 'Saving…' : 'Save settings'} onClick={handleSave} isDisabled={saving} />
        <Button variant="secondary" label="Revert" onClick={() => setForm(toForm(base))} isDisabled={saving} />
      </div>

      <AppToast
        open={!!snack}
        onClose={() => setSnack(null)}
        message={snack ?? ''}
        severity="info"
        autoHideDuration={2500}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 16,
        marginBottom: 16,
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-container)',
        background: 'var(--color-background-surface)',
      }}
    >
      <h2
        style={{
          display: 'block',
          margin: 0,
          marginBottom: 12,
          fontSize: '0.7rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-text-secondary)',
          fontWeight: 600,
        }}
      >
        {title}
      </h2>
      <div style={{ height: 1, background: 'var(--color-border)', marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
    </div>
  );
}
