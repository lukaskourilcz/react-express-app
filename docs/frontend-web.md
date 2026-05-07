# Frontend (web)

The React + Vite + MUI client in `client/`. The web app users and search
engines see at <https://devquiz.vercel.app> (or wherever you deploy).

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | React 18 + react-router-dom 7 |
| Build | Vite 5, manual chunks for vendor cache stability |
| UI | MUI 5 (`@mui/material`, `@emotion`) |
| Auth | `@auth0/auth0-react` |
| Realtime | `@supabase/supabase-js` (only realtime; reads/writes go via REST API) |
| Code highlighting | `react-syntax-highlighter` (Prism build only, lazy-loaded) |
| State | `useState` + small `addListener`/`removeListener` libs (no Redux) |
| Storage | `sessionStorage` for in-progress quiz, `localStorage` for bookmarks/settings |
| Tests | None yet (TODO) |

## Routes

```
/             → Quiz settings + Today's challenge CTA + tiles
/play         → Multiplayer / classroom landing
/play/:code   → Match (lobby / running / finished)
/leaderboard  → Global / Daily / Category tabs
/cards        → Memory-card self-review (due cards by default)
/drill        → Auto-graded drill from due cards (SRS-driven)
/profile      → Stats / streaks / achievements / bookmarks / cards-shortcut
```

All routes are lazy-loaded via `React.lazy(() => import(...))` in
`client/src/App.tsx`. Initial bundle ships only `Quiz`; everything else is
fetched on navigation.

## Bundle composition

Initial route (Quiz home) at last measurement:
- `index.js` — 6.4 KB gz
- `Quiz.js` — 8 KB gz
- `react.js` — 46 KB gz
- `mui.js` — 86 KB gz
- `router.js` — 56 KB gz
- ≈ **~200 KB gz initial** vs the original ~370 KB monolithic chunk

Lazy chunks: `Profile.js` (2 KB), `Leaderboard.js` (2 KB), `Play.js` (5 KB), `Cards.js` (3 KB), `Drill.js` (3 KB), `prism.js` (228 KB — only loaded when a code-snippet question renders).

## Component map

### Top-level
- `App.tsx` — routes, app bar, dark-mode toggle, route-change focus + title.
- `main.tsx` — root: `<ErrorBoundary><Auth0Provider><BrowserRouter><ColorModeProvider /></BrowserRouter></Auth0Provider></ErrorBoundary>`.

### Components (`src/components/`)
- `Quiz.tsx` — the entire quiz state machine: `ready → loading → in-progress → submitted` (or `error`). Persists in-progress state to `sessionStorage`. Keyboard shortcuts. Daily mode. Practice mode toggle (skips stats). Sound effects toggle (WebAudio).
- `Profile.tsx` — auth-aware. Loads `user_stats`, computes achievements, shows bookmarks shortcut. Refactored into `Profile` (auth gates) + `ProfileBody` (rendering with hooks) so all hooks stay top-level.
- `Leaderboard.tsx` — three tabs (Global / Daily / Category). Effect deps gated by active tab so changing the category chip on Global doesn't refetch.
- `Play.tsx` — exports `PlayLanding` and `PlayMatch`. Match screen polls `/api/play/state` every 4s plus listens to Supabase Realtime broadcast on `match:<code>`. Host heartbeat every 30s. Live countdown derived from `question_started_at`.
- `Cards.tsx` — flashcard self-review. Filters to **due** cards by default (with a "Review anyway" escape hatch when nothing is due). One card at a time, "Reveal answer" → optional self-pick → "Got it" / "Need more practice". Six correct in a row graduates a card.
- `Drill.tsx` — auto-graded mini-quiz built from the user's due cards. Picks 10, MCQ-style, locks in answers like a normal quiz. Each correct answer advances the SRS schedule; each wrong answer resets it. Final score screen with a "Drill again" CTA when more cards are still due.
- `SyncBoot.tsx` — invisible component that bridges Auth0 state to `cards-sync`. Mounted once at the root.
- `CodeBlock.tsx` — lazy-renders `react-syntax-highlighter` Prism build with a plain `<pre><code>` fallback so first-paint isn't blocked.
- `AuthButton.tsx` — login / avatar menu. Real `<ButtonBase>` with `aria-haspopup`/`aria-expanded` (NOT a `<Box onClick>`).
- `ErrorBoundary.tsx` — root-level catch with a Reset button.
- `ReportDialog.tsx` — question reporting modal.

