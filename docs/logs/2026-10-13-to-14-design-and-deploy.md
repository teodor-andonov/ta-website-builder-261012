# 2026-10-13–14 — M5–M7 deployment and print-native layout

**Status:** merged into `main`, demo website published via GitHub Pages. **Not a production launch**.

- **M5 · [PR #9](https://github.com/teodor-andonov/ta-website-builder-261012/pull/9):** Added Actions build/deploy of `dist/` to the project URL, while keeping the writable local Studio/API out of static deployment. Added a GitHub Pages base-path transform and a path audit. Public demonstration: https://teodor-andonov.github.io/ta-website-builder-261012/.
- **M6 · [PR #11](https://github.com/teodor-andonov/ta-website-builder-261012/pull/11):** Initial integrated Soft Precision identity and homepage presentation. Public palette constrained to grayscale.
- **M7 · [PRs #13, #15, #17](https://github.com/teodor-andonov/ta-website-builder-261012/pull/17):** Print-native Card system with equal divisions and explicit grid areas; single master spacing units with 1×/2×/4× Card variants; optional outlines that don't affect box sizing; width-scaled geometry without breakpoint reflow. Flattened the Card tree and removed graphical Block wrappers. Page/Nav/Main/Footer and section Cards share the same grammar.
- **M7 review refinements:** Header/section rounding, less redundant nesting, direct navigation link Items, full-size Work/Journal record Cards, default clipped Item overflow and opt-in internal scroll without trapping the document wheel.

**Validation:** milestone tests, desktop/narrow Chromium screenshots and browser scroll checks accompanied each PR. A real Chromium mouse-wheel test was introduced for scrolling while hovering text/images. Public sample material was intentionally tagged `noindex`.

**Outstanding small refinement:** [Issue #22](https://github.com/teodor-andonov/ta-website-builder-261012/issues/22) — reduce over-specified row/column divisions only when the same composition can be preserved.

**Important distinction:** later M8 grid-overlay experimentation was merged as [PR #21](https://github.com/teodor-andonov/ta-website-builder-261012/pull/21), but the *current M8 branch* reverses that editor experiment and replaces it with structure-first authoring. No intermediate M8 branch should be merged solely for preview; use local Studio or CI screenshots.
