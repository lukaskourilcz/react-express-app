-- Migration 026: learning paths (the FDE role specialization and the
-- standalone DSA Foundations skill path).
-- Apply after migrations 001-025. Safe to re-run.
--
-- Five additive tables carry everything the two paths need:
--   * learning_path_enrollments: one row per (user, path, curriculum version).
--     base_track_at_enrollment is nullable because a skill path is entered
--     directly, with no career selection to record.
--   * learning_path_attempts: one row per started activity. It holds grading
--     material — the sealed answer key's provenance, the idempotency key and
--     the request hash — so it is SERVICE-ONLY. No owner policy exists for it,
--     deliberately: owning an attempt is not a reason to read its key.
--   * learning_path_evidence: what a graded attempt established, in the safe
--     shape the owner may read. Criterion outcomes, never the assertions.
--   * learning_path_progress: the per-module projection the API serves.
--   * learning_path_drafts: the learner's unsubmitted work, revision-checked
--     so a stale device cannot overwrite a newer save.
--
-- No learning path awards XP in v1. Nothing here touches user_xp,
-- verified_activity_awards, coding_progress or roadmap_progress, so a path
-- pass can never inflate a rank or a leaderboard, and a task reused from the
-- ordinary coding catalogue is never rewarded twice.

-- ---------------------------------------------------------------------------
-- 1. Tables.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_path_enrollments (
  enrollment_id             TEXT PRIMARY KEY CHECK (enrollment_id ~ '^[A-Za-z0-9_-]{16,64}$'),
  user_id                   TEXT NOT NULL,
  subject                   TEXT NOT NULL DEFAULT 'webdev' CHECK (subject = 'webdev'),
  path_id                   TEXT NOT NULL CHECK (path_id IN ('fde', 'dsa-foundations')),
  curriculum_version        INTEGER NOT NULL CHECK (curriculum_version BETWEEN 1 AND 999),
  base_track_at_enrollment  TEXT CHECK (base_track_at_enrollment IS NULL
                                        OR base_track_at_enrollment IN ('fullstack', 'frontend', 'backend')),
  status                    TEXT NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'paused', 'completed')),
  started_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, path_id, curriculum_version)
);
CREATE INDEX IF NOT EXISTS learning_path_enrollments_user_idx
  ON public.learning_path_enrollments (user_id, status);

