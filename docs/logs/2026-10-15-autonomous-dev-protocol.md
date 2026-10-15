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

- Updated [AGENTS.md](../../AGENTS.md), [living implementation plan](../IMPLEMENTATION_PLAN.md), [architecture](../ARCHITECTURE.md) and [M8 editor plan](../M8_EDITOR_PLAN.md) to supersede conflicting per-milestone merge/delete instructions.
- **Hourly 24-run automation pilot was created and enabled successfully** using the Automation system, with substantial M8–M11 cycle instructions and explicit no-merge/no-delete guards. The Automation system owns the schedule and task status; GitHub records development progress.
- No code, merge or deployment changes were made. Each triggered run must re-read these rules and actual branch state.

## Revised standing authorisation — 2026-10-15

The user explicitly clarified that **V1's end-of-roadmap squash merge is already approved** and requested autonomous execution until the end of the entire roadmap.

- The original 24-run pilot is superseded by a continuous hourly schedule, which should stop once the M12–M17 roadmap is fully finished.
- Complete substantial substeps per run; automatically advance through the M8–M11 milestones on one retained branch.
- **Once M8–M11 are fully verified, the agent may perform the one pre-authorised V1 squash merge without requesting approval again.** Verify GitHub Actions staging; no intermediate merges.
- **After V1**, create the one post-V1 branch and execute M12–M17 autonomously. The user's instruction to continue through the end of the roadmap also authorises **one final squash merge** when all M12–M17 acceptance checks pass; no repeated approval prompt.
- **No branch deletion ever** and no auto-delete setting. Check head SHA and required CI/test results before any merge.
- Real content, secrets, live production host details, and irreversible external publishing still require actual data/access and safety checks. Do not fabricate or silently remove publishing protections to force a release.
- At terminal completion, document actual merge/build results and pause/disable the scheduled task when supported. If automation remains active, subsequent runs should do nothing after detecting roadmap completion.

This section **supersedes** the earlier approval-gated merge and 24-run pilot bullets above. Updated [AGENTS.md](../../AGENTS.md) and the [living plan](../IMPLEMENTATION_PLAN.md) accordingly. No runtime code changed during this policy update.
