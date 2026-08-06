# Beta.7 UI Freeze és Theme Engine

## Állapot

- Alkalmazásalap: `5.0.0-beta.7`
- Firmware-alap: `5.0.0-beta.4`
- Direct API: `1.0.0`
- Fejlesztési ág: `feature/beta7-ui-overhaul`
- Integrációs célág: `next/v5-rearchitecture`
- Stabil ág: `main`
- Kiadási állapot: fejlesztés alatt, még nem release

## Rögzített UI-modell

A Beta.7 UI Freeze után az alábbi modell tekintendő aktuálisnak:

1. A Theme Engine `data-appearance`, `data-theme`, `data-accent`, `data-density` és `data-radius` attribútumokkal dolgozik.
2. A rendszer szerinti mód az operációs rendszer világos/sötét beállítását követi.
3. A Light és Dark mód tényleges alappalettát választ, nem csak témanevet.
4. A helyi audit nem indít új Arduino API-pollingot.
5. A Legutóbbi műveletek a Tauri alkalmazásban végrehajtott műveleteket mutatja.
6. A Tauri auditkonzol helyi audit- és meglévő hálózati eseményeket mutat.
7. A régi Event Bus és szerveroldali `audit:read` üres panelek nem részei a Direct Arduino UI-nak.
8. A Dashboard kézi időszinkronja `runAudited` wrapperen keresztül hívja a `controller.syncTimeWithComputer` műveletet.
9. A `LedStrip` azonosító mezője `id`; `index` mező nincs.
10. Az OTA-konzol és rollback-lista központi kontraszttokeneket használ.

## Új komponensek

- `desktop-tauri/src/design-system/ThemeProvider.tsx`
- `desktop-tauri/src/design-system/theme-types.ts`
- `desktop-tauri/src/design-system/theme-storage.ts`
- `desktop-tauri/src/design-system/components/Button.tsx`
- `desktop-tauri/src/design-system/components/Card.tsx`
- `desktop-tauri/src/design-system/components/MetricCard.tsx`
- `desktop-tauri/src/design-system/components/StatusChip.tsx`
- `desktop-tauri/src/components/AppearanceSettings.tsx`
- `desktop-tauri/src/services/tauriAudit.ts`
- `desktop-tauri/src/hooks/useTauriAudit.ts`
- `desktop-tauri/src/beta7-theme.css`

## Kötelező contractok

- `test:beta7-theme-engine`
- `test:beta7-theme-audit-console`
- `test:beta7-ui-freeze-contract`
- `test:dashboard-arduino-time-sync`
- `test:desktop-schedule-firmware-log-ui`

A contractoknak az aktuális auditált handlereket kell ellenőrizniük. Régi, közvetlen controller handler vagy Event Bus pozitív elvárás nem használható.

## Merge-kapu

A `feature/beta7-ui-overhaul` csak akkor olvasztható a `next/v5-rearchitecture` ágba, ha sikeres:

```bash
npm run validate
npm test

cd desktop-tauri
npm run build
cd ..

cargo fmt --manifest-path desktop-tauri/src-tauri/Cargo.toml -- --check
cargo check --locked --manifest-path desktop-tauri/src-tauri/Cargo.toml
cargo test --locked --manifest-path desktop-tauri/src-tauri/Cargo.toml
```

A merge előtt vizuálisan is ellenőrizendő:

- System / Light / Dark;
- Arctic / Midnight;
- megjelenési beállítások perzisztenciája;
- OTA-konzol kontraszt;
- Beta rollback-lista kontraszt;
- Legutóbbi műveletek;
- Tauri auditkonzol;
- LED-, schedule-, időszinkron- és OTA-audit.
