-- Migration 054: learning-path drafts, submitted write-ups and completion.
-- Apply after migrations 026 and 035. Safe to re-run.
--
-- Four routines from 026 and 035 are restated. No later migration restates
-- any of them, so each body below starts from its only earlier definition.
--
--   * accept_learning_path_result (026)
--       - A result that passes its activity (verified_pass or self_reviewed)
--         deletes that activity's draft. A draft is the learner's unsubmitted
--         work, but nothing removed it after a pass, so every exercise a
--         learner typed into kept one, and an enrollment's 21st draft was
--         refused as too_many_drafts. The DSA path has 30 code exercises.
--       - A submitted write-up (self_reviewed) is no longer replaced by a
--         weaker later result (needs_revision, in_progress). A verified pass
--         was already kept this way; a resubmission with a field left empty
--         demoted a submitted write-up while its module stayed completed.
--       - The routine locks the enrollment row before it touches any
--         progress, so two results for one enrollment are accepted one after
--         the other. It also takes the module's requirements
--         (p_module_requires, new, DEFAULT NULL) and decides completion from
--         the states it has just written. Before, completion came only from
--         p_module_complete, which the API works out from progress it read
--         before the call: two submits finishing a module's last two
--         activities at once each read the other as not done, neither set
--         completed_at, and the finished path's package read as not earned.
--         p_module_complete still counts, so the code in production, which
--         does not send requirements, completes modules exactly as before.
--   * save_learning_path_draft (026): a save for a draft the server no longer
--     holds (deleted by a pass, or by the retention purge) starts a new draft
--     at revision 1 instead of answering conflict. Nothing newer exists to
--     protect, and a device still holding the old revision would otherwise
--     report "a newer draft was saved elsewhere" for every save after a pass.
--     A save against a draft that exists still has to name its revision. The
--     default cap becomes 60, the API's new PATH_LIMITS.draftsPerEnrollment.
--   * path_is_complete (035): counts distinct completed modules within ONE
--     enrollment, and, given p_curriculum_version (new, DEFAULT NULL), only
--     the enrollment of that curriculum version. Before, it counted completed
--     rows across every enrollment of the path, so five modules finished
--     under version 1 and five under version 2 read as a finished ten-module
--     path.
--   * claim_path_reward (035): passes p_curriculum_version (new, DEFAULT
--     NULL) through to path_is_complete. Its checks are otherwise unchanged.
--
-- Three signatures gain a parameter with a default. CREATE OR REPLACE cannot
-- add a parameter, and a second overload would make every existing call
-- ambiguous, so the old signature is dropped first, as 039 does. Every
-- existing call, positional or named, resolves to the new one unchanged.
-- Grants are restated for each routine.

