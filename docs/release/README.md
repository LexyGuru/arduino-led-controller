# Arduino LED Controller – Release Source of Truth

> **Kanonikus Release Architecture v2.** Ha nem egyértelmű, hogy „ki kivel van”, innen kell indulni.

## Jelenlegi branch-identitás

| Terület | Érték |
|---|---|
| Branch | `main` |
| Application | `5.1.0` |
| App channel | `stable` |
| App updater | `updater-stable` |
| Firmware channel | `stable` |
| Firmware available | `false` |
| Recommended firmware | `nincs stabil firmware promótálva` |
| Direct API | `1.0.0` |

## A négy külön release-doboz

| Product | Stable | Beta |
|---|---|---|
| Application | `main` + `updater-stable` + normál GitHub release | `next/v5-rearchitecture` + `updater-beta` + prerelease |
| Firmware | stable firmware catalog + stable firmware release family | beta firmware catalog + beta firmware release family |

**Az Application és a Firmware verziószáma nem összetartozó számsor.**

## Branch policy
- `main` = Stable application contract.
- `next/v5-rearchitecture` = Beta application contract.
- Stable firmware catalogba Beta firmware nem kerülhet.
- Beta firmware catalogba Stable firmware nem kerülhet.
- App-only release architecture módosítás nem módosíthatja a firmware forrást.

## Compatibility
A `release-versions.json` schema v2 explicit `applicationRelease` és `firmwareRelease` objektumokat tartalmaz. A régi scalar mezők átmenetileg megmaradnak. Mainen a legacy `firmware` mező csak kompatibilitási adat; Stable firmware elérhetőségre az új `firmwareRelease.available` mezőből kell következtetni.
