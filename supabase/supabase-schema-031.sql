-- Migration 031: make the owner-read policies evaluate the caller once per
-- query instead of once per row, and drop a unique constraint the primary key
-- already provides.
-- Apply after migrations 001-030. Safe to re-run.
--
-- Two findings from the database linter, both about cost rather than
-- correctness. Nothing here changes who can read what: every policy below
-- expresses exactly the same condition it did before.
--
-- ── 1. auth.uid() in the row filter ────────────────────────────────────────
--
-- `USING (user_id = auth.uid()::text)` is a per-row expression, so Postgres
-- calls auth.uid() once for every row it considers. Wrapping it in a scalar
-- subquery — `(SELECT auth.uid()::text)` — makes it an InitPlan: evaluated
-- once, then compared against the index. The two forms are equivalent; the
-- second is the one that stays cheap as a table grows.
--
-- Migrations 026 to 030 already wrote the wrapped form. These eighteen are the
-- older policies, from before the pattern was settled.

DROP POLICY IF EXISTS "stats_select_own" ON public.user_stats;
CREATE POLICY "stats_select_own" ON public.user_stats FOR SELECT
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "category_stats_select_self" ON public.user_category_stats;
CREATE POLICY "category_stats_select_self" ON public.user_category_stats FOR SELECT
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "daily_select_self" ON public.daily_attempts;
CREATE POLICY "daily_select_self" ON public.daily_attempts FOR SELECT
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "daily_queue_completions_select_own" ON public.daily_queue_completions;
CREATE POLICY "daily_queue_completions_select_own" ON public.daily_queue_completions FOR SELECT
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "flashcards_select_own" ON public.flashcards;
CREATE POLICY "flashcards_select_own" ON public.flashcards FOR SELECT
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "roadmap_progress_select_own" ON public.roadmap_progress;
CREATE POLICY "roadmap_progress_select_own" ON public.roadmap_progress FOR SELECT
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "user_xp_select_own" ON public.user_xp;
CREATE POLICY "user_xp_select_own" ON public.user_xp FOR SELECT
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "user_streak_select_own" ON public.user_streak;
CREATE POLICY "user_streak_select_own" ON public.user_streak FOR SELECT
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "streak_config_select_own" ON public.user_streak_config;
CREATE POLICY "streak_config_select_own" ON public.user_streak_config FOR SELECT
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "streak_freezes_select_own" ON public.user_streak_freezes;
CREATE POLICY "streak_freezes_select_own" ON public.user_streak_freezes FOR SELECT
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "user_badges_select_own" ON public.user_badges;
CREATE POLICY "user_badges_select_own" ON public.user_badges FOR SELECT
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "user_cards_select_own" ON public.user_cards;
CREATE POLICY "user_cards_select_own" ON public.user_cards FOR SELECT
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "coding_progress_select_own" ON public.coding_progress;
CREATE POLICY "coding_progress_select_own" ON public.coding_progress FOR SELECT
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "coding_attempts_select_own" ON public.coding_attempts;
CREATE POLICY "coding_attempts_select_own" ON public.coding_attempts FOR SELECT
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "coding_drafts_select_own" ON public.coding_drafts;
CREATE POLICY "coding_drafts_select_own" ON public.coding_drafts FOR SELECT
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "github_connections_select_own" ON public.github_connections;
CREATE POLICY "github_connections_select_own" ON public.github_connections FOR SELECT
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "github_commits_select_own" ON public.github_commits;
CREATE POLICY "github_commits_select_own" ON public.github_commits FOR SELECT
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "concept_reviews_owner_select" ON public.concept_reviews;
CREATE POLICY "concept_reviews_owner_select" ON public.concept_reviews FOR SELECT
  USING (user_id = (SELECT auth.uid()::TEXT));

-- ── 2. The duplicate uniqueness on match_answers ───────────────────────────
--
-- Migration 007 added UNIQUE (match_id, user_id, question_idx) so that a
-- retried answer would conflict rather than duplicate. It already did: the
-- table's primary key, from migration 004, is those same three columns. The
-- constraint has been a second identical index on every write since.
--
-- Dropping it changes nothing the answer path depends on. That path inserts
-- and treats 23505 as "this answer is already recorded, replay it"; the
-- primary key raises the same 23505 on the same three columns.

ALTER TABLE public.match_answers
  DROP CONSTRAINT IF EXISTS match_answers_match_sub_qidx_uniq;
