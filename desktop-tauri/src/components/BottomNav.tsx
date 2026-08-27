import {
  CalendarClock,
  Cpu,
  Gauge,
  Lightbulb,
  Menu,
  ScrollText,
  Settings,
  X
} from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../i18n';
import type { PageId } from '../types';
import type { SettingsTarget } from '../settings-navigation';

const primaryItems: Array<{
  id: PageId;
  key: string;
  icon: typeof Gauge;
}> = [
  { id: 'dashboard', key: 'nav.dashboard', icon: Gauge },
  { id: 'leds', key: 'nav.leds', icon: Lightbulb },
  { id: 'schedules', key: 'nav.schedules', icon: CalendarClock }
];

const moreItems: Array<{
  id: PageId;
  key: string;
  icon: typeof Gauge;
}> = [
  { id: 'firmware', key: 'nav.firmware', icon: Cpu },
  { id: 'logs', key: 'nav.logs', icon: ScrollText },
  { id: 'settings', key: 'nav.settings', icon: Settings }
];

export function BottomNav({
  page,
  onChange,
  updateAvailable = false
}: {
  page: PageId;
  onChange: (page: PageId, settingsTarget?: SettingsTarget) => void;
  updateAvailable?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const moreActive = moreItems.some((item) => item.id === page);

  const choose = (id: PageId, target?: SettingsTarget) => {
    onChange(id, target);
    setOpen(false);
  };

  return (
    <>
      {open && (
        <div className="mobile-more-sheet" role="dialog" aria-modal="true" aria-label={t('core.more')}>
          <button
            type="button"
            className="mobile-more-backdrop"
            aria-label={t('core.close')}
            onClick={() => setOpen(false)}
          />
          <section className="mobile-more-panel">
            <div className="mobile-more-head">
              <div>
                <p className="eyebrow">{t('core.navigation')}</p>
                <strong>{t('core.more')}</strong>
              </div>
              <button type="button" className="core-icon-button" onClick={() => setOpen(false)} aria-label={t('core.close')}>
                <X size={19} />
              </button>
            </div>
            <div className="mobile-more-grid">
              {moreItems.map(({ id, key, icon: Icon }) => (
                <button
                  type="button"
                  key={id}
                  className={page === id ? 'active' : ''}
                  onClick={() => choose(id, id === 'settings' && updateAvailable ? 'updates' : undefined)}
                >
                  <span className="mobile-more-icon"><Icon size={21} /></span>
                  <span>{t(key)}</span>
                  {id === 'settings' && updateAvailable && (
                    <i className="beta5-settings-update-dot" aria-label={t('appUpdate.available')} />
                  )}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      <nav className="bottom-nav" aria-label={t('core.mobileNavigation')}>
        {primaryItems.map(({ id, key, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className={page === id ? 'active' : ''}
            aria-current={page === id ? 'page' : undefined}
            onClick={() => choose(id)}
          >
            <Icon size={21} />
            <span>{t(key)}</span>
          </button>
        ))}
        <button
          type="button"
          className={moreActive || open ? 'active' : ''}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <Menu size={21} />
          <span>{t('core.more')}</span>
        </button>
      </nav>
    </>
  );
}
