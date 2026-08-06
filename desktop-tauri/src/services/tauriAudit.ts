export type TauriAuditLevel='info'|'action'|'success'|'warning'|'error';
export interface TauriAuditEntry{id:string;timestamp:number;level:TauriAuditLevel;source:string;action:string;message:string}
const STORAGE_KEY='arduino-led-controller.tauri-audit.v1';
const EVENT_NAME='arduino-led-controller:tauri-audit';
const LIMIT=500;
function parse(value:string|null):TauriAuditEntry[]{if(!value)return[];try{const x=JSON.parse(value);return Array.isArray(x)?x.filter((e)=>e&&typeof e.id==='string'&&typeof e.timestamp==='number'&&typeof e.level==='string'&&typeof e.source==='string'&&typeof e.action==='string'&&typeof e.message==='string').slice(-LIMIT):[]}catch{return[]}}
export function loadTauriAudit(){return parse(globalThis.localStorage?.getItem(STORAGE_KEY)??null)}
function store(entries:TauriAuditEntry[]){globalThis.localStorage?.setItem(STORAGE_KEY,JSON.stringify(entries.slice(-LIMIT)))}
function emit(){globalThis.dispatchEvent?.(new CustomEvent(EVENT_NAME))}
export function recordAudit(input:Omit<TauriAuditEntry,'id'|'timestamp'>){const entry={...input,id:`${Date.now()}-${Math.random().toString(16).slice(2)}`,timestamp:Date.now()};store([...loadTauriAudit(),entry]);emit();return entry}
export function clearTauriAudit(){globalThis.localStorage?.removeItem(STORAGE_KEY);emit()}
export function subscribeTauriAudit(listener:()=>void){globalThis.addEventListener?.(EVENT_NAME,listener);return()=>globalThis.removeEventListener?.(EVENT_NAME,listener)}
export async function runAudited<T>(c:{source:string;action:string;message:string;successMessage?:string},task:()=>Promise<T>):Promise<T>{recordAudit({level:'action',source:c.source,action:c.action,message:c.message});try{const result=await task();recordAudit({level:'success',source:c.source,action:c.action,message:c.successMessage??c.message});return result}catch(error){recordAudit({level:'error',source:c.source,action:c.action,message:`${c.message}: ${String(error)}`});throw error}}
