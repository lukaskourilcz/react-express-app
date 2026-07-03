# DevQuiz

Developer-knowledge quiz app — topic paths, importance-weighted quizzes, daily challenges, realtime multiplayer & leaderboards (React web + Expo iOS).

- **Now:** ~$0/mo — Vercel Hobby + Supabase Free + Sentry off (no DSN committed), at hobby/near-zero traffic.
- **Stack:** Vercel (static client + 12 `api/` serverless fns) · Supabase Postgres/Auth/Realtime · Sentry (opt-in).
- **First ceiling:** Vercel Hobby caps at 12 functions and `api/` is already 12/12 — no new endpoint without Pro; Supabase Free also auto-pauses after 7 days idle.
- **At 100 users:** ~$20/mo — Vercel Pro ($20, Hobby is non-commercial anyway); Supabase still Free.
- **At 1,000 users:** ~$45/mo — Supabase Pro ($25, lifts pause + 8 GB DB + backups) on top of Vercel Pro; add HTTP caching for the ~2 MB question bank re-parsed on cold starts.
- **Watch:** Supabase egress/Realtime concurrency and Vercel function invocations/bandwidth — these scale with usage, unlike the flat plan fees.
