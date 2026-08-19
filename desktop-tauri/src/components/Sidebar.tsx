import {
  CalendarClock,
  Cpu,
  Gauge,
  Lightbulb,
  ScrollText,
  Settings,
  DownloadCloud
} from 'lucide-react';
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


  return (
    <aside className="sidebar core-sidebar core-v3-sidebar">
      <div className="brand core-brand core-v3-brand">
        <span className="brand-mark" aria-hidden="true">
          <img src="/v5-icon.png" alt="" />
        </span>
        <div className="core-brand-copy">
          <strong>LED Controller</strong>
          <small>{t('brand.directArduino')}</small>
        </div>
        <span className="core-version-pill">UI 3.0</span>
        <span className="beta4-version-pill core-v3-release-pill">5.7 Beta.1</span>
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

      {updateAvailable && (
        <button
          type="button"
          className="v621-sidebar-update-card"
          onClick={() => onChange('settings')}
          aria-label={t('appUpdate.sidebarCta', {
            version: latestAppVersion ?? t('common.unknown')
          })}
        >
          <DownloadCloud size={17} />
          <span>
            <small>{t('appUpdate.available')}</small>
            <strong>{latestAppVersion ?? t('common.unknown')}</strong>
          </span>
        </button>
      )}

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
