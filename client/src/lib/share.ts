// Sharing from a moment of success (#239): the invite link after a first
// passed Learn level or a Challenge run, a result card from the Challenge and
// the typing racer, and the question of the day.
//
// One place decides how a share leaves the browser: the Web Share API where
// the platform has one (with the card attached when it accepts files), the
// clipboard otherwise. Every share fires `share_initiated` with a fixed kind
// and method and nothing else (docs/growth-metrics.md): no link, no code, no
// score, no name.
import { capture } from './analytics';

export type ShareKind = 'referral' | 'challenge_result' | 'typing_result' | 'daily_question';
export type ShareSource = 'learn_level' | 'challenge' | 'typing' | 'daily';
export type ShareMethod = 'share' | 'copy' | 'download';

/** The one analytics event, with an allow-listed payload. */
export function captureShare(kind: ShareKind, source: ShareSource, method: ShareMethod): void {
  capture('share_initiated', { kind, source, method });
}

export const canWebShare = (): boolean => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

/** What happened to a share: `cancelled` when the learner closed the sheet. */
export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * Open the platform's share sheet with a link (and a file when the platform
 * can take it), or copy the text and link when there is no share sheet.
 */
export async function shareLink(data: { title: string; text: string; url: string; file?: File | null }): Promise<ShareOutcome> {
  const base = { title: data.title, text: data.text, url: data.url };
  if (canWebShare()) {
    const withFile = data.file ? { ...base, files: [data.file] } : null;
    try {
      await navigator.share(withFile && navigator.canShare?.(withFile) ? withFile : base);
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
      // A refused share (no user activation left, a blocked file) still has
      // the clipboard to fall back to.
    }
  }
  return (await copyText(`${data.text} ${data.url}`)) ? 'copied' : 'failed';
}
