import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './styles.css';

type Config = { arduinoIp: string; arduinoPort: number };
type Strip = { id: number; enabled: boolean; brightness: number; effect: number; speed: number; color: [number, number, number] };
type Status = { connected: boolean; firmwareVersion?: string; rssi?: number; uptime?: number; strips?: Strip[]; http?: { lastClientIp?: string; lastPath?: string; requests?: number; timeouts?: number } };
type Log = { timestamp: string; type: string; message: string };
type NetworkLog = { timestamp: number; endpoint: string; ok: boolean; message: string };
type BootCheck = { label: string; ok: boolean; detail: string };

const effects = ['Statikus', 'Villogás', 'Lélegzés', 'Szivárvány', 'Futófény'];

function App() {
  const [config, setConfig] = useState<Config>({ arduinoIp: '10.0.0.117', arduinoPort: 80 });
  const [status, setStatus] = useState<Status | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [arduinoLogError, setArduinoLogError] = useState('');
  const [networkLogs, setNetworkLogs] = useState<NetworkLog[]>([]);
  const [message, setMessage] = useState('Kapcsolatra vár…');
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(true);
  const [startupDone, setStartupDone] = useState(false);
  const [bootChecks, setBootChecks] = useState<BootCheck[]>([]);

  const refresh = async () => {
    const [statusResult, logsResult] = await Promise.allSettled([
      invoke<Status>('arduino_status'),
      invoke<Log[]>('arduino_logs')
    ]);
    if (statusResult.status === 'fulfilled') {
      setStatus(statusResult.value);
      setMessage(`Kapcsolódva: ${config.arduinoIp}`);
    } else setMessage(`Arduino nem érhető el: ${String(statusResult.reason)}`);
    if (logsResult.status === 'fulfilled') {
      setLogs(logsResult.value.slice().reverse());
      setArduinoLogError('');
    } else setArduinoLogError(String(logsResult.reason));
    const diagnostics = await invoke<NetworkLog[]>('network_logs').catch(() => []);
    setNetworkLogs(diagnostics.slice().reverse());
  };

  useEffect(() => {
    void (async () => {
      const savedConfig = await invoke<Config>('load_config').catch(() => config);
      setConfig(savedConfig);
      const checks = await invoke<BootCheck[]>('boot_checks').catch((error) => [{ label: 'Indítási ellenőrzés', ok: false, detail: String(error) }]);
      setBootChecks(checks);
      setStartupDone(true);
    })();
  }, []);
  useEffect(() => {
    if (starting) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(timer);
  }, [starting, config.arduinoIp, config.arduinoPort]);

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

  if (starting) return <main className="startup"><section className="startup-card"><p className="eyebrow">ARDUINO LED CONTROLLER · INDÍTÁS</p><h1>{startupDone ? 'Ellenőrzés kész' : 'Betöltés…'}</h1><p className="muted">A program a helyi modulokat, az internet-elérést és az Arduino kapcsolatot ellenőrzi.</p><div className="boot-checks">{bootChecks.length ? bootChecks.map((check) => <p key={check.label}><b className={check.ok ? 'ok' : 'bad'}>{check.ok ? '✓' : '!'}</b><span>{check.label}</span><small>{check.detail}</small></p>) : <p><b className="loading-dot">●</b><span>Indítómodulok betöltése</span><small>Folyamatban…</small></p>}</div><button onClick={() => setStarting(false)} disabled={!startupDone}>Tovább az alkalmazásba</button></section></main>;

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
    <section className="panel"><h2>Arduino eseménynapló</h2><p className="muted">Az itt látható kliens-IP bizonyítja, hogy a kérés elért az Arduinoig.</p>{arduinoLogError && <p className="bad">A napló külön hibája: {arduinoLogError}</p>}<div className="logs">{logs.length ? logs.map((log, index) => <p key={`${log.timestamp}-${index}`}><time>{log.timestamp}</time><b>{log.type}</b>{log.message}</p>) : <p>Nincs elérhető esemény.</p>}</div></section>
    <section className="panel"><h2>Alkalmazás hálózati napló</h2><p className="muted">Ez a Macen futó Tauri alkalmazás saját naplója; akkor is látható, ha az Arduino nem válaszol.</p><div className="logs">{networkLogs.length ? networkLogs.map((log, index) => <p key={`${log.timestamp}-${index}`}><time>{new Date(log.timestamp * 1000).toLocaleTimeString()}</time><b className={log.ok ? 'ok' : 'bad'}>{log.ok ? 'SIKER' : 'HIBA'}</b><span>{log.endpoint} · {log.message}</span></p>) : <p>Még nincs hálózati kérés.</p>}</div></section>
  </main>;
}

import { createRoot } from 'react-dom/client';
createRoot(document.getElementById('root')!).render(<App />);
