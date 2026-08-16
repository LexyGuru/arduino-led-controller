# Beta.4 Sidebar Badge + Paperwork Final Closure

<!-- BETA4_FINAL_PAPERWORK_V554 -->

This is the final UI/paperwork closure for `5.5.1-beta.4`.

## UI closure

- `UI 2.0` and `Beta 4` remain separate sidebar identity badges.
- On full desktop sidebar they are vertically separated and the brand area reserves space for both.
- On compact tablet sidebar both badges are hidden together.
- Core UI 2.0 topbar identity remains unchanged.
- The Update Center "up to date" behavior remains unchanged: when installed and latest are both `5.5.1-beta.4`, the user can re-check for updates but no install action is required.

## Proven update path

V552 proved the native signed macOS updater E2E path:
`5.5.1-beta.3 -> 5.5.1-beta.4 -> signature verification -> download/install -> restart -> updated app launch`.

## Protected surfaces

This V554 closure does not alter:
- firmware source,
- Rust updater runtime,
- production Tauri updater configuration,
- GitHub release workflow,
- LXC updater,
- OTA 2.0 runtime behavior.

No commit or push is performed by the test/apply package.
