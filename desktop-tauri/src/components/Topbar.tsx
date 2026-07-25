import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

export function Topbar({ online, message, busy, onRefresh }: { online: boolean; message: string; busy: boolean; onRefresh: () => void }) {
  return <header className="topbar"><div><p className="eyebrow">2026_MAX_LED VEZÉRLŐRENDSZER</p><h1>Arduino LED Controller</h1><p className="status-line">{online ? <Wifi size={15}/> : <WifiOff size={15}/>} {message}</p></div><button className="secondary" onClick={onRefresh} disabled={busy}><RefreshCw size={17} className={busy ? 'spin' : ''}/> Frissítés</button></header>;
}
