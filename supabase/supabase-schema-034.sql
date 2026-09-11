-- Migration 034: answer a Learn question in one database round trip.
-- Apply after migrations 001-033. Safe to re-run.
--
-- Answering felt slow, and it was: the handler made two or three sequential
-- trips to the database for one tap. It read the attempt row, sometimes wrote
-- it, and then called record_roadmap_answer — which reads the very same row
-- again, under a lock, before doing anything. Measured against production, the
-- endpoint's fixed overhead alone (routing, the rate limiter's own network hop,
-- parsing) is 220-320ms warm; each avoidable trip to Postgres adds to that.
--
-- This version takes the attempt's descriptor and creates the row if it is not
-- there, so the whole exchange is one call. It is a new name rather than a
-- replacement because the argument list changes, which lets the handler fall
-- back to the old pair until this migration is applied.
--
-- It gives nothing away that the two-step version did not. The same checks run,
-- in the same order, on the same locked row: the attempt must belong to the
-- caller, must not have expired, must not be complete, and must describe the
-- same lesson the session says it does. A client still cannot invent an
-- attempt for somebody else, cannot change one it does not own, and cannot
-- learn the correct answer by asking — the correct index is supplied by the
-- server from its own sealed session, exactly as before.

CREATE OR REPLACE FUNCTION public.record_roadmap_answer_v2(
  p_attempt_id      TEXT,
  p_user_id         TEXT,
  p_question_id     TEXT,
  p_selected_index  INTEGER,
  p_correct_index   INTEGER,
  -- The descriptor, so a first answer can open the attempt without a second
  -- trip. Every field is the server's own, read from the sealed session.
  p_subject         TEXT,
  p_topic           TEXT,
  p_kind            TEXT,
  p_ref             INTEGER,
  p_total_questions INTEGER,
  p_pass_pct        INTEGER,
  p_required_start  INTEGER DEFAULT NULL,
  p_required_end    INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_attempt public.roadmap_attempts%ROWTYPE;
  v_answer  public.roadmap_attempt_answers%ROWTYPE;
BEGIN
  IF p_attempt_id !~ '^[A-Za-z0-9_-]{16,64}$' OR
     p_question_id !~ '^[A-Za-z0-9_-]{1,64}$' OR
     p_selected_index NOT BETWEEN 0 AND 25 OR
     p_correct_index NOT BETWEEN 0 AND 25 OR
     p_total_questions NOT BETWEEN 1 AND 50 OR
     p_pass_pct NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'invalid_roadmap_answer';
  END IF;

  -- Open the attempt if this is the first answer. ON CONFLICT DO NOTHING makes
  -- two tabs answering at once cost one row rather than an error.
  INSERT INTO public.roadmap_attempts (
    attempt_id, user_id, subject, topic, kind, ref, total_questions, pass_pct,
    required_level_start, required_level_end, expires_at
  ) VALUES (
    p_attempt_id, p_user_id, p_subject, p_topic, p_kind, p_ref,
    p_total_questions, p_pass_pct, p_required_start, p_required_end,
    NOW() + INTERVAL '2 hours'
  )
  ON CONFLICT (attempt_id) DO NOTHING;

  SELECT * INTO v_attempt
    FROM public.roadmap_attempts
   WHERE attempt_id = p_attempt_id
   FOR UPDATE;

  -- Exactly the checks the two-step path ran, on the row it would have read.
  -- The descriptor comparison is what stopped a session id being replayed
  -- against an attempt opened for a different lesson.
  IF NOT FOUND
     OR v_attempt.user_id IS DISTINCT FROM p_user_id
     OR v_attempt.expires_at < NOW()
     OR v_attempt.completed_at IS NOT NULL
     OR v_attempt.subject IS DISTINCT FROM p_subject
     OR v_attempt.topic IS DISTINCT FROM p_topic
     OR v_attempt.kind IS DISTINCT FROM p_kind
     OR v_attempt.ref IS DISTINCT FROM p_ref
     OR v_attempt.total_questions IS DISTINCT FROM p_total_questions
     OR v_attempt.required_level_start IS DISTINCT FROM p_required_start
     OR v_attempt.required_level_end IS DISTINCT FROM p_required_end THEN
    RAISE EXCEPTION 'invalid_roadmap_attempt';
  END IF;

  INSERT INTO public.roadmap_attempt_answers (
    attempt_id, question_id, selected_index, correct_index, is_correct
  ) VALUES (
    p_attempt_id, p_question_id, p_selected_index, p_correct_index,
    p_selected_index = p_correct_index
  ) ON CONFLICT (attempt_id, question_id) DO NOTHING;

  -- The stored answer, not the submitted one: a second attempt at the same
  -- question replays the first, which is what makes the first one final.
  SELECT * INTO v_answer
    FROM public.roadmap_attempt_answers
   WHERE attempt_id = p_attempt_id AND question_id = p_question_id;

  RETURN jsonb_build_object(
    'selectedIndex', v_answer.selected_index,
    'correctAnswer', v_answer.correct_index,
    'isCorrect', v_answer.is_correct
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_roadmap_answer_v2(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_roadmap_answer_v2(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER
) TO service_role;
