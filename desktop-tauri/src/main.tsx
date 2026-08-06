import {
  invoke
} from '@tauri-apps/api/core';

import {
  createRoot
} from 'react-dom/client';

import App from './App';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './design-system/ThemeProvider';

import {
  DesktopApiProvider,
  type CreateDesktopApiOptions
} from './api';

import './styles.css';
import './beta7-theme.css';
import './api-v2.css';
import './dashboard-led-api-v2.css';
import './schedule-firmware-logs-api-v2.css';
import './native-credential-bridge.css';
import './release-finalization.css';
import './lxc-orchestration.css';

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

const desktopInvoke:
  CreateDesktopApiOptions[
    'invoke'
  ] =
    tauriAvailable
      ? (
          command,
          arguments_
        ) =>
          invoke<unknown>(
            command,
            arguments_ as
              Parameters<
                typeof invoke
              >[1]
          )
      : undefined;

createRoot(
  document.getElementById(
    'root'
  )!
).render(
  <DesktopApiProvider
    options={{
      invoke:
        desktopInvoke,
      allowPersistentBearer:
        persistentBearerEnabled
    }}
  >
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  </DesktopApiProvider>
);
