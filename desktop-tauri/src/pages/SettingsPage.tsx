import { Save, ShieldCheck } from 'lucide-react';
import type { ConnectionConfig } from '../types';

export function SettingsPage({ config, busy, onChange, onSave, otaPassword, onOtaPasswordChange }: { config: ConnectionConfig; busy: boolean; onChange: (config: ConnectionConfig) => void; onSave: () => void; otaPassword: string; onOtaPasswordChange: (value: string) => void }) {
  return <div className="page"><section className="panel settings-panel"><div className="panel-title"><div><p className="eyebrow">KAPCSOLAT ÉS VÉDELEM</p><h2>Arduino és OTA</h2></div><ShieldCheck/></div><div className="form-grid">
    <label>Helyi Arduino IP-cím<input value={config.localArduinoIp} onChange={(e: any) => onChange({...config, localArduinoIp: e.target.value})} placeholder="10.0.0.123"/></label>
    <label>Helyi HTTP-port<input type="number" min="1" max="65535" value={config.localArduinoPort} onChange={(e: any) => onChange({...config, localArduinoPort: Number(e.target.value)})}/></label>
    <label>Távoli Arduino DDNS/IP<input value={config.arduinoIp} onChange={(e: any) => onChange({...config, arduinoIp: e.target.value})} placeholder="lexyguruhome.ddns.net"/></label>
    <label>Távoli HTTP-port<input type="number" min="1" max="65535" value={config.arduinoPort} onChange={(e: any) => onChange({...config, arduinoPort: Number(e.target.value)})}/></label>
    <label className="wide checkbox-label"><input type="checkbox" checked={config.preferLocal} onChange={(e: any) => onChange({...config, preferLocal: e.target.checked})}/> Helyi HTTP-kapcsolat előnyben részesítése</label>

    <label>OTA DDNS/IP-cím<input value={config.otaAddress} onChange={(e: any) => onChange({...config, otaAddress: e.target.value})} placeholder="lexyguruhome.ddns.net"/></label>
    <label>OTA külső port<input type="number" min="1" max="65535" value={config.otaPort} onChange={(e: any) => onChange({...config, otaPort: Number(e.target.value)})}/></label>
    <label>OTA feltöltési mód<select value={config.otaUploadMode} onChange={(e: any) => onChange({...config, otaUploadMode: e.target.value})}><option value="auto">Automatikus (macOS Terminal, ha elérhető)</option><option value="terminal">macOS Terminal + arduinoOTA</option><option value="native">Beépített Tauri/Rust feltöltő</option></select></label>
    <label>arduinoOTA útvonala<input value={config.otaToolPath} onChange={(e: any) => onChange({...config, otaToolPath: e.target.value})} placeholder="/usr/local/bin/arduinoOTA"/></label>

    <label className="wide">Titkos API-útvonal<input value={config.arduinoApiPath} onChange={(e: any) => onChange({...config, arduinoApiPath: e.target.value})} placeholder="/hosszu_veletlen_utvonal_2026"/></label>
    <label className="wide">API-kulcs<input type="password" value={config.arduinoApiKey} onChange={(e: any) => onChange({...config, arduinoApiKey: e.target.value})} placeholder="Legalább 24 karakter"/></label>
    <label>Új OTA-jelszó<input type="password" value={otaPassword} onChange={(e: any) => onOtaPasswordChange(e.target.value)} placeholder="Üresen hagyva nem változik"/></label>
  </div><div className="notice"><ShieldCheck size={18}/><p>Az OTA-cél külön van a HTTP API-tól. Ha a Mac nem éri el a belső <b>10.0.0.123</b> címet, add meg az OTA mezőben a No-IP/DDNS nevet. A routerben az itt megadott külső TCP-portot az Arduino belső <b>65280/TCP</b> portjára kell továbbítani. A Terminal mód a macOS beépített Terminal alkalmazásában futtatja az arduinoOTA programot, és a kimenetét visszaadja az OTA-konzolnak.</p></div><button onClick={onSave} disabled={busy}><Save size={17}/> Beállítások mentése</button></section></div>;
}
