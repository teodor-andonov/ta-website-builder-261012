# TA / Content Studio

A small, JSON-first website editor and static-site builder for the TA architecture / computation / design practice.

## Start (Node.js 20+)

No packages to install:

```sh
npm run dev
```

Open **http://127.0.0.1:5173/**. The preserved visual editor is now wired to a local file API. Edit a record, page, template or component and the editor saves the complete model to **`content/site.json`**. Refresh to verify persistence.

Generate public pages:

```sh
npm run build
```

Generated HTML, CSS and demo SVG assets appear in **`dist/`**, including:

- `dist/posts/designing-with-code/index.html`
- `dist/work/balkan-house/index.html`

For a local static preview, serve the `dist/` directory at the root of an HTTP server, e.g. `python3 -m http.server 8080 --directory dist`, then open `http://127.0.0.1:8080/posts/designing-with-code/`.

Run checks:

```sh
npm test
node scripts/smoke-check.mjs
```

## Layout

| Path | Purpose |
|---|---|
| `prototype-v2/index.html` | Preserved original, browser-local prototype |
| `studio/index.html` | Working local file-backed editor |
| `content/site.json` | All editable structured content (one JSON file for now) |
| `src/server.mjs` | Loopback-only Node server, GET/PUT `/api/data` |
| `src/model.mjs` | Structural validation for edits/builds |
| `src/render.mjs` | Static block/page renderer |
| `src/build.mjs` | Static HTML generator |
| `assets/demo/*.svg` | Demo asset files, not production artwork |
| `dist/` | Generated output (not versioned) |

## Current scope / limitations

- Browser editing is **local-only**. The writable server intentionally binds to `127.0.0.1`; it is **never** deployed with the static site. No logins or cloud storage required.
- The editor's existing in-browser preview renderer is preserved; the static renderer implements the same block vocabulary but is a separate module. **Consolidating these into one shared renderer is a priority before production**; preview/output parity is not yet guaranteed for every block or CSS feature.
- This is a prototype, not a production CMS. No live deployment, real content approval, automatic backups, or robust concurrent editing yet. Multiple tabs can overwrite each other's changes. Keep Git commits as checkpoints.
- Export JSON still works. Image imports in the legacy editor may embed image data in JSON; production media ingestion and separate file-backed assets need their own workflow.
- Example source marks all bespoke Pages as Draft, so only non-draft collection records are currently built. The `dist` output includes sample content, not approved portfolio text.
- The local API validates structure/IDs/slugs and atomically replaces the JSON file. It is not a general file manager and does not expose arbitrary filesystem paths.

See `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_PLAN.md` for the long-term direction.