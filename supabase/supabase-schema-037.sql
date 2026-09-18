-- Migration 037: challenge runs — a practice session the learner shapes and
-- can schedule.
-- Apply after migrations 001-036. Safe to re-run.
--
-- A short session used to be "some minutes, maybe one track", and the server
-- picked the queue in catalogue order. A run adds three choices the learner
-- asked for: how the queue is ordered (in catalogue order, or shuffled), how
-- many challenges it holds (three from React, say), and when it happens. A
-- scheduled run is a row in the `scheduled` state whose queue was chosen at
-- scheduling time; starting it moves it to `active`, and cancelling it uses
-- the existing advance routine with `abandoned`, exactly like ending a run.
--
-- Nothing here grants anything: the queue is still chosen server-side from
-- what the learner could already open, and a run reorders practice, never
-- widens it. Reminders are the learner's own calendar — the run is shown on
-- Today and on Coding when it is due, and nothing is sent.

ALTER TABLE public.practice_sessions
  ADD COLUMN IF NOT EXISTS order_mode    TEXT NOT NULL DEFAULT 'sequential',
  ADD COLUMN IF NOT EXISTS task_count    INTEGER,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

DO $$
DECLARE
  v_name TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.practice_sessions'::regclass AND conname = 'practice_sessions_order_mode_check'
  ) THEN
    ALTER TABLE public.practice_sessions
      ADD CONSTRAINT practice_sessions_order_mode_check CHECK (order_mode IN ('sequential', 'random'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.practice_sessions'::regclass AND conname = 'practice_sessions_task_count_check'
  ) THEN
    ALTER TABLE public.practice_sessions
      ADD CONSTRAINT practice_sessions_task_count_check CHECK (task_count IS NULL OR task_count BETWEEN 1 AND 20);
  END IF;

  -- The status check from 027 admits three states. Replace it, whatever
  -- Postgres named it, with one that also admits `scheduled`.
  FOR v_name IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.practice_sessions'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) LIKE '%status%'
       AND pg_get_constraintdef(oid) NOT LIKE '%scheduled%'
  LOOP
    EXECUTE format('ALTER TABLE public.practice_sessions DROP CONSTRAINT %I', v_name);
  END LOOP;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.practice_sessions'::regclass AND conname = 'practice_sessions_status_check'
  ) THEN
    ALTER TABLE public.practice_sessions
      ADD CONSTRAINT practice_sessions_status_check
      CHECK (status IN ('active', 'scheduled', 'finished', 'abandoned'));
  END IF;
END;
$$;

-- One run at a time: starting or scheduling a run retires whatever run was
-- open, scheduled or active. A run scheduled for a moment already past starts
-- straight away rather than sitting in a state nothing will leave.
CREATE OR REPLACE FUNCTION public.start_practice_session_v2(
  p_session_id    TEXT,
  p_user_id       TEXT,
  p_subject       TEXT,
  p_minutes       INTEGER,
  p_topic         TEXT,
  p_queue         JSONB,
  p_order_mode    TEXT,
  p_task_count    INTEGER,
  p_scheduled_for TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status TEXT;
BEGIN
  v_status := CASE WHEN p_scheduled_for IS NOT NULL AND p_scheduled_for > NOW() THEN 'scheduled' ELSE 'active' END;
  UPDATE public.practice_sessions
     SET status = 'abandoned', updated_at = NOW()
   WHERE user_id = p_user_id AND status IN ('active', 'scheduled');
  INSERT INTO public.practice_sessions
    (session_id, user_id, subject, minutes, topic, queue, status, order_mode, task_count, scheduled_for)
  VALUES
    (p_session_id, p_user_id, COALESCE(p_subject, 'webdev'), p_minutes, p_topic, COALESCE(p_queue, '[]'::jsonb),
     v_status, COALESCE(p_order_mode, 'sequential'), p_task_count,
     CASE WHEN v_status = 'scheduled' THEN p_scheduled_for ELSE NULL END)
  ON CONFLICT (session_id) DO NOTHING;
  RETURN v_status;
END;
$$;
REVOKE ALL ON FUNCTION public.start_practice_session_v2(TEXT, TEXT, TEXT, INTEGER, TEXT, JSONB, TEXT, INTEGER, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_practice_session_v2(TEXT, TEXT, TEXT, INTEGER, TEXT, JSONB, TEXT, INTEGER, TIMESTAMPTZ) TO service_role;

-- A scheduled run becomes the active one when the learner starts it, early or
-- late. Only a scheduled row moves; anything else returns FALSE and changes
-- nothing, so a stale button cannot revive a finished run.
CREATE OR REPLACE FUNCTION public.begin_scheduled_practice_session(
  p_session_id TEXT,
  p_user_id    TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.practice_sessions
     SET status = 'active', started_at = NOW(), updated_at = NOW()
   WHERE session_id = p_session_id AND user_id = p_user_id AND status = 'scheduled';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.begin_scheduled_practice_session(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_scheduled_practice_session(TEXT, TEXT) TO service_role;
