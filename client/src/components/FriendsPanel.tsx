/**
 * The Friends tab.
 *
 * Three things, in the order a learner meets them: your own handle (without one
 * nobody can find you), anyone waiting for an answer, and the people you have
 * already added.
 *
 * There is no directory and no browsing. You reach somebody by typing the
 * handle they chose, exactly. That is the whole discovery model, and the copy
 * says so rather than leaving it to be discovered by a search that finds
 * nothing.
 *
 * A friend is identified by their avatar, their flag and — if they own one —
 * their crown. Not by a name: `user_stats.name` is whatever an OAuth provider
 * handed us and nobody chose to publish it, and the handle is an address you
 * type, not a label to hang on somebody. The handle stays as the accessible
 * name of the row's controls, so the list is still operable and unambiguous to
 * a screen reader and on hover.
 *
 * Every number on a friend's row comes from the server. The crown is a picture
 * somebody spent earned tokens on: it is shown and it changes nothing, least of
 * all the order of this list, which is by streak. The flag is the same — where
 * somebody is from moves them up nothing.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Avatar } from '@astryxdesign/core/Avatar';
import { useLanguage, useT } from '../i18n/LanguageContext';
import { friendlyError } from '../lib/api';
import { CrownBadge } from './ui/Crown';
import { CountryFlag, countryOptions } from './ui/CountryFlag';
import {
  getHandle, setHandle as saveHandle, setDiscoverable, setCountry,
  lookupFriend, requestFriend, respondFriend, removeFriend, listFriends,
  isValidHandle,
  type Friend, type FriendRequest, type HandleState, type LookupResult,
} from '../lib/friends';
import './Friends.css';

type Load = 'loading' | 'ready' | 'unavailable';

export function FriendsPanel() {
  const t = useT();
  const [state, setState] = useState<Load>('loading');
  const [handle, setHandleState] = useState<HandleState | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [own, list] = await Promise.all([getHandle(), listFriends()]);
      setHandleState(own);
      setFriends(list.friends);
      setRequests(list.requests);
      setState('ready');
    } catch (err) {
      // The most likely cause is the migration not being applied yet. Either
      // way the honest thing is to say the tab is not available, not to show an
      // empty friends list that looks like nobody has been added.
      setError(friendlyError(err));
      setState('unavailable');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  if (state === 'loading') {
    return <p className="fr-note" role="status">{t('friends.loading')}</p>;
  }
  if (state === 'unavailable') {
    return (
      <div className="fr-empty">
        <p className="fr-note">{t('friends.unavailable')}</p>
        {error && <p className="fr-note fr-note--error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="fr">
      <HandleCard state={handle} onChanged={refresh} />
      {handle?.handle && <FindFriend onChanged={refresh} ownHandle={handle.handle} />}
      {requests.length > 0 && <Requests requests={requests} onChanged={refresh} />}
      <FriendList friends={friends} hasHandle={Boolean(handle?.handle)} onChanged={refresh} />
    </div>
  );
}

/* ── your own handle ────────────────────────────────────────────────────── */

