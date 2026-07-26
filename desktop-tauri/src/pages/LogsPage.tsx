import type { ArduinoLog, NetworkLog } from '../types';

export function LogsPage({ arduino, network }: { arduino: ArduinoLog[]; network: NetworkLog[] }) {
  return <div className="page logs-layout"><section className="panel"><p className="eyebrow">ARDUINO</p><h2>Élő Arduino konzol</h2><div className="log-list">{arduino.length ? arduino.map((log,i) => <div key={log.id || `${log.timestamp}-${i}`}><time>{log.timestamp}</time><b>{log.type === 'console' ? 'KONZOL' : log.type.toUpperCase()}</b><span>{log.message}</span></div>) : <p className="muted">Nincs elérhető Arduino-konzolsor.</p>}</div></section>
  <section className="panel"><p className="eyebrow">TAURI KLIENS</p><h2>Hálózati napló</h2><div className="log-list">{network.length ? network.map((log,i) => <div key={`${log.timestamp}-${i}`}><time>{new Date(log.timestamp*1000).toLocaleTimeString('hu-HU')}</time><b className={log.ok ? 'ok' : 'bad'}>{log.ok ? 'SIKER' : 'HIBA'}</b><span>{log.endpoint} · {log.message}</span></div>) : <p className="muted">Még nincs hálózati kérés.</p>}</div></section></div>;
}
