# 2026-10-16 — Site-wide indexing switch on V2

**Branch:** `feature/v2-unified-studio` · [PR #24](https://github.com/teodor-andonov/ta-website-builder-261012/pull/24)  
**Stage:** V2 publishing refinement, before continuing M12. No merge or deploy.

## Decision

Add one simple two-state **Search indexing** setting in Content Studio → Overview (also visible from Data settings), stored in canonical `content/site.json` as `site.publishing.indexing`. Current TA placeholder site explicitly uses **false**. Older JSON lacking the field retains the previous indexable behaviour for compatibility.

**Off:** every published HTML route emits `<meta name="robots" content="noindex, nofollow">`, including project/post detail pages; 404 remains noindex. Keep `robots.txt` crawlable (`Allow: /`) so crawlers can encounter the meta tag. Do not emit a sitemap. This does **not** make the URL private, guarantee immediate removal from search results, or prevent third parties from linking to it.

**On:** emit `index, follow`. If `TA_PUBLIC_ORIGIN` specifies a verified root HTTPS domain, include canonical URLs and a sitemap. Indexing remains a request, not a guarantee of indexing.

Both choices are independent of portfolio placeholder/editorial approval and work in the local build, GitHub Pages build and optional locally generated ZIP. The ZIP manifest carries and the verifier checks the actual output's indexing mode. Never introduce `robots.txt Disallow: /` as a substitute for page-level noindex: it can prevent crawlers seeing the meta tag.

## Changes

- Validated optional `site.publishing.indexing` with a boolean-only schema; set current TA JSON to false.
- Added the mode control to the existing Studio Website settings inspector with validated, persisted updates.
- Shared public renderer, local build, GitHub Pages audit, ZIP generation/verification and local release rehearsal now respect the switch.
- Updated Node regression assertions and disposable Chrome/Studio interaction tests for reversible indexing selection, generated routes, domain sitemap and ZIP manifest.
- Kept a single minimal GitHub Pages publishing workflow; did not reinstate CI/testing workflows or automatic screenshots.
- Updated current README/agent guidance/implementation plan/hosting guide.

## Verification boundary and next step

The connected GitHub repository files were edited and their changes can be inspected on PR #24. **This session does not possess the user's local working checkout and has not executed Node or Chromium test suites.** Local execution is required for acceptance: `npm test`, `npm run build`, `npm run preview`, `npm run package:site`, `node scripts/verify-site-package.mjs`, and `npm run test:browser` (with Chrome/Chromium). Also try switching On in the Studio and build from an isolated/disposable working copy, confirming every route is indexable and sitemap matches domain configuration.

After any fixes, resume M12: migrate one TA page to an authored one-main-slot template and root composition, then extract shared Navbar/Header/Footer and improve isolated editing/full-page preview without changing existing appearance.

**Publication timing:** V2 files are not merged to `main`. The live GitHub Pages site continues to serve the existing V1 output until the authorised final merge or a separately approved hotfix. The Studio switch changes local JSON; it does not publish that change on its own.
