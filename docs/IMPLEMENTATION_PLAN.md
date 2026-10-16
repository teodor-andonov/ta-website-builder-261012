# TA Content Studio — living implementation plan

> Updated 2026-10-16 · Source of truth for milestone status. Previous V1 technical history is preserved in [dated development logs](logs/README.md) and Git history. The [V2 architecture](POST_V1_ARCHITECTURE.md) contains the detailed specification.

## Current state

- **Working branch: `feature/v3`**, created from V2 squash commit [`e875bd8`](https://github.com/teodor-andonov/ta-website-builder-261012/commit/e875bd8b18a297acbffec3fd35d0ae7bd01f7004), pushed and tracking `origin/feature/v3`. **V3 implementation scope has not yet been agreed; do not invent or automatically start new milestones.**
- **V2 / M12–M17 complete and accepted.** The user reviewed the desktop captures and explicitly approved merging and creating the V3 branch on 2026-10-16. [PR #24](https://github.com/teodor-andonov/ta-website-builder-261012/pull/24) was squash-merged once, using reviewed head `625fbc43e8a00098b5df3b343eb86d39cb28dc8e`. V1 and V2 branches remain preserved.
- **Published:** the [Pages build/deploy](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38959963244) succeeded for the merged V2 commit. The [live Home page](https://teodor-andonov.github.io/ta-website-builder-261012/) returned HTTP 200 with V2 content-height composition tracks and `noindex, nofollow`. `main` now publishes V2, not V1.
- **Acceptance evidence:** 169/169 Node tests and all 11 integrated local release steps passed, including real Chrome Studio/DOM/wheel checks, JSON/media snapshot and restore, root/Pages noindex builds, custom-domain indexing/canonical/sitemap, both ZIP modes, links and source immutability. Five 1440×900 desktop captures were generated, agent-inspected and subsequently approved by the user. The extracted public ZIP served all 10 routes and all local CSS/media; Studio was excluded. [Full local evidence](logs/2026-10-16-m17-local-acceptance.md).
- **Architecture:** all 4 Pages and 8 Project/Post records have independent root compositions under shared one-slot templates; semantic Navbar/Footer components, M13 named styles and inherited overrides, M15 contextual asset galleries and M16 safe authoring are implemented. Canonical source remains JSON + media; Studio preview and static builds share one renderer.
- **Design system:** evolving with the product. Fix issues within current rules directly; discuss gaps or unsuitable rules with the user before changing them, then apply the agreed solution consistently. [Design audit and clarification](logs/2026-10-16-design-system-audit.md).
- **Workflow:** local development, tests and previews; current GitHub remote and minimal Pages workflow remain intact. The user has asked for a recommendation on keeping GitHub versus local-only Git; no removal or replacement of the remote/publishing setup has been requested. No V3 PR or background automation has been created.
- **Deferred:** real portfolio material, booking/contact destination, external hosting/domain transfer and broader manual assistive-technology/device QA. Indexing remains off. V2 approval does not authorise future V3 merges or production-host changes.
- **Next:** agree V3 priorities, then implement on `feature/v3`. [V2 merge/V3 handoff log](logs/2026-10-16-v2-merge-v3-handoff.md).

## Milestone plan

| Stage | Work | Status |
|---|---|---|
| V1 / M0–M11 | File-first Studio, public TA site, editor, content models, local media and static builds | **Merged to main** |
| V2 / M12 | Work + Journal unique compositions and one-slot General template; isolated authoring/full preview; reusable semantic Navbar/Footer, editable navigation and template-specific frame overrides | **Accepted and merged with V2** |
| M13 | Named Card/Item styles, site design tokens, Studio Style library, inherited and local overrides | **Accepted and merged with V2** |
| M14 | Isolated Record Card compositions, collection slot defaults, legacy/slot overrides, optional generated detail pages | **Accepted and merged with V2** |
| M15 | Typed contextual asset queries, code equality + tag contains predicates, AND filtering, Studio gallery editor and Balkan House demo | **Accepted and merged with V2** |
| M16 | Whole-demo composition migration, contextual quick-add, draft-safe duplication, accurate published route count, media-usage protection and parity fixes | **Accepted and merged with V2** |
| M17 | Local release audit automation, snapshot/restore, two indexed ZIP modes, root/Pages build checks and visual screenshots | **Automated acceptance and user visual approval complete; merged** |

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

- **Design-system evolution clarification (2026-10-16):** the system is developed alongside the product, not frozen. Fix problems within existing rules directly. If a problem exposes a gap or flawed rule, explain it and discuss a reusable system-level adjustment with the user; after agreement, implement and document it consistently across affected usages. Consistency and preventing repeat problems are the goal.

- **Design-system review (user instruction, 2026-10-16):** all future changes must stay within the documented M7/V2 design system. Ask the user before implementing any departure or resolving a material design-rule ambiguity. Bug-fix/release/demo-migration permission does not authorise redesign. The release fix changed unconstrained row sizing according to M7's content-height rule; it did not change title text, type sizes, site tokens or authored grid areas. See [design-system audit](logs/2026-10-16-design-system-audit.md) and the binding rule in `AGENTS.md`. V2 merge approval was granted and executed; future design-system changes and V3 merge approval remain separate.

- Preserve JSON as the single authoring source, the shared rendering contract and the nonadaptive print-style public Card/Item grid. Studio remains desktop-focused. Leave `prototype-v2/` historical and untouched. Site defaults and template-specific semantic Navbar/Footer references are canonical JSON: `site.chrome`, `template.chrome`, and Component `frameRole`. `site.navigation` alone supplies dynamic links; do not hardcode secondary navigation copies.
- Prefer one meaningful, reviewed step per user-triggered cycle (larger coherent steps are welcome). Targeted static/in-memory checks are useful interim evidence, but full Node/browser/build/ZIP/visual tests and both indexing states are reserved for final V2 acceptance by user decision. No new background automation and no automatic screenshots.
- After substantial changes, update this plan and add a dated [log](logs/README.md). Be clear about unrun local tests when the environment cannot execute the repository.
- Keep `main` as current public GitHub Pages site; V2 PR is not a live deployment. Do not merge/delete branches, alter production hosting or require third-party access without the appropriate user instruction.
