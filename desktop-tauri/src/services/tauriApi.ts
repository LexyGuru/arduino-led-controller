import { invoke } from '@tauri-apps/api/core';
import { loadLxcSchedules, saveLxcSchedules } from './lxcScheduleCodec';
import type { ArduinoCapabilities, ArduinoConsoleResponse, ArduinoDiagnosticsResult, ArduinoStatus, ConnectionConfig, FirmwareArtifact, FirmwareStatus, LedSchedule, LedStrip, LedTopology, NativeAppUpdateInfo, NetworkLog, OtaProgressEvent, RuntimeCapabilities, ScheduleBackup, ScheduleSaveProgressEvent, ScheduleSaveResult, ScheduleSyncSnapshot } from '../types';

const APP_VERSION='6.0.0-beta.5',CFG='alc.shared.lxc.config.v1',BACKUPS='alc.shared.lxc.schedule-backups.v1';
export const isTauriRuntime=()=>typeof globalThis!=='undefined'&&'__TAURI_INTERNALS__' in globalThis;

type SharedReadCacheEntry={at:number,value:unknown};
const sharedReadInflight=new Map<string,Promise<unknown>>();
const sharedReadCache=new Map<string,SharedReadCacheEntry>();
let sharedReadEpoch=0;

async function sharedRead<T>(
  key:string,
  ttlMs:number,
  loader:()=>Promise<T>,
  retryOnStale=true
):Promise<T>{
  const now=Date.now();
  const cached=sharedReadCache.get(key);
  if(ttlMs>0&&cached&&now-cached.at<ttlMs)return cached.value as T;

  const running=sharedReadInflight.get(key);
  if(running)return running as Promise<T>;

  const requestEpoch=sharedReadEpoch;
  const request=loader()
    .then(async value=>{
      if(requestEpoch!==sharedReadEpoch&&retryOnStale){
        sharedReadInflight.delete(key);
        return sharedRead(key,ttlMs,loader,false);
      }
      if(ttlMs>0&&requestEpoch===sharedReadEpoch){
        sharedReadCache.set(key,{at:Date.now(),value});
      }
      return value;
    })
    .finally(()=>{
      const active=sharedReadInflight.get(key);
      if(active===request)sharedReadInflight.delete(key);
    });

  sharedReadInflight.set(key,request);
  return request;
}

function invalidateSharedReads(...prefixes:string[]){
  sharedReadEpoch++;
  for(const key of sharedReadCache.keys()){
    if(prefixes.some(prefix=>key.startsWith(prefix)))sharedReadCache.delete(key);
  }
}

