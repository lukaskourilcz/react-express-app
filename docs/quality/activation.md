# Activation measurement

The homepage explains guided lessons, quizzes and coding practice in English without promising a job or inventing outcomes. Public topic guides show an example and a misconception before offering a related quiz. The events below measure whether a visitor moves from either entry to learning; [what the product measures](../growth-metrics.md) lists every event.

Use the existing PostHog project and `VITE_PUBLIC_POSTHOG_KEY`. In PostHog, an ordered seven-day funnel for unique users reads:

1. `$pageview` on the production hostname with pathname `/` (or `/topics/` for the guide cohort).
2. `landing_sample_completed` for homepage visitors. Guide visitors enter at the next step, because they read a guide instead of the home sample.
3. `learning_cta_clicked`, broken down by `source`, `product` and `category`.
4. `quiz_started` → `quiz_submitted`, or `learning_path_enrolled` → `learning_path_activity_verified` for guided paths.

Compare the homepage and guide cohorts separately: a visitor who reads a guide has not failed the homepage sample. Judge a copy change by conversion and seven-day return rates over periods with similar traffic sources, not by total clicks. Account creation stays optional in the learning flow; nothing here adds a signup wall or email campaign.

`captureActivation` rebuilds its permitted properties (`product`, `source`, `category`, and `locale` on guide events only) and drops anything else, and a client test feeds it raw code, answers and tokens. PostHog autocapture, dead-click capture and session recording are off, Do Not Track is honoured, and nothing is sent before analytics consent. These settings do not replace the privacy policy or the PostHog account configuration.

CI tests event delivery against a mocked SDK, not production analytics. The funnel itself lives in the owner's PostHog account; confirm the events arrive after a deploy and save the funnel there.

References: [PostHog JavaScript configuration](https://posthog.com/docs/libraries/js/config), [PostHog funnels](https://posthog.com/docs/product-analytics/funnels).