-- ---------------------------------------------------------------------------
-- 1. Accepting a graded result.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.accept_learning_path_result(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB, JSONB, JSONB, BOOLEAN, JSONB
);
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
  p_result JSONB DEFAULT NULL,
  -- The module's completion requirements, from the manifest: one entry per
  -- required activity, with the states that satisfy it, such as
  -- [{"activityId": "x", "states": ["verified_pass"]}]. An empty array is a
  -- module that never completes (an optional one). NULL leaves completion to
  -- p_module_complete alone.
  p_module_requires JSONB DEFAULT NULL
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
  v_complete BOOLEAN;
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
  IF p_module_requires IS NOT NULL THEN
    IF jsonb_typeof(p_module_requires) <> 'array' THEN
      RAISE EXCEPTION 'invalid_learning_path_result';
    END IF;
    IF jsonb_array_length(p_module_requires) > 64 OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_module_requires) AS req
       WHERE jsonb_typeof(req) <> 'object'
          OR jsonb_typeof(req -> 'activityId') IS DISTINCT FROM 'string'
          OR NOT ((req ->> 'activityId') ~ '^[a-z0-9-]{3,96}$')
          OR jsonb_typeof(req -> 'states') IS DISTINCT FROM 'array'
    ) THEN
      RAISE EXCEPTION 'invalid_learning_path_result';
    END IF;
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

  -- One result per enrollment at a time. A second submit waits here until the
  -- first commits, and then reads the progress that one wrote, so completion
  -- below is decided from every state on record. NO KEY UPDATE, the lock the
  -- updated_at write at the end takes anyway, does not block a new attempt's
  -- foreign-key check against this row.
  PERFORM 1 FROM public.learning_path_enrollments
   WHERE enrollment_id = v_attempt.enrollment_id
   FOR NO KEY UPDATE;

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
  -- A submitted write-up is kept the same way. Resubmitting it with a field
  -- left empty records that attempt as evidence and changes nothing else; a
  -- verified pass still replaces it.
  ELSIF v_existing ->> 'state' = 'self_reviewed' AND p_state IN ('needs_revision', 'in_progress') THEN
    v_states := jsonb_set(v_states, ARRAY[v_attempt.activity_id],
      jsonb_build_object(
        'state', 'self_reviewed',
        'score', CASE WHEN p_score IS NULL THEN COALESCE(v_existing -> 'score', 'null'::JSONB) ELSE to_jsonb(
          GREATEST(COALESCE((v_existing ->> 'score')::NUMERIC, 0), p_score)) END,
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

  -- Completion from the states just written, under the locks above, so it
  -- does not depend on what the caller read before the call. A requirement
  -- is met when the activity's recorded state is one the requirement lists;
  -- an activity with no record is not_started.
  v_complete := COALESCE(p_module_complete, FALSE);
  IF NOT v_complete AND p_module_requires IS NOT NULL AND jsonb_array_length(p_module_requires) > 0 THEN
    SELECT COALESCE(bool_and(
             (req -> 'states') ? COALESCE(v_states -> (req ->> 'activityId') ->> 'state', 'not_started')
           ), FALSE)
      INTO v_complete
      FROM jsonb_array_elements(p_module_requires) AS req;
  END IF;

  UPDATE public.learning_path_progress
     SET activity_states = v_states,
         completed_at = CASE WHEN v_complete THEN COALESCE(completed_at, NOW()) ELSE completed_at END,
         updated_at = NOW()
   WHERE enrollment_id = v_attempt.enrollment_id AND module_id = p_module_id;

  -- A pass ends the draft: what it held has been submitted. A weaker result
  -- leaves the draft for the next attempt.
  IF p_state IN ('verified_pass', 'self_reviewed') THEN
    DELETE FROM public.learning_path_drafts
     WHERE enrollment_id = v_attempt.enrollment_id AND activity_id = v_attempt.activity_id;
  END IF;

  UPDATE public.learning_path_enrollments
     SET updated_at = NOW()
   WHERE enrollment_id = v_attempt.enrollment_id;

  RETURN jsonb_build_object('ok', TRUE, 'replayed', FALSE, 'revision', v_revision);
END;
$$;
REVOKE ALL ON FUNCTION public.accept_learning_path_result(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB, JSONB, JSONB, BOOLEAN, JSONB, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_learning_path_result(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB, JSONB, JSONB, BOOLEAN, JSONB, JSONB
) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Drafts.
-- ---------------------------------------------------------------------------
-- Optimistic revisions, as in 026: a save names the revision it edits, and a
-- stale one conflicts rather than overwrite a newer save from another device.
-- A draft that no longer exists has nothing newer to protect, so a save for
-- it starts again at revision 1 whatever revision the device held.
CREATE OR REPLACE FUNCTION public.save_learning_path_draft(
  p_user_id TEXT,
  p_enrollment_id TEXT,
  p_activity_id TEXT,
  p_expected_revision INTEGER,
  p_content JSONB,
  p_max_drafts INTEGER DEFAULT 60
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
    SELECT COUNT(*) INTO v_count FROM public.learning_path_drafts
     WHERE enrollment_id = p_enrollment_id;
    IF v_count >= p_max_drafts THEN
      RETURN jsonb_build_object('ok', FALSE, 'reason', 'too_many_drafts');
    END IF;
    -- Two first saves racing: the second waits on the key and then conflicts
    -- with the first one's revision, as a stale save of an existing draft does.
    INSERT INTO public.learning_path_drafts (enrollment_id, user_id, activity_id, revision, content)
    VALUES (p_enrollment_id, p_user_id, p_activity_id, 1, p_content)
    ON CONFLICT (enrollment_id, activity_id) DO NOTHING
    RETURNING updated_at INTO v_updated;
    IF v_updated IS NULL THEN
      SELECT revision INTO v_current FROM public.learning_path_drafts
       WHERE enrollment_id = p_enrollment_id AND activity_id = p_activity_id;
      RETURN jsonb_build_object('ok', FALSE, 'reason', 'conflict', 'revision', COALESCE(v_current, 0));
    END IF;
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
-- 3. Whether a path is finished.
-- ---------------------------------------------------------------------------
-- Derived from the progress rows the graders wrote, never from anything the
-- browser says. The modules must all be finished within one enrollment, so
-- one curriculum version; given p_curriculum_version, the enrollment of that
-- version. Each module counts once.
DROP FUNCTION IF EXISTS public.path_is_complete(TEXT, TEXT, INTEGER);
CREATE OR REPLACE FUNCTION public.path_is_complete(
  p_user_id TEXT,
  p_path_id TEXT,
  p_modules INTEGER,
  p_curriculum_version INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT COALESCE(p_modules, 0) > 0 AND EXISTS (
    SELECT 1
      FROM public.learning_path_enrollments e
     WHERE e.user_id = p_user_id
       AND e.path_id = p_path_id
       AND (p_curriculum_version IS NULL OR e.curriculum_version = p_curriculum_version)
       AND (SELECT COUNT(DISTINCT pr.module_id)
              FROM public.learning_path_progress pr
             WHERE pr.enrollment_id = e.enrollment_id
               AND pr.curriculum_version = e.curriculum_version
               AND pr.completed_at IS NOT NULL) >= p_modules
  );
$$;
REVOKE ALL ON FUNCTION public.path_is_complete(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.path_is_complete(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Claiming the package a finished path earns.
-- ---------------------------------------------------------------------------
-- 035's body, with p_curriculum_version passed to path_is_complete. The claim
-- row's primary key is still what makes it one-time.
DROP FUNCTION IF EXISTS public.claim_path_reward(
  TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
);
CREATE OR REPLACE FUNCTION public.claim_path_reward(
  p_user_id  TEXT,
  p_path_id  TEXT,
  p_modules  INTEGER,
  p_shirt    TEXT,
  p_name     TEXT,
  p_line1    TEXT,
  p_line2    TEXT,
  p_city     TEXT,
  p_postal   TEXT,
  p_country  TEXT,
  p_curriculum_version INTEGER DEFAULT NULL
)
-- The OUT column is not called `order_id`: ON CONFLICT (order_id) cannot be
-- table-qualified, so an OUT parameter of that name is ambiguous against the
-- column and the insert fails at run time.
RETURNS TABLE (granted BOOLEAN, reward_order_id TEXT, already BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing public.path_reward_claims%ROWTYPE;
  v_order    TEXT;
BEGIN
  IF p_shirt NOT IN ('S', 'M', 'L', 'XL', 'XXL') THEN RAISE EXCEPTION 'invalid_variant'; END IF;
  IF btrim(COALESCE(p_name, ''))   = '' OR btrim(COALESCE(p_line1, '')) = ''
     OR btrim(COALESCE(p_city, '')) = '' OR btrim(COALESCE(p_postal, '')) = ''
     OR p_country !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'invalid_address';
  END IF;

  SELECT * INTO v_existing FROM public.path_reward_claims
   WHERE user_id = p_user_id AND path_id = p_path_id;
  IF FOUND THEN
    RETURN QUERY SELECT FALSE, v_existing.order_id, TRUE;
    RETURN;
  END IF;

  IF NOT public.path_is_complete(p_user_id, p_path_id, p_modules, p_curriculum_version) THEN
    RAISE EXCEPTION 'path_not_complete';
  END IF;

  -- Derived from the pair, so a retry produces the same order rather than a
  -- second one. md5 keeps it inside the id format the table checks.
  v_order := 'reward-' || substr(md5(p_user_id || ':' || p_path_id), 1, 24);

  INSERT INTO public.merch_orders (
    order_id, user_id, payment_kind, state, total_minor, currency, token_total,
    ship_name, ship_line1, ship_line2, ship_city, ship_postal, ship_country
  ) VALUES (
    v_order, p_user_id, 'tokens', 'awaiting_payment', 0, 'EUR', 0,
    btrim(p_name), btrim(p_line1), NULLIF(btrim(COALESCE(p_line2, '')), ''),
    btrim(p_city), btrim(p_postal), p_country
  )
  ON CONFLICT (order_id) DO NOTHING;

  -- An item with no variant carries the empty string, not NULL: `variant` is
  -- part of the primary key, and a NULL in a key would let the same item be
  -- inserted twice.
  INSERT INTO public.merch_order_items (order_id, sku, variant, quantity, unit_minor, unit_tokens)
  VALUES (v_order, 't-shirt', p_shirt, 1, 0, 0),
         (v_order, 'mug', '', 1, 0, 0),
         (v_order, 'sticker-set', '', 1, 0, 0)
  ON CONFLICT DO NOTHING;

  -- The claim row is written last and its primary key is the guarantee: a
  -- second call finds it and grants nothing, whatever raced it.
  INSERT INTO public.path_reward_claims (user_id, path_id, order_id)
  VALUES (p_user_id, p_path_id, v_order);

  RETURN QUERY SELECT TRUE, v_order, FALSE;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_path_reward(
  TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_path_reward(
  TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER
) TO service_role;
