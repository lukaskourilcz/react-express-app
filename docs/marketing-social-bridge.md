# devShark's MarketingShark bridge

The owner identified Instagram **@devshark.app** on 2026-09-27. Its canonical public URL
is in `client/product-catalog.ts`; Profile and Rewards read the same value. Linking the profile
does not authorize publishing or award engagement rewards.

BoardlessAI's `lukaskourilcz/quorum` repository owns MarketingShark, Design Lab, Meta credentials
and `/admin/queue`. Before its daily room it imports the committed public `main` question bank
and coding challenge definitions from this repository. Each snapshot records the exact source
commit and content hash. A failed import stops that run instead of producing from stale data.
This repository exposes no new handler and receives no publishing credentials.

MarketingShark produces English drafts about devShark's questions and approved product facts.
The owner edits slide copy/design in Design Lab and captions in Queue. Each post needs its own
approval; revisions clear that approval. Meta account verification and connection activation are
separate from approving content. The owner approves the actual first post through Queue too.

Instagram requires a Business/Creator account and the Meta app's publishing authorization.
The chosen Instagram Login route does not require a Facebook Page. The quorum runbook,
`docs/OWNER-SOCIAL-QUEUE.md`, names the token/ID configuration and remaining setup steps.
No live connection was established by merely adding the URL here.
