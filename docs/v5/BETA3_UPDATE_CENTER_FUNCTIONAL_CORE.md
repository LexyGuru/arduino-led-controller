# Beta.3 – Update Center 2.0 functional core

This increment introduces the pure functional core for the Beta.3 Update Center 2.0 without changing the already accepted V490 visual layout.

## Scope

- one refresh model for application catalog, firmware catalog, device status and OTA readiness
- independent source failures via isolated loader execution
- last successful data preservation when one source fails
- explicit busy/checking state model
- standalone semantic firmware relation classification (no guessed dependency on the uncommitted V490 utility export name)
- normal firmware update path only when the available version is newer
- verified firmware artifact requirement with SHA-256
- installability blockers are machine-readable and UI-independent

## Deliberately not wired in this increment

The current `UpdateCenterPanel.tsx` is an uncommitted V490 worktree file. V491 does not guess its runtime props or rewrite its accepted UI structure without the exact source being available to the package author.

The next integration increment can wire this core into the panel using the tested V491 state as its base.

## Safety invariants

- no automatic downgrade from the main update path
- restore/rollback remains a separate action classification
- one failed source does not invalidate successful sources
- firmware source is unchanged
- no version bump
- no commit or push

## V492 recovery

V491 stopped in the isolated candidate fast gate because an ESM test used a `.js` extension under a CommonJS root package. V492 renames that test to `.mjs` and keeps the real worktree on the V490 base until the candidate passes.
