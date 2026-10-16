# 2026-10-15 — V2 local-first workflow / publishing simplification

**User decision:** GitHub Pages is the **current public publishing destination**, not a separate staging environment. Local `dist/` is the actual website; `npm run preview` runs entirely on the computer and `npm run package:site` optionally emits a locally held ZIP for eventual Hostinger. GitHub should not be needed for building, editing or testing. Real content/contact and manual review are postponed until after V2.

## Completed in V2 branch

- Removed `TA_ENABLE_INDEXING` and the content-approval gate from ordinary publishing. HTML now emits `index, follow` by default, and `robots.txt` allows crawling. Pages can therefore be discoverable even with explicitly approved temporary content; this **does not promise actual Google indexing**. The 404 page retains `noindex` because that page is not content.
- `TA_PUBLIC_ORIGIN` remains **optional**, solely for canonical metadata and sitemap at a future root-domain static host. A GitHub Pages project-subpath build works without it.
- `npm run build` writes the website into `dist/`; `npm run package:site` creates `release/website.zip` from a root-relative build, with no special staging ZIP or GitHub upload. ZIP integrity, private-file exclusion, atomic static output, media checks and backup/restore code remain available locally.
- Deleted the separate `.github/workflows/ci.yml` and `.github/workflows/design-preview.yml` from the V2 branch. Reduced the single remaining `.github/workflows/deploy-pages.yml` to **checkout → Node → build `dist/` using Pages base path → Pages deploy**, triggered from `main`. The required internal Pages deploy artifact is not a user-facing ZIP release and cannot be omitted from GitHub Pages Actions publishing.
- The `npm test` Node suite remains local. Added `npm run test:browser`: detects Chrome/Chromium on Windows/macOS/Linux, runs the local build, real-page DOM check, wheel test and Content Studio browser interaction tests with **no screenshots** and no GitHub Actions dependency.
- Replaced the obsolete V1 staging/noindex assertion script and test with a small public-output smoke test, updated existing local output/media/ZIP/rollback/publishing expectations and dropped redundant top-level npm scripts. Optional advanced diagnostics remain in `scripts/`, callable directly with Node.
- Simplified `AGENTS.md`, the [README](../../README.md), [current roadmap](../IMPLEMENTATION_PLAN.md), and [static host guide](../M11_STATIC_HOST_HANDOFF.md); earlier dated logs are preserved as history.

## Verification / limitations

The connected GitHub repository was edited and the intended files can be read back. This session **does not have a local checkout of the repository**, and the container cannot resolve github.com, so the updated Node and Chromium suites have **not been executed locally in this session**. Do not claim a green local run or resurrect automated GitHub testing just to produce a badge. On the user's checkout, run `npm test`, `npm run build`, `npm run preview`, `npm run test:browser` (with Chrome), and `npm run package:site` to validate this cleanup.

**Important:** Everything here is on V2 `feature/v2-unified-studio` / [PR #24](https://github.com/teodor-andonov/ta-website-builder-261012/pull/24), **not** yet merged. The existing `main` GitHub Pages site and its older Actions configuration remain unchanged until a future approved merge. No production hosting migration, V2 merge or branch deletion occurred.

## Next

Complete the local acceptance checks on a real checkout, correct any failures, then resume M12 slot-based page/template composition. Keep the single V2 branch through M17 and do not reintroduce scheduled GitHub test/ZIP workflows.
