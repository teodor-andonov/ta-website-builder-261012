# M3 — File-backed image assets

## Design
- Canonical asset metadata in `content/site.json` (one file). Uploaded binary image bytes in `assets/uploads/`.
- `POST /api/assets?filename=<encoded name>` accepts direct binary PNG/JPEG/WebP/GIF with matching extension and MIME, hard 12 MiB bound; verifies file signatures and rejects suspicious filename/path traversal.
- Generates random 128-bit opaque ID, writes file, updates metadata JSON using the existing atomic replace. If JSON cannot be saved, file is removed.
- `GET /assets/uploads/<opaque-name>` read-only with tight file extension and name allowlist, no arbitrary browsing or file access.
- Browser awaits pending JSON writes, posts each selected File, appends the server-returned metadata to the local UI, and edits alt/caption/credit/tags via the existing save pipeline.
- The shared renderer has long supported safe `/assets/...` image source paths; the Node build copies the complete `assets/` tree, including uploads.

## Constraints
- Editor is **desktop-only**; public pages remain responsive.
- Uploaded paths are read-only in the inspector; reference/remote URLs may still be edited.
- Uploads made on your PC remain local until `assets/uploads/` and `content/site.json` are added to Git/version control.
- No SVG uploads, destructive image deletion, variants, compression, thumbnail generation, authentication or concurrent-tab conflict handling in M3.
- Exporting JSON is not enough to back up uploaded image files.
- Server binds to `127.0.0.1`, rejects foreign Origin headers, streams with a byte limit, and does not expose a public writable endpoint.

## Tests
`npm test` validates valid upload, hostile/mismatched types, oversized input, path traversal, same-origin policy, actual disk persistence, safe image serving, metadata edits, rendering and static build output. The browser test checks the existing Image library controls without changing the studio's design.