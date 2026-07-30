# Natív credential regressziós teszt hotfix

A natív credential bridge bevezette a `credential_status` probe parancsot.

A korábbi `test-desktop-credential-vault.js` mock csak a következő parancsokat
kezelte:

- `credential_get`
- `credential_set`
- `credential_delete`

Ezért az első probe hibát dobott, a vault helyesen memóriás fallbackre váltott,
majd a régi teszt tévesen elvárta a natív `credential_delete` meghívását.

A hotfix a mockot az aktuális bridge-szerződéshez igazítja, és ellenőrzi mind a
négy natív parancsot:

- `credential_status`
- `credential_get`
- `credential_set`
- `credential_delete`

A runtime credential implementáció nem változik.
