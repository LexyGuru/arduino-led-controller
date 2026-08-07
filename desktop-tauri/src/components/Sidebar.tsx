import { CalendarClock, Cpu, Gauge, Lightbulb, ScrollText, Settings } from 'lucide-react';
import { useI18n } from '../i18n';
import type { PageId } from '../types';
const items: Array<{id:PageId; key:string; icon:typeof Gauge}>=[
{id:'dashboard',key:'nav.dashboard',icon:Gauge},{id:'leds',key:'nav.leds',icon:Lightbulb},{id:'schedules',key:'nav.schedules',icon:CalendarClock},{id:'firmware',key:'nav.firmware',icon:Cpu},{id:'logs',key:'nav.logs',icon:ScrollText},{id:'settings',key:'nav.settings',icon:Settings}];
interface SidebarProps { page:PageId; onChange:(page:PageId)=>void; appVersion:string; firmwareVersion?:string; otaSupported:boolean; }
export function Sidebar({page,onChange,appVersion,firmwareVersion,otaSupported}:SidebarProps){
 const {t}=useI18n();
 return <aside className="sidebar"><div className="brand"><span className="brand-mark" aria-hidden="true"><img src="/v5-icon.png" alt="" /></span><div><strong>LED Controller</strong><small>{t('brand.directArduino')}</small></div></div><nav>{items.filter(item=>otaSupported||item.id!=='firmware').map(({id,key,icon:Icon})=><button key={id} className={page===id?'active':''} onClick={()=>onChange(id)}><Icon size={19}/><span>{t(key)}</span></button>)}</nav><div className="sidebar-footer"><small>Arduino UNO R4 WiFi</small><b>{t('sidebar.firmware',{version:firmwareVersion??'–'})}</b><span>{t('sidebar.application',{version:appVersion})}</span></div></aside>;
}
