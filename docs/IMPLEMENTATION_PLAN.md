# TA Content Studio — implementation plan

> **Living index / source of truth for delivery status and upcoming work.**
> Updated: **2026-10-14** · Maintained after each substantive development cycle.
> Change history goes in [dated implementation logs](logs/README.md), while specialist documents describe *how* the system works.
>
> This plan describes the active feature branch. The public `main` branch may lag until the feature is reviewed and squash-merged.

## Current position

- **Stage:** M8 — Advanced Visual Editor, structure-first design, **in progress**.
- **Working branch:** `feature/m8-advanced-editor`, [draft PR #23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23).
- **Deployed baseline:** `main` publishes the M7 site and earlier M8 canvas-grid experiment. The M8 branch backs out that experiment in favour of tree-based authoring; **do not merge/deploy until M8 acceptance**.
- **Local editor:** `npm run dev` → http://127.0.0.1:5173/ ; **local static preview:** `npm run preview` → http://127.0.0.1:4173/.
- **Public demonstration:** https://teodor-andonov.github.io/ta-website-builder-261012/ — placeholder content, deliberately `noindex`, **not** the production launch.
- **Recent evidence:** 71/71 automated tests and Chromium interaction/screenshot checks passed on the M8 branch (2026-10-14), including multi-step Undo/Redo, grid edits, keyboard Structure moves, overlap warnings, and stale-tab conflict recovery. Re-run on further changes.

## Roadmap at a glance

| Stage | Scope / acceptance | Status | History |
| --- | --- | --- | --- |
| M0 | Preserve the original single-file prototype and initial requirements | Complete | [Foundations](logs/2026-10-12-foundations.md) |
| M1 | File-backed Studio, validated JSON persistence, static routes | Complete · [PR #1](https://github.com/teodor-andonov/ta-website-builder-261012/pull/1) | [Foundations](logs/2026-10-12-foundations.md) |
| M2 | One shared renderer for Studio and public pages, reusable collections/templates | Complete · [PR #3](https://github.com/teodor-andonov/ta-website-builder-261012/pull/3) | [Foundations](logs/2026-10-12-foundations.md) |
| M3 | Real image uploads, separate binary media and metadata | Complete · [PR #5](https://github.com/teodor-andonov/ta-website-builder-261012/pull/5) | [Foundations](logs/2026-10-12-foundations.md) |
| M4 | Published Home/Work/Journal indexes, project/post detail pages | Complete · [PR #7](https://github.com/teodor-andonov/ta-website-builder-261012/pull/7) | [Foundations](logs/2026-10-12-foundations.md) |
| M5 | GitHub Pages static staging through Actions, repository base path | Complete · [PR #9](https://github.com/teodor-andonov/ta-website-builder-261012/pull/9) | [Design + deployment](logs/2026-10-13-to-14-design-and-deploy.md) |
| M6 | Soft Precision grayscale identity, initial homepage | Initial pass complete · [PR #11](https://github.com/teodor-andonov/ta-website-builder-261012/pull/11) | [Design + deployment](logs/2026-10-13-to-14-design-and-deploy.md) |
| M7 | Print-native recursive Cards/Items, grid areas, spacing, outlines, nontrapping scroll | Functional pass complete · [PRs #13–#17](https://github.com/teodor-andonov/ta-website-builder-261012/pull/17) | [Design + deployment](logs/2026-10-13-to-14-design-and-deploy.md) |
| M8 | Usable structure-first visual editor for Cards/Items | **Active — draft PR #23** | [M8 cycle](logs/2026-10-14-m8-structure-editor.md) |
| M9 | Authentic TA portfolio content, projects/posts, services & How We Work | Planned | — |
| M10 | Production QA, accessibility, metadata/SEO, performance, backups, acceptance | Planned | — |
| M11 | Production domain/hosting (Hostinger or equivalent), asset deployment, launch/maintenance | Planned | — |

*Milestone numbering evolved: advanced editor moved to M8 after the print-native Card architecture was separated into M7. Historical documents use their original numbering.*

## M8 — active development cycle

**Product decision:** organise the desktop editor as **Workspace | Document Structure | Canvas | Properties**. Canvas is for clean preview and selection; hierarchy changes happen in Structure, and precise geometry happens in Properties. The public website retains a fixed, nonadaptive, grayscale, proportional, print-like Card grid. Only the Studio UI uses a single blue highlight `#525cbb`.

**Implemented on the active branch**
- Restore simple Card/Item canvas selection and remove the intrusive canvas grid overlay.
- Dedicated collapsible recursive Document Structure tree: synced selection, Card ancestry, folding, keyboard traversal and scrolling to selection.
- Tree drag and keyboard controls to reorder or reparent authored Cards/Items, preventing circular nesting and unsupported destinations. Focused Structure rows support Alt+Up/Down to reorder siblings, Alt+Right to nest into the previous Card, and Alt+Left to outdent; a small move toolbar disables invalid actions. **Bounded, scope-local multi-step Undo/Redo** now covers tree moves, add/duplicate/delete, Card/Item properties and atomic grid-area edits; keyboard shortcuts available outside text fields.
- Contextual Add Child/Add Section, collision-avoiding duplication, delete controls and optional authoring labels.
- Compact grid-area picker in Properties, including real pointer selection and a separate **atomic X1/Y1/X2/Y2 Apply all** operation; invalid intermediate coordinates are never persisted.
- Shared JSON renderer and local-only persistence preserved. Browser checks use disposable JSON data.
- Nonblocking overlapping-cell feedback in Properties: striped occupied cells in the mini grid, immediate warnings for numeric drafts and drag placement, and pure geometry tests. Layering remains possible without silent layout changes.
- Revision-checked JSON and image writes prevent one browser tab from overwriting another: the local API returns strong ETags, serialises mutations, and rejects missing/stale revisions (428/409). On a save conflict, Studio stops further writes and retains unsaved edits in memory for **Export JSON** before reload/manual reconciliation; browser tests cover this failure path.

**Remaining before M8 sign-off**
1. **Structural usability:** exercise add/duplicate/delete/nest on larger real-world trees and verify keyboard restructuring with assistive technologies. Overlap warnings are implemented; deliberate visual layering is still allowed. Multi-step history remains in-memory (up to 40 edits per scope, across at most 16 recent scopes) and does not survive a full reload.
2. **Editor UX QA:** verify layout at 1600×1000 and 1280×800, scroll/focus management, Card/Item selection, larger documents, and generated/referenced Cards. Stale-tab writes now fail safely in automated tests; manually exercise Export JSON/reconcile/reload, disconnected-server failures and image uploads before production acceptance.
3. **Acceptance:** inspect final diff for data-loss/security pitfalls, run `npm test`, `npm run build`, `node scripts/smoke-check.mjs`, Pages path audit and real Chromium interactions. Share screenshots and limitations with user.
4. **Release:** only after user review, squash-merge **one M8 PR** into `main`, verify GitHub Pages deployment, delete merged branch, then start a new branch for the next cycle.

**One-time repository housekeeping:** GitHub's **Automatically delete head branches** setting is currently **off**. Enable it at [Settings → General → Pull Requests](https://github.com/teodor-andonov/ta-website-builder-261012/settings). After enabling, remove older already-merged branches via PR #17 and PR #21's **Delete branch** controls. Keep the active M8 branch; the superseded, unmerged PR #19 branch is not part of merged-branch cleanup. See [current branch inventory in the dated log](logs/2026-10-14-m8-structure-editor.md).

**Known separate refinement:** [Issue #22 — minimum useful grid divisions](https://github.com/teodor-andonov/ta-website-builder-261012/issues/22). Test equivalent layouts before reducing row/column counts; do not change composition silently.

See [M8 design details](M8_EDITOR_PLAN.md) for interaction rules, [architecture](ARCHITECTURE.md) for data flow and [latest log](logs/2026-10-14-m8-structure-editor.md) for the detailed record.

## M9–M11 — planned sequence

**M9 Content and sections.** Replace demonstration copy and graphics with approved real projects/posts. Complete services/arrangements: fixed packages, subscription and custom contract; architecture/computation/facades themes; contact and call-to-action; metadata linking assets/credits. Ensure editors can author all required pages without hand-editing HTML.

**M10 Production quality.** Test accessibility with keyboard and screen readers, semantic metadata, SEO, canonical URLs/social previews, image loading and size budgets, failed-write/rollback behavior, JSON backup/restore, form and link behavior, browser/device acceptance. Remove `noindex` only for approved launch content.

**M11 Hosting and launch.** Choose production host/domain and asset strategy after real content volume is understood. GitHub remains code history/CI; deploy generated static output and media to Hostinger or equivalent without requiring a GitHub Pages URL. Verify redirects, backups, update process and ownership.

## Working protocol — mandatory every cycle

1. **Before implementing:** read this plan and the relevant specialist doc; inspect live branch and PR. Identify the current acceptance target.
2. **During the cycle:** commit to the *current stage's feature branch*, never auto-merge intermediate slices merely to publish; preview locally or via CI artifacts.
3. **Before handoff:** run focused tests, complete CI and actual browser interactions where relevant; document limitations and include actual screenshots.
4. **At cycle end:** update the **current status/next actions here**, and create or extend the relevant **dated log** in `docs/logs/` with changed files/PRs, tests and decisions. Documentation changes belong in the **same branch/PR** as code changes.
5. **At milestone release:** user reviews, squash-merge to `main`, verify Actions/Pages, then **delete that merged head branch**. Start a new `feature/<next-stage>` branch from current `main`; avoid accumulating stale heads.
6. **Do not delete unmerged branches by this rule.** Unmerged/superseded experiments must be explicitly reviewed/closed/discarded before branch deletion. Squash merging keeps the combined changes on `main` and the PR record, but not necessarily individual branch-only commits as separate ancestors.

## Historical starting criteria

The original [M0–M3 baseline implementation plan](logs/2026-10-12-foundations.md) is historical: M1 file editing and generated sample project/post pages, M2 reusable templates/queries, and M3 safe image assets have all been implemented. Do not treat them as the current next task.

---

## Post-V1 roadmap — extension after M11 (discussion draft)

> **Ordering decision (2026-10-15):** The original M8–M11 milestones above remain unchanged and take precedence. Complete the existing V1 Content Studio and TA website, including the original M9 content, M10 QA/backups, and M11 hosting/launch, **before** beginning these expansions. Previous conversational proposals that reused M9–M13 are not substitutes for the established roadmap. This is a provisional post-V1 planning addendum, not current implementation status.

### Product decisions agreed for the extension

- **One website = one project folder = one local Studio instance.** Source JSON, real media, editor and build live together. No multi-site manager or hosted account requirement.
- **Shared Card/Item composition model everywhere.** Home, Work and Studio pages and collection-generated project/article pages each own their editable composition. Manually construct Cards and atomic Items; no mandatory presets, third graphical node type, or special editorial-block editor.
- **Isolated authoring by scope.** Edit pages, record compositions, templates and components separately in the Structure/Canvas/Properties editor. Assemble the full page for a separate preview.
- **Templates wrap a unique composition.** Page templates themselves use Cards/Items and reusable component references. For example, the general template may embed a shared navbar, a page-content slot, and the main footer; a Studio template may share the same navbar but use a different footer. Page composition and record composition use the same content-slot principle. Slot count/semantics still to be decided.
- **Navbar, header and footer are components.** Preserve semantic HTML roles and active-navigation behaviour when migrating away from the current hardcoded site frame.
- **Configurable design system per website.** Global visual tokens, reusable named Card/Item styles and *limited* local styling overrides, separate from structural grid properties. TA's appearance is retained through its configuration; other sites may use different fonts, palettes and details.
- **Generic collections and real assets.** Collections define fields and typed records and can optionally generate detail pages; a filtered collection-driven Card controls how records are displayed, not the collection itself. Assets are real media files with metadata. Later permit asset-library queries for image grids without forcing duplicate “Images” collections; specialised image-related collections can reference assets.
- **No parallel Markdown database and no separate rendering engine.** Keep canonical JSON with a small practical number of files if a split becomes useful.

### Candidate post-V1 milestones (provisional order)

| Milestone | Outcome | Acceptance direction |
| --- | --- | --- |
| **M12 — Unified page and template system** | All standalone pages and collection detail pages use the same composition-in-template mechanism; header/navbar/footer are reusable components | Home, Work and Studio use independently editable compositions with shared or different templates; isolated editing and full-page preview |
| **M13 — Reusable site design system** | Project-level tokens, named Card/Item styles, limited overrides; migrate TA-specific renderer assumptions | TA's visual output remains stable; a differently styled second site builds with the same engine |
| **M14 — Record-specific compositions** | Optional Card/Item composition on each project, article and other eligible record; shared detail-page templates supply the slot | Two records share one template but have distinct editable content trees |
| **M15 — Generic collections and asset queries** | More flexible collection schema/editor and filtered Card feeds; media metadata, asset filters/queries where needed | A newly defined collection and an image feed are authored without renderer edits |
| **M16 — Studio usability and maintainability** | Refine manual Card/Item editing, isolated scope workflow and sensible modularisation | Complex real-world documents remain easy to edit, validate and save |
| **M17 — Reusable starter and regression QA** | Document one-site-per-folder reuse and verify the extended builder against the TA site plus a second site | Both sites author/build independently; project files remain portable |

### Decisions still open

1. Whether V2 templates expose one required **main composition slot** or support multiple named content slots from the start.
2. Whether every record in a collection can optionally have a dedicated page, and how collection-default templates versus per-record template choices are presented.
3. Exact V2 scope of asset querying, image grouping, SVG import and asset/collection editing UX.

Do not pull this discussion-draft work into M8–M11 unless explicitly agreed as a prerequisite for the original V1 launch. Refine the addendum as remaining product questions are answered.
