# 2026-10-14 — M8 structure-first authoring

**Stage:** M8 — in progress. **Feature branch:** `feature/m8-advanced-editor`. **PR:** [#23 (draft)](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23). **Not merged/published.**

## Why the direction changed

Direct grid editing overlays on the canvas made selection less clear and added intrusive editing controls. The user preferred a clean preview and **tree-led editing**, while retaining explicit grid positions in Properties. M8 work therefore stays on one longer-lived branch, with just **one reviewed squash merge at the end**.

## Implementation in this cycle

- Removed the prior canvas grid-overlay implementation on the M8 branch (its earlier merged code remains in the `main` baseline until final M8 release).
- Reorganised Content Studio as **Workspace | Document Structure | Canvas | Properties**, with collapsible structure and independent inspector.
- Synchronized Card and Item selection between tree, canvas and properties, including ancestry/breadcrumb navigation, folding and auto-reveal. One shared **Studio-only** blue accent; public site remains grayscale.
- Added structure drag handles for sibling reordering and nesting into ordinary authored Cards, with cycle and illegal-destination prevention, free-cell assignment/row extension and one-step Undo.
- Added a miniature equal-grid area picker for drag-selecting a rectangle and a grouped, validated **Apply all** for X1/Y1/X2/Y2. Both operate on canonical JSON in one valid update.
- Added contextual Add Child/Add Section, authoring labels, keyboard tree navigation. Added pure tree-operation tests and Chromium interaction tests using a temporary JSON copy.

## Validation, status and risks

At the last verified M8 checkpoint: **57/57 automated tests passed**, as did real Chromium selection, expand/collapse, pointer cell-grid interaction, atomic save/rejection, reparent, Undo, screenshot and published-static build checks. See the Actions checks on [PR #23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23) for timestamps and current status; historical green checks do not guarantee a later commit's status.

**Not complete:** multi-step undo/redo, complex Card operations, large-tree performance, accessibility of drag/reparent actions and final user visual acceptance. Remaining acceptance criteria and next steps live exclusively in the [implementation plan](../IMPLEMENTATION_PLAN.md), with detailed editor interaction decisions in [M8 design](../M8_EDITOR_PLAN.md).

**Housekeeping this cycle:** made the implementation plan the delivery-status source of truth; introduced dated logs; updated agent instructions and obsolete starter docs. These documentation changes are staged **on the same M8 feature branch**, so publishing stays unchanged.

## Documentation and branch inventory — housekeeping pass

- Chose a concise, always-current `docs/IMPLEMENTATION_PLAN.md` for progress/acceptance/next steps and dated `docs/logs/` entries as the durable historical record. `AGENTS.md` now requires reading/updating both each development run; technical `docs/M*.md` remain separate specifications.
- Replaced stale pre-M1 planning in `docs/ARCHITECTURE.md` and outdated deployment/quickstart text in `README.md`. Corrected stale overflow wording in `docs/M7_PRINT_GRID.md`. Removed `AGENT_TASK.md` (the original first task was completed in PR #1).
- Closed obsolete, unmerged [PR #19](https://github.com/teodor-andonov/ta-website-builder-261012/pull/19) as superseded by current draft PR #23; its independent minimum-grid refinement is [Issue #22](https://github.com/teodor-andonov/ta-website-builder-261012/issues/22).
- Branch inventory at the start of this pass: `main`; **active/unmerged** `feature/m8-advanced-editor`; **obsolete/unmerged** `feature/m8-grid-canvas` (closed PR #19); **merged but not deleted** `feature/card-item-dom-refactor` (PR #17) and `feature/m8-grid-canvas-controls` (PR #21).
- GitHub's built-in **Automatically delete head branches** is currently **off**. This connected GitHub interface cannot change the repository setting or delete refs directly; the owner must enable it once in **Settings → General → Pull Requests**. The two already-merged branches can be deleted with their PRs' **Delete branch** action. Do **not** delete the unmerged PR #19 branch under a merged-only policy.
- This run updates the **draft M8 branch only**; stable `main` and live Pages are intentionally unchanged pending milestone acceptance.

**Verification:** documentation was checked against the GitHub branch/PR API and actual tree. GitHub's **Validate Content Studio** check completed successfully with **57/57 tests**, and **Design preview screenshots** completed successfully on the housekeeping documentation cycle (2026-10-14). Recheck both workflows on the final PR head after any further changes.

## M8 history and structural-safety cycle — 2026-10-14 (later session)

**Goal:** replace single-step tree Undo with coherent multi-step Undo/Redo and verify everyday destructive/geometry operations before further tree-UI polish.

**Implemented on `feature/m8-advanced-editor`, not on `main`:**
- Added pure bounded `src/editor-history.mjs`, serving only through an explicitly allowed local editor module route. It keeps **up to 40 snapshot transactions per Page/Template/Component scope** and at most 16 recently opened scopes. History lives in memory, so **reloading the browser resets it**.
- Document Structure now exposes **Undo / Redo** and supports **Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z** (plus Ctrl/Cmd+Y) when focus is not in a native input. Keyboard editing fields retain their own native Undo behavior.
- One transaction covers a valid Card/Item property change, atomic four-line grid-area edit, new object insertion, sibling reorder, drag reparent, duplication or deletion. Invalid numeric drafts, selection and no-op actions are not recorded. Undo restores the appropriate selected node and expands hidden parent paths.
- Duplication now searches for a vacant grid area; it only extends rows when necessary and refuses impossible placement, avoiding an invisible duplicate occupying the original Item's exact cell.
- The real-browser test now exercises **two older grid Undos and Redos**, undoing/replaying a previous tree move, making a new edit to invalidate an abandoned Redo path, then **duplicate → undo → redo → delete → undo**. All tests use disposable copies of source JSON; the committed content is unaffected.

**Verification:** latest completed CI on the implementation head before this documentation update: **65/65 unit/integration tests passed**. Chromium confirmed `M8_HISTORY_OK`, `M8_HISTORY_STRUCTURE_OK`, `M8_TREE_AREA_OK` and `M8_STRUCTURE_OK`, and captured a desktop Content Studio screenshot with working Structure/Canvas/Properties. GitHub Pages path checks also passed. Re-run after documentation changes to confirm final PR head checks. [Draft PR #23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23) remains **unmerged**.

**Known limitations / next actions:** in-memory (non-durable) history; no atomic rollback yet when file saving fails; non-tree content records remain outside Card/Item scope history; keyboard-accessible tree reparenting and extensive large-document usability still require work. Continue M8 without publishing early. See the [living implementation plan](../IMPLEMENTATION_PLAN.md).

## M8 keyboard editing cycle — 2026-10-14

The existing long-lived M8 draft branch gained accessible Structure movement without a canvas overlay.

- Implemented pure `moveTreeByIntent` in `src/tree-editor.mjs`, using the same validated tree transformation as mouse dragging. Move intents: up/down sibling order, indent into preceding editable Card, outdent after parent Card. Invalid moves leave JSON unchanged.
- Added Structure toolbar Up, Down, Indent, Outdent actions; unavailable actions are disabled. The selected tree row accepts Alt+ArrowUp/Down/Right/Left. Normal unmodified arrows continue navigating the tree.
- Kept selection and keyboard focus on the moved row, expanding its parent tree path. Each move is one undoable history transaction.
- Extended pure geometry/tree tests and Chromium integration tests for keyboard order, focus preservation, toolbar nesting and Undo. All tests use disposable JSON and leave repository source unchanged.

**Evidence:** 68/68 automated tests, CI build and Chromium screenshot workflow passed on the implementation head before this log edit. Browser output included `M8_KEYBOARD_MOVE_OK`, `M8_HISTORY_OK`, `M8_TREE_AREA_OK` and `M8_STRUCTURE_OK`.

**Remaining:** check with screen readers, stress-test larger trees, improve overlapping-cell feedback and handle save failures/multiple open editor tabs safely. This is draft work on PR #23; main and Pages are unchanged.
