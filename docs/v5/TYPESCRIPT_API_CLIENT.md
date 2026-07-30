# OpenAPI TypeScript kliens

A kliens forrása a `docs/api/openapi-v2.json`. Nem használ külső codegen
függőséget.

Generálás a repository gyökeréből:

```bash
npm run generate:api-client
```

Vagy a desktop mappából:

```bash
cd desktop-tauri
npm run api:generate
```

Generált fájlok:

```text
desktop-tauri/src/api/generated/api-v2-types.ts
desktop-tauri/src/api/generated/api-v2-operations.ts
desktop-tauri/src/api/generated/api-v2-client.ts
desktop-tauri/src/api/generated/index.ts
```

A kliens támogatja a Bearer tokent, a session cookie-t, a CSRF fejlécet,
az útvonal- és query-paramétereket, az AbortSignal megszakítást és az egységes
`ApiClientError` hibát.
