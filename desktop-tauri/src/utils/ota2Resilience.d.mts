export const OTA2_RESILIENCE_CODES: Readonly<Record<string,string>>;
export function isRetryableReadError(error: unknown): boolean;
export function withBoundedReadRetry<T>(operation:(attempt:number)=>Promise<T>|T, options?:{attempts?:number;baseDelayMs?:number;sleep?:(ms:number)=>Promise<void>;shouldRetry?:(error:unknown)=>boolean;}):Promise<T>;
export function createOta2SingleFlightGuard():Readonly<{readonly active:boolean;run<T>(operation:()=>Promise<T>|T):Promise<Readonly<{accepted:boolean;code?:string;value?:T}>>}>;
