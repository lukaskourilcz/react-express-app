-- Migration 036: a nationality on the opt-in handle, and a friend row that
-- carries it.
-- Apply after migrations 001-035. Safe to re-run.
--
-- The friends list identifies people by avatar, flag and crown rather than by
-- name. That needs one fact the database did not hold: which country somebody
-- wants shown next to their avatar.
--
-- It lives on `user_handles` rather than on `user_stats` because that is the
-- table a learner fills in deliberately. `user_stats.name` and `.email` are
-- what an OAuth provider handed us and nobody chose to publish; the handle, and
-- now the country beside it, are the two things a learner picks knowing that
-- friends will see them. Nullable, because declaring one is optional and an
-- empty flag is a perfectly good answer.
--
-- ISO 3166-1 alpha-2 and nothing else. Two uppercase letters is a code a
-- browser can turn into a flag and into a localized country name on its own,
-- so no country list and no translated country names have to be maintained
-- here or in the client.

ALTER TABLE public.user_handles
  ADD COLUMN IF NOT EXISTS country TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.user_handles'::regclass
       AND conname = 'user_handles_country_check'
  ) THEN
    ALTER TABLE public.user_handles
      ADD CONSTRAINT user_handles_country_check
      CHECK (country IS NULL OR country ~ '^[A-Z]{2}$');
  END IF;
END $$;

-- Set it, or clear it. NULL and '' both mean "show no flag": the client sends
-- an empty string when the learner picks the blank option, and turning that
-- into a NULL here rather than storing an empty string keeps one meaning for
-- one state.
CREATE OR REPLACE FUNCTION public.set_user_country(p_user_id TEXT, p_country TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_clean TEXT := NULLIF(btrim(upper(COALESCE(p_country, ''))), '');
BEGIN
  IF v_clean IS NOT NULL AND v_clean !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'invalid_country';
  END IF;

  -- No row means no handle yet. A country without a handle would be a fact
  -- about somebody nobody can address, so it is refused rather than stored.
  UPDATE public.user_handles
     SET country = v_clean, updated_at = NOW()
   WHERE user_id = p_user_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'no_handle'; END IF;
  RETURN v_clean;
END;
$$;

-- Restated to carry the country. CREATE OR REPLACE cannot widen a function's
-- return type, so the old one is dropped first — the same rule that bit
-- refresh_streak_freezes in 032.
DROP FUNCTION IF EXISTS public.get_user_handle(TEXT);
CREATE OR REPLACE FUNCTION public.get_user_handle(p_user_id TEXT)
RETURNS TABLE (handle TEXT, discoverable BOOLEAN, country TEXT, can_change_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT h.handle, h.discoverable, h.country, h.handle_set_at + INTERVAL '30 days'
    FROM public.user_handles h
   WHERE h.user_id = p_user_id
$$;

-- Same for the list. The country joins the picture and the crown as something
-- shown and never ranked: the ORDER BY below is unchanged, still streak then
-- accuracy then handle. Where somebody is from moves them up nothing.
DROP FUNCTION IF EXISTS public.friend_list(TEXT, TEXT[]);
CREATE OR REPLACE FUNCTION public.friend_list(p_user_id TEXT, p_categories TEXT[])
RETURNS TABLE (
  handle          TEXT,
  picture         TEXT,
  country         TEXT,
  crown           BOOLEAN,
  current_streak  INTEGER,
  longest_streak  INTEGER,
  total_correct   INTEGER,
  total_questions INTEGER,
  accuracy_pct    INTEGER,
  active_today    BOOLEAN,
  since           TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  WITH mine AS (
    SELECT CASE WHEN f.user_low = p_user_id THEN f.user_high ELSE f.user_low END AS friend_id,
           COALESCE(f.responded_at, f.created_at) AS since
      FROM public.friendships f
     WHERE f.state = 'accepted'
       AND p_user_id IN (f.user_low, f.user_high)
  )
  SELECT h.handle,
         s.picture,
         h.country,
         EXISTS (
           SELECT 1 FROM public.cosmetic_entitlements ce
            WHERE ce.user_id = m.friend_id
              AND ce.cosmetic_id = 'crown'
              AND ce.equipped
         ),
         COALESCE(s.current_streak, 0)::INT,
         COALESCE(s.longest_streak, 0)::INT,
         COALESCE(c.total_correct, 0)::INT,
         COALESCE(c.total_questions, 0)::INT,
         CASE WHEN COALESCE(c.total_questions, 0) > 0
              THEN ROUND(100.0 * c.total_correct / c.total_questions)::INT
              ELSE 0 END,
         (s.last_quiz_date = (NOW() AT TIME ZONE 'UTC')::DATE) IS TRUE,
         m.since
    FROM mine m
    JOIN public.user_handles h ON h.user_id = m.friend_id
    LEFT JOIN public.user_stats s ON s.user_id = m.friend_id
    LEFT JOIN LATERAL (
      SELECT SUM(k.total_correct)   AS total_correct,
             SUM(k.total_questions) AS total_questions
        FROM public.user_category_stats k
       WHERE k.user_id = m.friend_id
         AND k.category = ANY(p_categories)
    ) c ON TRUE
   ORDER BY COALESCE(s.current_streak, 0) DESC,
            CASE WHEN COALESCE(c.total_questions, 0) > 0
                 THEN 100.0 * c.total_correct / c.total_questions
                 ELSE -1 END DESC,
            h.handle ASC
   LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.set_user_country(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_handle(TEXT)        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.friend_list(TEXT, TEXT[])    FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.set_user_country(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_handle(TEXT)        TO service_role;
GRANT EXECUTE ON FUNCTION public.friend_list(TEXT, TEXT[])    TO service_role;
