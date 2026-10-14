# M8 — Structure-first Content Studio

## Decision (2026-10-14)
The direct-on-canvas grid editing experiment M8.1 was judged overly complex and made Card selection less clear. Restore the previous simple clickable canvas selection, then build editing primarily around an interactive **Document Structure tree**, with a separate Properties inspector. Do not re-introduce permanent grid overlays in the canvas.

**Long-lived branch:** `feature/m8-advanced-editor` is the one working branch for the entire M8 effort. Commit, push, run tests, take local screenshots and preview this branch, but **do not squash-merge into main / auto-deploy until M8 is fully reviewed**.

## Layout
Four desktop regions: (1) existing left Workspace navigation; (2) collapsible/resizable Document Structure panel to its right; (3) largest central Canvas, preview/selection only; (4) Properties on far right. On narrower desktop windows, structure can overlay rather than squeeze the canvas. No new permanent editing chrome in the public website. Separate the saved graphic tree from incidental editor UI.

## Selection
- Use existing renderer's `data-node-id` on **both Card and Item**. Clicking one selects the most specific authorable node; parent Cards can always be selected in the Structure tree (and from a breadcrumb in Properties). Clicking a Card's exposed padding selects the Card.
- Hover: thin outline; active selection: stronger outline. One consistent Content Studio-only accent colour, reusing existing blue `#525cbb`. Same hue for tree selected row, drag destination, buttons/focus; other colours neutral. Outlines do not consume layout space and do not modify public grayscale palette.
- Leave canvas fully usable for judging the graphic layout; avoid overlay/grid fills by default.

## Structure tree editing
- The tree is the canonical JSON Card/Item tree, expandable at arbitrary nesting depth; each row selects the same Card/Item as the canvas, and Properties edits that node.
- Drag before/after siblings to reorder the JSON child array; drag onto a Card to reparent a Card or Item. Cannot drag into an Item, into itself/descendants, or into a source-driven record instance. Prevent cycles and reject invalid geometry.
- Explicit grid areas mean **tree order is not visual position**. Reordering siblings preserves areas (DOM/reading order changes); area editing happens in Properties. On reparenting to a different Card, choose a vacant cell, expanding a row where necessary and keeping a useful size when possible.
- Add a Card/Item at any tree level, duplicate, delete, rename, and add a Card around selected children. Provide clear drag destination indicators and keyboard-accessible up/down move actions.
- Prefer atomic undoable JSON transactions; do not persist half-invalid intermediate states.

## Grid area editing in Properties
- Preferred: a miniature clickable `columns × rows` grid picker. A pointer drag selects an area in one gesture, then applies all four gridline coordinates in a **single validated operation**. Selected occupied cells are highlighted in the studio blue.
- Advanced: four numeric X1/Y1/X2/Y2 fields grouped in one form with one Apply button. Never auto-save individual coordinates before the full rectangle is valid.
- Show current parent Card's grid divisions; row/column changes must validate or explicitly remap existing child areas.

## Suggested implementation sequence within the one branch
1. Restore canvas selection / unify accent; add an independent tree panel and selection breadcrumbs.
2. Drag reorder + reparent nested Cards/Items, with guards, highlights and stable IDs.
3. Mini grid rectangle picker + atomic numeric area editing.
4. Add/duplicate/delete/nest workflows, keyboard navigation and undo/redo.
5. Full browser interaction checks, CI, visual screenshots, accessibility and final review. **Then one squash merge and one public-site deployment.**

## Constraints
JSON remains canonical. Cards only contain Cards and atomic Items, no graphical Block wrappers. Keep the shared renderer, equal grids, page-width-scaled print layout, grayscale public site, component templates/queries, intrinsic padding and optional 20%-opacity outlines. The Content Studio editor is desktop only, the static public website never exposes writable APIs.

## M8 implementation checkpoint (branch-only, 2026-10-14)

Implemented on the long-lived \`feature/m8-advanced-editor\` branch:

- Four desktop regions: Workspace / Document Structure / Canvas / Properties. The Document Structure panel can collapse without altering the authored page.
- Single Studio accent \`#525cbb\`: tree selection, Card/Item hover and active outline, drag target feedback and miniature grid picker. Public website is unchanged and strictly grayscale.
- Expand/collapse the recursive Card/Item tree. Click a Card or Item on the canvas or in the tree; both select the same canonical JSON node. Selection ancestry is shown in Properties. Canvas selection unfolds hidden ancestors automatically.
- Drag a tree row by its handle **before, after or inside** an ordinary Card. Pure \`src/tree-editor.mjs\` rejects self/descendant cycles, invalid containers and illegal root Items. Sibling reordering preserves grid areas; reparenting selects a free cell or extends the receiving Card's rows. One-level structure Undo restores the previous tree.
- Optional structure label per authored node, contextual **Add Child** for ordinary Cards, **Add Section**, plus keyboard Up/Down selection and Left/Right expand/collapse.
- A miniature equal-grid rectangle picker in Properties; drag over cells to apply one valid x1/y1/x2/y2 rectangle. Four numeric fields remain but use **one Apply all action**. The controls no longer save invalid intermediate states.
- Browser tests run against a temporary copy of the JSON, verifying selected Card/Item state, structure panel interactions, picker numeric validation/persistence, real pointer grid selection, tree reparent and Undo. No browser test data changes the repository's content file.

Not yet ready to merge: broader structural actions and multi-selection, richer undo/redo history, drag/drop accessibility refinements, performance on very large trees and user visual acceptance. Keep this branch and PR #23 in **draft**; do not deploy to GitHub Pages until the full M8 review.
