# M2 — One shared renderer

## What changed

`src/render.mjs` is now the single implementation used by **both** the content editor and the static website builder. The browser imports it as an ES module from `/src/render.mjs`; `src/build.mjs` imports the same file directly in Node.

The following output is generated through the same functions for both destinations:

- Bound fields and content text, rich text formatting, image assets, links
- Recursive Cards, Components and Queries
- Project and Post templates
- Website shell (header, page content and footer)

`renderPagePreview(data, blocks, context, options)` is the browser/Node shared contract. Static documents wrap it with a document `head`; studio previews insert the returned string into the editor canvas. In editor **Design** mode, `options.design` adds only data attributes and selected-object class names for inspector selection; content and layout come from the shared renderer.

## Serving and local security

The local write server serves the exact `src/render.mjs` module to the browser (GET only) and approved `/assets/demo/*.svg` files. Paths are restricted to exact known locations; no arbitrary directory serving. Static output still copies demo media into `dist/assets`.

## Browser interaction notes

Editor preview query links carry both public `href` and editor navigation attributes. In Studio the click handler cancels browser navigation and opens the record. The preview deliberately hides drafts from query feeds to match the generated website, and site nav only points to published routes.

## QA and limitations

- Node parity tests confirm exact matching preview/site HTML for Project, Post and custom page examples, template propagation, design-only selection markers and basic content escaping.
- Chromium desktop smoke pass at 1600×1000 exercised dashboard, post preview, post edit → JSON disk write, Home page design, node selection; no JS errors. The test browser blocks direct navigation to localhost, so its test harness imports the **unchanged module code** as a data URL and forwards `/api/data` fetches to the real local Node service. Normal OS-browser integration is still to be verified.
- Public website remains mobile-responsive; **editor is desktop-only**.
- Some future improvements remain out of scope: real media upload pipeline, previewing unpublished routes in nav, multi-user editing and production publishing.