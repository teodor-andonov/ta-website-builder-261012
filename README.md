# TA / Content Studio

A local-first, JSON-driven visual editor and static website generator for the TA architecture, computation and design practice.

**For current progress, implementation history and what to do next, start with [the living implementation plan](docs/IMPLEMENTATION_PLAN.md).** This README is a setup guide, not a second roadmap.

## Quick start (Node.js 20+)

No `npm install` or third-party package install is required.

| Purpose | VS Code NPM SCRIPTS / command | Open |
| --- | --- | --- |
| **Edit** JSON pages, projects, posts, Cards and Items | `npm run dev` | http://127.0.0.1:5173/ |
| **Preview** the generated public website locally, **without publishing** | `npm run preview` | http://127.0.0.1:4173/ |
| Build static output | `npm run build` | `dist/` |
| Automated checks | `npm test` and `node scripts/smoke-check.mjs` | Terminal / CI |

You can launch **dev** and **preview** using the Play buttons in VS Code's **Explorer → NPM SCRIPTS** view if you prefer no terminal commands. Refresh the editor after local reload. **Preview builds on startup**, so restart it after editing data to rebuild the public pages.

The local editor loads and atomically writes **`content/site.json`** via a loopback-only Node API. Binary image uploads are stored in `assets/uploads/` and referenced by JSON metadata. Multiple editor tabs are not yet a safe concurrent editing workflow; keep commits/backups as checkpoints.

## Published demonstration

Merges to `main` trigger the GitHub Pages Actions build for the **public static output only**:

https://teodor-andonov.github.io/ta-website-builder-261012/

This is a live **demonstration/staging website**, not a production launch. Portfolio content and images are provisional and generated pages deliberately retain `noindex, nofollow` until approved.

- The published site does **not** include the Content Studio editor, writable server, or source JSON authoring interface.
- On GitHub Pages the build uses `TA_BASE_PATH=/ta-website-builder-261012/`; for a root-hosted production website, use the normal root-path build.
- To audit a Pages build locally: `TA_BASE_PATH=/ta-website-builder-261012/ npm run build` then `TA_BASE_PATH=/ta-website-builder-261012/ node scripts/check-pages-dist.mjs`.
- Future production hosting (e.g. Hostinger), genuine content, SEO and backups are tracked in the [implementation plan](docs/IMPLEMENTATION_PLAN.md), not yet approved or launched.

## What the system does

- **Canonical source:** JSON in `content/site.json` (pages, collection records, templates, components, assets and site metadata). No parallel Markdown content database.
- **Reusable renderer:** `src/render.mjs` is used for both Content Studio previews and generated public HTML; parity tests protect consistency.
- **Page composition:** Page/Nav/Main/Footer and authored sections are recursive **Cards** (equal CSS grids); their direct children are Cards or atomic **Items**, each with a stable ID and explicit grid rectangle. No artificial graphical Block wrappers.
- **Print-like scaling:** layout tracks, typography, padding, gap and outlines scale with page width, with **no adaptive column rearrangement** on mobile. The website uses only grayscale; the Content Studio UI can use its single blue selection accent.
- **Collections:** bespoke Home/Work/Journal pages, reusable project/post templates, Posts in Note/News/Article formats, generated detail routes and filtered project/post Cards.
- **Local authoring:** the Studio (desktop only) edits JSON through a restricted local API. Its M8 improvements are being developed in one long-running feature branch; published pages update only when the whole stage is reviewed and merged.

## Repository map

| Path | Purpose |
| --- | --- |
| `studio/index.html` | Local desktop Content Studio editor |
| `content/site.json` | Current canonical source of all content/composition |
| `src/server.mjs` | Loopback-only `GET/PUT /api/data` and validated media API |
| `src/model.mjs` | Shared structural and route validation |
| `src/render.mjs` | Shared browser/Node Card, Item, template and page renderer |
| `src/build.mjs` | Static site builder (`dist/`) |
| `src/public.css` | Grayscale, page-scaled public design system |
| `assets/demo/` | Demonstration SVGs, not approved portfolio images |
| `assets/uploads/` | Locally uploaded image files (as available) |
| `prototype-v2/index.html` | Archived self-contained original editor prototype |
| `docs/IMPLEMENTATION_PLAN.md` | **Living status, roadmap, acceptance and next actions** |
| `docs/logs/` | Dated implementation history (updated each cycle) |
| `docs/ARCHITECTURE.md` | Current architecture and boundaries |
| `AGENTS.md` | Non-negotiable agent workflow and design constraints |
| `.github/workflows/` | CI, design screenshots and Pages deployment |

## Development workflow

Use one **`feature/<stage>`** branch for a coherent stage, with incremental commits and draft PR checks. Preview locally or with CI artifacts **without merging intermediate work**. Update the [living plan](docs/IMPLEMENTATION_PLAN.md) and [dated log](docs/logs/README.md) after each development run. Once the feature is accepted: squash merge to `main`, verify deployment, **delete the merged head branch**, and start a new branch for the next stage.

For M8's structure-first tree editing and grid-area picker, see [`docs/M8_EDITOR_PLAN.md`](docs/M8_EDITOR_PLAN.md). The active draft [PR #23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23) is **not** ready to merge. Keep the public site on the stable `main` version until M8 sign-off.
