import { CalendarClock, Cpu, Gauge, Lightbulb, ScrollText, Settings } from 'lucide-react';
import type { PageId } from '../types';
const items: Array<{ id: PageId; label: string; icon: typeof Gauge }> = [
  { id: 'dashboard', label: 'Áttekintés', icon: Gauge }, { id: 'leds', label: 'LED vezérlés', icon: Lightbulb },
  { id: 'schedules', label: 'Időzítések', icon: CalendarClock }, { id: 'firmware', label: 'Firmware OTA', icon: Cpu },
  { id: 'logs', label: 'Naplók', icon: ScrollText }, { id: 'settings', label: 'Beállítások', icon: Settings }
];
interface SidebarProps {
  page: PageId;
  onChange: (page: PageId) => void;
  appVersion: string;
  firmwareVersion?: string;
  otaSupported: boolean;
}

export function Sidebar({ page, onChange, appVersion, firmwareVersion, otaSupported }: SidebarProps) {
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark">L</span><div><strong>LED Controller</strong><small>Standalone Tauri</small></div></div>
    <nav>{items.filter((item) => otaSupported || item.id !== 'firmware').map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => onChange(id)}><Icon size={19}/><span>{label}</span></button>)}</nav>
    <div className="sidebar-footer">
      <small>Arduino UNO R4 WiFi</small>
      <b>Firmware v{firmwareVersion ?? '–'}</b>
      <span>Alkalmazás v{appVersion}</span>
    </div>
  </aside>;
}
