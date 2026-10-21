DO $$
DECLARE
  result JSONB;
  table_name TEXT;
  permission TEXT;
BEGIN
  INSERT INTO public.practice_sessions(session_id, user_id, minutes, status, updated_at) VALUES
    ('retention233old01', 'retention233', 15, 'finished', NOW() - INTERVAL '31 days'),
    ('retention233old02', 'retention233', 15, 'abandoned', NOW() - INTERVAL '31 days'),
    ('retention233new01', 'retention233', 15, 'finished', NOW() - INTERVAL '29 days'),
    ('retention233active', 'retention233', 15, 'active', NOW() - INTERVAL '31 days');
  result := public.purge_expired_learning_data(NOW() - INTERVAL '1 day');
  ASSERT (result->>'practiceSessions')::INTEGER = 2, 'daily purge must remove only old inactive sessions';
  ASSERT (SELECT count(*) FROM public.practice_sessions WHERE user_id = 'retention233') = 2;
  ASSERT EXISTS (SELECT 1 FROM public.practice_sessions WHERE session_id = 'retention233active');
  ASSERT (public.purge_expired_learning_data()->>'practiceSessions')::INTEGER = 0, 'repeated purge must be harmless';
  FOREACH table_name IN ARRAY ARRAY['app_settings','auth_events','daily_attempts','flashcards','question_edits','roadmap_progress','user_category_stats','user_stats','user_streak','user_xp','concept_reviews'] LOOP
    FOREACH permission IN ARRAY ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
      ASSERT NOT has_table_privilege('anon', 'public.' || table_name, permission), table_name || ': anonymous browser retains ' || permission;
      ASSERT NOT has_table_privilege('authenticated', 'public.' || table_name, permission), table_name || ': signed-in browser retains ' || permission;
    END LOOP;
    ASSERT NOT has_table_privilege('anon', 'public.' || table_name, 'SELECT');
    ASSERT has_table_privilege('service_role', 'public.' || table_name, 'SELECT'), table_name || ': service lost read access';
    IF table_name NOT IN ('app_settings','auth_events','question_edits') THEN
      ASSERT has_table_privilege('authenticated', 'public.' || table_name, 'SELECT'), table_name || ': personal read access lost';
    ELSE
      ASSERT NOT has_table_privilege('authenticated', 'public.' || table_name, 'SELECT');
    END IF;
  END LOOP;
END;
$$;
