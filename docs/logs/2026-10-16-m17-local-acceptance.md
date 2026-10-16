# 2026-10-16 — M17 real local V2 acceptance

Branch: `feature/v2-unified-studio`, [PR #24](https://github.com/teodor-andonov/ta-website-builder-261012/pull/24).

The user requested full V2 checks, desktop screenshots for their review, then a merge and a new development branch **after their greenlight**. The checkout is `C:\Users\andon\T\Repos\20261016-2031_website-studio-builder`. No merge, publication or branch deletion occurred during acceptance.

## Release fixes

- The local server did not serve `style-system.mjs`, `asset-query.mjs` or `asset-usage.mjs`, preventing Studio startup. Added these exact modules to the existing allowlist and tested every Studio helper route, while continuing to reject server source.
- Duplicating a Project copied its unique project code, causing validation to reject the copy. Draft copies now start with an empty code, preserving the original project and its asset associations. The real browser duplication test asserts this behavior.
- Unconstrained Card rows used fractional tracks, making all sections as tall as the largest image/hero after composition migration. They now use content-height tracks, as documented in M7; constrained Cards retain equal fractional tracks and their aspect ratio. Added Node and real-browser checks for constrained hero proportions and a project heading above the fold. Canonical JSON and route identities are unchanged.
- Updated V1-era fixtures and browser selectors to use V2 page/record compositions and template chrome. Grid/padding validation now also traverses composed Records. Media replacement must retain the project code used by contextual galleries. Fixed Windows file-URL conversion in the server test and executable detection in screenshot capture.
- Browser failures now save the returned DOM in an ignored local log and report the actual result element. Automated dialogs do not block unattended browser diagnostics.

## Verification

- `npm run release:check`: **AUTOMATED_CHECKS_PASSED_VISUAL_SIGNOFF_PENDING**, all **11** audit steps passed. Local Node **25.9.0**; installed Google Chrome.
- **169/169 Node tests** passed across 30 test files.
- Real Chromium checks passed: semantic public DOM, keyboard skip link, hero grid/height, document wheel scrolling, project title visibility; Studio page/template/chrome editing, named styles and inheritance reset, record Design/Preview/Fields, contextual galleries, draft-safe duplication, media dependency protection, indexing/contact/project-code controls and image replacement; pointer grid edits, drag/reparent, multi-step undo/redo, keyboard movement, 1280×800 and 1600×1000 tree checks, 320-item/deep-tree stress, invalid JSON/import/upload rejection, stale-save conflict and offline recovery. All authoring writes used disposable data.
- Root and Pages-subpath noindex output, temporary custom-domain indexable output, canonical/sitemap links, private-file exclusion, both CRC/SHA-256 ZIP modes and all internal routes/media passed the audit. Live JSON and all source assets retained their baseline fingerprints.
- Local report: `release/reports/261016-2041_m17-release-audit.json` (generated, Git ignored).
- `npm run release:visual`: five **1440×900** PNGs with SHA-256/dimension manifest at `release/review/261016-2040_m17-visual/`. Agent inspection caught the row-sizing regression before this final capture. The latest Home, Work, Journal, Balkan House and Post captures remain **pending user review**.
- `npm run package:site` and independent ZIP verification passed: `release/website.zip`, **21 public files**, **27,293 compressed bytes**, indexing off. Extracted to `release/extracted-review-261016-2041` and served over loopback: all **10** routes, stylesheet and **4** canonical media files returned HTTP 200; `/studio/` returned 404.
- Retained editable-source backup: `backups/261016-2042_site-backup`, **9 files**, separate from the public ZIP. The full audit independently verified snapshot checksums and isolated restoration.
- `git diff --check` passed. No dependency installation, new workflows, external hosting changes, fabricated content or indexing changes.

## Remaining gate and next action

Present the five desktop screenshots and local preview to the user. Wait for their explicit visual/merge greenlight; do not mark human review complete or merge in advance. On approval, squash PR #24 using the reviewed head SHA, verify the GitHub Pages publication, preserve existing branches, and create one fresh development branch from the merged `main`. Real portfolio content, booking details, external hosting/domain transfer and broader manual assistive-technology/device QA remain deferred.