async function json<T>(url:string,init?:RequestInit):Promise<T>{
  const r=await fetch(url,{...init,headers:{Accept:'application/json','Content-Type':'application/json',...(init?.headers||{})}});
  const t=await r.text();let b:any=null;if(t){try{b=JSON.parse(t)}catch{b=t}}
  if(!r.ok){const d=b?.error||b?.message||(typeof b==='string'?b:'');const e=new Error(`${r.status} ${r.statusText}${d?`: ${d}`:''}`) as Error&{status?:number};e.status=r.status;throw e}
  return b as T;
}
function config():ConnectionConfig{
  try{const s=localStorage.getItem(CFG);if(s)return JSON.parse(s)}catch{}
  return{profileName:'Proxmox LXC',language:'hu',protocol:location.protocol==='https:'?'https':'http',localProtocol:'http',arduinoIp:location.hostname||'lxc',arduinoPort:Number(location.port||3000),localArduinoIp:location.hostname||'lxc',localArduinoPort:Number(location.port||3000),preferLocal:true,macosLocalApiEnabled:false,otaUseApiHost:true,otaAddress:'',otaPort:65280,otaUploadMode:'auto',otaToolPath:'',otaTimeoutSeconds:180,arduinoApiPath:'/lxc-shared-runtime',arduinoApiKey:'',arduinoApiKeyConfigured:true,updateChannel:'beta',firmwareUpdateChannel:'beta',autoCheckUpdates:true,autoDownloadUpdates:false,firmwareUpdateChecks:true,timezoneId:'Europe/Vienna',timezoneAuto:true,currentUtcOffsetMinutes:60,nextTransitionEpoch:0,nextUtcOffsetMinutes:60};
}
type LxcPersistentSettings=Pick<ConnectionConfig,'profileName'|'language'|'updateChannel'|'firmwareUpdateChannel'|'autoCheckUpdates'|'autoDownloadUpdates'|'firmwareUpdateChecks'|'timezoneId'|'timezoneAuto'|'currentUtcOffsetMinutes'|'nextTransitionEpoch'|'nextUtcOffsetMinutes'>;
function persistentSettings(c:ConnectionConfig):LxcPersistentSettings{return{profileName:c.profileName,language:c.language,updateChannel:c.updateChannel,firmwareUpdateChannel:c.firmwareUpdateChannel,autoCheckUpdates:c.autoCheckUpdates,autoDownloadUpdates:c.autoDownloadUpdates,firmwareUpdateChecks:c.firmwareUpdateChecks,timezoneId:c.timezoneId,timezoneAuto:c.timezoneAuto,currentUtcOffsetMinutes:c.currentUtcOffsetMinutes,nextTransitionEpoch:c.nextTransitionEpoch,nextUtcOffsetMinutes:c.nextUtcOffsetMinutes}}
async function loadLxcConfig():Promise<ConnectionConfig>{const local=config();try{const result=await json<any>('/api/v1/server/settings');if(result?.configured===true&&result?.settings&&typeof result.settings==='object'){const merged={...local,...result.settings} as ConnectionConfig;localStorage.setItem(CFG,JSON.stringify(merged));return merged}await json('/api/v1/server/settings',{method:'PUT',credentials:'same-origin',body:JSON.stringify(persistentSettings(local))});return local}catch{return local}}
async function saveLxcConfig(c:ConnectionConfig):Promise<void>{localStorage.setItem(CFG,JSON.stringify(c));await json('/api/v1/server/settings',{method:'PUT',credentials:'same-origin',body:JSON.stringify(persistentSettings(c))})}
function backups():ScheduleBackup[]{try{return JSON.parse(localStorage.getItem(BACKUPS)||'[]')}catch{return[]}}
function saveBackups(x:ScheduleBackup[]){localStorage.setItem(BACKUPS,JSON.stringify(x.slice(0,20)))}
function art(v:any):FirmwareArtifact{const version=String(v?.firmwareVersion??v?.version??v?.tag??'');return{name:String(v?.name??`Firmware ${version}`),downloadUrl:String(v?.downloadUrl??''),checksumUrl:String(v?.checksumUrl??''),firmwareVersion:version,tag:String(v?.tag??version),createdAt:v?.createdAt?String(v.createdAt):undefined,summary:v?.summary?String(v.summary):undefined,channel:String(v?.channel??'beta'),expectedFirmwareVersion:v?.expectedFirmwareVersion?String(v.expectedFirmwareVersion):undefined,metadataConflict:v?.metadataConflict?String(v.metadataConflict):undefined}}
async function releases(channel?:'stable'|'beta'):Promise<FirmwareArtifact[]>{const c=config();const selected=channel??c.firmwareUpdateChannel;const v=await json<any>(`/api/v1/server/firmware/releases?channel=${encodeURIComponent(selected)}`);return(Array.isArray(v?.artifacts)?v.artifacts:[]).map(art)}
async function waitForLxcOtaCompletion(timeoutMs=210000):Promise<void>{const started=Date.now();let seenActive=false;while(Date.now()-started<timeoutMs){const v=await json<any>('/api/v1/server/ota/runtime'),r=v?.runtime??{},state=String(r?.state??'').toLowerCase();if(state==='running')seenActive=true;if(state==='success')return;if(state==='error')throw new Error(String(r?.lastError??r?.message??'LXC OTA sikertelen.'));if(seenActive&&state==='idle')throw new Error('Az LXC OTA háttérfeladat eredmény nélkül állt le.');await new Promise(resolve=>setTimeout(resolve,1200))}throw new Error('Az LXC OTA művelet időtúllépés miatt nem fejeződött be.')}
async function fwStatus(updateChannel?:'stable'|'beta',firmwareUpdateChannel?:'stable'|'beta'):Promise<FirmwareStatus>{
  const c=config(),appChannel=updateChannel??c.updateChannel,fwChannel=firmwareUpdateChannel??c.firmwareUpdateChannel;
  const[st,cat,rt,server]=await Promise.all([json<any>('/api/v1/status'),json<any>('/api/v1/server/firmware/catalog'),json<any>('/api/v1/server/ota/runtime'),json<any>('/api/v1/server/info')]);
  let list:FirmwareArtifact[]=[];try{list=await releases(fwChannel)}catch{}
  const available=list[0]??(Array.isArray(cat?.artifacts)&&cat.artifacts[0]?art(cat.artifacts[0]):undefined),installed=String(st?.firmwareVersion??''),ok=rt?.configured===true,r=rt?.runtime??{};
  return{state:String(r?.state??'idle'),message:String(r?.message??'LXC OTA készenlét'),installedVersion:installed||undefined,arduinoOnline:st?.connected!==false,otaToolInstalled:true,otaPasswordConfigured:rt?.configured===true,otaConfigured:ok,otaMissingRequirements:ok?[]:['ARDUINO_OTA_PASSWORD'],backupStoreConfigured:true,availableFirmware:available,firmwareLookupError:available?undefined:'Nincs firmware a kiválasztott csatornán.',otaToolPath:'native-rust-http',otaTargetAddress:String(st?.ipAddress??''),otaTargetPort:Number(st?.otaPort??cat?.otaPort??65280),updateAvailable:Boolean(available?.firmwareVersion&&available.firmwareVersion!==installed),progress:Number(r?.progress??0),phase:String(r?.phase??'Készenlét'),updateChannel:appChannel,firmwareUpdateChannel:fwChannel,appCurrentVersion:String(server?.installedVersion??APP_VERSION),appUpdateAvailable:false,compatibilityStatus:'Shared Frontend / Native Rust LXC OTA',bootIdBefore:r?.bootIdBefore?String(r.bootIdBefore):undefined,bootIdAfter:r?.bootIdAfter?String(r.bootIdAfter):undefined,scheduleRevisionBefore:Number.isFinite(Number(r?.scheduleRevisionBefore))?Number(r.scheduleRevisionBefore):undefined,scheduleRevisionAfter:Number.isFinite(Number(r?.scheduleRevisionAfter))?Number(r.scheduleRevisionAfter):undefined,scheduleChecksumBefore:r?.scheduleChecksumBefore?String(r.scheduleChecksumBefore):undefined,scheduleChecksumAfter:r?.scheduleChecksumAfter?String(r.scheduleChecksumAfter):undefined};
}
async function install(version:string,channel?:'stable'|'beta'){const selected=channel??config().firmwareUpdateChannel;const catalog=await releases(selected);const wanted=catalog.find(item=>(item.firmwareVersion??item.tag)===version||item.tag===version);if(!wanted)throw new Error(`A(z) ${version} firmware nem található a(z) ${selected.toUpperCase()} LXC firmware-katalógusban.`);const canonicalVersion=wanted.firmwareVersion??wanted.tag;await json('/api/v1/server/firmware/install',{method:'POST',credentials:'same-origin',body:JSON.stringify({version:canonicalVersion,channel:selected})});await waitForLxcOtaCompletion();return fwStatus(undefined,selected)}

