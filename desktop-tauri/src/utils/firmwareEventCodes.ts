type Translate = (key: string, values?: Record<string, string | number>) => string;
const parameterNames: Record<string, string[]> = {
  X0002:['version'], X0003:['feature'], X0004:['port'], X1402:['zone'],
  X2002:['ip','rssi','httpPort','otaPort'], X5001:['ip','port'],
  X5003:['errorCode','indicatorSeconds']
};
export function parseFirmwareEventMessage(message: string | null | undefined) {
  const value=String(message??'').trim();
  const match=/^(X\d{4})(?::(.*))?$/.exec(value);
  if(!match) return null;
  const raw=match[2]?match[2].split(':'):[];
  const names=parameterNames[match[1]]??[];
  const params:Record<string,string>={};
  raw.forEach((entry,index)=>{params[names[index]??`p${index+1}`]=entry;});
  return {code:match[1],params};
}
export function localizeFirmwareEventMessage(message:string|null|undefined,t:Translate){
  const parsed=parseFirmwareEventMessage(message);
  if(!parsed) return String(message??'');
  const key=`firmwareEvent.${parsed.code}`;
  const translated=t(key,parsed.params);
  return translated===key?String(message??''):translated;
}
