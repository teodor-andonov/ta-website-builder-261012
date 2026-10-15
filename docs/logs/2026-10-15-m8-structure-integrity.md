# 2026-10-15 — M8 structural identity and component-reference safety

**Stage:** M8 in progress. **Branch:** `feature/m8-advanced-editor` (rolling V1 branch). **PR:** [#23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23). **Release:** not merged or deployed.

## Why this cycle

An earlier scheduled development run identified missing duplicate-ID validation but could not commit. This prompted/manual cycle verified actual current GitHub content and implemented the fix, along with component reference cycle validation. This confirms that interactive GitHub writes presently work despite the earlier scheduled-run blockage. The hourly automation remains paused.

## Code changes

- [`src/model.mjs`](../../src/model.mjs) now checks one shared Set of Card/Item IDs **per authored scope** (page, template or component) across nested Cards, including legacy imported nested children. Different scopes can legitimately reuse node IDs; within one scope duplicates are rejected with an actionable error rather than making Structure selection ambiguous.
- The same validator builds reusable component dependencies from Card `reference` and collection Card `source.template`, rejecting direct/indirect cycles before saving JSON. Previously the renderer merely emitted a cycle placeholder or stopped on a depth limit.
- [`test/model.test.mjs`](../../test/model.test.mjs) adds seven regressions: nested duplicate, sibling duplicate, independent component duplicate, cross-page ID reuse, direct component self-cycle, indirect two-component cycle, and collection-source self-cycle.
- No content data migration, layout styling change, local server publication change or dependency introduced. Canonical existing site JSON had no duplicate IDs across authoring scopes.

**Code commits:** [identity validation](https://github.com/teodor-andonov/ta-website-builder-261012/commit/2b561a33ed688cafec730399e6feac0200eaea24), [identity tests](https://github.com/teodor-andonov/ta-website-builder-261012/commit/211435dc8d94b25be4065b86d452441e69ef8875), [reference-cycle validation](https://github.com/teodor-andonov/ta-website-builder-261012/commit/ad12f243f20538794aeddccbea88fc8b5c11a991), [cycle tests](https://github.com/teodor-andonov/ta-website-builder-261012/commit/ec5be66ff21cc218db4e50481301fcf1c9b7acdd).

## Actual verification

GitHub Actions on code commit `ec5be66`:

- **test-and-build:** success. Node test log: **78 tests, 78 passed, 0 failed, 0 skipped**. All seven new regression cases passed.
- Static build: **10 pages** built under `dist/`; project-base-path audit verified **11 HTML files**, no public editor/API exposure. Local preview route smoke checks passed in CI.
- **screenshots:** success (GitHub Actions UI/browser screenshot workflow).
- Exact check runs: [test and build](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38703472851), [screenshots](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38703473050).

The execution environment could not clone the repository directly from github.com for its own local tests; verification is based on the actual GitHub Actions logs rather than claiming local execution.

## Remaining M8 work

1. Large-tree manual and automated browser exercises (hierarchy operations, keyboard/focus/accessibility, and validation error handling).
2. Desktop layout QA at 1600×1000 and 1280×800, referenced/generated Card selection and large-document usability.
3. Manual recovery flows (stale tabs, disconnected local server, upload failures and export/reconcile) with screenshots/clear limitations.
4. Update acceptance evidence and progress to original M9 on the same rolling V1 branch when technically ready. No interim merge; no branch deletions.

**Next cycle:** focus on large-tree browser reliability/selection and readable error feedback for invalid imports or saves, then complete remaining M8 acceptance checks.
