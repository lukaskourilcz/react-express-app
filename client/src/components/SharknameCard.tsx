/**
 * "Your sharkname" on the Profile: the handle friends add you by, a Generate
 * button that rolls a funny shark name (shared/sharkname.ts), and what
 * friends see of you: the sharkname or your Google name, and an initials
 * avatar or your Google photo (op=identity, migration 055).
 *
 * The roll is a short slot-machine flip of a few names on the name plate
 * above the field; under reduced motion the new name simply appears. The
 * plate is decoration: the field holds the same text, and a polite status
 * announces the name that landed. Nothing is saved until Save: a roll only
 * fills the field, so a learner can roll, edit and roll again.
 *
 * Saving the handle goes through the existing friends-handle op. A taken
 * name answers 409 handle_taken, and the card offers a fresh roll in its
 * place. A handle can change once every 30 days; while it cannot, the card
 * says until when and offers no Generate.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@astryxdesign/core/Button';
import { Switch } from '@astryxdesign/core/Switch';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { Kicker } from './landing/LandingKit';
import LoadingScreen from './LoadingScreen';
import ErrorRetry from './ErrorRetry';
import { InitialsAvatar } from './ui/InitialsAvatar';
import { useLanguage, useT } from '../i18n/LanguageContext';
import { ApiError, friendlyError } from '../lib/api';
import {
  getHandle, getIdentity, setHandle as saveHandle, setIdentity as saveIdentity, isValidHandle,
  type HandleState, type Identity,
} from '../lib/friends';
import { generateSharkname } from '../../../shared/sharkname';
import { HANDLE_MAX_LENGTH } from '../../../shared/handles';
import './Friends.css';
import './SharknameCard.css';

/** How many names flash past before the roll lands, and how fast. */
const ROLL_FLIPS = 6;
const ROLL_STEP_MS = 70;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

type Load = 'loading' | 'ready' | 'failed';

export default function SharknameCard({ focus = false, onFocused }: { focus?: boolean; onFocused?: () => void }) {
  const t = useT();
  const titleId = useId();
  const queryClient = useQueryClient();
  const [load, setLoad] = useState<Load>('loading');
  const [handle, setHandleState] = useState<HandleState | null>(null);
  const [identity, setIdentityState] = useState<Identity | null>(null);
  const alive = useRef(true);
  // Set on mount as well as cleared on unmount: StrictMode mounts twice.
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const read = useCallback(async () => {
    setLoad('loading');
    try {
      const [own, who] = await Promise.all([getHandle(), getIdentity()]);
      if (!alive.current) return;
      setHandleState(own);
      setIdentityState(who);
      setLoad('ready');
    } catch {
      if (alive.current) setLoad('failed');
    }
  }, []);
  useEffect(() => { void read(); }, [read]);

  // A board names a learner by this card's choices (board_display_name), so
  // a saved change refetches whatever boards the tab has loaded.
  const boardsChanged = () => void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });

  return (
    <section className="ss-panel sn-card" aria-labelledby={titleId}>
      <Kicker as="h2"><span id={titleId}>{t('sharkname.title')}</span></Kicker>
      {load === 'loading' && <LoadingScreen label={t('sharkname.loading')} sx={{ minHeight: 120 }} />}
      {load === 'failed' && <ErrorRetry message={t('sharkname.loadFailed')} onRetry={() => void read()} />}
      {load === 'ready' && handle && identity && (
        <>
          <SharknameEditor
            state={handle}
            focus={focus}
            onFocused={onFocused}
            onSaved={async () => {
              boardsChanged();
              try {
                const own = await getHandle();
                if (alive.current) setHandleState(own);
              } catch {
                // The save went through; the next visit reads the new date.
              }
            }}
          />
          {handle.handle ? (
            <FriendsSee
              handle={handle.handle}
              identity={identity}
              onChange={(next, saved) => { setIdentityState(next); if (saved) boardsChanged(); }}
            />
          ) : (
            <p className="fr-note">{t('sharkname.needed')}</p>
          )}
        </>
      )}
    </section>
  );
}

/* ── the name ───────────────────────────────────────────────────────────── */

