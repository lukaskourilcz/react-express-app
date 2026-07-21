import type { VercelRequest, VercelResponse } from '../../lib/vercel-types.js';
import { secureShuffle, localizeQuestion, normalizeLang } from '../../lib/quiz-data';
import {
  supabase,
  jsonError,
  isShortString,
  logEvent,
  generateMatchCode,
  withTimeout,
} from '../../lib/play-helpers';
import { requireAuthSub, isRpcMissing } from '../../lib/http';
import { tryAuth } from '../../lib/auth';
import { getEffectiveQuestions } from '../../lib/questions-store';
import { getGameSettings } from '../../lib/settings-store';
import { enforceRateLimit, RATE_LIMITS, type RateLimitConfig } from '../../lib/rate-limit';
import { validateCategoryScope } from '../../lib/product-scope';

const PING_GRACE_MS = 1000;
const STALE_MATCH_MS = 5 * 60 * 1000;
// Extra slack past the per-question time limit before the server force-advances
// a multiplayer question, so a client's on-the-buzzer submit still lands.
const QUESTION_EXPIRE_GRACE_MS = 2000;

// Columns re-selected after a lazy server-side advance in state(); must match
// the state() select list so the refreshed row can replace the original.
const STATE_COLUMNS =
  'id, code, mode, host_id, host_name, status, current_index, questions, ended_at, question_started_at, question_duration_s, last_heartbeat_at, started_at';

interface MatchQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  category: string;
  difficulty: number;
}

function computeSpeedBonus(elapsedMs: number, durationS: number, maxBonus: number): number {
  // With no time limit there is no speed component — score the answer flat.
  if (durationS <= 0) return 0;
  if (elapsedMs <= 0) return maxBonus;
  const fraction = Math.max(0, 1 - elapsedMs / (durationS * 1000));
  return Math.round(fraction * maxBonus);
}

// In multiplayer everyone competes (the host included), so only classroom
// hosts get the answer key while a match is running. Everyone sees it once
// the match is finished.
function canSeeAnswers(match: { mode: string; host_id: string; status: string }, sub: string | null): boolean {
  if (match.status === 'finished') return true;
  return match.mode === 'classroom' && sub !== null && sub === match.host_id;
}

// Strip the answer key — and the explanation, which usually spells the answer
// out — from a match's question list for viewers who may not see them yet.
// Shared by join() and state() so the two endpoints can't drift apart.
function sanitizeQuestions(
  match: { mode: string; host_id: string; status: string; questions: unknown },
  sub: string | null,
): Array<Record<string, unknown>> {
  const questions = match.questions as Array<Record<string, unknown>>;
  if (canSeeAnswers(match, sub)) return questions;
  return questions.map((q) => {
    const { correct_index: _ci, explanation: _e, ...rest } = q;
    return rest;
  });
}

// Move a running match to its next question — or finish it after the last
// one. The conditional update (status + current_index must still match what
// we read) makes concurrent calls advance at most once.
async function tryAdvance(match: {
  id: string;
  status: string;
  current_index: number | null;
  questions: unknown;
}): Promise<Record<string, unknown> | null> {
  const total = Array.isArray(match.questions) ? match.questions.length : 0;
  const nextIdx = (match.current_index ?? 0) + 1;
  const now = new Date().toISOString();
  const patch: Record<string, unknown> =
    nextIdx >= total
      ? { status: 'finished', ended_at: now, last_heartbeat_at: now }
      : { current_index: nextIdx, question_started_at: now, last_heartbeat_at: now };

  const { data } = await withTimeout(
    supabase!
      .from('matches')
      .update(patch)
      .eq('id', match.id)
      .eq('status', 'running')
      .eq('current_index', match.current_index ?? 0)
      .select(STATE_COLUMNS),
  );
  return data && data.length > 0 ? (data[0] as Record<string, unknown>) : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Match backend is not configured');

  const action = String(req.query.action || '').toLowerCase();
  if (req.method !== 'GET') {
    const policy: RateLimitConfig = action === 'create'
      ? RATE_LIMITS.playCreate
      : action === 'join'
        ? RATE_LIMITS.playJoin
        : RATE_LIMITS.playMutation;
    if (!(await enforceRateLimit(req, res, policy))) return;
  }

  switch (action) {
    case 'create':
      return create(req, res);
    case 'join':
      return join(req, res);
    case 'state':
      return state(req, res);
    case 'control':
      return control(req, res);
    case 'answer':
      return answer(req, res);
    case 'distribution':
      return distribution(req, res);
    case 'heartbeat':
      return heartbeat(req, res);
    default:
      return jsonError(res, 404, 'unknown_action', `Unknown play action: ${action}`);
  }
}

