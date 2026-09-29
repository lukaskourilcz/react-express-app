-- Migration 054: accept_learning_path_result decides module completion from
-- the states it has just written, given the module's requirements. Before
-- 054 completion came only from p_module_complete, which the API works out
-- from progress it read before the call. Two submits finishing a module's
-- last two activities at once each read the other as not done, both sent
-- FALSE, and the module was never completed: the path showed as finished
-- while its package read as not earned. This replays that interleaving: each
-- result arrives with the stale FALSE its handler computed.

DO $$
DECLARE
  v_user CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001731';
  v_enrollment CONSTANT TEXT := 'completeenroll173001';
  v_requires CONSTANT JSONB := '[
    {"activityId": "dsa-race-check", "states": ["verified_pass"]},
    {"activityId": "dsa-race-code", "states": ["verified_pass"]},
    {"activityId": "dsa-race-note", "states": ["self_reviewed", "verified_pass"]}
  ]';
  r JSONB;
BEGIN
  PERFORM public.upsert_learning_path_enrollment(v_user, v_enrollment, 'dsa-foundations', 1, NULL, 'enroll');
  PERFORM public.open_learning_path_attempt(v_user, 'completeattempt00001', v_enrollment, 'dsa-race-check', 'exercise', 1, 1, 60);
  PERFORM public.open_learning_path_attempt(v_user, 'completeattempt00002', v_enrollment, 'dsa-race-code', 'exercise', 1, 1, 60);
  PERFORM public.open_learning_path_attempt(v_user, 'completeattempt00003', v_enrollment, 'dsa-race-note', 'project', 1, 1, 60);

  r := public.accept_learning_path_result(v_user, 'completeattempt00001', 'completekey000000001', 'completehash00000001',
    'dsa-race-module', 'verified_pass', 'machine_verified', 1, NULL, NULL, NULL, FALSE, '{}', v_requires);
  ASSERT (r ->> 'ok')::BOOLEAN, format('the first result was not accepted: %s', r);
  ASSERT (SELECT completed_at IS NULL FROM public.learning_path_progress WHERE enrollment_id = v_enrollment AND module_id = 'dsa-race-module'),
    'one of three requirements completed the module';

  -- The write-up requirement is met by self_reviewed.
  PERFORM public.accept_learning_path_result(v_user, 'completeattempt00003', 'completekey000000003', 'completehash00000003',
    'dsa-race-module', 'self_reviewed', 'self_reviewed', NULL, NULL, NULL, '{"note":"x"}', FALSE, '{}', v_requires);
  ASSERT (SELECT completed_at IS NULL FROM public.learning_path_progress WHERE enrollment_id = v_enrollment AND module_id = 'dsa-race-module'),
    'two of three requirements completed the module';

  -- The last requirement, sent with the FALSE a handler that read progress
  -- before the other results landed would send.
  PERFORM public.accept_learning_path_result(v_user, 'completeattempt00002', 'completekey000000002', 'completehash00000002',
    'dsa-race-module', 'verified_pass', 'machine_verified', 1, NULL, NULL, NULL, FALSE, '{}', v_requires);
  ASSERT (SELECT completed_at IS NOT NULL FROM public.learning_path_progress WHERE enrollment_id = v_enrollment AND module_id = 'dsa-race-module'),
    'every requirement met, and the module is still not completed';
  ASSERT public.path_is_complete(v_user, 'dsa-foundations', 1, 1), 'the finished one-module path does not read as finished';
END;
$$;

-- What does not complete a module, and what the routine refuses.
DO $$
DECLARE
  v_user CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001732';
  v_enrollment CONSTANT TEXT := 'completeenroll173002';
