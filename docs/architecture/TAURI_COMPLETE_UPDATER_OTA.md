# Tauri complete updater and OTA

A desktop kliens a GitHub Releases listából a beállított `stable` vagy `beta` csatornához választ alkalmazás- és firmware-kiadást. A firmware csak `.ino.bin` + `.sha256` párral telepíthető. A letöltött bináris helyi cache-be kerül, visszaolvasás után újra hash-elve.

A közvetlen OTA megszakítható kooperatív kapuval. Sikeres feltöltés után kötelező az új Boot ID, valamint a változatlan `scheduleRevision` és `scheduleChecksum`. Eltérés esetén a művelet hibával zárul.

A tényleges alkalmazástelepítés továbbra is aláírt Tauri updater artifactot és publikus updater kulcsot igényel; ez a réteg a csatorna, platformartifact és letöltési URL hiteles kiválasztását biztosítja.
