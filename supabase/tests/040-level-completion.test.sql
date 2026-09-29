-- A Learn level is graded on the server from the answers it stored. The first
-- answer to a question is final, a level completes once and only when every
-- question was answered, a level with coding tasks passes only when each task
-- has a passing verdict for that attempt, and nobody can complete another
-- account's attempt. Replaying a passed level adds nothing to the 30-day board.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_user  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000040';
  v_other CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000041';
  v_answer JSONB;
  v_done BOOLEAN;
  v_level JSONB;
  v_passed BOOLEAN;
  v_answered INTEGER;
BEGIN
  -- Level html/1: two questions, 50% to pass.
  PERFORM public.record_roadmap_answer_v2('levelattempt00000001', v_user, 'q1', 1, 1, 'webdev', 'html', 'level', 1, 2, 50);
  v_answer := public.record_roadmap_answer_v2('levelattempt00000001', v_user, 'q2', 0, 1, 'webdev', 'html', 'level', 1, 2, 50);
  ASSERT (v_answer ->> 'isCorrect')::BOOLEAN IS FALSE, 'a wrong answer is graded wrong';
  v_answer := public.record_roadmap_answer_v2('levelattempt00000001', v_user, 'q2', 1, 1, 'webdev', 'html', 'level', 1, 2, 50);
  ASSERT (v_answer ->> 'isCorrect')::BOOLEAN IS FALSE AND (v_answer ->> 'selectedIndex')::INT = 0,
    format('the first answer is final; answering again replays it: %s', v_answer);

  -- Someone else cannot complete it.
  BEGIN
    PERFORM public.complete_verified_roadmap_attempt(v_other, 'levelattempt00000001');
    RAISE EXCEPTION 'another account completed this attempt';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'invalid_roadmap_attempt', format('another account is refused with invalid_roadmap_attempt, got %s', SQLERRM);
  END;

  v_done := public.complete_verified_roadmap_attempt(v_user, 'levelattempt00000001');
  ASSERT v_done IS TRUE, 'a fully answered attempt completes';
  SELECT data #> '{html,levels,1}' INTO v_level FROM public.roadmap_progress WHERE user_id = v_user;
  ASSERT (v_level ->> 'passed')::BOOLEAN AND (v_level ->> 'bestPct')::INT = 50,
    format('1 of 2 at a 50%% bar passes with 50%%: %s', v_level);

  v_done := public.complete_verified_roadmap_attempt(v_user, 'levelattempt00000001');
  ASSERT v_done IS FALSE, 'a completed attempt does not complete twice';

  SELECT SUM(answered)::INT INTO v_answered FROM public.user_activity_days WHERE user_id = v_user AND category = 'html';
  ASSERT v_answered = 2, format('the two answers count once toward the 30-day board, got %s', v_answered);
  -- Replaying the passed level is review.
  PERFORM public.record_roadmap_answer_v2('levelattempt00000002', v_user, 'q3', 1, 1, 'webdev', 'html', 'level', 1, 2, 50);
  SELECT SUM(answered)::INT INTO v_answered FROM public.user_activity_days WHERE user_id = v_user AND category = 'html';
  ASSERT v_answered = 2, format('answers in a passed level add nothing to the board, got %s', v_answered);

  -- Half answered: refused.
  BEGIN
    PERFORM public.complete_verified_roadmap_attempt(v_user, 'levelattempt00000002');
    RAISE EXCEPTION 'a half-answered attempt completed';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'incomplete_roadmap_attempt', format('a half-answered attempt is refused with incomplete_roadmap_attempt, got %s', SQLERRM);
  END;

  -- A level with a coding task and no passing verdict does not pass, however
  -- good the answers were.
  PERFORM public.record_roadmap_answer_v2('levelattempt00000003', v_user, 'q1', 1, 1, 'webdev', 'javascript', 'level', 2, 1, 50);
  v_done := public.complete_verified_roadmap_attempt(v_user, 'levelattempt00000003', '["js-double-numbers"]');
  SELECT passed INTO v_passed FROM public.roadmap_attempts WHERE attempt_id = 'levelattempt00000003';
  ASSERT v_done IS TRUE AND v_passed IS FALSE, 'the coding gate holds the level back without a passing verdict';
  SELECT (data #>> '{javascript,levels,2,passed}')::BOOLEAN INTO v_passed FROM public.roadmap_progress WHERE user_id = v_user;
  ASSERT v_passed IS FALSE, 'the level is not marked passed';

  -- With the verdict recorded against the attempt, it passes.
  PERFORM public.record_roadmap_answer_v2('levelattempt00000004', v_user, 'q1', 1, 1, 'webdev', 'javascript', 'level', 2, 1, 50);
  PERFORM public.record_coding_verdict(v_user, 'codingattempt00040', 'js-double-numbers', 'javascript', 'passed', TRUE, 20, 'webdev', 'levelattempt00000004');
  v_done := public.complete_verified_roadmap_attempt(v_user, 'levelattempt00000004', '["js-double-numbers"]');
  SELECT (data #>> '{javascript,levels,2,passed}')::BOOLEAN INTO v_passed FROM public.roadmap_progress WHERE user_id = v_user;
  ASSERT v_done IS TRUE AND v_passed IS TRUE, 'a passing verdict for this attempt lets the level pass';
END;
$$;
