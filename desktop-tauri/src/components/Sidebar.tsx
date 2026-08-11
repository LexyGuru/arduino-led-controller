import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { useEffect } from 'react';
import { CalendarClock, Cpu, Gauge, Lightbulb, ScrollText, Settings } from 'lucide-react';
import { useI18n } from '../i18n';
import type { PageId } from '../types';
import { V5BetaBadge } from './v5/V5BetaBadge';
const items: Array<{id:PageId; key:string; icon:typeof Gauge}>=[
{id:'dashboard',key:'nav.dashboard',icon:Gauge},{id:'leds',key:'nav.leds',icon:Lightbulb},{id:'schedules',key:'nav.schedules',icon:CalendarClock},{id:'firmware',key:'nav.firmware',icon:Cpu},{id:'logs',key:'nav.logs',icon:ScrollText},{id:'settings',key:'nav.settings',icon:Settings}];
interface SidebarProps { page:PageId; onChange:(page:PageId)=>void; appVersion:string; firmwareVersion?:string; otaSupported:boolean; }
export function Sidebar({page,onChange,appVersion,firmwareVersion,otaSupported}:SidebarProps){

  // V5_MACOS_DYNAMIC_ICON_SYNC
  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    // V5_DAY_NIGHT_ICON_POLICY
    // "Nappali" and "éjszakai" are intentionally based on the Mac's local
    // wall-clock time, independent of the app's own Light/Dark UI theme.
    const currentDayNightIconTheme = (): 'light' | 'dark' => {
      const hour = new Date().getHours();
      return hour >= 7 && hour < 19 ? 'light' : 'dark';
    };

    const syncDayNightIcon = async () => {
      if (disposed) return;
      try {
        await invoke<string>('macos_sync_app_icon', {
          theme: currentDayNightIconTheme()
        });
      } catch {
        // Non-macOS platforms and transient dev startup states are harmless.
      }
    };

    // Apply the correct day/night icon immediately at app startup.
    void syncDayNightIcon();

    // Re-check once per minute so the icon flips at the 07:00 / 19:00
    // boundary without restarting the application.
    const timer = window.setInterval(() => {
      void syncDayNightIcon();
    }, 60_000);

    // Keep the native system-theme event as an extra resync trigger. The
    // selection itself still comes from the local day/night clock policy.
    const currentWindow = getCurrentWindow();
    void currentWindow
      .onThemeChanged(() => {
        void syncDayNightIcon();
      })
      .then((stop) => {
        if (disposed) {
          stop();
        } else {
          unlisten = stop;
        }
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      unlisten?.();
    };
  }, [appVersion]);


 const {t}=useI18n();
 return <aside className="sidebar"><div className="brand"><span className="brand-mark" aria-hidden="true"><img src="/v5-icon.png" alt="" /></span><div><strong>LED Controller</strong><small>{t('brand.directArduino')}</small></div></div><nav>{items.map(({id,key,icon:Icon})=><button key={id} className={page===id?'active':''} onClick={()=>onChange(id)}><Icon size={19}/><span>{t(key)}</span></button>)}</nav><div className="sidebar-footer"><small>Arduino UNO R4 WiFi</small><b>{t('sidebar.firmware',{version:firmwareVersion??'–'})}</b><span><span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        {t('sidebar.application',{version:appVersion})}
        <V5BetaBadge version={appVersion} compact />
      </span></span></div></aside>;
}
