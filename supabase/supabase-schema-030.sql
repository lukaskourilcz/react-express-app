-- Migration 030: concept-level review state, so practice comes back to an idea
-- rather than to a question.
-- Apply after migrations 001-029. Safe to re-run.
--
-- There is already a review ladder for coding tasks (migration 025), keyed by
-- task. This one is keyed by *concept*: the thing being assessed rather than
-- the item that assessed it, so the next review can ask the same question a
-- different way instead of asking the same question again — which is what
-- separates checking retention from checking whether the answer position was
-- memorised.
--
-- Three things the schema itself enforces, rather than leaving to a caller:
--
--   * Owner isolation. Rows are readable by their owner and writable only by
--     the service role, like every other progress table here.
--   * Idempotency. record_concept_review takes an event id; replaying a submit
--     reports the state and changes nothing. Two devices submitting the same
--     attempt cannot double-advance an interval.
--   * The policy version travels with the row. Changing the interval ladder
--     later is a new policy, and rows written under the old one say so rather
--     than being silently reinterpreted.
--
-- What it deliberately does not do: award anything. Review reuses the existing
-- reward rules and grants nothing of its own, so there is no second XP system
-- and no repeated first-completion credit.

CREATE TABLE IF NOT EXISTS public.concept_reviews (
  user_id           TEXT        NOT NULL,
  concept_id        TEXT        NOT NULL,
  subject           TEXT        NOT NULL,
  -- 0..5 on the shipped ladder; the column is permissive so a longer ladder in
  -- a later policy does not need a migration to store its stages.
  stage             SMALLINT    NOT NULL DEFAULT 0 CHECK (stage BETWEEN 0 AND 15),
  due_at            TIMESTAMPTZ,
  streak            INTEGER     NOT NULL DEFAULT 0 CHECK (streak >= 0),
  last_item_id      TEXT,
  last_item_version TEXT,
  last_kind         TEXT        CHECK (last_kind IN ('independent', 'hinted', 'revealed', 'assisted')),
  last_correct      BOOLEAN,
  policy_version    INTEGER     NOT NULL DEFAULT 1,
  -- The last applied event, so a retry is recognised rather than re-applied.
  last_event_id     TEXT,
  reviews           INTEGER     NOT NULL DEFAULT 0 CHECK (reviews >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, concept_id)
);

CREATE INDEX IF NOT EXISTS concept_reviews_due_idx
  ON public.concept_reviews (user_id, due_at)
  WHERE due_at IS NOT NULL;

ALTER TABLE public.concept_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "concept_reviews_owner_select" ON public.concept_reviews;
CREATE POLICY "concept_reviews_owner_select"
  ON public.concept_reviews FOR SELECT
  USING (auth.uid()::text = user_id);

-- Writes go through the routine below, under the service role, so an interval
-- can never be advanced by a client claiming it answered correctly.
REVOKE INSERT, UPDATE, DELETE ON public.concept_reviews FROM anon, authenticated;

-- ── recording one review ───────────────────────────────────────────────────
--
-- p_due_at, p_stage and p_streak are computed by the server from the pure
-- policy in shared/spaced-practice.ts. The database's job is to apply them once
-- and exactly once, not to duplicate the ladder in PL/pgSQL where it would
-- drift from the version the tests cover.

