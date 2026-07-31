# F14 Complete hardveres kapu

A csomag alkalmazása után kötelező:

1. publikus és privát UNO R4 fordítás;
2. USB feltöltés;
3. Serial `status`, `api test`, `eeprom status`;
4. auth: helyes header 200, hiányzó/hibás 401, `?k=` 401;
5. mindhárom LED GET/PUT és `leds/all`;
6. 0, 1 és 60 rekordos schedule tranzakció;
7. reboot után revision/count/checksum egyezés;
8. félbehagyott tranzakció után régi slot marad aktív;
9. OTA prepare és OTA feltöltés;
10. 1000 statuszkérés write failure és timeout nélkül;
11. 24/72 órás soak.

A Tauri újratervezése elkezdhető a forráscsomag merge-je után, de a publikus
firmware-release csak a hardveres kapu sikeres lezárása után készülhet.
