# 2026-10-16 — M16 unified authoring and full demo migration

**Branch:** `feature/v2-unified-studio` · [V2 draft PR #24](https://github.com/teodor-andonov/ta-website-builder-261012/pull/24)  
**Status:** M16 feature code committed; final local Node/Chromium/build/ZIP/visual acceptance belongs to M17. No merge, deployment or new GitHub test workflow.

## Decisions and implementation

- **User-authorised demo migration.** The user clarified that all current content is demo and explicitly invited us to convert the remaining legacy layouts. Converted Home and draft Studio Pages and the six remaining legacy Project/Post records. All **4 Pages** now own independent `composition` Card roots with `template:"page-general"` and empty `blocks`. All **8 Project/Post records** have independent Card roots referring to their collection's one-main-slot template, including Balkan House and the draft Soft Modules Post. Deep child layouts, metadata, record bindings and current route slugs are retained, but the extra root layer can affect visual proportions; visual review is reserved for M17.
- The legacy record templates are still present as **compatible seed/import/fallback layouts** for newly created records and older JSON. They no longer directly author any of the eight existing demo record pages. No parallel Page or Record renderer was introduced.
- **Context-aware insertion:** `Add object` in the workspace toolbar opens the existing picker with a visible destination label. A selected editable Card gets new children; a selected Item inserts alongside its siblings in the same Card; no selection falls back to the composition or template root. Generated query/reference/main-slot Cards never accept hidden children. Uses the existing editor history, grid placement and schema validation.
- **Draft-safe duplication:** Pages can be duplicated from the Page inspector, with new unique Page IDs/slugs and regenerated Card/Item IDs; Record duplication now also starts as Draft, with placeholder content and publication approval off rather than cloning a published status. Sources remain unaffected.
- **Accurate publishing overview:** The dashboard's generated-page count uses the canonical `collectPages()` route list, not total record count. Current public output remains **10 routes**; draft Studio and draft Post excluded.
- **Media-resilience:** Added pure `src/asset-usage.mjs` to find asset references from record cover/asset fields, authored Image Items, reusable Components and context-bound query galleries. The Image inspector shows usage locations; deletion of referenced asset metadata is blocked, while deleting unused metadata does not remove uploaded image file bytes.
- **Renderer defect fixed:** The CSS font-family token previously included literal double quotes inside a double-quoted HTML `style` attribute. Corrected to safe single quotes and added a regression test. This was found by the full-document/preview DOM parity assertions.
- **Test migration:** Updated M8, M12, M14, DOM, preview and public-route fixtures to read independent `composition` trees rather than the now-empty legacy Page `blocks` and to test the currently-used slot templates. Added `test/m16-authoring-migration.test.mjs` and an M16 local browser interaction sequence in `scripts/m8-structure-check.mjs`.

## Scoped verification

Canonical JSON passed the actual model validator and the shared renderer generated the same **10 public routes**. All published Page and Record previews assemble through the same shared renderer with current content/metadata. **The final combined in-memory source-level regression pass executed 82 test callbacks with 82 passing**, spanning M8 model, M12–M16 feature, DOM, preview parity and public-route checks. This evaluation loaded the actual committed source and content with minimal in-memory file mocks and skipped the test that launches a real filesystem build. The Studio inline module and disposable local browser-test harness both parsed successfully. Before this result, the focused tests exposed outdated legacy assumptions and the real CSS font token quoting defect, which were fixed. These counts do **not** represent an actual Node/Chromium test-run or final release approval.

**Not executed:** real `npm test`, Chromium/browser interaction suite, filesystem build, output ZIP/package integrity, screenshot/visual review, both indexing states, full release QA and any production deployment. The user explicitly opted to defer them to the end of V2, before merging to `main`.

## Handoff to M17

1. Run all Node tests and the disposable local Chrome suite against a real checkout; fix actual failures rather than relying only on in-memory smoke checks. Confirm media upload/replacement, metadata editing, query galleries, Design/Preview/Fields, nested selection and undo, draft-safe duplication.
2. Build `dist/` locally, test offline preview, package `release/website.zip`, verify relative asset URLs, fallback routes, both indexing states and export portability. Restore JSON + uploaded assets from backup and verify no silent loss.
3. Capture visual comparisons of Home, Work, Journal, Studio draft, Project and Post pages on desktop/phone. The permitted demo migration can reflow nested grids; use the intended visual language, not byte-for-byte old screenshots, as the acceptance standard.
4. Keep current GitHub Pages publishing of `main` untouched; only merge V2 after explicit user approval. Future Hostinger/static upload can use the final ZIP. No staging pipeline or GitHub test CI required.
