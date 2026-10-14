# M8.1 — Direct grid editing (first editor slice)

## Scope and interaction

The desktop-only Content Studio keeps the exact Card/Item JSON graph and shared public renderer. On selecting an authored Item or nested Card, the inspector displays **Edit area on canvas**. Enable it to reveal the **selected child's parent Card grid** as an overlay; drag across cells to place or resize that child. The preview uses the Card's actual computed grid tracks, padding and gap; it never alters the published DOM or becomes an authored node.

All child areas are 1-indexed, start-inclusive/end-exclusive `{x1,y1,x2,y2}` grid rectangles. The overlay snaps to the nearest grid-cell centre. It rejects positions outside the parent grid or overlapping another child, before saving. Valid placements immediately update the selected node's coordinates, refresh the preview and inspector, and save through the existing localhost API into `content/site.json`. Use **Done** or Escape to exit the overlay; the numeric inspector fields remain an alternative.

A Card's own row/column count still comes from its existing inspector. A later M8 slice can introduce visible grid-track controls, canvas insertion, keyboard nudging, undo/redo, and moving objects between Cards; those are **not yet implemented**.

## Simpler grid compositions

Following user review, the Home Work and Journal sections were reduced from twelve columns to **two**, and the practice section to **three**. Standalone Work and Journal index sections use one column because their children span the full width. Rows were kept where necessary to preserve the print-style ratios and text/image areas. Principle: **choose the fewest equal grid divisions that can express the composition**.

## Safe review

The current PR is kept in draft until the user reviews it. To try it on desktop, fetch and check out `feature/m8-grid-canvas` in VS Code, run the **dev** npm script, open `http://127.0.0.1:5173/`, then choose Pages → Home. Click a heading inside a nested Card, use the inspector's **Edit area on canvas** button, and drag over the grid. Data is saved locally as usual, so work on a copy or commit your current JSON before testing edits. The **preview** npm script serves the generated public site at `http://127.0.0.1:4173/` but doesn't expose authoring controls.

## Verification

Pure geometry tests validate grid bounds, drag rectangles, cell snapping and sibling collision checks. CI syntax-checks the inline Studio ES module. The development-server allowlist serves only the read-only `src/grid-editor.mjs` module. A real Chromium test launches the local Studio against a **temporary copy of site.json**, captures the canvas overlay, drags an Item to a new cell rectangle and checks the saved JSON, then attempts an overlapping drag and confirms rejection. Screenshots and the public 1600px/narrow view are Actions artifacts, not committed.

No GitHub Pages deployment takes place until a reviewed feature is squash-merged into `main`.
