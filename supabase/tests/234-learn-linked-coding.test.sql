DO $$
DECLARE
  learner CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000002341';
  attempt CONSTANT TEXT := 'linkedlearnattempt2341';
BEGIN
  PERFORM public.record_roadmap_answer_v2(attempt, learner, 'q1', 0, 0, 'webdev', 'javascript', 'level', 1, 1, 100);
  UPDATE public.roadmap_attempts SET coding_task_ids = '["js-double-numbers"]'::jsonb WHERE attempt_id = attempt;
  ASSERT NOT public.complete_verified_roadmap_attempt(learner, attempt, '["js-double-numbers"]'::jsonb);
  ASSERT (SELECT completed_at IS NULL FROM public.roadmap_attempts WHERE attempt_id = attempt), 'a pending coding task must leave Learn open';
  ASSERT NOT EXISTS (SELECT 1 FROM public.user_stats WHERE user_id = learner), 'waiting cannot count a streak day';
  BEGIN
    PERFORM public.record_coding_verdict(learner, 'linkedwrong2341', 'js-sum-array', 'javascript', 'passed', TRUE, 25, 'webdev', attempt);
    RAISE EXCEPTION 'unsealed task accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'invalid_roadmap_attempt' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.complete_verified_roadmap_attempt(learner, attempt, '[]'::jsonb);
    RAISE EXCEPTION 'coding gate omitted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'invalid_roadmap_attempt' THEN RAISE; END IF;
  END;
  PERFORM public.record_coding_verdict(learner, 'linkedcoding2341', 'js-double-numbers', 'javascript', 'passed', TRUE, 25, 'webdev', attempt);
  ASSERT public.complete_verified_roadmap_attempt(learner, attempt, '["js-double-numbers"]'::jsonb), 'a linked pass completes its original attempt';
  BEGIN
    PERFORM public.record_coding_reveal(learner, 'js-double-numbers', 'javascript', attempt);
    RAISE EXCEPTION 'closed attempt accepted another write';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'invalid_roadmap_attempt' THEN RAISE; END IF;
  END;

  PERFORM public.record_roadmap_answer_v2('linkedlearnattempt2342', learner, 'q1', 0, 0, 'webdev', 'javascript', 'level', 1, 1, 100);
  UPDATE public.roadmap_attempts SET coding_task_ids = '["js-double-numbers"]'::jsonb WHERE attempt_id = 'linkedlearnattempt2342';
  PERFORM public.record_coding_reveal(learner, 'js-double-numbers', 'javascript', 'linkedlearnattempt2342');
  ASSERT public.complete_verified_roadmap_attempt(learner, 'linkedlearnattempt2342', '["js-double-numbers"]'::jsonb);
  ASSERT (SELECT NOT passed AND completed_at IS NOT NULL FROM public.roadmap_attempts WHERE attempt_id = 'linkedlearnattempt2342'), 'a reveal still ends Learn without a pass';
END;
$$;
