SET LOCAL ROLE service_role;
DO $$
DECLARE
  u TEXT := 'sql-path-quota-user'; e TEXT := 'sqlquotaenrollment01';
  a TEXT; id TEXT; i INTEGER; packet JSONB; result JSONB; quota JSONB;
  ids JSONB := '[]'; requirements JSONB := '[{"activityId":"quota-lesson-one","states":["self_reviewed","verified_pass"]},{"activityId":"quota-lesson-two","states":["self_reviewed","verified_pass"]}]';
  completed TIMESTAMPTZ; bad JSONB;
BEGIN
  PERFORM public.upsert_learning_path_enrollment(u,e,'fde',1,NULL,'enroll');
  FOR i IN 1..12 LOOP ids := ids || to_jsonb('quota-case-' || i); END LOOP;
  quota := jsonb_build_object('count',9,'of',ids,'states',jsonb_build_array('verified_pass'));
  packet := jsonb_build_object('p_user_id',u,'p_request_hash',repeat('a',64),
    'p_module_id','quota-module','p_state','verified_pass','p_verification_kind','machine_verified',
    'p_score',1,'p_module_complete',TRUE,'p_module_requires',requirements,'p_result','{"xpAwarded":0}'::JSONB);
  -- Even a forged/stale true flag cannot bypass the quota or lessons.
  FOR i IN 1..9 LOOP
    id := 'quota-case-' || i; a := 'sqlquotaattempt' || lpad(i::TEXT,4,'0');
    PERFORM public.open_learning_path_attempt(u,a,e,id,'exercise',1,1,60);
    packet := packet || jsonb_build_object('p_attempt_id',a,'p_idempotency_key','sqlquotakey' || lpad(i::TEXT,6,'0'));
    result := public.accept_learning_path_quota_result(packet,quota);
    ASSERT result->>'ok'='true';
    ASSERT (SELECT completed_at IS NULL FROM public.learning_path_progress WHERE enrollment_id=e AND module_id='quota-module');
  END LOOP;
  FOR i IN 1..2 LOOP
    id := CASE WHEN i=1 THEN 'quota-lesson-one' ELSE 'quota-lesson-two' END;
    a := 'sqlquotalesson' || lpad(i::TEXT,4,'0');
    PERFORM public.open_learning_path_attempt(u,a,e,id,'exercise',1,1,60);
    -- Both API calls may have calculated false from an old progress read.
    packet := packet || jsonb_build_object('p_attempt_id',a,'p_idempotency_key','sqlquotalessonkey' || i,
      'p_state','self_reviewed','p_verification_kind','self_reviewed','p_module_complete',FALSE);
    result := public.accept_learning_path_quota_result(packet,quota);
    ASSERT result->>'ok'='true';
    IF i=1 THEN
      ASSERT (SELECT completed_at IS NULL FROM public.learning_path_progress WHERE enrollment_id=e AND module_id='quota-module');
    END IF;
  END LOOP;
  SELECT completed_at INTO completed FROM public.learning_path_progress WHERE enrollment_id=e AND module_id='quota-module';
  ASSERT completed IS NOT NULL;
  result := public.accept_learning_path_quota_result(packet,quota);
  ASSERT result->>'replayed'='true';
  ASSERT (SELECT count(*) FROM public.learning_path_evidence WHERE enrollment_id=e)=11;
  result := public.accept_learning_path_quota_result(packet || '{"p_user_id":"sql-path-foreign"}'::JSONB,quota);
  ASSERT result->>'ok'='false' AND result->>'reason'='not_found';
  -- A later failed attempt preserves the recorded pass and completion.
  a := 'sqlquotaweaker0001';
  PERFORM public.open_learning_path_attempt(u,a,e,'quota-case-1','exercise',1,1,60);
  packet := packet || jsonb_build_object('p_attempt_id',a,'p_idempotency_key','sqlquotaweakerkey1','p_state','needs_revision','p_verification_kind','machine_verified');
  result := public.accept_learning_path_quota_result(packet,quota);
  ASSERT result->>'ok'='true';
  ASSERT (SELECT activity_states->'quota-case-1'->>'state'='verified_pass' AND completed_at=completed
    FROM public.learning_path_progress WHERE enrollment_id=e AND module_id='quota-module');
  -- The validation rejects zero/oversized/fractional quotas, duplicate ids,
  -- malformed state/requirement shapes and overlap. No writes escape.
  FOREACH bad IN ARRAY ARRAY[
    quota || '{"count":0}', quota || '{"count":13}', quota || '{"count":1.5}',
    quota || '{"of":["quota-case-1","quota-case-1"],"count":1}',
    quota || '{"states":["not_started"]}', quota || '{"states":"verified_pass"}',
    quota || '{"of":["quota-lesson-one"],"count":1}', 'null'::JSONB
  ] LOOP
    BEGIN
      PERFORM public.accept_learning_path_quota_result(packet,bad);
      RAISE EXCEPTION 'expected invalid quota';
    EXCEPTION WHEN OTHERS THEN ASSERT SQLERRM='invalid_learning_path_quota'; END;
  END LOOP;
  BEGIN
    PERFORM public.accept_learning_path_quota_result(packet || '{"p_module_requires":[{"activityId":"quota-lesson-one","states":"self_reviewed"}]}',quota);
    RAISE EXCEPTION 'expected invalid requirement';
  EXCEPTION WHEN OTHERS THEN ASSERT SQLERRM='invalid_learning_path_quota'; END;