function SharknameEditor({
  state,
  focus,
  onFocused,
  onSaved,
}: {
  state: HandleState;
  focus: boolean;
  onFocused?: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const { lang } = useLanguage();
  const inputId = useId();
  const noteId = useId();
  const input = useRef<HTMLInputElement>(null);
  const current = state.handle ?? '';
  const [draft, setDraft] = useState(current);
  const [flip, setFlip] = useState<{ name: string; n: number } | null>(null);
  const [rolls, setRolls] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taken, setTaken] = useState<{ name: string; suggestion: string } | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);

  // Sent here from the Friends tab: put the cursor in the field, once.
  useEffect(() => {
    if (!focus) return;
    input.current?.focus();
    input.current?.scrollIntoView?.({ block: 'center' });
    onFocused?.();
  }, [focus, onFocused]);

  const until = state.handle && state.canChangeAt && new Date(state.canChangeAt).getTime() > Date.now()
    ? new Date(state.canChangeAt)
    : null;
  const rolling = flip !== null;
  const clean = draft.trim();
  const unchanged = clean === current;
  // Only a change of capitals is free during the 30 days.
  const locked = until !== null && clean.toLowerCase() !== current.toLowerCase();

  const land = (name: string) => {
    setFlip(null);
    setDraft(name);
    setRolls((n) => n + 1);
    setAnnounce(t('sharkname.generated', { name }));
  };

  const roll = () => {
    window.clearInterval(timer.current);
    const next = generateSharkname(Math.random, [current, clean].filter(Boolean));
    setError(null);
    setTaken(null);
    setSaved(null);
    if (prefersReducedMotion()) { land(next); return; }
    let left = ROLL_FLIPS;
    setFlip({ name: generateSharkname(), n: 0 });
    timer.current = window.setInterval(() => {
      left -= 1;
      if (left <= 0) {
        window.clearInterval(timer.current);
        land(next);
        return;
      }
      setFlip((previous) => ({ name: generateSharkname(), n: (previous?.n ?? 0) + 1 }));
    }, ROLL_STEP_MS);
  };

  const submit = async () => {
    if (rolling || saving || unchanged || locked) return;
    if (!isValidHandle(clean)) { setError(t('friends.handleInvalid')); setTaken(null); return; }
    setSaving(true); setError(null); setTaken(null); setSaved(null);
    try {
      const result = await saveHandle(clean);
      setSaved(result.handle);
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'handle_taken') {
        setTaken({ name: clean, suggestion: generateSharkname(Math.random, [clean, current]) });
      } else {
        setError(friendlyError(err));
      }
    } finally {
      setSaving(false);
    }
  };

  const plate = rolling ? flip.name : clean || t('sharkname.none');
  const dateLabel = until ? new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(until) : '';

  return (
    <div className="sn-editor">
      <p className="fr-note">{t('sharkname.help')}</p>
      {/* The plate repeats the field in display type. Keyed per name so each
          one slides in; aria-hidden because the field and the status below
          already say it. */}
      <p className="sn-plate" data-empty={!rolling && !clean ? 'true' : undefined} data-rolling={rolling ? 'true' : undefined} aria-hidden="true">
        <span key={rolling ? `flip-${flip.n}` : `name-${rolls}`} className={rolling ? 'sn-plate__name sn-plate__name--flip' : rolls > 0 ? 'sn-plate__name sn-plate__name--land' : 'sn-plate__name'}>
          {plate}
        </span>
      </p>
      <div className="fr-row">
        <label className="ss-sr-only" htmlFor={inputId}>{t('sharkname.inputLabel')}</label>
        <input
          ref={input}
          id={inputId}
          className="fr-input sn-input"
          value={draft}
          maxLength={HANDLE_MAX_LENGTH}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          readOnly={rolling || until !== null}
          aria-describedby={until ? noteId : undefined}
          placeholder={t('sharkname.placeholder')}
          onChange={(event) => { setDraft(event.target.value); setSaved(null); setTaken(null); setError(null); }}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void submit(); } }}
        />
        <Button
          variant="secondary"
          isDisabled={rolling || saving || until !== null}
          onClick={roll}
          label={t('sharkname.generate')}
        />
        <Button
          variant="primary"
          isDisabled={rolling || saving || unchanged || locked}
          onClick={() => void submit()}
          label={saving ? t('friends.saving') : t('friends.handleSave')}
        />
      </div>
      <p className="ss-sr-only" role="status" aria-live="polite">{announce}</p>
      {until && <p id={noteId} className="fr-note">{t('sharkname.cooldown', { date: dateLabel })}</p>}
      {saved && <p className="fr-note fr-note--ok" role="status">{t('sharkname.saved', { name: saved })}</p>}
      {error && <p className="fr-note fr-note--error" role="alert">{error}</p>}
      {taken && (
        <div className="sn-taken" role="alert">
          <p className="fr-note fr-note--error">{t('sharkname.taken', { name: taken.name })}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setDraft(taken.suggestion); setTaken(null); setRolls((n) => n + 1); input.current?.focus(); }}
            label={t('sharkname.trySuggestion', { name: taken.suggestion })}
          />
        </div>
      )}
    </div>
  );
}

/* ── what friends see ───────────────────────────────────────────────────── */

function FriendsSee({
  handle,
  identity,
  onChange,
}: {
  handle: string;
  identity: Identity;
  onChange: (next: Identity, saved: boolean) => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState<'name' | 'photo' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const useName = identity.showRealName && identity.realName !== null;
  const photoOn = identity.showPhoto && identity.photo !== null;
  const shownName = useName && identity.realName ? identity.realName : handle;

  const change = async (which: 'name' | 'photo', patch: { showRealName?: boolean; showPhoto?: boolean }) => {
    const before = identity;
    setBusy(which);
    setError(null);
    onChange({ ...identity, ...patch }, false);
    try {
      onChange(await saveIdentity(patch), true);
    } catch (err) {
      onChange(before, false);
      setError(err instanceof ApiError && err.status === 409 ? friendlyError(err) : t('sharkname.saveFailed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="sn-see">
      <RadioList
        label={t('sharkname.friendsSee')}
        description={t('sharkname.seeHelp')}
        value={useName ? 'name' : 'sharkname'}
        isDisabled={busy !== null}
        onChange={(value) => void change('name', { showRealName: value === 'name' })}
      >
        <RadioListItem value="sharkname" label={t('sharkname.seeSharkname')} description={handle} />
        <RadioListItem
          value="name"
          label={t('sharkname.seeName')}
          description={identity.realName ?? t('sharkname.noName')}
          isDisabled={identity.realName === null}
        />
      </RadioList>
      <Switch
        label={t('sharkname.photo')}
        description={identity.photo ? t('sharkname.photoHelp') : t('sharkname.noPhoto')}
        value={photoOn}
        isDisabled={identity.photo === null || busy !== null}
        isLoading={busy === 'photo'}
        onChange={(checked) => void change('photo', { showPhoto: checked })}
      />
      <div className="sn-preview">
        <span className="fr-note">{t('sharkname.preview')}</span>
        <span className="sn-preview__who">
          <InitialsAvatar name={shownName} src={photoOn ? identity.photo : null} size={40} />
          <span className="sn-preview__name">{shownName}</span>
        </span>
      </div>
      {error && <p className="fr-note fr-note--error" role="alert">{error}</p>}
    </div>
  );
}
