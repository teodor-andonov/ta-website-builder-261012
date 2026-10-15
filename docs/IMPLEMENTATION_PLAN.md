# TA Content Studio — implementation plan

> **Living index / source of truth for delivery status and upcoming work.**
> Updated: **2026-10-15** · Maintained after each substantive development cycle.
> Change history goes in [dated implementation logs](logs/README.md), while specialist documents describe *how* the system works.
>
> This plan describes the active **rolling V1 development branch** covering M8–M11. The user **pre-authorised the final V1 squash merge on 2026-10-15**, provided the entire M8–M11 acceptance criteria pass. One additional post-V1 squash merge is authorised at the fully verified end of M12–M17. No branch deletion.

## Current position

- **Stage:** **M10 — Production quality, in progress**. M9's real-site content/editor workflows are technically complete with user-approved editable placeholders; genuine media/claims, booking destination, content review and production indexing remain later release gates.
- **Working branch for all V1 M8–M11 development:** `feature/m8-advanced-editor`, [draft PR #23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23). Continue on this same branch, despite its historical M8 name.
- **Deployed baseline:** `main` publishes the M7 site and earlier M8 canvas-grid experiment. The V1 branch backs out that experiment in favour of tree-based authoring; **do not squash merge until M8–M11 meet release acceptance**. The user has already authorised the single phase-end V1 squash merge; no further approval request is required.
- **Local editor:** `npm run dev` → http://127.0.0.1:5173/ ; **local static preview:** `npm run preview` → http://127.0.0.1:4173/.
- **Public demonstration:** https://teodor-andonov.github.io/ta-website-builder-261012/ — placeholder content, deliberately `noindex`, **not** the production launch.
- **Recent evidence:** **98/98 tests passed** and both test/build and screenshot-free Chromium checks were green on implementation commit `e450035b` (2026-10-15). Full public build still emits 10 static pages with path verification; no API/editor leak. M9 uses 4 plain grayscale media SVGs, user-authorized placeholder copy for 7 records/3 published pages, validated simple project codes, in-place asset replacement (IDs and record covers preserved), and an inert booking CTA until configured. The audit now reports **1 actionable configuration blocker + 14 intentional placeholders** rather than treating placeholders as accidental failures. M10 safe JSON+assets snapshot creation/verification and restore-to-new-folder has passed the new test. Recheck the latest docs head after commits.

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
| M8 | Usable structure-first visual editor for Cards/Items | **Technically complete — on rolling V1 draft PR #23, not merged** | [M8 reliability handoff](logs/2026-10-15-m8-recovery-and-m9-start.md) |
| M9 | TA projects/posts and editor-ready placeholder portfolio, services & How We Work | **Functionally complete with intentional placeholders — pending actual production media/copy review** | [M9 placeholder and asset authoring](logs/2026-10-15-m9-placeholders-and-m10-snapshots.md) |
| M10 | Production QA, accessibility, metadata/SEO, performance, backups, acceptance | **Active — safe snapshot and restore groundwork** | [M10 backup/restore](logs/2026-10-15-m9-placeholders-and-m10-snapshots.md) |
| M11 | Production domain/hosting (Hostinger or equivalent), asset deployment, launch/maintenance | Planned | — |

*Milestone numbering evolved: advanced editor moved to M8 after the print-native Card architecture was separated into M7. Historical documents use their original numbering.*

## M8 — technical acceptance complete (2026-10-15)

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
- **Tree identity and component dependency validation (2026-10-15):** reject duplicate Card/Item IDs within authoring scope and direct/indirect component cycles, including query sources. Seven regressions passed; no data migration. [Cycle log](logs/2026-10-15-m8-structure-integrity.md).
- **Large-tree reliability and schema integrity (2026-10-15):** allow/render nested Cards beyond the former silent 10-level cutoff, enforce explicit 32-level authoring/render cap, reject unknown Items and hidden child content in generated/reference Cards, return HTTP 400 model errors without overwriting saved JSON, stress 320-item reparenting and a 320-item real Chromium Studio document. Save checks now wait for actual atomic write completion. CI remains screenshot-free. [Cycle log](logs/2026-10-15-m8-large-tree-qa.md).

**Acceptance and M10 handoff**

1. **Completed:** model validation, comprehensive Structure editor operations, deep-nesting and 320-Item stress, browser selection, keyboard controls, grid edits and history, both desktop widths, data-source and reusable Card selection/definition navigation, invalid JSON rollback, valid whole-file import, corrupt-image handling, optimistic-concurrency conflict recovery and disconnected-server recovery. A confirm-gated **Reload saved file** action safely restores the server's validated snapshot after an Export JSON opportunity. Snapshot history is intentionally memory-only.
2. **CI:** 88/88 Node tests and browser QA passed on implementation commit `3ba5f404`; existing V1 sample build/preview and project-path audit passed. Screenshot generation and uploads remain disabled per user request.
3. **Deferred to M10 production acceptance:** manual screen-reader/device testing beyond tested ARIA focus/roles, broader browsers and real content/media usability, resilience with actual multi-asset collections and recovery drills. These do not block starting M9 but remain release requirements.
4. **Branch:** continue M9, M10 and M11 on the same `feature/m8-advanced-editor` branch and PR #23. Do not merge between milestones; one final squash merge is already authorised only after whole V1 release criteria pass.

**Branch retention decision (2026-10-15):** **Do not delete branches or enable GitHub's automatically-delete-head-branches setting.** This supersedes previous housekeeping advice to remove merged branches. Preserve all heads unless the user explicitly changes the policy.

**Known separate refinement:** [Issue #22 — minimum useful grid divisions](https://github.com/teodor-andonov/ta-website-builder-261012/issues/22). Test equivalent layouts before reducing row/column counts; do not change composition silently.

See [M8 design details](M8_EDITOR_PLAN.md) for interaction rules, [architecture](ARCHITECTURE.md) for data flow and [latest log](logs/2026-10-14-m8-structure-editor.md) for the detailed record.

## M9–M11 — ongoing V1 delivery

**M9 Content and sections.** Replace demonstration copy and graphics with approved real projects/posts. Complete services/arrangements: fixed packages, subscription and custom contract; architecture/computation/facades themes; verified contact and 15-minute-call CTA; metadata linking assets/credits. The existing Home page already contains basic Architecture/Computation/Research and fixed/subscription/custom arrangements; refine real content rather than duplicating those Cards. **Implemented M9 kickoff:** read-only `npm run audit:content`, strict `npm run audit:content -- --strict` for later release gating, CI reporting without interim failure, and editable per-Page/Record approval flag in Studio. Initial inventory found **21 blockers** (demo asset sources, placeholder contact details, missing verified project/post/page approval, demo record covers). Authentic content/permissions must come from actual materials or explicit user decisions; do not fabricate them or prematurely remove `noindex`. Continue implementing safe content authoring while awaiting genuine materials.

**M9 development cycle — homepage + contact flow (2026-10-15).** Updated the existing homepage Card composition in canonical `content/site.json` rather than introducing another site or page type: Architecture/Computation/Facades & Research services copy; fixed packages, subscription and custom contract arrangements; one shared `contact-cta` component on Home and project templates. Added `site.contact.email` and `site.contact.bookingUrl` as optional validated settings, editable in Studio's Overview/Data inspector; the CTA remains **non-clickable** until a valid HTTPS booking URL is configured. Site-wide bindings and validation live in shared renderer/model. Added four contact regression tests and actual Chromium editing/CTA interaction coverage. **No meeting URL, prices, case studies, or factual project approvals have been invented.** The M9 content audit now blocks strict release until contact is configured, retaining 21 flagged issues. [M9 development log](logs/2026-10-15-m9-services-and-contact.md).

**M9 placeholder-authoring completion (2026-10-15).** User explicitly approved temporary content and light/desaturated placeholder fills to unblock the builder. Replaced demo asset sources with four checked-in, inert, grayscale SVG files under `assets/placeholder/`, preserving stable IDs, cover references and all ten existing public routes. Pages, projects, posts and media are flagged `placeholder: true` separately from factual editorial approval; all are editable in the Studio and all production pages remain `noindex`. Project records now expose an optional unique stable `projectCode`, and asset metadata exposes the same scalar matching property without introducing the M15 relationship/query engine. Uploads can **replace an existing media file atomically while retaining asset ID**; server ETag enforcement, MIME checks, source files, upload permission and rejection tests cover this flow. Local Studio exposes placeholder toggles, project code fields, asset searching and bulk table editing. Tests use real browser interaction with no screenshots. Content audit distinguishes **14 deliberately temporary elements** from **1 unconfigured 15-minute booking destination**; strict external production launch remains gated. [Details](logs/2026-10-15-m9-placeholders-and-m10-snapshots.md).

**Remaining real-content tasks (deferred to public-launch readiness, not M9 software work):** replace samples with actual authorized photos/case studies/posts and verified credits; clear placeholder flags only after replacement; confirm contact/booking URL and final external publishing. This is explicitly permitted by the user and does not block implementing M10/M11 as software stages.

**M10 Production quality.** **Active.** Implemented `npm run backup:create`, `backup:verify`, and `backup:restore` for validated snapshots of `content/site.json` and real `assets/`, including SHA-256 manifest and integrity verification. Restore creates an independent new folder rather than overwriting working files. Backup directories are ignored by Git, timestamped and verified by recovery/tamper tests. Remaining: semantic metadata/SEO, safe canonical/social preview strategy for production domain, performance/asset budgets, accessibility with keyboard and screen reader, browser/device QA, failure-recovery acceptance and an explicit external release gate. Keep `noindex` until genuine material is approved.

**M11 Hosting and launch.** Choose production host/domain and asset strategy after real content volume is understood. GitHub remains code history/CI; deploy generated static output and media to Hostinger or equivalent without requiring a GitHub Pages URL. Verify redirects, backups, update process and ownership.

## Working protocol — mandatory every cycle

1. **Before implementing:** read this plan, `AGENTS.md`, relevant specialist docs, current active branch, PR and current CI. Identify the next unfinished acceptance task from actual repo state.
2. **During M8–M11:** use **one continuous V1 development branch** (`feature/m8-advanced-editor`) and its draft PR #23; add incremental commits here. Do not merge between M8, M9, M10 and M11. Do not push directly to `main` or deploy the incomplete site.
3. **Substantial scheduled cycles:** make the scope as large as makes technical sense. Complete **at least one meaningful roadmap substep per run when feasible**, and multiple substeps when coherent and testable. Choose case-by-case; no artificial one-tiny-fix limit. If blocked on user content, credentials or third-party access, handle other safely unblocked agreed work.
4. **Before handoff:** run focused tests, build/smoke/CI and relevant browser interactions whenever tools permit. Record actual failures, pending checks and limitations rather than claiming unverified success; share screenshots for UI changes.
5. **At each cycle end:** update the **current status and next actions here**, and create/extend the relevant dated log in `docs/logs/` with changed files, commits, PRs, test evidence and blockers. Update docs in the same branch as code.
6. **Internal milestone gates and authorised V1 merge:** advance M8 → M9 → M10 → M11 on the same branch without milestone merges. At the fully verified end of M11, with all required CI checks passing and release requirements met, **autonomously squash-merge the current V1 PR to `main` once** using an expected head SHA. This merge is **already authorised by the user** (2026-10-15); do not request the same approval again. Verify the GitHub Pages deployment triggered by `main`. Never fabricate project content, remove safety/SEO safeguards prematurely, supply nonexistent credentials, or represent an external production launch as complete when its prerequisites are missing. Continue other safe work when blocked.
7. **Post-V1:** after the verified V1 merge, create **one** new branch from updated `main` for **all M12–M17**, continuing hourly development to the end of the roadmap. The user has authorised the agent to complete the roadmap **including the one final post-V1 squash merge** once M12–M17 are fully verified and checked, without another routine approval request. Report both merges explicitly; never squash prematurely or more than once per phase.
8. **Never delete branches**, including after squash merges. Keep automatic head-branch deletion disabled. Prior instructions to delete branches after stage merges are superseded by this policy.



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

Effort is in focused development sessions, **not guaranteed calendar days**. M12–M17 share **one retained post-V1 development branch** (created after the verified and already-authorised V1 squash merge), with incremental implementation, tests, screenshots and progress logs across stages. The user has pre-authorised one final squash merge at the verifiably completed end of this phase. No branch deletion. Large or multiple substeps can be completed per development run when coherent.

**Automation policy (2026-10-15):** The earlier 24-run pilot is superseded by a continuing **hourly development automation** that proceeds through the full roadmap while work remains. After verified completion of M17 and the final squash merge, mark the roadmap complete and disable the automation if possible; otherwise later invocations must stop without further changes. Never substitute a time limit for milestone completion.

### Next actions and boundaries

1. **Now:** complete remaining M8 structural usability, visual/keyboard QA and save-recovery verification, record internal acceptance and then proceed directly to M9 on the same V1 branch. Do not merge before whole-V1 user acceptance.
2. **Then:** execute unchanged original M9, M10 and M11 toward TA website + Content Studio V1 launch, keeping all new commits on the same V1 development branch.
3. **After fully checked V1 merge:** create a single new post-V1 branch and begin M12; consult [the locked post-V1 specification](POST_V1_ARCHITECTURE.md) at each subsequent milestone. Continue through M17 and perform the already-authorised final squash merge when the phase is complete. Only implementation-level UI field names/serialization choices remain flexible—not the product decisions above.
4. Do not turn contextual asset queries, formal relationship systems or unified templates into emergency M8 work. The current renderer does **not** yet implement these post-V1 extensions. Formal relationships are explicitly deferred.

