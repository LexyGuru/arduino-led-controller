import { Activity, CalendarClock, Clock3, Cpu, Lightbulb, Radio, Wifi } from 'lucide-react';
import type { ArduinoStatus, LedSchedule } from '../types';

const dayNames = ['Hétfő','Kedd','Szerda','Csütörtök','Péntek','Szombat','Vasárnap'];
const effects = ['Statikus','Villogás','Lélegzés','Szivárvány','Futófény'];

function formatUptime(seconds?: number) {
  if (seconds == null) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days} nap ${hours} óra ${minutes} perc`;
}

function nextSchedule(items: LedSchedule[]) {
  if (!items.length) return null;
  const now = new Date();
  const currentDay = now.getDay() === 0 ? 7 : now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const sorted = [...items].sort((a,b) => a.day - b.day || a.time.localeCompare(b.time));
  return sorted.find((item) => item.day > currentDay || (item.day === currentDay && Number(item.time.slice(0,2))*60 + Number(item.time.slice(3,5)) >= currentMinutes)) ?? sorted[0];
}

export function DashboardPage({ status, schedules }: { status: ArduinoStatus | null; schedules: LedSchedule[] }) {
  const next = nextSchedule(schedules);
  const cards = [
    { label: 'Kapcsolat', value: status?.connected ? 'Online' : 'Offline', icon: Radio, good: status?.connected },
    { label: 'Firmware', value: status?.firmwareVersion ?? '—', icon: Cpu },
    { label: 'Wi-Fi jelerősség', value: status?.rssi == null ? '—' : `${status.rssi} dBm`, icon: Wifi },
    { label: 'Üzemidő', value: formatUptime(status?.uptime), icon: Clock3 }
  ];

  return <div className="page">
    <section className="stat-grid">{cards.map(({ label, value, icon: Icon, good }) => <article className="stat-card" key={label}><div className="icon-box"><Icon size={21}/></div><span>{label}</span><strong className={good === false ? 'bad' : good ? 'ok' : ''}>{value}</strong></article>)}</section>

    <section className="dashboard-grid">
      <article className="panel">
        <div className="panel-title"><div><p className="eyebrow">ÜTEMEZÉSEK</p><h2>Heti program</h2></div><CalendarClock/></div>
        <div className="details-grid compact"><div><span>Mentett esemény</span><strong>{schedules.length}</strong></div><div><span>Arduino szerint</span><strong>{status?.scheduleCount ?? schedules.length}</strong></div><div><span>Következő nap</span><strong>{next ? dayNames[next.day-1] : '—'}</strong></div><div><span>Következő időpont</span><strong>{next?.time ?? '—'}</strong></div></div>
      </article>

      <article className="panel">
        <div className="panel-title"><div><p className="eyebrow">LED-EK PILLANATKÉPE</p><h2>Aktuális állapot</h2></div><Lightbulb/></div>
        <div className="snapshot-list">{(status?.strips ?? []).map((strip) => <div className="snapshot-row" key={strip.id}>
          <span className="snapshot-dot" style={{background:`rgb(${strip.color.join(',')})`, opacity: strip.enabled ? 1 : .25}}/>
          <div><strong>LED {strip.id}</strong><small>{strip.enabled ? 'Bekapcsolva' : 'Kikapcsolva'} · {strip.brightness} · {effects[strip.effect] ?? `Effekt ${strip.effect}`}</small></div>
          <code>RGB({strip.color.join(',')})</code>
        </div>)}{!(status?.strips?.length) && <p className="muted">Nincs beolvasott LED-állapot.</p>}</div>
      </article>
    </section>

    <section className="panel"><div className="panel-title"><div><p className="eyebrow">RENDSZERÁLLAPOT</p><h2>Arduino HTTP kapcsolat</h2></div><Activity/></div><div className="details-grid"><div><span>Utolsó kliens</span><strong>{status?.http?.lastClientIp ?? '—'}</strong></div><div><span>Utolsó útvonal</span><strong>{status?.http?.lastPath ?? '—'}</strong></div><div><span>Kérések</span><strong>{status?.http?.requests ?? '—'}</strong></div><div><span>Időtúllépések</span><strong>{status?.http?.timeouts ?? '—'}</strong></div></div></section>
  </div>;
}
