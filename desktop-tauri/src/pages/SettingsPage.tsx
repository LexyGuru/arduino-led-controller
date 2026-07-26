import { Save, ShieldCheck } from 'lucide-react';
import type { ConnectionConfig } from '../types';

export function SettingsPage({ config, busy, onChange, onSave, otaPassword, onOtaPasswordChange }: { config: ConnectionConfig; busy: boolean; onChange: (config: ConnectionConfig) => void; onSave: () => void; otaPassword: string; onOtaPasswordChange: (value: string) => void }) {
  return <div className="page"><section className="panel settings-panel"><div className="panel-title"><div><p className="eyebrow">KAPCSOLAT ÉS VÉDELEM</p><h2>Arduino és OTA</h2></div><ShieldCheck/></div><div className="form-grid">
    <label>Helyi Arduino IP-cím<input value={config.localArduinoIp} onChange={(e) => onChange({...config, localArduinoIp: e.target.value})} placeholder="10.0.0.123"/></label>
    <label>Helyi HTTP-port<input type="number" min="1" max="65535" value={config.localArduinoPort} onChange={(e) => onChange({...config, localArduinoPort: Number(e.target.value)})}/></label>
    <label>Távoli Arduino DDNS/IP<input value={config.arduinoIp} onChange={(e) => onChange({...config, arduinoIp: e.target.value})} placeholder="lexyguruhome.ddns.net"/></label>
    <label>Távoli HTTP-port<input type="number" min="1" max="65535" value={config.arduinoPort} onChange={(e) => onChange({...config, arduinoPort: Number(e.target.value)})}/></label>
    <label className="wide checkbox-label"><input type="checkbox" checked={config.preferLocal} onChange={(e) => onChange({...config, preferLocal: e.target.checked})}/> Helyi kapcsolat előnyben részesítése</label>
    <label className="wide">Titkos API-útvonal<input value={config.arduinoApiPath} onChange={(e) => onChange({...config, arduinoApiPath: e.target.value})} placeholder="/hosszu_veletlen_utvonal_2026"/></label>
    <label className="wide">API-kulcs<input type="password" value={config.arduinoApiKey} onChange={(e) => onChange({...config, arduinoApiKey: e.target.value})} placeholder="Legalább 24 karakter"/></label>
    <label>OTA feltöltési port<input type="text" value="65280 (Arduino státuszból)" readOnly disabled/></label>
    <label>Új OTA-jelszó<input type="password" value={otaPassword} onChange={(e) => onOtaPasswordChange(e.target.value)} placeholder="Üresen hagyva nem változik"/></label>
  </div><div className="notice"><ShieldCheck size={18}/><p>Otthoni hálózaton mindig a helyi címet használd: <b>10.0.0.123:80</b>. A DDNS-cím csak távoli HTTP-tartalék. A helyi hálózatról a saját nyilvános DDNS-cím használata NAT-loopback időtúllépést okozhat. Az OTA kizárólag a státuszban kapott belső IP-címre és OTA-portra fut.</p></div><button onClick={onSave} disabled={busy}><Save size={17}/> Beállítások mentése</button></section></div>;
}