function HandleCard({ state, onChanged }: { state: HandleState | null; onChanged: () => void }) {
  const t = useT();
  const { lang } = useLanguage();
  const inputId = useId();
  const [draft, setDraft] = useState(state?.handle ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const submit = async () => {
    if (!isValidHandle(draft)) { setError(t('friends.handleInvalid')); return; }
    setSaving(true); setError(null); setSaved(false);
    try {
      await saveHandle(draft);
      setSaved(true);
      onChanged();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleDiscoverable = async (next: boolean) => {
    setError(null);
    try { await setDiscoverable(next); onChanged(); }
    catch (err) { setError(friendlyError(err)); }
  };

  const chooseCountry = async (next: string) => {
    setError(null);
    try { await setCountry(next); onChanged(); }
    catch (err) { setError(friendlyError(err)); }
  };

  // 249 codes named and sorted in the reader's language. Memoised because that
  // is 249 Intl lookups and a collated sort, and neither depends on the draft
  // handle being typed one character at a time.
  const countries = useMemo(() => countryOptions(lang), [lang]);

  return (
    <section className="fr-card" aria-labelledby={`${inputId}-title`}>
      <h3 id={`${inputId}-title`} className="fr-card__title">{t('friends.handleTitle')}</h3>
      <p className="fr-note">{state?.handle ? t('friends.handleHelp') : t('friends.handleFirst')}</p>
      <div className="fr-row">
        <label className="fr-visually-hidden" htmlFor={inputId}>{t('friends.handleTitle')}</label>
        <input
          id={inputId}
          className="fr-input"
          value={draft}
          maxLength={24}
          autoComplete="off"
          spellCheck={false}
          placeholder={t('friends.handlePlaceholder')}
          onChange={(event) => { setDraft(event.target.value); setSaved(false); }}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void submit(); } }}
        />
        <button
          type="button"
          className="fr-btn fr-btn--primary"
          disabled={saving || draft.trim() === (state?.handle ?? '')}
          onClick={() => void submit()}
        >
          {saving ? t('friends.saving') : t('friends.handleSave')}
        </button>
      </div>
      {saved && <p className="fr-note fr-note--ok" role="status">{t('friends.handleSaved')}</p>}
      {error && <p className="fr-note fr-note--error" role="alert">{error}</p>}
      {state?.handle && (
        <>
          <div className="fr-row fr-row--country">
            <label className="fr-label" htmlFor={`${inputId}-country`}>{t('friends.countryLabel')}</label>
            <span className="fr-country">
              <CountryFlag code={state.country} locale={lang} size={20} />
              <select
                id={`${inputId}-country`}
                className="fr-select"
                value={state.country ?? ''}
                onChange={(event) => void chooseCountry(event.target.value)}
              >
                <option value="">{t('friends.countryNone')}</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>{country.name}</option>
                ))}
              </select>
            </span>
          </div>
          <p className="fr-note">{t('friends.countryHelp')}</p>
          <label className="fr-check">
            <input
              type="checkbox"
              checked={state.discoverable}
              onChange={(event) => void toggleDiscoverable(event.target.checked)}
            />
            <span>
              {t('friends.discoverable')}
              <span className="fr-note">{t('friends.discoverableHelp')}</span>
            </span>
          </label>
        </>
      )}
    </section>
  );
}

/* ── finding somebody ───────────────────────────────────────────────────── */

function FindFriend({ ownHandle, onChanged }: { ownHandle: string; onChanged: () => void }) {
  const t = useT();
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const look = async () => {
    const handle = query.trim();
    if (!isValidHandle(handle)) { setResult({ found: false }); setError(null); return; }
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true); setError(null);
    try {
      setResult(await lookupFriend(handle, controller.signal));
    } catch (err) {
      if (!controller.signal.aborted) setError(friendlyError(err));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  const ask = async (handle: string) => {
    setBusy(true); setError(null);
    try {
      const { state } = await requestFriend(handle);
      setResult({ found: true, handle, state });
      onChanged();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="fr-card" aria-labelledby={`${inputId}-title`}>
      <h3 id={`${inputId}-title`} className="fr-card__title">{t('friends.findTitle')}</h3>
      <p className="fr-note">{t('friends.findHelp', { handle: ownHandle })}</p>
      <div className="fr-row">
        <label className="fr-visually-hidden" htmlFor={inputId}>{t('friends.findTitle')}</label>
        <input
          id={inputId}
          className="fr-input"
          value={query}
          maxLength={24}
          autoComplete="off"
          spellCheck={false}
          placeholder={t('friends.findPlaceholder')}
          onChange={(event) => { setQuery(event.target.value); setResult(null); }}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void look(); } }}
        />
        <button type="button" className="fr-btn" disabled={busy} onClick={() => void look()}>
          {busy ? t('friends.searching') : t('friends.find')}
        </button>
      </div>

      {result && !result.found && (
        <p className="fr-note" role="status">{t('friends.notFound')}</p>
      )}
      {result?.found && result.handle && (
        <div className="fr-result" role="status">
          <span className="fr-result__handle">{result.handle}</span>
          {result.state === 'none' && (
            <button type="button" className="fr-btn fr-btn--primary" disabled={busy} onClick={() => void ask(result.handle!)}>
              {t('friends.add')}
            </button>
          )}
          {result.state === 'self' && <span className="fr-note">{t('friends.isYou')}</span>}
          {result.state === 'accepted' && <span className="fr-note">{t('friends.alreadyFriends')}</span>}
          {result.state === 'pending_out' && <span className="fr-note">{t('friends.requestSent')}</span>}
          {result.state === 'pending_in' && <span className="fr-note">{t('friends.theyAsked')}</span>}
          {result.state === 'declined_out' && <span className="fr-note">{t('friends.wasDeclined')}</span>}
          {result.state === 'declined_in' && (
            <button type="button" className="fr-btn fr-btn--primary" disabled={busy} onClick={() => void ask(result.handle!)}>
              {t('friends.add')}
            </button>
          )}
          {result.state === 'blocked' && <span className="fr-note">{t('friends.blocked')}</span>}
        </div>
      )}
      {error && <p className="fr-note fr-note--error" role="alert">{error}</p>}
    </section>
  );
}

