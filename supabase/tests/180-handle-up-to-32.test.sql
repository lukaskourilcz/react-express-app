-- A handle may be 32 characters from migration 055 (it was 24), so a
-- generated sharkname such as `shark-so-fat-it-cant-swim` fits. The start and
-- end rules and the reserved words stay, in the table's CHECKs and in
-- set_user_handle, which answers a refusal as 'invalid_handle'.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_long   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000180';
  v_other  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000181';
  v_32     CONSTANT TEXT := 'shark-so-fat-it-cant-swim-at-all';
  v_33     CONSTANT TEXT := 'shark-so-fat-it-cant-swim-at-all2';
  v_saved  TEXT;
  v_error  TEXT;
  v_bad    TEXT;
BEGIN
  ASSERT length(v_32) = 32 AND length(v_33) = 33, 'the fixtures are 32 and 33 characters';

  -- set_user_handle takes 32.
  v_saved := public.set_user_handle(v_long, v_32);
  ASSERT v_saved = v_32, format('a 32-character handle is saved, got %s', v_saved);
  ASSERT (SELECT handle FROM public.user_handles WHERE user_id = v_long) = v_32, 'and stored';

  -- 33 is refused by the routine, before the table sees it.
  BEGIN
    PERFORM public.set_user_handle(v_other, v_33);
    v_error := 'none';
  EXCEPTION WHEN OTHERS THEN v_error := SQLERRM;
  END;
  ASSERT v_error = 'invalid_handle', format('a 33-character handle is invalid_handle, got %s', v_error);

  -- The table refuses what the routine would, for any other write path.
  FOREACH v_bad IN ARRAY ARRAY[
    v_33,                 -- too long
    'ab',                 -- too short
    '-sharkie',           -- starts with a hyphen
    'sharkie_',           -- ends with an underscore
    'thirsty sharkie',    -- a space
    'tiburón-loco',       -- not ASCII
    'Shark',              -- reserved, in any case
    'devshark',
    'learner'
  ] LOOP
    BEGIN
      INSERT INTO public.user_handles (user_id, handle) VALUES (v_other, v_bad);
      v_error := 'none';
    EXCEPTION WHEN check_violation THEN v_error := 'check_violation';
    END;
    ASSERT v_error = 'check_violation', format('%L is refused by a CHECK, got %s', v_bad, v_error);
  END LOOP;

  -- Three characters, and underscores and hyphens inside, still pass.
  INSERT INTO public.user_handles (user_id, handle) VALUES (v_other, 'a_b');
  UPDATE public.user_handles SET handle = 'fin_de-fiesta' WHERE user_id = v_other;

  -- One CHECK carries the pattern: the old 24-character one is gone, not kept
  -- beside the new one.
  ASSERT (SELECT count(*) FROM pg_constraint
           WHERE conrelid = 'public.user_handles'::regclass
             AND contype = 'c'
             AND pg_get_constraintdef(oid) LIKE '%A-Za-z0-9%') = 1,
    'exactly one CHECK holds the handle pattern';
  ASSERT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.user_handles'::regclass
                    AND conname = 'user_handles_not_reserved'),
    'the reserved-words CHECK is still there';
END;
$$;