function directApiAtLeast(value:unknown,major:number,minor:number):boolean{
  const m=String(value??'').trim().match(/^(\d+)\.(\d+)(?:\.(\d+))?/);
  if(!m)return false;
  const a=Number(m[1]),b=Number(m[2]);
  return a>major||(a===major&&b>=minor);
}
async function readArduinoCapabilitiesRaw():Promise<ArduinoCapabilities>{
  return isTauriRuntime()
    ? invoke<ArduinoCapabilities>('arduino_capabilities')
    : json<ArduinoCapabilities>('/api/v1/capabilities');
}
async function readArduinoDiagnosticsNegotiated():Promise<ArduinoDiagnosticsResult>{
  const capabilities=await readArduinoCapabilitiesRaw();
  const version=capabilities.apiVersion??capabilities.directApiVersion;
  const supported=capabilities.diagnostics===true||directApiAtLeast(version,1,1);
  if(!supported)return{supported:false,reason:'unsupported',capabilities};
  try{
    const diagnostics=isTauriRuntime()
      ? await invoke<Record<string,unknown>>('arduino_diagnostics')
      : await json<Record<string,unknown>>('/api/v1/diagnostics');
    return{supported:true,capabilities,diagnostics};
  }catch(error){
    const status=(error as {status?:number})?.status;
    const message=String((error as Error)?.message??error??'');
    if(status===404||/\b404\b/.test(message)){
      return{supported:false,reason:'endpoint-unavailable',capabilities};
    }
    throw error;
  }
}

