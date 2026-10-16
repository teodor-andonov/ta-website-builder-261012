# TA Content Studio — living implementation plan

> Updated 2026-10-16 · Source of truth for milestone status. Previous V1 technical history is preserved in [dated development logs](logs/README.md) and Git history. The [V2 architecture](POST_V1_ARCHITECTURE.md) contains the detailed specification.

## Current state

- **Working stage:** **V2 / M14** — **shared page templates and independent page compositions now work in canonical JSON and Studio**. The published Work and Journal indexes share `page-general` while keeping distinct root Cards. Design mode is composition-only; Preview assembles the template and shared website frame. New Pages create a root composition by default, Page template selection/creation and explicit legacy conversion are in Studio, and structural root/slot deletion is guarded. Home and Studio deliberately remain legacy until geometry/visual review. **M12 semantic Navbar/Footer extraction is now implemented.** Component roots are the real semantic landmarks; `site.chrome` selects default components, Page/record templates can override them, and Studio edits them separately. Dynamic link content comes solely from `site.navigation`, preserving active links and draft exclusion. Alternate components can be duplicated and selected without modifying other templates. Remaining M12 work is final visual/browser acceptance plus deliberate migration of complex Home/draft Studio body compositions after geometry review; do not silently reflow them.
- **M13 progress:** Named Card and Item styles and global design tokens are implemented in canonical JSON, model validation, shared renderer and Studio Styles library. Style resolution is defaults → named style → local appearance override with an explicit Inherit/reset control. Work and Journal share matching baseline styles; older Page/Card trees remain backwards compatible. Targeted style propagation, token rendering, preview parity and syntax checks passed. **M14 is now implemented; next: M15 typed collection and asset queries.** Final Node/browser/build/ZIP/visual release acceptance remains deferred.
- **M14 progress:** Project/Post collections now each own a reusable one-main-slot record detail template (`collection.compositionTemplate`). An individual Record can opt into an independently editable root Card (`record.composition`) with an explicit per-record slot `template` override, while legacy records can select compatible legacy format/detail templates. New records start as drafts with unique compositions; the draft **Soft Modules** Post is the first migrated example. Record Design is isolated; Preview uses the actual shared assembler and record field bindings. Collection-level `detailPages` and record-level `detailPage` switches independently disable generated routes, leaving index cards non-clickable rather than dead links. All currently published Project/Post detail routes retain their old legacy geometry until explicit opt-in. Targeted rendering/model/syntax checks passed; **Node/Chromium/build/ZIP/visual acceptance remains deferred**. **Next M15:** typed asset query predicates (projectCode equality, tags contains) and record-context filtering, without inventing a relationship subsystem.
- **Branch:** `feature/v2-unified-studio` · [rolling PR #24](https://github.com/teodor-andonov/ta-website-builder-261012/pull/24). One V2 branch for M12–M17; one final squash merge when software milestones pass. `main` remains the V1 release until that merge. V1 [PR #23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23) was merged at `7d5b445`; both original branches are retained.
- **Current verification policy:** Per user decision on 2026-10-16, **continue V2 development with code review, static syntax checks and targeted in-memory model/render smoke checks; postpone full local Node, Chrome, build, ZIP and visual acceptance until the end of V2**. Do not claim the unrun full suites passed. The search-indexing switch in `site.publishing.indexing` is currently **Off** while placeholder content remains. No GitHub test workflows or CI have been reinstated.
- **Publishing:** [GitHub Pages is the current website](https://teodor-andonov.github.io/ta-website-builder-261012/), **not a staging environment**. Builds are generated from JSON + media with `npm run build` → `dist/`. `npm run preview` is a localhost view of the generated site (requires Node, not internet); optional `npm run package:site` writes `release/website.zip` for future Hostinger/other static hosting. `main` Pages publishing is the sole automatic GitHub workflow. Search indexing is controlled separately in Studio; Off does not hide public pages.
- **Important timing:** the publishing cleanup and new indexing switch are committed to the **V2 branch only**. The live `main` Pages website retains V1's noindex output and old workflows until the authorised final V2 merge (or a separately approved hotfix). A local Studio toggle does not deploy by itself.
- **Content:** editable project/post/media placeholders are allowed. Real material, 15-minute booking link, eventual Hostinger/domain migration and manual human QA are deferred until **after V2**. Do not fabricate missing real details and do not impose an approval gate on normal builds.
- **Testing:** `npm test` (Node tests), `npm run test:browser` (local Chrome/Chromium, no screenshots, including the indexing selector), `npm run build` (safe static output), all **independent from GitHub**. Keep versioned backups, validation, optimistic saving, media safety and portable ZIP functionality. The previous hourly automation stays paused.

## Milestone plan

| Stage | Work | Status |
|---|---|---|
| V1 / M0–M11 | File-first Studio, public TA site, editor, content models, local media and static builds | **Merged to main** |
| V2 / M12 | Work + Journal unique compositions and one-slot General template; isolated authoring/full preview; reusable semantic Navbar/Footer, editable navigation and template-specific frame overrides | **Feature work implemented; final local/browser/visual acceptance deferred** |
| M13 | Named Card/Item styles, site design tokens, Studio Style library, inherited and local overrides | **Implemented; final local acceptance deferred** |
| M14 | Isolated Record Card compositions, collection slot defaults, legacy/slot overrides, optional generated detail pages | **Implemented; final local/browser/visual acceptance deferred** |
| M15 | Generic typed collections, asset project-code/tag queries and equality/contains filtering | Planned |
| M16 | Real TA authoring quality, metadata/media resilience, code/UI cleanup | Planned |
| M17 | Portable Studio setup, full data/media restoration and final local software acceptance | Planned |

Detailed decisions and acceptance for M12–M17: [POST_V1_ARCHITECTURE.md](POST_V1_ARCHITECTURE.md). Avoid extra relationship systems, alternate site stores, a second demo website or app frameworks.

## Normal commands

```sh
npm run dev           # edit JSON/media using the local Studio
npm run build         # generate static website into dist/
npm run preview       # rebuild and serve dist on localhost:4173
npm run package:site  # optional ZIP into release/website.zip
npm test              # local Node tests
npm run test:browser  # local Chromium/Chrome interaction checks, no screenshots
```

Backups: `npm run backup:create` and `npm run backup:restore -- <snapshot> <new-directory>`. Extra historic/diagnostic scripts remain runnable directly with Node, **not as scheduled GitHub jobs**.

## Working policy

- Preserve JSON as the single authoring source, the shared rendering contract and the nonadaptive print-style public Card/Item grid. Studio remains desktop-focused. Leave `prototype-v2/` historical and untouched. Site defaults and template-specific semantic Navbar/Footer references are canonical JSON: `site.chrome`, `template.chrome`, and Component `frameRole`. `site.navigation` alone supplies dynamic links; do not hardcode secondary navigation copies.
- Prefer one meaningful, reviewed step per user-triggered cycle (larger coherent steps are welcome). Targeted static/in-memory checks are useful interim evidence, but full Node/browser/build/ZIP/visual tests and both indexing states are reserved for final V2 acceptance by user decision. No new background automation and no automatic screenshots.
- After substantial changes, update this plan and add a dated [log](logs/README.md). Be clear about unrun local tests when the environment cannot execute the repository.
- Keep `main` as current public GitHub Pages site; V2 PR is not a live deployment. Do not merge/delete branches, alter production hosting or require third-party access without the appropriate user instruction.
