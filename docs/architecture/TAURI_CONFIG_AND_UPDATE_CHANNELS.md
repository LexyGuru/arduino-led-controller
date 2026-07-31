# Tauri Direct konfiguráció és frissítési csatornák

Az F15 csomag egységesíti a kézzel szerkeszthető helyi és távoli IP/DDNS célokat, API-portokat, privát API-pathot, OTA-hostot és portot, az arduinoOTA bináris útvonalát, valamint a stable és beta kiadási csatornákat.

Az uploader helyi folyamatként fut, az OTA célja mindig az Arduino. macOS-en az első automatikus jelölt `/usr/local/bin/arduinoOTA`, de a kézi útvonal minden platformon elsőbbséget élvez. A frissítés GitHub Release manifestből történik; a branch nem frissítési endpoint.

A következő csomag köti rá a tényleges alkalmazás-updatert, a firmware letöltést, SHA-256 ellenőrzést és az élő OTA process-eseményeket.
