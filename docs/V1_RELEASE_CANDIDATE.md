# V1 release candidate — scope, acceptance, and remaining gates

**As of 2026-10-15:** The M8–M11 **software/staging implementation** is feature-complete under automated testing. The actual public production release and the pre-authorised V1 squash-merge **are not claimed complete** while mandatory release prerequisites remain open. [One living roadmap](IMPLEMENTATION_PLAN.md) · [V1 final audit log](logs/2026-10-15-v1-release-candidate.md).

## Software delivery (verified)

- **M8:** structure-first desktop authoring, Cards/Items, isolated scopes, keyboard editing, collision-aware geometry, Undo/Redo, safe JSON imports, optimistic saves and failure recovery.
- **M9:** real TA site architecture, editable projects/posts, homepage services and arrangements, reuse of the contact CTA, stable asset replacement, project-code metadata. The user expressly accepted clearly flagged neutral image/content placeholders for **V1 staging only**, not as an assertion of real project facts.
- **M10:** default noindex, escaped page-specific SEO/social metadata, strict approval/configuration gate for indexing, valid image budgets, semantic heading/skip-link tests, backups and recovery.
- **M11:** complete host-independent static ZIP (no editor/API), reproducible public routes, checksum verification, atomic output, full isolated backup→edit→failure→restore→byte-identical rollback drill. No production credentials required for development.
- **Current CI:** 114/114 Node tests, green screenshot-free Chromium workflow, all static path/ZIP/rollback checks. `npm run v1:staging-check` reports `stagingReady:true`, `productionReady:false`, 10 routes, 14 authorised placeholders and one missing booking URL. It explicitly **cannot authorise external production**.

## Final staged-release smoke commands

```sh
npm test
npm run audit:content
npm run audit:media
npm run build
npm run v1:staging-check
npm run package:site
npm run package:verify
npm run release:rehearse
```

GitHub CI runs these alongside screenshot-free Chromium checks and the repository-prefix Pages route audit. PR checks also attach a verified, nonindexed ZIP as `ta-v1-staging-preview` (7-day retention), available in the **Artifacts** area at the bottom of the successful GitHub Actions workflow run. This permits actual manual preview without merging or deploying. The output is a draft **unindexed static site**. Production indexing stays disabled, and the shared site data remains JSON.

## Remaining release prerequisites — do not silently mark complete

1. **Genuine publication content**: replace/explicitly review 14 flagged project/post/page/media placeholders, verify factual case studies and ownership/licences/credits. Placeholder acceptance was for engineering/staging, not indexed production.
2. **Contact booking**: supply and validate the actual 15-minute call URL (currently blank); continue rendering a nonclickable CTA until configured.
3. **Hosting**: choose and verify actual production host/domain, control of DNS, HTTPS/TLS, direct nested route/404, redirects, and a host-side rollback rehearsal. Local ZIP verification is not live-host verification.
4. **Human QA**: manual keyboard and screen-reader check on the actual site, target browsers/devices and real image-media performance. Automated DOM/ARIA tests do not substitute for that.
5. **Final GitHub merge gate**: original standing authorization permits **one** squash merge of PR #23 to `main` only once the complete M8–M11 acceptance policy and remaining release prerequisites have been met, with green latest-head CI and exact head SHA verified. No manual reapproval of the squash merge is needed **after those prerequisites are met**. No direct pushes to `main`, interim merges, branch deletion, auto-delete or unapproved production host deployment.

## Practical handoff

The engineering scope is now a releasable **V1 staging candidate**. Review or replace the site content through Content Studio first. Then provide the production hosting/domain and booking details, complete manual release QA and rerun the strict content gate before performing the already-authorised final squash merge and verifying GitHub Pages staging.

Post-V1 work M12–M17 retains its approved architecture. It starts on **one new development branch based on `main` after the verified V1 squash merge**, not on this V1 branch.
