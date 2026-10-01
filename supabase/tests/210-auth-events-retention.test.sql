-- The sign-in log keeps a record for 12 months (migration 058, privacy
-- policy "How long devShark keeps data"). The daily retention routine deletes
-- older records, keeps newer ones, leaves every account's recent sign-ins in
-- place, and reports how many it removed. The period does not follow
-- p_before, which sets the 90-day learning window.

DO $$
DECLARE
  v_user CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000002101';
  v_other CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000002102';
  r JSONB;
BEGIN
  INSERT INTO public.auth_events (user_id, email, provider, event_type, created_at) VALUES
    (v_user,  'learner210@example.com', 'google', 'register', NOW() - INTERVAL '13 months'),
    (v_user,  'learner210@example.com', 'google', 'login',    NOW() - INTERVAL '12 months' - INTERVAL '1 day'),
    (v_user,  'learner210@example.com', 'google', 'login',    NOW() - INTERVAL '11 months'),
    (v_user,  'learner210@example.com', 'email',  'login',    NOW() - INTERVAL '1 day'),
    (v_other, 'other210@example.com',   'email',  'register', NOW() - INTERVAL '2 years'),
    (v_other, 'other210@example.com',   'email',  'login',    NOW());

  r := public.purge_expired_learning_data();

  ASSERT (r ->> 'authEvents')::INTEGER = 3, format('expected three sign-in records older than 12 months to go, the purge reported %s', r);
  ASSERT NOT EXISTS (SELECT 1 FROM public.auth_events WHERE created_at < NOW() - INTERVAL '12 months'),
    'a sign-in record older than 12 months survived the purge';
  ASSERT (SELECT count(*) FROM public.auth_events WHERE user_id = v_user) = 2,
    'the learner''s sign-ins of the last 12 months were not all kept';
  ASSERT (SELECT count(*) FROM public.auth_events WHERE user_id = v_other) = 1,
    'the other account''s sign-in of today was not kept';

  -- A shorter learning window passed by hand leaves the 12-month rule alone.
  r := public.purge_expired_learning_data(NOW() - INTERVAL '1 day');
  ASSERT (r ->> 'authEvents')::INTEGER = 0, format('a p_before of one day removed sign-in records: %s', r);
  ASSERT (SELECT count(*) FROM public.auth_events WHERE user_id IN (v_user, v_other)) = 3,
    'the sign-in log lost a record younger than 12 months';

  -- The routine stays service-role only.
  ASSERT NOT has_function_privilege('authenticated', 'public.purge_expired_learning_data(timestamptz)', 'EXECUTE'),
    'a signed-in browser can run the retention purge';
  ASSERT NOT has_function_privilege('anon', 'public.purge_expired_learning_data(timestamptz)', 'EXECUTE'),
    'an anonymous browser can run the retention purge';
END;
$$;
