# 2026-10-15 — Complete M8 automated technical acceptance; begin M9 content readiness

**Branch:** `feature/m8-advanced-editor` (rolling V1 M8–M11 branch)  
**PR:** [#23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23) · **M8 technical/browser acceptance complete; M9 active.**  
**Release:** No merge, branch deletion, production deployment, SEO index enablement, or screenshot generation.

## M8 — substantial safety/recovery delivery

- **Transactional JSON editing:** Studio imports the exact `src/model.mjs` validator from a newly allowlisted localhost module endpoint, then validates cloned candidates before modifying live editor state. Invalid scoped JSON or whole-file JSON no longer poisons memory or starts an invalid save; valid imports commit through the revision-checked writer. JSON imports explicitly confirm source replacement, and authoring Undo histories are cleared after replacing a document from external JSON.
- **Disconnected/stale-tab recovery:** a visible live-region error appears with an explicit export-before-reload instruction. **Reload saved file** appears after save failure and requires confirmation before discarding local edits; it fetches and validates the saved JSON + ETag, then clears blocked state and history. A 409 stale-tab conflict preserves the live state for export; a failed offline write does not claim to have saved.
- **Upload safety:** uncertainty about a network failure or a truncated response prevents further uploads/saves until the user exports/reconciles. A known 415 rejection of an invalid image reports an error without creating an asset or poisoning healthy JSON state. The update no longer treats transport errors as safely retryable writes.
- **Generated/referenced Card inspector:** disables child-insertion controls on source/reference Cards (those children would otherwise be invisible and rejected by schema); keeps source configuration editable and supports opening the reusable record Card/component definition.
- **Real browser checks:** existing Structure grid, keyboard, history, 320-Item nested selection, 1280×800 and 1600×1000 checks remain. Added rejected scoped/full JSON import, valid full import, corrupt-media rejection, source/reference Cards, conflict recovery, confirm-gated reload and offline-write visible/exportable recovery. No images/screenshots produced.

**Verified implementation commit:** [`86c178c`](https://github.com/teodor-andonov/ta-website-builder-261012/commit/86c178c3ec3aeb7e0fdfe0bfb9bad31bc4086a2f) — [browser QA passed](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38708429988) and [test/build passed](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38708430012). This was the last code-only recovery checkpoint. Browser markers: `M8_JSON_TRANSACTION_OK`, `M8_FULL_IMPORT_OK`, `M8_UPLOAD_REJECTION_OK`, `M8_SOURCE_REFERENCE_OK`, `M8_SAVE_CONFLICT_OK`, `M8_OFFLINE_RECOVERY_OK`.

The M8 data-integrity and four-panel editor is **technically complete under automated tests**. Remaining manual screen-reader/browser/device testing and production-content recovery drills are M10 release acceptance items, not reasons to hold M9 implementation. No claim that M10 accessibility is finished.

## M9 — content readiness groundwork (real site, no second demo)

- Added **`scripts/content-readiness.mjs`** (read-only, no dependence on a CMS) and **`npm run audit:content`**, reporting demo assets and covers, missing image alt/credit, placeholder email/URLs, and non-draft project/post and published page material not explicitly approved for release. **`npm run audit:content -- --strict`** fails for release gating once real content has been supplied.
- Added four unit tests for audit results, draft exclusions, review status, demo/missing cover and accessibility/attribution metadata.
- Integrated the audit into CI as **report-only while M9 is active**; no fake publish-ready status and no premature noindex removal.
- Added **Content approved for publication** controls to Page and Record inspectors, defaulting to unapproved unless explicitly set true. They save through existing JSON. This is editorial review metadata, not automatic publication.
- Audit of current real repo source: **21 outstanding issues**, including four demo asset sources, seven unreviewed active records, three unreviewed published pages, placeholder contact destination, and demo cover usage. The existing homepage already describes Architecture/Computation/Research and fixed packages/subscription/custom project arrangements; improve actual copy/material instead of introducing a parallel layout system.
- Source JSON content is still example/demo content, not new verified factual project claims. The user will need to provide or approve actual portfolio text/visuals, permissions and verified contact booking link for M9 completion.

**M9 kickoff CI:** [test and build](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38709093373) **success** on `3ba5f404`: **88/88 tests passed**, 10 static pages built, path audit passed. [Browser QA](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38709093387) **success**. A newer documentation-only commit may trigger additional CI; distinguish that status from the verified implementation check.

## Next cycle

1. **M9 actual content:** replace demonstration projects, posts and illustrations with authentic approved material, then refine real services/arrangements/call to action. Do not invent credits, project facts, prices or a contact/booking URL.
2. Add/verify M9 editing convenience for metadata (particularly asset credits/alt and record approval); make content readiness a hard M10/M11 gate when real materials are loaded.
3. M10 must independently test real screen readers, browser/device coverage, backups/restore, SEO and safe release metadata before merge.
4. Keep all M8–M11 changes on the original long-lived V1 branch. No intermediate merge/deploy/branch deletion.
