# Natív Tauri credential bridge

## Cél

A desktop API v2 Bearer tokenje natív operációsrendszer-kulcstárban tárolható:

- macOS: Keychain;
- Windows: Credential Manager;
- Linux: Secret Service.

A böngészős vagy nem támogatott környezet automatikusan folyamatmemóriára esik vissza.

## Szűkített jogosultsági felület

A Rust bridge kizárólag ezt az egy bejegyzést engedi elérni:

```text
service: arduino-led-controller
account: api-v2-bearer
```

Más service vagy account `CREDENTIAL_SCOPE_DENIED` hibát kap.

## Tauri parancsok

```text
credential_status
credential_get
credential_set
credential_delete
```

A `credential_delete` idempotens: hiányzó bejegyzésnél `false` értéket ad vissza.

## Aktív implementáció

A bridge már közvetlenül a Tauri forrás része:

```text
desktop-tauri/src-tauri/src/credential_bridge.rs
desktop-tauri/src-tauri/src/lib.rs
```

Nincs alkalmazandó patch-fájl. A `lib.rs` tartalmazza a modult és a négy parancsot az aktív `generate_handler!` listában.

## Titokkezelés

- minimum 16, maximum 8192 byte;
- vezető vagy záró whitespace tiltott;
- a beállításkor kapott Rust `String` `Zeroizing<String>` burkolatban él;
- a natív kulcstárműveletek `spawn_blocking` feladaton futnak;
- a hibaüzenetek nem tartalmazzák a tokent;
- natív kulcstárhiba esetén a frontend memóriás fallbacket használ.

## Ellenőrzés

```bash
node scripts/test-native-credential-bridge-contract.js
node scripts/test-native-credential-vault.js
node scripts/test-native-credential-fallback.js
cargo check --locked --manifest-path desktop-tauri/src-tauri/Cargo.toml
cargo test --locked --manifest-path desktop-tauri/src-tauri/Cargo.toml
```
