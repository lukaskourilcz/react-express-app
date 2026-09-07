# devShark production review · 7 September 2026

Issue #126 and PR #127. This review focuses on devShark and its marketingShark source.
Other subjects and historical database migrations are preserved.

## Implemented and verified

- The quiz and marketing importer share lib/webdev-bank.ts. This module has no deployment configuration or credentials; adding/removing a source module now changes both consumers.
- BoardlessAI imported 2,511 questions (all with Czech fields; 661 with fenced code), at source commit 77c8dfd1e20410ba3ad5c702fea49e2a3619119b. The new --check import mode detects content drift and requires committed source files for reproducible provenance.
- Compatible posthog-js/fflate lockfile updates clear the moderate ZIP64 advisory. Root and client production audits returned zero findings.
- API typecheck, launch contracts, client TypeScript and both Vite builds pass. The isolated coding sandbox still has a 213 kB gzip JS chunk; it is separate from the main entry and remains a performance follow-up.
- Removed the unreferenced client badge wrapper; retained the shared coding badge catalog and stored user achievements. The server endpoint is dormant but preserved until its broader contract is retired.

## Release checklist

- [ ] Confirm the correct Vercel production project, branch/main and final deployment.
- [ ] Verify production /api/health, authenticated learning/grading, saved progress and the admin ACL with a real account. This environment has no verified application session.
- [ ] Confirm Supabase, session, rate-limit and optional analytics settings listed in NEEDED.md on the deployed project. No secret value was read or exposed during this review.
- [ ] Verify mobile/tablet/desktop learning flows, keyboard use and 200% zoom. Existing static and build checks do not prove visual acceptance.
- [ ] After question changes, re-import the committed bank into quorum and run its --check mode before marketing release.
- [ ] Review one real marketingShark draft and generated carousel in BoardlessAI admin before social activation. The expected palette is ocean blue with the product's fin, and the CTA points to https://devshark.app.

See the [shared production checklist](https://github.com/lukaskourilcz/quorum/blob/claude/production-audit-2026-09-07/docs/production-review-2026-09-07.md) for actor keys, image delivery, marketing validation, DesignLab improvements and Mobbin sources.
