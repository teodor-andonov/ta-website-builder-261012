# Post-V1 Content Studio — agreed architecture specification

**Decision date:** 2026-10-15  
**Status:** Approved product direction, **not implemented**.  
**Priority:** Complete the *unchanged* M8–M11 V1 roadmap first; post-V1 work begins at M12.  
**Living status/roadmap:** [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

This document captures the *how* of the next-generation design. It is not an alternative living roadmap. Preserve current V1 behaviour until its current milestone has been accepted; use migration and visual regression tests instead of silently changing existing site composition.

## Product scope

The TA website is the real project used to improve Content Studio. The goal is the capacity to author the TA site freely and efficiently, alongside a maintainable reusable engine. **Do not build a second demo website as an acceptance prerequisite.** The whole authoring project is contained in **one folder, with one local Studio instance**; that folder contains JSON source, media files, editor/engine source, and disposable generated output. No central multi-site manager or hosted database. Git may version that folder but is not the content format or publication medium.

JSON is canonical (initially one site.json; split into a few broad files only if justified), with referenced media as real files. Both Studio and the static build use the same validated model and renderer. No parallel Markdown database, arbitrary evaluated templates, or separate rich-editor graphical language.

## Vocabulary and ownership

| Entity | Owns | Does not own |
| --- | --- | --- |
| **Item** | One atomic payload: text, image, link, rich text etc. | Layout children |
| **Card** | Grid divisions, child areas, layout/semantic role, optional reusable style, possible source/reference/slot role | Independently stored media blobs |
| **Composition** | A unique editable root Card tree for one page or record | Its shared page template |
| **Component** | Reusable authored Card/Item subtree: navbar, footer, CTA, record tile etc. | A separate global page shell |
| **Template** | An authored Card/Item composition wrapping **one main-content slot**, using referenced components | The unique content inserted into that slot |
| **Page** | URL/metadata, template selection and unique composition | Duplicated copies of template header/footer |
| **Collection** | Field schema, typed records, optional detail-page configuration | The grid shown on a page |
| **Asset** | Real file reference and queryable metadata (including tags and project code) | A duplicated file per usage |
| **Style** | Reusable appearance definition for Cards or Items | A graphic structure or content record |

Only Cards and Items are authored graphical node types. A template slot, component reference and data-driven Card are **behaviours of a Card**, not additional authored graphic kinds. A record composition has **one root Card**. Pages, records, templates and components are edited in *isolation*; a separate preview assembles the whole result.

### Page assembly

1. Resolve the page route and optional current collection record.
2. Choose the effective template: explicit page/record template override, otherwise collection default (when applicable), otherwise site default.
3. Render the template's authored Card tree. Components such as navbar, header/footer and CTA may be referenced at any valid place.
4. Insert the page's or record's **single root composition Card** into the template's **one main-content slot**. Preserve the containing Card and the nested root Card's own grid/padding; do not flatten the two grids.
5. Preview and static build must produce the same assembled content and semantic HTML. Existing landmark/skip-link behaviours and active-navigation state remain supported.
6. Reject missing template/slot, duplicate slots, cycles, invalid area geometry or ambiguous record references with explicit validation errors; never silently drop authoring content.

Examples: Home and Work use a General template with a shared Navbar and Main Footer; Studio uses a different template referencing the **same** Navbar and a different Studio Footer. A Project Detail template may contain metadata Cards, the content slot, a dynamically generated Highlights grid, and a CTA component. All are editable in isolation.

A regular page can have an optional template selection. A collection defines whether its records may generate detail pages and a default template. Each record can opt in/out (or inherit collection-level setting) and can override the default template. Routes/slugs and generated-page collisions are validated globally. Existing project/post records and output routes must be preserved during migration.

## Design system

Site-wide design tokens cover fonts, text roles/scales, palette, spacing, rounding, outlines and relevant layout defaults. Named Card and Item styles reference these tokens. Limited, explicitly supported local appearance overrides are allowed; grid geometry remains an independent structural setting.

The visual resolution order is **site defaults → named style → local overrides**. In Studio, inherited versus overridden values are distinguishable and an override can be reset. Prefer CSS variables and validated generated classes; no arbitrary CSS or complex selector cascade in V2. The TA print-like scaling and appearance are preserved when migrated to data-driven settings; configurable themes do not automatically introduce mobile reflow.

A **style** defines appearance; a **component** defines reusable graphic structure and can reference styles; a **collection** supplies data which can be bound into component instances.

## Generic collection authoring

Collections are edited under one expandable **Collections** Workspace section. Users create a collection, define typed fields, add/edit records, optionally configure generated detail pages, and insert a *collection-driven Card* into any valid composition. Its settings describe source, validated filters, sort, limit and the Card component used for each result. Individual collections do not need separate permanent top-level Studio tabs.

Proposed initial typed fields: text, rich text, number, boolean, date, select, tags and asset reference(s). Optional record composition field uses the same Card model. Record fields and schema must be validated; changes should not silently delete values. Collections such as Projects and Posts are examples, not engine-only special cases.

### Assets as a first-class query source

The built-in **Assets** library contains actual media file references and metadata: stable asset ID, source path, label, alt text, caption, credit, tags, optional order and other approved user-defined fields. It is queryable in collection-driven Cards without making a duplicate "Images" collection.

**Start with ordinary field matching, not a dedicated relationship model.** TA Projects may define a required, unique, stable **projectCode** string (e.g. "4424"); an image asset can carry its own **projectCode** property with the same value. This is a simple data join implemented by typed equality filters, not a separately managed association graph or foreign-key UI. The query should use the current page/record value rather than embedding a hardcoded project name or code.

- Store project codes as strings, preserve leading zeroes, reject duplicate project codes among projects, and do not silently rename them.
- If the site's existing stable record \`id\` already fulfils the same purpose, allow the filter to match that instead; do not force redundant \`projectCode\` fields.
- Treat empty/missing values as nonmatching, not as a broad match-all query.
- When a project code changes, explicitly warn about dependent assets or offer a validated update-all workflow; never silently orphan matching media.
- One asset has one scalar \`projectCode\` for the initial use case. The same file may be directly reused elsewhere. If querying one asset under several projects becomes a concrete need, introduce an optional \`projectCodes\` array and a \`contains\` filter, **not** a general relationship framework yet.
- Properties and tags stay on the asset metadata record, while the image is stored once as an ordinary file; folder location is not the canonical association.
- Formal multi-collection, bidirectional relationship infrastructure is **deferred** until genuine TA authoring needs justify the complexity.

Initial query operations should be typed, deterministic and intentionally small:
- Boolean **AND** across filters; for multi-value array fields use **contains**.
- **equals** for scalar fields, **contains** for tags/arrays and optionally **exists** when needed.
- Explicit sort field/direction with stable tie-breaking, and bounded limit/count. No arbitrary user JavaScript, free-form expressions, full SQL or remote execution.
- Source can be a custom collection or the built-in Assets library.
- Page record context and query-item context are **separate**. The page exposes the current project; each repeated Card receives its own matched asset. Missing context should produce an explicit validation/error or no-results state, never accidentally match all assets.
- Dynamic values use a typed context reference resolved only against approved fields, not raw string evaluation.

#### Example: highlighted assets matching the current project code

**Illustrative proposed V2 query structure** (not accepted by the current V2 implementation):

~~~json
{
  "type": "card",
  "source": {
    "collection": "assets",
    "template": "highlight-image-card",
    "filters": [
      {
        "field": "projectCode",
        "operator": "equals",
        "value": { "context": "record.projectCode" }
      },
      {
        "field": "tags",
        "operator": "contains",
        "value": "highlighted"
      }
    ],
    "sort": { "field": "order", "direction": "asc" },
    "count": 6
  }
}
~~~

The full authored Card also retains required structural grid/area settings. The typed \`context\` expression is a safe reference, **not evaluated JavaScript**. The query matches assets with an equal projectCode and a highlighted tag. Each returned asset renders through the reusable **highlight-image-card** component bound to its image, caption and credit. The current project context stays available separately. This supports TA directly and does not require a second demo website.

A future asset-library GUI should expose editable projectCode and tags fields with optional auto-fill from the current project context, filter controls and previews; safe SVG support must be considered separately from raster uploads, as untrusted SVG can carry active content.

## Editing, preview and file safety

- Reuse the M8 four-region desktop editor: Workspace | Document Structure | Canvas | Properties.
- Editing a Page shows **only its own composition**. Editing a component or template likewise shows only its own Card tree; editing a project record shows only its record composition. Selecting "Preview full page" assembles the relevant template and content.
- Tree order and visual grid coordinates stay independent. Add/move/nest/duplicate/delete remain atomic/undoable where supported. No mandatory insertable layout presets.
- Strong schema validation covers unique IDs per relevant scope, safe cross-references, cycle detection, grid limits, controlled contextual bindings and no silent clipping at unsupported nesting depths.
- Keep atomic local writes, revision checks, fail-safe manual export/recovery, complete JSON + media backup/restore and testable static builds.
- Don't publish the editor or writable local API as part of a public static site.

## Post-V1 implementation boundaries and acceptance

The living [implementation plan](IMPLEMENTATION_PLAN.md) owns M12–M17 sequencing. Expected checkpoints are:

- **M12 unified pages/templates:** shared page and record assembler, one slot, componentized navigation/footer, isolated editing + full preview; home/work/studio may use different template choices.
- **M13 styling:** global token model, named style references, limited overrides; TA appearance unchanged in before/after visual regression checks.
- **M14 record compositions:** independently editable root Card on project and article records, optional generated detail pages and template inheritance/override.
- **M15 collections/asset queries:** typed schema, custom records, asset metadata projectCode matching, AND queries and record context; reproduce the highlighted-assets project example as an integration test. Formal relationships are deferred.
- **M16 authoring polish:** smooth manual Card/Item workflows for real architectural projects and long posts; modularisation only where useful.
- **M17 portable handoff:** instructions/migration/QA for the **one** TA site project folder and independently testable reuse of the engine. A second website is **not** an acceptance requirement.

Prioritise correctness and actual TA authoring velocity over speculative generality. M8–M11, including V1 launch, remain untouched by this extension.

## Implementation decisions, not unresolved product questions

The agreed product choices above are locked for this phase. Implementation may select exact JSON field names, UI details, and CSS encoding during the relevant milestone, subject to compatibility tests and the same product semantics. Do not require new product-level interviews before starting M12.
