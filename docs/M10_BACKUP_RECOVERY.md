# M10 — local backups and safe recovery

The Content Studio is file-first. The live source is `content/site.json` plus actual media files in `assets/` (or those paths under `TA_DATA_ROOT`). The backup tool works on those files; it does **not** package the application, Git history or credentials.

## Create a snapshot

From the repository folder:

```sh
npm run backup:create
```

A new folder appears under `backups/YYMMDD-HHmm_site-backup/` (with a collision suffix where needed). It contains:
- `content/site.json`
- a complete `assets/` file copy
- `snapshot-manifest.json` with file sizes and SHA-256 digests

The timestamp reflects the creating machine's local time. Backups are ignored by Git, kept separately from media and are never uploaded automatically.

If the live content is outside the repository (through `TA_DATA_ROOT`), its `backups/` is used unless a different parent directory is explicitly supplied.

## Check integrity before using a backup

```sh
npm run backup:verify -- "/full/path/to/snapshot"
```

Verification checks the validated site JSON, referenced local assets, complete file inventory, sizes and checksums. A missing/changed/extra file fails the check rather than claiming recovery success.

## Restore safely to a new folder

```sh
npm run backup:restore -- "/full/path/to/snapshot" "/full/path/to/new-site-data"
```

The target folder **must not already exist**, and cannot be inside the snapshot. The operation never replaces the active `content/site.json` or deletes newer image files. After restoring, verify and inspect the separate data folder before intentionally switching the Studio to it.

Windows PowerShell example:

```powershell
$env:TA_DATA_ROOT = "C:\TA\restored-site"
npm run dev
```

Clear the environment variable or close that shell to return to the ordinary working data root.

## Safety and limits

- A snapshot is a point-in-time backup, **not a background service**, sync utility, or version control substitute.
- Don't store the backup directory *inside* `assets/`: this is rejected to prevent self-recursive copies.
- File writes and asset replacements in Studio still use revision checks. For a failed save, export unsaved JSON before reloading; a snapshot is not a substitute for reconciling simultaneous browser edits.
- SVG placeholder files are checked-in static assets. User image uploads remain limited to validated PNG/JPEG/WebP/GIF files.
- The site is still deliberately `noindex`. Safe recovery does **not** imply sample portfolio copy is approved for external publication.