export const tauriApi={
  invalidateReadCache:()=>invalidateSharedReads(''),
  appVersion:async()=>isTauriRuntime()?(await import('@tauri-apps/api/app')).getVersion():APP_VERSION,
  appUpdateCheck:():Promise<NativeAppUpdateInfo|null>=>isTauriRuntime()?invoke('app_update_check'):Promise.resolve(null),
  appUpdateInstall:():Promise<boolean>=>isTauriRuntime()?invoke('app_update_install'):Promise.reject(new Error('Native application updater is available only in the desktop application.')),
  runtimeCapabilities:():Promise<RuntimeCapabilities>=>isTauriRuntime()?invoke('runtime_capabilities'):Promise.resolve({platform:'proxmox-lxc',mobile:false,otaSupported:true}),
  migrateNativeCredentials:():Promise<boolean>=>isTauriRuntime()?invoke('migrate_native_credentials'):Promise.resolve(true),
  loadConfig:():Promise<ConnectionConfig>=>isTauriRuntime()?invoke('load_config'):loadLxcConfig(),
  saveConfig:async(c:ConnectionConfig):Promise<void>=>{invalidateSharedReads('');return isTauriRuntime()?invoke('save_config',{config:c}):saveLxcConfig(c)},
  saveOtaPassword:(password:string):Promise<void>=>isTauriRuntime()?invoke('save_ota_password',{password}):Promise.reject(new Error('LXC-ben az OTA-jelszó szerveroldali titok.')),
  status:():Promise<ArduinoStatus>=>sharedRead('arduino:status',750,()=>isTauriRuntime()?invoke('arduino_status'):json('/api/v1/status')),
  capabilities:():Promise<ArduinoCapabilities>=>sharedRead('capabilities',3000,()=>readArduinoCapabilitiesRaw()),
  diagnostics:():Promise<ArduinoDiagnosticsResult>=>sharedRead('diagnostics',5000,()=>readArduinoDiagnosticsNegotiated()),
  ledTopology:():Promise<LedTopology>=>sharedRead('arduino:topology',3000,()=>isTauriRuntime()?invoke('led_topology'):json('/api/v1/led-topology')),
  saveLedTopology:async(baseRevision:number,ledCounts:number[]):Promise<LedTopology>=>{invalidateSharedReads('arduino:topology','arduino:status');return isTauriRuntime()?invoke('save_led_topology',{baseRevision,ledCounts}):json('/api/v1/led-topology',{method:'PUT',body:JSON.stringify({baseRevision,lx001:ledCounts[0],lx002:ledCounts[1],lx003:ledCounts[2]})})},
  syncTimeConfig:async():Promise<ArduinoStatus>=>{invalidateSharedReads('arduino:status');if(isTauriRuntime())return invoke('sync_time_config');const c=config();return json('/api/v1/time/config',{method:'PUT',body:JSON.stringify({timezoneId:c.timezoneId,timezoneAuto:c.timezoneAuto,utcOffsetMinutes:c.currentUtcOffsetMinutes,nextTransitionEpoch:c.nextTransitionEpoch,nextUtcOffsetMinutes:c.nextUtcOffsetMinutes})})},
  logs:(afterId=0):Promise<ArduinoConsoleResponse>=>sharedRead(`arduino:logs:${afterId}`,0,()=>isTauriRuntime()?invoke('arduino_logs',{afterId}):json(`/api/v1/logs?afterId=${afterId}`)),
  networkLogs:():Promise<NetworkLog[]>=>isTauriRuntime()?invoke('network_logs'):Promise.resolve([]),
  setLed:async(strip:LedStrip)=>{invalidateSharedReads('arduino:status');return isTauriRuntime()?invoke('set_led',{id:strip.id,enabled:strip.enabled,brightness:strip.brightness,effect:strip.effect,speed:strip.speed,color:strip.color}):json(`/api/v1/leds/${strip.id}`,{method:'PUT',body:JSON.stringify({enabled:strip.enabled,brightness:strip.brightness,effect:strip.effect,speed:strip.speed,color:strip.color})})},
  loadSchedules:():Promise<LedSchedule[]>=>isTauriRuntime()?invoke('load_schedules'):loadLxcSchedules().then(v=>v.schedules),
  importSchedulesFile:(path:string):Promise<LedSchedule[]>=>isTauriRuntime()?invoke('import_schedules_file',{path}):Promise.reject(new Error('Web import böngésző pickerrel történik.')),
  exportSchedulesFile:(path:string,schedules:LedSchedule[]):Promise<void>=>isTauriRuntime()?invoke('export_schedules_file',{path,schedules}):Promise.reject(new Error('Web export böngésző letöltéssel történik.')),
  loadSchedulesFromArduino:():Promise<ScheduleSyncSnapshot>=>isTauriRuntime()?invoke('load_schedules_from_arduino'):loadLxcSchedules(),
  createScheduleBackup:async(schedules:LedSchedule[],revision:number|null,checksum:string):Promise<ScheduleBackup>=>{if(isTauriRuntime())return invoke('create_schedule_backup',{schedules,revision,checksum});const item:ScheduleBackup={id:`lxc-${Date.now()}`,createdAt:Date.now(),count:schedules.length,revision:revision??undefined,checksum,schedules:structuredClone(schedules)};saveBackups([item,...backups()]);return item},
  listScheduleBackups:():Promise<ScheduleBackup[]>=>isTauriRuntime()?invoke('list_schedule_backups'):Promise.resolve(backups()),
  saveSchedules:async(schedules:LedSchedule[],expectedRevision:number|null,force=false):Promise<ScheduleSaveResult>=>{invalidateSharedReads('arduino:status');return isTauriRuntime()?invoke('save_and_sync_schedules',{schedules,expectedRevision,force}):saveLxcSchedules(schedules,force?null:expectedRevision)},
  listenScheduleSaveProgress:async(listener:(entry:ScheduleSaveProgressEvent)=>void):Promise<()=>void>=>{if(isTauriRuntime()){const{listen}=await import('@tauri-apps/api/event');return listen<ScheduleSaveProgressEvent>('schedule-save-progress',e=>listener(e.payload))}return()=>{}},
  firmwareReleases:(channel?:'stable'|'beta'):Promise<FirmwareArtifact[]>=>isTauriRuntime()?invoke('firmware_releases',{channel}):releases(channel),
  firmwareInstallRelease:(tag:string,channel?:'stable'|'beta'):Promise<FirmwareStatus>=>isTauriRuntime()?invoke('firmware_install_release',{tag,channel}):install(tag,channel),
  firmwareInstallExternal:(fileName:string,firmware:number[]):Promise<FirmwareStatus>=>isTauriRuntime()?invoke('firmware_install_external',{fileName,firmware}):Promise.reject(new Error('Külső firmware feltöltés a natív desktop/mobil alkalmazásban használható.')),
  firmwareStatus:(updateChannel?:'stable'|'beta',firmwareUpdateChannel?:'stable'|'beta'):Promise<FirmwareStatus>=>isTauriRuntime()?invoke('firmware_status',{updateChannel,firmwareUpdateChannel}):fwStatus(updateChannel,firmwareUpdateChannel),
  firmwareUpdate:async():Promise<FirmwareStatus>=>{if(isTauriRuntime())return invoke('firmware_update');const channel=config().firmwareUpdateChannel;const list=await releases(channel);if(!list[0])throw new Error('Nincs telepíthető firmware.');return install(list[0].firmwareVersion??list[0].tag,channel)},
  firmwareCancel:async():Promise<boolean>=>{if(isTauriRuntime())return invoke('firmware_cancel');await json('/api/v1/server/firmware/cancel',{method:'POST',credentials:'same-origin',body:'{}'});return true},
  listenOtaProgress:async(listener:(entry:OtaProgressEvent)=>void):Promise<()=>void>=>{if(isTauriRuntime()){const{listen}=await import('@tauri-apps/api/event');return listen<OtaProgressEvent>('ota-progress',e=>listener(e.payload))}let active=true,last='';const poll=async()=>{if(!active)return;try{const v=await json<any>('/api/v1/server/ota/runtime'),r=v?.runtime??{},sig=JSON.stringify([r.state,r.phase,r.message,r.progress,r.lastError]);if(sig!==last){last=sig;listener({timestamp:Date.now(),stage:String(r.phase??'OTA'),level:r.state==='error'?'error':r.state==='success'?'success':'info',message:String(r.lastError??r.message??'OTA'),progress:Number(r.progress??0)})}}catch{}if(active)setTimeout(poll,1200)};void poll();return()=>{active=false}}
};
