/** GitHub garden pipeline entry point used by the coding handlers. The full
 * implementation (installation tokens, Contents API, retries) lives in
 * lib/github-app.ts; this module keeps the handler dependency small. */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CodingTask } from '../shared/coding-catalog';
import type { CodingGardenStatus } from '../shared/coding-api';
import { commitPassedTask } from './github-app';

export interface GardenPassInput {
  userId: string;
  task: CodingTask;
  code: string;
  passedCount: number;
  totalCount: number;
  locale: 'en' | 'cs';
  firstPass: boolean;
  codeChanged: boolean;
}

/** Best effort: a GitHub problem never fails the submit that triggered it. */
export async function afterCodingPass(supabase: SupabaseClient, input: GardenPassInput): Promise<CodingGardenStatus | null> {
  try {
    return await commitPassedTask(supabase, input);
  } catch {
    return { status: 'failed' };
  }
}
