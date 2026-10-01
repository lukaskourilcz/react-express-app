-- A learner who types into every exercise of a path keeps a draft of each,
-- and a pass keeps its draft: it is the only copy of the passed code the
-- server holds, so the exercise reopens with what the learner wrote. The
-- API's cap is PATH_LIMITS.draftsPerEnrollment (60); DSA has 30 code
-- exercises, and at the cap of 20 the API sent before, the 21st autosave was
-- refused as too_many_drafts.

DO $$
DECLARE
  v_user CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001701';
  v_enrollment CONSTANT TEXT := 'draftcapenroll170001';
  v_activity TEXT;
  v_attempt TEXT;
  r JSONB;
BEGIN
  PERFORM public.upsert_learning_path_enrollment(v_user, v_enrollment, 'dsa-foundations', 1, NULL, 'enroll');
  FOR i IN 1..30 LOOP
    v_activity := 'dsa-cap-ex-' || lpad(i::TEXT, 2, '0');
    v_attempt := 'draftcapattempt' || lpad(i::TEXT, 5, '0');
    r := public.save_learning_path_draft(v_user, v_enrollment, v_activity, 0, '{"code":"a"}', 60);
    ASSERT (r ->> 'ok')::BOOLEAN, format('exercise %s: the first autosave was refused: %s', i, r);
    r := public.save_learning_path_draft(v_user, v_enrollment, v_activity, 1, jsonb_build_object('code', 'passing code ' || i), 60);
    ASSERT (r ->> 'ok')::BOOLEAN, format('exercise %s: the second autosave was refused: %s', i, r);
    PERFORM public.open_learning_path_attempt(v_user, v_attempt, v_enrollment, v_activity, 'exercise', 1, 1, 60);
    r := public.accept_learning_path_result(v_user, v_attempt, 'draftcapkey' || lpad(i::TEXT, 9, '0'),
      'draftcaphash' || lpad(i::TEXT, 8, '0'), 'dsa-cap-module', 'verified_pass', 'machine_verified',
      1, NULL, NULL, NULL, FALSE, '{}');
    ASSERT (r ->> 'ok')::BOOLEAN, format('exercise %s: the pass was not accepted: %s', i, r);
    ASSERT (SELECT content ->> 'code' FROM public.learning_path_drafts
             WHERE enrollment_id = v_enrollment AND activity_id = v_activity) = 'passing code ' || i,
      format('exercise %s lost the learner''s code with the pass', i);
  END LOOP;
  ASSERT (SELECT count(*) FROM public.learning_path_drafts WHERE enrollment_id = v_enrollment) = 30,
    'thirty exercises do not each keep their draft';

  -- The cap still refuses a draft past it.
  r := public.save_learning_path_draft(v_user, v_enrollment, 'dsa-cap-ex-31', 0, '{"code":"b"}', 30);
  ASSERT r ->> 'reason' = 'too_many_drafts', format('a draft past the cap answered %s', r);

  -- A later failed attempt changes the draft no more than the pass did.
  PERFORM public.open_learning_path_attempt(v_user, 'draftcapattempt00099', v_enrollment, 'dsa-cap-ex-01', 'exercise', 1, 1, 60);
  PERFORM public.accept_learning_path_result(v_user, 'draftcapattempt00099', 'draftcapkey000000099', 'draftcaphash00000099',
    'dsa-cap-module', 'needs_revision', 'machine_verified', 0.2, NULL, NULL, NULL, FALSE, '{}');
  ASSERT (SELECT revision FROM public.learning_path_drafts WHERE enrollment_id = v_enrollment AND activity_id = 'dsa-cap-ex-01') = 2,
    'a failed attempt changed the draft';
END;
$$;
