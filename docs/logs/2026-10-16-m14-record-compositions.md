# 2026-10-16 — M14 independent Project/Post record compositions

**Branch:** `feature/v2-unified-studio` · [rolling V2 PR #24](https://github.com/teodor-andonov/ta-website-builder-261012/pull/24)  
**Stage:** M14 feature implementation; full local/browser/build/ZIP/visual release acceptance deferred by user decision. Not merged, not published.

## Decisions and outcomes

Records remain typed content/metadata; each can opt into exactly one unique editable root `composition` Card with an explicit `template` reference. This reuses the same one-main-slot `assemblePage()` contract introduced for Pages in M12. No new authored graphical type, parallel CMS, or copies of the common Navbar/Footer are introduced.

- `projects.compositionTemplate = "record-project-layout"`, `posts.compositionTemplate = "record-post-layout"`: two reusable one-main-slot detail templates. New records become Draft with unique Card root compositions initially populated from that collection's existing legacy detail template, retaining live `{{title}}`, `{{summary}}`, `{{body}}`, cover bindings and other record context.
- Legacy `collection.defaultTemplate` and `formatTemplates` remain record-detail layouts for non-composed records. Optional explicit `record.template` overrides either the legacy choice or selects the slot template when a `record.composition` exists. Collection, type, slot, root, geometry and child IDs are validated before authoring data is accepted.
- Existing legacy records can opt in from the record inspector. The conversion clones existing detail Cards into a single root, regenerates their IDs and warns about possible geometry changes. There is no silent bulk migration of published projects or articles.
- The existing draft Post `post-four` (“A field of soft modules”) is the first real authored example, using `record-post-layout` and a unique root with four bound Items. It **remains Draft**; no new live route is published.
- In Studio, a composed record has **Design** (isolated unique Card with Structure/undo), **Preview** (template + record bindings + shared site chrome), **Fields** (typed content) and **JSON**. The record's required root cannot be deleted or moved to an invalid level. Slot-based record templates can use a real composed record as their Preview sample.
- Optional **detail-route generation** is controlled by `collection.detailPages` and `record.detailPage` (booleans, absent means On). A disabled detail route is omitted from `collectPages()`, while the collection's index query keeps rendering its card without an invalid link. The original index and unrelated detail routes remain.
- Creating a new Collection also creates a compatible slot-template default for its new records, alongside a legacy default template, without changing old content.
- The M13 style system resolves on record compositions too, and style usage counts include those record roots.

## Changed implementation

`src/render.mjs` (record-specific template resolution, root assembly and detail page routing), `src/model.mjs` (slot/collection/type and node validation), `content/site.json` (2 collection slot templates + first draft Post), `studio/index.html` (record Design/Preview/Fields integration, optional migration, new-record creation, template selectors, detail page controls, structure undo and safe template deletion).

Added `test/m14-record-compositions.test.mjs`: publishing parity, independent Project conversion, template reuse, record field binding, document immutability, legacy details, per-record overrides, invalid slot/reference/geometry rejection, detail-page opt-out and non-clickable index Cards. Expanded the disposable `scripts/m8-structure-check.mjs` browser script to exercise draft record design, assembled preview and default Project creation.

## Verification evidence (limited)

Using current connector-returned source, an isolated JavaScript evaluation of the shared model/renderer passed canonical JSON validation, generated **10 public routes**, showed the composed draft Post resolves its real title, and confirmed a cloned converted published Project affected **only** its own generated route. Its record title/summary bindings resolved, the assembled record Preview exactly matched the corresponding public document fragment, and the other routes remained unchanged. Removing the draft's optional composition from a separate cloned fixture left the 10 published pages byte-identical.

With `detailPage:false`, the chosen Project route disappeared (9 total) while its Home index Card remained and the dead link was removed. Disabling an entire Project collection's detail pages produced 6 routes, preserving the Work index and Post detail pages. The Studio inline JavaScript and authored Node/browser regression test files passed syntax parsing.

**Not executed:** full `npm test`, actual Chrome interaction tests, a filesystem static build, ZIP/package verification, visual screenshots or complete user acceptance. These remain deferred until final V2 acceptance. Do not claim M14 has been visually accepted.

## Next handoff — M15

Implement typed, contextual asset query Cards using existing `assets` metadata and project `projectCode` / tag properties. Support deterministic equality and contains predicates, optional AND combinations, and record context so a project detail page can list matching images without an explicit new relation engine. Preserve item/query Card semantics, safe output and compatibility with the M12–M14 composition/layout system. Continue no GitHub Actions CI and do not merge into `main` before final user approval.
