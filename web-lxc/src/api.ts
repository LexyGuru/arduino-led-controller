export type Strip={id:number;enabled:boolean;brightness:number;effect:number;speed:number;color:number[];manualOverride?:boolean};

export type Status={
  connected?:boolean;deviceName?:string;deviceId?:string;firmwareVersion?:string;
  directApiVersion?:string;ipAddress?:string;rssi?:number;timezoneId?:string;
  timesynced?:boolean;scheduleCount?:number;scheduleRevision?:number;
  scheduleChecksum?:string;scheduler?:string;uptime?:number;clockDay?:number;
  clockHour?:number;clockMinute?:number;strips?:Strip[];[key:string]:unknown
};

export type ScheduleRawEntry={index:number;payload:string};
export type ScheduleStatus={
  success?:boolean;requestId?:number;count:number;max:number;revision:number;
  checksum:string;stored:boolean;storageLayout?:string;activeSlot?:number;
  abSlots?:boolean;readbackAfterWrite?:boolean;transactionActive?:boolean
};

export type ServerInfo={
  service:string;platform:string;configPath:string;updateConfigPath:string;
  installedVersion:string|null;installedCommit:string|null;channel:string|null;
  branch:string|null;firmwareCatalogPath:string|null;
  firmwareCatalogAvailable:boolean;webRoot:string
};

async function json<T>(url:string,init?:RequestInit):Promise<T>{
  const response=await fetch(url,{...init,headers:{Accept:'application/json','Content-Type':'application/json',...(init?.headers||{})}});
  const text=await response.text();
  let body:any=null;
  if(text){try{body=JSON.parse(text)}catch{body=text}}
  if(!response.ok){
    const detail=body?.error||body?.message||(typeof body==='string'?body:'');
    throw new Error(`${response.status} ${response.statusText}${detail?`: ${detail}`:''}`);
  }
  return body as T;
}

async function schedulesAll():Promise<{count:number;revision:number;entries:ScheduleRawEntry[]}>{
  const entries:ScheduleRawEntry[]=[];
  let offset=0,count=0,revision=0;
  do{
    const page=await json<any>(`/api/v1/schedules?offset=${offset}&limit=8`);
    count=Number(page?.count||0);
    revision=Number(page?.revision||0);
    const chunk=Array.isArray(page?.entries)?page.entries:[];
    entries.push(...chunk);
    offset+=chunk.length;
    if(chunk.length===0) break;
  }while(offset<count && offset<60);
  return {count,revision,entries};
}

async function replaceSchedules(payloads:string[],expectedRevision:number){
  const begin=await json<any>('/api/v1/schedules/transactions',{method:'POST',body:JSON.stringify({expectedRevision,total:payloads.length})});
  const tx=String(begin.transactionId);
  try{
    for(let i=0;i<payloads.length;i++){
      await json(`/api/v1/schedules/transactions/${tx}/chunks`,{method:'PUT',body:JSON.stringify({index:i,payload:payloads[i]})});
    }
    return await json(`/api/v1/schedules/transactions/${tx}/commit`,{method:'POST',body:'{}'});
  }catch(error){
    try{await json(`/api/v1/schedules/transactions/${tx}`,{method:'DELETE'})}catch{}
    throw error;
  }
}

export const api={
  live:()=>json<any>('/health/live'),
  ready:()=>json<Status>('/health/ready'),
  status:()=>json<Status>('/api/v1/status'),
  logs:(afterId=0)=>json<any>(`/api/v1/logs?afterId=${afterId}`),
  clearLogs:()=>json<any>('/api/v1/logs/clear',{method:'POST',body:'{}'}),
  schedules:schedulesAll,
  scheduleStatus:()=>json<ScheduleStatus>('/api/v1/schedules/status'),
  replaceSchedules,
  deleteAllSchedules:()=>json<any>('/api/v1/schedules',{method:'DELETE'}),
  otaStatus:()=>json<any>('/api/v1/ota/status'),
  firmwareCatalog:()=>json<any>('/api/v1/server/firmware/catalog'),
  serverInfo:()=>json<ServerInfo>('/api/v1/server/info'),
  setLed:(strip:Strip)=>json<any>(`/api/v1/leds/${strip.id}`,{method:'PUT',body:JSON.stringify({enabled:strip.enabled,brightness:strip.brightness,effect:strip.effect,speed:strip.speed,color:strip.color})}),
  setAllLeds:(patch:Partial<Strip>)=>json<any>('/api/v1/leds/all',{method:'POST',body:JSON.stringify(patch)})
};
