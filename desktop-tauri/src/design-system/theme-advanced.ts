import type { AppearanceSettings, CustomThemeDocument, ThemeTokenName } from './theme-types';

export type TypographyPreset='system'|'compact'|'editorial'|'mono';
export type ChartAccessibilityPreset='default'|'deuteranopia'|'protanopia'|'tritanopia'|'monochrome';

export interface AdvancedThemeSettings{
  typography:TypographyPreset;
  uiScale:number;
  glassBlur:number;
  panelOpacity:number;
  glowIntensity:number;
  gradientAngle:number;
  gradientA:string;
  gradientB:string;
  gradientC:string;
  chartAccessibility:ChartAccessibilityPreset;
}

export interface SavedThemeProfile{
  id:string;
  name:string;
  createdAt:number;
  customTheme:CustomThemeDocument;
  appearance:Pick<AppearanceSettings,'material'|'gradient'|'contrast'|'visualFx'|'glow'|'glassStrength'|'motion'|'density'|'radius'>;
  advanced:AdvancedThemeSettings;
}

const SETTINGS_KEY='arduino-led-controller.theme-advanced.v1';
const LIBRARY_KEY='arduino-led-controller.theme-library.v1';

export const DEFAULT_ADVANCED_THEME:AdvancedThemeSettings={
  typography:'system',uiScale:1,glassBlur:22,panelOpacity:83,glowIntensity:18,
  gradientAngle:135,gradientA:'#38bdf8',gradientB:'#a78bfa',gradientC:'#42e5bf',
  chartAccessibility:'default'
};

const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const safeHex=(v:unknown,f:string)=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:f;

export function normalizeAdvancedTheme(value:unknown):AdvancedThemeSettings{
  const v=value&&typeof value==='object'?value as Partial<AdvancedThemeSettings>:{};
  const typography=['system','compact','editorial','mono'].includes(String(v.typography))
    ? v.typography as TypographyPreset:'system';
  const chartAccessibility=['default','deuteranopia','protanopia','tritanopia','monochrome'].includes(String(v.chartAccessibility))
    ? v.chartAccessibility as ChartAccessibilityPreset:'default';
  return{
    typography,
    uiScale:clamp(Number(v.uiScale)||1,.85,1.2),
    glassBlur:clamp(Number(v.glassBlur)||22,0,40),
    panelOpacity:clamp(Number(v.panelOpacity)||83,55,100),
    glowIntensity:clamp(Number(v.glowIntensity)||18,0,50),
    gradientAngle:clamp(Number(v.gradientAngle)||135,0,360),
    gradientA:safeHex(v.gradientA,'#38bdf8'),
    gradientB:safeHex(v.gradientB,'#a78bfa'),
    gradientC:safeHex(v.gradientC,'#42e5bf'),
    chartAccessibility
  };
}

export function loadAdvancedThemeSettings(){
  try{return normalizeAdvancedTheme(JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null'))}
  catch{return DEFAULT_ADVANCED_THEME}
}
export function saveAdvancedThemeSettings(v:AdvancedThemeSettings){
  localStorage.setItem(SETTINGS_KEY,JSON.stringify(normalizeAdvancedTheme(v)));
}
export function applyAdvancedThemeSettings(root:HTMLElement,v:AdvancedThemeSettings){
  const s=normalizeAdvancedTheme(v);
  root.dataset.fontPreset=s.typography;
  root.dataset.chartAccessibility=s.chartAccessibility;
  root.style.setProperty('--te3-ui-scale',String(s.uiScale));
  root.style.setProperty('--te3-custom-blur',`${s.glassBlur}px`);
  root.style.setProperty('--te3-custom-panel-opacity',`${s.panelOpacity}%`);
  root.style.setProperty('--te3-custom-glow-intensity',`${s.glowIntensity}%`);
  root.style.setProperty('--te3-custom-gradient-angle',`${s.gradientAngle}deg`);
  root.style.setProperty('--te3-custom-gradient-a',s.gradientA);
  root.style.setProperty('--te3-custom-gradient-b',s.gradientB);
  root.style.setProperty('--te3-custom-gradient-c',s.gradientC);
}
export function loadThemeLibrary():SavedThemeProfile[]{
  try{
    const v=JSON.parse(localStorage.getItem(LIBRARY_KEY)||'[]');
    if(!Array.isArray(v)) return [];
    return v.slice(0,24).map((entry:any)=>{
      const customTheme=entry?.customTheme;
      const migratedCustomTheme=customTheme&&typeof customTheme==='object'
        ? {
            ...customTheme,
            schemaVersion:2,
            themeEngine:'2.0'
          }
        : customTheme;
      return {
        ...entry,
        customTheme:migratedCustomTheme,
        advanced:normalizeAdvancedTheme(entry?.advanced)
      } as SavedThemeProfile;
    });
  }catch{return[]}
}
export function saveThemeLibrary(v:SavedThemeProfile[]){
  localStorage.setItem(LIBRARY_KEY,JSON.stringify(v.slice(0,24)));
}

function hexToHsl(hex:string){
  const v=safeHex(hex,'#38bdf8').slice(1);
  const r=parseInt(v.slice(0,2),16)/255,g=parseInt(v.slice(2,4),16)/255,b=parseInt(v.slice(4,6),16)/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,d=max-min;
  let h=0,s=0;
  if(d){s=d/(1-Math.abs(2*l-1));if(max===r)h=60*(((g-b)/d)%6);else if(max===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4)}
  if(h<0)h+=360;return[h,s*100,l*100] as const;
}
function hslToHex(h:number,s:number,l:number){
  s/=100;l/=100;const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;
  let r=0,g=0,b=0;if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}
  return '#'+[r,g,b].map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('');
}
export function generatePalette(seed:string,mode:'light'|'dark'):Partial<Record<ThemeTokenName,string>>{
  const[h,s]=hexToHsl(seed),sat=clamp(s,55,92);
  const accent=hslToHex(h,sat,mode==='dark'?62:48);
  return{
    background:mode==='dark'?hslToHex(h,22,6):hslToHex(h,24,97),
    surface:mode==='dark'?hslToHex(h,20,11):'#ffffff',
    surfaceRaised:mode==='dark'?hslToHex(h,21,15):hslToHex(h,20,99),
    text:mode==='dark'?'#f8fafc':'#111827',
    textSecondary:mode==='dark'?'#cbd5e1':'#475569',
    border:mode==='dark'?hslToHex(h,20,24):hslToHex(h,18,80),
    accent,accentHover:hslToHex(h,clamp(sat+5,60,96),mode==='dark'?70:40),
    success:'#34d399',warning:'#fbbf24',error:'#fb7185',
    chart1:accent,chart2:hslToHex((h+60)%360,72,62),chart3:hslToHex((h+120)%360,68,57),
    chart4:hslToHex((h+180)%360,72,60),chart5:hslToHex((h+240)%360,72,64),chart6:hslToHex((h+300)%360,70,60)
  };
}
const ch=(v:number)=>{const c=v/255;return c<=.03928?c/12.92:((c+.055)/1.055)**2.4};
const lum=(hex:string)=>{const v=safeHex(hex,'#000000').slice(1);return .2126*ch(parseInt(v.slice(0,2),16))+.7152*ch(parseInt(v.slice(2,4),16))+.0722*ch(parseInt(v.slice(4,6),16))};
export function advancedContrastRatio(a:string,b:string){const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
export function bestTextColor(bg:string){return advancedContrastRatio('#ffffff',bg)>=advancedContrastRatio('#111827',bg)?'#ffffff':'#111827'}
