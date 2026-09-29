-- Migration 054: a pass removes the activity's draft, so a learner who types
-- into every exercise of a path never reaches the per-enrollment draft cap.
-- DSA has 30 code exercises; before 054 no draft was ever removed, and the
-- 21st autosave of an enrollment was refused as too_many_drafts.

-- Thirty exercises, each autosaved twice, submitted and passed, under the cap
-- of 20 the API sent before 054.
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
    r := public.save_learning_path_draft(v_user, v_enrollment, v_activity, 0, '{"code":"a"}', 20);
    ASSERT (r ->> 'ok')::BOOLEAN, format('exercise %s: the first autosave was refused: %s', i, r);
    r := public.save_learning_path_draft(v_user, v_enrollment, v_activity, 1, '{"code":"ab"}', 20);
    ASSERT (r ->> 'ok')::BOOLEAN, format('exercise %s: the second autosave was refused: %s', i, r);
    PERFORM public.open_learning_path_attempt(v_user, v_attempt, v_enrollment, v_activity, 'exercise', 1, 1, 60);
    r := public.accept_learning_path_result(v_user, v_attempt, 'draftcapkey' || lpad(i::TEXT, 9, '0'),
      'draftcaphash' || lpad(i::TEXT, 8, '0'), 'dsa-cap-module', 'verified_pass', 'machine_verified',
      1, NULL, NULL, NULL, FALSE, '{}');
    ASSERT (r ->> 'ok')::BOOLEAN, format('exercise %s: the pass was not accepted: %s', i, r);
    ASSERT NOT EXISTS (
      SELECT 1 FROM public.learning_path_drafts WHERE enrollment_id = v_enrollment AND activity_id = v_activity
    ), format('exercise %s kept its draft after the pass', i);
  END LOOP;
  ASSERT (SELECT count(*) FROM public.learning_path_drafts WHERE enrollment_id = v_enrollment) = 0,
    'thirty passed exercises left drafts behind';
END;
$$;

-- What a pass removes, and what it leaves.
DO $$
DECLARE
  v_user CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001702';
  v_enrollment CONSTANT TEXT := 'draftpassenroll17002';
  r JSONB;
BEGIN
  PERFORM public.upsert_learning_path_enrollment(v_user, v_enrollment, 'fde', 1, 'fullstack', 'enroll');

  -- A failed attempt keeps the draft for the next one.
  r := public.save_learning_path_draft(v_user, v_enrollment, 'fde-code-one', 0, '{"code":"x"}', 60);
  PERFORM public.open_learning_path_attempt(v_user, 'draftpassattempt0001', v_enrollment, 'fde-code-one', 'exercise', 1, 1, 60);
  PERFORM public.accept_learning_path_result(v_user, 'draftpassattempt0001', 'draftpasskey00000001', 'draftpasshash0000001',
    'fde-module-one', 'needs_revision', 'machine_verified', 0.4, NULL, NULL, NULL, FALSE, '{}');
  ASSERT (SELECT revision FROM public.learning_path_drafts WHERE enrollment_id = v_enrollment AND activity_id = 'fde-code-one') = 1,
    'a failed attempt removed or changed the draft';

  -- A submitted write-up (self_reviewed) removes its draft.
  r := public.save_learning_path_draft(v_user, v_enrollment, 'fde-brief-one', 0, '{"artifact":{"scope":"x"}}', 60);
  r := public.save_learning_path_draft(v_user, v_enrollment, 'fde-brief-one', 1, '{"artifact":{"scope":"xy"}}', 60);
  PERFORM public.open_learning_path_attempt(v_user, 'draftpassattempt0002', v_enrollment, 'fde-brief-one', 'project', 1, 1, 60);
  PERFORM public.accept_learning_path_result(v_user, 'draftpassattempt0002', 'draftpasskey00000002', 'draftpasshash0000002',
    'fde-module-one', 'self_reviewed', 'self_reviewed', NULL, NULL, NULL, '{"scope":"xy"}', FALSE, '{}');
  ASSERT NOT EXISTS (SELECT 1 FROM public.learning_path_drafts WHERE enrollment_id = v_enrollment AND activity_id = 'fde-brief-one'),
    'a submitted write-up kept its draft';

  -- A device that still holds revision 2 of the removed draft saves again:
  -- there is nothing newer to protect, so the save starts a new draft instead
  -- of answering "a newer draft was saved elsewhere".
  r := public.save_learning_path_draft(v_user, v_enrollment, 'fde-brief-one', 2, '{"artifact":{"scope":"xyz"}}', 60);
  ASSERT (r ->> 'ok')::BOOLEAN AND (r ->> 'revision')::INTEGER = 1,
    format('a save after the draft was removed answered %s, not a new draft at revision 1', r);

  -- A draft that exists still has to be edited at its own revision.
  r := public.save_learning_path_draft(v_user, v_enrollment, 'fde-brief-one', 5, '{"artifact":{"scope":"stale"}}', 60);
  ASSERT r ->> 'reason' = 'conflict' AND (r ->> 'revision')::INTEGER = 1,
    format('a stale save of an existing draft answered %s, not a conflict at revision 1', r);
  ASSERT (SELECT content FROM public.learning_path_drafts WHERE enrollment_id = v_enrollment AND activity_id = 'fde-brief-one')
    = '{"artifact":{"scope":"xyz"}}'::JSONB, 'a stale save overwrote the newer draft';

  -- The cap still holds for new drafts, whatever revision they name.
  r := public.save_learning_path_draft(v_user, v_enrollment, 'fde-code-two', 3, '{"code":"y"}', 2);
  ASSERT r ->> 'reason' = 'too_many_drafts', format('a draft past the cap answered %s', r);

  -- And another learner still cannot write into this enrollment.
  r := public.save_learning_path_draft('aaaaaaaa-0000-4000-8000-000000001703', v_enrollment, 'fde-code-three', 0, '{"code":"z"}', 60);
  ASSERT r ->> 'reason' = 'not_found', format('another learner''s save answered %s', r);
END;
$$;
