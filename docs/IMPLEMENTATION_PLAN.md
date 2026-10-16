# TA Content Studio — living implementation plan

> Updated 2026-10-15 · Source of truth for milestone status. Previous V1 technical history is preserved in [dated development logs](logs/README.md) and Git history. The [V2 architecture](POST_V1_ARCHITECTURE.md) contains the detailed specification.

## Current state

- **Working stage:** **V2 / M12** — unified page, template and component composition. First implementation: opt-in one-main-slot Card templates and root page composition with backward-compatible rendering. Next: use the template in Studio and extract shared Navbar/Header/Footer without duplicate authored content.
- **Branch:** `feature/v2-unified-studio` · [rolling PR #24](https://github.com/teodor-andonov/ta-website-builder-261012/pull/24). One V2 branch for M12–M17; one final squash merge when software milestones pass. `main` remains the V1 release until that merge. V1 [PR #23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23) was merged at `7d5b445`; both original branches are retained.
- **Current handoff before further M12:** The local-first publishing/tooling cleanup is committed. On 2026-10-16 a **single site-wide indexing switch** was added under Studio Overview, backed by `site.publishing.indexing` in canonical JSON; the placeholder TA site currently chooses **Off**. Local `dist/`, Pages builds and ZIPs honor it without content approval gates. **Local Node/browser/build/ZIP checks still need to be run on a checkout**; no GitHub test workflows or remote CI have been reinstated.
- **Publishing:** [GitHub Pages is the current website](https://teodor-andonov.github.io/ta-website-builder-261012/), **not a staging environment**. Builds are generated from JSON + media with `npm run build` → `dist/`. `npm run preview` is a localhost view of the generated site (requires Node, not internet); optional `npm run package:site` writes `release/website.zip` for future Hostinger/other static hosting. `main` Pages publishing is the sole automatic GitHub workflow. Search indexing is controlled separately in Studio; Off does not hide public pages.
- **Important timing:** the publishing cleanup and new indexing switch are committed to the **V2 branch only**. The live `main` Pages website retains V1's noindex output and old workflows until the authorised final V2 merge (or a separately approved hotfix). A local Studio toggle does not deploy by itself.
- **Content:** editable project/post/media placeholders are allowed. Real material, 15-minute booking link, eventual Hostinger/domain migration and manual human QA are deferred until **after V2**. Do not fabricate missing real details and do not impose an approval gate on normal builds.
- **Testing:** `npm test` (Node tests), `npm run test:browser` (local Chrome/Chromium, no screenshots, including the indexing selector), `npm run build` (safe static output), all **independent from GitHub**. Keep versioned backups, validation, optimistic saving, media safety and portable ZIP functionality. The previous hourly automation stays paused.

## Milestone plan

| Stage | Work | Status |
|---|---|---|
| V1 / M0–M11 | File-first Studio, public TA site, editor, content models, local media and static builds | **Merged to main** |
| V2 / M12 | Unified page/template composition: one main slot, independent page root, shared Nav/Header/Footer, isolated page preview/editing | **In progress** |
| M13 | Design tokens, named styles, local overrides and Studio Design controls | Planned |
| M14 | Per-record root Card compositions, collection defaults and record overrides | Planned |
| M15 | Generic typed collections, asset project-code/tag queries and equality/contains filtering | Planned |
| M16 | Real TA authoring quality, metadata/media resilience, code/UI cleanup | Planned |
| M17 | Portable Studio setup, full data/media restoration and final local software acceptance | Planned |

Detailed decisions and acceptance for M12–M17: [POST_V1_ARCHITECTURE.md](POST_V1_ARCHITECTURE.md). Avoid extra relationship systems, alternate site stores, a second demo website or app frameworks.

## Normal commands

```sh
npm run dev           # edit JSON/media using the local Studio
npm run build         # generate static website into dist/
npm run preview       # rebuild and serve dist on localhost:4173
npm run package:site  # optional ZIP into release/website.zip
npm test              # local Node tests
npm run test:browser  # local Chromium/Chrome interaction checks, no screenshots
```

Backups: `npm run backup:create` and `npm run backup:restore -- <snapshot> <new-directory>`. Extra historic/diagnostic scripts remain runnable directly with Node, **not as scheduled GitHub jobs**.

## Working policy

- Preserve JSON as the single authoring source, the shared rendering contract and the nonadaptive print-style public Card/Item grid. Studio remains desktop-focused. Leave `prototype-v2/` historical and untouched.
- Prefer one meaningful, tested step per user-triggered cycle (larger coherent steps are welcome). No new background automation and no automatic screenshots. Verify both indexing states on disposable local data before final acceptance.
- After substantial changes, update this plan and add a dated [log](logs/README.md). Be clear about unrun local tests when the environment cannot execute the repository.
- Keep `main` as current public GitHub Pages site; V2 PR is not a live deployment. Do not merge/delete branches, alter production hosting or require third-party access without the appropriate user instruction.
