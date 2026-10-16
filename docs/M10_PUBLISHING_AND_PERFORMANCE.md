# M10 — historical SEO/media implementation (superseded)\n\n> **Superseded on 2026-10-15:** GitHub Pages is the current public publisher and output is indexable by default. The earlier `TA_ENABLE_INDEXING`, `noindex` and blocked-publication procedures below document **V1 history** and are no longer applicable. Use [README](../README.md) and the [living implementation plan](IMPLEMENTATION_PLAN.md) for current commands.\n

The static renderer and local Content Studio share a JSON source of truth. GitHub Pages remains an **unindexed preview**. This is intentionally separate from authorizing the public production website.

## Default: safe preview/staging

```sh
npm run audit:content
npm run audit:media
npm run build
npm run preview
```

Default builds, including GitHub Pages project-path builds, emit `<meta name="robots" content="noindex, nofollow">`, preview-safe Open Graph and Twitter title/description, and **no canonical URL, `og:url`, social-image claim or sitemap**. The generated `robots.txt` disallows crawlers; note a GitHub Pages subpath may not control the domain's root robots.txt, so page-level `noindex` remains the operative defense. The published output never contains the Studio/API.

Metadata is individually derived from a Page or collection Record (`title`, `summary` or site description); record post detail pages use `og:type=article`. Text values are HTML-escaped. An original image becomes a social preview only on an approved production build, not while temporary fills remain.

## Explicit external-production build

The following is a **future release procedure**, not an instruction to deploy right now:

```sh
TA_ENABLE_INDEXING=1 TA_PUBLIC_ORIGIN=https://your-verified-domain.example npm run build
```

Replace the example with a domain actually owned/configured by the website owner; the example domain deliberately fails validation. On Windows PowerShell set `$env:TA_ENABLE_INDEXING = "1"` and `$env:TA_PUBLIC_ORIGIN = "https://<your-owned-domain>"` in the command shell.

Before writing output, the build:

1. Validates JSON, route IDs and the strict local media paths.
2. Requires an explicit `TA_ENABLE_INDEXING=1` toggle, an acceptable bare HTTPS domain origin in `TA_PUBLIC_ORIGIN`, and `TA_BASE_PATH=/` for a production root.
3. Runs the strict editorial gate: no pending placeholder media/files/pages/records, no unapproved factual claims, no absent 15-minute booking URL, missing credits or other content-readiness findings.
4. Verifies media integrity and maximum sizes.
5. Generates absolute page-level canonical and `og:url` metadata, appropriate robots indexing, `sitemap.xml`, and permissive root `robots.txt`.

**A syntactically valid domain is not proof of ownership.** Live DNS, TLS, redirects and the ability to deploy there must be verified separately during M11. Do not provide fake or hypothetical credentials to bypass this safeguard. The hosted GitHub Pages demo continues using `noindex` unless there is an explicit public-release authorization and separate host configuration.

## Media budget

Every JSON asset must resolve to a real file inside the approved `assets/` root; symlinks escaping that root, missing files and unsafe filenames fail before the previous `dist/` output is deleted. The defaults are **12 MiB per asset**, **32 MiB total unique referenced media**. These are conservative V1 guardrails, not image-size optimisation; replace oversized media with compressed/resized originals before deployment.

- `npm run audit:media`: independent, read-only, CI-verified integrity and byte-budget report.
- `npm run build`: repeats the audit as a preflight to prevent incomplete static output.
- `decoding="async"` is added to rendered images; collection project-tile covers use `loading="lazy"`, avoiding unnecessary off-screen image loads while keeping ordinary authored images eager.

The build copies `assets/` as files and rewrites root-relative local paths for GitHub Pages. Future Hostinger/other static hosting can receive the generated `dist/` folder without a GitHub publication dependency.

## Remaining acceptance

M10 is **not complete solely because CI is green**. Keyboard-only and screen-reader reviews, actual browsers/devices, live hosting/TLS, real replacement media performance, production-domain selection and a documented restore drill remain. Run `npm run backup:create` and verify/restore the snapshot before changing the deployment source.

## Evidence

Tests: `test/publishing.test.mjs` (default noindex, public domain gate, metadata/canonical/sitemap, project-base prohibition, media validation), existing public route and render-parity tests, plus screenshot-free Chromium editor interaction checks. The living [implementation plan](IMPLEMENTATION_PLAN.md) records current gate status.
