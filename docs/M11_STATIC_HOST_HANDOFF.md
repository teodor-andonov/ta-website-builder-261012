# Portable static hosting handoff (optional)

The website is always generated from `content/site.json` and `assets/` via `npm run build` into `dist/`. **GitHub Pages currently publishes from `main`**. When switching to Hostinger or another static host later, you can upload `dist/` or use the local ZIP exporter.

## Export for a root-domain static host

```sh
npm run package:site
```

This rebuilds the root-hosted public website and creates **`release/website.zip`**, locally only. It contains HTML routes (`index.html`, `work/index.html`, project/post detail pages), `site.css`, assets, `404.html`, `robots.txt` and a `release-manifest.json` for file integrity checks. It **never includes Content Studio, the editing API, raw JSON content, backups, or source files**.

The build and ZIP use the same **Search indexing** setting as Content Studio (`site.publishing.indexing` in `content/site.json`). It is currently **Off** while placeholder content is in use: generated pages include `noindex, nofollow`, but remain publicly accessible. Switching to **On** emits `index, follow`. Neither setting requires approved copy, a booking URL, a public domain or GitHub Actions. The release manifest and ZIP verifier check the selected mode. With Off, `robots.txt` still allows crawler access so that the page-level `noindex` request can be read.

To check the ZIP before uploading:

```sh
node scripts/verify-site-package.mjs
```

## Hostinger / other static hosting

Extract the ZIP's **contents** into the provider's document root, often `public_html/`. Confirm that direct visits to `/work/` and project/post detail pages resolve their nested `index.html` files, plus CSS, images, HTTPS redirects and the 404 page. Keep a copy of the previous ZIP for rollback. No GitHub Actions deployment pipeline is necessary for Hostinger.

When a real root domain is chosen, you can optionally set `TA_PUBLIC_ORIGIN=https://your-domain.tld` during build/package to generate canonical URLs; `sitemap.xml` is emitted only when Search indexing is On. Do not use the repository subpath prefix on a root-domain host. The domain's ownership/DNS/TLS configuration remains a separate manual task.

## Local testing and recovery

```sh
npm test
npm run test:browser
node scripts/rehearse-release.mjs
```

The optional rehearsal copies current content and media to a temporary directory, packages the baseline, changes the copy, forces a failed build, and proves that a restore recreates the original ZIP without overwriting live files. It runs **locally**, does not deploy, and does not require GitHub.

See [README](../README.md) for the everyday workflow and [living plan](IMPLEMENTATION_PLAN.md) for the V2 work status. Earlier M11 dated logs document the previous staging/CI design, now superseded.
