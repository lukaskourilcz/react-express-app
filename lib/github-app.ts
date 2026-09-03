/** GitHub App client for the garden. Placeholder until the garden issue
 * lands: reports "not connected" for everyone and never calls GitHub. */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CodingGardenStatus } from '../shared/coding-api';
import type { GardenPassInput } from './github-garden';

export function isGithubAppConfigured(): boolean {
  return Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_SLUG && process.env.GITHUB_APP_PRIVATE_KEY);
}

export async function commitPassedTask(_supabase: SupabaseClient, _input: GardenPassInput): Promise<CodingGardenStatus | null> {
  return isGithubAppConfigured() ? { status: 'not_connected' } : null;
}