CREATE OR REPLACE FUNCTION public.record_concept_review(
  p_user_id        TEXT,
  p_concept_id     TEXT,
  p_subject        TEXT,
  p_event_id       TEXT,
  p_stage          SMALLINT,
  p_due_at         TIMESTAMPTZ,
  p_streak         INTEGER,
  p_item_id        TEXT,
  p_item_version   TEXT,
  p_kind           TEXT,
  p_correct        BOOLEAN,
  p_policy_version INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.concept_reviews%ROWTYPE;
BEGIN
  INSERT INTO public.concept_reviews (user_id, concept_id, subject)
  VALUES (p_user_id, p_concept_id, p_subject)
  ON CONFLICT (user_id, concept_id) DO NOTHING;

  SELECT * INTO v_row FROM public.concept_reviews
   WHERE user_id = p_user_id AND concept_id = p_concept_id
   FOR UPDATE;

  IF v_row.last_event_id IS NOT NULL AND v_row.last_event_id = p_event_id THEN
    -- A replay: report what is stored, apply nothing.
    RETURN jsonb_build_object(
      'applied', FALSE, 'stage', v_row.stage, 'dueAt', v_row.due_at,
      'streak', v_row.streak, 'reviews', v_row.reviews
    );
  END IF;

  UPDATE public.concept_reviews
     SET stage = p_stage,
         due_at = p_due_at,
         streak = p_streak,
         last_item_id = p_item_id,
         last_item_version = p_item_version,
         last_kind = p_kind,
         last_correct = p_correct,
         policy_version = p_policy_version,
         last_event_id = p_event_id,
         reviews = reviews + 1,
         updated_at = NOW()
   WHERE user_id = p_user_id AND concept_id = p_concept_id
   RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'applied', TRUE, 'stage', v_row.stage, 'dueAt', v_row.due_at,
    'streak', v_row.streak, 'reviews', v_row.reviews
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_concept_review(
  TEXT, TEXT, TEXT, TEXT, SMALLINT, TIMESTAMPTZ, INTEGER, TEXT, TEXT, TEXT, BOOLEAN, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_concept_review(
  TEXT, TEXT, TEXT, TEXT, SMALLINT, TIMESTAMPTZ, INTEGER, TEXT, TEXT, TEXT, BOOLEAN, INTEGER
) TO service_role;

-- ── erasure ────────────────────────────────────────────────────────────────
-- Restated in full so the newest migration is the readable definition. The only
-- change from 028 is the concept_reviews line.

CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.matches WHERE host_id = p_user_id;
  DELETE FROM public.match_answers WHERE user_id = p_user_id;
  DELETE FROM public.match_participants WHERE user_id = p_user_id;
  DELETE FROM public.daily_attempts WHERE user_id = p_user_id;
  DELETE FROM public.flashcards WHERE user_id = p_user_id;
  DELETE FROM public.user_category_stats WHERE user_id = p_user_id;
  DELETE FROM public.roadmap_progress WHERE user_id = p_user_id;
  DELETE FROM public.user_streak WHERE user_id = p_user_id;
  DELETE FROM public.user_streak_config WHERE user_id = p_user_id;
  DELETE FROM public.user_streak_freezes WHERE user_id = p_user_id;
  DELETE FROM public.user_xp WHERE user_id = p_user_id;
  DELETE FROM public.user_badges WHERE user_id = p_user_id;
  DELETE FROM public.user_cards WHERE user_id = p_user_id;
  DELETE FROM public.daily_queue_completions WHERE user_id = p_user_id;
  DELETE FROM public.challenge_scores WHERE user_id = p_user_id;
  DELETE FROM public.auth_events WHERE user_id = p_user_id;
  DELETE FROM public.question_reports WHERE reporter_sub = p_user_id;
  DELETE FROM public.user_question_history WHERE user_id = p_user_id;
  DELETE FROM public.concept_reviews WHERE user_id = p_user_id;
  DELETE FROM public.practice_sessions WHERE user_id = p_user_id;
  DELETE FROM public.coding_puzzle_results WHERE user_id = p_user_id;
  DELETE FROM public.coding_skips WHERE user_id = p_user_id;
  DELETE FROM public.coding_collection_items
   WHERE collection_id IN (SELECT collection_id FROM public.coding_collections WHERE user_id = p_user_id);
  DELETE FROM public.coding_collections WHERE user_id = p_user_id;
  DELETE FROM public.coding_bookmarks WHERE user_id = p_user_id;
  DELETE FROM public.cosmetic_entitlements WHERE user_id = p_user_id;
  DELETE FROM public.token_ledger WHERE user_id = p_user_id;
  DELETE FROM public.token_balances WHERE user_id = p_user_id;
  DELETE FROM public.merch_order_items
   WHERE order_id IN (SELECT order_id FROM public.merch_orders
                       WHERE user_id = p_user_id AND state IN ('awaiting_payment', 'cancelled'));
  DELETE FROM public.merch_orders
   WHERE user_id = p_user_id AND state IN ('awaiting_payment', 'cancelled');
  UPDATE public.merch_orders
     SET user_id = 'deleted-account',
         ship_name = 'redacted', ship_line1 = 'redacted', ship_line2 = NULL,
         ship_city = 'redacted', ship_postal = 'redacted', updated_at = NOW()
   WHERE user_id = p_user_id;
  DELETE FROM public.learning_path_drafts WHERE user_id = p_user_id;
  DELETE FROM public.learning_path_progress WHERE user_id = p_user_id;
  DELETE FROM public.learning_path_evidence WHERE user_id = p_user_id;
  DELETE FROM public.learning_path_attempts WHERE user_id = p_user_id;
  DELETE FROM public.learning_path_enrollments WHERE user_id = p_user_id;
  DELETE FROM public.github_commits WHERE user_id = p_user_id;
  DELETE FROM public.github_connections WHERE user_id = p_user_id;
  DELETE FROM public.coding_drafts WHERE user_id = p_user_id;
  DELETE FROM public.coding_attempts WHERE user_id = p_user_id;
  DELETE FROM public.coding_progress WHERE user_id = p_user_id;
  DELETE FROM public.roadmap_attempts WHERE user_id = p_user_id;
  DELETE FROM public.verified_skill_checks WHERE user_id = p_user_id;
  DELETE FROM public.verified_activity_awards WHERE user_id = p_user_id;
  DELETE FROM public.quiz_submissions WHERE user_id = p_user_id;
  DELETE FROM public.quiz_attempts WHERE user_id = p_user_id;
  DELETE FROM public.user_stats WHERE user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_user_data(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(TEXT) TO service_role;
