-- Independent leaderboard identity and automatic positive Challenge scores.
BEGIN;
ALTER TABLE public.user_handles ADD COLUMN IF NOT EXISTS leaderboard_name_mode TEXT NOT NULL DEFAULT 'nickname'
  CHECK (leaderboard_name_mode IN ('nickname','account'));
ALTER TABLE public.user_handles ADD COLUMN IF NOT EXISTS leaderboard_account_name TEXT
  CHECK (leaderboard_account_name IS NULL OR (length(leaderboard_account_name) BETWEEN 1 AND 60 AND position('@' IN leaderboard_account_name) = 0));
ALTER TABLE public.challenge_scores DROP CONSTRAINT IF EXISTS challenge_scores_name_length;
ALTER TABLE public.challenge_scores ADD CONSTRAINT challenge_scores_name_length CHECK (char_length(name) BETWEEN 1 AND 60);
ALTER TABLE public.challenge_scores ADD COLUMN IF NOT EXISTS selected_topics JSONB;
ALTER TABLE public.challenge_scores ADD COLUMN IF NOT EXISTS all_topics BOOLEAN;
ALTER TABLE public.challenge_scores ADD CONSTRAINT positive_new_challenge_scores CHECK (score > 0) NOT VALID;
ALTER TABLE public.challenge_scores ADD CONSTRAINT challenge_topic_evidence CHECK (
  (selected_topics IS NULL AND all_topics IS NULL) OR
  (jsonb_typeof(selected_topics) = 'array' AND jsonb_array_length(selected_topics) BETWEEN 1 AND 50 AND all_topics IS NOT NULL)
) NOT VALID;

CREATE OR REPLACE FUNCTION public.ensure_stats_shark_name()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_handles WHERE user_id = NEW.user_id) THEN
    PERFORM public.allocate_shark_name('user:' || NEW.user_id, (ARRAY['sleepySharkie','sharkNoBueno','elTiburonLoco','thirstySharky','hungryFin','saltyShark'])[1 + floor(random()*6)::INTEGER], NEW.user_id);
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.ensure_stats_shark_name() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS ensure_stats_shark_name ON public.user_stats;
CREATE TRIGGER ensure_stats_shark_name AFTER INSERT ON public.user_stats
FOR EACH ROW EXECUTE FUNCTION public.ensure_stats_shark_name();
DROP TRIGGER IF EXISTS ensure_xp_shark_name ON public.user_xp_days;
CREATE TRIGGER ensure_xp_shark_name AFTER INSERT ON public.user_xp_days
FOR EACH ROW EXECUTE FUNCTION public.ensure_stats_shark_name();
DO $$ DECLARE one RECORD; BEGIN
  FOR one IN SELECT u.user_id FROM (SELECT user_id FROM public.user_stats UNION SELECT user_id FROM public.user_xp_days) u LEFT JOIN public.user_handles h ON h.user_id=u.user_id
    WHERE h.user_id IS NULL ORDER BY u.user_id LOOP
    PERFORM public.allocate_shark_name('user:' || one.user_id, 'sleepySharkie', one.user_id);
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.board_display_name(p_user_id TEXT)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE WHEN h.leaderboard_name_mode = 'account' THEN COALESCE(h.leaderboard_account_name, h.handle) ELSE h.handle END
  FROM public.user_handles h WHERE h.user_id = p_user_id
$$;
REVOKE ALL ON FUNCTION public.board_display_name(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.board_display_name(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.save_completed_challenge_score(
  p_run_id TEXT, p_user_id TEXT, p_subject TEXT, p_score INTEGER,
  p_base TEXT, p_topics JSONB, p_all_topics BOOLEAN
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE saved public.challenge_scores%ROWTYPE; allocation JSONB; shown TEXT;
BEGIN
  -- Reject zero before locks, naming, or an insert. Historic zeros remain history.
  IF p_score IS NULL OR p_score <= 0 THEN RETURN NULL; END IF;
  IF p_score > 1000 OR p_run_id IS NULL OR p_run_id !~ '^[A-Za-z0-9_-]{16,64}$' OR p_subject <> 'webdev'
    OR (p_topics IS NULL AND p_all_topics IS NOT NULL) OR (p_topics IS NOT NULL AND
      (jsonb_typeof(p_topics) <> 'array' OR jsonb_array_length(p_topics) NOT BETWEEN 1 AND 50 OR p_all_topics IS NULL)) THEN
    RAISE EXCEPTION 'invalid_challenge_score';
  END IF;
  -- Serialize a run before the global name lock, including retries from guests.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('challenge-score:' || p_run_id, 0));
  SELECT * INTO saved FROM public.challenge_scores WHERE run_id = p_run_id;
  IF FOUND THEN
    IF saved.user_id IS DISTINCT FROM p_user_id OR saved.subject <> p_subject OR saved.score <> p_score
      OR saved.selected_topics IS DISTINCT FROM p_topics OR saved.all_topics IS DISTINCT FROM p_all_topics THEN
      RAISE EXCEPTION 'challenge_score_conflict';
    END IF;
    RETURN to_jsonb(saved);
  END IF;
  allocation := public.allocate_shark_name(CASE WHEN p_user_id IS NULL THEN 'guest:' || p_run_id ELSE 'user:' || p_user_id END, p_base, p_user_id);
  shown := CASE WHEN p_user_id IS NULL THEN allocation->>'handle' ELSE public.board_display_name(p_user_id) END;
  INSERT INTO public.challenge_scores(run_id,user_id,subject,score,name,selected_topics,all_topics)
    VALUES(p_run_id,p_user_id,p_subject,p_score,shown,p_topics,p_all_topics) RETURNING * INTO saved;
  RETURN to_jsonb(saved);
END; $$;
REVOKE ALL ON FUNCTION public.save_completed_challenge_score(TEXT,TEXT,TEXT,INTEGER,TEXT,JSONB,BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_completed_challenge_score(TEXT,TEXT,TEXT,INTEGER,TEXT,JSONB,BOOLEAN) TO service_role;

CREATE OR REPLACE FUNCTION public.challenge_leaderboard(p_subject TEXT, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(id UUID, name TEXT, score INTEGER, created_at TIMESTAMPTZ, selected_topics JSONB, all_topics BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT c.id, CASE WHEN c.user_id IS NULL THEN c.name ELSE COALESCE(public.board_display_name(c.user_id), c.name) END,
    c.score,c.created_at,c.selected_topics,c.all_topics
  FROM public.challenge_scores c WHERE c.subject=p_subject AND c.score>0
  ORDER BY c.score DESC,c.created_at ASC,c.id ASC LIMIT LEAST(GREATEST(p_limit,1),50)
$$;
REVOKE ALL ON FUNCTION public.challenge_leaderboard(TEXT,INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.challenge_leaderboard(TEXT,INTEGER) TO service_role;
COMMIT;