async function create(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const hostSub = await requireAuthSub(req, res);
  if (!hostSub) return;

  const body = (req.body || {}) as {
    host_name?: unknown;
    mode?: unknown;
    count?: unknown;
    categories?: unknown;
    duration_s?: unknown;
    lang?: unknown;
  };

  const { play: playSettings } = await getGameSettings();
  const hostName = isShortString(body.host_name, 80) ? body.host_name : 'Host';
  const mode = body.mode === 'classroom' ? 'classroom' : 'multiplayer';
  const requestedCount = typeof body.count === 'number' ? body.count : 10;
  const count = Math.min(
    Math.max(Math.floor(requestedCount), playSettings.minQuestions),
    playSettings.maxQuestions,
  );
  // Per-question time limit chosen by the host. Falls back to the default when
  // omitted or not one of the allowed values; 0 means "no limit".
  const durationS =
    typeof body.duration_s === 'number' && playSettings.durationOptionsS.includes(body.duration_s)
      ? body.duration_s
      : playSettings.defaultDurationS;
  let categories = Array.isArray(body.categories)
    ? body.categories.filter((c): c is string => typeof c === 'string')
    : [];
  // Match questions are snapshotted into the row in the host's language so
  // every player sees the same text regardless of their own setting.
  const lang = normalizeLang(body.lang);

  // The client always sends the active subject's category list (or a subset
  // of it), so an empty list is a malformed request — falling back to the
  // whole bank would leak questions from other subjects into the match. The
  // message targets the one real sender: a pre-deploy tab with a stale bundle.
  if (categories.length === 0) {
    return jsonError(res, 400, 'bad_request', 'No topics selected — refresh the page and try again');
  }
  const scope = validateCategoryScope(categories);
  if (!scope.ok) {
    return jsonError(res, 400, 'invalid_subject_scope', 'Topics must belong to this deployment and one subject');
  }
  categories = scope.categories;

  const allQuestions = await getEffectiveQuestions();
  const pool = allQuestions.filter((q) => categories.includes(q.category));
  if (pool.length < playSettings.minQuestions) {
    return jsonError(res, 400, 'too_few_questions', 'Not enough questions for these filters');
  }

  const selected = secureShuffle(pool).slice(0, count);
  const matchQuestions = selected.map((base) => {
    const q = localizeQuestion(base, lang);
    const correctText = q.options[q.correctAnswer];
    const opts = secureShuffle(q.options);
    return {
      id: q.id,
      question: q.question,
      options: opts,
      correct_index: opts.indexOf(correctText),
      explanation: q.explanation,
      category: q.category,
      difficulty: q.difficulty,
    };
  });

  let code = generateMatchCode();
  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: clash } = await withTimeout(
        supabase!.from('matches').select('id').eq('code', code).maybeSingle(),
      );
      if (!clash) break;
      code = generateMatchCode();
    }

    const { data, error } = await withTimeout(
      supabase!
        .from('matches')
        .insert({
          code,
          mode,
          host_id: hostSub,
          host_name: hostName,
          status: 'lobby',
          questions: matchQuestions,
          current_index: 0,
          question_duration_s: durationS,
          last_heartbeat_at: new Date().toISOString(),
        })
        .select('id, code, mode, host_id, host_name, status')
        .single(),
    );

    if (error || !data) {
      logEvent('play/create', { status: 500, error: error?.message });
      return jsonError(res, 500, 'db_error', 'Could not create match');
    }

    const hostInsert = await withTimeout(
      supabase!
        .from('match_participants')
        .insert({ match_id: data.id, user_id: hostSub, display_name: hostName }),
    );
    if (hostInsert.error) {
      await withTimeout(supabase!.from('matches').delete().eq('id', data.id)).catch(() => undefined);
      logEvent('play/create', { status: 500, category: 'participant_insert', error: hostInsert.error.message });
      return jsonError(res, 500, 'db_error', 'Could not create match participant');
    }

    logEvent('play/create', { status: 200, code, mode, count });
    return res.json({
      id: data.id,
      code: data.code,
      mode: data.mode,
      host_id: data.host_id,
      host_name: data.host_name,
      status: data.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    logEvent('play/create', { status: 504, error: message });
    return jsonError(res, 504, 'upstream_timeout', 'Backend timed out');
  }
}

