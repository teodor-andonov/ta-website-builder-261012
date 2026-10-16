# 2026-10-16 — Design-system audit and approval boundary

Branch: `feature/v2-unified-studio`, [PR #24](https://github.com/teodor-andonov/ta-website-builder-261012/pull/24). User visual/merge approval remains pending.

## User instruction

Study the design system and its history thoroughly. Keep future changes within it. When a proposed implementation requires changing or departing from the system, ask the user whether to change the design system **before implementing the departure**. Do not invent exceptions to fit text or satisfy a test. Added this durable requirement to `AGENTS.md` and the living roadmap.

## Sources reviewed

- [M6 Soft Precision](../M6_SOFT_PRECISION.md): integrated identity, mono typography, mineral/grayscale surfaces, restrained rounding and typographic rhythm. Its responsive-composition guidance predates and is superseded by the explicitly fixed M7 model.
- [M7 print grid](../M7_PRINT_GRID.md): explicit grid-line rectangles, page-width units, height constraints versus content-height rows, positive master-spacing multipliers, grayscale palette, non-layout outlines, full cell fill and no breakpoint rearrangement.
- [M7 direct Card/Item model](../M7_CARD_ITEM_DOM.md): only Cards and atomic Items; semantic Page/Nav/Main/Footer; real record Cards, flat meaningful grouping, default clipping and document scroll chaining.
- [M8 editor plan](../M8_EDITOR_PLAN.md): four desktop regions, tree-first structure editing, canvas selection without permanent overlays, atomic area changes, undo, and editor-only blue accent.
- [V2 architecture](../POST_V1_ARCHITECTURE.md), [M13 style log](2026-10-16-m13-design-styles.md), current `AGENTS.md`, README and living roadmap: styles separate from structure; defaults → named styles → allowlisted local overrides; isolated authoring and shared preview/static assembly.
- Actual `src/public.css`, `src/style-system.mjs`, design validation in `src/model.mjs`, shared renderer and canonical `site.design` tokens/styles.
- Design history: `3f92ffa` (Soft Precision); `1cf0a12` (print grid); `667b2af` (master spacing/full cell fill); `e6cb75b` and constituent Card/Item/flattening commits; `926344e` (historical Journal label/title/subtitle areas); `f47383d`, `bfce809`, `cf594a6` (M13 tokens/styles); `ff7fcdd` (V2 demo compositions); and release fix `519bb93`.

## Audit of the release changes

`519bb93` did **not** modify `content/site.json` or `src/public.css`: title text, font sizes/roles, authored grid areas, palette, master spacing, radius and outline tokens were unchanged. The earlier Journal title/label separation was authored in `926344e`, not this local release pass.

The release fix's visual change was `cardGridStyle()` for `constrainHeight:false`: fractional equal-height rows became `max-content` rows. M7 explicitly says **“With false, grid rows use content heights.”** That sentence is present both in the original print-grid specification at `1cf0a12` and the current document. The prior fractional implementation had made every section as tall as the largest image after nested composition migration. Constrained Cards still use equal fractional tracks and the authored aspect ratio. This was implemented as restoration of the documented height-off behavior, not a title-fitting exception. It remains part of the pending user visual review.

Other release changes fix module serving, draft duplication validation, Windows/browser tooling and outdated test fixtures; they do not introduce design treatments. No additional renderer, CSS or canonical content changes were made during this audit.

## Future application

The user clarified that the design system is **actively evolving with the early product**, not an immutable canon. Fix issues within its existing boundaries directly. When an issue exposes a missing or unsuitable rule, surface the problem and discuss how to incorporate the solution into the system. Once agreed, update the shared rules and affected usages consistently so the same problem does not recur. The approval boundary supports collaborative design-system development; it must not become a reason to preserve flawed behavior or ask about routine compliant fixes.

For visual fixes, name the existing design rule being restored. Do not infer that a clipped/long title permits smaller type, changed copy, arbitrary CSS, new breakpoints or altered grid coordinates. Use the approved authoring/style controls only within the intended composition. If the specification conflicts or the desired result needs a new rule, present that decision to the user first. Record approved design changes in the applicable specification and dated history; preserve historical decisions rather than silently rewriting them.

Documentation-only audit: reviewed diffs and `git diff --check`; no product changes, new screenshots or full-test reruns were needed. Prior automated acceptance still applies to the unchanged product code. No merge or publication occurred.
