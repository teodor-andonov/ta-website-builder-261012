# TA Content Studio — Instructions for coding agents

## Goal
Evolve the existing visual editor (see `prototype-v2/index.html`) into a real local file-first authoring system and static public TA website. **Preserve**, don't redesign, the prototype's refined minimal interface.

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
1. Read `README.md`, the runnable baseline and `docs/` before changing architecture.
2. Keep the baseline `prototype-v2/index.html` intact unless explicitly updating the reference snapshot.
3. Start with file-backed persistence and real page output. Do not spend Milestone 1 on a new dashboard, drag-and-drop, accounts, clouds or a framework migration.
4. Changes to source JSON must reach preview and generated HTML via the same schema and data, not duplicated record content.
5. Validate IDs/slugs, avoid unsafe eval/HTML injection, keep local filesystem writes restricted to permitted data/media directories. Ensure static deployments cannot write files.
6. Add reproducible tests and document exactly what was run. Don't imply production readiness based on the visual prototype.

## Definition of the first vertical slice
Edit sample Post `designing-with-code` → save to a real JSON file → reload → preview reflects it → build `dist/posts/designing-with-code/index.html`. Also build project `dist/work/balkan-house/index.html`. A shared template edit must affect more than one generated page.

See `docs/IMPLEMENTATION_PLAN.md` for sequencing.

## Supported viewport and visual QA
- **Content Studio is desktop-only.** Focus on desktop interaction and visual quality; do not implement or test mobile editor variants unless explicitly requested.
- The **public website deliberately uses a nonadaptive print-style layout** on mobile: fixed Card grid divisions and child areas, proportional scaling in page-width units, no breakpoint reflow. Users can zoom/pan like a presentation. Desktop-only still applies to the authoring app.
- For remote UI reviews, run desktop browser tests and share a compact set of screenshots and findings **directly in the chat**. No screenshot archives in GitHub and no recordings by default.
- Baseline desktop viewports: 1600×1000, plus 1280×800 when relevant.

## Pull request and merge standards
- Develop each substantial change on a focused branch. Keep `main` stable.
- Before merging: inspect the actual diff, run tests and production build, verify major interactions, check for secrets and unsafe filesystem/network changes, and document important limitations.
- Use GitHub Actions CI as the repeatable baseline; do not label absent or pending checks as passing.
- Favor squash merges for cohesive changes and link related issues. Merge only after findings affecting correctness/security/data loss are resolved.
- Where possible, provide honest screenshots of the browser-tested result directly in the conversation. Avoid overclaiming that tests fully cover the interface.

## M7 — confirmed print/presentation Card system
- Cards are equal-division grids with explicit integer rows/columns. Their immediate children, Cards or atomic Objects, have `{x1,y1,x2,y2}` grid-line areas (1-indexed start inclusive/end exclusive).
- Page, nav, sections and footer are semantic Cards; nested Cards restart their own grids. No automatic rearrangement or responsive breakpoint layouts.
- `1u = page width / 100` (`1cqw`); text, padding, gap, radius and sizing derive from it, not pixel floors/clamps. On narrow screens layout scales down instead of changing columns.
- Section Cards and nav/footer provide a `constrainHeight` toggle with height = Card width × `heightFactor`, else content-height rows.
- Strict grayscale background palette including `transparent`; a site-level Card-border toggle and per-Card optional subtle borders. Gaps and padding limited to none/compact/regular/generous; overflow clipped with invisible scrollbars.
- Don't silently reintroduce responsive card layouts, saturated colour tokens, arbitrary line dividers or fixed-size child positioning.
