# Developer quality tools

The eight free-tool recommendations are implemented through the existing Vite, Astryx, TanStack Query and PostHog stack. No paid service, production mock server or alternative UI system is required.

| Area | Run / entry point | What it checks or changes |
| --- | --- | --- |
| Performance | `npm run audit:performance -- --url=https://devshark.app`; `ANALYZE=true npm run build`; `npm run check:bundle` | Mobile/desktop Lighthouse JSON and HTML in `artifacts/performance`, existing bundle treemap, and a gzip budget for the initial static JS/CSS dependency graph. Inter and Manrope are now self-hosted with `font-display: swap`, removing the external font stylesheet dependency. |
| MSW | `npm run test:client` | Real API transport, authentication failures, timeout/cancellation, offline responses and leaderboard retry/empty state. No live API or user record is used. |
| Knip | `npm run check:unused`; `npm run audit:unused` | CI rejects new unused files/dependencies/unresolved imports; the full report also lists exports and types for review. It never deletes code automatically. |
| Public SEO | `npm run check:public` | Five guides per product, each in EN and CS, include real HTML, language pairs, canonical URLs, internal links and truthful LearningResource JSON-LD. Build emits sitemap and robots. |
| Copy and activation | `client/src/lib/analytics.ts`; [activation notes](activation.md) | EN/CS positioning and a sample → learning CTA → existing quiz/path funnel, with explicit property allowlists. |
| Storybook | `npm run storybook`; `npm run build:storybook` | Real Astryx sample, retry, toast and confirmation components; a real leaderboard in populated, empty, loading, server-error and offline states. Toolbar switches EN/CS and light/dark. |
| Typography and accessibility | `npm run test:browser`; `npm run check:responsive` | Shared fluid rem/vw typography and spacing, 44px guide targets, keyboard disclosure and focus behavior, reduced-motion checks and axe WCAG A/AA tests. |
| Security | `npm run check:security -- --url=https://devshark.app` | Exact-hash theme bootstrap, main document CSP, HTTPS/security headers and the distinct coding sandbox policy. |

## Install and CI

Use Node 24, `npm ci` and `npm ci --prefix client`, then install a local Chromium with `npx playwright install chromium` for browser/Lighthouse work. The production app does not require Chromium. Start `npm run preview --prefix client -- --host 0.0.0.0 --port 4173` after building. `CHROME_BIN` and `CHROME_PATH` can point to an existing compatible browser.

The Product quality workflow builds both products, runs the release and public-HTML checks, and records browser results as GitHub artifacts. It also builds the devShark workshop and records Lighthouse results. The existing Vercel Git integration owns deployment; this workflow does not create a second deployment pipeline. Configure branch protection to require Product quality if you want GitHub to enforce this on every future merge.

Do not add MSW initialization to `src/main.tsx` or copy its worker into `client/public`: the worker lives only under `.storybook/public`. A separate workshop Vite config prevents app build hooks from modifying workshop output, and clears service credentials. Browser tests that require Storybook explicitly skip unless `STORYBOOK_URL` is supplied; the workflow supplies it in a separate workshop step.

## Reviewed Knip inventory

Three pre-existing files have no current entry-point consumers: `src/lib/eligibility.ts` is a proposed server-eligibility adapter whose adoption requires a product decision, `src/lib/homeFeatures.tsx` holds the old per-subject feature-card catalogue, and `src/components/reactbits/SplitText.tsx` is an optional unused celebration effect. They remain visible in the baseline rather than being automatically deleted. Export/type findings from the full audit are advisory because registries and compatibility contracts can intentionally expose more than the current UI consumes.

Knip config declares Vercel handlers, maintenance scripts, the isolated sandbox, stories and tests as entries. Vite and Storybook config execution is disabled in Knip because the build config imports a TSX renderer; their sources are still entries and are independently typechecked/built. Explicit dependency exceptions are the Astryx CSS theme, the manually used Astryx CLI, Babel's Vite peer, the Storybook accessibility addon and the Lighthouse executable; `vercel` is an externally installed development CLI.

## SEO and deployment

English guides use `/topics/:slug`, Czech guides `/cs/topics/:slug`, and the URL controls guide language. React renders the same TopicArticle as the build. These are public explanations and examples, never scored-session answers. Static topic rewrites must precede the SPA fallback. Unknown static guides resolve to a missing file on Vercel; client-side unknown guides carry `noindex`. Metadata is cleared when leaving a guide so a quiz never inherits a guide canonical or schema.

Canonical origins are the verified production domains in `publicMetadata.ts`, never an untrusted request host or a preview URL. If the StudyShark custom domain changes, update that registry and regenerate both builds. LearningResource describes what the page contains; it makes no rich-result eligibility promise. Submit the generated sitemap in the owner's Search Console account when desired; account-level submission is not part of the code deployment.

## Interpreting measurements

Lighthouse is lab evidence for a particular run, not field Core Web Vitals or a promised conversion increase. Keep the complete JSON/HTML reports and compare equivalent product, locale, route, device profile and build configuration. The bundle check deliberately excludes lazy routes, font files and the coding sandbox, whose network/CPU costs are visible in Lighthouse and the treemap. Never remove sandbox isolation or development React from the exercise frame to reduce the main application's score.

References: [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/), [MSW](https://mswjs.io/docs/), [Knip](https://knip.dev/), [Storybook](https://storybook.js.org/docs), [Utopia](https://utopia.fyi/type/calculator/), [MDN Observatory](https://developer.mozilla.org/en-US/observatory), [OWASP secure headers](https://owasp.org/www-project-secure-headers/).