CREATE TABLE IF NOT EXISTS public.learning_path_attempts (
  attempt_id         TEXT PRIMARY KEY CHECK (attempt_id ~ '^[A-Za-z0-9_-]{16,64}$'),
  enrollment_id      TEXT NOT NULL REFERENCES public.learning_path_enrollments(enrollment_id) ON DELETE CASCADE,
  user_id            TEXT NOT NULL,
  activity_id        TEXT NOT NULL CHECK (activity_id ~ '^[a-z0-9-]{3,96}$'),
  purpose            TEXT NOT NULL CHECK (purpose IN ('diagnostic', 'exercise', 'project')),
  curriculum_version INTEGER NOT NULL CHECK (curriculum_version BETWEEN 1 AND 999),
  rubric_version     INTEGER NOT NULL CHECK (rubric_version BETWEEN 1 AND 999),
  state              TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'accepted', 'expired')),
  expires_at         TIMESTAMPTZ NOT NULL,
  -- The accepted response, replayed verbatim when the same key comes back.
  accepted_result    JSONB,
  idempotency_key    TEXT CHECK (idempotency_key IS NULL OR idempotency_key ~ '^[A-Za-z0-9_-]{16,64}$'),
  -- SHA-256 of the submitted payload. The same key with a different payload is
  -- a conflict, not a replay.
  request_hash       TEXT CHECK (request_hash IS NULL OR request_hash ~ '^[A-Za-z0-9_-]{16,64}$'),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS learning_path_attempts_owner_idx
  ON public.learning_path_attempts (user_id, activity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS learning_path_attempts_expiry_idx
  ON public.learning_path_attempts (expires_at)
  WHERE state = 'open';
-- One accepted attempt per (enrollment, activity, idempotency key): the exact
-- unique key the idempotent acceptance below relies on.
CREATE UNIQUE INDEX IF NOT EXISTS learning_path_attempts_idempotency_idx
  ON public.learning_path_attempts (enrollment_id, activity_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.learning_path_evidence (
  evidence_id       BIGSERIAL PRIMARY KEY,
  attempt_id        TEXT NOT NULL REFERENCES public.learning_path_attempts(attempt_id) ON DELETE CASCADE,
  enrollment_id     TEXT NOT NULL REFERENCES public.learning_path_enrollments(enrollment_id) ON DELETE CASCADE,
  user_id           TEXT NOT NULL,
  activity_id       TEXT NOT NULL CHECK (activity_id ~ '^[a-z0-9-]{3,96}$'),
  revision          INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  state             TEXT NOT NULL CHECK (state IN ('in_progress', 'verified_pass', 'self_reviewed', 'needs_revision')),
  verification_kind TEXT NOT NULL CHECK (verification_kind IN ('machine_verified', 'self_reviewed')),
  score             NUMERIC(5, 4) CHECK (score IS NULL OR (score >= 0 AND score <= 1)),
  domain_scores     JSONB,
  -- Criterion outcomes as the owner may see them: which criterion passed, not
  -- which assertion produced the verdict.
  criteria          JSONB,
  -- The learner's own submitted artifact, size-capped. Never grading material.
  artifact          JSONB CHECK (artifact IS NULL OR pg_column_size(artifact) <= 65536),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (attempt_id, revision)
);
CREATE INDEX IF NOT EXISTS learning_path_evidence_owner_idx
  ON public.learning_path_evidence (enrollment_id, activity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.learning_path_progress (
  enrollment_id      TEXT NOT NULL REFERENCES public.learning_path_enrollments(enrollment_id) ON DELETE CASCADE,
  user_id            TEXT NOT NULL,
  module_id          TEXT NOT NULL CHECK (module_id ~ '^[a-z0-9-]{3,96}$'),
  curriculum_version INTEGER NOT NULL CHECK (curriculum_version BETWEEN 1 AND 999),
  -- activity id -> { state, score, verification, attempts, updatedAt }
  activity_states    JSONB NOT NULL DEFAULT '{}'::JSONB
                       CHECK (pg_column_size(activity_states) <= 65536),
  completed_at       TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (enrollment_id, module_id)
);
CREATE INDEX IF NOT EXISTS learning_path_progress_user_idx
  ON public.learning_path_progress (user_id);

CREATE TABLE IF NOT EXISTS public.learning_path_drafts (
  enrollment_id TEXT NOT NULL REFERENCES public.learning_path_enrollments(enrollment_id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL,
  activity_id   TEXT NOT NULL CHECK (activity_id ~ '^[a-z0-9-]{3,96}$'),
  revision      INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  content       JSONB NOT NULL CHECK (pg_column_size(content) <= 65536),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (enrollment_id, activity_id)
);
CREATE INDEX IF NOT EXISTS learning_path_drafts_user_idx
  ON public.learning_path_drafts (user_id, updated_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Row-level security.
--
-- Owners read their enrollment, evidence, progress and drafts. Nobody but the
-- service role reads learning_path_attempts: it is where grading material
-- lives, and owning the row is not a reason to see it. Every authoritative
-- write goes through the SECURITY DEFINER functions below, so no browser
-- session can mint a pass.
-- ---------------------------------------------------------------------------
ALTER TABLE public.learning_path_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_drafts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.learning_path_enrollments, public.learning_path_attempts,
  public.learning_path_evidence, public.learning_path_progress, public.learning_path_drafts
  FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "learning_path_enrollments_select_own" ON public.learning_path_enrollments;
CREATE POLICY "learning_path_enrollments_select_own"
  ON public.learning_path_enrollments FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "learning_path_evidence_select_own" ON public.learning_path_evidence;
CREATE POLICY "learning_path_evidence_select_own"
  ON public.learning_path_evidence FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "learning_path_progress_select_own" ON public.learning_path_progress;
CREATE POLICY "learning_path_progress_select_own"
  ON public.learning_path_progress FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "learning_path_drafts_select_own" ON public.learning_path_drafts;
CREATE POLICY "learning_path_drafts_select_own"
  ON public.learning_path_drafts FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())::text);

-- learning_path_attempts intentionally has NO policy: with RLS enabled and no
-- policy, anon and authenticated read nothing, whatever grants exist.

-- SELECT needs the table grant as well as the policy; role membership alone is
-- not enough. No INSERT, UPDATE or DELETE is granted to either browser role.
GRANT SELECT ON public.learning_path_enrollments TO authenticated;
GRANT SELECT ON public.learning_path_evidence TO authenticated;
GRANT SELECT ON public.learning_path_progress TO authenticated;
GRANT SELECT ON public.learning_path_drafts TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Enrollment.
-- ---------------------------------------------------------------------------
-- Idempotent create: enrolling twice in the same path and version returns the
-- existing enrollment rather than a second one. `pause` and `resume` change
-- only the status, so no evidence is ever lost by stepping away from a path.
CREATE OR REPLACE FUNCTION public.upsert_learning_path_enrollment(
  p_user_id TEXT,
  p_enrollment_id TEXT,
  p_path_id TEXT,
  p_curriculum_version INTEGER,
  p_base_track TEXT DEFAULT NULL,
  p_action TEXT DEFAULT 'enroll'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.learning_path_enrollments%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_enrollment_id !~ '^[A-Za-z0-9_-]{16,64}$' OR
     p_path_id NOT IN ('fde', 'dsa-foundations') OR
     p_curriculum_version < 1 OR p_curriculum_version > 999 OR
     (p_base_track IS NOT NULL AND p_base_track NOT IN ('fullstack', 'frontend', 'backend')) OR
     p_action NOT IN ('enroll', 'pause', 'resume') THEN
    RAISE EXCEPTION 'invalid_learning_path_enrollment';
  END IF;

  SELECT * INTO v_row FROM public.learning_path_enrollments
   WHERE user_id = p_user_id AND path_id = p_path_id AND curriculum_version = p_curriculum_version
   FOR UPDATE;

  IF NOT FOUND THEN
    IF p_action <> 'enroll' THEN
      RETURN jsonb_build_object('found', FALSE);
    END IF;
    INSERT INTO public.learning_path_enrollments (
      enrollment_id, user_id, path_id, curriculum_version, base_track_at_enrollment
    ) VALUES (
      p_enrollment_id, p_user_id, p_path_id, p_curriculum_version, p_base_track
    )
    RETURNING * INTO v_row;
    RETURN jsonb_build_object('found', TRUE, 'created', TRUE, 'enrollment', to_jsonb(v_row));
  END IF;

  IF p_action = 'pause' AND v_row.status = 'active' THEN
    UPDATE public.learning_path_enrollments
       SET status = 'paused', updated_at = NOW()
     WHERE enrollment_id = v_row.enrollment_id
     RETURNING * INTO v_row;
  ELSIF p_action = 'resume' AND v_row.status = 'paused' THEN
    UPDATE public.learning_path_enrollments
       SET status = 'active', updated_at = NOW()
     WHERE enrollment_id = v_row.enrollment_id
     RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object('found', TRUE, 'created', FALSE, 'enrollment', to_jsonb(v_row));
END;
$$;
REVOKE ALL ON FUNCTION public.upsert_learning_path_enrollment(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_learning_path_enrollment(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Attempts.
-- ---------------------------------------------------------------------------
-- Opening an attempt records what it is bound to. The sealed session the API
-- issues carries the same fields, so a tampered session is caught by
-- comparing the two rather than by trusting either one.
CREATE OR REPLACE FUNCTION public.open_learning_path_attempt(
  p_user_id TEXT,
  p_attempt_id TEXT,
  p_enrollment_id TEXT,
  p_activity_id TEXT,
  p_purpose TEXT,
  p_curriculum_version INTEGER,
  p_rubric_version INTEGER,
  p_ttl_minutes INTEGER DEFAULT 180
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner TEXT;
  v_status TEXT;
  v_expires TIMESTAMPTZ;
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_attempt_id !~ '^[A-Za-z0-9_-]{16,64}$' OR
     p_enrollment_id !~ '^[A-Za-z0-9_-]{16,64}$' OR
     p_activity_id !~ '^[a-z0-9-]{3,96}$' OR
     p_purpose NOT IN ('diagnostic', 'exercise', 'project') OR
     p_curriculum_version < 1 OR p_curriculum_version > 999 OR
     p_rubric_version < 1 OR p_rubric_version > 999 OR
     p_ttl_minutes < 5 OR p_ttl_minutes > 1440 THEN
    RAISE EXCEPTION 'invalid_learning_path_attempt';
  END IF;

  SELECT user_id, status INTO v_owner, v_status
    FROM public.learning_path_enrollments
   WHERE enrollment_id = p_enrollment_id;
  IF v_owner IS NULL OR v_owner <> p_user_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'not_found');
  END IF;
  IF v_status = 'paused' THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'paused');
  END IF;

  v_expires := NOW() + make_interval(mins => p_ttl_minutes);
  INSERT INTO public.learning_path_attempts (
    attempt_id, enrollment_id, user_id, activity_id, purpose,
    curriculum_version, rubric_version, expires_at
  ) VALUES (
    p_attempt_id, p_enrollment_id, p_user_id, p_activity_id, p_purpose,
    p_curriculum_version, p_rubric_version, v_expires
  );
  RETURN jsonb_build_object('ok', TRUE, 'expiresAt', v_expires);
END;
$$;
REVOKE ALL ON FUNCTION public.open_learning_path_attempt(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_learning_path_attempt(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Accepting a graded result.
-- ---------------------------------------------------------------------------
-- One transaction: lock the attempt, write the evidence, fold it into the
-- module projection. Replaying the same idempotency key with the same payload
-- returns the stored response and changes nothing; the same key with a
-- different payload is a conflict. Module completion is computed by the API
-- from the manifest and passed in as p_module_complete, because the
-- requirements live in code-reviewed content, not in the database.
CREATE OR REPLACE FUNCTION public.accept_learning_path_result(
  p_user_id TEXT,
  p_attempt_id TEXT,
  p_idempotency_key TEXT,
  p_request_hash TEXT,
  p_module_id TEXT,
  p_state TEXT,
  p_verification_kind TEXT,
  p_score NUMERIC DEFAULT NULL,
  p_domain_scores JSONB DEFAULT NULL,
  p_criteria JSONB DEFAULT NULL,
  p_artifact JSONB DEFAULT NULL,
  p_module_complete BOOLEAN DEFAULT FALSE,
  p_result JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_attempt public.learning_path_attempts%ROWTYPE;
  v_revision INTEGER;
  v_states JSONB;
  v_existing JSONB;
  v_attempts INTEGER;
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_attempt_id !~ '^[A-Za-z0-9_-]{16,64}$' OR
     p_idempotency_key !~ '^[A-Za-z0-9_-]{16,64}$' OR
     p_request_hash !~ '^[A-Za-z0-9_-]{16,64}$' OR
     p_module_id !~ '^[a-z0-9-]{3,96}$' OR
     p_state NOT IN ('in_progress', 'verified_pass', 'self_reviewed', 'needs_revision') OR
     p_verification_kind NOT IN ('machine_verified', 'self_reviewed') OR
     (p_score IS NOT NULL AND (p_score < 0 OR p_score > 1)) THEN
    RAISE EXCEPTION 'invalid_learning_path_result';
  END IF;

  SELECT * INTO v_attempt FROM public.learning_path_attempts
   WHERE attempt_id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND OR v_attempt.user_id <> p_user_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'not_found');
  END IF;

  IF v_attempt.state = 'accepted' THEN
    IF v_attempt.idempotency_key = p_idempotency_key AND v_attempt.request_hash = p_request_hash THEN
      RETURN jsonb_build_object('ok', TRUE, 'replayed', TRUE, 'result', v_attempt.accepted_result);
    END IF;
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'conflict');
  END IF;

  IF v_attempt.expires_at < NOW() THEN
    UPDATE public.learning_path_attempts SET state = 'expired' WHERE attempt_id = p_attempt_id;
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'expired');
  END IF;

  -- A key already spent on another attempt of the same activity is a reuse,
  -- whatever this attempt's own state says.
  IF EXISTS (
    SELECT 1 FROM public.learning_path_attempts
     WHERE enrollment_id = v_attempt.enrollment_id
       AND activity_id = v_attempt.activity_id
       AND idempotency_key = p_idempotency_key
       AND attempt_id <> p_attempt_id
  ) THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'conflict');
  END IF;

  SELECT COALESCE(MAX(revision), 0) + 1 INTO v_revision
    FROM public.learning_path_evidence
   WHERE enrollment_id = v_attempt.enrollment_id AND activity_id = v_attempt.activity_id;

  INSERT INTO public.learning_path_evidence (
    attempt_id, enrollment_id, user_id, activity_id, revision,
    state, verification_kind, score, domain_scores, criteria, artifact
  ) VALUES (
    p_attempt_id, v_attempt.enrollment_id, p_user_id, v_attempt.activity_id, v_revision,
    p_state, p_verification_kind, p_score, p_domain_scores, p_criteria, p_artifact
  );

  UPDATE public.learning_path_attempts
     SET state = 'accepted',
         idempotency_key = p_idempotency_key,
         request_hash = p_request_hash,
         accepted_result = p_result,
         accepted_at = NOW()
   WHERE attempt_id = p_attempt_id;

  INSERT INTO public.learning_path_progress (enrollment_id, user_id, module_id, curriculum_version)
  VALUES (v_attempt.enrollment_id, p_user_id, p_module_id, v_attempt.curriculum_version)
  ON CONFLICT (enrollment_id, module_id) DO NOTHING;

  SELECT activity_states INTO v_states
    FROM public.learning_path_progress
   WHERE enrollment_id = v_attempt.enrollment_id AND module_id = p_module_id
   FOR UPDATE;

  v_existing := v_states -> v_attempt.activity_id;
  v_attempts := COALESCE((v_existing ->> 'attempts')::INTEGER, 0) + 1;

  -- A verified pass is never demoted by a later weaker result: the learner
  -- keeps what they proved, and a revision only ever adds to the record.
  IF v_existing ->> 'state' = 'verified_pass' AND p_state <> 'verified_pass' THEN
    v_states := jsonb_set(v_states, ARRAY[v_attempt.activity_id],
      jsonb_build_object(
        'state', 'verified_pass',
        'score', GREATEST(COALESCE((v_existing ->> 'score')::NUMERIC, 0), COALESCE(p_score, 0)),
        'verification', v_existing ->> 'verification',
        'domainScores', COALESCE(v_existing -> 'domainScores', 'null'::JSONB),
        'attempts', to_jsonb(v_attempts),
        'updatedAt', to_jsonb(NOW())
      ), TRUE);
  ELSE
    v_states := jsonb_set(COALESCE(v_states, '{}'::JSONB), ARRAY[v_attempt.activity_id],
      jsonb_build_object(
        'state', p_state,
        'score', CASE WHEN p_score IS NULL THEN 'null'::JSONB ELSE to_jsonb(
          GREATEST(COALESCE((v_existing ->> 'score')::NUMERIC, 0), p_score)) END,
        'verification', p_verification_kind,
        'domainScores', COALESCE(p_domain_scores, 'null'::JSONB),
        'attempts', to_jsonb(v_attempts),
        'updatedAt', to_jsonb(NOW())
      ), TRUE);
  END IF;

  UPDATE public.learning_path_progress
     SET activity_states = v_states,
         completed_at = CASE WHEN p_module_complete THEN COALESCE(completed_at, NOW()) ELSE completed_at END,
         updated_at = NOW()
   WHERE enrollment_id = v_attempt.enrollment_id AND module_id = p_module_id;

  UPDATE public.learning_path_enrollments
     SET updated_at = NOW()
   WHERE enrollment_id = v_attempt.enrollment_id;

  RETURN jsonb_build_object('ok', TRUE, 'replayed', FALSE, 'revision', v_revision);
END;
$$;
REVOKE ALL ON FUNCTION public.accept_learning_path_result(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB, JSONB, JSONB, BOOLEAN, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_learning_path_result(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB, JSONB, JSONB, BOOLEAN, JSONB
) TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Drafts.
-- ---------------------------------------------------------------------------
-- Optimistic revisions: a save carries the revision the client believes it is
-- editing. A stale value conflicts instead of overwriting a newer save from
-- another device, so reconnecting after an offline stretch never silently
-- discards the better copy. A bounded number of drafts per enrollment keeps
-- the table from becoming storage by accident.
CREATE OR REPLACE FUNCTION public.save_learning_path_draft(
  p_user_id TEXT,
  p_enrollment_id TEXT,
  p_activity_id TEXT,
  p_expected_revision INTEGER,
  p_content JSONB,
  p_max_drafts INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner TEXT;
  v_current INTEGER;
  v_count INTEGER;
  v_updated TIMESTAMPTZ;
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_enrollment_id !~ '^[A-Za-z0-9_-]{16,64}$' OR
     p_activity_id !~ '^[a-z0-9-]{3,96}$' OR
     p_expected_revision < 0 OR p_expected_revision > 1000000 OR
     p_content IS NULL OR pg_column_size(p_content) > 65536 THEN
    RAISE EXCEPTION 'invalid_learning_path_draft';
  END IF;

  SELECT user_id INTO v_owner FROM public.learning_path_enrollments
   WHERE enrollment_id = p_enrollment_id;
  IF v_owner IS NULL OR v_owner <> p_user_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'not_found');
  END IF;

  SELECT revision INTO v_current FROM public.learning_path_drafts
   WHERE enrollment_id = p_enrollment_id AND activity_id = p_activity_id
   FOR UPDATE;

  IF v_current IS NULL THEN
    IF p_expected_revision <> 0 THEN
      RETURN jsonb_build_object('ok', FALSE, 'reason', 'conflict', 'revision', 0);
    END IF;
    SELECT COUNT(*) INTO v_count FROM public.learning_path_drafts
     WHERE enrollment_id = p_enrollment_id;
    IF v_count >= p_max_drafts THEN
      RETURN jsonb_build_object('ok', FALSE, 'reason', 'too_many_drafts');
    END IF;
    INSERT INTO public.learning_path_drafts (enrollment_id, user_id, activity_id, revision, content)
    VALUES (p_enrollment_id, p_user_id, p_activity_id, 1, p_content)
    RETURNING updated_at INTO v_updated;
    RETURN jsonb_build_object('ok', TRUE, 'revision', 1, 'updatedAt', v_updated);
  END IF;

  IF v_current <> p_expected_revision THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'conflict', 'revision', v_current);
  END IF;

  UPDATE public.learning_path_drafts
     SET revision = revision + 1, content = p_content, updated_at = NOW()
   WHERE enrollment_id = p_enrollment_id AND activity_id = p_activity_id
   RETURNING revision, updated_at INTO v_current, v_updated;
  RETURN jsonb_build_object('ok', TRUE, 'revision', v_current, 'updatedAt', v_updated);
END;
$$;
REVOKE ALL ON FUNCTION public.save_learning_path_draft(TEXT, TEXT, TEXT, INTEGER, JSONB, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_learning_path_draft(TEXT, TEXT, TEXT, INTEGER, JSONB, INTEGER)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 7. Erasure and retention.
-- ---------------------------------------------------------------------------
-- Account deletion takes the learning-path data with it. The enrollment
-- cascade would reach attempts, evidence, progress and drafts on its own; the
-- explicit deletes keep the function readable and survive a future table that
-- forgets its foreign key.
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

-- Retention, extending migration 025's function rather than replacing its
-- rules: expired unsubmitted attempts go after 30 days, idle drafts after 90.
-- Accepted evidence is kept until the learner deletes their account or asks
-- for the path data to go, so a completion record never quietly disappears.
CREATE OR REPLACE FUNCTION public.purge_expired_learning_data(
  p_before TIMESTAMPTZ DEFAULT NOW() - INTERVAL '90 days'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_roadmap INTEGER;
  v_submissions INTEGER;
  v_coding INTEGER;
  v_drafts INTEGER;
  v_commits INTEGER;
  v_path_attempts INTEGER;
  v_path_drafts INTEGER;
BEGIN
  DELETE FROM public.roadmap_attempts
   WHERE expires_at < p_before;
  GET DIAGNOSTICS v_roadmap = ROW_COUNT;
  DELETE FROM public.quiz_submissions
   WHERE created_at < p_before;
  GET DIAGNOSTICS v_submissions = ROW_COUNT;
  DELETE FROM public.coding_attempts
   WHERE created_at < p_before - INTERVAL '90 days';
  GET DIAGNOSTICS v_coding = ROW_COUNT;
  DELETE FROM public.coding_drafts
   WHERE updated_at < p_before;
  GET DIAGNOSTICS v_drafts = ROW_COUNT;
  DELETE FROM public.github_commits
   WHERE created_at < p_before - INTERVAL '90 days' AND status IN ('committed', 'skipped', 'failed');
  GET DIAGNOSTICS v_commits = ROW_COUNT;
  DELETE FROM public.learning_path_attempts
   WHERE state <> 'accepted' AND expires_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_path_attempts = ROW_COUNT;
  DELETE FROM public.learning_path_drafts
   WHERE updated_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_path_drafts = ROW_COUNT;
  RETURN jsonb_build_object(
    'roadmapAttempts', v_roadmap, 'quizSubmissions', v_submissions,
    'codingAttempts', v_coding, 'codingDrafts', v_drafts, 'githubCommits', v_commits,
    'learningPathAttempts', v_path_attempts, 'learningPathDrafts', v_path_drafts
  );
END;
$$;
REVOKE ALL ON FUNCTION public.purge_expired_learning_data(TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_learning_data(TIMESTAMPTZ) TO service_role;

-- ---------------------------------------------------------------------------
-- 8. Deleting one path's data without deleting the account.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_learning_path_data(p_user_id TEXT, p_path_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_removed INTEGER;
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_path_id NOT IN ('fde', 'dsa-foundations') THEN
    RAISE EXCEPTION 'invalid_learning_path_deletion';
  END IF;
  DELETE FROM public.learning_path_enrollments
   WHERE user_id = p_user_id AND path_id = p_path_id;
  GET DIAGNOSTICS v_removed = ROW_COUNT;
  RETURN jsonb_build_object('enrollmentsRemoved', v_removed);
END;
$$;
REVOKE ALL ON FUNCTION public.delete_learning_path_data(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_learning_path_data(TEXT, TEXT) TO service_role;

-- Rollback: the five tables are additive and hold no other feature's data.
-- Application code rolled back to pre-026 never calls the learning-path RPCs,
-- and a client that predates the new account preference simply ignores it.
-- Restore migration 025's delete_user_data and purge_expired_learning_data
-- bodies first; only then drop the tables, and only if the learner evidence
-- in them is genuinely no longer wanted. Disabling the feature is the
-- supported rollback — dropping the tables destroys learner evidence and is
-- not part of it.
