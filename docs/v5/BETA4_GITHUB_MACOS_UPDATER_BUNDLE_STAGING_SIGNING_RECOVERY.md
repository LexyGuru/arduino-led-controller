# Beta.4 GitHub macOS updater bundle + staging signing recovery

Base: e958ab1b4579ea40a3997350d818f9812623f264

- Beta release macOS Apple Silicon and Intel build both `dmg,app`.
- macOS updater `.app.tar.gz` and `.sig` are generated.
- macOS artifact collection has explicit missing/FOUND diagnostics.
- Push staging desktop builds receive the Tauri signing secrets.
- Push staging macOS uploads DMG plus updater archive/signature.
