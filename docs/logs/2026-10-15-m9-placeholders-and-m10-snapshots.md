# 2026-10-15 — M9 placeholder authoring completed; M10 snapshot foundation

**Branch:** `feature/m8-advanced-editor` · [Rolling V1 PR #23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23)  
**Status:** M9 functionally complete with user-authorized samples; M10 active. **No merge, branch deletion, external publication or screenshots.**

## User authorization and site authoring

The user explicitly agreed to leave demo/placeholder projects, posts and imagery in place for now, with the expectation of replacing them in Studio after V1. Neutral light/desaturated media fills or no image are permitted. This changes the M9 software milestone criterion—not the later verified-content and external production launch requirements.

### Delivered

- Created four minimal, neutral grayscale `assets/placeholder/*.svg` files. They are real checked-in media, not base64 blobs or dynamic images; the loopback server now serves only tightly allowlisted checked-in SVG paths alongside its existing protected raster uploads.
- Changed the four library assets to use the new files **without changing their IDs**, so all existing Home/Work/Journal/project/post image references and the ten generated routes remain intact.
- Marked editable sample assets, active records and pages `placeholder: true`; retained `approvedForPublication: false` and global `noindex`. Ordinary caption, alt, credit and metadata fields remain editable. No real project material, prices or credits were fabricated.
- Introduced optional **unique projectCode** on project records and an ordinary `properties.projectCode` on assets. Studio provides direct editors and asset-table/search support; validation rejects duplicate or malformed codes. This is only metadata equality matching; the contextual query engine remains scheduled for M15.
- Added explicit placeholder/final toggles to Page, Record and Asset inspector panels, and default **Draft + placeholder** for new records. Projects' status options now include Draft (no generated public route).
- Added an **in-place raster image replacement** action for each asset. It retains the stable asset ID and all record cover references, atomically updates JSON and real binary media under one revision-checked server transaction, removes obsolete placeholder attribution and tags, and leaves historical media files untouched. Unsafe filenames, mismatched media, stale ETags and unknown replacement IDs are rejected. No untrusted SVG upload.
- Refined `npm run audit:content`: intentional sample content is reported separately from release issues; `--strict` continues to reject unresolved placeholders and missing verified contact details before external production indexing.
- Added M9 unit/media-integration tests and screenshot-free Chromium checks for editing codes, duplicate rejection and in-place PNG replacement, preserving editor selection and earlier M8 recovery checks.

## M10 — initial recovery safeguards

- Added `scripts/site-snapshot.mjs` with **create**, **verify**, and **restore** commands for validated JSON and all real media.
- Timestamped local backup folders, SHA-256 digests and an explicit manifest; verification detects corruption and missing/extra files.
- Restores only to a **new folder** without touching live authored source or newer images; recursive backup locations inside assets and restoring into the snapshot itself are rejected. Git ignores `backups/`.
- Added npm scripts `backup:create`, `backup:verify`, `backup:restore` and standalone [M10 recovery guide](../M10_BACKUP_RECOVERY.md).
- A regression test verifies roundtrip integrity, separate-folder restoration, failure to overwrite an existing target and tamper detection.

## Verified CI

On code commit [`e450035`](https://github.com/teodor-andonov/ta-website-builder-261012/commit/e450035b8e348e3ce03c2e30a635e4af013b6318):
- [test-and-build workflow](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38735010645) — **98/98 Node tests passed** and ten pages built with repository path audit.
- [browser-checks workflow](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38735010734) — **passed**, including `M9_PROJECT_CODE_OK`, `M9_MEDIA_REPLACEMENT_OK`, `M9_CONTACT_OK`, all M8 hierarchy and save-recovery tests.
- Content readiness output — **1 actual unresolved booking-URL configuration and 14 intentional, user-permitted placeholders**, not 21 accidentally broken demo references.
- Subsequent change [`ee216d7`](https://github.com/teodor-andonov/ta-website-builder-261012/commit/ee216d712d54c9c72debab168b1e734356668512) adds backup path containment checks; the **test/build check passed**. Final documentation commits cause another run and should be verified separately.

## Remaining M10 and M11

1. Production SEO metadata, canonical/social previews once the domain is known, image performance/size budgets, broader accessibility/browser audits and backup/recovery drills.
2. Check compatibility of real externally supplied media and replace `placeholder: true` flags only after editing. Verify the actual booking URL and approval status, **without hiding warnings via fabricated content**.
3. Static host packaging/deployment process and domain configuration (M11) without making GitHub the sole publication channel.
4. Preserve the rolling V1 branch until the one authorised **whole-V1** squash merge. No intermediate merges or deletion, and never remove `noindex` while sample content is unreviewed.

**Next development cycle:** extend M10 with metadata/SEO, media budget and production-readiness testing, followed by launch packaging work on the same V1 branch.
