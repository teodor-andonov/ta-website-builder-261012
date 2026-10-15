# 2026-10-15 — M11 complete rollback drill, ZIP verification and atomic build output

**Branch:** `feature/m8-advanced-editor` · [Rolling V1 draft PR #23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23)  
**Stage:** M11 — automated host-independent handoff and rollback reliability delivered; real external-host/launch acceptance still outstanding. **No merge, deployment, screenshots or branch deletion.**

## Changes implemented

1. **Executable end-to-end recovery drill:** `scripts/rehearse-release.mjs` and `npm run release:rehearse` clone canonical TA JSON/media to an isolated OS-temporary folder. The drill creates/validates a snapshot, builds/packages a noindex baseline, edits the disposable JSON, packages the edited site, deliberately breaks a media reference, asserts the failed build does **not** overwrite the last-good ZIP, restores to a **new** folder, and compares the rebuilt ZIP byte-for-byte with its original. It rejects restoring over the edited working folder and confirms the original repository JSON never changed. Cleans temporary files in `finally` and never accesses production hosts.
2. **Independent third-party package verifier:** `scripts/verify-site-package.mjs` and `npm run package:verify` inspect actual compressed ZIP bytes without extracting them, verifying local/central ZIP headers, archive entry paths (including ZIP traversal/source leakage), bounded sizes and decompression, CRC32, SHA-256 file-list manifest, required public files, and staging `noindex`/production SEO modes. Added corruption regression tests. This complements `unzip -t` rather than trusting a successful ZIP writer.
3. **Transactional static build output:** `src/output-transaction.mjs` now stages each generated site in a sibling directory, checks the presence of `index.html`, `site.css` and `404.html`, and swaps it into the destination only when complete. On a writer failure it leaves the previous site intact and cleans partial staging. It rejects output paths covering the source/media tree or attempting to overwrite an unrelated non-generated directory. The generator still preserves the existing root-vs-Pages base-path policies and noindex gates.
4. **Coverage/CI:** New `test/rehearse-release.test.mjs` and `test/output-transaction.test.mjs`, expanded `test/package-site.test.mjs`, an independent package verification step, and an explicit isolated rollback rehearsal in `.github/workflows/ci.yml`. The older public build test now writes into its own generated-output folder to reflect the new safe replacement contract.
5. **Operations documentation:** Expanded [M11 host handoff](../M11_STATIC_HOST_HANDOFF.md) with independent verification and rehearsal commands. ZIPs, temporary builds and backup artifacts are not committed; the actual source remains JSON/media files.

## Validation and observed failures

A transient CI failure occurred immediately after enabling transactional output: one historical test passed the *root of an existing arbitrary temp directory* as `TA_OUTPUT_DIR`, which is now deliberately rejected to prevent accidental deletion. Updated the test fixture to use `temp/dist`; did not disable the guard.

**Verified implementation commit:** [`8265e833`](https://github.com/teodor-andonov/ta-website-builder-261012/commit/8265e8335f68b29ddb4da45b335986bc481ebc71).

- [Test/build/packaging/rollback job](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38758239081) — **SUCCESS: 110 tests, 110 passed, 0 failed.** The job verified a 21-public-file noindex ZIP, independent archive manifest/CRC checks, output safety and `M11_ROLLBACK_DRILL_OK` with `snapshotFiles=9`, `publicFiles=21`, `recoveredZipMatches=true`, `failedBuildRetainedLastGood=true`, `existingWorkingFolderUntouched=true`. Ten site routes and eleven HTML paths passed repository-prefix audit; no Studio/API leaked.
- [Screenshot-free browser QA](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38758239126) — **SUCCESS**, including DOM/keyboard landmarks, M8 Structure, image replacement, project code, optimistic-save conflicts and offline recovery.
- **No screenshots generated**, no online host or domain touched. The site's content-readiness report still contains 14 intentional editable placeholders and one missing actual booking URL, as approved for V1 software development but **not** an external indexed production launch.

## Remaining M11/V1 acceptance

- Real host/domain ownership and access, HTTPS/DNS/redirect checks, direct deep-route and 404 behavior, live rollback target, and a real host-specific restore rehearsal. Do not invent credentials or upload automatically.
- Manual keyboard/screen-reader and cross-browser/device assessment; genuine public portfolio text/images/permissions/credits; correct real 15-minute booking URL; final externally indexable content audit.
- Under the existing roadmap policy, the pre-authorized **one final V1 squash merge** still requires the full M8–M11 acceptance criteria, exact PR head SHA and green final checks. This cycle does not claim those gates passed. No branch deletion.
- Next safe work: host acceptance checklist or further test improvements that require no external credentials; seek the user's actual domain and portfolio/booking materials only when needed to perform the real launch gate.
