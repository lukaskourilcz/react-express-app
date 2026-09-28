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

## The question of the day (#239)

`/daily` puts one devShark question up every day, from a track that rotates by
date (`shared/daily-question.ts`). The server picks the question from that
track, keeps its answer sealed until a learner checks one, and grades the
check as a signed-out quiz: no receipt, XP, streak day, leaderboard entry or
review record, whoever is signed in. Each day has its own page
(`/daily/<date>`, prerendered for the last 120 days and the next 45) and its
own share image with the track and the date, so a daily post links to a
preview of its own. The static HTML names the day and the track and never
holds the question or its answer.

## Campaign links

Social links carry `utm_source` (`instagram`, `threads`, `linkedin`),
`utm_medium` (`bio`, `story`, `post`, `reply`, `ad`) and a kebab-case
`utm_campaign`. The first pageview of a page load keeps those three in its URL
and as properties, and the browser's first campaign (kept 30 days) becomes the
person's initial `utm_source`, `utm_medium` and `utm_campaign` when they sign
in (`identify`'s set-once properties). Every other parameter (`ref`,
`voucher`, `session_id`, anything else) and any value that is not a short
lower-case label is removed from every URL PostHog receives
(`client/src/lib/analytics.ts`).

## Product loops

- Result sharing uses score/date/brand context only; never include question text,
  selected answers, email, user id, or tokens. The Challenge card shows the
  number correct, the typing racer card WPM and accuracy, both with the date
  (`client/src/lib/shareCard.ts`); neither has a field for a name, an e-mail
  or a room code.
- The invite link is offered at a moment of success: after a learner's first
  passed Learn level and after each Challenge run, with the platform share
  sheet and a copy button (`ReferralMoment.tsx`). The mechanic and its coins
  are unchanged (#228).
- Every coding task has its own link-preview image (title, track, difficulty
  and the free count computed from `shared/tiers.ts`), drawn at build time.
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
`premium_page_viewed`. `share_initiated` carries `kind` (`quiz_result`,
`daily_result`, `referral`, `challenge_result`, `typing_result`,
`daily_question`) and, from the #239 surfaces, `source` and `method`
(`share`, `copy`, `download`), never the link, a code or a score. Add Learn lesson complete and topic-page CTA only if their
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
