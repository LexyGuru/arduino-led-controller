# Tauri jelenlegi állapot – F15

A desktop alkalmazásban jelenleg két párhuzamos kapcsolati modell él:

1. a Rust `Config` és `useController` közvetlenül az Arduino privát HTTP API-ját használja;
2. az `api/runtime` réteg egy régi V5/LXC szerver session- és Bearer-token modelljét őrzi.

A közvetlen firmware-szerződés: firmware `4.3.0-beta.2`, Direct API `1.0.0`, kizárólag `X-Device-Key` fejléc, query fallback nélkül.

Az F15 első csomagja egységes, tesztelhető Direct Mode profilszerződést vezet be. A Rust konfiguráció és a Settings UI átállítása a következő csomag feladata.
