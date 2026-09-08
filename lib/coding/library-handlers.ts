/** The learner's saved challenges and named collections (issue #157).
 *
 * Mounted on the existing `api/user/[op].ts` dispatcher, so the twelve-function
 * budget is unchanged:
 *   GET  ?op=coding-library  → bookmarks, collections and the limits
 *   POST ?op=coding-library  → one action from CodingLibraryAction
 *
 * Every row is owner-scoped by the verified token subject; nothing here reads a
 * user id from the body. A saved task is a reading list entry: it never opens a
 * task the progression policy has not opened.
 */

import type { VercelRequest, VercelResponse } from '../vercel-types.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { createLogger, jsonError, requireAuthSub, withTimeout } from '../http';
import { enforceRateLimit, RATE_LIMITS } from '../rate-limit';
import { deploymentSubjectIds } from '../product-scope';
import { codingTaskById } from './catalog';
import { isCodingTaskId } from '../../shared/coding-catalog';
import {
  MAX_BOOKMARKS,
  MAX_COLLECTIONS,
  MAX_COLLECTION_ITEMS,
  MAX_COLLECTION_NAME,
  isCollectionId,
  normalizeCollectionName,
  type CodingCollection,
  type CodingLibraryResponse,
} from '../../shared/coding-library';

const logEvent = createLogger('user/coding-library');

const LIMITS: CodingLibraryResponse['limits'] = {
  collections: MAX_COLLECTIONS,
  itemsPerCollection: MAX_COLLECTION_ITEMS,
  bookmarks: MAX_BOOKMARKS,
  nameLength: MAX_COLLECTION_NAME,
};

const available = () => deploymentSubjectIds().includes('webdev');

const tableMissing = (error: { message?: string; code?: string } | null | undefined): boolean =>
  !!error && (error.code === '42P01' || /relation .* does not exist/i.test(error.message ?? ''));

const migrationError = (res: VercelResponse) =>
  jsonError(res, 503, 'migration_required', 'Coding library migration 027 is not installed');

interface CollectionRow { collection_id: string; name: string; position: number; updated_at: string }
interface ItemRow { collection_id: string; task_id: string; position: number }

async function loadLibrary(supabase: SupabaseClient, userId: string): Promise<CodingLibraryResponse | 'missing'> {
  const [bookmarks, collections, items] = await Promise.all([
    withTimeout(supabase.from('coding_bookmarks').select('task_id,created_at').eq('user_id', userId).order('created_at', { ascending: false })),
    withTimeout(supabase.from('coding_collections').select('collection_id,name,position,updated_at').eq('user_id', userId).order('position', { ascending: true })),
    withTimeout(supabase.from('coding_collection_items').select('collection_id,task_id,position').eq('user_id', userId).order('position', { ascending: true })),
  ]);
  for (const result of [bookmarks, collections, items]) {
    if (result.error) {
      if (tableMissing(result.error)) return 'missing';
      throw new Error('db_error');
    }
  }
  const byCollection = new Map<string, string[]>();
  for (const row of (items.data ?? []) as ItemRow[]) {
    const list = byCollection.get(row.collection_id) ?? [];
    list.push(row.task_id);
    byCollection.set(row.collection_id, list);
  }
  return {
    bookmarks: ((bookmarks.data ?? []) as { task_id: string }[]).map((row) => row.task_id),
    collections: ((collections.data ?? []) as CollectionRow[]).map((row): CodingCollection => ({
      id: row.collection_id,
      name: row.name,
      position: row.position,
      taskIds: byCollection.get(row.collection_id) ?? [],
      updatedAt: row.updated_at,
    })),
    limits: LIMITS,
  };
}

/** A task id that names a real task. A retired id is refused rather than saved. */
const knownTask = (value: unknown): value is string => isCodingTaskId(value) && Boolean(codingTaskById(value));

