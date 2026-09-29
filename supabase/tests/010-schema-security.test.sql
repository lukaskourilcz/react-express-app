-- The browser holds the anon key and a signed-in user's JWT, so anything the
-- `anon` and `authenticated` roles can reach is public. Every table keeps row
-- level security on, and every SECURITY DEFINER routine (they run as the owner
-- and skip RLS) is service-role only and pins its search_path.

DO $$
DECLARE
  v_bad TEXT;
  v_count INTEGER;
BEGIN
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO v_bad
    FROM pg_class c
   WHERE c.relnamespace = 'public'::regnamespace
     AND c.relkind IN ('r', 'p')
     AND NOT c.relrowsecurity;
  ASSERT v_bad IS NULL, format('tables without row level security: %s', v_bad);

  SELECT count(*) INTO v_count
    FROM pg_proc p
   WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef;
  ASSERT v_count > 50, format('expected the service routines to be SECURITY DEFINER, found %s', v_count);

  SELECT string_agg(p.oid::regprocedure::TEXT, ', ' ORDER BY 1) INTO v_bad
    FROM pg_proc p
   WHERE p.pronamespace = 'public'::regnamespace
     AND p.prosecdef
     AND NOT EXISTS (
       SELECT 1 FROM unnest(p.proconfig) AS setting
        WHERE setting LIKE 'search_path=%'
          AND setting NOT LIKE '%$user%'
          AND setting NOT LIKE '%pg_temp%'
     );
  ASSERT v_bad IS NULL, format('SECURITY DEFINER routines without a fixed search_path: %s', v_bad);

  SELECT string_agg(p.oid::regprocedure::TEXT, ', ' ORDER BY 1) INTO v_bad
    FROM pg_proc p
   WHERE p.pronamespace = 'public'::regnamespace
     AND p.prosecdef
     AND (has_function_privilege('anon', p.oid, 'EXECUTE')
          OR has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  ASSERT v_bad IS NULL, format('SECURITY DEFINER routines the browser roles can call: %s', v_bad);

  -- The server calls them all with the service role.
  SELECT string_agg(p.oid::regprocedure::TEXT, ', ' ORDER BY 1) INTO v_bad
    FROM pg_proc p
   WHERE p.pronamespace = 'public'::regnamespace
     AND p.prosecdef
     AND NOT has_function_privilege('service_role', p.oid, 'EXECUTE');
  ASSERT v_bad IS NULL, format('SECURITY DEFINER routines the service role cannot call: %s', v_bad);
END;
$$;

-- The same, observed the way the browser would: a signed-in session calling a
-- routine that credits coins is refused by the database itself.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}';
DO $$
BEGIN
  BEGIN
    PERFORM public.credit_tokens('aaaaaaaa-0000-4000-8000-000000000001', 'forged-credit-0001', 'webdev', 100000, 'adjustment', NULL);
    RAISE EXCEPTION 'an authenticated session could call credit_tokens';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  BEGIN
    PERFORM public.record_verified_quiz_result_v2('aaaaaaaa-0000-4000-8000-000000000001', 'forgedattempt0000001', 10, 10, NULL, NULL, 'webdev', 10000);
    RAISE EXCEPTION 'an authenticated session could record its own quiz result';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
