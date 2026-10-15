# 2026-10-15 — V1 staged release candidate and phase-end acceptance audit

**Phase:** M8–M11 V1, continuing on `feature/m8-advanced-editor`, [draft PR #23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23). User requested wrapping up V1. **Status:** engineering and unindexed staging release candidate validated; external production and original conditional squash-merge prerequisites still outstanding. No merge, production deployment, screenshot or branch deletion.

## Final implementation slice

- Added `scripts/v1-staging-acceptance.mjs`, a read-only staging acceptance gate. It enforces valid canonical JSON and site routes, existing model and safe `noindex` metadata, no invented canonical/production URL, required built HTML/CSS/robots files and no private editor/API files in the public output.
- Explicitly permits only the user-approved temporary media/page/record placeholder classifications and a missing booking configuration for **staging**. Any unexpected publication audit finding, lost route or contradiction between `placeholder` and `approvedForPublication` fails the gate. It emits `stagingReady:true` and `productionReady:false`, never implying a public production release.
- Added `npm run v1:staging-check` and a dedicated CI step after the static build; four focused tests cover valid sample staging, unflagged placeholder source rejection, contradictory editorial flags and missing index route.
- Added CI upload of the independently verified, unindexed `ta-v1-staging-preview` ZIP (7-day retention) so a manual review can happen without merging into `main` or deploying sample content.
- Kept all M8–M11 original release requirements explicit: no invented domain/host, verified real booking URL, case study permission or manual accessibility certification. Public production `TA_ENABLE_INDEXING=1` remains blocked.
- Updated [living roadmap](../IMPLEMENTATION_PLAN.md) and added [V1 release candidate checklist](../V1_RELEASE_CANDIDATE.md) separating engineering staging readiness from public-host and merge gates.

## CI evidence / exact state

[Implementation checkpoint `652e311`](https://github.com/teodor-andonov/ta-website-builder-261012/commit/652e311bcbea2d21f5cc7b7771885fcc836fe0c1):
- [Test and build](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38769200928) **success:** 114/114 Node tests; 10 public routes; Pages path audit (11 HTML paths); standalone ZIP/package validation; reproducible backup/restore drill.
- [Chromium browser QA](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38769201374) **success**, screenshots disabled as requested.
- Staging acceptance printed `V1_STAGING_ACCEPTANCE_OK` with `stagingReady:true`, `productionReady:false`, `routes:10`, `allowedPlaceholders:14`, `productionBlockers:['missing-booking-url']`.
- PR mergeability was **clean**, draft PR #23 still open, with both checks green. A final documentation-only commit may trigger a new CI run and must be verified separately.

## Remaining blocking external input and signoff

- Actual project/post/page facts, rights/credits, real media, editorial approval and 14 sample placeholders.
- Verified real 15-minute booking URL.
- Actual production host/domain access, DNS/TLS, nested routes/404/redirect checks and live-host rollback rehearsal.
- Manual keyboard/screen-reader and representative-browser/device/real-media QA.
- **No squash merge under the previously approved strict phase-end policy until those conditions are genuinely met.** Approval to perform the merge once eligible is already given and does not need to be solicited again; eligibility itself is distinct.

The V1 **software engineering scope is effectively closed as a staging candidate**; any future work should either resolve the above launch/acceptance blockers or change scope only on explicit user instruction. No post-V1 branch exists yet because the phase-end squash merge has not been verified.
