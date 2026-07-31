# F14 végleges hardverkapu

A végleges elfogadás akkor adható meg, ha az alábbiak hardveren sikeresek:

- auth mátrix;
- query fallback tiltás;
- diagnosztikai végpontok;
- LED 1–3 és `/api/v1/leds/all`;
- legacy módosítások `410`;
- üres és egyrekordos schedule-tranzakció;
- cold-boot persistence;
- félbeszakított tranzakció;
- 60 rekordos tranzakció;
- védett távoli reboot;
- OTA;
- `http.timeouts == 0`;
- `http.writeFailures == 0`.

A már igazolt hardvereredmények:

- auth mátrix: PASSED;
- query fallback: PASSED;
- LED API és vizuális ellenőrzés: PASSED;
- legacy mutation `410`: PASSED;
- üres schedule: PASSED;
- egyrekordos schedule: PASSED;
- cold-boot persistence: PASSED;
- schedule revision: `2`;
- schedule checksum: `7138F339`.
