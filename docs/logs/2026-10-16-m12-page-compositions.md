# 2026-10-16 — M12 shared Page compositions in real TA site

**Branch:** `feature/v2-unified-studio` · [PR #24](https://github.com/teodor-andonov/ta-website-builder-261012/pull/24)  
**Stage:** V2 / M12 substantial implementation, **not final M12 acceptance**. No merge or deployment.

## Decision and outcome

Move from a renderer-only slot prototype to live, editable Page composition semantics, with JSON as the only authoring source. **Work** (`/work/`) and **Journal** (`/posts/`) now reference the same `page-general` Page template. Each holds a separate `composition` root Card and empty legacy `blocks`, avoiding duplicated template content. Home and draft Studio remain on their old authored `blocks` deliberately: Home is a complex eight-section layout; migration there would alter nested grid geometry without final visual QA.

- `page-general` is one root Card with exactly one empty `slot:"main"` Card. Existing pure `assemblePage()` clones template and unique composition, nesting (never flattening) the Card grids.
- Content Studio **Design** for a templated Page displays **only** the Page's own root Card. **Preview** assembles the full shared template and site frame using `renderPagePreview()`; no duplicate render implementation.
- Studio template Design similarly displays the authored template alone, with a visible marked main slot. Preview uses the first Page that references that template when available.
- New Pages start as Draft with an independent composition and the first available Page template. Studio can create further slot-based Page templates and lets editors choose a template per Page without copying its content.
- Existing legacy pages have an **explicit opt-in conversion** to a composition with a warning that nested geometry can change. No automatic silent content restructuring.
- M8 tree/undo infrastructure now reads and writes the composition root rather than a fake duplicate `blocks` array. Required root/slot Cards are guarded against delete, duplicate, and invalid top-level moves. Template deletion refuses to orphan Pages or Collections.
- The full renderer retains the pre-existing semantic Nav/Main/Footer HTML and published navigation rules; the isolated design renderer shows Main only. **Editable, reusable Navbar/Header/Footer Components are still outstanding M12 work.**

## Changed code and tests

`content/site.json`, `studio/index.html`, `src/render.mjs`, and affected model/render/UI tests. Updated `test/m12-page-assembly.test.mjs` to check shared template propagation, unique Page ownership, independent Page edits, assembly immutability and full-preview parity. Updated affected `test/model.test.mjs`, `test/card-item-dom.test.mjs`, `test/public-site.test.mjs`, and the disposable local Chromium harness `scripts/m8-structure-check.mjs` to exercise Design-isolated vs Preview-assembled states.

## Verification evidence — scoped, not full acceptance

The connector-returned source was independently parsed in the in-memory JavaScript runtime (Studio's inline module, shared render/model/assembly modules). The repository's actual current `site.json` passed shared `validate()`. Running `collectPages()` against it generated **10 public routes**, all with the selected `noindex, nofollow` meta tag. Both Work and Journal assembled full-preview HTML matched their corresponding generated document HTML. Changing the shared template background changed both Work and Journal output but not Home; the unique Journal content Card remained separate. **No complete Node test suite, Chromium UI suite, actual filesystem static build, ZIP integrity verification or screenshot/visual acceptance has run.** Those remain deferred until final V2 acceptance by explicit user decision.

## Next handoff

1. Complete true authored/reusable site Navbar/Header/Footer Components, preserving existing semantic landmarks, active navigation and canonical JSON; avoid a second navigation source of truth.
2. Review Home and Studio page migration after shared chrome structure stabilises; preserve print-like appearance.
3. Advance M13 named styles/tokens and M14 independent record compositions. Run full Node, browser, build, ZIP, visual and both indexing-mode acceptance at the **end of V2**, not as a repeated blocker to development.
