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
- **Recent evidence:** 57/57 automated tests plus Chromium browser interaction/screenshot checks passed on the M8 branch (2026-10-14). Re-run after each material UI or model change; do not assume old checks cover new features.

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
- Tree drag to reorder sibling nodes or reparent authored Cards/Items, preventing circular nesting and unsupported destinations, with one-step Undo.
- Contextual Add Child/Add Section, duplicate/delete controls, optional authoring labels.
- Compact grid-area picker in Properties, including real pointer selection and a separate **atomic X1/Y1/X2/Y2 Apply all** operation; invalid intermediate coordinates are never persisted.
- Shared JSON renderer and local-only persistence preserved. Browser checks use disposable JSON data.

**Remaining before M8 sign-off**
1. **Structural usability and undo:** verify add/duplicate/delete/nest on complex trees, improve keyboard-accessible reorder/reparent, replace one-level Undo with coherent multi-step undo/redo, handle overlapping grid areas clearly.
2. **Editor UX QA:** verify layout at 1600×1000 and 1280×800, scroll/focus management, Canvas/Card selection, large documents, and generated/referenced Cards.
3. **Acceptance:** inspect final diff for data-loss/security pitfalls, run `npm test`, `npm run build`, `node scripts/smoke-check.mjs`, Pages path audit and real Chromium interactions. Share screenshots and limitations with user.
4. **Release:** only after user review, squash-merge **one M8 PR** into `main`, verify GitHub Pages deployment, delete merged branch, then start a new branch for the next cycle.

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
