# TA Content Studio — agent guidance

## Product and source of truth
- This is **one** local, file-first Content Studio and **one** TA public website. The canonical authoring data is JSON, currently `content/site.json`; media are real files in `assets/`. **Do not add a second CMS, parallel Markdown content, or another demo site.**
- **Core flow:** JSON + assets → shared Card/Item renderer → `npm run build` → `dist/`. `npm run preview` serves the built website at http://127.0.0.1:4173/; `npm run package:site` optionally produces `release/website.zip` for transfer to another static host. Local authoring: `npm run dev` at http://127.0.0.1:5173/.
- Use the current `docs/IMPLEMENTATION_PLAN.md` as the **single living roadmap**, `docs/POST_V1_ARCHITECTURE.md` as the V2 architecture, and `docs/logs/` as dated historical records. Read the current roadmap and check the actual branch before working.
- Preserve recursive Cards (grid/layout/padding/gaps/rounding), atomic Items (text, image, button, rich content, dividers), editable records, references/queries, shared preview/public rendering, stable IDs/slugs and typed file-backed authoring. Avoid unnecessary rewrites, responsive reflow of the print-style website, hosted services or framework dependencies.

## GitHub and publishing — user decision 2026-10-15
- **GitHub is source control and the CURRENT website publishing host**, not a testing service or separate staging environment. `main` publishes to GitHub Pages using **one minimal Pages workflow**; no CI test pipelines or ZIP artifact uploads. **Do not require GitHub to run local tests, preview or build.**
- Pages and local `dist/` are **normally public/indexable** (`index, follow`); placeholder content is permitted by the user and **does not block builds or ZIP exports**. There is no `noindex` release gate. An optional `TA_PUBLIC_ORIGIN` may create canonical/sitemap information when moving to a verified root domain later.
- Authoring, builds and previews work without external hosting or GitHub. Running `npm run preview` locally doesn't need internet; remote Google Fonts may fall back to installed/system monospace when offline. Do not assume double-clicking `dist/index.html` works because site links are root-relative.
- **V1** [PR #23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23) was squash-merged at `7d5b44556c5bd237b9b8a06bec2322f842b13a00`; keep the V1 branch. **V2** uses one rolling branch `feature/v2-unified-studio`, [PR #24](https://github.com/teodor-andonov/ta-website-builder-261012/pull/24), across M12–M17, with **one final squash** on completion. No intermediate merge or branch deletion.
- User defers real portfolio material, contact booking, Hostinger/domain move and manual QA until **after V2**. Do not fabricate these, but also do not block software development or normal Pages publishing on them. GitHub Pages currently remains the publishing destination.
- **Automations stay paused**. Work only when asked. No screenshots unless the user explicitly reauthorises them.

## Local development and tests
- Default commands: `npm run dev`, `npm run build`, `npm run preview`, optional `npm run package:site`, `npm test`.
- Browser/interaction tests: `npm run test:browser` (local Chrome/Chromium, `CHROME` if auto-detection fails). Use no screenshots.
- Preserve validation, transactional saves, optimistic concurrency, safe image uploads, backup/restore and security tests. Advanced utilities remain available directly in `scripts/` but are **not separate GitHub workflows**. Keep generated `dist/`, `release/` and `backups/` untracked.
- The Content Studio editor is desktop-only. Public pages retain the fixed print/presentation grid, not adaptive mobile reflow. Reference test viewports: 1280×800 and 1600×1000.
- After substantial commits, update the single living roadmap and one dated development log. Clearly distinguish verified results from tests that could not be run.
