SET LOCAL ROLE service_role;
DO $$
DECLARE u TEXT := 'sql-path-code-user'; e TEXT := 'sqlpathenrollment001'; a TEXT := 'sqlpathattempt00001'; packet JSONB; result JSONB;
BEGIN
  PERFORM public.upsert_learning_path_enrollment(u,e,'dsa-foundations',1,NULL,'enroll');
  PERFORM public.open_learning_path_attempt(u,a,e,'dsa-code-one','exercise',1,1,60);
  packet := jsonb_build_object('p_user_id',u,'p_attempt_id',a,'p_idempotency_key','sqlpathkey00000001','p_request_hash',repeat('a',64),
    'p_module_id','dsa-module-one','p_state','verified_pass','p_verification_kind','machine_verified','p_score',1,
    'p_domain_scores',NULL,'p_criteria','[{"id":"core","critical":true,"passed":true}]'::JSONB,'p_artifact',NULL,
    'p_module_complete',FALSE,'p_module_requires','[]'::JSONB,'p_result','{"xpAwarded":0}'::JSONB);
  result := public.accept_learning_path_coding_result(packet,'js-shared-path-task','javascript',25,repeat('a',64));
  ASSERT result->>'ok'='true' AND result->'result'->>'xpAwarded'='25';
  ASSERT (SELECT quest_xp FROM public.user_xp WHERE user_id=u)=25;
  result := public.accept_learning_path_coding_result(packet,'js-shared-path-task','javascript',25,repeat('a',64));
  ASSERT result->>'replayed'='true' AND result->'result'->>'xpAwarded'='25';
  ASSERT result->'coding'->>'xpKind'='first';
  ASSERT (SELECT quest_xp FROM public.user_xp WHERE user_id=u)=25;
  -- The same task on another screen has the same reward ledger.
  result := public.record_coding_verdict(u,'sqlordinaryattempt1','js-shared-path-task','javascript','passed',TRUE,25,'webdev');
  ASSERT result->>'xpAwarded'='false';
  ASSERT (SELECT quest_xp FROM public.user_xp WHERE user_id=u)=25;
  -- A distinct reliably above-target task pays 15, atomically with acceptance.
  a := 'sqlpathattempt00002';
  PERFORM public.open_learning_path_attempt(u,a,e,'dsa-code-two','exercise',1,1,60);
  packet := packet || jsonb_build_object('p_attempt_id',a,'p_idempotency_key','sqlpathkey00000002');
  result := public.accept_learning_path_coding_result(packet,'js-second-path-task','javascript',15,repeat('b',64));
  ASSERT result->'result'->>'xpAwarded'='15';
  ASSERT (SELECT quest_xp FROM public.user_xp WHERE user_id=u)=40;
  -- A foreign owner cannot accept an attempt or allocate a reward.
  result := public.accept_learning_path_coding_result(packet || '{"p_user_id":"sql-path-foreign"}'::JSONB,'js-third-path-task','javascript',25,repeat('b',64));
  ASSERT result->>'ok'='false';
  ASSERT NOT EXISTS(SELECT 1 FROM public.coding_progress WHERE user_id='sql-path-foreign');
  -- A coding write failing after acceptance rolls acceptance back as well.
  a := 'sqlpathattempt00003';
  PERFORM public.open_learning_path_attempt(u,a,e,'dsa-code-three','exercise',1,1,60);
  packet := packet || jsonb_build_object('p_attempt_id',a,'p_idempotency_key','sqlpathkey00000003');
  BEGIN
    PERFORM public.accept_learning_path_coding_result(packet,'invalid task','javascript',25,repeat('c',64));
    RAISE EXCEPTION 'expected invalid coding verdict';
  EXCEPTION WHEN OTHERS THEN ASSERT SQLERRM='invalid_coding_verdict'; END;
  ASSERT (SELECT state FROM public.learning_path_attempts WHERE attempt_id=a)='open';
  ASSERT (SELECT quest_xp FROM public.user_xp WHERE user_id=u)=40;
END; $$;
