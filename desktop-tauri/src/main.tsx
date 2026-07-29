import {
  invoke
} from '@tauri-apps/api/core';

import {
  createRoot
} from 'react-dom/client';

import App from './App';

import {
  DesktopApiProvider
} from './api';

import './styles.css';
import './api-v2.css';
import './dashboard-led-api-v2.css';
import './schedule-firmware-logs-api-v2.css';
import './native-credential-bridge.css';

const tauriAvailable =
  typeof globalThis !==
    'undefined' &&
  '__TAURI_INTERNALS__' in
    globalThis;

const persistentBearerEnabled =
  tauriAvailable &&
  String(
    import.meta.env
      .VITE_ALLOW_PERSISTENT_BEARER ??
    '1'
  ) !== '0';

createRoot(
  document.getElementById(
    'root'
  )!
).render(
  <DesktopApiProvider
    options={{
      invoke:
        tauriAvailable
          ? invoke
          : undefined,
      allowPersistentBearer:
        persistentBearerEnabled
    }}
  >
    <App />
  </DesktopApiProvider>
);
