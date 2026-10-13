-- One coding award ledger, including verified code inside Learning Paths.
BEGIN;
ALTER TABLE public.learning_path_attempts ADD COLUMN IF NOT EXISTS coding_xp_kind TEXT CHECK(coding_xp_kind IN ('first','repeat'));
CREATE OR REPLACE FUNCTION public.accept_learning_path_coding_result(
  p_accept JSONB, p_task_id TEXT, p_track TEXT, p_xp INTEGER, p_code_hash TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE accepted JSONB; coding JSONB; result JSONB; kind TEXT; v_user TEXT := p_accept->>'p_user_id'; v_attempt TEXT := p_accept->>'p_attempt_id';
BEGIN
  IF p_xp IS NULL OR p_xp NOT IN (0,15,25) OR p_code_hash IS NULL OR p_code_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid_coding_verdict'; END IF;
  accepted := public.accept_learning_path_result(
    v_user, v_attempt, p_accept->>'p_idempotency_key', p_accept->>'p_request_hash',
    p_accept->>'p_module_id', p_accept->>'p_state', p_accept->>'p_verification_kind',
    (p_accept->>'p_score')::NUMERIC, NULLIF(p_accept->'p_domain_scores','null'::JSONB),NULLIF(p_accept->'p_criteria','null'::JSONB),NULLIF(p_accept->'p_artifact','null'::JSONB),
    (p_accept->>'p_module_complete')::BOOLEAN,p_accept->'p_result',p_accept->'p_module_requires');
  IF accepted->>'ok' IS DISTINCT FROM 'true' THEN RETURN accepted; END IF;
  IF accepted->>'replayed' = 'true' THEN
    SELECT coding_xp_kind INTO kind FROM public.learning_path_attempts a WHERE a.attempt_id=v_attempt;
    RETURN accepted || jsonb_build_object('coding',jsonb_build_object('xpKind',kind));
  END IF;
  -- The acceptance locked and checked the owned, open path attempt. Both
  -- writes commit together, or neither does. Replays never grade/pay again.
  coding := public.record_coding_verdict(
    v_user,'path:' || v_attempt,p_task_id,p_track,
    CASE WHEN p_accept->>'p_state'='verified_pass' THEN 'passed' ELSE 'failed' END,
    p_accept->>'p_verification_kind'='machine_verified',p_xp,'webdev',NULL,NULL,NULL,0,p_code_hash);
  result := jsonb_set(p_accept->'p_result','{xpAwarded}',to_jsonb(CASE WHEN coding->>'xpAwarded'='true' THEN p_xp ELSE 0 END));
  UPDATE public.learning_path_attempts SET accepted_result=result,coding_xp_kind=coding->>'xpKind' WHERE learning_path_attempts.attempt_id=v_attempt;
  RETURN accepted || jsonb_build_object('result',result,'coding',coding);
END; $$;
REVOKE ALL ON FUNCTION public.accept_learning_path_coding_result(JSONB,TEXT,TEXT,INTEGER,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.accept_learning_path_coding_result(JSONB,TEXT,TEXT,INTEGER,TEXT) TO service_role;
COMMIT;
