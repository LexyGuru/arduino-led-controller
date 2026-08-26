import { useMemo, useState } from 'react';
import { DownloadCloud, Globe2, Languages, Search } from 'lucide-react';
import { useI18n } from '../i18n';
import type { AppLanguage, LanguageCatalogItem } from '../i18n/runtime';
import { LANGUAGE_CATALOG_TARGETS, type LanguageRegion } from '../i18n/catalog';
type Filter = 'all' | LanguageRegion;
export function LanguagePackManager({ selectedLanguage, onLanguageChange }: { selectedLanguage: AppLanguage; onLanguageChange: (language: AppLanguage) => void }) {
  const { t, languageCatalog, installedLanguages, languagePackBusy, languagePackError, languageCatalogOnline, refreshLanguageCatalog, installLanguage, uninstallLanguage } = useI18n();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const merged = useMemo(() => {
    const remote = new Map(languageCatalog.map(item => [item.code, item]));
    return LANGUAGE_CATALOG_TARGETS.map(target => ({ ...target, status: 'pending' as const, ...(remote.get(target.code) || {}) })) as Array<LanguageCatalogItem & { region: LanguageRegion }>;
  }, [languageCatalog]);
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return merged.filter(item => (filter === 'all' || item.region === filter) && (!needle || [item.code, item.name, item.nativeName].some(value => value.toLocaleLowerCase().includes(needle))));
  }, [merged, filter, query]);
  const filters: Array<[Filter,string]> = [['all',t('languagePack.filter.all')],['western',t('languagePack.region.western')],['centralEastern',t('languagePack.region.centralEastern')],['asia',t('languagePack.region.asia')]];
  return <section className="panel settings-panel settings-general-section language-pack-browser" data-language-pack-manager="2.1">
    <div className="panel-title"><div><p className="eyebrow">{t('languagePack.eyebrow')}</p><h2>{t('languagePack.title')}</h2></div><Languages/></div>
    <div className="language-pack-browser__active"><label><span>{t('settings.language.label')}</span><select value={selectedLanguage} onChange={event => onLanguageChange(event.target.value as AppLanguage)}>{installedLanguages.map(code => { const item=merged.find(value=>value.code===code); return <option key={code} value={code}>{code==='en' ? `English · ${t('languagePack.builtIn')}` : `${item?.nativeName || code.toUpperCase()} · ${t('languagePack.current')}`}</option>; })}</select></label><button type="button" onClick={() => void refreshLanguageCatalog()} disabled={Boolean(languagePackBusy)}><DownloadCloud size={17}/>{t('languagePack.checkUpdates')}</button></div>
    <div className="notice"><Globe2 size={18}/><p>{t('languagePack.help')}</p></div>
    {!languageCatalogOnline && <div className="notice"><Globe2 size={18}/><p>{t('languagePack.offlineHelp')}</p></div>}
    {languagePackError && <div className="notice error" role="alert"><p>{t('languagePack.error',{error:languagePackError})}</p></div>}
    <div className="language-pack-browser__controls"><label className="language-pack-browser__search"><Search size={17}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder={t('languagePack.search')} aria-label={t('languagePack.search')}/></label><div className="language-pack-browser__filters" role="tablist">{filters.map(([id,label])=><button key={id} type="button" className={filter===id?'active':''} onClick={()=>setFilter(id)}>{label}</button>)}</div></div>
    <div className="language-pack-browser__summary">{t('languagePack.showing',{count:visible.length})}</div>
    <div className="language-pack-browser__grid">{visible.map(item => { const installed=installedLanguages.includes(item.code), available=item.status==='available', update=Boolean(item.updateAvailable), busy=languagePackBusy===item.code; return <article key={item.code} className={`language-pack-card${available?'':' pending'}${installed?' installed':''}`} data-language-code={item.code} data-language-region={item.region}><div className="language-pack-card__header"><div><strong>{item.nativeName}</strong><span>{item.name} · {item.code}</span></div><span className="language-pack-card__status">{installed?(update?t('languagePack.updateAvailable'):t('languagePack.current')):(available?t('languagePack.download'):t('languagePack.pending'))}</span></div>{(item.packVersion||item.version)&&<small>{t('languagePack.version',{version:item.packVersion||item.version||''})}</small>}<div className="language-pack-card__actions">{installed?<><button type="button" onClick={()=>void installLanguage(item.code)} disabled={!available||!languageCatalogOnline||Boolean(languagePackBusy)}>{busy?t('languagePack.updating'):update?t('languagePack.update'):t('languagePack.reinstall')}</button><button type="button" className="secondary" onClick={()=>uninstallLanguage(item.code)} disabled={busy}>{t('languagePack.remove')}</button></>:<button type="button" disabled={!available||!languageCatalogOnline||Boolean(languagePackBusy)} onClick={()=>void installLanguage(item.code)}>{busy?t('languagePack.updating'):available?(languageCatalogOnline?t('languagePack.download'):t('languagePack.internetRequired')):t('languagePack.pending')}</button>}</div></article>; })}</div>
  </section>;
}
