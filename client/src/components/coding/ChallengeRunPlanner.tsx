// A challenge run: the learner picks a track, a size and an order, then
// starts it now or plans it for a moment they choose. The server chooses the
// queue from what the learner can already open; this screen only asks.
//
// One run at a time. While a run is open — active, or planned for later —
// the planner shows that run instead of a form: where it stands, when it is
// due, and the way to continue, start, cancel, or put it in a calendar.
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import type { TranslationKey } from '../../i18n/translations';
import { Kicker, SwimCta, FinButton } from '../landing/LandingKit';
import { useAdvanceSession, usePracticeSession, useStartSession } from '../../coding/practice';
import { ApiError } from '../../lib/api';
import { CODING_INDEX } from '../../../../shared/coding-index';
import { CODING_SECTION_TRACKS, type CodingTrack } from '../../../../shared/coding-catalog';
import { PRACTICE_RUN_COUNTS, type PracticeOrder, type PracticeSession } from '../../../../shared/coding-api';

const trackOf = (taskId: string): CodingTrack | null => CODING_INDEX.find((task) => task.id === taskId)?.track ?? null;

/** The route of a queued task, or the Coding home when the id is unknown. */
export const taskHref = (taskId: string): string => {
  const track = trackOf(taskId);
  return track ? `/coding/${track}/${taskId}` : '/coding';
};

/** The task the run is on, or null once every queued task is done. */
export const currentRunTask = (session: PracticeSession): string | null =>
  session.queue[Math.min(session.position, session.queue.length)] ?? null;

export function formatWhen(iso: string, lang: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(lang === 'cs' ? 'cs-CZ' : 'en-GB', { dateStyle: 'full', timeStyle: 'short' }).format(date);
}

/** A one-event calendar file for a planned run, built here and offered as a
 * download. It names the run and links back to Coding; nothing is sent. */
