import { useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, DownloadCloud, RefreshCw, ShieldCheck, Terminal, UploadCloud } from 'lucide-react';
import type { FirmwareStatus, OtaProgressEvent } from '../types';

interface FirmwarePageProps {
  firmware: FirmwareStatus | null;
  busy: boolean;
  otaLogs: OtaProgressEvent[];
  otaProgress: number;
  otaStage: string;
  onRefresh: () => void;
  onUpdate: () => void;
}

function logTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function FirmwarePage({ firmware, busy, otaLogs, otaProgress, otaStage, onRefresh, onUpdate }: FirmwarePageProps) {
  const available = firmware?.availableFirmware;
  const otaTarget = firmware?.otaTargetAddress
    ? `${firmware.otaTargetAddress}:${firmware.otaTargetPort ?? 65280}`
    : 'Az Arduino státuszából lesz meghatározva';
  const otaActive = busy && otaLogs.length > 0;
  const lastLog = otaLogs.at(-1);
  const consoleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = consoleRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [otaLogs]);

  return <div className="page">
    <div className="page-heading">
      <div><p className="eyebrow">ARDUINO OTA</p><h2>Firmware-frissítés</h2></div>
      <button className="secondary" onClick={onRefresh} disabled={busy}><RefreshCw className={busy ? 'spin' : ''} size={17}/> Ellenőrzés</button>
    </div>

    <section className="stats-grid">
      <article className="stat-card"><small>Telepített verzió</small><strong>{firmware?.installedVersion ?? 'Ismeretlen'}</strong></article>
      <article className="stat-card"><small>Elérhető verzió</small><strong>{available?.firmwareVersion ?? available?.tag ?? 'Nincs adat'}</strong></article>
      <article className="stat-card"><small>OTA feltöltő</small><strong>{firmware?.otaToolInstalled ? 'Telepítve' : 'Telepíteni kell'}</strong></article>
      <article className="stat-card"><small>OTA cél</small><strong>{otaTarget}</strong></article>
    </section>

    <section className="panel firmware-panel">
      <div className="firmware-icon"><ShieldCheck size={34}/></div>
      <div>
        <h3>{firmware?.message ?? 'Kattints az ellenőrzésre.'}</h3>
        <p>{firmware?.otaToolInstalled ? `OTA feltöltő: ${firmware.otaToolPath ?? 'megtalálva'} • Cél: ${otaTarget}` : firmware?.otaToolError ?? 'Az arduinoOTA feltöltőt telepíteni kell a hálózati frissítéshez.'}</p>
        <p>OTA-jelszó: {firmware?.otaPasswordConfigured ? 'beállítva' : 'hiányzik'}.</p>
        <p>{available ? `${available.name} • ${available.createdAt ?? available.tag}` : firmware?.firmwareLookupError ?? 'A GitHub firmware-kiadás még nincs lekérve.'}</p>
      </div>
      <button onClick={onUpdate} disabled={busy || !firmware?.otaToolInstalled || !firmware?.otaPasswordConfigured || !available || !firmware?.updateAvailable || !firmware?.arduinoOnline}>
        <UploadCloud size={18}/> {busy ? 'Firmware telepítése…' : 'Firmware telepítése'}
      </button>
    </section>

    <section className="panel ota-progress-panel">
      <div className="panel-title">
        <div><p className="eyebrow">VALÓS IDEJŰ OTA</p><h2>Frissítési konzol</h2></div>
        <div className={`ota-state-badge ${lastLog?.level ?? 'idle'}`}>
          {lastLog?.level === 'error' ? <AlertTriangle size={15}/> : lastLog?.level === 'success' ? <CheckCircle2 size={15}/> : <Terminal size={15}/>} 
          {otaStage}
        </div>
      </div>

      <div className="ota-progress-summary">
        <div>
          <strong>{otaActive ? 'Frissítés folyamatban' : otaProgress === 100 ? 'Frissítés befejezve' : 'Nincs folyamatban frissítés'}</strong>
          <span>{lastLog?.message ?? 'A „Firmware telepítése” gomb után itt jelenik meg a letöltés, ellenőrzés és feltöltés minden lépése.'}</span>
        </div>
        <b>{otaProgress}%</b>
      </div>
      <div className="ota-progress-track" aria-label={`OTA folyamat ${otaProgress}%`}>
        <div style={{ width: `${otaProgress}%` }}/>
      </div>

      <div ref={consoleRef} className="ota-console" role="log" aria-live="polite">
        {otaLogs.length === 0 ? <div className="ota-console-empty">Még nincs OTA-napló. Indítsd el a firmware telepítését.</div> : otaLogs.map((entry, index) => (
          <div key={`${entry.timestamp}-${index}`} className={`ota-console-line ${entry.level}`}>
            <time>{logTime(entry.timestamp)}</time>
            <b>{entry.stage}</b>
            <span>{entry.message}</span>
            <code>{typeof entry.progress === 'number' ? `${entry.progress}%` : ''}</code>
          </div>
        ))}
      </div>
    </section>

    <div className="notice"><DownloadCloud size={18}/> A program a GitHub <b>firmware-latest</b> kiadásából tölti le a `.ino.bin` fájlt, ellenőrzi a SHA-256 értéket, majd az Arduino `/api/status` válaszában kapott belső IP-címre és OTA-portra tölti fel. Az `arduinoOTA` program nyers kimenete is megjelenik a konzolban.</div>
  </div>;
}
