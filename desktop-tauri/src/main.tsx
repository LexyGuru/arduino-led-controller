import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './styles.css';

type Config = { arduinoIp: string; arduinoPort: number };
type Strip = { id: number; enabled: boolean; brightness: number; effect: number; speed: number; color: [number, number, number] };
type Status = { connected: boolean; firmwareVersion?: string; rssi?: number; uptime?: number; strips?: Strip[]; http?: { lastClientIp?: string; lastPath?: string; requests?: number; timeouts?: number } };
type Log = { timestamp: string; type: string; message: string };

const effects = ['Statikus', 'Villogás', 'Lélegzés', 'Szivárvány', 'Futófény'];

function App() {
  const [config, setConfig] = useState<Config>({ arduinoIp: '10.0.0.117', arduinoPort: 80 });
  const [status, setStatus] = useState<Status | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [message, setMessage] = useState('Kapcsolatra vár…');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const [nextStatus, nextLogs] = await Promise.all([
        invoke<Status>('arduino_status'),
        invoke<Log[]>('arduino_logs')
      ]);
      setStatus(nextStatus); setLogs(nextLogs.slice().reverse());
      setMessage(`Kapcsolódva: ${config.arduinoIp}`);
    } catch (error) { setMessage(`Arduino nem érhető el: ${String(error)}`); }
  };

  useEffect(() => { invoke<Config>('load_config').then(setConfig).catch(() => undefined); }, []);
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 15000); return () => window.clearInterval(timer); }, [config.arduinoIp, config.arduinoPort]);

  const saveConfig = async () => {
    setBusy(true);
    try { await invoke('save_config', { config }); setMessage('Arduino-célgép mentve.'); await refresh(); }
    catch (error) { setMessage(`Mentési hiba: ${String(error)}`); }
    finally { setBusy(false); }
  };

  const updateStrip = async (strip: Strip, changes: Partial<Strip>) => {
    setBusy(true);
    try {
      await invoke('set_led', { id: strip.id, enabled: changes.enabled ?? strip.enabled, brightness: changes.brightness ?? strip.brightness, effect: changes.effect ?? strip.effect, speed: changes.speed ?? strip.speed, color: changes.color ?? strip.color });
      await refresh();
    } catch (error) { setMessage(`LED hiba: ${String(error)}`); }
    finally { setBusy(false); }
  };

  return <main>
    <header><div><p className="eyebrow">NATÍV ASZTALI ALKALMAZÁS · TAURI</p><h1>Arduino LED Controller</h1><p className="muted">{message}</p></div><button onClick={() => void refresh()} disabled={busy}>Frissítés</button></header>
    <section className="grid overview">
      <article><span>Kapcsolat</span><strong className={status?.connected ? 'ok' : 'bad'}>{status?.connected ? 'Online' : 'Offline'}</strong></article>
      <article><span>Firmware</span><strong>{status?.firmwareVersion ?? '—'}</strong></article>
      <article><span>Wi‑Fi jel</span><strong>{status?.rssi == null ? '—' : `${status.rssi} dBm`}</strong></article>
      <article><span>Utolsó kliens</span><strong>{status?.http?.lastClientIp ?? '—'}</strong><small>{status?.http?.lastPath ?? ''}</small></article>
    </section>
    <section className="panel settings"><h2>Kapcsolat</h2><label>Arduino IP<input value={config.arduinoIp} onChange={(event) => setConfig({ ...config, arduinoIp: event.target.value })} /></label><label>Port<input type="number" min="1" max="65535" value={config.arduinoPort} onChange={(event) => setConfig({ ...config, arduinoPort: Number(event.target.value) })} /></label><button onClick={() => void saveConfig()} disabled={busy}>Célgép mentése</button></section>
    <section className="panel"><h2>LED vezérlés</h2><div className="leds">{(status?.strips ?? []).map((strip) => <article className="strip" key={strip.id}><div><h3>LED {strip.id}</h3><label className="switch"><input type="checkbox" checked={strip.enabled} onChange={(event) => void updateStrip(strip, { enabled: event.target.checked })} /><span>{strip.enabled ? 'Bekapcsolva' : 'Kikapcsolva'}</span></label></div><label>Fényerő <input type="range" min="0" max="255" value={strip.brightness} onChange={(event) => void updateStrip(strip, { brightness: Number(event.target.value) })} /></label><label>Effekt<select value={strip.effect} onChange={(event) => void updateStrip(strip, { effect: Number(event.target.value) })}>{effects.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label><label>Sebesség<input type="range" min="1" max="100" value={strip.speed} onChange={(event) => void updateStrip(strip, { speed: Number(event.target.value) })} /></label></article>)}</div></section>
    <section className="panel"><h2>Arduino eseménynapló</h2><p className="muted">Az itt látható kliens-IP bizonyítja, hogy a kérés elért az Arduinoig.</p><div className="logs">{logs.length ? logs.map((log, index) => <p key={`${log.timestamp}-${index}`}><time>{log.timestamp}</time><b>{log.type}</b>{log.message}</p>) : <p>Nincs elérhető esemény.</p>}</div></section>
  </main>;
}

import { createRoot } from 'react-dom/client';
createRoot(document.getElementById('root')!).render(<App />);
