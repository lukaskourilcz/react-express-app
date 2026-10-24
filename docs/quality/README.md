# Developer quality tools

These checks run on the existing Vite, Astryx, TanStack Query and PostHog stack. None needs a paid service, a production mock server or another UI system.

| Area | Run / entry point | What it checks or changes |
| --- | --- | --- |
| Performance | `npm run audit:performance -- --url=https://devshark.app`; `ANALYZE=true npm run build`; `npm run check:bundle` | Mobile and desktop Lighthouse JSON and HTML in `artifacts/performance`, the bundle treemap, and a gzip budget for what a first visit downloads (below). Inter and Manrope are self-hosted with `font-display: swap`. |
| MSW | `npm run test:client` | Real API transport, authentication failures, timeout and cancellation, offline responses, and the leaderboard's retry and empty states. No live API or user record is used. |
| Knip | `npm run check:unused`; `npm run audit:unused` | CI rejects new unused files, dependencies and unresolved imports against `unused-baseline.json`; the full report also lists exports and types for review. It never deletes code. |
| Public SEO | `npm run check:public` | The topic guides include real HTML, canonical URLs, internal links and truthful LearningResource JSON-LD. The build emits the sitemap and robots file. |
| Copy and activation | `client/src/lib/analytics.ts`; [activation notes](activation.md) | English positioning and a sample → learning call to action → quiz or path funnel, with explicit property allow-lists. |
| Storybook | `npm run storybook`; `npm run build:storybook` | Real Astryx sample, retry, toast and confirmation components, and a real leaderboard in populated, empty, loading, server-error and offline states. The toolbar switches light and dark. |
| Typography and accessibility | `npm run test:browser`; `npm run check:responsive` | Shared fluid typography and spacing, 44px guide targets, keyboard disclosure and focus, reduced-motion checks and axe WCAG A/AA tests. |
| Security | `npm run check:security -- --url=https://devshark.app` | The exact-hash theme bootstrap, the main document CSP, HTTPS and security headers, and the separate coding sandbox policy. |

## Install and CI

Use Node 24, `npm ci` and `npm ci --prefix client`, then install Chromium once with `npx playwright install chromium` for browser and Lighthouse work. In the Claude Code cloud environment the browser is preinstalled under `/opt/pw-browsers` and `npx playwright install` is disabled: set `CHROME_BIN=/opt/pw-browsers/chromium` (and `CHROME_PATH` for Lighthouse), because the preinstalled build is not the one Playwright 1.63 would download. `CHROME_BIN` and `CHROME_PATH` can point to any compatible browser. After a build, start `npm run preview --prefix client -- --host 0.0.0.0 --port 4173`.

The Product quality workflow (`.github/workflows/quality.yml`) has the jobs `sql`, `quickjs`, `static`, `tests`, `coding` and `browser`, plus `verify`, which passes only when the five non-SQL jobs pass. Branch protection requires `verify` and `sql`. The browser job builds devShark, runs the Playwright specs, the responsive checks in both themes and the harness test, then builds Storybook and records Lighthouse results; reports go up as the `quality` artifact. `npm run ci:parity` runs the same jobs locally (`--list`, `--only`, `--fast`). The Vercel Git integration owns deployment; the workflow deploys nothing.

Do not add MSW initialization to `src/main.tsx` or copy its worker into `client/public`: the worker lives only in `client/.storybook/public`. The workshop's own Vite config keeps app build hooks away from Storybook output and clears service credentials. Browser tests that need Storybook skip unless `STORYBOOK_URL` is set; the workflow sets it in a separate step.

## Knip

Check the current Knip result and the actual imports before treating a baseline entry as unused. Export and type findings from the full audit are advisory, because registries and compatibility contracts can expose more than the current UI uses.

The Knip config declares the Vercel handlers, maintenance scripts, the isolated sandbox, stories and tests as entries. It does not execute the Vite and Storybook configs, because the build config imports a TSX renderer; their sources are still entries and are typechecked and built on their own. The explicit dependency exceptions are the Astryx CSS theme, the Astryx CLI, Babel's Vite peer, the Storybook accessibility addon and the Lighthouse executable; `vercel` is an externally installed development CLI.

## SEO and deployment

Guides live at `/topics/:slug`. React renders the same `TopicArticle` the build prerenders. They are public explanations and examples, never scored-session answers. Static topic rewrites precede the SPA fallback. An unknown static guide resolves to a missing file on Vercel, and an unknown guide rendered in the client carries `noindex`. Leaving a guide clears its metadata, so a quiz never inherits a guide's canonical URL or schema.

The canonical origin is the production domain in `client/src/lib/publicMetadata.ts`, never a request host or a preview URL; if the domain changes, update it and rebuild. LearningResource describes what the page contains and promises no rich result. Submitting the sitemap in Search Console is an owner action outside the deployment.

## Reading the measurements

Lighthouse is lab evidence for one run, not field Core Web Vitals or a promise about conversion. Keep the complete JSON and HTML reports, and compare runs of the same product, route, device profile and build configuration. The bundle check leaves out lazy routes, font files and the coding sandbox; Lighthouse and the treemap show their cost.

`npm run check:bundle` builds its own copy of the client into `client/dist-budget` (removed after the run) with the build-time variables production sets, then gzips the entry script, the modulepreload links and the stylesheets that `index.html` requests. Client code depends on those variables: without the Supabase pair, a build leaves out code production serves. `docs/quality/bundle-budget.json` lists them under `measuredBuild.env`, as placeholders with the real values' length and alphabet, and the check prints which configuration it measured. Add a variable there when client code starts to depend on a new one. CI's main build reads the Supabase pair from the same file, so the browser checks run against a build that signs in the way production does.

The budget, `initialGzipBytes`, is 241,651 gzip bytes in five initial requests, the measured size of the English-only build of 21 October 2026, so any growth of the first visit fails the check until someone raises the budget on purpose. On 24 October 2026, after the paths performance audit (#587), the first visit measured 231,204 bytes (main `4c4d3a94`: 231,223); a change should not make it grow. The check also measures the Sentry SDK chunk against `monitoringGzipBytes` (60,000; 49,500 measured). That chunk is not an initial request: it loads after the page's load event, at the browser's next idle moment, or at once on the first error. `lib/supabaseClient.ts` loads `@supabase/supabase-js` on demand, as a lazy `supabase-*.js` chunk of about 55 kB gzipped. A visitor downloads it when a session is stored (a returning, signed-in learner, whose requests meanwhile carry the stored token while it is more than 90 seconds from expiry, and whose public reads carry none), when the URL carries an OAuth return, on a sign-in click, or when another open tab signs in; a visitor who never signs in never downloads it, and `tests/browser/lazy-auth.spec.ts` checks both sides. A second chunk of about 400 gzip bytes, the app's own `lib/supabase.ts` API helpers, also starts with `supabase-`. It is not an initial request: the lazy chunks that call the API load it, among them Learn, Quiz, the Challenge, Today, Profile, the leaderboard, Cards and the coding pages.

Never remove sandbox isolation or development React from the exercise frame to improve the main application's score.

References: [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/), [MSW](https://mswjs.io/docs/), [Knip](https://knip.dev/), [Storybook](https://storybook.js.org/docs), [Utopia](https://utopia.fyi/type/calculator/), [MDN Observatory](https://developer.mozilla.org/en-US/observatory), [OWASP secure headers](https://owasp.org/www-project-secure-headers/).
