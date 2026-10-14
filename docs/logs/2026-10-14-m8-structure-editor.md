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
