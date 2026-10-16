# TA / Content Studio

Local, file-first JSON website builder and Content Studio for TA architecture, computation and design. **The project works without GitHub, a cloud CMS or a build service.**

## Everyday workflow (Node.js 20+; Node.js 22 recommended for local Chromium tests)

No `npm install` or third-party runtime dependencies required.

| Command | Result |
| --- | --- |
| `npm run dev` | **Edit** in Content Studio at http://127.0.0.1:5173/ |
| `npm run build` | **Build** the entire static website in `dist/` |
| `npm run preview` | **Preview locally** at http://127.0.0.1:4173/ (rebuilds on startup) |
| `npm run package:site` | **Optional ZIP** at `release/website.zip` |
| `npm test` | Run all Node tests **locally** |
| `npm run test:browser` | Run DOM, scrolling and Studio interaction checks in **local Chrome/Chromium**; no screenshots |

`dist/` **is** the website. To preview it, use the local server rather than double-clicking `index.html`, because navigation and asset links are root-relative. Internet access is **not needed for the build or local server**. When offline, the site's Google Fonts request may fail and the browser falls back to an installed monospace font; images and layout remain local.

You can run commands using VS Code's **Explorer → NPM SCRIPTS** play buttons on Windows. The editor writes `content/site.json` through a loopback-only server; uploads live in `assets/uploads/`. Back up your JSON and media files before major structural changes.

## Publishing

**GitHub Pages is the CURRENT public website publisher**, not a separate staging environment:

