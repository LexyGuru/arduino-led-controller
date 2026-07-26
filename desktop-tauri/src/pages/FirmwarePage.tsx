import { DownloadCloud, RefreshCw, ShieldCheck, UploadCloud } from 'lucide-react';
import type { FirmwareStatus } from '../types';

export function FirmwarePage({ firmware, busy, onRefresh, onUpdate }: { firmware: FirmwareStatus | null; busy: boolean; onRefresh: () => void; onUpdate: () => void }) {
  const available = firmware?.availableFirmware;
  const otaTarget = firmware?.otaTargetAddress
    ? `${firmware.otaTargetAddress}:${firmware.otaTargetPort ?? 65280}`
    : 'Az Arduino státuszából lesz meghatározva';

  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">ARDUINO OTA</p><h2>Firmware-frissítés</h2></div><button className="secondary" onClick={onRefresh} disabled={busy}><RefreshCw size={17}/> Ellenőrzés</button></div>
    <section className="stats-grid">
      <article className="stat-card"><small>Telepített verzió</small><strong>{firmware?.installedVersion ?? 'Ismeretlen'}</strong></article>
      <article className="stat-card"><small>Elérhető verzió</small><strong>{available?.firmwareVersion ?? available?.tag ?? 'Nincs adat'}</strong></article>
      <article className="stat-card"><small>OTA feltöltő</small><strong>{firmware?.otaToolInstalled ? 'Telepítve' : 'Telepíteni kell'}</strong></article>
      <article className="stat-card"><small>OTA cél</small><strong>{otaTarget}</strong></article>
    </section>
    <section className="panel firmware-panel">
      <div className="firmware-icon"><ShieldCheck size={34}/></div>
      <div><h3>{firmware?.message ?? 'Kattints az ellenőrzésre.'}</h3><p>{firmware?.otaToolInstalled ? `OTA feltöltő: ${firmware.otaToolPath ?? 'megtalálva'} • Cél: ${otaTarget}` : firmware?.otaToolError ?? 'Az arduinoOTA feltöltőt telepíteni kell a hálózati frissítéshez.'}</p><p>OTA-jelszó: {firmware?.otaPasswordConfigured ? 'beállítva' : 'hiányzik'}.</p><p>{available ? `${available.name} • ${available.createdAt ?? available.tag}` : firmware?.firmwareLookupError ?? 'A GitHub firmware-kiadás még nincs lekérve.'}</p></div>
      <button onClick={onUpdate} disabled={busy || !firmware?.otaToolInstalled || !firmware?.otaPasswordConfigured || !available || !firmware?.updateAvailable || !firmware?.arduinoOnline}><UploadCloud size={18}/> Firmware telepítése</button>
    </section>
    <div className="notice"><DownloadCloud size={18}/> A program a GitHub <b>firmware-latest</b> kiadásából tölti le a `.ino.bin` fájlt, ellenőrzi a SHA-256 értéket, majd az Arduino `/api/status` válaszában kapott belső IP-címre és OTA-portra tölti fel. A DDNS-cím kizárólag a HTTP API elérésére szolgál.</div>
  </div>;
}
