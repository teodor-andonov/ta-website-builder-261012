# 2026-10-15 — Autonomous development and branch policy

**Branch:** `feature/m8-advanced-editor`, draft PR #23  
**Scope:** Process/docs only; no runtime code touched.

## Confirmed operational changes

- An hourly scheduled development task is permitted to work independently on the existing roadmap. It should tackle a substantial coherent development slice: at least one meaningful substep per run when feasible; more when appropriate for scope, tools and checks. Agent decides case by case.
- M8–M11 use **one continuous V1 development branch**, currently `feature/m8-advanced-editor`, with incremental commits and updates to the same PR. Internal M8/M9/M10 completion advances to the next phase **without milestone-by-milestone squash merges**.
- **One squash merge at the end of V1**, only after the user reviews and expressly approves the complete M8–M11 changes. No automated merge, production deployment, or direct `main` push.
- After the approved V1 merge, **one new post-V1 development branch** based on `main` covers M12–M17. **One squash merge at the end of that roadmap**, if reached and expressly approved.
- **Never delete branches.** Do not enable GitHub auto-delete or do historical merged-branch cleanup.
- Continue to keep the living plan as source of truth, with dated progress logs, tests and clear evidence; no development task should claim CI success before the checks finish.
- User involvement remains necessary for authentic/approved M9 content, credentials, irreversible website publication and release acceptance; make progress on other agreed work if blocked.

## Files and validation

- Updated [AGENTS.md](../../AGENTS.md) and [living implementation plan](../IMPLEMENTATION_PLAN.md) to supersede the earlier per-milestone merge/delete instructions.
- No code or deployment changes were made. A 24-run hourly automation pilot is being configured separately; its status is owned by the Automations system, not GitHub. At each trigger the task must re-read these rules and actual branch state.
