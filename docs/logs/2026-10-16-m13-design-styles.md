# 2026-10-16 — M13 named Card/Item styles and global design tokens

**Branch:** `feature/v2-unified-studio` · [rolling V2 PR #24](https://github.com/teodor-andonov/ta-website-builder-261012/pull/24)  
**Status:** M13 implementation committed; full local/browser/static-build/ZIP/visual acceptance deferred to V2 release by user decision. Not deployed or merged.

## Decisions

- Keep one style system: canonical `site.design` and optional node fields, not a new structural node or parallel design store.
- Site-wide **design tokens**: `site.design.tokens` includes `fontFamily: mono|system`, numeric `radius` in page-width `cqw`, and numeric `outlineOpacity`; existing grayscale `site.design.palette` and master `pad/gap` remain. All compile to allowlisted CSS variables through `siteTokenStyle()`; no arbitrary CSS insertion or responsive reflow.
- Named style definition: `site.design.styles[]` with stable `id`, human `name`, `target: card|item` and typed `properties`.
- **Card appearance fields:** `background,padding,gap,border`. **Item appearance fields:** `role,tone,weight`. Style objects never own node geometry, data, links, content, sources/references, image files or semantic site frame roles.
- Each node can opt in with `styleRef` and an optional `appearance` map. Effective appearance resolves **legacy/site defaults → named style → explicit per-node override**. Unreferenced legacy direct fields are preserved. Reset removes the override key, not the named style.
- Provide a small starting library: `index-root`, `soft-card`, `eyebrow-label`, `quiet-caption`. Work and Journal use the same neutral Index root and eyebrow style; their baseline appearance is intentionally unchanged. Complex Home sections remain legacy rather than being silently migrated.

## Implementation

- Added pure `src/style-system.mjs` for all style/token resolution and definition/property validation, shared unchanged by Studio and static builds.
- Expanded `src/model.mjs` to reject unknown, wrong-target, duplicate, malformed or unsafe style references/properties and invalid token settings. Existing validated monochrome palette restrictions remain in place.
- Expanded `src/render.mjs` to resolve named Card appearance and text role, Item tone/emphasis, and semantic Navbar/Footer Card appearance. Site tokens compile to the existing page root style via a constrained allowlist.
- Updated `src/public.css` to use site-derived palette/outline opacity/rounding and typed Item tone/weight classes; no style element or evaluated user CSS.
- Content Studio now includes a **Styles** workspace: named Card/Item definitions and usage counts, create/edit/delete-unused, and editable token/palette controls. Selected Card/Item inspectors allow style assignment and local per-property overrides marked as inherited/overridden. **Inherit** resets individual fields. New edits validate before being written to `content/site.json`, and style assignment uses existing structure editor undo snapshots.
- Added `test/m13-style-system.test.mjs` to cover shared Card propagation, Item role and tone, overrides and reset, token CSS variables, legacy output and invalid data rejection. Extended `scripts/m8-structure-check.mjs` with disposable Style library and override UI actions.
- Updated README, AGENTS, and the single living implementation plan.

## Scoped verification

The current canonical site JSON passed `validate()` in an isolated JavaScript smoke harness. The same actual model and renderer functions generated **10 public routes** with unchanged indexing policy and working Work/Journal template preview parity. Changing `index-root` background and gap modified both Work and Journal generated HTML but left Home **byte-identical**. Changing named Item role/tone/weight changed generated heading markup/classes, and a single local override took precedence. Invalid wrong-target style references were rejected. Studio's module and new test/browser-script source passed JavaScript syntax parsing.

**Not executed:** full `npm test`, actual Chrome E2E, filesystem `npm run build`, site ZIP packaging/integrity, visual/screenshot review, and both indexing-state acceptance. These remain due at final V2 acceptance, and no CI jobs were added.

## Next handoff: M14

Build independently editable record compositions and flexible collection detail-page overrides, keeping the Page-template slot contract and content/record context separate. Existing Project/Post public routes must remain stable. Proceed using the same root Card, styleRef and appearance model rather than adding another visual language.

Later M15: asset library as query source, projectCode equality + tag contains with typed context and safe deterministic filters. M16: authoring polish. M17: portability, complete recovery and the deferred release verification before merge into `main`.
