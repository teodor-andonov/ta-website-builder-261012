# 2026-10-15 — M8 large-tree integrity and screenshot-free browser QA

**Stage:** M8 (in progress), one long-lived V1 branch `feature/m8-advanced-editor`. **PR:** [#23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23). **Status:** code completed and checked; no merge, branch deletion or deployment.

## Scope delivered

- **Model and rendering safety:** `src/model.mjs` rejects unknown Item kinds, Item children, authored children hidden beneath reference/source Cards and nesting beyond 32 levels. The shared renderer `src/render.mjs` now supports legitimate Cards nested >10 levels and **throws** rather than silently truncates beyond 32. Existing canonical V2 content remains compatible. Model validation failures carry HTTP 400, so invalid PUTs no longer masquerade as HTTP 500.
- **Atomic save regression:** `test/concurrent-save.test.mjs` verifies invalid duplicate IDs and component cycles return actionable HTTP 400, do not overwrite the existing JSON, and retain its ETag. Stale-tab save and upload protection remains.
- **Real large-tree stress:** `test/tree-editor.test.mjs` exercises 320 authored Items across eight nested groups, repeated cross-Card reparenting with grid expansion and identity preservation, keyboard reorder without moving cells, and a 14-level ancestry/outdent. `test/model.test.mjs` covers deeply nested rendering and invalid/hiding content.
- **Browser test on disposable content:** `scripts/m8-structure-check.mjs` generates a 320-Item structure plus 13 nested Cards on the **draft Studio page in a temporary JSON copy only**; verifies full tree rendering, selected deep Item, focus, ARIA tree properties and desktop widths 1280×800 and 1600×1000. A fixed 300ms file-save sleep was replaced with polling actual `JSON FILE · SAVED` to eliminate timing races for large documents.
- **No screenshots:** as requested, `.github/workflows/design-preview.yml` now runs **Content Studio browser QA** (real DOM/scroll, wheel and Studio interactions) without image capture or upload. `scripts/m8-structure-check.mjs` no longer captures screenshots. Updated `AGENTS.md` accordingly.

## Validation, failures and recovery

The first expanded CI run surfaced two test-fixture issues: cycle tests configured a reference on a Card which still owned authored children (correctly rejected by the new validator), and 300ms fixed save sleeps raced the larger browser fixture. We fixed both rather than weakening the production validation.

On implementation commit `937740ac8cff477476f3a8928e6a381cb13fae50`:
- [GitHub Actions test-and-build](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38705726565): **success**, **84 tests passed, 0 failed**, ten static pages built, eleven HTML paths checked including GitHub Pages prefix. No public editor/API present.
- [Content Studio browser QA](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38705726332): **success**, including `TA_DOM_OK`, `TA_WHEEL_OK`, `M8_TREE_AREA_OK`, `M8_HISTORY_OK`, `M8_KEYBOARD_MOVE_OK`, `M8_VIEWPORT_A11Y_OK`, `M8_LARGE_TREE_OK`, and `M8_SAVE_CONFLICT_OK`.
- No additional screenshots captured. Documentation-only commits after the code will trigger fresh checks; report their actual status separately.

## Remaining M8 acceptance

- Disconnected local server and image upload failure **UI** feedback/recovery.
- Generated/referenced Card inspection and JSON import errors from the Studio UI, assistive-technology semantics beyond automated ARIA checks.
- Full final code/validation/security review and final CI. Do not claim M8 fully accepted yet. Continue on same V1 branch, then advance to M9 without interim merge.

**Next development cycle:** finish the remaining focused recovery/editor feedback checks, then mark M8 internally complete and start the original M9 TA content milestone. Do not invent authentic project information or deploy before its prerequisites.
