# TA / Content Studio

A small, JSON-first website editor and static-site builder for the TA architecture / computation / design practice.

## Start (Node.js 20+)

No packages to install (desktop-only authoring editor):

```sh
npm run dev
```

Open **http://127.0.0.1:5173/**. The preserved visual editor is now wired to a local file API. Edit a record, page, template or component and the editor saves the complete model to **`content/site.json`**. Refresh to verify persistence.

Generate public pages:

```sh
npm run build
```

Generated HTML, CSS and demo SVG assets appear in **`dist/`**, including:

- `dist/index.html` — Home
- `dist/work/index.html` — Work collection index
- `dist/posts/index.html` — Journal collection index
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
| `src/render.mjs` | **Shared** browser/Node block, template and website renderer |
| `src/build.mjs` | Static HTML generator |
| `assets/demo/*.svg` | Demo asset files, not production artwork |
| `dist/` | Generated output (not versioned) |

## Current scope / limitations

- Browser editing is **local-only**. The writable server intentionally binds to `127.0.0.1`; it is **never** deployed with the static site. No logins or cloud storage required.
- Editor previews and static publishing now import the **same** `src/render.mjs` module. Design mode adds selection hooks without changing the rendered content. Parity tests cover representative Project, Post and bespoke Page output. See `docs/M2_SHARED_RENDERER.md`.
- This is a prototype, not a production CMS. No live deployment, real content approval, automatic backups, or robust concurrent editing yet. Multiple tabs can overwrite each other's changes. Keep Git commits as checkpoints.
- Export JSON still works. Image uploads use real files in `assets/uploads/` with JSON metadata (M3); remember to commit both the JSON and image files when transferring between computers.
- The Home, Work and Journal sample pages now publish; Studio is still Draft. Navigation is defined in `content/site.json` as `site.navigation` and automatically hides draft destinations. **All sample content is placeholder material**, not approved public portfolio copy. Generated pages use a `noindex` meta tag until real copy is approved.
- The local API validates structure/IDs/slugs and atomically replaces the JSON file. It is not a general file manager and does not expose arbitrary filesystem paths.

See `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_PLAN.md` for the long-term direction.

## M4 — public-site skeleton

The three bespoke JSON pages (Home, Work and Journal) are now published alongside the existing Project and Post detail routes. The shared renderer adds JSON-controlled navigation, active-section indication, skip-to-content and direct detail-page links. A public-only stylesheet in `src/public.css` scales layouts for desktop and mobile without changing the desktop-only editor.

All **10 sample pages** and `dist/404.html` are generated with `npm run build`. No hosting/deployment is enabled; internal links assume the website is served from a domain root. If you later use GitHub Pages under a repository subpath, configure a custom domain or add a base-path transform before launch. Sample content is flagged `noindex, nofollow` pending editorial approval. See `docs/M4_PUBLIC_SITE.md`.
## M5 — GitHub Pages staging site

After the repository is made public and **Settings → Pages → Build and deployment → GitHub Actions** is enabled, merges to `main` trigger `.github/workflows/deploy-pages.yml` to build and publish **only `dist/`** to:

https://teodor-andonov.github.io/ta-website-builder-261012/

The editor, local write API, `content/site.json` source and development code are **not** in the deployed site. Root-domain builds remain the default (`npm run build`); GitHub Pages uses `TA_BASE_PATH=/ta-website-builder-261012/` at build time to rewrite root-relative HTML/CSS links. This also allows moving to Hostinger with `TA_BASE_PATH=/` later.

To validate the Pages build locally:

```sh
TA_BASE_PATH=/ta-website-builder-261012/ npm run build
TA_BASE_PATH=/ta-website-builder-261012/ node scripts/check-pages-dist.mjs
```

The generated public pages deliberately retain `noindex, nofollow` because all published sample content and imagery are **unapproved demonstration material**. Public access does not mean official launch. The repository being public makes its complete committed source and history visible.

## M7 — print-native modular composition

The newer design contract deliberately replaces adaptive columns with a fixed, page-width-scaled presentation system. Every Card declares equal divisions (`columns`, `rows`) and positions children in explicit grid rectangles (`area:{x1,y1,x2,y2}`). Page, header, sections and footer follow the Card grammar. Constrain-height toggles use `heightFactor` = height / Card width for proportional printed-board sections, otherwise height follows content. All design measurements use `u = page width / 100`, and the palette is strictly grayscale. See `docs/M7_PRINT_GRID.md`.

This means public mobile pages **do not rearrange** their grids; they scale like a zoomable printed composition. This deliberate choice supersedes earlier responsive-layout roadmap notes. The desktop editor exposes equal grid divisions and child areas.
