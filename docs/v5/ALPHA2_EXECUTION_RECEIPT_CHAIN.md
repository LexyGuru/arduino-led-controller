# Alpha.2 execution receipt és véglegesítési lánc

## Cél

A `5.0.0-alpha.2` verziószinkron csak akkor kaphat végleges jóváhagyást, ha
ugyanarra a candidate commitra elkészült és érvényes:

1. staging deployment receipt;
2. rollback rehearsal receipt;
3. promotion deployment receipt.

A receipt-lánc a korábbi receipt fájl SHA-256 értékével láncolt.

## Receipt fájlok

```text
/var/lib/arduino-led-controller/release-execution/
├── staging-deployment.json
├── rollback-rehearsal.json
├── promotion-deployment.json
└── alpha2-finalization-approval.json
```

## Kötelező sorrend

```text
staging evidence
→ staging telepítés
→ staging receipt
→ rollback-próba
→ rollback receipt
→ promotion evidence
→ promotion telepítés
→ promotion receipt
→ véglegesítési readiness
→ FINALIZE_ALPHA2_VERSION_SYNC
```

## Biztonsági tulajdonságok

- mindhárom receipt ugyanarra a Git commitra vonatkozik;
- az evidence célverziója mindenhol `5.0.0-alpha.2`;
- a promotion receipt csak jóváhagyott promotion evidence-et fogad el;
- a rollback receipt a staging receipt fájl SHA-256 értékére hivatkozik;
- a promotion receipt a rollback receipt fájl SHA-256 értékére hivatkozik;
- minden receipt belső önellenőrző SHA-256 értéket tartalmaz;
- túl régi vagy jövőbeli receipt blokkolja a véglegesítést;
- a jóváhagyás önmagában nem módosít verziófájlokat és nem készít Git commitot.

## API

```text
GET    /api/v2/release/execution-receipts
GET    /api/v2/release/finalization-readiness
POST   /api/v2/release/actions/verify-finalization
POST   /api/v2/release/actions/approve-finalization
DELETE /api/v2/release/finalization-approval
```

A véglegesítési megerősítés pontos értéke:

```text
FINALIZE_ALPHA2_VERSION_SYNC
```
