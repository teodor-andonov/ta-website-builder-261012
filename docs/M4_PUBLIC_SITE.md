# M4 — Publishing the first public-site skeleton

## Delivered

- Home (`/`), Work (`/work/`) and Journal (`/posts/`) are the **existing** JSON-composed pages, changed from Draft to Published. Studio (`/studio/`) stays Draft and does not generate a public page.
- Four existing project and three existing post records generate detail pages, producing 10 routable documents total.
- `site.navigation` is defined in `content/site.json`. Menu items pointing at draft or absent pages are omitted. The current section is marked with `aria-current="page"` (including project/post detail routes). The logo links home; a keyboard-accessible skip link targets main content.
- Shared `src/render.mjs` renders both editor preview and generated pages. The editor passes the selected page/record route to get the same active navigation as the public site.
- Public-only CSS in `src/public.css` establishes consistent page width, typography, card spacing, responsive collection grids and mobile layouts, without redesigning the desktop-only Content Studio UI.
- `dist/404.html` offers a helpful fallback with a return-to-home link. Build output still only contains published pages, asset files and a public stylesheet — not the editor or writable server.

## Quality gates

Run `npm test`, `npm run build`, then serve `dist/` at the root of a local HTTP origin to test URL refreshes. The new `test/public-site.test.mjs` audits all internal links against emitted page routes and checks publish/draft conditions, active menu states, editor/website parity, and physical static output.

Headless Chromium previews at 1600×1000 for Home, Work, Journal and one Post, plus a 390px public homepage, check for JavaScript exceptions, missing demo images and horizontal overflow. Screenshots are shared in ChatGPT rather than versioned.

## Explicit non-goals / launch warning

**Not a publicly deployed website.** The included projects and posts are demonstration records, not independently verified professional portfolio facts. All generated pages are marked `noindex, nofollow` until actual content is approved. SVG artwork is demonstrative. Public URLs and assets currently assume root hosting; a project-subpath deployment requires a base-path solution. SEO beyond page descriptions, public hosting, a real domain, CMS access control and official project details remain for later.