# M17 — local V2 release acceptance

**Current state:** release-check automation is authored; the **full acceptance run and human visual signoff are still pending**. This guide does not itself certify a release. \`main\` continues to publish the existing V1 website. No merge or production upload is part of these commands.

## Why local?

The repository is the source archive and current GitHub Pages publishing host, not a staging environment or a place to run tests. The V2 site must be independently previewable, packed into a ZIP and uploadable to any static host. Run these checks from a full local V2 checkout, with Node 20+ and Chrome/Chromium installed. No npm dependencies are required.

## Acceptance commands

\`\`\`sh
git switch feature/v2-unified-studio
npm run release:check
npm run release:visual
npm run package:site
node scripts/verify-site-package.mjs release/website.zip
npm run preview
\`\`\`

\`npm run release:check\` runs all repository Node regression tests, the existing local Chromium DOM/Studio/wheel suite, verified JSON+media backup and restore, a noindex root build, a GitHub Pages subpath build, an indexable custom-domain build with canonical URLs/sitemap, and separately verifies both static ZIP packages against their SHA-256 manifests. It uses **temporary restored data** to test indexing, never changes \`content/site.json\`, and never deploys or merges. A dated JSON audit report is written under \`release/reports/YYMMDD-HHmm_m17-release-audit.json\`.

A browserless diagnostic is possible with \`node scripts/release-check.mjs --no-browser\`, but it exits with a nonzero status and reports **partial**, not release-ready. Node, browser and build failures also fail the release audit. Check its JSON report for the failing step and output.

\`npm run release:visual\` builds a local public site and captures **10 actual Chromium PNGs**: Home, Work, Journal, Balkan House and a Post at desktop and narrow widths. It writes the images and a hash/dimension manifest under \`release/review/YYMMDD-HHmm_m17-visual/\`. The manifest explicitly says **PENDING HUMAN INSPECTION**; screenshots do not self-certify visual quality.

\`npm run package:site\` creates \`release/website.zip\` (root-domain static paths). The verifier independently checks ZIP headers, compressed bytes, CRC, SHA-256, manifest inventory, missing/private files, robots/indexing metadata and sitemap agreement. The archive contains the **public website only**, never Studio, JSON, logs, unpublished drafts or project source. Upload/extract the ZIP to the **document root** of a static host such as Hostinger; it is not a deploy button. \`npm run preview\` serves the built public site locally on loopback.

For future custom domains, set \`site.publishing.indexing=true\` only when ready, and provide \`TA_PUBLIC_ORIGIN=https://your-domain.example\` with a real public HTTPS origin when building/package-checking for that domain. Indexing **off** uses a noindex meta tag. It does not protect/private the published site. The audit deliberately uses the test-only \`https://ta-studio.com\` canonical origin in temporary restored fixtures; it must not become a default production domain.

## Backup and independent restore

\`\`\`sh
npm run backup:create
node scripts/site-snapshot.mjs verify <snapshot-folder>
npm run backup:restore -- <snapshot-folder> <new-empty-folder>
\`\`\`

Keep the snapshot **outside** the public ZIP. It contains editable \`content/site.json\` and all local image files under \`assets/\`, protected by a SHA-256 file manifest. Restore always creates a **new directory** and refuses to overwrite a live site. Point \`TA_DATA_ROOT\` to the restored folder to validate/build it. A usable source backup and a public static ZIP solve different problems—retain both.

## Human release signoff

- Review the desktop/narrow screenshots for Card nesting, text overflow, Image crop, gallery layout, navigation, typography, contrast, and project/post detail pages. In the Studio at \`npm run dev\`, also review the draft Studio Page, Card drag/reorder, resize/grid picking, selection hierarchy, undo/redo, asset replacement, record Fields vs Design vs Preview, and filter changes. These are not all judged by screenshots.
- Confirm the currently generated 10 public routes, omission of draft Studio and Post, route/link integrity, no missing media, no silent deletion of referenced assets, and complete restore of data plus uploaded media. Test the intended indexing setting, not only the temporary test fixture.
- Confirm that an offline extracted ZIP opens correctly when **served** by a static server. Direct \`file://\` browsing may behave differently; use \`npm run preview\` or a local static server.
- Agree on final domain/hosting and whether indexing should remain off before publishing.
- **Obtain explicit approval before merging V2 into \`main\`.** That merge changes the live GitHub Pages site. Do not auto-merge or enable new CI/staging/deploy workflows.

## Acceptance state tracking

| Check | Current status |
|---|---|
| V2 source architecture, 4 composed Pages, 8 composed Records, 10 rendered routes | Implemented; focused source checks previously passed |
| Local Node unit/regression suite | **Pending actual local execution** |
| Chromium DOM/Studio/wheel browser tests | **Pending actual local execution** |
| Root / GitHub Pages / indexable static builds | **Pending actual local execution** |
| Restored JSON + media snapshot and ZIP verification | **Pending actual local execution** |
| Desktop and narrow visual screenshots and human review | **Pending** |
| Release ZIP handoff and independent hosting review | **Pending** |
| User approval to merge to \`main\` | **Not granted** |

The integrated toolchain is committed so these can be run in a local checkout. Do not mark M17 accepted just because source checks or the release script's own syntax pass.
