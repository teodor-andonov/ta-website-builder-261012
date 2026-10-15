# M11 — host-independent static site handoff

**Status:** package workflow implemented and tested; the public production domain/hosting and actual launch are **not** configured. No host credentials, external deployment or branch merge is involved in packaging.

## 1. Generate a portable ZIP on Windows or macOS/Linux

From the project folder:

```sh
npm run package:site
```

This rebuilds the website at **domain root** (`TA_BASE_PATH=/`) and writes `release/ta-website-preview.zip`. The repository's `release/` folder is ignored by Git; it is not automatically uploaded anywhere.

The ZIP contains:
- `index.html`, route folders such as `work/index.html`, `posts/index.html`, and each published record's own `index.html`
- `site.css`, `assets/` and a generic `404.html`
- `robots.txt`, and `release-manifest.json` listing every included file, size and SHA-256 digest

No Studio, local API, repository source, JSON authoring content, server credentials, logs or backups are packaged. The ZIP uses standard DEFLATE entries, verified by automated tests and GitHub Actions `unzip -t`.

**Default output is a safe preview.** Page metadata stays `noindex, nofollow`, the `robots.txt` disallows crawling and no production sitemap/canonical origin is invented. This is suitable for visual QA on an unindexed host or offline handoff, **not a publicly indexed website launch**.

## Verify release ZIP and rehearse a non-destructive rollback

```sh
npm run package:verify
npm run release:rehearse
```

`package:verify` reads the **actual compressed ZIP**, checks ZIP-entry paths against traversal and private-source leakage, verifies uncompressed file sizes and CRC32, compares every file against `release-manifest.json` SHA-256 hashes, and confirms that preview packages remain `noindex` without a production sitemap. Pass a different ZIP to `npm run package:verify -- "/path/to/other.zip"`.

`release:rehearse` builds a **disposable clone** of the current real TA content/media in the operating system's temporary directory. It creates and verifies a JSON/media snapshot, builds and packages the unindexed site, edits the cloned content, builds again, simulates a missing image to force a failed build, checks that the last successful ZIP survived, restores into a **different** folder and requires the restored ZIP to match the original byte-for-byte. It also verifies that restoring over the edited folder is refused. The temporary files are deleted afterwards; the source repository, live `dist/`, original content and external hosting are untouched.

Static builds themselves now use a **transactional sibling directory**: the previous generated site is retained until the replacement has all its pages, CSS, assets, `robots.txt` and 404 written. The builder refuses to overwrite unrelated directories or protected source/media folders. This is a **local recovery drill**, not proof that a third-party hosting provider can restore uploaded files. Keep the prior verified bundle separately for a real host rollback.

## 2. Hand the generated site to a static host

Hostinger or another static host can serve these files without Node, GitHub Pages or a writable API. Upload the **contents** of the ZIP directly to the website's configured document root (`public_html/` or the provider's equivalent), not an extra containing folder. A URL ending in `/work/` needs directory-index resolution to `work/index.html` from the host; test it rather than assuming the host has configured this.

A safe host acceptance walk-through:
1. Record who owns the domain, DNS and hosting account; confirm TLS is provisioned.
2. Upload into a **separate preview/staging path** when possible, without overwriting the active production site. Confirm no executable Studio/API file is served.
3. Check the home, work and journal indexes, a project detail route, a post detail route, the 404 response, fonts, CSS and images. Verify direct deep links and refresh.
4. Confirm redirects between `www`/apex and HTTPS only **after** the real destination is agreed. Keep old routes working or arrange redirects before changing project slugs.
5. Keep site/content backups separate from Git, including `content/site.json` and media; use `npm run backup:create` and verify the restore procedure.
6. Record the server's document root, deployment method, domain and rollback location in a private operations log (do not commit credentials).

## 3. Eventual approved, indexable production ZIP

A root-domain build is intentionally harder than a preview. After sample content has been replaced and reviewed, the real booking destination is configured, and the domain is confirmed, set these environment variables in the shell used to run the package command:

```sh
TA_ENABLE_INDEXING=1 TA_PUBLIC_ORIGIN=https://your-actual-domain.tld npm run package:site
```

On Windows PowerShell, set `$env:TA_ENABLE_INDEXING = "1"` and `$env:TA_PUBLIC_ORIGIN = "https://your-actual-domain.tld"` first, then run `npm run package:site`. The `release/ta-website-preview.zip` filename is unchanged—**inspect `release-manifest.json`'s `indexable` field**, don't infer release state from the filename.

Production mode requires the existing **strict editorial audit** and a safe HTTPS root origin; it generates canonical/OG URLs, `robots.txt`, and `sitemap.xml`. The example `your-actual-domain.tld` is documentation only. A syntactically valid URL alone does not establish domain ownership, hosting access or permission to publish.

Before public launch, verify **manually**: real ownership/permission for project copy and photos, relevant image attributions, the working booking link, full keyboard and screen-reader interaction, cross-device presentation, browser behaviour, media performance, an actual backup/restore rehearsal and the production host's HTTP/TLS redirects. A successful ZIP test is not proof that these checks passed.

## 4. Rollback and portability

The bundle is static: a rollback can restore the previously verified `dist` / uploaded ZIP contents to the host. Keep a matching local backup of the underlying authoring JSON and media. Never edit individual deployed HTML files as the lasting source of truth—the next static build regenerates them from the JSON.

Repository/development policy remains separate: all M8–M11 commits stay on `feature/m8-advanced-editor`; the user already authorised **one final V1 squash merge** after complete acceptance. Do not merge intermediate milestones or delete branches.
