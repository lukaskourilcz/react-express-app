# Developer quality tools

The eight free-tool recommendations are implemented through the existing Vite, Astryx, TanStack Query and PostHog stack. No paid service, production mock server or alternative UI system is required.

| Area | Run / entry point | What it checks or changes |
| --- | --- | --- |
| Performance | `npm run audit:performance -- --url=https://devshark.app`; `ANALYZE=true npm run build`; `npm run check:bundle` | Mobile/desktop Lighthouse JSON and HTML in `artifacts/performance`, existing bundle treemap, and a gzip budget for what a first visit downloads: the initial requests of `index.html` in a production-shaped build (see below). Inter and Manrope are now self-hosted with `font-display: swap`, removing the external font stylesheet dependency. |
| MSW | `npm run test:client` | Real API transport, authentication failures, timeout/cancellation, offline responses and leaderboard retry/empty state. No live API or user record is used. |
| Knip | `npm run check:unused`; `npm run audit:unused` | CI rejects new unused files/dependencies/unresolved imports; the full report also lists exports and types for review. It never deletes code automatically. |
| Public SEO | `npm run check:public` | Five devShark guides, each in EN and CS, include real HTML, language pairs, canonical URLs, internal links and truthful LearningResource JSON-LD. Build emits sitemap and robots. |
| Copy and activation | `client/src/lib/analytics.ts`; [activation notes](activation.md) | English positioning and a sample → learning CTA → existing quiz/path funnel, with explicit property allowlists. |
| Storybook | `npm run storybook`; `npm run build:storybook` | Real Astryx sample, retry, toast and confirmation components; a real leaderboard in populated, empty, loading, server-error and offline states. The toolbar switches light and dark; its Czech option renders English while `ENABLED_LANGS` ships English only. |
| Typography and accessibility | `npm run test:browser`; `npm run check:responsive` | Shared fluid rem/vw typography and spacing, 44px guide targets, keyboard disclosure and focus behavior, reduced-motion checks and axe WCAG A/AA tests. |
| Security | `npm run check:security -- --url=https://devshark.app` | Exact-hash theme bootstrap, main document CSP, HTTPS/security headers and the distinct coding sandbox policy. |

## Install and CI

Use Node 24, `npm ci` and `npm ci --prefix client`, then install a local Chromium once with `npx playwright install chromium` for browser/Lighthouse work. In the Claude Code cloud environment the browser is preinstalled under `/opt/pw-browsers` and `npx playwright install` is disabled: set `CHROME_BIN=/opt/pw-browsers/chromium` (and `CHROME_PATH` for Lighthouse) instead, because the preinstalled build is not the one Playwright 1.63 would download. The CI workflow installs its own browser. The production app does not require Chromium. Start `npm run preview --prefix client -- --host 0.0.0.0 --port 4173` after building. `CHROME_BIN` and `CHROME_PATH` can point to an existing compatible browser.

The Product quality workflow builds devShark, runs the release and public-HTML checks, and records browser results as GitHub artifacts. It also builds the Storybook workshop and records Lighthouse results. The existing Vercel Git integration owns deployment; this workflow does not create a second deployment pipeline. Configure branch protection to require Product quality if you want GitHub to enforce this on every future merge.

Do not add MSW initialization to `src/main.tsx` or copy its worker into `client/public`: the worker lives only under `.storybook/public`. A separate workshop Vite config prevents app build hooks from modifying workshop output, and clears service credentials. Browser tests that require Storybook explicitly skip unless `STORYBOOK_URL` is supplied; the workflow supplies it in a separate workshop step.

## Reviewed Knip inventory

