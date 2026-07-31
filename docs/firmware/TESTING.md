# Firmware tesztelés

## Forrásteszt

```bash
node scripts/test-f14-final-reboot-api.js
node scripts/test-f14-complete-api.js
node scripts/test-f14-complete-firmware.js
node scripts/test-f14-complete-storage-layout.js
node scripts/test-f14-complete-query-fallback-lock.js
node scripts/test-f14-1-http-response-transport.js
node scripts/test-f14-1-memory-budget.js
```

## Hardverkapu

Kötelező ellenőrzések:

- auth mátrix: helyes header 200, hiányzó/hibás/query kulcs 401, duplikált header 400;
- capability flags;
- LED egyedi és közös műveletek;
- megszakított schedule tranzakció;
- 60 rekordos commit és lapozás;
- OTA utáni persistence;
- remote reboot `HTTP 202` és reboot utáni persistence;
- HTTP timeout és write failure 0.
