-- Migration 054: a path is finished only when one enrollment, of one
-- curriculum version, has every module completed. Before 054,
-- path_is_complete counted completed rows across every enrollment of the path,
-- so five modules finished under version 1 and five under version 2 read as a
-- finished ten-module path, and its package could be claimed.

DO $$
DECLARE
  v_user CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001721';
  v_v1 CONSTANT TEXT := 'versionenroll1720001';
  v_v2 CONSTANT TEXT := 'versionenroll1720002';
BEGIN
  PERFORM public.upsert_learning_path_enrollment(v_user, v_v1, 'dsa-foundations', 1, NULL, 'enroll');
  PERFORM public.upsert_learning_path_enrollment(v_user, v_v2, 'dsa-foundations', 2, NULL, 'enroll');
  INSERT INTO public.learning_path_progress (enrollment_id, user_id, module_id, curriculum_version, completed_at)
  SELECT v_v1, v_user, 'dsa-v1-d0' || n, 1, NOW() FROM generate_series(1, 5) AS n;
  INSERT INTO public.learning_path_progress (enrollment_id, user_id, module_id, curriculum_version, completed_at)
  SELECT v_v2, v_user, 'dsa-v1-d0' || n, 2, NOW() FROM generate_series(1, 5) AS n;

  ASSERT NOT public.path_is_complete(v_user, 'dsa-foundations', 10),
    'five modules under version 1 and five under version 2 read as a finished ten-module path';
  ASSERT NOT public.path_is_complete(v_user, 'dsa-foundations', 10, 1), 'version 1 has five of ten';
  ASSERT NOT public.path_is_complete(v_user, 'dsa-foundations', 10, 2), 'version 2 has five of ten';

  -- The package cannot be claimed on the mix either.
  BEGIN
    PERFORM public.claim_path_reward(v_user, 'dsa-foundations', 10, 'M', 'Ann Learner', 'Street 1', NULL, 'Brno', '60200', 'CZ');
    RAISE EXCEPTION 'a package was claimed on modules finished under two curriculum versions';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'path_not_complete', format('the mixed claim failed with %s, not path_not_complete', SQLERRM);
  END;

  -- Version 2 finished on its own is a finished path, for that version only.
  INSERT INTO public.learning_path_progress (enrollment_id, user_id, module_id, curriculum_version, completed_at)
  SELECT v_v2, v_user, 'dsa-v1-d' || lpad(n::TEXT, 2, '0'), 2, NOW() FROM generate_series(6, 10) AS n;
  ASSERT public.path_is_complete(v_user, 'dsa-foundations', 10), 'ten modules in one enrollment are a finished path';
  ASSERT public.path_is_complete(v_user, 'dsa-foundations', 10, 2), 'version 2 is finished';
  ASSERT NOT public.path_is_complete(v_user, 'dsa-foundations', 10, 1), 'version 1 is still unfinished';

  -- A module started but not completed does not count; nor does another path.
  UPDATE public.learning_path_progress SET completed_at = NULL WHERE enrollment_id = v_v2 AND module_id = 'dsa-v1-d10';
  ASSERT NOT public.path_is_complete(v_user, 'dsa-foundations', 10, 2), 'an unfinished module counted';
  ASSERT NOT public.path_is_complete(v_user, 'fde', 1), 'progress in one path finished another';
  ASSERT NOT public.path_is_complete(v_user, 'dsa-foundations', 0), 'a path with no modules is never finished';
  UPDATE public.learning_path_progress SET completed_at = NOW() WHERE enrollment_id = v_v2 AND module_id = 'dsa-v1-d10';

  -- Claimed for the version the deployment publishes: granted once.
  ASSERT (SELECT granted FROM public.claim_path_reward(v_user, 'dsa-foundations', 10, 'M', 'Ann Learner', 'Street 1', NULL,
           'Brno', '60200', 'CZ', p_curriculum_version => 2)), 'the finished version''s package was refused';
  ASSERT (SELECT already FROM public.claim_path_reward(v_user, 'dsa-foundations', 10, 'M', 'Ann Learner', 'Street 1', NULL,
           'Brno', '60200', 'CZ', p_curriculum_version => 2)), 'a second claim was not answered as the first';
END;
$$;

-- A learner who finished only an older version cannot claim for the current one.
DO $$
DECLARE
  v_user CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001722';
BEGIN
  PERFORM public.upsert_learning_path_enrollment(v_user, 'versionenroll1720003', 'dsa-foundations', 1, NULL, 'enroll');
  INSERT INTO public.learning_path_progress (enrollment_id, user_id, module_id, curriculum_version, completed_at)
  SELECT 'versionenroll1720003', v_user, 'dsa-v1-d' || lpad(n::TEXT, 2, '0'), 1, NOW() FROM generate_series(1, 10) AS n;
  BEGIN
    PERFORM public.claim_path_reward(v_user, 'dsa-foundations', 10, 'L', 'Ben Learner', 'Street 2', NULL, 'Brno', '60200', 'CZ',
      p_curriculum_version => 2);
    RAISE EXCEPTION 'a package was claimed for a version the learner has not finished';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'path_not_complete', format('the claim failed with %s, not path_not_complete', SQLERRM);
  END;
END;
$$;
