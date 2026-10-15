# 2026-10-15 — M10 page metadata, release indexing safety and media budgets

**Branch:** `feature/m8-advanced-editor` · [V1 draft PR #23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23)  
**Phase:** M10 production quality in progress. No merge, deployment, branch deletion or screenshot capture.

## Implemented

- Shared `src/render.mjs`: per-page escaped HTML title/description, Open Graph site/title/description/type and Twitter title/description/card metadata. Post detail pages use `og:type=article`; source data and Studio preview keep the same Card/Item renderer. No invented production canonical URLs on demo pages.
- New `src/publishing.mjs`: indexable output requires an explicit `TA_ENABLE_INDEXING=1`, safe verified-domain-shaped HTTPS `TA_PUBLIC_ORIGIN`, and **zero** content-audit findings. Sample pages, sample media and absent booking URLs block production indexing. A domain-like string is *not ownership proof*; actual hosting remains M11. The staging default always emits `noindex, nofollow`.
- `src/build.mjs`: media checks and release policy execute **before** deleting prior static output. Approved production builds require `TA_BASE_PATH=/`, emit per-route canonical and `og:url`, real non-placeholder social cover when present, `sitemap.xml`, and production `robots.txt`. Preview emits restrictive `robots.txt` without sitemap/canonical; the per-page noindex remains primary on GitHub Pages project paths.
- New `scripts/media-budget.mjs`: checks each referenced JSON asset's physical file, approved `assets/` containment, invalid or missing sources, and size limits **12 MiB/image; 32 MiB total referenced unique media**. `npm run audit:media` runs separately in CI and automatically before build. Checked-in SVG placeholders remain safe; raster uploads remain protected by MIME/content checks.
- Collection project-tile covers opt into lazy image loading; other rendered images decode asynchronously. No CSS/layout reflow or additional app dependency.
- Hardened the editorial audit against clearing `placeholder: true` while leaving `/assets/placeholder/` media paths unchanged.
- Added `test/publishing.test.mjs`: default staging noindex, unsafe/unowned-format domain rejection, missing-content release refusal, approved fixture canonical/OG/social metadata, production sitemap/robots output, project-base prohibition, asset containment/missing files and budget checks. Updated isolated image-upload test fixture to include current checked-in placeholders.

## CI and iteration

The first broadened test suite exposed a fixture that lacked copied placeholder assets, corrected in `test/assets.test.mjs`. New public-origin tests caught `example.com` root being accepted by the domain-shape filter; fixed the validator. A browser job transiently failed to start headless Chrome in CI; a later screenshot-free run passed the editor workflow unchanged. No runtime screenshots were generated.

On implementation [`f620ef3`](https://github.com/teodor-andonov/ta-website-builder-261012/commit/f620ef3f4fcf6dd0a66ac9a0506df7ea14100612):
- [Node test/build](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38737867670) — **103 tests passed, 0 failed**, static output and Pages-prefix audit successful.
- [Chromium browser checks](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38737867660) — **success**, existing M8/M9 interactive, accessibility DOM, recovery and media-replacement checks.
- No screenshots and no external deployment. The live project still has **14 user-authorized placeholders and one missing booking URL**; the production release gate intentionally remains closed.

See [M10 publishing/performance guide](../M10_PUBLISHING_AND_PERFORMANCE.md) for commands and domain caveats.

## Remaining acceptance

1. Focused keyboard-only + screen-reader audit across Studio and generated site, with manual assistive-technology checks; Chromium DOM checks are not a substitute.
2. Actual media replacement size/performance on the future live portfolio; keep budgets appropriate to images without slowing target pages.
3. Local backup/restore and failed-write acceptance drills against realistic edited data.
4. M11 can proceed on deployment packaging/host-independent static export without a real domain. Actual DNS/TLS, valid booking URL, real case study permissions and indexability still need authentic material and host access.
5. Continue on existing rolling V1 branch. The user has pre-authorized one final squash merge **only after** the whole M8–M11 release criteria are satisfied; no intermediate merge or deletion.
