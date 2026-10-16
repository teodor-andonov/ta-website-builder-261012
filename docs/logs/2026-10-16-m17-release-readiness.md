# 2026-10-16 — M17 local V2 release readiness

**Branch:** `feature/v2-unified-studio`, draft [PR #24](https://github.com/teodor-andonov/ta-website-builder-261012/pull/24).  
**State:** Release acceptance **tooling and instructions committed**. Full local verification and user visual signoff **remain pending**. The V1 `main` deployment is unchanged.

## Scope and decisions

No automatic GitHub Actions tests, staging website or production deploy. Build and review the public website *locally* from the V2 checkout. The independent public static ZIP (`release/website.zip`) is not the editable data/media backup; both must be retained. No merge until the user approves final V2 behaviour.

## Implementation

- Added `scripts/release-check.mjs` / `npm run release:check`: from a real local checkout, run all `test/*.test.mjs` with Node, the existing Chromium DOM/Studio/wheel browser suite, SHA-256 snapshot creation and verification, standalone restoration of `content/site.json` plus media, a root-domain noindex build, GitHub Pages subpath build, custom-domain indexable canonical/sitemap build, independently verified noindex and indexable ZIPs, and a final live-file immutability check.
- The audit fingerprints the live `content/site.json` **and every source asset file** before test execution, checks for unexpected changes before backup/package operations, and verifies the original fingerprint again at the end. The indexing switch is changed **only in the restored temporary data**, never `content/site.json` on the source branch. The script uses a temporary working directory for ZIP/build artifacts and outputs a timestamped result to `release/reports/YYMMDD-HHmm_m17-release-audit.json`. Failure is reported by a nonzero exit code. `--no-browser` deliberately reports partial with nonzero exit and cannot imply readiness.
- Added strict `checkOutput()`: inspect the generated HTML bytes for expected robots metadata, link targets, media references, stylesheet prefix, private-file leakage, exact canonical URL per route, and every sitemap `<loc>` for the custom-domain mode. Reject path traversal / protocol-relative URL references. The expected list is calculated by the existing canonical `collectPages()` renderer.
- Added `scripts/release-screenshots.mjs` / `npm run release:visual`: build and serve root-domain content only on `127.0.0.1`, use Chrome/Chromium to capture 5 public page types at desktop and narrow browser widths (10 PNGs total), and write hash/dimensions/route/viewport metadata to `release/review/YYMMDD-HHmm_m17-visual/review-manifest.json`. Human visual inspection remains explicitly pending, even if all captures succeed. Actual dimensions are recorded because Chrome may enforce a minimum viewport width.
- Added `test/m17-release-check.test.mjs` to test route safety, link scanning on root and GitHub Pages base paths, broken/missing media, unexpected private Studio output, both indexing modes, incomplete sitemap detection, and source-media mutation fingerprinting. Linked the new commands in `package.json`.
- Added `docs/M17_RELEASE_ACCEPTANCE.md` with step-by-step verification, independent host ZIP handoff, source data/media recovery and explicit merge/visual approval requirements. Updated README, AGENTS and the single living implementation plan.

## Evidence available *in this session*

The connected GitHub repository was writable, but a real `git ls-remote` in the execution container failed because `github.com` could not resolve. Node 22 and Chromium 144 are installed in this execution environment; however without the actual V2 checkout we **did not** run the full Node tests, actual Chrome Studio/browser interactions, filesystem builds or ZIP checks and did **not** produce actual page screenshots.

The new M17 JavaScript files and the Studio/browser source were syntax-parsed. A focused in-memory simulation combined the **real V2 model/render/deploy-path source** with the newly added `checkOutput()` logic over a simulated file inventory. Three configurations checked successfully for all 10 routes with internal asset paths: root noindex, GitHub Pages project-subpath noindex and indexable custom-domain canonical/sitemap. This is **not** a real static build or independently validated ZIP. M16's earlier 82/82 source-level regression check remains useful supporting evidence, not release approval.

## Outstanding acceptance — do not mark V2 approved yet

1. In a complete local V2 checkout run `npm run release:check` without skips and review its dated JSON report. Fix any real Node/Chromium/restore/build/ZIP regression failures.
2. Run `npm run release:visual`, examine all screenshot PNGs and use `npm run dev` to manually inspect the editor's nested selection, data bindings, Move/undo, image replacement, Field/Design/Preview flows and mobile UI; record signoff.
3. Run `npm run package:site`, validate with `node scripts/verify-site-package.mjs release/website.zip`, and test its extraction on a locally served static host. Verify final intended site-wide search indexing and true hosting origin. Keep `content/site.json` and `assets/` backup independently.
4. Only after these checks and **explicit user approval** may V2 merge to `main`, which currently publishes the live V1 GitHub Pages site. Never treat PR existence or a successful source smoke test as merge approval.
