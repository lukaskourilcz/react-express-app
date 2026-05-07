-- Migration 007: server-side persistence for memory cards.
-- Apply in Supabase SQL Editor after migrations 001-006.
--
-- Cards are still local-first (the client treats localStorage / shared
-- preferences as the source of truth) but the server provides a durable
-- backup that lets a user move between devices without losing their deck.
-- Conflict resolution is last-write-wins on `updated_at`.

CREATE TABLE IF NOT EXISTS user_cards (
  auth0_id          TEXT NOT NULL,
  question_id       TEXT NOT NULL,
  question          TEXT NOT NULL,
  options           JSONB NOT NULL,
  correct_index     INTEGER NOT NULL,
  explanation       TEXT,
  category          TEXT NOT NULL,
  added_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  right_streak      INTEGER NOT NULL DEFAULT 0,
  wrong_count       INTEGER NOT NULL DEFAULT 0,
  due_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_reviewed_at  TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (auth0_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_user_cards_due
  ON user_cards(auth0_id, due_at);

ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_cards_select_own"
  ON user_cards FOR SELECT
  USING (auth0_id = auth.jwt() ->> 'sub');

CREATE POLICY "user_cards_insert_own"
  ON user_cards FOR INSERT
  WITH CHECK (auth0_id = auth.jwt() ->> 'sub');

CREATE POLICY "user_cards_update_own"
  ON user_cards FOR UPDATE
  USING (auth0_id = auth.jwt() ->> 'sub')
  WITH CHECK (auth0_id = auth.jwt() ->> 'sub');

CREATE POLICY "user_cards_delete_own"
  ON user_cards FOR DELETE
  USING (auth0_id = auth.jwt() ->> 'sub');

-- Bulk-replace RPC: replaces the user's deck with the supplied JSON array.
-- Called by the API layer after merging client + server state. Atomic.
CREATE OR REPLACE FUNCTION public.replace_user_cards(
  p_auth0_id TEXT,
  p_cards    JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := jsonb_array_length(p_cards);
BEGIN
  IF v_count > 1000 THEN
    RAISE EXCEPTION 'too_many_cards';
  END IF;

  -- Replace strategy: delete then insert in one transaction.
  DELETE FROM user_cards WHERE auth0_id = p_auth0_id;

  IF v_count = 0 THEN RETURN; END IF;

  INSERT INTO user_cards (
    auth0_id, question_id, question, options, correct_index, explanation,
    category, added_at, right_streak, wrong_count, due_at, last_reviewed_at,
    updated_at
  )
  SELECT
    p_auth0_id,
    elem->>'question_id',
    elem->>'question',
    elem->'options',
    (elem->>'correct_index')::INT,
    elem->>'explanation',
    elem->>'category',
    COALESCE((elem->>'added_at')::TIMESTAMPTZ, NOW()),
    COALESCE((elem->>'right_streak')::INT, 0),
    COALESCE((elem->>'wrong_count')::INT, 0),
    COALESCE((elem->>'due_at')::TIMESTAMPTZ, NOW()),
    NULLIF(elem->>'last_reviewed_at', '')::TIMESTAMPTZ,
    COALESCE((elem->>'updated_at')::TIMESTAMPTZ, NOW())
  FROM jsonb_array_elements(p_cards) AS elem
  WHERE
    length(elem->>'question_id') BETWEEN 1 AND 64 AND
    length(elem->>'question') BETWEEN 1 AND 8000 AND
    length(elem->>'category') BETWEEN 1 AND 50 AND
    jsonb_typeof(elem->'options') = 'array';
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_user_cards(TEXT, JSONB) TO authenticated, anon;
