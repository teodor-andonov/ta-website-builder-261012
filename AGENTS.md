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
2. Work on the **current V1 development branch across all unfinished M8–M11 milestones**, rather than starting a branch per milestone. Do not merge/deploy intermediate milestones just for website preview. Preview through local Studio (`npm run dev`), local static output (`npm run preview`) or GitHub Actions screenshots.
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

## Git/branch lifecycle — required (updated 2026-10-15)

1. **One development branch for the entire V1 roadmap (M8–M11).** Continue on `feature/m8-advanced-editor` with draft [PR #23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23); it is now the *rolling V1 branch*, despite its historical name. Keep `main` stable. Each M8–M11 substep is committed here. Do not create a new branch for M9, M10 or M11.
2. **Substantial autonomous development cycles are allowed.** Each triggered run should take at least one meaningful roadmap substep when feasible and may complete multiple substeps or a larger coherent slice if complexity, tests and available execution time permit. The agent chooses scope per run. Never split work into trivial commits solely to match an hourly trigger. Do not claim progress for documentation-only updates unless legitimately blocked.
3. Before edits, fetch current remote branch, roadmap, specialist docs, code and relevant CI. Work only on agreed roadmap tasks. Inspect diffs, validate/build and run available browser/CI checks. Maintain dated logs and next actions. On failure, record what failed, preserve a recoverable state and prioritise remediation in the next run.
4. **Internal milestone completion does not mean merge.** Once the M8 technical acceptance criteria pass, record it and proceed to M9 on the *same branch*; likewise M9 → M10 → M11. No per-milestone user review is required unless decisions/approved content or access are missing. Unapproved factual project claims, real credentials, production-domain changes and destructive operations require explicit user input. If blocked, continue other unblocked agreed tasks.
5. **The user has ALREADY AUTHORISED the ONE V1 squash merge to `main` (2026-10-15).** When M8–M11 are verifiably complete, all required automated checks are green, release prerequisites are satisfied and the current PR head is confirmed, **perform the squash merge automatically once** (use merge method `squash` and an expected head SHA). Do not ask the user for V1 merge approval again. This authorization includes the GitHub Pages staging deployment triggered by merging `main`; verify its result. No interim merges, direct pushes to `main` or repeated squash merges. Do not fabricate approved project content or credentials, bypass failing checks, remove launch protections, or force an external production-host deployment when required data or access is missing.
6. **After the verified V1 squash merge**, create **one new post-V1 development branch** from the latest `main`, covering M12–M17; use it for incremental commits and one PR. The user has authorised carrying the roadmap through to completion, including **one final post-V1 squash merge** if M12–M17 are verifiably complete with passing checks. A successful scheduled run may cross each internal milestone and the approved squash-merge gates; do not stop merely to ask for reapproval. If essential user-controlled content, credentials, live domain decisions or irreversible non-GitHub deployment actions are not available, report the specific blocker and continue other safe work; never claim the stage or release is complete without satisfying its acceptance criteria.
7. **NEVER delete branches**, even after squash merges, and do not enable GitHub auto-delete. Preserve history and existing head branches unless the user specifically changes this instruction.
8. Keep [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) as the one living roadmap and update dated [logs](docs/logs/README.md) as changes land. No separate competing roadmap.

### Scheduled development cycle protocol

Each unattended cycle is a **fresh invocation**, not continuous stateful execution. Read current repo status and durable GitHub log first; do not rely on chat history. Select the largest coherent next piece you can safely complete and validate. Target **at least one meaningful milestone substep** if feasible; do more when appropriate. Never guess that GitHub access, CI or browser automation are available until actually verified during the run.

End each cycle with a concise user report containing the branch, milestone/substeps completed, commit/PR links, actual test/CI evidence (distinguish passing from pending), blockers and next step. Work autonomously only within the approved scope. If a dependent service is inaccessible or essential input is missing, report precisely and do not pretend to have completed the task. **A single squash merge is allowed at each fully verified phase-end as already authorised.** An approved squash merge may trigger GitHub Pages staging; do not publish external production content without the required actual credentials and approved material. Once M17 and its final merge are complete, record final completion, stop coding and disable the recurring automation if supported; otherwise future invocations must detect the terminal status and perform no work.


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