END; $$;

-- A quota-only coding module awards and accepts atomically, including replay
-- and rollback when the coding ledger rejects a malformed task.
DO $$
DECLARE u TEXT := 'sql-quota-code-user'; e TEXT := 'sqlquotacodeenroll1'; a TEXT := 'sqlquotacodeattempt1'; packet JSONB; quota JSONB; result JSONB;
BEGIN
  PERFORM public.upsert_learning_path_enrollment(u,e,'fde',1,NULL,'enroll');
  PERFORM public.open_learning_path_attempt(u,a,e,'quota-code-one','exercise',1,1,60);
  packet := jsonb_build_object('p_user_id',u,'p_attempt_id',a,'p_idempotency_key','sqlquotacodekey001','p_request_hash',repeat('b',64),
    'p_module_id','quota-code-module','p_state','verified_pass','p_verification_kind','machine_verified','p_score',1,
    'p_module_complete',FALSE,'p_module_requires','[]'::JSONB,'p_result','{"xpAwarded":0}'::JSONB);
  quota := '{"count":1,"of":["quota-code-one"],"states":["verified_pass"]}';
  result := public.accept_learning_path_quota_result(packet,quota,'quota-code-task','javascript',25,repeat('b',64));
  ASSERT result->'result'->>'xpAwarded'='25';
  ASSERT (SELECT completed_at IS NOT NULL FROM public.learning_path_progress WHERE enrollment_id=e AND module_id='quota-code-module');
  result := public.accept_learning_path_quota_result(packet,quota,'quota-code-task','javascript',25,repeat('b',64));
  ASSERT result->>'replayed'='true' AND result->'coding'->>'xpKind'='first';
  ASSERT (SELECT quest_xp FROM public.user_xp WHERE user_id=u)=25;
  a := 'sqlquotacodeattempt2';
  PERFORM public.open_learning_path_attempt(u,a,e,'quota-code-two','exercise',1,1,60);
  packet := packet || jsonb_build_object('p_attempt_id',a,'p_idempotency_key','sqlquotacodekey002');
  BEGIN
    PERFORM public.accept_learning_path_quota_result(packet,quota,'invalid task','javascript',25,repeat('b',64));
    RAISE EXCEPTION 'expected invalid coding';
  EXCEPTION WHEN OTHERS THEN ASSERT SQLERRM='invalid_coding_verdict'; END;
  ASSERT (SELECT state FROM public.learning_path_attempts WHERE attempt_id=a)='open';
  ASSERT NOT EXISTS(SELECT 1 FROM public.learning_path_evidence WHERE attempt_id=a);
END; $$;

