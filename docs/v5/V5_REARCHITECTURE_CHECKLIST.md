# V5 rearchitecture checklist

## Firmware — kész

- [x] Firmware `4.3.0-beta.2`.
- [x] Direct API `1.0.0`.
- [x] Header-only `X-Device-Key` auth.
- [x] Query fallback kikapcsolva.
- [x] JSON body API.
- [x] A/B EEPROM és readback.
- [x] 60 rekordos schedule tranzakció.
- [x] `offset` lapozás és legacy `index` fallback.
- [x] OTA hardverkapu.
- [x] Remote reboot `HTTP 202`.
- [x] Reboot utáni persistence.

## Repository — kész

- [x] Elavult gyökérfájlok eltávolítása.
- [x] Alpha/F14 patchdokumentumok összevonása.
- [x] Package manifest maradványok eltávolítása.
- [x] README és firmware dokumentáció újraírása.
- [x] Beta workflow firmware-verzió frissítése.
- [x] Aktív regressziós tesztlánc megtartása.

## Tauri — következő

- [ ] Oldalszerkezet és navigáció felmérése.
- [ ] Direct Arduino profile modell véglegesítése.
- [ ] Natív credential bridge eszközprofilonként.
- [ ] Kapcsolati állapot és hibakódok egységesítése.
- [ ] LED-oldal közvetlen API regresszió.
- [ ] Schedule editor és 60 rekordos tranzakció.
- [ ] Firmware/OTA desktop UX.
- [ ] Mobil OTA funkciók elrejtése.
- [ ] Szerver/LXC/release panelek kivezetési döntése.
- [ ] Teljes desktop build és hardveres acceptance.
- [ ] Beolvasztás `main` ágba csak minden kapu után.
