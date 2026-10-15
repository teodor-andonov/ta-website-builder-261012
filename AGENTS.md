# TA Content Studio — Instructions for coding agents

## Goal
Maintain the **existing** local file-first JSON Content Studio and its generated public TA website. Preserve the minimal UI, keep the Card/Item model explicit, and avoid unnecessary rewrites. The original `prototype-v2/index.html` is a historical reference, not an unfinished task.

## Decisions that must survive
- **JSON only** is the canonical authoring format for pages, projects, posts, assets metadata, templates, components and compositions. Do not add Markdown as parallel content.
- Keep a small practical set of JSON files grouped by broad content types. Avoid mandatory one-file-per-record storage.
- Store media (images, SVGs) as real files; refer to them from JSON. Don't make base64 blobs the production media store.
- Keep **one renderer/composition contract** for editor previews and public pages; avoid separate unrelated implementations.
- Recursively compose **Cards** (structure: layout, gap, padding, rounding) and **Objects** (one atomic payload: text, image, graphic, empty). Cards may contain cards/objects. A group card may start a fresh grid.
- Support bespoke custom JSON-composed pages, auto-generated record detail pages from templates, and filtered collection feeds.
- Posts include Note, News and Article formats; projects and future collections use the same page-generation mechanism.
- Reuse stable record/asset/block identifiers; URLs use editable slugs.
- Keep the toolchain small and understandable; prefer vanilla browser code and a minimal local development service, not a hosted CMS or mandatory SaaS.

## Editorial content and placeholder media — user permission (2026-10-15)

- The user **explicitly authorises temporary demo copy and plain light/desaturated visual fills** so M9–M11 development does not stall. Existing routes and Card/Item composition remain the real TA site; never create a second demo site.
- Prefer flat, neutral, **checked-in static SVG media** for placeholder fills. Keep them clearly marked `placeholder: true` with editable tags/metadata. Raster replacement through Studio must preserve the original asset ID so existing record references survive.
- Pages and records may carry `placeholder: true`, separate from `approvedForPublication`. An explicitly temporary placeholder is **acceptable for V1 technical delivery**, but **not equivalent to approved factual project information**. Do not misrepresent sample work as verified built projects or invent credits, prices, credentials or booking URLs.
- The release audit distinguishes placeholders from real production blockers; **keep `noindex` and retain strict external-production content checks** until real copy, media rights, and working contact destinations are confirmed. Lack of authentic assets is not a reason to stop safe software development.
- Asset/project `projectCode` is a stable editable metadata field, not a relationship manager or contextual query engine. Full contextual queries remain at M15.

## Working rules
1. **At the start of every development run, read [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).** Check the current stage/branch/PR and the matching specialist documentation, then inspect the actual repository state.
2. Work on the **one rolling V2 branch `feature/v2-unified-studio` across M12–M17**, rather than creating milestone branches. Do not merge interim milestones. Preview using local Studio (`npm run dev`) and local static build (`npm run preview`). GitHub staging on `main` remains `noindex`.
3. Keep `prototype-v2/index.html` intact as historical reference unless explicitly requested. Update canonical JSON and the shared renderer/model, not parallel manual HTML.
4. Validate IDs and slugs; reject unsafe HTML/eval, cycles and data-loss edits. Restrict filesystem writes to approved data/media paths. The published static site must not include any writable API.
5. Add focused tests, run reproducible CI/browser checks, and disclose limitations. **Screenshots are suspended at the user's request (2026-10-15); do not capture or upload them unless requested again.** Do not mistake green CI for complete product acceptance.
6. **At the end of every substantial run, update the living plan's current state/next steps AND the relevant dated file in `docs/logs/`.** Make these documentation changes in the same branch/PR as the implementation.

## Current assignment and source of truth

- **Status, milestones, acceptance criteria, next work:** [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) — **the one living roadmap**, updated each run.
- **Dated implementation history:** [`docs/logs/`](docs/logs/README.md). Preserve historical entries and link to them; do not create competing planning documents per run.
- **Technical specifications:** `docs/ARCHITECTURE.md` and relevant `docs/M*.md` (e.g. `docs/M8_EDITOR_PLAN.md`). These explain the system, not whether a milestone is complete.
- The original M1 file persistence and sample-page vertical slice were completed in 2026 and are **not** the next coding task; see [history](docs/logs/2026-10-12-foundations.md).

## Supported viewport and visual QA
- **Content Studio is desktop-only.** Focus on desktop interaction and visual quality; do not implement or test mobile editor variants unless explicitly requested.
- The **public website deliberately uses a nonadaptive print-style layout** on mobile: fixed Card grid divisions and child areas, proportional scaling in page-width units, no breakpoint reflow. Users can zoom/pan like a presentation. Desktop-only still applies to the authoring app.
- For remote UI reviews, run desktop browser tests at the agreed viewports and report concrete DOM/interaction checks **without screenshots for now** (user request 2026-10-15). No screenshot archives or recordings by default.
- Baseline desktop viewports: 1600×1000, plus 1280×800 when relevant.

## V1 staging completion / V2 execution decision (2026-10-15)

The user has explicitly approved **merging V1 now as a software and unindexed-staging release**, then creating **one V2 development branch** for M12–M17. This supersedes the older condition tying the V1 GitHub squash merge to real portfolio copy, booking/contact, third-party hosting, manual screen-reader/browser QA and external production launch. Those matters are **deferred until after V2**. Their *public production* gate remains unchanged: no fictional credentials, rights/credits, invented booking URL, removal of `noindex` or external-host deployment.

