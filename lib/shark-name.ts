import { randomInt } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from './http';
import { generateSharkname, isAllowedSharkBase } from '../shared/sharkname';

export interface AllocatedSharkName { handle: string; ordinal: string; base: string | null }

/** The identity key, suffix and global uniqueness belong to the database. */
export async function allocateSharkName(db: SupabaseClient, input: { userId?: string; runId?: string; base?: string; replace?: boolean }): Promise<AllocatedSharkName> {
  if ((!input.userId && !input.runId) || (input.userId && input.runId)) throw new Error('invalid_shark_identity');
  if (input.base !== undefined && !isAllowedSharkBase(input.base)) throw new Error('invalid_handle');
  for (let attempt = 0; attempt < 12; attempt++) {
    const base = input.base ?? generateSharkname(() => randomInt(1_000_000) / 1_000_000);
    const { data, error } = await withTimeout(db.rpc('allocate_shark_name', {
      p_identity_key: input.userId ? `user:${input.userId}` : `guest:${input.runId}`,
      p_user_id: input.userId ?? null, p_base: base, p_replace: input.replace === true,
    }));
    if (error) {
      if (input.base === undefined && /handle_taken/.test(error.message)) continue;
      throw new Error(error.message);
    }
    const row = data as Partial<AllocatedSharkName> | null;
    if (!row || typeof row.handle !== 'string' || typeof row.ordinal !== 'string' || !/^[1-9]\d*$/.test(row.ordinal)) throw new Error('invalid_shark_allocation');
    return { handle: row.handle, ordinal: row.ordinal, base: typeof row.base === 'string' ? row.base : null };
  }
  throw new Error('handle_taken');
}