[View the published TA website](https://teodor-andonov.github.io/ta-website-builder-261012/)

- `main` publishes automatically via the repository's **one** GitHub Pages workflow (build `dist/` with the GitHub Pages project prefix, upload site, deploy).
- **No tests, browser checks, separate staging runs or ZIP archives are uploaded to GitHub Actions.** Test the code on your own PC. GitHub is only version control and the current host.
- **Indexing is a simple site-wide switch**, in **Content Studio → Overview → Website settings → Search indexing**, stored as `site.publishing.indexing` in `content/site.json`. It's currently **Off** while the site has placeholder material. Off adds `noindex, nofollow` to every public page; On adds `index, follow`. Both modes build and export without editorial gates. `noindex` is a request to search engines, not access control.
- The public ZIP exporter rebuilds the same site for a **root directory** (e.g. Hostinger's `public_html/`) and is not automatically uploaded. The ZIP keeps the chosen indexing mode and includes it in the release manifest. `TA_PUBLIC_ORIGIN` is optional for canonical links; a sitemap is emitted only if indexing is On and a verified custom-domain origin is provided. `robots.txt` stays crawlable when indexing is Off so crawlers can read the page-level `noindex` tags. Studio changes must be committed to `main` before the live Pages site reflects them.
- The repository's currently published `main` still has the previous V1 output until the V2 branch is merged. This publishing simplification is being developed in `feature/v2-unified-studio` / [PR #24](https://github.com/teodor-andonov/ta-website-builder-261012/pull/24).

## M12 — shared page templates and compositions

Content Studio now supports **Page compositions** independently of **Page templates**. The published **Work** and **Journal** indexes both reference the `page-general` template, each with a separate root Card. Editing their Page in **Design** shows only its own composition; **Preview** assembles the selected shared template and full website chrome. Edits to `page-general` affect both pages, without copying their unique content.

- To create a new Page, use **Pages → +**. New Pages start as draft, with a unique root composition using the first Page template.
- Select a Page with no object selected in the inspector to change its shared Page template; **Edit template** opens the independent template editor.
- Existing legacy Pages (Home and Studio) are kept intact. **Convert to composition** is an explicit action: it nests the existing Cards under a new root, with a warning that visual geometry may change. Do not convert without reviewing the result.
- In **Templates**, use **+ / New page template** to create a one-main-slot Page layout. Record-detail templates remain separate. The editor protects the required root Card and main slot from deletion/duplication.
- **Navbar and Footer are now reusable, editable semantic Card components**: `site-navbar` and `site-footer` in `content/site.json`. The component root *is* the semantic `<nav>` or `<footer>` landmark, not a decorative nested Card. `site.chrome` selects the defaults and Page/record templates may independently override either via `template.chrome`.
- **Overview → Website settings:** edit or switch the default Navbar/Footer; change, reorder, add and remove navigation labels/routes. `site.navigation` is the one canonical source for link destinations and labels; hidden draft pages and active-section highlighting remain automatic.
- **Components → Navbar / Footer:** edit the actual Card and Items in isolation, including the Navbar logo, footer name, copyright text, grid placement, background, spacing and height. Duplicate a frame Component to create an alternate, then select it from a template without affecting other pages. The Navbar's right six columns are reserved for automatically generated links; its Home logo is required.
- **Templates → Properties → Shared site frame:** inherit defaults or select a different Navbar/Footer for that template. The General Page template explicitly references both defaults. Existing Home/Studio Page body Cards are still legacy; their site chrome is shared regardless.
- M12 code paths are present and targeted model/render smoke checks passed; **full local Node, Chrome, actual build, ZIP and visual acceptance remain deferred until the end of V2**. Do not interpret this as a completed release review.

## M13 — reusable design styles

A Style describes appearance, not a new graphic object. It is separate from a Component, which owns a reusable Card/Item composition.

- **Styles** in Studio's Structure navigation opens a library of named **Card** and **Item** styles. Add, rename, edit and remove unused definitions. Usage counts show how many Cards/Items reference each style.
- The inspector for a selected Card/Item exposes **Named appearance → Style reference**. Choose a named style to inherit its properties. Explicit **local overrides** are labelled and can be reset to **Inherit**, returning control to the shared definition.
- Card styles control **background, gap, padding and outline**; Item styles control **text role, tone and weight**. Grid divisions, areas, content and structure remain with the individual Card/Item, not its style.
- **Site design tokens** include the grayscale palette, monospaced/system type family, corner radius, outline opacity and existing page-relative master spacing. They compile to allowlisted CSS variables—not arbitrary author CSS.
- Canonical model: `site.design.tokens`, `site.design.styles[]`, optional `node.styleRef` and `node.appearance`. Resolution is **existing/site defaults → named style → explicit local overrides**; pages lacking new fields remain compatible.
- **Work and Journal** use shared `index-root` Card styling and `eyebrow-label` Item styling, seeded to match the previous appearance. Editing those named styles affects both indexes without modifying the original Home composition.

New Node/browser regression checks cover inheritance, safe validation, template preview parity, shared propagation and resetting an override. The complete local Node/browser/build/ZIP/visual acceptance is still deferred until the end of V2.

## M14 — independent Project and Post compositions

Each Project/Post record can now own a **unique editable root Card** while continuing to store its content/metadata as ordinary typed collection fields. This is a structural improvement; it does not copy a shared template into every record.

- **Collection Settings:** choose the **default composition template for new records** or create another reusable one-main-slot record template. Project and Post collections now have `record-project-layout` and `record-post-layout` respectively.
- **New records** start as Draft and receive a unique Card composition seeded from their collection's existing detail template. Their field bindings (`{{title}}`, `{{summary}}`, `{{body}}`, images and record metadata) remain live.
- **Existing records:** select **Create unique composition** in the record inspector. The opt-in action clones its current detail layout into a one-root Card with regenerated IDs and warns that the nested geometry may change; there is no silent migration.
- **Record Design** edits only that record's root Card with the same Structure/undo/typed Styles controls as Pages. **Preview** assembles the selected template, root Card, current record context and reusable Navbar/Footer. **Fields** continue to edit content separately.
- **Record template override:** choose a compatible legacy detail template without converting the record, or choose a shared slot template for a record composition. Changes are validated for the collection and slot contract.
- **Optional detail pages:** `collection.detailPages` and `record.detailPage` (default On) control public detail route generation without removing an entry from the collection index. When disabled, query cards render without dead links.
- The draft Post **A field of soft modules** is a real composition-based example, still Draft. All currently published Project and Post detail pages remain on their pre-M14 layouts until their owner opts in.

Validation and regression tests cover missing/wrong slot templates, duplicate/invalid record roots, independent changes, shared layout inheritance, retained public routes, explicit detail-page opt-out and Studio Design/Preview. Full Node/browser/build/ZIP/visual acceptance remains scheduled for the end of V2.

## M15 — contextual asset queries

A Card can now generate an **image gallery from asset metadata**, without maintaining links or separate image lists on Project records.

- **Create:** In any Page/record Design view, choose **Add object → Asset gallery · dynamic**. It creates an ordinary Card with `source.kind = "assets"`, not a new graphical node type.
- **Filter:** The Card inspector edits a list of **AND predicates**. Available fields are `projectCode` (equals), `tags` (contains an exact tag, ignoring case), and `name` (equals or contains text). Values can be literal or a safe record binding such as `{{projectCode}}`. Querying outside a record or with an empty project code returns no assets—not the whole library.
- **Present:** Choose 1/2/3-column arrangement, original/name order, a maximum image count and captions. The renderer creates ordinary nested Card/Image Items with existing asset URLs, alt text and optional captions. The original image files are never copied.
- **Maintain:** Asset Library metadata (`properties.projectCode`, `tags`, name, caption) remains the single source of truth. Update an asset tag/project code once and every matching gallery refreshes.
- **Demo:** **Balkan House** is converted to its own M14 root composition with a highlighted-assets query: `projectCode = {{projectCode}}` **AND** `tags contains Architecture`. Demo project code `4424` matches the Housing placeholder image. Responsive Envelope has demo code `4430`; M16 subsequently migrated the remaining demo Project/Post pages to the same unique-composition system.
- **Safety:** The query schema only permits allowlisted fields/operators, a bounded result count and simple field bindings—no arbitrary JavaScript, CSS, URL expressions or relationship engine. Validation and regression coverage include missing context, AND behaviour, ordering, tag matching, malformed queries and assembled preview/public parity.

As agreed, converting demo legacy layouts is now allowed during V2 development; keeping them byte-identical is **not** a product requirement. Keep routes and authored data consistent, and complete the final visual/browser review before merging.

## M16 — unified authoring, demo migrations and safer edits

**All existing demo content now uses the composition architecture:** Home, Work, Journal and Studio Pages each have a unique root Card and shared Page slot template; all eight Project/Post records have independent root Cards under their collection's slot template. Published routes and metadata stay consistent, while exact legacy placeholder geometry is not a constraint.

- **Contextual Add object:** A quick button in the workspace toolbar and the existing Add picker insert inside the selected ordinary Card, or beside the selected Item in its parent Card. The modal identifies the intended destination. Generated/reference/slot Cards remain non-editable containers.
- **Safe duplication:** Duplicate a Page or Record without changing the original. Copies receive a unique ID, route slug and regenerated Card/Item IDs, and always start as **Draft** with publication approval off.
- **Truthful Overview:** The generated-page count now derives from the actual shared static route collector, not the number of records.
- **Asset dependency protection:** The Image library shows which Pages, Components, Record fields, direct Image Items and contextual galleries refer to an asset. Referenced asset metadata cannot be deleted accidentally. A pure `src/asset-usage.mjs` dependency scanner powers the controls; deleting unused metadata does not delete image files.
- **Rendering fix:** The font-family token now uses safe quoting inside the site frame's HTML `style` attribute.
- **Legacy compatibility:** Old record-detail templates remain available as import/seed/fallback definitions and for creating initial content, but all current demo Pages/Records use unique compositions. Do not maintain separate renderer or duplicate authored layout content for legacy paths.

Regression updates cover the migrated model, DOM and preview paths; M16 includes focused migration/asset tests and a disposable local Chromium interaction scenario. Full Node/browser/build/ZIP/visual acceptance is **still due at the end of V2**, before any merge.

## M17 — local release acceptance and independent hosting

The V2 source now includes a **single local acceptance command**, with no GitHub Actions test or staging dependency:

```sh
npm run release:check     # full Node + Chromium, backup/restore, builds, both ZIP modes
npm run release:visual    # 10 local screenshot captures for manual review
npm run package:site      # publishable public-only release/website.zip
npm run preview           # loopback preview of the public static output
```

The release audit verifies actual JSON/media snapshot restoration, all Node tests, local Chromium checks, a root-domain noindex build, the GitHub Pages subpath build, an indexable custom-domain build with canonical/sitemap, all internal link/asset references, no leaked Studio/source files and independently verified ZIP manifests. It generates a dated JSON report under `release/reports/`. It does **not** deploy, change publishing settings in the live source, merge Git branches or replace authored data. `--no-browser` is a **partial diagnostic** with nonzero exit status, not signoff.

Visual capture creates `release/review/YYMMDD-HHmm_m17-visual/` with desktop and narrow Chromium PNGs, an SHA-256/dimensions manifest and explicit **pending human inspection** status. After local checks, manually review the Studio editor and the 10 public routes, both indexing modes and the extracted public ZIP. The root-hosted ZIP is portable to ordinary static hosting, but is not the editable content backup.

**Current acceptance status:** Audit/capture automation and regression tests are committed. **The complete local Node/Chromium/build/ZIP run and human visual review still have to be executed and approved before V2 can merge.** See [M17 release acceptance guide](docs/M17_RELEASE_ACCEPTANCE.md) for exact commands, data/media recovery and signoff.

## Project structure

| Location | Purpose |
| --- | --- |
| `content/site.json` | Source of truth: pages, projects, posts, templates, components, assets metadata |
| `assets/` | Real media files referenced from JSON |
| `studio/index.html` | Local desktop Content Studio (not published) |
| `src/model.mjs` | Shared data validation |
| `src/render.mjs` | Shared renderer for Studio previews and public site |
| `src/page-assembly.mjs` | Pure one-main-slot template + unique composition assembler |
| `src/style-system.mjs` | M13 named style resolution, site token variables and validated style definitions |
| `src/asset-query.mjs` | M15 typed AND filters, record-context binding and deterministic asset selection |
| `src/asset-usage.mjs` | M16 safety scanner for direct and contextual asset dependencies |
| `src/build.mjs` | Public static build: `dist/` |
| `src/server.mjs` | Local-only authoring API |
| `scripts/` | Local testing, backup and optional ZIP utilities |
| `.github/workflows/deploy-pages.yml` | Only GitHub workflow: publish website from `main` |
| `docs/IMPLEMENTATION_PLAN.md` | [Living V2 roadmap](docs/IMPLEMENTATION_PLAN.md) |
| `docs/POST_V1_ARCHITECTURE.md` | [V2 architecture specification](docs/POST_V1_ARCHITECTURE.md) |

## Optional local utilities

- `npm run backup:create` creates a JSON+media backup; `npm run backup:restore -- <snapshot> <new-target-folder>` restores without overwriting an existing folder.
- `node scripts/content-readiness.mjs` reports missing editorial content; **it does not prevent builds or publishing**.
- `node scripts/media-budget.mjs` checks images; the build performs this automatically.
- `node scripts/verify-site-package.mjs` checks a local ZIP's contents and SHA-256 manifest.
- `node scripts/rehearse-release.mjs` performs an isolated backup/build/restore drill when you want to test recovery.

## Development status

V1 was squash-merged into `main` ([PR #23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23)). All M12–M17 changes stay on **one retained V2 development branch** until the user approves the final squash merge. No background automations or screenshots; real content, booking and future third-party hosting are deferred until after V2. See the [living plan](docs/IMPLEMENTATION_PLAN.md) for actual milestones and progress.
