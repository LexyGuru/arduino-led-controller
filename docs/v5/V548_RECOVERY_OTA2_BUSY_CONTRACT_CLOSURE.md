# V548 Beta.4 Recovery + OTA2 Busy Contract Closure

V548 starts from the V546-applied dirty working tree. V547 did not reach the
real worktree because the explicit fail-fast gate stopped in candidate npm test.

V548 includes the complete V547 recovery plus the newly discovered stale
Beta3 OTA2 UI binding contract.

Recovery:
- removes the invalid Core UI 2.0 i18n assertion from the V546 contract test;
- migrates active current-release expectations to Theme Engine 2.5 /
  Update System 2.0;
- synchronizes root Beta4 release notes with canonical Beta4 notes;
- migrates both stale OTA2 busy expectations from
  `state.busy || ota2Installing`
  to
  `state.busy || ota2Installing || appUpdate.installing`.

Gate hardening:
- explicit fail-fast wrapper for every required command;
- candidate focused gate includes the formerly failing OTA2 UI binding test;
- candidate full npm regression must pass before real apply;
- real focused and real full regression are repeated after apply;
- firmware/Rust updater/workflow/LXC SHA immutability is enforced;
- no commit and no push.
