# TA / Content Studio

A JSON-first visual editor and static website system for the TA architecture, computation and research practice.

## Current state

**Prototype 02 is runnable; production publishing is not implemented yet.**

Open [`prototype-v2/index.html`](prototype-v2/index.html) in a browser. It is a self-contained HTML/CSS/JavaScript prototype; no installation or build step is needed for this preview.

Features already demonstrated in the prototype:
- Pages and recursive Card / Object compositions
- Collections and editable record tables
- Projects and Posts (Note, News, Article)
- Editable templates and reusable components
- Image metadata and collection feeds
- JSON import/export and browser-local autosave

The browser preview is **not** the deployed website. It currently saves changes in localStorage rather than modifying repository JSON files.

## Direction

Build a file-first system in which structured JSON is the **single source of truth** for pages, projects, posts, assets, templates, components and settings. Keep content in a small number of logical JSON files, and media as separate files.

The same composition/template rules should drive both editor previews and generated public pages. Preserve the existing editor instead of replacing it with a generic CMS.

## Start here

1. Open `prototype-v2/index.html`.
2. Read [`AGENTS.md`](AGENTS.md) for project constraints.
3. Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).
4. Implement the first real file-backed edit / reload / build loop.

## Milestone 1

Edit a sample Post → save to an actual JSON file → reload without losing the change → see the result in preview → generate a working `/posts/<slug>/index.html` page. Do the same for a Project at `/work/<slug>/`.

Repository initialized 12 October 2026 from the existing TA Content Studio Prototype 02. Sample content is demonstration data, not public factual copy.
