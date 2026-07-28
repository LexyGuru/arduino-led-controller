# Frissítési csomag alkalmazása

Ez a csomag a repository gyökerére másolandó. A meglévő aktív fájlokat felülírja, a régi Electron és verziójegyzet fájlokat pedig a takarító szkript távolítja el.

## 1. Biztonsági ág

```bash
git switch -c update-4.1.20-3.0.21
```

## 2. Csomag kibontása a repository gyökerébe

A ZIP-ben található fájlokat úgy másold be, hogy például ez legyen az eredmény:

```text
README.md
server2_final.js
desktop-tauri/package.json
firmware/ArduinoLedController/ArduinoLedController.ino
```

## 3. Régi fájlok ellenőrzése és törlése

```bash
bash scripts/cleanup-repository.sh --dry-run
bash scripts/cleanup-repository.sh --apply
```

## 4. Ellenőrzések

```bash
node --check server2_final.js
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"

cd desktop-tauri
npm install
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

Firmware:

```bash
arduino-cli compile \
  --fqbn arduino:renesas_uno:unor4wifi \
  --output-dir build/firmware \
  firmware/ArduinoLedController
```

## 5. Git ellenőrzése

```bash
git status
git diff --stat
git diff
```

## 6. Commit

```bash
git add -A
git commit -m "Firmware 4.1.20, mobile OTA restriction, LXC parity and repository cleanup"
git push -u origin update-4.1.20-3.0.21
```
