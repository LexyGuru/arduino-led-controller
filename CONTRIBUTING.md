# Közreműködés

## Ágak

- `main`: stabil, produkciós alap; közvetlenül nem módosítandó.
- `next/v5-rearchitecture`: V5 fejlesztési ág.

## Kötelező ellenőrzések

```bash
npm ci
npm test
bash scripts/validate-repository.sh

cd desktop-tauri
npm ci
npm run build
cargo test --locked --manifest-path src-tauri/Cargo.toml
```

Firmware-változásnál ezen felül publikus és privát UNO R4 WiFi fordítás, valamint valós hardverteszt szükséges.

## Fájlkezelés

Ne commitolj generált build könyvtárat, `node_modules`-t, `target`-et, firmware BIN/ELF fájlt, `.DS_Store`-t vagy titkos konfigurációt.

## Commitok

Használj rövid, célzott Conventional Commit üzenetet, például:

```text
fix(firmware): honor schedule offset pagination
feat(tauri): add direct controller profile
```
