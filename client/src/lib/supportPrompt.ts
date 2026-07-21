export const SUPPORT_PROMPT_KEY = 'studyshark:support-prompt';
export const SUPPORT_PROMPT_MIN_COMPLETIONS = 10;
export const SUPPORT_PROMPT_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;
export const SUPPORT_PROMPT_DISMISS_MS = 90 * 24 * 60 * 60 * 1000;

export interface SupportPromptPreference {
  completions?: number;
  lastShownAt?: number;
  dismissedUntil?: number;
  never?: boolean;
}

/**
 * Record a completed quiz and decide whether this positive result is an
 * unobtrusive support milestone. The caller persists `state` with the app's
 * existing storage helper; no account or payment entitlement is involved.
 */
export function recordSupportMilestone(
  previous: SupportPromptPreference,
  percentage: number,
  enabled: boolean,
  now = Date.now(),
): { state: SupportPromptPreference; show: boolean } {
  const completions = Math.min(1_000_000, Math.max(0, Math.floor(previous.completions ?? 0)) + 1);
  const base = { ...previous, completions };
  const isPositive = Number.isFinite(percentage) && percentage >= 70;
  const isMilestone = completions >= SUPPORT_PROMPT_MIN_COMPLETIONS && completions % 10 === 0;
  const cooledDown = now - (previous.lastShownAt ?? 0) >= SUPPORT_PROMPT_INTERVAL_MS;
  const dismissalExpired = now >= (previous.dismissedUntil ?? 0);
  const show = enabled && !previous.never && isPositive && isMilestone && cooledDown && dismissalExpired;
  return { state: show ? { ...base, lastShownAt: now } : base, show };
}

export const dismissSupportPrompt = (
  previous: SupportPromptPreference,
  now = Date.now(),
): SupportPromptPreference => ({
  ...previous,
  dismissedUntil: now + SUPPORT_PROMPT_DISMISS_MS,
});

export const disableSupportPrompt = (
  previous: SupportPromptPreference,
): SupportPromptPreference => ({ ...previous, never: true });
