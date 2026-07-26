import { DownloadCloud, RefreshCw, ShieldCheck, UploadCloud } from 'lucide-react';
import type { FirmwareStatus } from '../types';

export function FirmwarePage({ firmware, busy, onRefresh, onUpdate }: { firmware: FirmwareStatus | null; busy: boolean; onRefresh: () => void; onUpdate: () => void }) {
  const available = firmware?.availableFirmware;
  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">ARDUINO OTA</p><h2>Firmware-frissítés</h2></div><button className="secondary" onClick={onRefresh} disabled={busy}><RefreshCw size={17}/> Ellenőrzés</button></div>
    <section className="stats-grid">
      <article className="stat-card"><small>Telepített verzió</small><strong>{firmware?.installedVersion ?? 'Ismeretlen'}</strong></article>
      <article className="stat-card"><small>Elérhető verzió</small><strong>{available?.firmwareVersion ?? available?.tag ?? 'Nincs adat'}</strong></article>
      <article className="stat-card"><small>OTA feltöltő</small><strong>{firmware?.otaToolInstalled ? 'Telepítve' : 'Telepíteni kell'}</strong></article>
      <article className="stat-card"><small>OTA jelszó</small><strong>{firmware?.otaPasswordConfigured ? 'Beállítva' : 'Hiányzik'}</strong></article>
    </section>
    <section className="panel firmware-panel">
      <div className="firmware-icon"><ShieldCheck size={34}/></div>
      <div><h3>{firmware?.message ?? 'Kattints az ellenőrzésre.'}</h3><p>{firmware?.otaToolInstalled ? `OTA feltöltő: ${firmware.otaToolPath ?? 'megtalálva'} • Port: 65280 (fix)` : firmware?.otaToolError ?? 'Az arduinoOTA feltöltőt telepíteni kell a hálózati frissítéshez.'}</p><p>{available ? `${available.name} • ${available.createdAt ?? available.tag}` : firmware?.firmwareLookupError ?? 'A GitHub firmware-kiadás még nincs lekérve.'}</p></div>
      <button onClick={onUpdate} disabled={busy || !firmware?.otaToolInstalled || !firmware?.otaPasswordConfigured || !available || !firmware?.updateAvailable}><UploadCloud size={18}/> Firmware telepítése</button>
    </section>
    <div className="notice"><DownloadCloud size={18}/> Az OTA-port fixen <b>65280</b>. A program a GitHub <b>firmware-latest</b> kiadásából tölti le a `.ino.bin` fájlt, ellenőrzi a SHA-256 értéket, majd a helyi `arduinoOTA` feltöltővel telepíti.</div>
  </div>;
}
