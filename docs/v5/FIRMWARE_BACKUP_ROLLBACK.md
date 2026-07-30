# Firmware backup és rollback

Minden SHA-256 ellenőrzött firmware-jelölt a feltöltés előtt bekerül a backup
registrybe. Sikeres Arduino-visszajelentkezés után a rekord
`lastKnownGood: true` állapotot kap.

## API

```text
GET    /api/v2/firmware/backups
POST   /api/v2/firmware/actions/rollback
POST   /api/v2/firmware/actions/cancel
DELETE /api/v2/firmware/backups/:id
```

Rollback kérés:

```json
{
  "backupId": "fw_20260729T083000_0123456789ab"
}
```

Az aktuális last-known-good backup nem törölhető. A megőrzési limitet a
`FIRMWARE_MAXIMUM_BACKUPS` szabályozza.
