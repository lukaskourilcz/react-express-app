-- Migration 066: accept a path module's plain requirements and any-N quota
-- atomically. Apply after 065. Safe to re-run; one transaction. Compatible
-- with production 2bb4855c: the existing result and coding routines keep
-- their names, arguments, bodies and grants. Only quota modules use this API.
BEGIN;
DO $$
BEGIN
  IF to_regprocedure('public.accept_learning_path_coding_result(jsonb,text,text,integer,text)') IS NULL OR
     to_regprocedure('public.accept_learning_path_result(text,text,text,text,text,text,text,numeric,jsonb,jsonb,jsonb,boolean,jsonb,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'migration 066 needs migrations 054 and 065 first';
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.accept_learning_path_quota_result(
  p_accept JSONB, p_module_quota JSONB,
  p_task_id TEXT DEFAULT NULL, p_track TEXT DEFAULT NULL,
  p_xp INTEGER DEFAULT 0, p_code_hash TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_attempt public.learning_path_attempts%ROWTYPE;
  v_requires JSONB := p_accept -> 'p_module_requires';
  v_states JSONB;
  v_packet JSONB;
  v_accepted JSONB;
  v_count INTEGER;
  v_met INTEGER;
  v_plain_met BOOLEAN;
BEGIN
  IF jsonb_typeof(p_accept) IS DISTINCT FROM 'object' OR
     jsonb_typeof(p_module_quota) IS DISTINCT FROM 'object' OR
     jsonb_typeof(v_requires) IS DISTINCT FROM 'array' OR
     jsonb_typeof(p_module_quota -> 'of') IS DISTINCT FROM 'array' OR
     jsonb_typeof(p_module_quota -> 'states') IS DISTINCT FROM 'array' OR
     jsonb_typeof(p_module_quota -> 'count') IS DISTINCT FROM 'number' OR
     COALESCE(p_module_quota ->> 'count', '') !~ '^[1-9][0-9]{0,2}$' THEN
    RAISE EXCEPTION 'invalid_learning_path_quota';
  END IF;
  v_count := (p_module_quota ->> 'count')::INTEGER;
  IF jsonb_array_length(v_requires) > 64 OR
     jsonb_array_length(p_module_quota -> 'of') NOT BETWEEN v_count AND 128 OR
     jsonb_array_length(p_module_quota -> 'states') NOT BETWEEN 1 AND 4 OR
     EXISTS (SELECT 1 FROM jsonb_array_elements(p_module_quota -> 'of') AS id
       WHERE jsonb_typeof(id) <> 'string' OR (id #>> '{}') !~ '^[a-z0-9-]{3,96}$') OR
     (SELECT count(DISTINCT id) FROM jsonb_array_elements(p_module_quota -> 'of') AS id)
       <> jsonb_array_length(p_module_quota -> 'of') OR
     EXISTS (SELECT 1 FROM jsonb_array_elements(p_module_quota -> 'states') AS state
       WHERE jsonb_typeof(state) <> 'string' OR (state #>> '{}') NOT IN ('verified_pass', 'self_reviewed')) THEN
    RAISE EXCEPTION 'invalid_learning_path_quota';
  END IF;
  -- The inner routine receives [] to suppress its AND-only completion. Check
  -- the original requirements here instead of bypassing their validation.
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_requires) AS req
      WHERE jsonb_typeof(req) <> 'object'
         OR jsonb_typeof(req -> 'activityId') IS DISTINCT FROM 'string'
         OR (req ->> 'activityId') !~ '^[a-z0-9-]{3,96}$'
         OR jsonb_typeof(req -> 'states') IS DISTINCT FROM 'array') THEN
    RAISE EXCEPTION 'invalid_learning_path_quota';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_requires) AS req
      WHERE jsonb_array_length(req -> 'states') NOT BETWEEN 1 AND 4
         OR (p_module_quota -> 'of') @> (req -> 'activityId')
         OR EXISTS (SELECT 1 FROM jsonb_array_elements(req -> 'states') AS state
           WHERE jsonb_typeof(state) <> 'string' OR (state #>> '{}') NOT IN ('verified_pass', 'self_reviewed'))) THEN
    RAISE EXCEPTION 'invalid_learning_path_quota';
  END IF;
  IF p_task_id IS NULL AND (p_track IS NOT NULL OR p_code_hash IS NOT NULL OR p_xp IS DISTINCT FROM 0) THEN
    RAISE EXCEPTION 'invalid_coding_verdict';
  END IF;

  -- Match 054's lock order: owned attempt, then enrollment. The latter
  -- serialises distinct activities without blocking attempt creation's FK.
  SELECT * INTO v_attempt FROM public.learning_path_attempts
    WHERE attempt_id = p_accept ->> 'p_attempt_id' FOR UPDATE;
  IF NOT FOUND OR v_attempt.user_id IS DISTINCT FROM p_accept ->> 'p_user_id' THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'not_found');
  END IF;
  PERFORM 1 FROM public.learning_path_enrollments
    WHERE enrollment_id = v_attempt.enrollment_id FOR NO KEY UPDATE;
  v_packet := p_accept || '{"p_module_requires":[],"p_module_complete":false}'::JSONB;
  IF p_task_id IS NOT NULL THEN
    v_accepted := public.accept_learning_path_coding_result(v_packet, p_task_id, p_track, p_xp, p_code_hash);
  ELSE
    v_accepted := public.accept_learning_path_result(
      v_packet ->> 'p_user_id', v_packet ->> 'p_attempt_id',
      v_packet ->> 'p_idempotency_key', v_packet ->> 'p_request_hash',
      v_packet ->> 'p_module_id', v_packet ->> 'p_state', v_packet ->> 'p_verification_kind',
      (v_packet ->> 'p_score')::NUMERIC, NULLIF(v_packet -> 'p_domain_scores', 'null'::JSONB),
      NULLIF(v_packet -> 'p_criteria', 'null'::JSONB), NULLIF(v_packet -> 'p_artifact', 'null'::JSONB),
      FALSE, v_packet -> 'p_result', '[]'::JSONB);
  END IF;
  IF v_accepted ->> 'ok' IS DISTINCT FROM 'true' OR v_accepted ->> 'replayed' = 'true' THEN
    RETURN v_accepted;
  END IF;

  SELECT activity_states INTO v_states FROM public.learning_path_progress
    WHERE enrollment_id = v_attempt.enrollment_id AND module_id = p_accept ->> 'p_module_id'
    FOR UPDATE;
  SELECT COALESCE(bool_and((req -> 'states') @>
      to_jsonb(COALESCE(v_states -> (req ->> 'activityId') ->> 'state', 'not_started'))), TRUE)
    INTO v_plain_met FROM jsonb_array_elements(v_requires) AS req;
  SELECT count(*) INTO v_met FROM jsonb_array_elements_text(p_module_quota -> 'of') AS id
    WHERE (p_module_quota -> 'states') @>
      to_jsonb(COALESCE(v_states -> id ->> 'state', 'not_started'));
  IF v_plain_met AND v_met >= v_count THEN
    UPDATE public.learning_path_progress SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
      WHERE enrollment_id = v_attempt.enrollment_id AND module_id = p_accept ->> 'p_module_id';
  END IF;
  RETURN v_accepted;
END; $$;
REVOKE ALL ON FUNCTION public.accept_learning_path_quota_result(JSONB,JSONB,TEXT,TEXT,INTEGER,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_learning_path_quota_result(JSONB,JSONB,TEXT,TEXT,INTEGER,TEXT) TO service_role;
COMMIT;
