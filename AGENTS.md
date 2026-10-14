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

## Working rules
1. **At the start of every development run, read [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).** Check the current stage/branch/PR and the matching specialist documentation, then inspect the actual repository state.
2. Work on the *stage's existing feature branch* rather than starting a new branch per tiny fix. Do not merge/deploy incomplete milestones just for website preview. Preview through local Studio (`npm run dev`), local static output (`npm run preview`) or GitHub Actions screenshots.
3. Keep `prototype-v2/index.html` intact as historical reference unless explicitly requested. Update canonical JSON and the shared renderer/model, not parallel manual HTML.
4. Validate IDs and slugs; reject unsafe HTML/eval, cycles and data-loss edits. Restrict filesystem writes to approved data/media paths. The published static site must not include any writable API.
5. Add focused tests, run reproducible CI/browser checks, capture screenshots for UI changes and disclose limitations. **Do not mistake green CI for complete product acceptance.**
6. **At the end of every substantial run, update the living plan's current state/next steps AND the relevant dated file in `docs/logs/`.** Make these documentation changes in the same branch/PR as the implementation.

## Current assignment and source of truth

- **Status, milestones, acceptance criteria, next work:** [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) — **the one living roadmap**, updated each run.
- **Dated implementation history:** [`docs/logs/`](docs/logs/README.md). Preserve historical entries and link to them; do not create competing planning documents per run.
- **Technical specifications:** `docs/ARCHITECTURE.md` and relevant `docs/M*.md` (e.g. `docs/M8_EDITOR_PLAN.md`). These explain the system, not whether a milestone is complete.
- The original M1 file persistence and sample-page vertical slice were completed in 2026 and are **not** the next coding task; see [history](docs/logs/2026-10-12-foundations.md).

## Supported viewport and visual QA
- **Content Studio is desktop-only.** Focus on desktop interaction and visual quality; do not implement or test mobile editor variants unless explicitly requested.
- The **public website deliberately uses a nonadaptive print-style layout** on mobile: fixed Card grid divisions and child areas, proportional scaling in page-width units, no breakpoint reflow. Users can zoom/pan like a presentation. Desktop-only still applies to the authoring app.
- For remote UI reviews, run desktop browser tests and share a compact set of screenshots and findings **directly in the chat**. No screenshot archives in GitHub and no recordings by default.
- Baseline desktop viewports: 1600×1000, plus 1280×800 when relevant.

## Git/branch lifecycle — required

1. **One development branch per substantial milestone or agreed development cycle**, not one branch per micro-feature. Currently M8 works on `feature/m8-advanced-editor` / [draft PR #23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23). Keep `main` stable; pushing to the feature branch runs CI without publishing Pages.
2. Make multiple incremental commits in the active feature branch. Inspect the actual diff, run tests/build and browser checks, check data-loss/security risks, and document the test evidence and remaining problems before final review. Share actual screenshots directly for UI work.
3. **Only after milestone acceptance**, squash-merge the approved PR to `main`, then verify GitHub Actions Pages deployment. Do not merge merely to preview.
4. **Immediately after a confirmed merge, delete the merged head branch** (prefer GitHub's repository setting **Settings → General → Pull Requests → Automatically delete head branches**; if disabled, use the PR's **Delete branch** action or another supported deletion method). Then create `feature/<next-stage>` from latest `main` when the next cycle begins.
5. Deleting a squash-merged head branch is safe for combined source changes and the PR record, but its original individual commits do not necessarily appear as independent commits in `main`. **Never apply automatic cleanup to open/unmerged experiments without explicit review.**
6. Keep [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) and [dated implementation logs](docs/logs/README.md) updated before milestone merge. These are mandatory run deliverables.


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