export function calendarHref(session: PracticeSession, title: string): string {
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const start = new Date(session.scheduledFor ?? Date.now());
  const end = new Date(start.getTime() + Math.max(15, session.estimatedMinutes) * 60_000);
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//devShark//Challenge run//EN', 'BEGIN:VEVENT',
    `UID:${session.sessionId}@devshark`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${title}`, `DESCRIPTION:${origin}/coding`, `URL:${origin}/coding`, 'END:VEVENT', 'END:VCALENDAR',
  ];
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
}

/** What the picker sends as `datetime-local`, as a value the server reads. */
const localToIso = (value: string): string | null => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
const nowLocal = (): string => {
  const date = new Date(Date.now() + 5 * 60_000);
  date.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function runSummary(session: PracticeSession, t: (key: TranslationKey, vars?: Record<string, string | number>) => string): string {
  const track = session.topic ? t(`coding.track.${session.topic}` as TranslationKey) : t('coding.run.anyTrack');
  return t('coding.run.summary', { n: session.queue.length, track, order: t(session.order === 'random' ? 'coding.run.random' : 'coding.run.sequential') });
}

/** The open run, with its own actions. */
function RunCard({ session, onDone }: { session: PracticeSession; onDone: () => void }) {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const advance = useAdvanceSession();
  const [error, setError] = useState<string | null>(null);
  const scheduled = session.status === 'scheduled';
  const due = scheduled && Boolean(session.scheduledFor) && new Date(session.scheduledFor!).getTime() <= Date.now();
  const current = currentRunTask(session);
  const finished = !scheduled && current === null;
  const done = Math.min(session.position, session.queue.length);

  const begin = () => {
    setError(null);
    advance.mutate({ sessionId: session.sessionId, status: 'active' }, {
      onSuccess: (data) => { const first = data.session ? currentRunTask(data.session) : null; if (first) navigate(taskHref(first)); },
      onError: () => setError(t('coding.run.failed')),
    });
  };
  const end = () => {
    setError(null);
    advance.mutate({ sessionId: session.sessionId, status: scheduled ? 'abandoned' : finished ? 'finished' : 'abandoned' }, {
      onSuccess: onDone,
      onError: () => setError(t('coding.run.failed')),
    });
  };

  return (
    <div className="cd-run__card" role="group" aria-labelledby="cd-run-card-title">
      <Kicker as="h3" id="cd-run-card-title">{t(scheduled ? 'coding.run.planned' : 'coding.run.active')}</Kicker>
      <p className="cd-run__summary">{runSummary(session, t)}</p>
      {scheduled && session.scheduledFor && (
        <p className="cd-run__when" role="status">
          {t('coding.run.plannedFor', { when: formatWhen(session.scheduledFor, lang) })}
          {due && <> {t('coding.run.due')}</>}
        </p>
      )}
      {!scheduled && (
        <p className="cd-run__when" role="status">
          {finished ? t('coding.run.finished') : t('coding.run.progress', { done, total: session.queue.length, minutes: session.estimatedMinutes })}
        </p>
      )}
      <div className="cd-actions">
        {scheduled && <SwimCta size="sm" label={t('coding.run.startNow')} disabled={advance.isPending} onClick={begin} />}
        {!scheduled && current && <Link className="cd-btn cd-btn--primary" to={taskHref(current)}>{t('coding.run.continue')}</Link>}
        {scheduled && (
          <a className="cd-btn cd-btn--quiet" href={calendarHref(session, t('coding.run.calendarTitle'))} download="devshark-challenge-run.ics">
            {t('coding.run.calendar')}
          </a>
        )}
        <FinButton type="button" className="cd-btn cd-btn--quiet" disabled={advance.isPending} onClick={end}>
          {t(finished ? 'coding.run.close' : scheduled ? 'coding.run.cancel' : 'coding.run.end')}
        </FinButton>
      </div>
      {error && <p className="cd-note cd-note--error" role="alert">{error}</p>}
    </div>
  );
}

export function ChallengeRunPlanner({ signedIn }: { signedIn: boolean }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const session = usePracticeSession(signedIn);
  const start = useStartSession();
  const [track, setTrack] = useState<CodingTrack | null>(null);
  const [count, setCount] = useState<number>(PRACTICE_RUN_COUNTS[0]);
  const [order, setOrder] = useState<PracticeOrder>('sequential');
  const [later, setLater] = useState(false);
  const [at, setAt] = useState<string>(nowLocal);
  const [error, setError] = useState<string | null>(null);
  const minLocal = useMemo(nowLocal, []);
  const open = session.data?.session ?? null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const scheduledFor = later ? localToIso(at) : null;
    if (later && !scheduledFor) { setError(t('coding.run.badTime')); return; }
    start.mutate({ count, order, ...(track ? { topic: track } : {}), ...(scheduledFor ? { scheduledFor } : {}) }, {
      onSuccess: (data) => {
        const run = data.session;
        if (!run) return;
        if (run.status === 'active') { const first = currentRunTask(run); if (first) navigate(taskHref(first)); }
      },
      onError: (failure) => {
        const code = failure instanceof ApiError ? failure.code : '';
        setError(t(code === 'nothing_eligible' ? 'coding.run.nothing' : code === 'migration_required' ? 'coding.run.unavailable' : 'coding.run.failed'));
      },
    });
  };

  return (
    <section className="cd-run cd-pane" aria-labelledby="cd-run-title">
      <div className="cd-run__head">
        <Kicker as="h2" id="cd-run-title">{t('coding.run.title')}</Kicker>
        <p className="cd-lead">{t('coding.run.lead')}</p>
      </div>
      {!signedIn && <p className="cd-note">{t('coding.run.signIn')}</p>}
      {signedIn && session.isError && (
        <p className="cd-note cd-note--error" role="alert">
          {t('coding.collections.failed')} <button type="button" className="cd-btn" onClick={() => void session.refetch()}>{t('coding.retry')}</button>
        </p>
      )}
      {signedIn && open && <RunCard session={open} onDone={() => void session.refetch()} />}
      {signedIn && !open && !session.isError && (
        <form className="cd-run__form" onSubmit={submit} aria-busy={start.isPending}>
          <div className="cd-run__field">
            <span className="cd-run__label" id="cd-run-track">{t('coding.run.track')}</span>
            <div className="cd-chips" role="group" aria-labelledby="cd-run-track">
              <button type="button" className="cd-chip" aria-pressed={track === null} onClick={() => setTrack(null)}>{t('coding.run.anyTrack')}</button>
              {CODING_SECTION_TRACKS.map((one) => (
                <button key={one} type="button" className="cd-chip" aria-pressed={track === one} onClick={() => setTrack(one)}>{t(`coding.track.${one}` as TranslationKey)}</button>
              ))}
            </div>
          </div>
          <div className="cd-run__field">
            <span className="cd-run__label" id="cd-run-count">{t('coding.run.count')}</span>
            <div className="cd-chips" role="group" aria-labelledby="cd-run-count">
              {PRACTICE_RUN_COUNTS.map((n) => (
                <button key={n} type="button" className="cd-chip" aria-pressed={count === n} onClick={() => setCount(n)}>{t('coding.run.countOption', { n })}</button>
              ))}
            </div>
          </div>
          <fieldset className="cd-run__options">
            <legend>{t('coding.run.order')}</legend>
            {(['sequential', 'random'] as const).map((one) => (
              <label key={one} className="cd-run__option">
                <input type="radio" name="cd-run-order" value={one} checked={order === one} onChange={() => setOrder(one)} />
                <span><strong>{t(`coding.run.${one}`)}</strong><br /><small>{t(`coding.run.${one}Note`)}</small></span>
              </label>
            ))}
          </fieldset>
          <fieldset className="cd-run__options">
            <legend>{t('coding.run.when')}</legend>
            <label className="cd-run__option">
              <input type="radio" name="cd-run-when" value="now" checked={!later} onChange={() => setLater(false)} />
              <span><strong>{t('coding.run.now')}</strong></span>
            </label>
            <label className="cd-run__option">
              <input type="radio" name="cd-run-when" value="later" checked={later} onChange={() => setLater(true)} />
              <span><strong>{t('coding.run.later')}</strong><br /><small>{t('coding.run.laterNote')}</small></span>
            </label>
            {later && (
              <div className="cd-run__time">
                <label htmlFor="cd-run-at">{t('coding.run.at')}</label>
                <input id="cd-run-at" type="datetime-local" value={at} min={minLocal} required onChange={(event) => setAt(event.target.value)} />
              </div>
            )}
          </fieldset>
          <div className="cd-actions">
            <SwimCta size="sm" label={start.isPending ? t('coding.submitting') : t(later ? 'coding.run.plan' : 'coding.run.start')} disabled={start.isPending} onClick={() => { /* submitted by the form */ }} />
          </div>
          {error && <p className="cd-note cd-note--error" role="alert">{error}</p>}
        </form>
      )}
    </section>
  );
}
