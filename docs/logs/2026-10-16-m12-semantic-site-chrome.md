# 2026-10-16 — M12 editable semantic Navbar/Footer and template overrides

**Branch:** `feature/v2-unified-studio` · [rolling V2 PR #24](https://github.com/teodor-andonov/ta-website-builder-261012/pull/24)  
**Status:** Substantial M12 feature implementation. Not merged/deployed. Final local/browser/build/ZIP/visual acceptance postponed to end of V2 by user decision.

## Architecture and decisions

The single-site Navbar and Footer are no longer hardcoded markup in the active publishing path. They are **reusable, editable Components** with ordinary root Card trees in canonical `content/site.json`:

- `site.chrome.navigation: "site-navbar"`, `site.chrome.footer: "site-footer"` select defaults.
- Each Component has `frameRole: "navigation" | "footer"` and one authored 12 × 1 root Card. This root is rendered **directly as the semantic `<nav>` or `<footer>`**, without introducing an extra visible wrapper Card, duplicated landmark or independent site-shell content store.
- The Navbar's authored Home logo is a button Item with the `site-logo` variant and editable text/area. Its right six grid columns are reserved for **dynamically generated direct link Items** read only from `site.navigation`. Draft routes remain hidden; section-active links retain `aria-current`. Do not store a duplicate navigation list in the component.
- The Footer owns normal text Items with a `site-footer` variant. The bindings `{{site.name}}` and `{{site.year}}` resolve through the same validated renderer used for public builds and Studio previews. Root appearance, grid spacing, padding, background and height are Card settings; obsolete site-wide frame height controls remain only as legacy fallback.
- `template.chrome` may reference the same defaults or override Navbar/Footer independently for a Page or record-detail template. `page-general` explicitly references both shared defaults. Duplicated frame Components can serve as alternate Footer/Navigation layouts without changing unrelated templates.
- JSON imported without `site.chrome` retains a legacy shell fallback. No production content or routes were published/renamed.

## Content Studio and safety

- Overview → Website settings now exposes default Navbar/Footer Component selectors, component editor navigation, and site.navigation label/route controls with add, remove and ordering.
- Components → Navbar/Footer design canvases render the real semantic landmarks and their child Items in isolation. Duplicating a frame produces an independent editable alternative with regenerated Card/Item IDs. The component root and required Home logo are protected against destructive tree operations.
- Templates → Shared site frame selects default inheritance or independent Navbar/Footer overrides. Record template previews also receive the selected override.
- Added validation for role-correct component references, single Card frame roots, an unambiguous navbar logo, fixed 12-column layout and reserved link area. Studio validates frame/slot/composition structural mutations before recording history/persisting, restoring the previous tree on invalid edits.
- Shared chrome Items are **not** selectable as part of a Page's own Design tree. The component can be selected only when editing that Component. Page/template design remains isolated; Preview assembles the full site.

## Changed areas

`content/site.json`, `src/render.mjs`, `src/model.mjs`, `src/public.css`, `studio/index.html`, `test/m12-chrome.test.mjs`, `scripts/m8-structure-check.mjs`, README/AGENTS and the living implementation plan.

## Verification evidence and limits

Connected GitHub source was statically parsed and evaluated in an isolated JavaScript smoke harness. The canonical site validated, and generated **10 public routes** with one nav and footer landmark per page; Home, Work, Journal and project routes retained link selection, draft hiding, current-year footer and `noindex` metadata. Changing the reusable Components updated all pages. A duplicate Footer selected by the shared General template affected Work and Journal but not Home or record detail pages. A template with incorrect role mapping was rejected; older JSON without chrome continued to render using the legacy shell. Studio module and new regression-test source parsed. The committed browser test adds checks for Overview nav editing, isolated Component design and template selectors.

**Not executed:** the actual repository-wide `npm test`, Chromium E2E, `npm run build`, `npm run package:site`, ZIP verification, screenshot/visual comparison and release QA. This is **not** a claim of passing release tests.

## Next handoff

1. Begin **M13**: extend grayscale print-like design tokens into reusable named Card/Item Styles, with explicit inheritance vs local override and reset in Studio. Preserve current page rendering as default; no reactive CSS or external framework.
2. Retain Home and draft Studio body content on legacy `blocks` until a later intentional structural migration and visual inspection; Work and Journal already share `page-general`.
3. Continue M14 record compositions, M15 typed asset queries, M16 authoring quality, M17 packaging. Perform full Node/browser/build/ZIP/visual tests, both indexing states and any regressions together for **final V2 acceptance**, before approval to merge `main`.
