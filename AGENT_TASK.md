# Next coding task — Milestone 1

Read `README.md`, `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_PLAN.md` and run `prototype-v2/index.html` first.

**Implement** (not just propose) the first file-backed authoring / publishing loop:

1. Introduce a minimal local server or file API so editor changes write **real JSON files**, not only localStorage.
2. Load and save the same structured data that powers page previews, with validation and atomic writes.
3. Produce real deployable static URLs by applying collection templates to records: at minimum `/posts/designing-with-code/` and `/work/balkan-house/`.
4. Demonstrate that editing a shared template changes multiple generated records.
5. Keep Pages, tables, record schemas, Posts formats, Templates, Components, image metadata, JSON import/export, and recursive Card/Object editing intact.

Return runnable instructions, tests, known gaps and a concise design explanation. Avoid a wholesale UI rewrite or an unnecessary React/Next/database migration.
