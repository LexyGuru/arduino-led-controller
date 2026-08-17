import { Accessibility, Copy, Library, Palette, RotateCcw, Save, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  advancedContrastRatio,applyAdvancedThemeSettings,bestTextColor,DEFAULT_ADVANCED_THEME,
  generatePalette,loadAdvancedThemeSettings,loadThemeLibrary,saveAdvancedThemeSettings,
  saveThemeLibrary,type AdvancedThemeSettings,type SavedThemeProfile
} from '../design-system/theme-advanced';
import type { AppearanceSettings, CustomThemeDocument, ThemeTokenName } from '../design-system/theme-types';
import { useI18n } from '../i18n';

interface Props{
  appearance:AppearanceSettings;customTheme:CustomThemeDocument;resolvedMode:'light'|'dark';
  setAppearance:(v:AppearanceSettings)=>void;
  replaceCustomThemeTokens:(v:Partial<Record<ThemeTokenName,string>>)=>void;
  renameCustomTheme:(name:string)=>void;
}
const makeId=()=>`theme-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

export function ThemeAdvancedEditor({appearance,customTheme,resolvedMode,setAppearance,replaceCustomThemeTokens,renameCustomTheme}:Props){
  const{t}=useI18n();
  const[advanced,setAdvanced]=useState<AdvancedThemeSettings>(loadAdvancedThemeSettings);
  const[library,setLibrary]=useState<SavedThemeProfile[]>(loadThemeLibrary);
  const[seed,setSeed]=useState(customTheme.tokens.accent??'#38bdf8');
  useEffect(()=>{saveAdvancedThemeSettings(advanced);applyAdvancedThemeSettings(document.documentElement,advanced)},[advanced]);
  const ratio=useMemo(()=>advancedContrastRatio(customTheme.tokens.text??(resolvedMode==='dark'?'#f8fafc':'#111827'),customTheme.tokens.background??(resolvedMode==='dark'?'#090512':'#ffffff')),[customTheme.tokens,resolvedMode]);
  const update=<K extends keyof AdvancedThemeSettings>(k:K,v:AdvancedThemeSettings[K])=>setAdvanced(x=>({...x,[k]:v}));
  const saveCurrent=()=>{
    const p:SavedThemeProfile={id:makeId(),name:customTheme.name,createdAt:Date.now(),customTheme:structuredClone(customTheme),
      appearance:{material:appearance.material,gradient:appearance.gradient,contrast:appearance.contrast,visualFx:appearance.visualFx,glow:appearance.glow,glassStrength:appearance.glassStrength,motion:appearance.motion,density:appearance.density,radius:appearance.radius},advanced};
    const n=[p,...library].slice(0,24);setLibrary(n);saveThemeLibrary(n);
  };
  const applyProfile=(p:SavedThemeProfile)=>{replaceCustomThemeTokens(p.customTheme.tokens);renameCustomTheme(p.name);setAppearance({...appearance,...p.appearance,theme:'custom'});setAdvanced(p.advanced)};
  const duplicate=(p:SavedThemeProfile)=>{const q={...structuredClone(p),id:makeId(),createdAt:Date.now(),name:`${p.name} Copy`};const n=[q,...library].slice(0,24);setLibrary(n);saveThemeLibrary(n)};
  const remove=(id:string)=>{const n=library.filter(v=>v.id!==id);setLibrary(n);saveThemeLibrary(n)};
  const generate=()=>{const v=generatePalette(seed,resolvedMode);replaceCustomThemeTokens({...customTheme.tokens,...v});update('gradientA',v.chart1??seed);update('gradientB',v.chart2??'#a78bfa');update('gradientC',v.chart3??'#42e5bf')};
  const fix=()=>{const bg=customTheme.tokens.background??(resolvedMode==='dark'?'#090512':'#ffffff');replaceCustomThemeTokens({...customTheme.tokens,text:bestTextColor(bg)})};

  return <section className="theme-advanced-editor">
    <div className="theme-advanced-editor__title"><div><p className="eyebrow">{t('appearance.advanced.eyebrow')}</p><h3>{t('appearance.advanced.title')}</h3><p>{t('appearance.advanced.description')}</p></div><Sparkles/></div>

    <section className="theme-advanced-section">
      <div className="theme-advanced-section__head"><div><Library size={18}/><strong>{t('appearance.advanced.library')}</strong></div><button type="button" onClick={saveCurrent}><Save size={15}/>{t('appearance.advanced.saveProfile')}</button></div>
      {library.length===0?<p>{t('appearance.advanced.libraryEmpty')}</p>:<div className="theme-profile-library">{library.map(p=><div className="theme-profile-library__item" key={p.id}>
        <button type="button" onClick={()=>applyProfile(p)}><Palette size={16}/><span><strong>{p.name}</strong><small>{new Date(p.createdAt).toLocaleString()}</small></span></button>
        <button type="button" title={t('appearance.advanced.duplicate')} onClick={()=>duplicate(p)}><Copy size={15}/></button>
        <button type="button" title={t('appearance.advanced.delete')} onClick={()=>remove(p.id)}><Trash2 size={15}/></button>
      </div>)}</div>}
    </section>

    <div className="theme-advanced-grid">
      <section className="theme-advanced-section"><div className="theme-advanced-section__head"><strong>{t('appearance.advanced.typography')}</strong><button type="button" onClick={()=>setAdvanced(x=>({...x,typography:'system',uiScale:1}))}><RotateCcw size={14}/>{t('appearance.advanced.reset')}</button></div>
        <label>{t('appearance.advanced.fontPreset')}<select value={advanced.typography} onChange={e=>update('typography',e.target.value as AdvancedThemeSettings['typography'])}>{['system','compact','editorial','mono'].map(v=><option key={v} value={v}>{t(`appearance.advanced.font.${v}`)}</option>)}</select></label>
        <label>{t('appearance.advanced.uiScale')} <b>{Math.round(advanced.uiScale*100)}%</b><input type="range" min="85" max="120" value={Math.round(advanced.uiScale*100)} onChange={e=>update('uiScale',Number(e.target.value)/100)}/></label>
      </section>
      <section className="theme-advanced-section"><div className="theme-advanced-section__head"><strong>{t('appearance.advanced.materialTuning')}</strong><button type="button" onClick={()=>setAdvanced(x=>({...x,glassBlur:DEFAULT_ADVANCED_THEME.glassBlur,panelOpacity:DEFAULT_ADVANCED_THEME.panelOpacity,glowIntensity:DEFAULT_ADVANCED_THEME.glowIntensity}))}><RotateCcw size={14}/>{t('appearance.advanced.reset')}</button></div>
        <label>{t('appearance.advanced.glassBlur')} <b>{advanced.glassBlur}px</b><input type="range" min="0" max="40" value={advanced.glassBlur} onChange={e=>update('glassBlur',Number(e.target.value))}/></label>
        <label>{t('appearance.advanced.panelOpacity')} <b>{advanced.panelOpacity}%</b><input type="range" min="55" max="100" value={advanced.panelOpacity} onChange={e=>update('panelOpacity',Number(e.target.value))}/></label>
        <label>{t('appearance.advanced.glowIntensity')} <b>{advanced.glowIntensity}%</b><input type="range" min="0" max="50" value={advanced.glowIntensity} onChange={e=>update('glowIntensity',Number(e.target.value))}/></label>
      </section>
    </div>

    <section className="theme-advanced-section"><div className="theme-advanced-section__head"><strong>{t('appearance.advanced.gradientEditor')}</strong></div>
      <div className="theme-gradient-editor"><label>{t('appearance.advanced.gradientAngle')} <b>{advanced.gradientAngle}°</b><input type="range" min="0" max="360" value={advanced.gradientAngle} onChange={e=>update('gradientAngle',Number(e.target.value))}/></label>
      {(['gradientA','gradientB','gradientC'] as const).map((k,i)=><label key={k}>{String.fromCharCode(65+i)}<input type="color" value={advanced[k]} onChange={e=>update(k,e.target.value)}/></label>)}
      <div className="theme-gradient-preview" style={{background:`linear-gradient(${advanced.gradientAngle}deg,${advanced.gradientA},${advanced.gradientB},${advanced.gradientC})`}}/></div>
    </section>

    <div className="theme-advanced-grid">
      <section className="theme-advanced-section"><div className="theme-advanced-section__head"><strong>{t('appearance.advanced.paletteGenerator')}</strong></div><div className="theme-seed-generator"><input type="color" value={seed} onChange={e=>setSeed(e.target.value)}/><code>{seed}</code><button type="button" onClick={generate}><Sparkles size={15}/>{t('appearance.advanced.generate')}</button></div><p>{t('appearance.advanced.paletteHelp')}</p></section>
      <section className="theme-advanced-section"><div className="theme-advanced-section__head"><div><Accessibility size={18}/><strong>{t('appearance.advanced.accessibility')}</strong></div></div>
        <div className={`theme-contrast-score${ratio>=4.5?' is-pass':' is-fail'}`}><strong>{ratio.toFixed(2)}:1</strong><span>{ratio>=4.5?t('appearance.advanced.contrastPass'):t('appearance.advanced.contrastFail')}</span></div>
        {ratio<4.5&&<button type="button" onClick={fix}>{t('appearance.advanced.autoFixContrast')}</button>}
        <label>{t('appearance.advanced.chartPalette')}<select value={advanced.chartAccessibility} onChange={e=>update('chartAccessibility',e.target.value as AdvancedThemeSettings['chartAccessibility'])}>{['default','deuteranopia','protanopia','tritanopia','monochrome'].map(v=><option key={v} value={v}>{t(`appearance.advanced.chart.${v}`)}</option>)}</select></label>
      </section>
    </div>
  </section>;
}
