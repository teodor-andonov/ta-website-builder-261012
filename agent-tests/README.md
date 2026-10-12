# Agent test passes

This folder contains **versioned test reports** for TA Content Studio. Corresponding screenshot images live in the user's ChatGPT **File Library**, under `/agent-tests/<YYMMDDHHmm>/`.

## Workflow
1. Run actual browser and file-backed integration tests.
2. **Desktop editor only**: target 1600×1000 (primary) and 1280×800 (secondary). No mobile editor layout/testing and no screen recordings unless explicitly requested.
3. Create a timestamped pass folder in **Europe/London local time**, e.g. `2610122135`.
4. Save the test screenshots into that pass folder in the File Library, with a `README.md` that describes conditions and results.
5. Add a matching `agent-tests/<timestamp>/README.md` to GitHub, noting branch/commit, passed/failed checks, screenshot filenames and caveats.
6. Return a **folder link** in the chat rather than embedding screenshots inline. Keep test runs separate; don't overwrite prior evidence.
7. If a later tool supports direct binary image uploads to GitHub, keep the screenshots with their run report in this repo, while preserving existing reports.

## Scope boundary
**Only the editor is desktop-only.** The published public website still needs responsive mobile layouts as normal.

## Test sessions
- [2610122135](2610122135/README.md) — Archived desktop Chromium pass of PR #1.
