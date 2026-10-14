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

> **Ordering decision (2026-10-15):** The original M8–M11 milestones above remain unchanged and take precedence. Complete the existing V1 Content Studio and TA website, including the original M9 content, M10 QA/backups, and M11 hosting/launch, **before** beginning these expansions. Earlier conversational proposals that reused M9–M13 are not replacements for the original roadmap. This addendum records post-V1 product intent, not current implementation status.

### Decisions agreed for the extension

- **Focus on the actual TA website and freedom to author it effectively.** Improve the reusable system through real TA content and real TA page workflows. **No second demo/test website is required**; reuse is a design property, not a separate project deliverable.
- **One website = one project folder = one local Studio instance.** Source JSON, actual media, local editor and build live together. No central multi-site manager or hosted accounts.
- **One Card/Item composition system everywhere.** Bespoke pages and collection-generated pages each own editable content compositions. Manually construct Cards and atomic Items; do not add mandatory layout presets, a separate editorial-block editor, or a third authored graphic type.
- **Isolated editing by scope.** Edit page compositions, record compositions, templates and components separately through Structure/Canvas/Properties. Preview the full assembled page separately; do not make template context a compulsory editing canvas.
- **One main content slot in each page template.** General and specialist templates are Card/Item compositions, containing component references and a single insertion point for the page's or record's unique root Card. A Home and Work page can share a general template; a Studio page can choose another template, reusing the same navbar with a different footer.
- **Header, navbar and footer are reusable components**, not irrevocably hardcoded site chrome. Maintain semantic HTML roles and current-route navigation states when changing the existing frame renderer.
- **Configurable appearance per website.** Global visual tokens, reusable named Card/Item styles and *limited explicit local overrides*, distinct from grid geometry. Preserve TA appearance during migration. No need to build an additional website to prove this.
- **Generic collections.** Each collection defines typed fields and records. Collection records may optionally have generated detail pages, with a default page template and optional per-record override. Collection-driven Cards filter/sort/render records, but a grid displayed on a page is not itself the collection.
- **Assets are a queryable built-in data source.** Media files remain separate from their JSON metadata. A collection-driven Card can query asset entries by tags, relations and other exposed metadata, without a duplicate Images collection. Other custom collections may also contain asset references.
- **Contextual, typed collection queries.** Within a project record's page template, a Card can draw from the Assets source with **AND** filters such as asset associated with the current project record (e.g. relation to `{{record.id}}`) **and** tag `highlighted`. This is evaluated once per page using the current record context, then the chosen asset Card component is instantiated per match. Use stable record IDs for references rather than project display names or slugs. Support tag arrays and relationship fields with validated operators, not arbitrary evaluated JS or unescaped string templates. This is an extension specification; current source queries support only limited predefined filter strings.
- **No parallel Markdown content store or new rendering engine.** Canonical JSON, optionally split into a few broad files only when useful.

### Candidate post-V1 milestones (provisional order)

| Milestone | Outcome | Acceptance direction |
| --- | --- | --- |
| **M12 — Unified page and template system** | Shared page/record assembly, a single content slot, reusable header/navbar/footer components | Home, Work and Studio can select templates; author compositions independently and preview the assembled results |
| **M13 — Site-wide styles** | Global tokens, named Card/Item styles, limited local overrides and TA renderer decoupling | Real TA pages retain their intended identity; the engine no longer embeds TA-only design constraints |
| **M14 — Record compositions** | Optional unique root Card/Item composition per project, article or other record; collection default template plus record override | Two TA projects share a template but contain independent narrative compositions |
| **M15 — Generic collections and contextual asset queries** | User-defined collections, optional detail pages, type-safe relational filters; Assets as a query source | A project template filters images by current project ID plus `highlighted` tag, using existing Card/Item renderer |
| **M16 — Authoring usability and maintainability** | Streamlined manual placement, nested Structure editing, modularisation, robust file handling | Complex real TA content remains fast and safe to author and maintain |
| **M17 — Reusable Studio handoff** | Documented one-site-per-folder starter/portability, migration and regression coverage | The TA website's own authoring and build workflow remains reliable, with no second site required |

### Remaining design decisions / implementation questions

1. **Asset relationships:** determine whether asset associations can reference multiple records/collections (recommended) or have exactly one primary parent, and how this appears in Assets UI. Avoid making a file-system folder path the canonical relation.
2. **Contextual query details:** decide allowed typed field operators, sort order and count; expose stable record context (`record.id`), and decide how asset query Card templates bind each asset's data.
3. **Record publication defaults:** detail-page creation should be optional; define collection-wide default versus per-record overrides and validate route uniqueness.
4. **Media workflow:** final scope of safe SVG support, alt text, credits and grouping, guided by actual TA website needs.

Do not pull these post-V1 features into M8–M11 unless explicitly agreed as essential to the original V1. Preserve the current main-branch release and the M8 acceptance gate.
