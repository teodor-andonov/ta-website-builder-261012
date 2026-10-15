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

## Post-V1 roadmap — agreed extension after M11

> **Decisions confirmed 2026-10-15.** This extension follows and **does not replace, reorder, or expand the agreed scope of the original M8–M11 roadmap above**. First complete M8 editor acceptance → M9 real TA content → M10 production QA/backups → M11 hosting and V1 launch. Post-V1 work must not block V1. **The TA website is the only required real project; do not build another demo website.**
>
> **Full implementation specification:** [Post-V1 architecture and queries](POST_V1_ARCHITECTURE.md). It owns detailed semantics, not milestone status. Planning resolution is recorded in [2026-10-15 design log](logs/2026-10-15-post-v1-planning.md). All steps below are **planned, not implemented**.

### Agreed product model

- **One site = one folder = one local Studio instance.** JSON and actual media remain file-first and portable.
- **One Card/Item composition system for pages and collection records.** Manual Card/Item authoring only. Components, templates, page compositions and record compositions are edited in isolation, with full-page preview separately.
- **One main composition slot in each page template.** Templates can position reusable Navbar/Header/Footer and other components around a unique root Card. Home and Work can use a General template; Studio can choose a different template sharing its navbar but not necessarily its footer.
- **Configurable site design:** global tokens → named Card/Item style → limited local overrides; grid geometry independent. Preserve TA's current look through migration.
- **Generic typed collections** with optional detail pages; default template by collection, optional override per record. A query Card displays filtered records through a reusable Card component.
- **Assets are queryable** as a built-in source with tags and ordinary typed metadata fields. Initial project association is simple **projectCode equality matching** between asset metadata and the current project record (or reuse the stable record ID if it already serves as the code). No dedicated relationship model for V2; support an array of codes only if the real TA workflow requires multi-project asset queries.
- **Contextual deterministic queries:** match asset `projectCode` = current page `record.projectCode` **AND** tag contains `highlighted`; preserve separate page-record and query-item binding contexts. Validate unique/stable project codes, typed equality/contains, sort/limit and safe code-change handling. No arbitrary code.
- **No second test site or new graphical node kinds.** Test reuse through real TA use cases, schema validation, isolated components and regression checks.

### Executable post-V1 milestone sequence

| Stage | Small delivery slices (proposed) | Acceptance / TA use case | Effort estimate |
| --- | --- | --- | --- |
| **M12 — Unified page and template system** | 12.1 validate one-slot contract; 12.2 page/record assembly; 12.3 componentize Nav/Header/Footer; 12.4 isolated preview + regression migration | Home, Work and Studio choose different/shared templates without duplicating navbar/footer or changing published layout unexpectedly | ~2–4 sessions |
| **M13 — Site design system** | 13.1 design tokens/schema; 13.2 named styles + resolver; 13.3 local overrides; 13.4 Studio Design controls and migration | Edit TA typography, palette, rounding and spacing in Studio; appearance preserved unless explicitly changed | ~2–4 sessions |
| **M14 — Record compositions** | 14.1 validated root Card per record; 14.2 collection default/record template override; 14.3 isolated record composition editor; 14.4 tests on real projects/posts | Two projects share Project Detail template but have completely different editable narratives and media | ~2–4 sessions |
| **M15 — Generic collections and asset queries** | 15.1 typed field/record editor; 15.2 asset projectCode and tag metadata; 15.3 contextual equality/contains queries and rendering; 15.4 TA media integration test | Project Detail automatically displays assets matching the current project code and tagged highlighted; no relationship manager needed | ~3–5 sessions |
| **M16 — Manual authoring quality** | 16.1 fix Card/Item friction discovered in TA content; 16.2 asset metadata and SVG safety; 16.3 module separation; 16.4 resilience/UX acceptance | TA pages and long posts can be authored, changed and saved quickly and safely without layout presets | ~2–4 sessions |
| **M17 — Portable Studio handoff** | 17.1 folder/setup documentation; 17.2 migrations and complete data/media backup; 17.3 static build/release regression; 17.4 end-to-end sign-off | One TA project folder can be copied, restored and built with same engine; no separate demo site | ~1–3 sessions |

Effort is in focused development sessions, **not guaranteed calendar days**. Each milestone gets a coherent feature branch/PR, incremental implementation/tests/screen capture, user acceptance, merge and head-branch cleanup as prescribed above. This is a sequence of small slices that can progress across days or weeks depending on real integration results.

### Next actions and boundaries

1. **Now:** complete remaining M8 structural usability, visual/keyboard QA, save recovery verification and review PR #23. Do not merge until accepted.
2. **Then:** execute unchanged original M9, M10 and M11 toward TA website + Content Studio V1 launch.
3. **After V1:** begin M12; consult [the locked post-V1 specification](POST_V1_ARCHITECTURE.md) at each subsequent milestone. Only implementation-level UI field names/serialization choices remain flexible—not the product decisions above.
4. Do not turn contextual asset queries, formal relationship systems or unified templates into emergency M8 work. The current renderer does **not** yet implement these post-V1 extensions. Formal relationships are explicitly deferred.

