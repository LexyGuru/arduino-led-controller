import type { LedSchedule, ScheduleLed, ScheduleSaveResult, ScheduleSyncSnapshot } from '../types';

const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,Math.round(Number(v)||0)));

async function json<T>(url:string,init?:RequestInit):Promise<T>{
  const r=await fetch(url,{...init,headers:{Accept:'application/json','Content-Type':'application/json',...(init?.headers||{})}});
  const t=await r.text(); let b:any=null; if(t){try{b=JSON.parse(t)}catch{b=t}}
  if(!r.ok){const d=b?.error||b?.message||(typeof b==='string'?b:'');throw new Error(`${r.status} ${r.statusText}${d?`: ${d}`:''}`)}
  return b as T;
}

function decode(payload:string,index:number):LedSchedule{
  const h=String(payload||'').trim().toLowerCase();
  if(!/^[0-9a-f]{54}$/.test(h))throw new Error(`Érvénytelen 27 bájtos schedule payload: ${payload}`);
  const bytes:number[]=[]; for(let i=0;i<h.length;i+=2)bytes.push(parseInt(h.slice(i,i+2),16));
  const leds:ScheduleLed[]=[]; let p=3;
  for(let id=1;id<=3;id++){
    const apply=bytes[p++]!==0, enabled=bytes[p++]!==0, brightness=bytes[p++], effect=bytes[p++], speed=bytes[p++];
    const color:[number,number,number]=[bytes[p++],bytes[p++],bytes[p++]];
    if(apply)leds.push({id,enabled,brightness,effect,speed,color});
  }
  const day=clamp(bytes[0],1,7),hour=clamp(bytes[1],0,23),minute=clamp(bytes[2],0,59);
  return{id:`lxc-${index}-${day}-${hour}-${minute}`,day,time:`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`,leds};
}

function encode(s:LedSchedule):string{
  const[h,m]=s.time.split(':');
  const bytes:number[]=[clamp(s.day,1,7),clamp(Number(h),0,23),clamp(Number(m),0,59)];
  for(let id=1;id<=3;id++){
    const l=s.leds.find(x=>x.id===id);
    bytes.push(l?1:0,l?.enabled?1:0,clamp(l?.brightness??0,0,255),clamp(l?.effect??0,0,4),clamp(l?.speed??0,0,255),clamp(l?.color?.[0]??0,0,255),clamp(l?.color?.[1]??0,0,255),clamp(l?.color?.[2]??0,0,255));
  }
  return bytes.map(v=>v.toString(16).padStart(2,'0')).join('');
}

export async function loadLxcSchedules():Promise<ScheduleSyncSnapshot>{
  const entries:Array<{index:number;payload:string}>=[]; let offset=0,count=0,revision=0;
  do{
    const page=await json<any>(`/api/v1/schedules?offset=${offset}&limit=8`);
    count=Number(page?.count||0); revision=Number(page?.revision||0);
    const chunk=Array.isArray(page?.entries)?page.entries:[];
    entries.push(...chunk); offset+=chunk.length; if(!chunk.length)break;
  }while(offset<count&&offset<60);
  const st=await json<any>('/api/v1/schedules/status');
  const schedules=entries.map(e=>decode(e.payload,e.index));
  return{schedules,count:schedules.length,revision:Number(st?.revision??revision??0),checksum:String(st?.checksum??''),emptyActionCount:schedules.filter(x=>!x.leds.length).length,recoveredLegacyActionCount:0};
}

export async function saveLxcSchedules(schedules:LedSchedule[],expectedRevision:number|null):Promise<ScheduleSaveResult>{
  const before=await loadLxcSchedules(),payloads=schedules.map(encode);
  const begin=await json<any>('/api/v1/schedules/transactions',{method:'POST',body:JSON.stringify({expectedRevision:expectedRevision??before.revision,total:payloads.length})});
  const tx=String(begin.transactionId);
  try{
    for(let i=0;i<payloads.length;i++)await json(`/api/v1/schedules/transactions/${encodeURIComponent(tx)}/chunks`,{method:'PUT',body:JSON.stringify({index:i,payload:payloads[i]})});
    await json(`/api/v1/schedules/transactions/${encodeURIComponent(tx)}/commit`,{method:'POST',body:'{}'});
  }catch(e){
    try{await json(`/api/v1/schedules/transactions/${encodeURIComponent(tx)}`,{method:'DELETE'})}catch{}
    throw e;
  }
  const after=await loadLxcSchedules();
  return{...after,success:true,verifiedCount:after.count,revisionBefore:before.revision,revisionAfter:after.revision,checksumBefore:before.checksum,checksumAfter:after.checksum};
}