-- Distinct final cases submitted concurrently both start with a stale false
-- completion flag. The second waits on the enrollment, then counts the
-- first result; completion does not require a subsequent learner action.
RESET ROLE;
CREATE EXTENSION IF NOT EXISTS dblink WITH SCHEMA extensions;
DO $$
DECLARE
  dsn TEXT := format('host=%s port=%s dbname=%s user=%s password=%s',
    COALESCE(host(inet_server_addr()), 'localhost'), inet_server_port(), current_database(), current_user,
    COALESCE(NULLIF(current_setting('devshark.test_password', TRUE), ''), 'postgres'));
  u TEXT := 'sql-quota-race-user'; e TEXT := 'sqlquotaraceenroll1';
  quota JSONB := '{"count":2,"of":["quota-race-a","quota-race-b"],"states":["verified_pass"]}';
  packet JSONB; result JSONB; pid_b INTEGER; waited BOOLEAN := FALSE; done BOOLEAN;
BEGIN
  PERFORM extensions.dblink_connect('quota_race_a',dsn);
  PERFORM extensions.dblink_connect('quota_race_b',dsn);
  SELECT pid INTO pid_b FROM extensions.dblink('quota_race_b','SELECT pg_backend_pid()') AS t(pid INTEGER);
  PERFORM extensions.dblink_exec('quota_race_a',format('DO $setup$ BEGIN
    PERFORM public.upsert_learning_path_enrollment(%L,%L,''fde'',1,NULL,''enroll'');
    PERFORM public.open_learning_path_attempt(%L,''sqlquotaraceattempta'',%L,''quota-race-a'',''exercise'',1,1,60);
    PERFORM public.open_learning_path_attempt(%L,''sqlquotaraceattemptb'',%L,''quota-race-b'',''exercise'',1,1,60);
  END; $setup$;',u,e,u,e,u,e));
  packet := jsonb_build_object('p_user_id',u,'p_attempt_id','sqlquotaraceattempta','p_idempotency_key','sqlquotaracekeyaaa',
    'p_request_hash',repeat('c',64),'p_module_id','quota-race-module','p_state','verified_pass',
    'p_verification_kind','machine_verified','p_score',1,'p_module_complete',FALSE,
    'p_module_requires','[]'::JSONB,'p_result','{}'::JSONB);
  PERFORM extensions.dblink_exec('quota_race_a','BEGIN');
  SELECT r::JSONB INTO result FROM extensions.dblink('quota_race_a',
    format('SELECT public.accept_learning_path_quota_result(%L::JSONB,%L::JSONB)::TEXT',packet,quota)) AS t(r TEXT);
  ASSERT result->>'ok'='true';
  SELECT completed_at IS NOT NULL INTO done FROM extensions.dblink('quota_race_a',
    format('SELECT completed_at FROM public.learning_path_progress WHERE enrollment_id=%L',e)) AS t(completed_at TIMESTAMPTZ);
  ASSERT NOT done, 'one of two quota passes completed the module';
  packet := packet || '{"p_attempt_id":"sqlquotaraceattemptb","p_idempotency_key":"sqlquotaracekeybbb"}';
  PERFORM extensions.dblink_send_query('quota_race_b',
    format('SELECT public.accept_learning_path_quota_result(%L::JSONB,%L::JSONB)::TEXT',packet,quota));
  FOR i IN 1..100 LOOP
    SELECT wait_event_type='Lock' INTO waited FROM pg_stat_activity WHERE pid=pid_b;
    EXIT WHEN waited;
    PERFORM pg_sleep(0.05);
  END LOOP;
  ASSERT waited, 'the second quota submit did not wait on the first';
  PERFORM extensions.dblink_exec('quota_race_a','COMMIT');
  SELECT r::JSONB INTO result FROM extensions.dblink_get_result('quota_race_b') AS t(r TEXT);
  PERFORM * FROM extensions.dblink_get_result('quota_race_b') AS t(r TEXT);
  ASSERT result->>'ok'='true';
  SELECT completed_at IS NOT NULL INTO done FROM extensions.dblink('quota_race_a',
    format('SELECT completed_at FROM public.learning_path_progress WHERE enrollment_id=%L',e)) AS t(completed_at TIMESTAMPTZ);
  ASSERT done, 'two concurrently accepted passes left the quota incomplete';
  PERFORM extensions.dblink_exec('quota_race_a',format('DELETE FROM public.learning_path_enrollments WHERE enrollment_id=%L',e));
  PERFORM extensions.dblink_disconnect('quota_race_a');
  PERFORM extensions.dblink_disconnect('quota_race_b');
END; $$;
