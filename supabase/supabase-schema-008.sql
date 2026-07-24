-- Migration 008: per-user flashcards.
-- A flashcard is a question the user saved (bookmarked) for review. We snapshot
-- the question text + correct answer + explanation so cards survive even if the
-- source question is later edited or removed. Apply after migrations 001-007.

CREATE TABLE IF NOT EXISTS flashcards (
  user_id        TEXT NOT NULL,
  question_id    TEXT NOT NULL,
  question       TEXT NOT NULL,
  category       TEXT,
  correct_answer TEXT NOT NULL,
  explanation    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_flashcards_user ON flashcards(user_id, created_at DESC);

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Each user can only see/manage their own cards. The server-side API uses the
-- service-role key (bypasses RLS) and scopes every query by the verified token
-- subject; these policies are defense-in-depth for any direct PostgREST access.
CREATE POLICY "flashcards_select_own"
  ON flashcards FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "flashcards_insert_own"
  ON flashcards FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "flashcards_update_own"
  ON flashcards FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "flashcards_delete_own"
  ON flashcards FOR DELETE
  USING (user_id = auth.uid()::text);
