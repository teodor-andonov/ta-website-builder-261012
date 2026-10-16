# 2026-10-16 — M15 contextual asset galleries and typed AND queries

**Branch:** `feature/v2-unified-studio` · [rolling V2 draft PR #24](https://github.com/teodor-andonov/ta-website-builder-261012/pull/24)  
**Status:** M15 implementation committed; full local Node/browser/static-build/ZIP/visual acceptance deferred to final V2 review. No deployment or merge.

## User decision

The user clarified that **all existing website content is demo material**, and agents may convert legacy Pages and Record detail layouts as needed. Preserving exact legacy demo geometry is not a blocker. Preserve canonical JSON, routes, references and the target architecture, but do not keep unnecessary compatibility workarounds solely to retain V1 placeholder layouts. This supersedes previous conservative recommendations to leave Home/Studio/Project layouts unchanged.

## Implementation and architectural decisions

- New `src/asset-query.mjs`: a DOM-free evaluator and validator for `source.kind:"assets"` on an otherwise ordinary authored Card. It never creates a new query type, separate relationship table, metadata store or copied asset files.
- Typed `source.where[]` predicates, **AND** semantics, max 8 predicates, bounded 1–200 results. Allowlisted fields/operators: `projectCode` equality against `asset.properties.projectCode`; `tags` contains one whole tag; `name` equals or contains text. Case-insensitive matching. Stable original library order or name sorting. Limited simple record bindings like `{{projectCode}}`; context missing/empty means **no results**, never an unfiltered global image dump.
- Shared `src/render.mjs` renders matches as generated Cards with the existing Image Item pipeline, normal sanitized `assetSrc()`, alt text and optional captions. The authored asset query Card retains grid, palette, style, layout and gap from the existing Card renderer. Generated nodes never become independent authored objects.
- `src/model.mjs` validates the typed source before authoring data can be persisted, rejects unknown property paths and arbitrary expressions, and preserves the legacy collection query source contract.
- Content Studio's Add-object picker includes **Asset gallery · dynamic**. Its Properties inspector can edit projectCode/tag/name filter fields, operators, values, AND predicate add/remove, arrangement, sort, count and captions. Predicate changes use existing validated Card mutation/history, so errors restore the prior valid Card.
- In `content/site.json`, **Balkan House** (`p-balkan`) is deliberately migrated from its legacy shared record-detail sections into a unique M14 root composition using `record-project-layout`. The previous detail sections are nested as its independent authored content; a new highlighted-assets Card applies `projectCode eq {{projectCode}} AND tags contains Architecture`. Demo record and Housing asset metadata use project code `4424`. The Responsive Envelope record and Facade asset metadata have separate demo code `4430`. The gallery therefore selects Housing by metadata, without explicit asset-ID references in the query. Existing published routes remain 10.
- Other Project/Post legacy detail layouts can now migrate when useful, per updated user instruction.

## Regression coverage / focused smoke evidence

Added `test/m15-asset-query.test.mjs` for precise code/tag matching, array membership vs substring, name equality/contains, sorting, limit, AND precedence, fail-closed record bindings, safe schema validation, gallery alt/caption rendering, deterministic output and full public/preview parity. Added a disposable M15 browser case to `scripts/m8-structure-check.mjs` that opens Balkan House Record Design, selects its Asset gallery, edits a filter to yield no matches, then restores the filter and confirms image repopulation.

In-memory evaluation of **the committed model/renderer source** against `content/site.json` validated the canonical data and generated 10 public routes. It confirmed Balkan House's asset query returns exactly `house`, empty context returns none, the gallery appears in its published document, and its complete assembled page Preview matches that document fragment. The Studio module and added browser script pass JavaScript syntax parsing after correcting an initial escaped-template-literal typo. A focused in-memory run of the committed M15 test callbacks against the real shared model/renderer passed **8/8 M15 cases**; a companion in-memory run of the M14 regression callbacks passed **10/10 cases** on the updated fixture. This is not a full Node/browser suite run.

**Not run:** full repository `npm test`, real Chromium E2E, static filesystem build, ZIP verification, comparative screenshots, manual UI review, both search-indexing settings or end-to-end release acceptance. These are deliberately left for final V2 acceptance; do not claim they passed.

## Next handoff: M16

Polish the actual authoring workflows and clarity: contextual Add-object controls, selecting/inspecting nested gallery and Card contents, field editing, moving/duplicating composed content, compositional previews, error messages, responsive Studio ergonomics, and duplicate-safe authoring. Further convert demo legacy content if doing so reduces branching and tests, but preserve the one canonical data model and route mapping. Maintain documentation/tests with each feature and complete M17 portability/recovery/final release validation before merging `main`.
