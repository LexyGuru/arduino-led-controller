/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ALLOW_PERSISTENT_BEARER?:
    string;
}

interface ImportMeta {
  readonly env:
    ImportMetaEnv;
}
