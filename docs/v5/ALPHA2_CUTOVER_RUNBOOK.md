# Alpha.2 cron-cutover és izolált LXC release gate

## Cél

A munkacsomag a legacy szerverből még futó két cron-feladatot indításkor
célzottan letiltja:

- `* * * * *` – legacy helyi schedule futtató;
- `*/30 * * * * *` – legacy Arduino státuszfigyelő.

A helyükre a közös `LocalScheduleRunner` és `ArduinoStatusMonitor` lép.

## Kötelező környezeti értékek

```text
LOCAL_SCHEDULE_RUNNER_MODE=active
LEGACY_LOCAL_SCHEDULE_ADAPTERS_ENABLED=1
LEGACY_SUPPRESS_LOCAL_SCHEDULE_CRON=1
LEGACY_SUPPRESS_STATUS_CRON=1
ARDUINO_STATUS_MONITOR_ENABLED=1
```

Az `ARDUINO_SCHEDULE_UPLOAD_ENDPOINT` maradjon üresen addig, amíg a firmware
által támogatott feltöltési végpontot hardveresen nem igazoltuk.

## Ellenőrzés

```bash
sudo APP_DIR=/opt/arduino-led-controller \
  CANDIDATE_REF=feature/v5-server-modularization \
  bash /opt/arduino-led-controller/deploy/test-alpha2-candidate.sh
```

A gate ellenőrzi a repository-validátort, a health végpontokat, az OpenAPI
dokumentumot, a cutover-állapotot, az aktív V5 runnert, a cron-letiltást, a
monitor állapotát, a schedule fájllistát és a rollback könyvtártesztet.

## Verziólépés

A `5.0.0-alpha.2` verzió csak a valódi LXC gate sikeres lefutása után kerül a
verziófájlokba és lockfile-okba.
