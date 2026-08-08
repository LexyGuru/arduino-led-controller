export const DAYS = ['Hétfő','Kedd','Szerda','Csütörtök','Péntek','Szombat','Vasárnap'] as const;
export const EFFECTS = ['Statikus','Villogás','Légzés','Szivárvány','Chase'] as const;

export type ScheduleLed = {
  apply:boolean;
  enabled:boolean;
  brightness:number;
  effect:number;
  speed:number;
  color:[number,number,number];
};

export type ScheduleEntry = {
  index?:number;
  day:number;
  hour:number;
  minute:number;
  leds:[ScheduleLed,ScheduleLed,ScheduleLed];
};

const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,Math.round(Number(v)||0)));

export function defaultLed():ScheduleLed {
  return {apply:true,enabled:true,brightness:70,effect:0,speed:50,color:[0,0,255]};
}

export function defaultSchedule():ScheduleEntry {
  return {day:1,hour:18,minute:0,leds:[defaultLed(),defaultLed(),defaultLed()]};
}

export function decodeScheduleHex(hex:string,index?:number):ScheduleEntry {
  const clean=String(hex||'').trim().toLowerCase();
  if(!/^[0-9a-f]{54}$/.test(clean)) throw new Error(`Érvénytelen 27 bájtos schedule payload: ${hex}`);
  const bytes:number[]=[];
  for(let i=0;i<clean.length;i+=2) bytes.push(parseInt(clean.slice(i,i+2),16));
  const leds:ScheduleLed[]=[];
  let p=3;
  for(let led=0;led<3;led++){
    leds.push({
      apply:bytes[p++]!==0,
      enabled:bytes[p++]!==0,
      brightness:bytes[p++],
      effect:bytes[p++],
      speed:bytes[p++],
      color:[bytes[p++],bytes[p++],bytes[p++]]
    });
  }
  return {
    index,
    day:clamp(bytes[0],1,7),
    hour:clamp(bytes[1],0,23),
    minute:clamp(bytes[2],0,59),
    leds:leds as [ScheduleLed,ScheduleLed,ScheduleLed]
  };
}

export function encodeScheduleHex(entry:ScheduleEntry):string {
  const bytes:number[]=[
    clamp(entry.day,1,7),
    clamp(entry.hour,0,23),
    clamp(entry.minute,0,59)
  ];
  for(const led of entry.leds){
    bytes.push(
      led.apply?1:0,
      led.enabled?1:0,
      clamp(led.brightness,0,255),
      clamp(led.effect,0,4),
      clamp(led.speed,0,255),
      clamp(led.color[0],0,255),
      clamp(led.color[1],0,255),
      clamp(led.color[2],0,255)
    );
  }
  return bytes.map(v=>v.toString(16).padStart(2,'0')).join('');
}

export function scheduleLabel(entry:ScheduleEntry):string {
  return `${DAYS[entry.day-1]??`Nap ${entry.day}`} ${String(entry.hour).padStart(2,'0')}:${String(entry.minute).padStart(2,'0')}`;
}

export function rgbToHex(color:number[]):string {
  return '#'+[0,1,2].map(i=>clamp(color?.[i]??0,0,255).toString(16).padStart(2,'0')).join('');
}

export function hexToRgb(hex:string):[number,number,number] {
  const m=/^#?([0-9a-f]{6})$/i.exec(hex);
  if(!m) return [0,0,0];
  return [
    parseInt(m[1].slice(0,2),16),
    parseInt(m[1].slice(2,4),16),
    parseInt(m[1].slice(4,6),16)
  ];
}
