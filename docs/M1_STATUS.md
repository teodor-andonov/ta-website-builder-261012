# Milestone 1 — first file-backed publishing loop (draft PR)

**Achieved locally:**
- The original editor UI is preserved; a copy in `studio/index.html` now loads JSON with `GET /api/data` and saves changes with `PUT /api/data`, rather than localStorage.
- One canonical `content/site.json` (7 categories already embedded inside one object); avoid premature JSON-file sharding.
- A local-only Node server validates and atomically saves the content file.
- Static build resolves collection records through shared templates, nested cards, components and queries. It produces 7 non-draft record pages and demo SVGs in `dist/`.
- Tests exercise schema restrictions, template propagation, draft handling and XSS escaping. A manual server integration test verified persisted PUT and rejection without file corruption.

**Important gaps:**
- Editor and public renderer share content shape and CSS, but are still separate implementations. Extract a single universal module and add richer regression parity checks next.
- Browser UI interaction itself has only a script syntax smoke check, not automated end-to-end tests (e.g. Playwright). Test editable tables, templates and nested cards by hand.
- Image upload still relies on embedded image data in the legacy editor. Add secure binary file endpoint and keep JSON as metadata only.
- Local save is single-writer, last-write-wins (no multi-tab conflict protection). Consider ETags or file revision numbers.
- Only published bespoke pages build; currently example pages are all Draft, so navigation links to those pages will be absent in the static output.
- No deployment workflow, favicon/SEO/schema validation depth, fallback pages or media build optimizations.

**Acceptance walkthrough:**
1. `npm run dev` → open local editor and modify the published Post titled “On designing with code.”
2. Confirm `content/site.json` changed. Restart the server and reload: the change remains.
3. `npm run build`; verify `dist/posts/designing-with-code/index.html` includes the new post text.
4. Modify the `project-detail` shared template and rebuild; inspect two or more project HTML files, both should reflect it.
5. Change a record slug to an invalid value; verify API rejects it and keeps previously saved valid JSON.
6. Run `npm test`; all tests should pass before merging.