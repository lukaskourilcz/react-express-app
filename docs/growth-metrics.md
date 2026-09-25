# Privacy-conscious growth and content operations

The launch grows through genuinely useful public learning pages and reliable
product loops, not dark patterns. Analytics is optional and the app works fully
without it.

## Public topic pages

The build emits metadata-specific HTML shells under `/topics/<slug>/` for
devShark's five guides: closures, TypeScript narrowing, React Hooks, SQL joins,
and Git rebase. Every page includes original teaching copy, one misconception,
small public practice prompts, and a category-scoped quiz CTA. No private
question bank or answer key is rendered in static HTML.

Review pages quarterly for accuracy, search usefulness, internal links, and
stale terminology. Add a topic only when it has a clear learner need and enough
original teaching value to stand alone.

## Product loops

- Result sharing uses score/date/brand context only; never include question text,
  selected answers, email, user id, or tokens.
- Multiplayer room links are explicit invitations. Do not publish room codes or
  participant names to analytics.
- devShark has been freemium since 25 September 2026. The upgrade sheet opens
  only when a learner chooses something Premium or asks what Premium includes,
  and `/premium` shows the price with VAT included and no countdown or
  scarcity. Premium changes which content
  an account may start and never scores. The quiz prompt that asked for
  voluntary support went in #230, and `/support` redirects to `/premium`.

## Minimal event taxonomy

Measure aggregate funnels with anonymous/session-scoped identifiers and short
retention. The client sends `quiz_started`, `quiz_submitted`,
`classroom_or_match_joined`, `share_initiated`, `curation_page_viewed` and
`premium_page_viewed`. Add Learn lesson complete and topic-page CTA only if their
payloads contain product, subject/category, locale, and coarse result counts—not
identity or question content.

Never send email, display name, access/session/answer tokens, room codes, free
text, question text, or selected answers. Disable session replay on auth, admin,
profile/account deletion, quiz answering, and multiplayer-code surfaces unless a
reviewed masking configuration proves those values cannot be captured.

## Weekly review

Review activation (first completed learning action), return rate, Learn/Quiz
completion, multiplayer success/error rate, topic-page-to-practice conversion,
Premium page visits against upgrades, and API reliability together. A conversion
gain that increases errors, confusion, privacy risk, or pressure to pay is not a
launch win.
