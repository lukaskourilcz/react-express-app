/**
 * Cloudflare Turnstile token validation helper.
 * Verifies Turnstile tokens against Cloudflare Siteverify API for signup and submissions (#202).
 */
import { createLogger } from './http';

const log = createLogger('turnstile');

export interface TurnstileVerificationResult {
  success: boolean;
  challengeTs?: string;
  hostname?: string;
  errorCodes?: string[];
  skipped?: boolean;
}

export async function verifyTurnstileToken(
  token: string | undefined | null,
  clientIp?: string
): Promise<TurnstileVerificationResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // In development or test environments without a configured secret, allow graceful bypass
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      log.info('TURNSTILE_SECRET_KEY not configured; bypassing verification in non-production');
      return { success: true, skipped: true };
    }
    log.error('TURNSTILE_SECRET_KEY missing in production environment');
    return { success: false, errorCodes: ['missing-secret-key'] };
  }

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return { success: false, errorCodes: ['missing-input-response'] };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', token.trim());
    if (clientIp) {
      formData.append('remoteip', clientIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      log.warn({ status: response.status }, 'Turnstile verification endpoint returned non-OK status');
      return { success: false, errorCodes: [`http-${response.status}`] };
    }

    const data = (await response.json()) as {
      success: boolean;
      'challenge_ts'?: string;
      hostname?: string;
      'error-codes'?: string[];
    };

    return {
      success: !!data.success,
      challengeTs: data['challenge_ts'],
      hostname: data.hostname,
      errorCodes: data['error-codes'],
    };
  } catch (err) {
    log.error({ err }, 'Network error during Turnstile token verification');
    return { success: false, errorCodes: ['internal-verification-error'] };
  }
}
