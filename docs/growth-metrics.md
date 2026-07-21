# Privacy-conscious growth and content operations

The launch grows through genuinely useful public learning pages and reliable
product loops, not dark patterns. Analytics is optional and the app works fully
without it.

## Public topic pages

The build emits metadata-specific HTML shells under `/topics/<slug>/` for topics
allowed by that deployment. StudyShark currently publishes concise pages for
European capitals, historical periods, foundational mathematics, human biology,
and chess tactics. devShark publishes closures, TypeScript narrowing, React
Hooks, SQL joins, and Git rebase. Every page includes original teaching copy,
one misconception, small public practice prompts, and a category-scoped quiz
CTA. No private question bank or answer key is rendered in static HTML.

Review pages quarterly for accuracy, search usefulness, Czech parity, internal
links, and stale terminology. Add a topic only when it has a clear learner need
and enough original teaching value to stand alone.

## Product loops

- Result sharing uses score/date/brand context only; never include question text,
  selected answers, email, user id, or tokens.
- Multiplayer room links are explicit invitations. Do not publish room codes or
  participant names to analytics.
- Support prompts appear only after repeated completed quizzes, are dismissible,
  stay hidden for at least 90 days, can be disabled permanently, and appear only while truthful support configuration
  is enabled. Payment never changes learning access or scores.
- Sibling-brand clicks explain the product relationship and respect “coming
  soon” states instead of leading to empty domains.

## Minimal event taxonomy

Measure aggregate funnels with anonymous/session-scoped identifiers and short
retention. Current useful events include sibling-brand visits, support page and
provider clicks, multiplayer create/join, and result shares. Add quiz start,
quiz complete, Learn lesson complete, and topic-page CTA only if their payloads
contain product, subject/category, locale, and coarse result counts—not identity
or question content.

Never send email, display name, access/session/answer tokens, room codes, free
text, question text, or selected answers. Disable session replay on auth, admin,
profile/account deletion, quiz answering, and multiplayer-code surfaces unless a
reviewed masking configuration proves those values cannot be captured.

## Weekly review

Review activation (first completed learning action), return rate, Learn/Quiz
completion, multiplayer success/error rate, topic-page-to-practice conversion,
support prompt dismissal/visit ratio, and API reliability together. A conversion
gain that increases errors, confusion, privacy risk, or forced support pressure
is not a launch win.