async function join(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const sub = await requireAuthSub(req, res);
  if (!sub) return;

  const body = (req.body || {}) as { code?: unknown; display_name?: unknown };
  if (!isShortString(body.code, 16)) return jsonError(res, 400, 'bad_request', 'code required');
  if (!isShortString(body.display_name, 60))
    return jsonError(res, 400, 'bad_request', 'display_name required');

  const code = body.code.toUpperCase();
  try {
    const { data: match, error } = await withTimeout(
      supabase!
        .from('matches')
        .select(
          'id, code, mode, host_id, host_name, status, current_index, questions, question_started_at, question_duration_s',
        )
        .eq('code', code)
        .maybeSingle(),
    );

    if (error) {
      logEvent('play/join', { status: 500, error: error.message });
      return jsonError(res, 500, 'db_error', 'Could not look up match');
    }
    if (!match) return jsonError(res, 404, 'not_found', 'No match with that code');
    if (match.status === 'finished') return jsonError(res, 410, 'finished', 'Match is over');

    const participantInsert = await withTimeout(
      supabase!.from('match_participants').upsert(
        { match_id: match.id, user_id: sub, display_name: body.display_name },
        { onConflict: 'match_id,user_id' },
      ),
    );
    if (participantInsert.error) {
      logEvent('play/join', { status: 500, category: 'participant_upsert', error: participantInsert.error.message });
      return jsonError(res, 500, 'db_error', 'Could not join match');
    }

    const sanitized = sanitizeQuestions(match, sub);

    logEvent('play/join', { status: 200, code });
    return res.json({
      id: match.id,
      code: match.code,
      mode: match.mode,
      status: match.status,
      host_id: match.host_id,
      host_name: match.host_name,
      current_index: match.current_index,
      question_started_at: match.question_started_at,
      question_duration_s: match.question_duration_s,
      questions: sanitized,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    logEvent('play/join', { status: 504, error: message });
    return jsonError(res, 504, 'upstream_timeout', 'Backend timed out');
  }
}

async function state(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  // state is polled frequently; auth is optional (anyone with the code can
  // see public state) but identity is required to unmask correct_index.
  const auth = await tryAuth(req);
  const sub = auth?.sub ?? null;
  const code = (req.query.code as string)?.toUpperCase();
  if (!code) return jsonError(res, 400, 'bad_request', 'code required');

  try {
    let { data: match, error: matchError } = await withTimeout(
      supabase!.from('matches').select(STATE_COLUMNS).eq('code', code).maybeSingle(),
    );

    if (matchError) {
      logEvent('play/state', { status: 503, category: 'match_read', error: matchError.message });
      return jsonError(res, 503, 'backend_unavailable', 'Match state is temporarily unavailable');
    }

    if (!match) return jsonError(res, 404, 'not_found', 'Match not found');

    // Lazy auto-finish ghost matches.
    if (match.status === 'running') {
      const ref = match.last_heartbeat_at ?? match.started_at;
      if (ref && Date.now() - new Date(ref).getTime() > STALE_MATCH_MS) {
        const { data: updated } = await withTimeout(
          supabase!
            .from('matches')
            .update({ status: 'finished', ended_at: new Date().toISOString() })
            .eq('id', match.id)
            .select(STATE_COLUMNS)
            .single(),
        );
        if (updated) match = updated;
      }
    }

    // Multiplayer matches advance themselves — nobody "runs" the questions.
    // Timed questions advance from answer() (all answered) with the expiry
    // check below as backstop; only no-limit matches need the per-poll
    // answered count (their only other trigger is answer() itself, and this
    // heals the rare race where two final answers miss each other).
    const durationS = match.question_duration_s ?? 0;
    const runningMultiplayer = match.status === 'running' && match.mode === 'multiplayer';
    const needAnsweredCount = runningMultiplayer && durationS <= 0;

    // Fetch participants + scoreboard (+ the answered count when needed)
    // concurrently instead of sequentially.
    const [participantsRes, scoreboardRes, answersCountRes] = await Promise.all([
      withTimeout(
        supabase!
          .from('match_participants')
          .select('user_id, display_name, joined_at')
          .eq('match_id', match.id)
          .order('joined_at', { ascending: true }),
      ),
      withTimeout(supabase!.rpc('match_scoreboard', { p_match_id: match.id })),
      needAnsweredCount
        ? withTimeout(
            supabase!
              .from('match_answers')
              .select('user_id', { count: 'exact', head: true })
              .eq('match_id', match.id)
              .eq('question_idx', match.current_index ?? 0),
          )
        : Promise.resolve(null),
    ]);
    if (participantsRes.error || scoreboardRes.error || answersCountRes?.error) {
      logEvent('play/state', {
        status: 503,
        category: 'state_dependencies',
        participants: participantsRes.error?.message,
        scoreboard: scoreboardRes.error?.message,
        answers: answersCountRes?.error?.message,
      });
      return jsonError(res, 503, 'backend_unavailable', 'Match state is temporarily unavailable');
    }

    if (runningMultiplayer) {
      const startedMs = match.question_started_at
        ? new Date(match.question_started_at).getTime()
        : null;
      const expired =
        durationS > 0 &&
        startedMs !== null &&
        Date.now() > startedMs + durationS * 1000 + QUESTION_EXPIRE_GRACE_MS;
      const participantCount = participantsRes.data?.length ?? 0;
      const allAnswered =
        participantCount > 0 && (answersCountRes?.count ?? 0) >= participantCount;

      if (expired || allAnswered) {
        const bumped = await tryAdvance(match);
        if (bumped) match = bumped as typeof match;
      }
    }

    return res.json({
      match: { ...match, questions: sanitizeQuestions(match, sub) },
      participants: participantsRes.data ?? [],
      scoreboard: scoreboardRes.data ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    logEvent('play/state', { status: 504, error: message });
    return jsonError(res, 504, 'upstream_timeout', 'Backend timed out');
  }
}

async function control(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const sub = await requireAuthSub(req, res);
  if (!sub) return;

  const body = (req.body || {}) as { code?: unknown; action?: unknown };
  if (!isShortString(body.code, 16)) return jsonError(res, 400, 'bad_request', 'code required');
  if (body.action !== 'start' && body.action !== 'advance' && body.action !== 'finish') {
    return jsonError(res, 400, 'bad_request', 'action must be start | advance | finish');
  }
  const ctrl = body.action as 'start' | 'advance' | 'finish';
  const code = body.code.toUpperCase();

  try {
    const { data: match, error: matchError } = await withTimeout(
      supabase!
        .from('matches')
        .select('id, host_id, status, current_index, questions')
        .eq('code', code)
        .maybeSingle(),
    );
    if (matchError) return jsonError(res, 503, 'backend_unavailable', 'Match state is temporarily unavailable');

    if (!match) return jsonError(res, 404, 'not_found', 'Match not found');
    if (match.host_id !== sub)
      return jsonError(res, 403, 'forbidden', 'Only the host can do this');

    const patch: Record<string, unknown> = {};
    const now = new Date().toISOString();

    if (ctrl === 'start') {
      if (match.status !== 'lobby')
        return jsonError(res, 409, 'bad_state', 'Match already started');
      patch.status = 'running';
      patch.current_index = 0;
      patch.started_at = now;
      patch.question_started_at = now;
      // question_duration_s is set at create time (incl. 0 = no limit), so we
      // intentionally leave it untouched here.
    } else if (ctrl === 'advance') {
      if (match.status !== 'running')
        return jsonError(res, 409, 'bad_state', 'Match is not running');
      // Same advance state machine as the auto-advance paths.
      const bumped = await tryAdvance(match);
      if (!bumped) {
        return jsonError(res, 409, 'stale_state', 'Match state changed; refresh and try again');
      }
      logEvent('play/control', { status: 200, code, action: ctrl });
      return res.json({ ok: true, status: bumped.status, current_index: bumped.current_index });
    } else {
      patch.status = 'finished';
      patch.ended_at = now;
    }
    patch.last_heartbeat_at = now;

    // Conditional update: only apply if the row is still in the state we read.
    // This prevents double-advance under concurrent host clicks/retries.
    const { data: updated, error } = await withTimeout(
      supabase!
        .from('matches')
        .update(patch)
        .eq('id', match.id)
        .eq('status', match.status)
        .eq('current_index', match.current_index ?? 0)
        .select('id'),
    );
    if (error) {
      logEvent('play/control', { status: 500, error: error.message, action: ctrl });
      return jsonError(res, 500, 'db_error', 'Could not update match');
    }
    if (!updated || updated.length === 0) {
      return jsonError(res, 409, 'stale_state', 'Match state changed; refresh and try again');
    }

    logEvent('play/control', { status: 200, code, action: ctrl });
    return res.json({ ok: true, ...patch });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    logEvent('play/control', { status: 504, error: message });
    return jsonError(res, 504, 'upstream_timeout', 'Backend timed out');
  }
}

async function answer(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const sub = await requireAuthSub(req, res);
  if (!sub) return;

  const body = (req.body || {}) as {
    code?: unknown;
    question_idx?: unknown;
    selected_idx?: unknown;
    duration_ms?: unknown;
    client_received_at?: unknown;
  };
  if (!isShortString(body.code, 16)) return jsonError(res, 400, 'bad_request', 'code required');
  if (typeof body.question_idx !== 'number' || !Number.isInteger(body.question_idx) || body.question_idx < 0)
    return jsonError(res, 400, 'bad_request', 'question_idx must be a non-negative integer');
  if (typeof body.selected_idx !== 'number' || !Number.isInteger(body.selected_idx) || body.selected_idx < 0 || body.selected_idx > 25)
    return jsonError(res, 400, 'bad_request', 'selected_idx out of range');

  const clientDuration =
    typeof body.duration_ms === 'number' && body.duration_ms >= 0 && body.duration_ms < 5 * 60 * 1000
      ? Math.round(body.duration_ms)
      : null;
  const clientReceivedAt =
    typeof body.client_received_at === 'string' && body.client_received_at.length <= 64
      ? new Date(body.client_received_at).getTime()
      : null;

  const code = body.code.toUpperCase();
  try {
    const { data: match } = await withTimeout(
      supabase!
        .from('matches')
        .select('id, mode, host_id, status, current_index, questions, question_started_at, question_duration_s')
        .eq('code', code)
        .maybeSingle(),
    );
    if (!match) return jsonError(res, 404, 'not_found', 'Match not found');
    if (match.status !== 'running')
      return jsonError(res, 409, 'bad_state', 'Match is not in progress');
    if (body.question_idx !== match.current_index)
      return jsonError(res, 409, 'wrong_question', 'That is not the current question');

    const matchQuestions = match.questions as MatchQuestion[];
    const q = matchQuestions[body.question_idx];
    if (!q) return jsonError(res, 400, 'bad_request', 'question_idx out of range');

    // Only players who joined the lobby may answer — otherwise anyone with
    // the code could inject rows that count toward the all-answered advance.
    const { data: participantRows, error: participantError } = await withTimeout(
      supabase!.from('match_participants').select('user_id').eq('match_id', match.id),
    );
    if (participantError) return jsonError(res, 503, 'backend_unavailable', 'Could not verify match membership');
    const participantIds = (participantRows ?? []).map((r: { user_id: string }) => r.user_id);
    if (!participantIds.includes(sub)) {
      return jsonError(res, 403, 'not_participant', 'Join the match before answering');
    }

    // An answer is final. A duplicate submit (network retry, double click)
    // replays the recorded result instead of re-grading, so a player can't
    // keep swapping options after seeing is_correct.
    const { data: existing, error: existingError } = await withTimeout(
      supabase!
        .from('match_answers')
        .select('is_correct, speed_bonus')
        .eq('match_id', match.id)
        .eq('user_id', sub)
        .eq('question_idx', body.question_idx)
        .maybeSingle(),
    );
    if (existingError) return jsonError(res, 503, 'backend_unavailable', 'Could not verify existing answer');
    if (existing) {
      return res.json({
        ok: true,
        is_correct: existing.is_correct,
        speed_bonus: existing.speed_bonus,
        advanced: false,
      });
    }

    const questionStartMs = match.question_started_at
      ? new Date(match.question_started_at).getTime()
      : null;

    let serverElapsedMs = 0;
    if (questionStartMs) {
      serverElapsedMs = Date.now() - questionStartMs;
      if (clientReceivedAt !== null && Number.isFinite(clientReceivedAt)) {
        const cappedReceived = Math.min(
          Math.max(clientReceivedAt, questionStartMs),
          questionStartMs + PING_GRACE_MS,
        );
        serverElapsedMs = Math.max(0, Date.now() - cappedReceived);
      }
    } else if (clientDuration !== null) {
      serverElapsedMs = clientDuration;
    }

    const { play: playSettings } = await getGameSettings();
    const isCorrect = q.correct_index === body.selected_idx;
    const durationS = match.question_duration_s ?? playSettings.defaultDurationS;
    const speedBonus = isCorrect
      ? computeSpeedBonus(serverElapsedMs, durationS, playSettings.maxSpeedBonus)
      : 0;

    // Insert-only makes the first answer final even when two tabs submit at
    // the same time. A unique-key conflict replays the recorded first answer.
    const { error } = await withTimeout(
      supabase!.from('match_answers').insert(
        {
          match_id: match.id,
          user_id: sub,
          question_id: q.id,
          question_idx: body.question_idx,
          selected_idx: body.selected_idx,
          is_correct: isCorrect,
          duration_ms: serverElapsedMs,
          speed_bonus: speedBonus,
        },
      ),
    );

    if (error) {
      if (error.code === '23505') {
        const replay = await withTimeout(
          supabase!
            .from('match_answers')
            .select('is_correct, speed_bonus')
            .eq('match_id', match.id)
            .eq('user_id', sub)
            .eq('question_idx', body.question_idx)
            .single(),
        );
        if (!replay.error && replay.data) {
          return res.json({
            ok: true,
            is_correct: replay.data.is_correct,
            speed_bonus: replay.data.speed_bonus,
            advanced: false,
          });
        }
      }
      logEvent('play/answer', { status: 500, error: error.message });
      return jsonError(res, 500, 'db_error', 'Could not record answer');
    }

    // In multiplayer everyone answers — the host competes like any other
    // player — so the match advances the moment the last participant locks
    // in (classroom keeps host-driven advance). The lazy checks in state()
    // (expiry; all-answered on no-limit matches) backstop this if two final
    // answers race past each other.
    let advanced = false;
    if (match.mode === 'multiplayer') {
      const { count: answeredCount } = await withTimeout(
        supabase!
          .from('match_answers')
          .select('user_id', { count: 'exact', head: true })
          .eq('match_id', match.id)
          .eq('question_idx', body.question_idx),
      );
      if (participantIds.length > 0 && (answeredCount ?? 0) >= participantIds.length) {
        advanced = !!(await tryAdvance(match));
      }
    }

    logEvent('play/answer', {
      status: 200,
      code,
      q: body.question_idx,
      ok: isCorrect,
      bonus: speedBonus,
      advanced,
    });
    return res.json({ ok: true, is_correct: isCorrect, speed_bonus: speedBonus, advanced });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    logEvent('play/answer', { status: 504, error: message });
    return jsonError(res, 504, 'upstream_timeout', 'Backend timed out');
  }
}

async function distribution(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const sub = await requireAuthSub(req, res);
  if (!sub) return;

  const code = (req.query.code as string)?.toUpperCase();
  const qParam = parseInt(req.query.q as string, 10);
  if (!code) return jsonError(res, 400, 'bad_request', 'code required');
  if (!Number.isFinite(qParam) || qParam < 0)
    return jsonError(res, 400, 'bad_request', 'q (question index) required');

  try {
    const { data: match } = await withTimeout(
      supabase!.from('matches').select('id, host_id').eq('code', code).maybeSingle(),
    );

    if (!match) return jsonError(res, 404, 'not_found', 'Match not found');
    if (sub !== match.host_id) {
      return jsonError(res, 403, 'forbidden', 'Only the host can view distribution');
    }

    const { data, error } = await withTimeout(
      supabase!.rpc('match_question_distribution', {
        p_match_id: match.id,
        p_question_idx: qParam,
      }),
    );

    if (error) {
      if (isRpcMissing(error)) {
        return jsonError(res, 503, 'rpc_missing', 'Run supabase-schema-005.sql');
      }
      return jsonError(res, 500, 'db_error', 'Could not load distribution');
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.json({ buckets: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    logEvent('play/distribution', { status: 504, error: message });
    return jsonError(res, 504, 'upstream_timeout', 'Backend timed out');
  }
}

async function heartbeat(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const sub = await requireAuthSub(req, res);
  if (!sub) return;

  const body = (req.body || {}) as { code?: unknown };
  if (!isShortString(body.code, 16)) return jsonError(res, 400, 'bad_request', 'code required');

  const code = body.code.toUpperCase();
  try {
    const { data: match } = await withTimeout(
      supabase!.from('matches').select('id, host_id, status').eq('code', code).maybeSingle(),
    );
    if (!match) return jsonError(res, 404, 'not_found', 'Match not found');
    if (match.host_id !== sub)
      return jsonError(res, 403, 'forbidden', 'Only the host can send heartbeats');
    if (match.status !== 'running' && match.status !== 'lobby')
      return jsonError(res, 409, 'bad_state', 'Match is not active');

    const { error } = await withTimeout(
      supabase!
        .from('matches')
        .update({ last_heartbeat_at: new Date().toISOString() })
        .eq('id', match.id),
    );

    if (error) {
      logEvent('play/heartbeat', { status: 500, error: error.message });
      return jsonError(res, 500, 'db_error', 'Could not record heartbeat');
    }

    return res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    logEvent('play/heartbeat', { status: 504, error: message });
    return jsonError(res, 504, 'upstream_timeout', 'Backend timed out');
  }
}
