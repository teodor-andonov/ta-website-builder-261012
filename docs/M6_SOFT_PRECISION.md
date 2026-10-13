# M6 — Soft Precision / Integrated Identity

## Design decision
Homepage is an **integrated identity** rather than portfolio-first or services-first. It connects architecture, computation, research, work, working arrangements and the Journal.

## Foundations
- TA's **Soft Precision 03**: mineral light background, near-black text, restrained greys, repeatable radii and typographic rhythm.
- Geist Mono first, with sensible mono fallbacks. Google Fonts CDN is an optional prototype dependency; do not commit or distribute font binaries.
- Shared `src/public.css` design language is loaded into desktop Studio previews and concatenated into public site `dist/site.css`.
- Maximum public page width 1600px; responsive composition using CSS container queries. The editor itself remains desktop-only.
- A small token set controls ink, muted text, paper, soft surfaces, dark surfaces, radii, font and max width.

## How the page is authored
`content/site.json` still holds the canonical custom Home page. Its `blocks` are nested Cards, atomic Objects, collection Queries and Buttons. Optional `variant` strings on a block yield safe `variant-*` classes from the single `src/render.mjs` renderer. Variants are semantic hooks for consistent layout treatments, **not** free-form CSS injection or arbitrary new payload types. Existing projects, posts, templates and collections are preserved.

Homepage order:
1. Hero — identity plus existing soft-field graphic
2. Introductory principle
3. Selected work (data-driven)
4. Three areas: Architecture, Computation, Research
5. Ways of working — fixed packages, subscription and custom arrangements (**under exploration**, not confirmed commercial packages)
6. Journal (data-driven)
7. Closing archive link

## Limits / next work
These remain **draft wording and sample imagery**, deliberately marked noindex. Pricing, contact email, licensed branded font assets, bespoke image-generation styles and final offering descriptions need approval. No fake contact address or fabricated portfolio record was added. Final aesthetic approval depends on user visual review of screenshots and the staged site.

Run `npm test`, `npm run build` and inspect Home, Work, Journal at both 1600px and narrow public viewports. The GitHub preview workflow uploads temporary screenshots as Actions artifacts; screenshot links are shared in ChatGPT, not committed to the repo.
