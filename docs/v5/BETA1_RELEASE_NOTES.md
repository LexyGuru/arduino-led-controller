# Arduino LED Controller 5.0.0-beta.1

Ez a V5 új architektúrájának első nyilvános béta-prerelease kiadása. A Beta.1 az Alpha.3-ban hardveresen validált `X-Device-Key` Arduino-hitelesítésre, a 30 másodperces kliensoldali válaszablakra, az egységes Node API v2 rétegre és a Tauri 2 kliensre épül.

## Kiemelt változások

- `X-Device-Key` fejléc-alapú Arduino-hitelesítés Node és Tauri kliensekben.
- 5 másodperces Tauri TCP-kapcsolódási és 30 másodperces válasz-timeout.
- Moduláris Node.js API v2, eseménykezelés, jogosultságok, diagnosztika és release-gate infrastruktúra.
- Natív Tauri kliens Windows, macOS, Linux, Android és iOS/iPadOS platformokra.
- Verziózott Debian/Proxmox LXC szervercsomag automatikus health ellenőrzéssel és rollbackkel.
- UNO R4 WiFi firmware `4.1.21` bináris külön kiadási eszközként.
- Minden kiadási fájlhoz közös `SHA256SUMS` és géppel olvasható `RELEASE-MANIFEST.json`.
- CycloneDX SBOM, build-provenance és automatikus release-titokvizsgálati jelentés.

## Kiadási fájlok

- Windows x86_64: NSIS `.exe` telepítő.
- macOS Apple Silicon: `.dmg`.
- macOS Intel: külön `.dmg`.
- Linux x86_64: `.AppImage` és `.deb`.
- Android: telepíthető APK; aláíró secretek nélkül debug APK készül. Az AAB Play Store feltöltéshez használható, de közvetlenül nem telepíthető.
- iPhone/iPad: aláíratlan `.ipa`, amely külön Apple-aláírást vagy sideload eszközt igényel.
- Debian/Proxmox LXC: verziózott `.tar.gz` szervercsomag.
- Arduino UNO R4 WiFi: firmware `.bin`.

## Biztonsági állapot

- Az első béta publikálást a `next/v5-rearchitecture` ágon kizárólag a Beta workflow vagy a Beta distribution manifest módosítását tartalmazó, szűrt push indítja; később kézzel is újrafuttatható, amikor a workflow már elérhető a default ágon.
- A GitHub kiadás prerelease, és nem lesz „Latest” kiadás.
- A `main` ág nem módosul.
- Automatikus produkciós telepítés nincs.
- A produkciós Arduino `10.0.0.123` a Beta LXC telepítőben alapból tiltott.
- A firmware build nem frissíti a `firmware-latest` kiadást.

## Ismert korlátozások

- A macOS csomag jelenleg nincs Apple Developer ID-val aláírva és notarizálva.
- A Windows telepítő nincs kódtanúsítvánnyal aláírva, ezért SmartScreen figyelmeztetés jelenhet meg.
- Android release-aláírás csak a repository Android signing secretekkel készül; ezek nélkül debug APK és aláíratlan AAB lesz.
- Az iOS/iPadOS IPA aláíratlan, ezért közvetlen App Store-telepítésre nem alkalmas.
- A Linux desktop kiadás x86_64. Az LXC szervercsomag forrásalapú, ezért megfelelő Node.js környezetben amd64 és arm64 Debian/LXC rendszeren is használható.
- Az Arduino firmware `4.1.21` átmenetileg engedélyezheti a régi query-key fallbacket; az új kliensek kizárólag fejlécet használnak.

## Ellenőrzés

A letöltött fájlokat telepítés előtt ellenőrizd a release-ben található `SHA256SUMS` alapján. A teljes fájllista, méret és SHA-256 érték a `RELEASE-MANIFEST.json` fájlban is szerepel.

Részletes telepítési útmutató: `BETA1_INSTALLATION_GUIDE.md`.

Kiadás utáni platform- és staging-ellenőrzőlista: `BETA1_RELEASE_CHECKLIST.md`.
