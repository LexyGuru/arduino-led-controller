# Firmware 4.3.0-beta.1

## Végleges szerződés

- Direct API: `1.0.0`;
- hitelesítés: `X-Device-Key` fejléc;
- query fallback: forráskódban tiltva;
- JSON body API: aktív;
- EEPROM A/B slotok: aktív;
- schedule maximum: 60 rekord;
- remote reboot: `POST /api/v1/system/reboot`, `HTTP 202`, 750 ms késleltetés.

## Végleges hardverkapu

A hardverkapu sikeresen ellenőrizte:

- privát OTA build feltöltését;
- új Boot ID-t OTA és reboot után;
- 60 schedule rekord tranzakciós commitját;
- `revision=3`, `checksum=77F3EBAD` megmaradását;
- megszakított tranzakció biztonságát;
- `offset=0`, `8`, `56`, `60` lapozást;
- legacy `index` fallbacket és az `offset` elsőbbségét;
- valódi `HTTP 202 Accepted` reboot választ;
- `HTTP timeouts=0`, `writeFailures=0` állapotot;
- kikapcsolt LED-ek megmaradását.

## Build adatok

- végleges firmware commit: `b9d0235dba9d400212c2f1b2768bb10b2746ba66`;
- GitHub workflow: `30626031015`;
- publikus SHA-256: `0dba6b171d8fe4b78e24d92baedf04d270ddc224cf4405fe8308c73fe74f0a5b`;
- privát SHA-256: `2858be25596e4cf849b01114ee3d8cc12a66b325cc416826361f5a621c590251`;
- globális memória: 19 364 bájt;
- lokális memória maradék: 13 404 bájt.
