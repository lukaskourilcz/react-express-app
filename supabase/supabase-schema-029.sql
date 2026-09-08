-- Migration 029: record which version of an item a problem report was about.
-- Apply after migrations 001-028. Safe to re-run.
--
-- A report says "this is wrong". Until now it said so about a question id,
-- which is the shelf and not the thing on it: by the time anyone reads the
-- report the wording may have changed, and there is no way to tell whether the
-- problem was fixed, still stands, or was never in the version that is now
-- being served.
--
-- content_version is the server's keyed digest of the exact wording the
-- reporter saw — the same value shown under "Why this question?". With it, a
-- report can be matched to what was on the screen, and a fix can be verified by
-- the version changing. It is nullable because reports written before this
-- migration have no version, and a report with no version is still a report.

ALTER TABLE public.question_reports
  ADD COLUMN IF NOT EXISTS content_version TEXT;

-- Reports are read per item when someone works through them, so the useful
-- index is by item and recency rather than by version.
CREATE INDEX IF NOT EXISTS question_reports_item_version_idx
  ON public.question_reports (question_id, content_version);

-- No policy changes: inserts stay open (anyone can report what they saw),
-- reads stay service-role only, and deletion on account erasure already covers
-- the row because it is keyed by reporter_sub.
