import { Save, ShieldCheck } from 'lucide-react';
import type { ConnectionConfig } from '../types';

export function SettingsPage({ config, busy, onChange, onSave, otaPassword, onOtaPasswordChange }: { config: ConnectionConfig; busy: boolean; onChange: (config: ConnectionConfig) => void; onSave: () => void; otaPassword: string; onOtaPasswordChange: (value: string) => void }) {
  return <div className="page"><section className="panel settings-panel"><div className="panel-title"><div><p className="eyebrow">KAPCSOLAT ÉS VÉDELEM</p><h2>Arduino és OTA</h2></div><ShieldCheck/></div><div className="form-grid">
    <label>Arduino IP-cím vagy DDNS-név<input value={config.arduinoIp} onChange={(e) => onChange({...config, arduinoIp: e.target.value})} placeholder="10.0.0.117 vagy lexyguruhome.ddns.net"/></label>
    <label>HTTP-port<input type="number" min="1" max="65535" value={config.arduinoPort} onChange={(e) => onChange({...config, arduinoPort: Number(e.target.value)})}/></label>
    <label className="wide">Titkos API-útvonal<input value={config.arduinoApiPath} onChange={(e) => onChange({...config, arduinoApiPath: e.target.value})} placeholder="/hosszu_veletlen_utvonal_2026"/></label>
    <label className="wide">API-kulcs<input type="password" value={config.arduinoApiKey} onChange={(e) => onChange({...config, arduinoApiKey: e.target.value})} placeholder="Legalább 24 karakter"/></label>
    <label>OTA feltöltési port<input type="text" value="65280 (fix)" readOnly disabled/></label>
    <label>Új OTA-jelszó<input type="password" value={otaPassword} onChange={(e) => onOtaPasswordChange(e.target.value)} placeholder="Üresen hagyva nem változik"/></label>
  </div><div className="notice"><ShieldCheck size={18}/><p>A normál vezérlés közvetlenül az Arduino HTTP API-ját használja. A firmware mindig a LexyGuru/arduino-led-controller firmware-latest GitHub kiadásából érkezik. Az OTA-port fixen 65280, nem módosítható. Az arduinoOTA feltöltőt a program automatikusan megkeresi az alkalmazásban, az Arduino IDE/CLI mappáiban és a rendszer PATH-jában. Az OTA-jelszó külön, 600-as fájljogosultságú helyi titokfájlba kerül.</p></div><button onClick={onSave} disabled={busy}><Save size={17}/> Beállítások mentése</button></section></div>;
}
