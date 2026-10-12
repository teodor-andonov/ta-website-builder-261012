# Implementation plan and acceptance criteria

## M0 — preserved baseline (this commit)
- Keep the complete standalone Prototype 02 accessible at `prototype-v2/index.html`.
- Capture key constraints in `README.md`, `AGENTS.md` and `docs/ARCHITECTURE.md`.
- Source-level smoke check with `node scripts/smoke-check.mjs`.
- Do not confuse the current browser localStorage with genuine file persistence.

## M1 — first **real** editor → file → website loop
1. Audit schema and update/write paths inside Prototype 02.
2. Introduce small reusable loader / validator / data and rendering modules.
3. Add local file-backed API: load and save real JSON atomically with explicit errors.
4. Preserve current UI, editing controls and JSON import/export while wiring them to file data.
5. Generate `dist/posts/designing-with-code/index.html` and `dist/work/balkan-house/index.html` from the saved records.
6. Ensure a change to a shared template updates multiple generated pages; add automated checks.
7. Write exact start/build/test instructions.

**Mandatory tests**
- Edit a sample Note and verify its JSON file changes on disk.
- Reload app and server; edit still exists and preview matches it.
- Directly load or refresh a generated post and project URL.
- Change a shared template; multiple pages reflect the change without per-page edits.
- Reject invalid JSON or duplicate slugs without data loss.
- Ensure attempted writes outside approved content/media paths fail.
- Confirm record tables, templates, components, assets and visual composition still work.

## M2 — generalize
- Auto-generated pages for arbitrary collection definitions and Post format mappings.
- Query-based galleries and tag filters, responsive layouts, URL handling, draft states.
- Richer Card/Object composition control, design tokens and semantic asset references.

## M3 — production polish
- Better migration/validation, keyboard/accessibility support, SEO/meta, social previews and asset pipeline.
- Deploy static output; keep local authoring API inaccessible on the public site.

**Not first:** a database, online CMS, user accounts, drag-drop editor, PWA, multi-user collaboration or an unnecessary full rewrite.
