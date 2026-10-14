# M8.1 — Grid-area editing on the Content Studio canvas

This is the first slice of M8 (advanced visual authoring), after M7 established the print-native Card/Item layout.

## Usage

1. Start `npm run dev` from VS Code (NPM SCRIPTS works; no terminal typing required) and open http://127.0.0.1:5173/.
2. Open a Page, Component, or Template in **Design** mode.
3. Select an Item from the canvas or a Card from the structure inspector.
4. Click **Edit grid** in the editor toolbar. The selected Card's grid becomes visible; when an Item is selected, the overlay appears on its *parent Card*.
5. For a selected Item (or Card child), **click** a cell to move while retaining its cell span, or **drag across cells** to set an exact rectangular area. The change writes back to the canonical JSON, updating the same shared renderer that builds the static website.
6. Use **Undo area** to restore the previous placement or change `x1,y1,x2,y2` numerically in Properties. For a selected Card, clicking an occupied cell selects that Card's direct child.

## Design and limitations

- The overlay is **editor-only**; neither its markup nor `src/grid-editor.mjs` is copied into `dist/`. It is positioned inside the selected Card without adding a new authoring node or a layout wrapper. The published site remains pure Cards and Items.
- Grid positions always use **1-based inclusive start and exclusive end lines**. There are no responsive layout changes: the authoring overlay reads the actual resolved, page-width-scaled equal grid tracks.
- Only explicit children of an authored Card can be moved this way. Generated record Cards from a collection and component references are edited at the **reusable template definition**, not per copy.
- Only **one-level Undo** is included in this first vertical slice. Editing/dragging between parent Cards, keyboard nudging, multi-selection, collision management and persistent history are later M8 improvements.
- The Content Studio editor is desktop-only. The static public website remains responsive only by scaling the fixed print-like composition.

## Verification

`npm test` includes pure geometry and source contract regression tests. GitHub's screenshot workflow runs a real Chromium test with temporary content: select the hero Title, show its eight-row Card grid, drag rows, verify the changed area saved as JSON, and click Undo to restore it. The screenshot artifact `m8-editor-grid.png` shows the actual local Content Studio editor; no test changes are written to the repository's content file.

M7's remaining optional min-grid subdivision cleanup is separate; do not auto-collapse explicit geometry without checking layout equivalence.
