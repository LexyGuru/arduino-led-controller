# Natív Tauri credential bridge

## Cél

A desktop API v2 Bearer tokenje natív operációsrendszer-kulcstárban tárolható:

- macOS: Keychain;
- Windows: Credential Manager;
- Linux: Secret Service.

A böngészős vagy nem támogatott környezet automatikusan folyamatmemóriára
esik vissza.

## Szűkített jogosultsági felület

A Rust bridge nem általános jelszókezelő API. Kizárólag ezt az egy bejegyzést
engedi elérni:

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

A `credential_delete` idempotens: hiányzó bejegyzésnél `false` értéket ad
vissza, nem állítja le az alkalmazást.

## Titokkezelés

- minimum 16, maximum 8192 byte;
- vezető vagy záró whitespace tiltott;
- a beállításkor kapott Rust `String` `Zeroizing<String>` burkolatban él;
- a natív kulcstárműveletek `spawn_blocking` feladaton futnak;
- hibaüzenet nem tartalmazza a tokent;
- natív kulcstárhiba esetén a frontend memóriás fallbacket használ.

## lib.rs alkalmazása

A repository jelenlegi `lib.rs` fájlja nagy monolit. A csomag ezért szabványos
Git patchként adja át a két biztonságos módosítást:

1. `mod credential_bridge;`
2. a négy parancs hozzáadása az egyetlen `generate_handler!` listához.

```bash
git apply --unidiff-zero --check docs/v5/NATIVE_CREDENTIAL_BRIDGE_LIB_RS.patch
git apply --unidiff-zero docs/v5/NATIVE_CREDENTIAL_BRIDGE_LIB_RS.patch
```

## Cargo.lock

Az új Rust függőségek miatt a lockfájlt a fejlesztőgépen kell frissíteni:

```bash
cd desktop-tauri/src-tauri
cargo check
cargo test credential_bridge
```

A repository-validátor csak ezután fusson.