### Lib (`src/lib/`)
- `api.ts` — `apiFetch<T>(url, opts)`. Handles `AbortController`, 15s timeout, structured `ApiError`, and `friendlyError()` helper.
- `supabase.ts` — supabase client + thin REST wrappers (`getUserStats`, `recordQuizResult`, `recordCategoryStats`, `reportQuestion`, `getDailyChallenge`).
- `play.ts` — multiplayer API client + leaderboard fetchers.
- `bookmarks.ts` — localStorage-backed store with `addListener`/`removeListener` for cross-component sync.
- `cards.ts` — SRS-backed flashcard deck. Auto-populated by Quiz on submit (every wrong answer becomes a card). Spaced-repetition intervals: 10 min → 1d → 3d → 7d → 14d → 30d. `markCardCorrect` advances streak and reschedules `dueAt`; six in a row graduates the card. `markCardWrong` resets the streak and makes the card due now. `getDueCards()` filters for cards whose time has come.
- `cards-sync.ts` — server sync. On sign-in, pulls server deck, merges with local (last-write-wins on `updatedAt`), pushes the merged result. Subsequent local mutations are pushed via a 1.5s debounce. Graceful no-op if user is unauthenticated or offline.
- `achievements.ts` — pure functions: `computeAchievements(ctx)` returns the badge list with earned/locked.
- `settings.ts` — practice-mode + sound-effects toggles, plus tiny WebAudio `playCorrect/playComplete` helpers.

### Theme (`src/theme/`)
- `MuiTheme.ts` — `createAppTheme(mode)` returns light/dark theme. Brand color `BRAND.green = '#2D7A2D'` (passes WCAG AA). `quizStyles` object holds reusable `sx` chunks for the quiz buttons.
- `ColorModeContext.tsx` — light/dark toggle persisted to `localStorage` (key `devquiz:color-mode`).

## State management approach

There is no Redux / Zustand / Recoil. State lives in three buckets:

1. **Local component state** (`useState`) — most things. The quiz state machine is one big `useState` switch.
2. **URL state** — route, query params (`?tab=global`).
3. **Cross-component small stores** — `BookmarkStore`, `ColorModeContext`, `AuthService` (mobile parallel). They expose an event listener pattern: `add/removeListener`. Components that need to react use `useEffect` to subscribe.

Why not a global store? Each cross-component concern is small (bookmarks, theme, auth). A full store would be bloat. If a fourth such concern shows up, switch to Zustand.

## Performance notes

- **`React.lazy`** every route in `App.tsx`.
- **Vite `manualChunks`** in `vite.config.ts`: `react`, `router`, `mui`, `auth0`, `supabase` are stable vendor chunks for cache reuse across deploys.
- **Code highlighter** (`react-syntax-highlighter`) imported via the Prism-only entry path (`react-syntax-highlighter/dist/esm/prism`) to avoid bundling highlight.js. Saves ~600 KB of language definitions.
- **No `useMemo`/`useCallback` cargo culting** — only where dep arrays are stable and the child is memoized.

## Accessibility

- Skip-to-content link in `App.tsx`.
- Semantic `<main>` with `id="main-content"` and `tabIndex={-1}`; route changes focus and update `document.title`.
- Every icon-only button has an `aria-label` (Instagram, GitHub, Hint, Bookmark, Theme toggle).
- `RadioGroup` linked to question text via `aria-labelledby`.
- Result heading receives focus + `role="status" aria-live="polite"` for the score.
- Brand green is `#2D7A2D` (4.85:1 contrast on white) instead of the original `#339933` (3.99:1, fails AA).
- Correct/incorrect conveyed by both color AND text label, never color alone.

## Error handling pattern

```tsx
try {
  const data = await apiFetch<X>('/api/...');
  setX(data);
} catch (err) {
  setError(friendlyError(err));   // user-facing message
}
```

`apiFetch` always throws an `ApiError`. The component decides whether to:
- Render an inline `<Alert>` and let the user retry (preferred for non-fatal),
- Transition to an explicit `'error'` state for the screen,
- Or just toast the message via `<Snackbar>` for fire-and-forget calls.

Errors are NOT silenced. The `console.error` calls inside `lib/supabase.ts`
are belt-and-suspenders — the actual surfacing is via the thrown `ApiError`.

## Build & local dev

```bash
# One-time
cd client && npm install

# Dev (Vite + Vercel proxy)
cd /home/user/react-express-app && vercel dev   # serves client + api together

# Or just Vite (no API)
cd client && npm run dev

# Production build
cd client && npm run build   # → client/dist
```

Prod env vars (set in Vercel project settings):
- `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, optional `VITE_AUTH0_AUDIENCE`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `SESSION_SECRET` (server-only — required in production)

## Adding a new screen

1. Create `client/src/components/MyScreen.tsx`.
2. Lazy-load it in `App.tsx`:
   ```tsx
   const MyScreen = lazy(() => import('./components/MyScreen'));
   ```
3. Add a `<Route>`.
4. Add to `ROUTE_TITLES` in `App.tsx`.
5. Add a nav button if user-facing.
6. Add a section to `docs/frontend-web.md` (this file).
