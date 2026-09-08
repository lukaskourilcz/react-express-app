-- Integration checks for the learner profile, puzzle evidence, the coding
-- library and practice sessions (issues #151, #154, #157, #159, #160).
-- Run against a database with migrations 001-029 applied:
--   psql -v ON_ERROR_STOP=1 -d <db> -f scripts/sql/test-learning.sql
\set ON_ERROR_STOP on
SET client_min_messages = notice;

DO $$
DECLARE
  u TEXT := 'user-profile-1';
  n BIGINT;
BEGIN
  DELETE FROM public.learner_profiles WHERE user_id = u;

  -- 1. A profile row holds an object or nothing, and the draft is always an object.
  INSERT INTO public.learner_profiles (user_id, version, profile, draft)
  VALUES (u, 1, NULL, '{"baseTrack":"frontend"}'::jsonb);
  SELECT COUNT(*) INTO n FROM public.learner_profiles WHERE user_id = u AND profile IS NULL;
  ASSERT n = 1, 'an interrupted registration stores a draft with no profile';

  BEGIN
    UPDATE public.learner_profiles SET draft = '[]'::jsonb WHERE user_id = u;
    ASSERT FALSE, 'a non-object draft must be refused';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  UPDATE public.learner_profiles
     SET profile = '{"version":1,"baseTrack":"frontend","fde":false,"dsa":true,"goals":["first-job"],"experience":"new","studyMinutes":10}'::jsonb
   WHERE user_id = u;
  SELECT COUNT(*) INTO n FROM public.learner_profiles WHERE user_id = u AND profile->>'baseTrack' = 'frontend';
  ASSERT n = 1, 'a completed profile is stored';
  RAISE NOTICE 'learner profile: ok';
END $$;

DO $$
DECLARE
  u TEXT := 'user-puzzle-1';
  a TEXT := 'attempt-puzzle-1';
  r JSONB;
  n BIGINT;
BEGIN
  DELETE FROM public.coding_puzzle_results WHERE user_id = u;
  DELETE FROM public.coding_progress WHERE user_id = u;
  DELETE FROM public.roadmap_attempt_coding WHERE attempt_id = a;
  DELETE FROM public.roadmap_attempts WHERE attempt_id = a;

  INSERT INTO public.roadmap_attempts (attempt_id, user_id, subject, topic, kind, ref, total_questions, pass_pct, expires_at)
  VALUES (a, u, 'webdev', 'javascript', 'level', 6, 8, 75, NOW() + INTERVAL '1 hour');

  -- 1. A passed puzzle clears the level's coding requirement, unverified.
  r := public.record_coding_puzzle_result(u, 'puz-1', 'js-double-numbers', 'javascript', 1, TRUE,
    ARRAY['read-code','choose-method'], a, 4200);
  ASSERT (r->>'applied')::BOOLEAN, 'the result is recorded';
  ASSERT (r->>'satisfiesLevel')::BOOLEAN, 'and clears the level requirement';
  SELECT COUNT(*) INTO n FROM public.roadmap_attempt_coding
   WHERE attempt_id = a AND task_id = 'js-double-numbers' AND passed AND NOT verified;
  ASSERT n = 1, 'the level row is passed but not verified: this was not written code';

  -- 2. It is NOT recorded as coding progress: arranging is not writing.
  SELECT COUNT(*) INTO n FROM public.coding_progress WHERE user_id = u;
  ASSERT n = 0, 'a puzzle must never mark the coding task passed';

  -- 3. A replayed submit of the same sealed attempt changes nothing.
  r := public.record_coding_puzzle_result(u, 'puz-1', 'js-double-numbers', 'javascript', 1, TRUE,
    ARRAY['read-code'], a, 4200);
  ASSERT (r->>'applied')::BOOLEAN IS FALSE, 'a replay records nothing';
  SELECT COUNT(*) INTO n FROM public.coding_puzzle_results WHERE user_id = u;
  ASSERT n = 1, 'one row per sealed attempt';

  -- 4. A puzzle attempt against someone else's roadmap attempt clears nothing.
  r := public.record_coding_puzzle_result('user-puzzle-2', 'puz-2', 'js-even-numbers', 'javascript', 1, TRUE,
    ARRAY['read-code'], a, NULL);
  ASSERT (r->>'satisfiesLevel')::BOOLEAN IS FALSE, 'a level belonging to another learner is not cleared';
  RAISE NOTICE 'puzzle evidence: ok';
END $$;

DO $$
DECLARE
  u TEXT := 'user-library-1';
  n BIGINT;
BEGIN
  DELETE FROM public.coding_collection_items WHERE user_id = u;
  DELETE FROM public.coding_collections WHERE user_id = u;

  -- The API refuses the twenty-first collection; the trigger is the backstop.
  FOR n IN 1..20 LOOP
    INSERT INTO public.coding_collections (collection_id, user_id, name, position)
    VALUES ('col' || LPAD(n::TEXT, 6, '0'), u, 'List ' || n, n);
  END LOOP;
  BEGIN
    INSERT INTO public.coding_collections (collection_id, user_id, name, position)
    VALUES ('col000021', u, 'One too many', 21);
    ASSERT FALSE, 'the twenty-first collection must be refused';
  EXCEPTION WHEN OTHERS THEN
    ASSERT SQLERRM LIKE '%coding_collection_limit%', format('unexpected error: %s', SQLERRM);
  END;

  -- Deleting a collection takes its items with it.
  INSERT INTO public.coding_collection_items (collection_id, user_id, task_id, position)
  VALUES ('col000001', u, 'js-double-numbers', 0);
  DELETE FROM public.coding_collections WHERE collection_id = 'col000001';
  SELECT COUNT(*) INTO n FROM public.coding_collection_items WHERE collection_id = 'col000001';
  ASSERT n = 0, 'items cascade with their collection';
  RAISE NOTICE 'library: ok';
END $$;

DO $$
DECLARE
  u TEXT := 'user-session-1';
  n BIGINT;
BEGIN
  DELETE FROM public.practice_sessions WHERE user_id = u;

  INSERT INTO public.practice_sessions (session_id, user_id, minutes, task_ids)
  VALUES ('sess0001', u, 10, ARRAY['js-double-numbers']);
  -- One open session per learner, so a resume is unambiguous.
  BEGIN
    INSERT INTO public.practice_sessions (session_id, user_id, minutes, task_ids)
    VALUES ('sess0002', u, 20, ARRAY['js-even-numbers']);
    ASSERT FALSE, 'a second open session must be refused';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  UPDATE public.practice_sessions SET completed_at = NOW() WHERE session_id = 'sess0001';
  INSERT INTO public.practice_sessions (session_id, user_id, minutes, task_ids)
  VALUES ('sess0002', u, 20, ARRAY['js-even-numbers']);
  SELECT COUNT(*) INTO n FROM public.practice_sessions WHERE user_id = u;
  ASSERT n = 2, 'a closed session leaves room for the next one';

  -- An unoffered session length is refused.
  BEGIN
    INSERT INTO public.practice_sessions (session_id, user_id, minutes, task_ids)
    VALUES ('sess0003', 'user-session-2', 7, ARRAY[]::TEXT[]);
    ASSERT FALSE, 'an unoffered length must be refused';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- A skip reason outside the authored set is refused.
  BEGIN
    INSERT INTO public.coding_skips (user_id, task_id, track, reason)
    VALUES (u, 'js-double-numbers', 'javascript', 'bored');
    ASSERT FALSE, 'an unknown skip reason must be refused';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  INSERT INTO public.coding_skips (user_id, task_id, track, reason, note)
  VALUES (u, 'js-double-numbers', 'javascript', 'too-hard', 'stuck on the empty case');
  SELECT COUNT(*) INTO n FROM public.coding_skips WHERE user_id = u;
  ASSERT n = 1, 'a valid skip is recorded';
  RAISE NOTICE 'sessions and skips: ok';
END $$;

DO $$
DECLARE
  u TEXT := 'user-erase-2';
  n BIGINT;
BEGIN
  INSERT INTO public.learner_profiles (user_id, version, draft) VALUES (u, 1, '{}'::jsonb)
    ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.coding_bookmarks (user_id, task_id) VALUES (u, 'js-double-numbers')
    ON CONFLICT DO NOTHING;
  INSERT INTO public.coding_skips (user_id, task_id, track, reason) VALUES (u, 'js-double-numbers', 'javascript', 'later');
  INSERT INTO public.practice_sessions (session_id, user_id, minutes, task_ids) VALUES ('sess0004', u, 5, ARRAY[]::TEXT[])
    ON CONFLICT DO NOTHING;

  PERFORM public.delete_user_data(u);

  SELECT COUNT(*) INTO n FROM public.learner_profiles WHERE user_id = u;
  ASSERT n = 0, 'the learner profile is erased';
  SELECT COUNT(*) INTO n FROM public.coding_bookmarks WHERE user_id = u;
  ASSERT n = 0, 'bookmarks are erased';
  SELECT COUNT(*) INTO n FROM public.coding_skips WHERE user_id = u;
  ASSERT n = 0, 'skips are erased';
  SELECT COUNT(*) INTO n FROM public.practice_sessions WHERE user_id = u;
  ASSERT n = 0, 'practice sessions are erased';
  RAISE NOTICE 'account erasure: ok';
END $$;