One pre-existing file has no current entry-point consumer: `src/lib/eligibility.ts` is a proposed server-eligibility adapter whose adoption requires a product decision. It remains visible in the baseline rather than being automatically deleted. The unused `SplitText` celebration effect was deleted on 2026-09-25 (#235). Export/type findings from the full audit are advisory because registries and compatibility contracts can intentionally expose more than the current UI consumes.

Knip config declares Vercel handlers, maintenance scripts, the isolated sandbox, stories and tests as entries. Vite and Storybook config execution is disabled in Knip because the build config imports a TSX renderer; their sources are still entries and are independently typechecked/built. Explicit dependency exceptions are the Astryx CSS theme, the manually used Astryx CLI, Babel's Vite peer, the Storybook accessibility addon and the Lighthouse executable; `vercel` is an externally installed development CLI.

## SEO and deployment

English guides use `/topics/:slug`, Czech guides `/cs/topics/:slug`, and the URL controls guide language. React renders the same TopicArticle as the build. These are public explanations and examples, never scored-session answers. Static topic rewrites must precede the SPA fallback. Unknown static guides resolve to a missing file on Vercel; client-side unknown guides carry `noindex`. Metadata is cleared when leaving a guide so a quiz never inherits a guide canonical or schema.

The canonical origin is the verified production domain in `publicMetadata.ts`, never an untrusted request host or a preview URL. If that domain changes, update the registry and rebuild. LearningResource describes what the page contains; it makes no rich-result eligibility promise. Submit the generated sitemap in the owner's Search Console account when desired; account-level submission is not part of the code deployment.

## Interpreting measurements

Lighthouse is lab evidence for a particular run, not field Core Web Vitals or a promised conversion increase. Keep the complete JSON/HTML reports and compare equivalent product, locale, route, device profile and build configuration. The bundle check deliberately excludes lazy routes, font files and the coding sandbox, whose network/CPU costs are visible in Lighthouse and the treemap.

`npm run check:bundle` builds its own copy of the client into `client/dist-budget` (removed after the run) with the build-time variables production sets, then gzips the entry script, modulepreload links and stylesheets that `index.html` requests. Client code depends on those variables. While `lib/supabaseClient.ts` created the Supabase client eagerly, a build without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` left out the whole client, about 55 kB gzipped, and CI's main build set only `VITE_PRODUCT` and `VITE_LOCK_SUBJECT`, so a check that measured it stayed green while production was 14% over. `docs/quality/bundle-budget.json` lists the variables under `measuredBuild.env`, with placeholders of the real values' length and alphabet, and the check prints which configuration it measured. Add a variable there when client code starts depending on a new one. CI's main build now reads the Supabase pair from the same file, so the browser checks run against a build that signs in the way production does. On 2026-09-26 the production-shaped build of `2e6b8ba` measured 277,868 gzip bytes, and devshark.app served 277,909 for the same commit, measured the same way.

Since the same day `lib/supabaseClient.ts` imports `@supabase/supabase-js` on demand, and the production-shaped build measures 223,555 gzip bytes in five initial requests: the entry script 111,447, `react` 56,849, the stylesheet 25,056, `router` 18,064 and `tanstack` 12,139. The library is now a lazy `supabase-*.js` chunk of 55,304 gzip bytes, 423 more than the statically imported chunk it replaces, because a dynamically imported chunk keeps all of supabase-js's exports. A visitor downloads it when a session is stored in localStorage (a returning, signed-in learner, whose download starts before React renders), when the URL carries an OAuth return, on a sign-in click, or when another open tab signs in. A visitor who is not signed in never downloads it, and `tests/browser/lazy-auth.spec.ts` checks both sides. A second chunk of about 400 gzip bytes also starts with `supabase-`: the app's own `lib/supabase.ts` API helpers, which `/learn` and `/quiz` load.

Never remove sandbox isolation or development React from the exercise frame to reduce the main application's score.

References: [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/), [MSW](https://mswjs.io/docs/), [Knip](https://knip.dev/), [Storybook](https://storybook.js.org/docs), [Utopia](https://utopia.fyi/type/calculator/), [MDN Observatory](https://developer.mozilla.org/en-US/observatory), [OWASP secure headers](https://owasp.org/www-project-secure-headers/).
