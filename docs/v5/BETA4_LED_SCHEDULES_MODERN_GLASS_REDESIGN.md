# Beta.4 LED + Schedules Modern Glass Redesign

Base remote commit: `f9aeac3a2436823bb834f95ae6fe6a89089facf2`.

This package deliberately reconstructs the **actual local dirty worktree at run time**
instead of assuming a historical V519/V520/V521 file list.

## LED page

Presentation changes only:

- modern glass page heading
- responsive 3 → 2 → 1 column LED cards
- luminous power state
- richer color preview
- cleaner slider / numeric controls
- modern scene and quick-test panels
- hover depth and reduced-motion support

Preserved behavior:

- 4000 ms brightness/speed delayed send
- direct immediate power/color/effect changes
- scene actions
- night/rainbow/breathe tests
- V5/Direct API data source and error handling

## Schedules page

Presentation changes only:

- glass management heading and action deck
- modern sync/status panels
- improved day/action controls
- richer schedule cards
- responsive action wrapping
- theme-safe focus/contrast

Preserved behavior:

- schedule fingerprint / dirty tracking
- remote revision conflict detection
- save/reload
- import/export JSON
- create/restore schedule backups
- delete-all confirmation + backup
- multi-day copy/editor logic
- Direct API schedule synchronization

## Dirty-state strategy

At execution time V522 captures:

- `git diff HEAD --binary` for all tracked modifications
- every untracked file from `git ls-files --others --exclude-standard`
- a SHA-256 content manifest

The exact snapshot is replayed into a detached candidate at the fresh remote HEAD.
The content manifest is verified before V522 changes are applied.
