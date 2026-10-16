# TA / Content Studio

Local, file-first JSON website builder and Content Studio for TA architecture, computation and design. **The project works without GitHub, a cloud CMS or a build service.**

## Everyday workflow (Node.js 20+; Node.js 22 recommended for local Chromium tests)

No `npm install` or third-party runtime dependencies required.

| Command | Result |
| --- | --- |
| `npm run dev` | **Edit** in Content Studio at http://127.0.0.1:5173/ |
| `npm run build` | **Build** the entire static website in `dist/` |
| `npm run preview` | **Preview locally** at http://127.0.0.1:4173/ (rebuilds on startup) |
| `npm run package:site` | **Optional ZIP** at `release/website.zip` |
| `npm test` | Run all Node tests **locally** |
| `npm run test:browser` | Run DOM, scrolling and Studio interaction checks in **local Chrome/Chromium**; no screenshots |

`dist/` **is** the website. To preview it, use the local server rather than double-clicking `index.html`, because navigation and asset links are root-relative. Internet access is **not needed for the build or local server**. When offline, the site's Google Fonts request may fail and the browser falls back to an installed monospace font; images and layout remain local.

You can run commands using VS Code's **Explorer → NPM SCRIPTS** play buttons on Windows. The editor writes `content/site.json` through a loopback-only server; uploads live in `assets/uploads/`. Back up your JSON and media files before major structural changes.

## Publishing

**GitHub Pages is the CURRENT public website publisher**, not a separate staging environment:

[View the published TA website](https://teodor-andonov.github.io/ta-website-builder-261012/)

- `main` publishes automatically via the repository's **one** GitHub Pages workflow (build `dist/` with the GitHub Pages project prefix, upload site, deploy).
- **No tests, browser checks, separate staging runs or ZIP archives are uploaded to GitHub Actions.** Test the code on your own PC. GitHub is only version control and the current host.
- **Indexing is a simple site-wide switch**, in **Content Studio → Overview → Website settings → Search indexing**, stored as `site.publishing.indexing` in `content/site.json`. It's currently **Off** while the site has placeholder material. Off adds `noindex, nofollow` to every public page; On adds `index, follow`. Both modes build and export without editorial gates. `noindex` is a request to search engines, not access control.
- The public ZIP exporter rebuilds the same site for a **root directory** (e.g. Hostinger's `public_html/`) and is not automatically uploaded. The ZIP keeps the chosen indexing mode and includes it in the release manifest. `TA_PUBLIC_ORIGIN` is optional for canonical links; a sitemap is emitted only if indexing is On and a verified custom-domain origin is provided. `robots.txt` stays crawlable when indexing is Off so crawlers can read the page-level `noindex` tags. Studio changes must be committed to `main` before the live Pages site reflects them.
- The repository's currently published `main` still has the previous V1 output until the V2 branch is merged. This publishing simplification is being developed in `feature/v2-unified-studio` / [PR #24](https://github.com/teodor-andonov/ta-website-builder-261012/pull/24).

## Project structure

| Location | Purpose |
| --- | --- |
| `content/site.json` | Source of truth: pages, projects, posts, templates, components, assets metadata |
| `assets/` | Real media files referenced from JSON |
| `studio/index.html` | Local desktop Content Studio (not published) |
| `src/model.mjs` | Shared data validation |
| `src/render.mjs` | Shared renderer for Studio previews and public site |
| `src/build.mjs` | Public static build: `dist/` |
| `src/server.mjs` | Local-only authoring API |
| `scripts/` | Local testing, backup and optional ZIP utilities |
| `.github/workflows/deploy-pages.yml` | Only GitHub workflow: publish website from `main` |
| `docs/IMPLEMENTATION_PLAN.md` | [Living V2 roadmap](docs/IMPLEMENTATION_PLAN.md) |
| `docs/POST_V1_ARCHITECTURE.md` | [V2 architecture specification](docs/POST_V1_ARCHITECTURE.md) |

## Optional local utilities

- `npm run backup:create` creates a JSON+media backup; `npm run backup:restore -- <snapshot> <new-target-folder>` restores without overwriting an existing folder.
- `node scripts/content-readiness.mjs` reports missing editorial content; **it does not prevent builds or publishing**.
- `node scripts/media-budget.mjs` checks images; the build performs this automatically.
- `node scripts/verify-site-package.mjs` checks a local ZIP's contents and SHA-256 manifest.
- `node scripts/rehearse-release.mjs` performs an isolated backup/build/restore drill when you want to test recovery.

## Development status

V1 was squash-merged into `main` ([PR #23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23)). All M12–M17 changes stay on **one retained V2 development branch** until the user approves the final squash merge. No background automations or screenshots; real content, booking and future third-party hosting are deferred until after V2. See the [living plan](docs/IMPLEMENTATION_PLAN.md) for actual milestones and progress.
