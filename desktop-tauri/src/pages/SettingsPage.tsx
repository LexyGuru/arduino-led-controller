import { Save, ShieldCheck } from 'lucide-react';
import type { ConnectionConfig } from '../types';

export function SettingsPage({ config, busy, onChange, onSave, otaPassword, onOtaPasswordChange }: { config: ConnectionConfig; busy: boolean; onChange: (config: ConnectionConfig) => void; onSave: () => void; otaPassword: string; onOtaPasswordChange: (value: string) => void }) {
  return <div className="page"><section className="panel settings-panel"><div className="panel-title"><div><p className="eyebrow">KAPCSOLAT ÉS VÉDELEM</p><h2>Arduino és OTA</h2></div><ShieldCheck/></div><div className="form-grid">
    <label>Helyi Arduino IP-cím<input value={config.localArduinoIp} onChange={(e: any) => onChange({...config, localArduinoIp: e.target.value})} placeholder="10.0.0.123"/></label>
    <label>Helyi HTTP-port<input type="number" min="1" max="65535" value={config.localArduinoPort} onChange={(e: any) => onChange({...config, localArduinoPort: Number(e.target.value)})}/></label>
    <label>Távoli Arduino DDNS/IP<input value={config.arduinoIp} onChange={(e: any) => onChange({...config, arduinoIp: e.target.value})} placeholder="lexyguruhome.ddns.net"/></label>
    <label>Távoli HTTP-port<input type="number" min="1" max="65535" value={config.arduinoPort} onChange={(e: any) => onChange({...config, arduinoPort: Number(e.target.value)})}/></label>
    <label className="wide checkbox-label"><input type="checkbox" checked={config.preferLocal} onChange={(e: any) => onChange({...config, preferLocal: e.target.checked})}/> Helyi HTTP-kapcsolat előnyben részesítése</label>

    <label>OTA cím (csak beépített módhoz)<input value={config.otaAddress} onChange={(e: any) => onChange({...config, otaAddress: e.target.value})} placeholder="lexyguruhome.ddns.net"/></label>
    <label>OTA port (csak beépített módhoz)<input type="number" min="1" max="65535" value={config.otaPort} onChange={(e: any) => onChange({...config, otaPort: Number(e.target.value)})}/><small>Ez a router publikus portja, nem feltétlenül 65280. Példa: külső 25667 → belső 10.0.0.123:65280.</small></label>
    <label>OTA feltöltési mód<select value={config.otaUploadMode} onChange={(e: any) => onChange({...config, otaUploadMode: e.target.value})}><option value="auto">Automatikus (macOS: Terminal, mobil/egyéb: beépített)</option><option value="terminal">macOS Terminal + arduinoOTA</option><option value="native">Beépített Tauri/Rust feltöltő</option></select></label>
    <label>arduinoOTA útvonala<input value={config.otaToolPath} onChange={(e: any) => onChange({...config, otaToolPath: e.target.value})} placeholder="/usr/local/bin/arduinoOTA"/></label>

    <label className="wide">Titkos API-útvonal<input value={config.arduinoApiPath} onChange={(e: any) => onChange({...config, arduinoApiPath: e.target.value})} placeholder="/hosszu_veletlen_utvonal_2026"/></label>
    <label className="wide">API-kulcs<input type="password" value={config.arduinoApiKey} onChange={(e: any) => onChange({...config, arduinoApiKey: e.target.value})} placeholder="Legalább 24 karakter"/></label>
    <label>Új OTA-jelszó<input type="password" value={otaPassword} onChange={(e: any) => onOtaPasswordChange(e.target.value)} placeholder="Üresen hagyva nem változik"/></label>
  </div><div className="notice"><ShieldCheck size={18}/><p><b>OTA célválasztás:</b> Mobilon és nem macOS rendszeren az automatikus mód a beépített Tauri/Rust OTA-motort használja. <b>macOS Terminal módban nincs kézzel beírt OTA IP:</b> az alkalmazás minden frissítés előtt lekéri az Arduino <code>/api/status</code> válaszát, és annak aktuális <code>ipAddress</code> + <code>otaPort</code> értékét adja át az arduinoOTA programnak. Így DHCP vagy másik Arduino használatakor is automatikusan a jelenlegi eszközcím kerül használatra. Az OTA cím/port mező csak a beépített Rust feltöltőhöz tartalék.</p></div><button onClick={onSave} disabled={busy}><Save size={17}/> Beállítások mentése</button></section></div>;
}