/* ── requests waiting for an answer ─────────────────────────────────────── */

function Requests({ requests, onChanged }: { requests: FriendRequest[]; onChanged: () => void }) {
  const t = useT();
  const titleId = useId();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const answer = async (handle: string, accept: boolean) => {
    setBusy(handle); setError(null);
    try { await respondFriend(handle, accept); onChanged(); }
    catch (err) { setError(friendlyError(err)); }
    finally { setBusy(null); }
  };

  const incoming = requests.filter((one) => one.direction === 'incoming');
  const outgoing = requests.filter((one) => one.direction === 'outgoing');

  return (
    <section className="fr-card" aria-labelledby={titleId}>
      <h3 id={titleId} className="fr-card__title">{t('friends.requestsTitle')}</h3>
      <ul className="fr-list">
        {incoming.map((one) => (
          <li key={one.handle} className="fr-item">
            <span className="fr-item__handle">{one.handle}</span>
            <span className="fr-item__actions">
              <button type="button" className="fr-btn fr-btn--primary" disabled={busy === one.handle} onClick={() => void answer(one.handle, true)}>
                {t('friends.accept')}
              </button>
              <button type="button" className="fr-btn" disabled={busy === one.handle} onClick={() => void answer(one.handle, false)}>
                {t('friends.decline')}
              </button>
            </span>
          </li>
        ))}
        {outgoing.map((one) => (
          <li key={one.handle} className="fr-item">
            <span className="fr-item__handle">{one.handle}</span>
            <span className="fr-note">{t('friends.requestSent')}</span>
          </li>
        ))}
      </ul>
      {error && <p className="fr-note fr-note--error" role="alert">{error}</p>}
    </section>
  );
}

/* ── the list ───────────────────────────────────────────────────────────── */

function FriendList({ friends, hasHandle, onChanged }: { friends: Friend[]; hasHandle: boolean; onChanged: () => void }) {
  const t = useT();
  const titleId = useId();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { lang } = useLanguage();
  const drop = async (handle: string) => {
    setBusy(handle); setError(null);
    try { await removeFriend(handle); onChanged(); }
    catch (err) { setError(friendlyError(err)); }
    finally { setBusy(null); }
  };

  return (
    <section className="fr-card" aria-labelledby={titleId}>
      <h3 id={titleId} className="fr-card__title">{t('friends.listTitle', { n: friends.length })}</h3>
      {friends.length === 0 ? (
        <p className="fr-note">{hasHandle ? t('friends.empty') : t('friends.emptyNoHandle')}</p>
      ) : (
        <ul className="fr-list">
          {friends.map((friend) => (
            <li key={friend.handle} className="fr-friend">
              {/* The avatar carries the handle as its alt text: it is the one
                  place a reader can find out who this row is, without the list
                  turning into a column of names. */}
              <Avatar src={friend.picture ?? undefined} name={friend.handle} alt={friend.handle} size="small" />
              <span className="fr-friend__who">
                <span className="fr-friend__marks">
                  <CountryFlag code={friend.country} locale={lang} size={16} />
                  {/* Owned and worn. It says nothing about anybody's learning
                      and it does not move this row: the order is by streak. */}
                  {friend.crown && <CrownBadge size={16} />}
                </span>
                <span className="fr-friend__meta">
                  {t('friends.streakDays', { n: friend.currentStreak })}
                  {' · '}
                  {friend.totalQuestions > 0
                    ? t('friends.accuracy', { pct: friend.accuracyPct })
                    : t('friends.noAnswersYet')}
                  {friend.activeToday && <> {' · '}<span className="fr-today">{t('friends.today')}</span></>}
                </span>
              </span>
              <button
                type="button"
                className="fr-btn"
                disabled={busy === friend.handle}
                aria-label={t('friends.removeOne', { handle: friend.handle })}
                onClick={() => void drop(friend.handle)}
              >
                {t('friends.remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="fr-note fr-note--error" role="alert">{error}</p>}
    </section>
  );
}

export default FriendsPanel;
