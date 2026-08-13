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
import './theme-engine-v2.css';
import './core-ui-v1.5.css';
import './v55-dashboard-stats-logs.css';
import './v55-management-ui.css';
import './v55-app-update-center.css';
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


const writeDiagnosticLog = (
  level: string, category: string, event: string, message: string,
  fields?: Record<string, unknown>
) => {
  if (!tauriAvailable) return;
  void invoke('diagnostic_log_event', { level, category, event, message, fields: fields ?? null }).catch(() => {});
};

writeDiagnosticLog('info', 'app', 'APP_START', 'Arduino LED Controller frontend started.', {
  userAgent: navigator.userAgent,
  language: navigator.language
});

globalThis.addEventListener('error', (event) => {
  writeDiagnosticLog('error', 'errors', 'FRONTEND_ERROR', event.message || 'Unhandled frontend error', {
    filename: event.filename, line: event.lineno, column: event.colno
  });
});

globalThis.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason instanceof Error
    ? `${event.reason.name}: ${event.reason.message}`
    : String(event.reason ?? 'Unknown unhandled rejection');
  writeDiagnosticLog('error', 'errors', 'UNHANDLED_REJECTION', reason);
});

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
