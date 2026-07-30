# Desktop API v2 runtime

A desktop kliens az OpenAPI-ból generált `ApiV2Client` köré épül.

## Biztonsági alapelv

A session-cookie az elsődleges hitelesítési mód. Bearer token használatakor a
token alapértelmezés szerint csak a folyamat memóriájában él, ezért az
alkalmazás bezárásakor eltűnik.

A `TauriCredentialVault` csak explicit engedélyezéssel használható, és a Rust
oldalon a következő parancsokat várja:

- `credential_get`
- `credential_set`
- `credential_delete`

A Rust parancsok bevezetéséig `allowPersistentBearer` maradjon `false`.

## Kapcsolati állapot

Állapotok:

```text
idle -> checking -> online
                 -> offline -> reconnecting
```

A sikertelen olvasások korábbi cache-értékre eshetnek vissza. A módosító
parancsok offline állapotban nem kerülnek automatikus sorba, mert későbbi,
váratlan LED-, schedule- vagy firmware-módosítást okozhatnának.

## Realtime

A `DesktopEventStream` két üzemmódot támogat:

1. Socket.IO factory használata `v5:event` eseménnyel.
2. Automatikus polling fallback az `/api/v2/events/recent` végpontra.

Az események azonosító alapján deduplikálódnak.

## React bekötés

```tsx
import {
  DesktopApiProvider,
  useDesktopApi
} from './api';

function AppRoot() {
  return (
    <DesktopApiProvider>
      <Application />
    </DesktopApiProvider>
  );
}

function ConnectionBadge() {
  const {
    connectivity
  } = useDesktopApi();

  return (
    <span>
      {String(connectivity.status)}
    </span>
  );
}
```

## Környezeti változók

```text
VITE_API_BASE_URL=http://127.0.0.1:3000
VITE_API_AUTH_MODE=session
VITE_REALTIME_POLL_MS=5000
VITE_ALLOW_PERSISTENT_BEARER=0
```

## Következő UI-migráció

A meglévő képernyőket fokozatosan kell átállítani:

1. rendszerállapot és diagnosztika;
2. LED vezérlés;
3. helyi és Arduino schedule;
4. firmware/OTA;
5. adminisztráció.