BEGIN
  PERFORM public.upsert_learning_path_enrollment(v_user, v_enrollment, 'dsa-foundations', 1, NULL, 'enroll');

  -- A failed attempt does not meet a verified_pass requirement.
  PERFORM public.open_learning_path_attempt(v_user, 'completeattempt00011', v_enrollment, 'dsa-open-check', 'exercise', 1, 1, 60);
  PERFORM public.accept_learning_path_result(v_user, 'completeattempt00011', 'completekey000000011', 'completehash00000011',
    'dsa-open-module', 'needs_revision', 'machine_verified', 0.2, NULL, NULL, NULL, FALSE, '{}',
    '[{"activityId": "dsa-open-check", "states": ["verified_pass"]}]');
  ASSERT (SELECT completed_at IS NULL FROM public.learning_path_progress WHERE enrollment_id = v_enrollment AND module_id = 'dsa-open-module'),
    'a failed attempt completed its module';

  -- An optional module sends no requirements and never completes.
  PERFORM public.open_learning_path_attempt(v_user, 'completeattempt00012', v_enrollment, 'dsa-placement', 'diagnostic', 1, 1, 60);
  PERFORM public.accept_learning_path_result(v_user, 'completeattempt00012', 'completekey000000012', 'completehash00000012',
    'dsa-placement-module', 'verified_pass', 'machine_verified', 1, NULL, NULL, NULL, FALSE, '{}', '[]');
  ASSERT (SELECT completed_at IS NULL FROM public.learning_path_progress WHERE enrollment_id = v_enrollment AND module_id = 'dsa-placement-module'),
    'an optional module completed';

  -- Without requirements (the code deployed before 054), p_module_complete
  -- still decides, as it did.
  PERFORM public.open_learning_path_attempt(v_user, 'completeattempt00013', v_enrollment, 'dsa-legacy-check', 'exercise', 1, 1, 60);
  PERFORM public.accept_learning_path_result(v_user, 'completeattempt00013', 'completekey000000013', 'completehash00000013',
    'dsa-legacy-module', 'verified_pass', 'machine_verified', 1, NULL, NULL, NULL, TRUE, '{}');
  ASSERT (SELECT completed_at IS NOT NULL FROM public.learning_path_progress WHERE enrollment_id = v_enrollment AND module_id = 'dsa-legacy-module'),
    'p_module_complete no longer completes a module';

  -- A malformed requirement list is refused before anything is written.
  PERFORM public.open_learning_path_attempt(v_user, 'completeattempt00014', v_enrollment, 'dsa-bad-check', 'exercise', 1, 1, 60);
  BEGIN
    PERFORM public.accept_learning_path_result(v_user, 'completeattempt00014', 'completekey000000014', 'completehash00000014',
      'dsa-bad-module', 'verified_pass', 'machine_verified', 1, NULL, NULL, NULL, FALSE, '{}', '{"activityId": "dsa-bad-check"}');
    RAISE EXCEPTION 'a requirement object in place of a list was accepted';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'invalid_learning_path_result', format('refused with %s', SQLERRM);
  END;
  BEGIN
    PERFORM public.accept_learning_path_result(v_user, 'completeattempt00014', 'completekey000000014', 'completehash00000014',
      'dsa-bad-module', 'verified_pass', 'machine_verified', 1, NULL, NULL, NULL, FALSE, '{}', '[{"activityId": "Not An Id", "states": []}]');
    RAISE EXCEPTION 'a requirement with a malformed activity id was accepted';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'invalid_learning_path_result', format('refused with %s', SQLERRM);
  END;
  BEGIN
    PERFORM public.accept_learning_path_result(v_user, 'completeattempt00014', 'completekey000000014', 'completehash00000014',
      'dsa-bad-module', 'verified_pass', 'machine_verified', 1, NULL, NULL, NULL, FALSE, '{}', '[{"activityId": "dsa-bad-check", "states": "verified_pass"}]');
    RAISE EXCEPTION 'a requirement whose states are not a list was accepted';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'invalid_learning_path_result', format('refused with %s', SQLERRM);
  END;
  ASSERT NOT EXISTS (SELECT 1 FROM public.learning_path_evidence WHERE attempt_id = 'completeattempt00014'),
    'a refused result wrote evidence';

  -- A replay of an accepted result answers from the record and changes nothing.
  ASSERT (public.accept_learning_path_result(v_user, 'completeattempt00013', 'completekey000000013', 'completehash00000013',
    'dsa-legacy-module', 'verified_pass', 'machine_verified', 1, NULL, NULL, NULL, TRUE, '{}',
    '[{"activityId": "dsa-legacy-check", "states": ["verified_pass"]}]') ->> 'replayed')::BOOLEAN,
    'a replay was graded again';
END;
$$;
