# 2026-10-15 — V1 software/staging phase-end decision

**Explicit user decision:** finish and squash-merge V1, start the V2 development branch, and defer content, booking/contact, external hosting, production-domain configuration and human QA until after V2. This is a scope clarification of release acceptance: the unindexed V1 **software/staging** release is accepted, not indexed external production.

**V1 engineering evidence:** PR #23 includes M8–M11 and has passed 114 Node tests, the independent ZIP validator, complete non-destructive backup/build/rollback rehearsal, static route checks and screenshot-free Chromium UI checks. The verified staging output defaults to `noindex, nofollow` and contains no writable Studio/API. Exact-head CI must be checked again after these closeout documentation edits.

**Merge procedure:** convert draft PR #23 to ready, perform the **one** user-authorised squash merge to `main` with an expected PR head SHA; preserve its historical source branch. Confirm the GitHub Pages staging workflow does not enable indexing. Then create one new retained V2 branch from that precise merge commit and start M12, using [POST_V1_ARCHITECTURE.md](../POST_V1_ARCHITECTURE.md) and the [living roadmap](../IMPLEMENTATION_PLAN.md).

**Production gates remain closed:** 14 intentionally temporary placeholders, missing verified booking link, actual host/DNS/TLS and manual accessibility/device review. `TA_ENABLE_INDEXING=1` must still refuse an unapproved production build. No screenshots, branch deletion, external production host deployment or background automation.
