import{useMemo,useState}from'react';
import{FileClock,RadioTower,TerminalSquare}from'lucide-react';
import{V5DataSourceBadge}from'../components/v5/V5DataSourceBadge';
import{V5LogToolbar}from'../components/v5/V5LogToolbar';
import{useV5Logs}from'../hooks/useV5Logs';
import{useTauriAudit}from'../hooks/useTauriAudit';
import{useI18n}from'../i18n';
import type{ArduinoLog,NetworkLog}from'../types';
const match=(v:unknown,q:string)=>!q||String(v||'').toLowerCase().includes(q.toLowerCase());
const time=(n:number,l:string)=>new Date(n).toLocaleTimeString(l==='de'?'de-DE':l==='en'?'en-US':'hu-HU',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
export function LogsPage({arduino,network,error}:{arduino:ArduinoLog[];network:NetworkLog[];error?:string|null}){
 const{t,language}=useI18n();const state=useV5Logs({legacyArduino:arduino,legacyNetwork:network,legacyError:error});const local=useTauriAudit();const[query,setQuery]=useState('');
 const consoleLogs=useMemo(()=>state.consoleLogs.filter(x=>match(`${x.type} ${x.message} ${x.timestamp}`,query)),[query,state.consoleLogs]);
 const actions=useMemo(()=>[...local.entries].reverse().filter(x=>x.level==='action'||x.level==='success').filter(x=>match(`${x.source} ${x.action} ${x.message}`,query)).slice(0,100),[local.entries,query]);
 const tauri=useMemo(()=>[...local.entries.map(x=>({id:x.id,timestamp:x.timestamp,level:x.level,source:x.source,message:x.message})),...state.networkLogs.map((x,i)=>({id:`network-${x.timestamp}-${i}`,timestamp:x.timestamp*1000,level:x.ok?'info':'error',source:'network',message:`${x.endpoint} · ${x.message}`}))].sort((a,b)=>b.timestamp-a.timestamp).filter(x=>match(`${x.level} ${x.source} ${x.message}`,query)).slice(0,300),[local.entries,query,state.networkLogs]);
 return <div className="page">
  <div className="page-heading"><div><p className="eyebrow">{t('logs.eyebrow')}</p><h2>{t('logs.title')}</h2></div><V5DataSourceBadge source={state.source}/></div>
  <V5LogToolbar query={query} onQuery={setQuery} busy={state.busy} apiAvailable={!state.directFallback} onClear={()=>{local.clear();void state.clearConsole();}}/>
  {state.error&&<p className="console-warning">{state.error.code}: {state.error.message}</p>}
  <section className="v5-log-grid">
   <article className="panel"><div className="panel-title"><div><p className="eyebrow">ARDUINO</p><h2>{t('logs.consoleCache')}</h2></div><RadioTower/></div><div className="log-list">{consoleLogs.length?consoleLogs.map((x,i)=><div key={x.id||`${x.timestamp}-${i}`}><time>{x.timestamp||'—'}</time><b>{x.type==='console'?t('logs.console'):(x.type||'info').toUpperCase()}</b><span>{x.message||''}</span></div>):<p className="muted">{t('logs.noConsole')}</p>}</div></article>
   <article className="panel"><div className="panel-title"><div><p className="eyebrow">{t('logs.localAudit')}</p><h2>{t('logs.recentActions')}</h2></div><FileClock/></div><div className="v5-observability-list tauri-audit-list">{actions.length?actions.map(x=><div key={x.id} className={`audit-entry ${x.level}`}><time>{time(x.timestamp,language)}</time><b>{x.source}</b><span>{x.message}</span></div>):<p className="muted">{t('logs.noRecentActions')}</p>}</div></article>
   <article className="panel tauri-audit-console-panel"><div className="panel-title"><div><p className="eyebrow">{t('logs.tauriAudit')}</p><h2>{t('logs.tauriAuditTitle')}</h2></div><TerminalSquare/></div><div className="tauri-audit-console" role="log" aria-live="polite">{tauri.length?tauri.map(x=><div key={x.id} className={`tauri-audit-line ${x.level}`}><time>{time(x.timestamp,language)}</time><b>{x.level}</b><code>{x.source}</code><span>{x.message}</span></div>):<p className="muted">{t('logs.noTauriAudit')}</p>}</div></article>
  </section>
 </div>
}
