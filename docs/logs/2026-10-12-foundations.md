# 2026-10-12 — M0–M4 foundations

**Status:** historical, milestones complete and merged into `main`.

| Stage | Changes | Pull request |
| --- | --- | --- |
| M0 | Preserved the original self-contained visual prototype at `prototype-v2/index.html`. Documented initial file-first JSON/site-builder requirements. | Initial repository |
| M1 | Local Node server, validated atomic `content/site.json` persistence, runnable Studio and static builder generating project/post detail URLs. | [#1](https://github.com/teodor-andonov/ta-website-builder-261012/pull/1) |
| M2 | Shared `src/render.mjs` consumed by Studio and static build; bindings, Cards, queries and templates share a rendering contract. | [#3](https://github.com/teodor-andonov/ta-website-builder-261012/pull/3) |
| M3 | Real image uploads and binaries in `assets/uploads/` plus JSON metadata/validation and public build assets. | [#5](https://github.com/teodor-andonov/ta-website-builder-261012/pull/5) |
| M4 | Working Home, Work, Journal indexes plus project/post routes, navigation, drafts filtering, 404 page and initial public CSS. | [#7](https://github.com/teodor-andonov/ta-website-builder-261012/pull/7) |

**Decisions:** JSON-only canonical authoring; one minimal local API bound to loopback; static publishing distinct from writable editor; physical images stored as files; no framework/database requirement. Demo content remains provisional.

**Evidence:** respective pull requests, milestone files [M1](../M1_STATUS.md), [M2](../M2_SHARED_RENDERER.md), [M3](../M3_IMAGE_ASSETS.md), [M4](../M4_PUBLIC_SITE.md), and automated CI. Historical test counts belong to the original PRs; do not claim current coverage from this log.

**Superseded task:** the former root `AGENT_TASK.md` asked coding agents to implement M1; it was fulfilled in PR #1 and later removed during documentation housekeeping. The [living plan](../IMPLEMENTATION_PLAN.md) now contains the current assignment.
