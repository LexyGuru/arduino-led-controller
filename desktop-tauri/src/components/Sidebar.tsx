import {
  CalendarClock,
  Cpu,
  Gauge,
  Lightbulb,
  ScrollText,
  Settings
} from 'lucide-react';
import { useEffect } from 'react';
import { useI18n } from '../i18n';
import type { PageId } from '../types';
import { V5BetaBadge } from './v5/V5BetaBadge';

const items: Array<{
  id: PageId;
  key: string;
  icon: typeof Gauge;
}> = [
  {id:'dashboard',key:'nav.dashboard',icon:Gauge},
  {id:'leds',key:'nav.leds',icon:Lightbulb},
  {id:'schedules',key:'nav.schedules',icon:CalendarClock},
  {id:'firmware',key:'nav.firmware',icon:Cpu},
  {id:'logs',key:'nav.logs',icon:ScrollText},
  {id:'settings',key:'nav.settings',icon:Settings}
];

interface SidebarProps {
  page: PageId;
  onChange: (page: PageId) => void;
  appVersion: string;
  firmwareVersion?: string;
  otaSupported: boolean;
  updateAvailable?: boolean;
  latestAppVersion?: string;
}

export function Sidebar({
  page,
  onChange,
  appVersion,
  firmwareVersion,
  updateAvailable = false,
  latestAppVersion
}: SidebarProps) {
  const { t } = useI18n();

  useEffect(() => {
    const tauriRuntime =
      typeof globalThis !== 'undefined' &&
      '__TAURI_INTERNALS__' in globalThis;

    if (!tauriRuntime) {
      return undefined;
    }

    let disposed = false;
    let unlisten: (() => void) | undefined;

    // V5_DAY_NIGHT_ICON_POLICY
    const currentDayNightIconTheme = (): 'light' | 'dark' => {
      const hour = new Date().getHours();
      return hour >= 7 && hour < 19 ? 'light' : 'dark';
    };

    const syncDayNightIcon = async () => {
      if (disposed) return;
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        if (disposed) return;
        await invoke<string>('macos_sync_app_icon', {
          theme: currentDayNightIconTheme()
        });
      } catch {
        // Non-macOS Tauri targets and transient startup states are harmless.
      }
    };

    const installThemeListener = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        if (disposed) return;

        const stop = await getCurrentWindow().onThemeChanged(() => {
          void syncDayNightIcon();
        });

        if (disposed) stop();
        else unlisten = stop;
      } catch {
        // Native theme listener is optional.
      }
    };

    void syncDayNightIcon();

    const timer = window.setInterval(() => {
      void syncDayNightIcon();
    }, 60_000);

    void installThemeListener();

    return () => {
      disposed = true;
      window.clearInterval(timer);
      unlisten?.();
    };
  }, [appVersion]);

  return (
    <aside className="sidebar core-sidebar">
      <div className="brand core-brand">
        <span className="brand-mark" aria-hidden="true">
          <img src="/v5-icon.png" alt="" />
        </span>
        <div className="core-brand-copy">
          <strong>LED Controller</strong>
          <small>{t('brand.directArduino')}</small>
        </div>
        <span className="core-version-pill">UI 1.5</span>
      </div>

      <div className="core-nav-label">{t('core.navigation')}</div>
      <nav aria-label={t('core.primaryNavigation')}>
        {items.map(({ id, key, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className={page === id ? 'active' : ''}
            aria-current={page === id ? 'page' : undefined}
            onClick={() => onChange(id)}
          >
            <span className="core-nav-icon"><Icon size={19} /></span>
            <span>{t(key)}</span>
            {id === 'settings' && updateAvailable && (
              <i
                className="v55-sidebar-update-dot"
                aria-label={t('appUpdate.available')}
              />
            )}
            <span className="core-nav-indicator" aria-hidden="true" />
          </button>
        ))}
      </nav>

      <div className="sidebar-footer core-sidebar-footer">
        <div className="core-device-line">
          <span className="core-device-dot" />
          <div>
            <small>Arduino UNO R4 WiFi</small>
            <b>{t('sidebar.firmware', { version: firmwareVersion ?? '–' })}</b>
          </div>
        </div>
        <span className="core-app-version">
          {t('sidebar.application', { version: appVersion })}
          <V5BetaBadge version={appVersion} compact />
        </span>
      </div>
    </aside>
  );
}
