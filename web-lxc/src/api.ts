export type Strip={id:number;enabled:boolean;brightness:number;effect:number;speed:number;color:number[];manualOverride?:boolean};
export type Status={connected?:boolean;deviceName?:string;deviceId?:string;firmwareVersion?:string;directApiVersion?:string;ipAddress?:string;rssi?:number;timezoneId?:string;timesynced?:boolean;scheduleCount?:number;scheduleRevision?:number;scheduler?:string;uptime?:number;strips?:Strip[];[key:string]:unknown};

async function json<T>(url:string,init?:RequestInit):Promise<T>{
  const response=await fetch(url,{...init,headers:{Accept:'application/json','Content-Type':'application/json',...(init?.headers||{})}});
  const text=await response.text();
  let body:any=null;
  if(text){try{body=JSON.parse(text)}catch{body=text}}
  if(!response.ok)throw new Error(`${response.status} ${response.statusText}${body?`: ${typeof body==='string'?body:JSON.stringify(body)}`:''}`);
  return body as T;
}
export const api={
  live:()=>json<any>('/health/live'),
  ready:()=>json<Status>('/health/ready'),
  status:()=>json<Status>('/api/v1/status'),
  logs:(afterId=0)=>json<any>(`/api/v1/logs?afterId=${afterId}`),
  schedules:()=>json<any>('/api/v1/schedules'),
  scheduleStatus:()=>json<any>('/api/v1/schedules/status'),
  otaStatus:()=>json<any>('/api/v1/ota/status'),
  firmwareCatalog:()=>json<any>('/api/v1/server/firmware/catalog'),
  setLed:(strip:Strip)=>json<any>(`/api/v1/leds/${strip.id}`,{method:'PUT',body:JSON.stringify({enabled:strip.enabled,brightness:strip.brightness,effect:strip.effect,speed:strip.speed,color:strip.color})})
};
