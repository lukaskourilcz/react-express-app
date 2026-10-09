-- Migration 059: a coding draft save that refuses to overwrite a newer draft.
-- Apply after migration 025. Safe to re-run. It adds one routine and changes
-- nothing that exists: save_coding_draft (025), which the code in production
-- (e077f45) calls, keeps its signature, its body and its grants, so this can
-- be applied before the code that uses it deploys. It does not depend on
-- migration 058.
--
-- An open tab used to overwrite the account draft whatever had happened to it
-- since the tab loaded, so a draft saved from another device in the meantime
-- was lost without a word (owner decision 10, 9 Oct 2026). The browser now
-- sends the account draft's updated_at its code builds on (`p_base`), and
-- save_coding_draft_v2 writes only while the stored draft still has that
-- time, or when there is none. Otherwise it writes nothing and answers with
-- the stored time, and the browser asks the learner which code to keep.
--
-- * Atomic. The row is read under FOR UPDATE, so of two saves built on the
--   same time the second waits for the first, then sees its newer time and is
--   refused. Two first saves race on the primary key: INSERT ... ON CONFLICT
--   DO NOTHING lets one in, and the other reads that row and is refused.
-- * Saving the code the account already holds is never a conflict and writes
--   nothing: the answer is the stored time, so a Submit that wrote the same
--   code first (an evolving stage) or another device holding the same text
--   leaves this one nothing to resolve.
-- * `p_force` writes whatever the stored time: Submit records an evolving
--   stage's submitted code this way, as save_coding_draft did, and still
--   learns the time it stored.
-- * Every write moves updated_at strictly forward (clock_timestamp(), or one
--   microsecond past the stored time), so two different codes never share a
--   time and a matching time always means nothing was saved since.
--
-- Answers: {"saved": true, "updatedAt": …} or
-- {"saved": false, "conflict": true, "updatedAt": <the stored time>}. The
-- stored code is never returned.

DO $$
BEGIN
  IF to_regclass('public.coding_drafts') IS NULL THEN
    RAISE EXCEPTION 'migration 059 needs migration 025 first';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_coding_draft_v2(
  p_user_id TEXT,
  p_task_id TEXT,
  p_code TEXT,
  p_base TIMESTAMPTZ,
  p_force BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_code TEXT;
  v_at TIMESTAMPTZ;
  v_tries INTEGER := 0;
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_task_id IS NULL OR p_task_id !~ '^[a-z0-9-]{3,64}$' OR p_code IS NULL OR octet_length(p_code) > 20480 THEN
    RAISE EXCEPTION 'invalid_coding_draft';
  END IF;

  LOOP
    v_tries := v_tries + 1;
    SELECT d.code, d.updated_at INTO v_code, v_at
      FROM public.coding_drafts d
     WHERE d.user_id = p_user_id AND d.task_id = p_task_id
       FOR UPDATE;
    EXIT WHEN FOUND;
    -- No draft yet: the first save stands, whatever base it was sent with.
    INSERT INTO public.coding_drafts (user_id, task_id, code, updated_at)
    VALUES (p_user_id, p_task_id, p_code, clock_timestamp())
    ON CONFLICT (user_id, task_id) DO NOTHING
    RETURNING updated_at INTO v_at;
    IF FOUND THEN
      RETURN jsonb_build_object('saved', TRUE, 'updatedAt', v_at);
    END IF;
    -- A save running beside this one inserted it first: read it, locked.
    IF v_tries >= 3 THEN
      RAISE EXCEPTION 'coding_draft_busy';
    END IF;
  END LOOP;

  IF v_code = p_code THEN
    RETURN jsonb_build_object('saved', TRUE, 'updatedAt', v_at);
  END IF;
  IF NOT COALESCE(p_force, FALSE) AND v_at IS DISTINCT FROM p_base THEN
    RETURN jsonb_build_object('saved', FALSE, 'conflict', TRUE, 'updatedAt', v_at);
  END IF;
  UPDATE public.coding_drafts
     SET code = p_code,
         updated_at = GREATEST(clock_timestamp(), v_at + INTERVAL '1 microsecond')
   WHERE user_id = p_user_id AND task_id = p_task_id
  RETURNING updated_at INTO v_at;
  RETURN jsonb_build_object('saved', TRUE, 'updatedAt', v_at);
END;
$$;
REVOKE ALL ON FUNCTION public.save_coding_draft_v2(TEXT, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_coding_draft_v2(TEXT, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN) TO service_role;
