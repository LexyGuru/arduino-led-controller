# Mobilalkalmazás telepítése és használata

A mobilalkalmazás ugyanazt a LED-vezérlést, időzítéseket és diagnosztikát használja, mint a desktop Tauri kliens, de **Androidon, iPhone-on és iPaden nincs firmware OTA-frissítés**. Firmware-t Windows, macOS vagy Linux gépről frissíts.

## Közös hálózati feltételek

1. A telefon vagy tablet legyen ugyanazon a helyi hálózaton, mint az Arduino, vagy használj biztonságos VPN-kapcsolatot.
2. Az alkalmazásban add meg az Arduino címét, HTTP-portját, privát API-útvonalát és API-kulcsát.
3. Az első kapcsolatkor engedélyezd a helyi hálózati hozzáférést.
4. Ne nyisd ki az Arduino OTA-portját az internet felé.

## Android

### APK telepítése

1. A GitHub Release oldalról töltsd le az aktuális `.apk` fájlt.
2. Nyisd meg a letöltést a telefonon.
3. Android 8 vagy újabb rendszer esetén engedélyezd az adott alkalmazásnak — például a böngészőnek vagy fájlkezelőnek — az **Ismeretlen alkalmazások telepítése** jogosultságot.
4. Telepítsd az APK-t.
5. Első indításkor engedélyezd a helyi hálózati hozzáférést, amennyiben a rendszer kéri.

A `.aab` fájl nem közvetlenül telepíthető; az elsősorban Google Play kiadáshoz készült.

### Frissítés

A meglévő Android alkalmazás felülírható újabb APK-val, ha ugyanazzal az Android aláírókulccsal készült. A debug és release aláírás nem cserélhető egymással közvetlenül; ilyenkor a régi alkalmazást előbb el kell távolítani.

## iPhone és iPad

A GitHub Actions **aláíratlan IPA** fájlt készít. Ezt az App Store nem telepíti közvetlenül; előbb Apple-fiókkal alá kell írni, például Sideloadly segítségével.

### 1. Sideloadly telepítése

1. Töltsd le a Sideloadly alkalmazást a hivatalos oldalról: `https://sideloadly.io/`.
2. Telepítsd Windowsra vagy macOS-re.
3. Csatlakoztasd az iPhone-t vagy iPadet USB-kábellel.
4. Oldd fel az eszközt, és fogadd el a **Megbízik ebben a számítógépben?** kérdést.

### 2. Az IPA aláírása és telepítése

1. Töltsd le a GitHub Release-ből az `Arduino_LED_Controller_<verzió>_unsigned.ipa` fájlt.
2. Húzd az IPA-t a Sideloadly ablakába.
3. Válaszd ki a csatlakoztatott iPhone-t vagy iPadet.
4. Add meg az Apple-fiók e-mail-címét, majd indítsd el a sideload folyamatot.
5. Kövesd a Sideloadly és az Apple hitelesítési lépéseit.
6. Várd meg, amíg az alkalmazás megjelenik a készüléken.

A Sideloadly tájékoztatása szerint ingyenes Apple-fejlesztői fiókkal a sideloadolt alkalmazás általában 7 napig érvényes, majd újra alá kell írni. Fizetős Apple Developer fiókkal az érvényesség akár 1 év lehet. Ingyenes fióknál az egyidejű sideloadolt alkalmazások száma is korlátozott.

### 3. Developer Mode bekapcsolása

Az iOS 16 / iPadOS 16 és újabb rendszereken a helyileg telepített fejlesztői alkalmazások futtatásához Developer Mode szükséges.

1. Az IPA telepítése vagy az eszköz fejlesztői számítógéphez csatlakoztatása után nyisd meg:

```text
Beállítások → Adatvédelem és biztonság → Fejlesztői mód
```

2. Kapcsold be a Fejlesztői módot.
3. Az eszköz újraindul.
4. Újraindítás után erősítsd meg az engedélyezést, és add meg a készülék jelkódját.

Ha a Fejlesztői mód menüpont még nem jelenik meg, csatlakoztasd újra az eszközt a számítógéphez, indítsd el ismét a Sideloadly telepítést, majd ellenőrizd újra a beállításokat.

### 4. Fejlesztői profil megbízhatóvá tétele

Ha az iPhone vagy iPad „Nem megbízható fejlesztő” üzenetet mutat:

```text
Beállítások → Általános → VPN és eszközfelügyelet
```

Válaszd ki az Apple-fiókhoz tartozó fejlesztői profilt, majd engedélyezd a megbízhatóságot. Újabb iOS/iPadOS verziókon a rendszer újraindítást is kérhet.

### 5. Helyi hálózati engedély

Az első indításkor engedélyezd, hogy az Arduino LED Controller hozzáférjen a helyi hálózathoz. Utólag itt ellenőrizhető:

```text
Beállítások → Adatvédelem és biztonság → Helyi hálózat
```

### 6. iOS/iPadOS alkalmazás frissítése

Az új IPA-t ugyanazzal az Apple-fiókkal és ugyanazzal a bundle ID-val telepítsd. Így a Sideloadly felülírhatja a korábbi verziót. Az alkalmazás eltávolítása előtt mentsd el vagy jegyezd fel a kapcsolati beállításokat.

## Mobilos korlátozások

Mobilon elérhető:

- LED-sávok vezérlése;
- fényerő, szín, effekt és sebesség;
- heti időzítések kezelése és Arduino EEPROM-szinkron;
- Arduino állapot és konzolnapló;
- hálózati és API-beállítások.

Mobilon nem elérhető:

- Arduino firmware OTA-frissítése;
- macOS Terminal vagy külső `arduinoOTA` használata;
- desktop-specifikus fájl- és rendszerintegrációk.

## Biztonsági megjegyzés

Csak a projekt hivatalos GitHub Release oldaláról származó APK/IPA fájlt használj. A sideloadolt alkalmazások aláírása és telepítése a készülék tulajdonosának felelőssége.
