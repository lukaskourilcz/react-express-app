# Activation measurement

The homepage copy now explains guided lessons, quizzes and coding practice in English and Czech without promising a job or inventing outcomes. Public guides show an example and a misconception before offering a related quiz.

Use the existing PostHog project and `VITE_PUBLIC_POSTHOG_KEY`; no second analytics SDK is needed. In PostHog, create an ordered seven-day funnel for unique users:

1. `$pageview`, with the production hostname and pathname `/` (or `/topics/` and `/cs/topics/` for the guide entry cohort).
2. `landing_sample_completed` for homepage visitors; guide visitors can enter at the next step because they read a guide rather than the interactive home sample.
3. `learning_cta_clicked`, broken down by `source`, `locale`, `product` and `category`.
4. Existing `quiz_started` → `quiz_submitted`, or existing `learning_path_enrolled` → `learning_path_activity_verified` for guided paths.

Compare homepage and guide cohorts separately; do not treat every visitor who reads a guide as a failed homepage sample. Use conversion rate and seven-day return rates, not total clicks, to decide whether copy changes helped. Record the deployment date and compare periods with similar traffic sources before drawing conclusions. Keep account creation optional in the learning flow; these changes do not add email campaigns or a signup wall.

`captureActivation` reconstructs its four permitted properties and drops extra properties, with a test covering raw code, answers and tokens. PostHog autocapture, dead-click capture and session recording are explicitly disabled, and the existing Do Not Track behavior remains. Analytics is still a no-op without the configured key, and replay cannot accidentally capture the code editor. These code settings are not a substitute for the owner's privacy policy or account-level configuration.

Verify event arrival in the existing PostHog project after deployment, then save the funnel there; CI tests event delivery to a mocked SDK, not production analytics credentials. The repo provides the instrumentation and exact funnel definition, but does not pretend that an account-level dashboard was created without access to that account.

References: [PostHog JavaScript configuration](https://posthog.com/docs/libraries/js/config), [PostHog funnels](https://posthog.com/docs/product-analytics/funnels).
