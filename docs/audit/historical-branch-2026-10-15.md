# Historical branch reconciliation — 15 October 2026

For [#208](https://github.com/lukaskourilcz/react-express-app/issues/208).

A fresh remote fetch resolves `claude/elegant-cori-h9cdgb` to
`510f92a80d9e72daff5d51f05d385347f6871851`. Compared with current main
`53b3967b9bc5b69733bb33818fd27286a366eb84`, ten commits remain outside main's
ancestry. That count is not ten missing features. The original issue's four-commit
survey and unapplied-migration statement are historical, not current database evidence.

Current source/history already contain:

- Classroom-sized rate limits (main `5bdb078c`) and later per-task/caller grading
  limits (`7cf78609`). Restoring the old limiter would remove subsequent safeguards.
- Contrast arithmetic (`75d55bb0`) and signed-out axe coverage (`9a6682c5`), later
  extended at narrow widths (`830680fe`) and through homepage keyboard/reflow
  checks (`ef65bb1f`). The old branch commits are not the only copies of that work.
- The current PathStrip wraps its list into rows. `ef65bb1f` validates reflow and
  keyboard access. The historical scroll-region change is superseded; replaying
  it would restore an older layout rather than finish a missing fix.

The branch also contains the historical streak/micro-league/sprint/chess,
Turnstile and merchandise proposals and migrations. This check does not establish
that every behavior in those proposals is absent, approved or currently safe.
Retain/port/drop remains an owner decision followed by feature-specific current
source/schema/acceptance checks. Preserve the current streak-protection ceiling,
Turnstile deferral, merchandise pause and server-authoritative rewards/access.

No branch was merged/deleted, migration replayed or feature activated in this
reconciliation. `media/brag.mp4` is absent from the current checkout; no video
review or publication approval is claimed. Source presence/history is not a
replacement for real-device or consolidated dedicated-account acceptance.
