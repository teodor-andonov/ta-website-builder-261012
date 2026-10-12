# TA / Content Studio — Prototype 02

Open `index.html` directly in any modern browser. This is the **preserved runnable baseline**, not a production editor or published website.

## Features
- Dashboard and Pages, with composed nested card/object blocks
- Collections, record schemas, editable tables, record inspectors
- Projects and Posts, including Note / News / Article formats
- Editable shared templates, components and collection query blocks
- Image asset metadata, page previews and inspector controls
- Import and export of the full dataset as JSON

## Persistence warning
Autosave currently uses browser `localStorage` (on this browser/origin). It **does not write files to this repository**. Use Export JSON to make an explicit backup before resetting browser data. The content seed is currently embedded in the standalone HTML. These are limitations to remove in Milestone 1.

## Developer check
Run `node scripts/smoke-check.mjs` from the repository root to parse-check the embedded JavaScript. This is only a source-level smoke test; it does not replace manual browser testing.

Keep this version as a reference while building the file-first studio and website. Do not silently overwrite it during a refactor.