The one V1 squash merge is allowed **after verifying green exact-head CI and confirming `main` builds a noindex-only GitHub Pages staging site**. Preserve the historical V1 branch. After verifying the merge, create one rolling V2 branch from the resulting `main` commit. Keep screenshot capture disabled. Treat the post-V1 architecture in `docs/POST_V1_ARCHITECTURE.md` as the design spec and `docs/IMPLEMENTATION_PLAN.md` as the one living roadmap.

## Current phase — V2 M12–M17 (updated 2026-10-15)

- **V1 software/staging shipped:** [PR #23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23) squash-merged to `main` at `7d5b44556c5bd237b9b8a06bec2322f842b13a00`. GitHub Pages preview workflow succeeded and remains `noindex`. The historical V1 branch was retained.
- **V2 working branch:** `feature/v2-unified-studio`, [rolling draft PR #24](https://github.com/teodor-andonov/ta-website-builder-261012/pull/24), created from that exact V1 merge commit. Use **one retained branch for M12–M17**. `main` stays on V1 until final M17 approval and verified squash merge.
- **Current milestone M12:** optional Card-based one-main-slot template plus independent page root composition; progressively migrate the real TA pages with isolated authoring and full-page preview. This must be backward-compatible with V1 output until deliberate migration.
- **Canonical product spec:** [`docs/POST_V1_ARCHITECTURE.md`](docs/POST_V1_ARCHITECTURE.md). **One living status/roadmap:** [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md). Log meaningful changes in [`docs/logs/`](docs/logs/README.md).
- **User deferral:** real portfolio copy/images, contact booking, external production host/domain, and manual QA will be handled **after V2**. They do not block software development or the authorised staging merge, but still gate indexed external production. Keep `noindex` on staging and strict publication safeguards.
- **Development is manual/on prompt** — the former hourly ChatGPT automation remains paused and must not be restarted. Make substantial tested changes when asked; do not promise background work.
- **Final V2 squash:** user pre-authorised a **single** squash merge to `main` only after all M12–M17 software acceptance criteria and latest exact-head CI pass. No milestone merges, direct pushes to `main`, external host launch, or branch deletion. Never enable automatic deletion.
- **Evidence:** fetch current remote branch, relevant files and CI before edits, run Node/Chromium tests when available, log failures honestly, and do not claim manual QA or public indexing is complete. **No screenshots** unless the user changes this preference.

## M7 — confirmed print/presentation Card system
- Cards are equal-division grids with explicit integer rows/columns. Their immediate children, Cards or atomic Objects, have `{x1,y1,x2,y2}` grid-line areas (1-indexed start inclusive/end exclusive).
- Page, nav, sections and footer are semantic Cards; nested Cards restart their own grids. No automatic rearrangement or responsive breakpoint layouts.
- `1u = page width / 100` (`1cqw`); text, padding, gap, radius and sizing derive from it, not pixel floors/clamps. On narrow screens layout scales down instead of changing columns.
- Section Cards and nav/footer provide a `constrainHeight` toggle with height = Card width × `heightFactor`, else content-height rows.
- Strict grayscale background palette including `transparent`; a site-level Card-outline toggle and per-Card optional subtle outlines. Positive Card gap/padding use the shared master values with 1×, 2× and 4× multipliers. Items clip overflow by default; optional internal scrolling hides scrollbars but must not trap document scrolling.
- Don't silently reintroduce responsive card layouts, saturated colour tokens, arbitrary line dividers or fixed-size child positioning.

## M7 refinement — master Card spacing
- Canonical design has two independent master values, `site.design.pad` and `.gap` (numeric multiples of page-width `u=1cqw`). Each Card uses `padding`/`gap` = `x1|x2|x4`; default `x1` and **never use a zero-padding Card**, even when it contains one object.
- Every grid child and nested Card fills its assigned grid area; nested padding accumulates naturally. The Page is the master padded grid; the header, main page content, footer and all section Cards use the same base spacing system.
- Do not add special `4cqw` insets to semantic regions. No responsive reflow. Keep outline separate from CSS box sizing.

## M7 refinement — Card + Item only (approved)
- The JSON graphic tree and published DOM must contain **only Cards and atomic Items**. Do not introduce intermediate graphical `Block` wrappers; every Card or Item owns its explicit parent grid area, selection metadata and overflow behaviour.
- Page, Nav, Main, Footer and authored Sections are semantic Cards with `.card` as their primary CSS class. Text, image, rich-text, links, etc. are direct Items with `.item` as the primary class. Incidental payload internals (for example an `img` inside an image Item) do not become graphic-tree nodes.
- Repeated collections are **Cards with a data source**, using a reusable record Card template. Every Work and Journal result is itself a Card grouping the image and all metadata Items; never render bare `q-entry` elements or anonymous query rows.
- Content outside an assigned cell is **clipped by default**. `Item.overflow='scroll'` is optional, uses hidden scrollbar, and chains scrolling to the document. Never reintroduce universal `overflow:auto` on Card children or `overscroll-behavior:contain` that traps wheel scroll over the page.
- Keep these invariants in the Studio editor, canonical JSON, shared renderer and static output. Reference `docs/M7_CARD_ITEM_DOM.md`.
