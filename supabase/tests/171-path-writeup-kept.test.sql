-- Migration 054: a submitted write-up (self_reviewed) is never demoted by a
-- weaker later result, the way a verified pass already was not. Before 054, a
-- write-up resubmitted with a required field left empty dropped to
-- needs_revision while its module stayed completed.

DO $$
DECLARE
  v_user CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001711';
  v_enrollment CONSTANT TEXT := 'writeupenroll1710001';
  v_state JSONB;
  r JSONB;
BEGIN
  PERFORM public.upsert_learning_path_enrollment(v_user, v_enrollment, 'fde', 1, 'fullstack', 'enroll');

  -- The write-up is submitted in full and completes its module.
  PERFORM public.open_learning_path_attempt(v_user, 'writeupattempt000001', v_enrollment, 'fde-v1-m01-scope-brief', 'project', 1, 1, 60);
  r := public.accept_learning_path_result(v_user, 'writeupattempt000001', 'writeupkey0000000001', 'writeuphash000000001',
    'fde-v1-m01', 'self_reviewed', 'self_reviewed', NULL, NULL, NULL, '{"scope":"full"}', TRUE, '{}');
  ASSERT (r ->> 'ok')::BOOLEAN, format('the first submission was not accepted: %s', r);

  -- Resubmitted with a required field cleared.
  PERFORM public.open_learning_path_attempt(v_user, 'writeupattempt000002', v_enrollment, 'fde-v1-m01-scope-brief', 'project', 1, 1, 60);
  r := public.accept_learning_path_result(v_user, 'writeupattempt000002', 'writeupkey0000000002', 'writeuphash000000002',
    'fde-v1-m01', 'needs_revision', 'self_reviewed', NULL, NULL, NULL, '{"scope":""}', FALSE, '{}');
  ASSERT (r ->> 'ok')::BOOLEAN, format('the resubmission was not accepted: %s', r);

  SELECT activity_states -> 'fde-v1-m01-scope-brief' INTO v_state
    FROM public.learning_path_progress WHERE enrollment_id = v_enrollment AND module_id = 'fde-v1-m01';
  ASSERT v_state ->> 'state' = 'self_reviewed',
    format('a resubmission with a field left empty demoted the submitted write-up to %s', v_state ->> 'state');
  ASSERT v_state ->> 'verification' = 'self_reviewed', 'the kept write-up lost its verification kind';
  ASSERT (v_state ->> 'attempts')::INTEGER = 2, 'the resubmission was not counted as an attempt';
  ASSERT (SELECT completed_at IS NOT NULL FROM public.learning_path_progress
           WHERE enrollment_id = v_enrollment AND module_id = 'fde-v1-m01'), 'the module lost its completion';
  -- The weaker attempt is still on record as evidence of its own.
  ASSERT (SELECT state FROM public.learning_path_evidence
           WHERE enrollment_id = v_enrollment AND activity_id = 'fde-v1-m01-scope-brief' AND revision = 2) = 'needs_revision',
    'the resubmission is missing from the evidence';

  -- A verified pass is still kept against a weaker result.
  PERFORM public.open_learning_path_attempt(v_user, 'writeupattempt000003', v_enrollment, 'fde-v1-m01-check', 'exercise', 1, 1, 60);
  PERFORM public.accept_learning_path_result(v_user, 'writeupattempt000003', 'writeupkey0000000003', 'writeuphash000000003',
    'fde-v1-m01', 'verified_pass', 'machine_verified', 0.9, NULL, NULL, NULL, FALSE, '{}');
  PERFORM public.open_learning_path_attempt(v_user, 'writeupattempt000004', v_enrollment, 'fde-v1-m01-check', 'exercise', 1, 1, 60);
  PERFORM public.accept_learning_path_result(v_user, 'writeupattempt000004', 'writeupkey0000000004', 'writeuphash000000004',
    'fde-v1-m01', 'needs_revision', 'machine_verified', 0.3, NULL, NULL, NULL, FALSE, '{}');
  SELECT activity_states -> 'fde-v1-m01-check' INTO v_state
    FROM public.learning_path_progress WHERE enrollment_id = v_enrollment AND module_id = 'fde-v1-m01';
  ASSERT v_state ->> 'state' = 'verified_pass' AND (v_state ->> 'score')::NUMERIC = 0.9,
    format('a verified pass was demoted: %s', v_state);

  -- A write-up that has not been submitted yet still records needs_revision.
  PERFORM public.open_learning_path_attempt(v_user, 'writeupattempt000005', v_enrollment, 'fde-v1-m02-design-note', 'project', 1, 1, 60);
  PERFORM public.accept_learning_path_result(v_user, 'writeupattempt000005', 'writeupkey0000000005', 'writeuphash000000005',
    'fde-v1-m02', 'needs_revision', 'self_reviewed', NULL, NULL, NULL, '{"note":""}', FALSE, '{}');
  ASSERT (SELECT activity_states -> 'fde-v1-m02-design-note' ->> 'state' FROM public.learning_path_progress
           WHERE enrollment_id = v_enrollment AND module_id = 'fde-v1-m02') = 'needs_revision',
    'an incomplete first write-up is not recorded as needs_revision';
END;
$$;
