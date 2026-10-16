# M17 — local V2 release acceptance

**Current state (2026-10-16):** the **full local automated acceptance run passed** (169/169 Node tests plus Chrome, restore/build/ZIP checks). Five desktop captures are ready; **human visual signoff and explicit merge approval remain pending**. See [the acceptance log](logs/2026-10-16-m17-local-acceptance.md). This guide does not itself certify a release. `main` continues to publish the existing V1 website. No merge or production upload is part of these commands.

## Why local?

The repository is the source archive and current GitHub Pages publishing host, not a staging environment or a place to run tests. The V2 site must be independently previewable, packed into a ZIP and uploadable to any static host. Run these checks from a full local V2 checkout, with Node 20+ and Chrome/Chromium installed. No npm dependencies are required.

## Acceptance commands

```sh
git switch feature/v2-unified-studio
npm run release:check
npm run release:visual
npm run package:site
node scripts/verify-site-package.mjs release/website.zip
npm run preview
```

`npm run release:check` runs all repository Node regression tests, the existing local Chromium DOM/Studio/wheel suite, verified JSON+media backup and restore, a noindex root build, a GitHub Pages subpath build, an indexable custom-domain build with canonical URLs/sitemap, and separately verifies both static ZIP packages against their SHA-256 manifests. It fingerprints **all source assets and the live JSON before testing** and rejects unexpected modifications. It uses **temporary restored data** to test indexing, never deliberately changes live `content/site.json` or media, and never deploys or merges. A dated JSON audit report is written under `release/reports/YYMMDD-HHmm_m17-release-audit.json`.

A browserless diagnostic is possible with `node scripts/release-check.mjs --no-browser`, but it exits with a nonzero status and reports **partial**, not release-ready. Node, browser and build failures also fail the release audit. Check its JSON report for the failing step and output.

`npm run release:visual` builds a local public site and captures **five desktop-only Chromium PNGs** at 1440×900: Home, Work, Journal, Balkan House and a Post. Narrow/mobile screenshots are **not required for V2 visual signoff**; the public layout is intended to retain the same Card/Item composition with proportional scaling at smaller widths. It writes the images and a hash/dimension manifest under `release/review/YYMMDD-HHmm_m17-visual/`. The manifest explicitly says **PENDING HUMAN INSPECTION**; screenshots do not self-certify visual quality.

`npm run package:site` creates `release/website.zip` (root-domain static paths). The verifier independently checks ZIP headers, compressed bytes, CRC, SHA-256, manifest inventory, missing/private files, robots/indexing metadata and sitemap agreement. The archive contains the **public website only**, never Studio, JSON, logs, unpublished drafts or project source. Upload/extract the ZIP to the **document root** of a static host such as Hostinger; it is not a deploy button. `npm run preview` serves the built public site locally on loopback.

For future custom domains, set `site.publishing.indexing=true` only when ready, and provide `TA_PUBLIC_ORIGIN=https://your-real-domain.com` with a real public HTTPS origin when building/package-checking for that domain. Indexing **off** uses a noindex meta tag. It does not protect/private the published site. The audit deliberately uses the test-only `https://ta-studio.com` canonical origin in temporary restored fixtures; it must not become a default production domain.

## Backup and independent restore

```sh
npm run backup:create
node scripts/site-snapshot.mjs verify <snapshot-folder>
npm run backup:restore -- <snapshot-folder> <new-empty-folder>
```

Keep the snapshot **outside** the public ZIP. It contains editable `content/site.json` and all local image files under `assets/`, protected by a SHA-256 file manifest. Restore always creates a **new directory** and refuses to overwrite a live site. Point `TA_DATA_ROOT` to the restored folder to validate/build it. A usable source backup and a public static ZIP solve different problems—retain both.

## Human release signoff

- Review the five desktop screenshots for Card nesting, text overflow, Image crop, gallery layout, navigation, typography, contrast, and project/post detail pages. No separate narrow/mobile visual review is required for V2; proportional downscaling is the intended behaviour, not a new mobile layout. In the Studio at `npm run dev`, also review the draft Studio Page, Card drag/reorder, resize/grid picking, selection hierarchy, undo/redo, asset replacement, record Fields vs Design vs Preview, and filter changes. These are not all judged by screenshots.
- Confirm the currently generated 10 public routes, omission of draft Studio and Post, route/link integrity, no missing media, no silent deletion of referenced assets, and complete restore of data plus uploaded media. Test the intended indexing setting, not only the temporary test fixture.
- Confirm that an offline extracted ZIP opens correctly when **served** by a static server. Direct `file://` browsing may behave differently; use `npm run preview` or a local static server.
- Agree on final domain/hosting and whether indexing should remain off before publishing.
- **Obtain explicit approval before merging V2 into `main`.** That merge changes the live GitHub Pages site. Do not auto-merge or enable new CI/staging/deploy workflows.

## Acceptance state tracking

| Check | Current status |
|---|---|
| V2 source architecture, 4 composed Pages, 8 composed Records, 10 rendered routes | Implemented; real local full audit passed |
| Local Node unit/regression suite | **Passed locally, 2026-10-16** |
| Chromium DOM/Studio/wheel browser tests | **Passed locally, 2026-10-16** |
| Root / GitHub Pages / indexable static builds | **Passed locally, 2026-10-16** |
| Restored JSON + media snapshot and ZIP verification | **Passed locally, 2026-10-16** |
| Five desktop screenshots and human visual review | **Captured and agent-inspected; user review pending** |
| Release ZIP handoff and independent hosting review | **ZIP verified, extracted and served locally; external hosting deferred** |
| User approval to merge to `main` | **Not granted** |

The integrated toolchain is committed so these can be run in a local checkout. Do not mark M17 accepted just because source checks or the release script's own syntax pass.
