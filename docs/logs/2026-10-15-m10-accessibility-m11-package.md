# 2026-10-15 — M10 semantic accessibility QA and M11 static-host ZIP handoff

**Branch:** `feature/m8-advanced-editor` · [Draft PR #23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23)  
**Scope:** substantial M10 completion of automated semantics and new M11 host-independent release packaging. **No merges, deployments, screenshots or branch deletion.**

## M10 — implemented

- `src/render.mjs` now emits real semantic `h1` for authored display titles and `h2` for heading Items without changing the Card/Item authoring hierarchy. The Note template uses explicitly validated `headingLevel: 1` on its heading text Item; there is exactly one `h1` on each of the ten generated public pages.
- The main content landmark has `tabindex="-1"`, so the existing **Skip to content** link has a keyboard-focusable target. `src/public.css` preserves heading geometry and adds clearer focused-control outlines. No responsive reflow or typography breakpoints were introduced.
- Added `test/accessibility-structure.test.mjs` to check all published pages for a single top-level heading, named navigation, one main landmark, skip links, image alt attributes, asynchronous image decode and noindex protection.
- Extended screenshot-free `scripts/browser-dom-check.mjs` to verify the actual DOM's single H1, skip-link keyboard focus, focusable main target and named navigation. Existing 1280×800 and 1600×1000 Studio Structure/focus/ARIA checks remain intact.

**Limit:** passing automated semantic/Chromium checks does **not** constitute a manual screen-reader or cross-device accessibility audit; those remain prelaunch tasks.

## M11 — implemented

- `scripts/package-site.mjs` creates a **standard DEFLATE ZIP**, without additional packages, from a fresh static root build; default mode is a noindex preview. Archive includes a `release-manifest.json` listing actual file paths, sizes and SHA-256 hashes.
- Package safety rejects editor/API/source and private directories, symlinks/special files, suspicious archive paths, missing required public entry files and oversized static output. By default it forcibly builds with `TA_ENABLE_INDEXING=0`; production mode inherits the existing `TA_ENABLE_INDEXING=1`, `TA_PUBLIC_ORIGIN`, media-budget and clean-content release gates (cannot silently publish examples).
- Added `npm run package:site`, ignored `release/` in Git, and wrote [M11 host handoff](../M11_STATIC_HOST_HANDOFF.md) for generic static hosting, document root, index routes, verification, owner approvals and rollback.
- Added `test/package-site.test.mjs`, which independently parses actual ZIP central-directory entries, inflates their bytes and verifies the SHA-256 manifest, staging noindex, no source leakage, and refusal to package a release against unapproved examples.
- CI now invokes the **real ZIP command and `unzip -t`**, before the ordinary GitHub Pages project-path check. It does not upload files or publish any host.

## Actual CI evidence

Implementation and M11 documentation commit [`8d938c3`](https://github.com/teodor-andonov/ta-website-builder-261012/commit/8d938c3530e1df37bcd7b17adc133e861b6b1945):
- [Test/build and release-package job](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38753858588) — **SUCCESS: 107 tests, 107 passed, 0 failed.** Static ZIP contained **21 public files**, **80,648 uncompressed bytes**, **24,980 ZIP bytes**; archive integrity check and GitHub Pages prefix audit passed, with 11 HTML files and no private API or Studio served.
- [Screenshot-free browser job](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38753857983) — **SUCCESS**, `TA_DOM_OK` including `skipKeyboardFocus`, `focusableMain`, `singleMainHeading`, `navNamed`, plus `TA_WHEEL_OK`, `M8_VIEWPORT_A11Y_OK`, `M8_LARGE_TREE_OK`, `M9_MEDIA_REPLACEMENT_OK` and stale/offline save recovery.
- Initial test cycles exposed two tests needing updates for the added main `tabindex` and multiline blocked-production error; corrected test fixtures, without removing production checks. No screenshots generated.

## Remaining roadmap and non-goals

- M10 automated implementation is sufficiently complete to start M11, **not a declaration that real accessibility, content permissions, image performance and host operations passed manual acceptance**.
- M11 has a **portable preview package**, not a selected domain/Hostinger account or external deployment. Any real production launch needs actual owner-approved copy/media and a working 15-minute booking URL. The current content audit still shows 14 intentional examples/placeholders and one missing booking link.
- Next: complete/document a production-like restore/rollback drill and owner-provided static host/DNS/TLS route checks. If blocked by genuine third-party access, continue the post-V1 preparation only after the approved **complete V1** squash merge, not by bypassing M11 acceptance.
- Branch lifecycle remains unchanged: one rolling V1 PR, one authorised phase-end squash merge after full acceptance, and no branch deletion.
