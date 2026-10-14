# 2026-10-15 — Post-V1 Content Studio architecture decisions

**Active implementation stage:** M8, on feature/m8-advanced-editor / draft PR #23.  
**Activity:** Documentation/planning only; no application code, tests, build or deployment modified.  
**Outcome:** Finalised the **separate M12–M17 post-V1 sequence**, preserving original M8–M11 and prioritising actual TA website authoring rather than a second demo project.

## Confirmed

- One website folder / one Studio instance; JSON + actual media.
- Recursively authored Cards and atomic Items everywhere; manual compositions, no preset/editorial node language.
- Independently edited templates, page/record compositions and components. Separate assembled-page preview.
- One template content slot; nav/header/footer are reusable components, allowing different templates to share/change their site chrome.
- Configurable design tokens, reusable named styles and limited local overrides.
- Generic typed collections; optional generated record pages; collection default template with per-record override.
- Assets as a built-in queryable source. **An asset can have multiple record relationships**, each by (collection ID, record ID), distinct from file-system hierarchy.
- Contextual AND filters, allowing a Project template's asset Card to match relation to the **current project record** and tag highlighted; distinct query-row binding context.
- No other demo/test site required; TA website is the real validation project.
- The originally agreed M9 Content, M10 QA and M11 Hosting/V1 launch remain unchanged and are executed before M12.

## Files

- Created [post-V1 technical specification](../POST_V1_ARCHITECTURE.md).
- Finalised the appended [post-V1 M12–M17 roadmap](../IMPLEMENTATION_PLAN.md), without rewriting any earlier milestones.
- Added this dated planning log and indexed it in [logs/README.md](README.md).

## Validation and limitations

This planning pass was checked against the current M8 plan and renderer/model code for feasibility. Existing V1 collection queries and hardcoded site frame **do not** implement the proposed record-context asset filtering or unified single-slot template assembly; these are explicitly post-V1 work. No tests were run because no runtime code was changed. The M8 branch's implementation remains pending user review and release.

**Next:** complete the existing M8 editor QA and acceptance before proceeding to unchanged M9.