export async function handleCodingLibrary(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
  if (!available()) return jsonError(res, 404, 'not_available', 'Coding challenges are not part of this product');
  const userId = await requireAuthSub(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    try {
      const library = await loadLibrary(supabase, userId);
      if (library === 'missing') return migrationError(res);
      res.setHeader('Cache-Control', 'private, no-store');
      return res.json(library);
    } catch {
      return jsonError(res, 500, 'db_error', 'Could not load your saved challenges');
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.userMutation))) return;

  const body = (req.body || {}) as Record<string, unknown>;
  const action = typeof body.action === 'string' ? body.action : '';
  const now = new Date().toISOString();

  try {
    switch (action) {
      case 'bookmark': {
        if (!knownTask(body.taskId)) return jsonError(res, 400, 'bad_request', 'A known task id is required');
        const count = await withTimeout(supabase.from('coding_bookmarks').select('task_id', { count: 'exact', head: true }).eq('user_id', userId));
        if (count.error) { if (tableMissing(count.error)) return migrationError(res); throw new Error('db_error'); }
        if ((count.count ?? 0) >= MAX_BOOKMARKS) return jsonError(res, 409, 'limit_reached', 'You have saved as many challenges as we keep');
        const saved = await withTimeout(supabase.from('coding_bookmarks').upsert({ user_id: userId, task_id: body.taskId }, { onConflict: 'user_id,task_id' }));
        if (saved.error) { if (tableMissing(saved.error)) return migrationError(res); throw new Error('db_error'); }
        break;
      }
      case 'unbookmark': {
        if (!isCodingTaskId(body.taskId)) return jsonError(res, 400, 'bad_request', 'A task id is required');
        const removed = await withTimeout(supabase.from('coding_bookmarks').delete().eq('user_id', userId).eq('task_id', body.taskId));
        if (removed.error) { if (tableMissing(removed.error)) return migrationError(res); throw new Error('db_error'); }
        break;
      }
      case 'create-collection': {
        const name = normalizeCollectionName(body.name);
        if (!name) return jsonError(res, 400, 'invalid_name', `A name of 1 to ${MAX_COLLECTION_NAME} characters is required`);
        const existing = await withTimeout(supabase.from('coding_collections').select('collection_id,name,position').eq('user_id', userId));
        if (existing.error) { if (tableMissing(existing.error)) return migrationError(res); throw new Error('db_error'); }
        const rows = (existing.data ?? []) as CollectionRow[];
        if (rows.length >= MAX_COLLECTIONS) return jsonError(res, 409, 'limit_reached', 'You already have the maximum number of collections');
        if (rows.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
          return jsonError(res, 409, 'duplicate_name', 'A collection with that name already exists');
        }
        const position = rows.reduce((max, row) => Math.max(max, row.position), -1) + 1;
        const created = await withTimeout(supabase.from('coding_collections').insert({
          collection_id: randomBytes(9).toString('base64url'),
          user_id: userId,
          name,
          position,
          updated_at: now,
        }));
        if (created.error) { if (tableMissing(created.error)) return migrationError(res); throw new Error('db_error'); }
        break;
      }
      case 'rename-collection': {
        if (!isCollectionId(body.id)) return jsonError(res, 400, 'bad_request', 'A collection id is required');
        const name = normalizeCollectionName(body.name);
        if (!name) return jsonError(res, 400, 'invalid_name', `A name of 1 to ${MAX_COLLECTION_NAME} characters is required`);
        const renamed = await withTimeout(
          supabase.from('coding_collections').update({ name, updated_at: now }).eq('user_id', userId).eq('collection_id', body.id).select('collection_id'),
        );
        if (renamed.error) { if (tableMissing(renamed.error)) return migrationError(res); throw new Error('db_error'); }
        if ((renamed.data ?? []).length === 0) return jsonError(res, 404, 'not_found', 'No such collection');
        break;
      }
      case 'delete-collection': {
        if (!isCollectionId(body.id)) return jsonError(res, 400, 'bad_request', 'A collection id is required');
        const deleted = await withTimeout(
          supabase.from('coding_collections').delete().eq('user_id', userId).eq('collection_id', body.id).select('collection_id'),
        );
        if (deleted.error) { if (tableMissing(deleted.error)) return migrationError(res); throw new Error('db_error'); }
        if ((deleted.data ?? []).length === 0) return jsonError(res, 404, 'not_found', 'No such collection');
        break;
      }
      case 'reorder-collections': {
        const ids = Array.isArray(body.ids) ? body.ids : null;
        if (!ids || ids.length === 0 || ids.length > MAX_COLLECTIONS || !ids.every(isCollectionId)) {
          return jsonError(res, 400, 'bad_request', 'A list of collection ids is required');
        }
        if (new Set(ids as string[]).size !== ids.length) return jsonError(res, 400, 'bad_request', 'The order repeats a collection');
        for (const [position, id] of (ids as string[]).entries()) {
          const moved = await withTimeout(
            supabase.from('coding_collections').update({ position, updated_at: now }).eq('user_id', userId).eq('collection_id', id),
          );
          if (moved.error) { if (tableMissing(moved.error)) return migrationError(res); throw new Error('db_error'); }
        }
        break;
      }
      case 'add-to-collection': {
        if (!isCollectionId(body.id) || !knownTask(body.taskId)) return jsonError(res, 400, 'bad_request', 'A collection id and a known task id are required');
        const owned = await withTimeout(supabase.from('coding_collections').select('collection_id').eq('user_id', userId).eq('collection_id', body.id).maybeSingle());
        if (owned.error) { if (tableMissing(owned.error)) return migrationError(res); throw new Error('db_error'); }
        if (!owned.data) return jsonError(res, 404, 'not_found', 'No such collection');
        const count = await withTimeout(
          supabase.from('coding_collection_items').select('task_id', { count: 'exact', head: true }).eq('user_id', userId).eq('collection_id', body.id),
        );
        if (count.error) throw new Error('db_error');
        if ((count.count ?? 0) >= MAX_COLLECTION_ITEMS) return jsonError(res, 409, 'limit_reached', 'That collection is full');
        const added = await withTimeout(supabase.from('coding_collection_items').upsert({
          collection_id: body.id,
          user_id: userId,
          task_id: body.taskId,
          position: count.count ?? 0,
        }, { onConflict: 'collection_id,task_id' }));
        if (added.error) throw new Error('db_error');
        break;
      }
      case 'remove-from-collection': {
        if (!isCollectionId(body.id) || !isCodingTaskId(body.taskId)) return jsonError(res, 400, 'bad_request', 'A collection id and a task id are required');
        const removed = await withTimeout(
          supabase.from('coding_collection_items').delete().eq('user_id', userId).eq('collection_id', body.id).eq('task_id', body.taskId),
        );
        if (removed.error) { if (tableMissing(removed.error)) return migrationError(res); throw new Error('db_error'); }
        break;
      }
      default:
        return jsonError(res, 400, 'bad_request', `Unknown library action: ${action}`);
    }
  } catch {
    return jsonError(res, 500, 'db_error', 'Could not update your saved challenges');
  }

  try {
    const library = await loadLibrary(supabase, userId);
    if (library === 'missing') return migrationError(res);
    logEvent({ status: 200, action });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json(library);
  } catch {
    return jsonError(res, 500, 'db_error', 'Saved, but the library could not be reloaded');
  }
}
