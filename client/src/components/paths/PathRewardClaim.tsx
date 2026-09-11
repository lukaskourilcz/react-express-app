/**
 * The package a finished learning path earns: a t-shirt, a mug and a sticker
 * set, claimed once.
 *
 * It renders nothing at all until the server says the path is finished, so a
 * learner mid-path is never shown a prize they cannot take. Eligibility is the
 * server's own reading of the graded progress rows — this component asks and
 * believes the answer; it never works it out from anything local.
 *
 * The address is collected here because an order cannot exist without one. What
 * a claim produces is an order waiting to be fulfilled rather than a parcel on
 * its way: merchandise is unconfigured, and the copy says so instead of
 * promising a delivery nobody can make yet.
 */

import { useCallback, useEffect, useId, useState } from 'react';
import { useT } from '../../i18n/LanguageContext';
import { apiFetch, friendlyError } from '../../lib/api';

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;

interface RewardState {
  eligible: boolean;
  claimed: boolean;
  orderId: string | null;
}

export function PathRewardClaim({ pathId }: { pathId: string }) {
  const t = useT();
  const formId = useId();
  const [state, setState] = useState<RewardState | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    shirt: 'M', name: '', line1: '', line2: '', city: '', postal: '', country: '',
  });

  const load = useCallback(async () => {
    try {
      setState(await apiFetch<RewardState>(`/api/user/learning-path-reward?pathId=${encodeURIComponent(pathId)}`));
    } catch {
      // Not finished, not signed in, or the migration is not applied. All three
      // mean the same thing here: show nothing.
      setState(null);
    }
  }, [pathId]);

  useEffect(() => { void load(); }, [load]);

  if (!state || (!state.eligible && !state.claimed)) return null;

  if (state.claimed) {
    return (
      <p className="lp-notice lp-notice--info" role="status">
        <span className="lp-notice__glyph" aria-hidden="true">✓</span>
        <span>{t('paths.rewardClaimed')}</span>
      </p>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/user/learning-path-reward`, {
        method: 'POST',
        body: JSON.stringify({ pathId, ...form }),
      });
      setOpen(false);
      await load();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof typeof form, labelKey: string, max: number, required = true) => (
    <label className="lp-field">
      <span>{t(labelKey as never)}</span>
      <input
        className="lp-input"
        value={form[key]}
        maxLength={max}
        required={required}
        autoComplete={key === 'name' ? 'name' : key === 'postal' ? 'postal-code' : 'off'}
        onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
      />
    </label>
  );

  return (
    <div className="lp-reward">
      <p className="lp-reward__lead">
        <strong>{t('paths.rewardTitle')}</strong>
        <span>{t('paths.rewardBlurb')}</span>
      </p>
      {!open ? (
        <button type="button" className="lp-btn lp-btn--primary" onClick={() => setOpen(true)}>
          {t('paths.rewardClaim')}
        </button>
      ) : (
        <form
          className="lp-reward__form"
          aria-labelledby={`${formId}-title`}
          onSubmit={(event) => { event.preventDefault(); void submit(); }}
        >
          <p id={`${formId}-title`} className="lp-reward__note">{t('paths.rewardAddressNote')}</p>
          <label className="lp-field">
            <span>{t('paths.rewardSize')}</span>
            <select
              className="lp-input"
              value={form.shirt}
              onChange={(event) => setForm((prev) => ({ ...prev, shirt: event.target.value }))}
            >
              {SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          {field('name', 'paths.rewardName', 120)}
          {field('line1', 'paths.rewardLine1', 160)}
          {field('line2', 'paths.rewardLine2', 160, false)}
          {field('city', 'paths.rewardCity', 80)}
          {field('postal', 'paths.rewardPostal', 24)}
          <label className="lp-field">
            <span>{t('paths.rewardCountry')}</span>
            <input
              className="lp-input"
              value={form.country}
              maxLength={2}
              required
              autoComplete="country"
              placeholder="CZ"
              onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value.toUpperCase() }))}
            />
          </label>
          <div className="lp-reward__actions">
            <button type="submit" className="lp-btn lp-btn--primary" disabled={busy}>
              {busy ? t('paths.rewardSending') : t('paths.rewardSend')}
            </button>
            <button type="button" className="lp-btn" disabled={busy} onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </button>
          </div>
          {error && <p className="lp-notice lp-notice--error" role="alert">{error}</p>}
        </form>
      )}
    </div>
  );
}

export default PathRewardClaim;
