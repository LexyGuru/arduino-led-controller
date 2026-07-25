import { useEffect, useMemo, useState } from 'react';
import { Download, Save, Trash2, Upload } from 'lucide-react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { tauriApi } from '../services/tauriApi';
import type { LedSchedule, ScheduleLed } from '../types';

const days = ['Hétfő','Kedd','Szerda','Csütörtök','Péntek','Szombat','Vasárnap'];
const dayShort = ['H','K','Sze','Cs','P','Szo','V'];
const effects = ['Statikus','Villogás','Lélegzés','Szivárvány','Futófény'];
type Action = 'none' | 'on' | 'off';
type FormLed = { id: number; action: Action; brightness: number; effect: number; speed: number; color: [number,number,number] };

const rgbToHex = ([r,g,b]: [number,number,number]) => `#${[r,g,b].map((n) => n.toString(16).padStart(2,'0')).join('')}`;
const hexToRgb = (hex: string): [number,number,number] => [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
const emptyLeds = (): FormLed[] => [1,2,3].map((id) => ({ id, action:'none', brightness:10, effect:0, speed:50, color:[0,0,255] }));

export function SchedulesPage({ schedules, busy, onSave, onSync }: { schedules: LedSchedule[]; busy: boolean; onSave: (items: LedSchedule[]) => void; onSync: () => void }) {
  const [draft, setDraft] = useState<LedSchedule[]>(schedules);
  const [selectedDays, setSelectedDays] = useState<number[]>([1]);
  const [time, setTime] = useState('19:30');
  const [formLeds, setFormLeds] = useState<FormLed[]>(emptyLeds());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fileMessage, setFileMessage] = useState('');
  useEffect(() => setDraft(schedules), [schedules]);

  const grouped = useMemo(() => days.map((name,index) => ({ name, day:index+1, items:draft.filter((x) => x.day === index+1).sort((a,b) => a.time.localeCompare(b.time)) })), [draft]);
  const toggleDay = (day:number) => setSelectedDays((current) => current.includes(day) ? current.filter((x) => x !== day) : [...current,day].sort());
  const setFormLed = (id:number, patch:Partial<FormLed>) => setFormLeds((items) => items.map((x) => x.id === id ? {...x,...patch} : x));

  const resetForm = () => { setEditingId(null); setSelectedDays([1]); setTime('19:30'); setFormLeds(emptyLeds()); };
  const addOrUpdate = () => {
    if (!selectedDays.length) return;
    const leds: ScheduleLed[] = formLeds.filter((l) => l.action !== 'none').map((l) => ({ id:l.id, enabled:l.action === 'on', brightness:l.brightness, effect:l.effect, speed:l.speed, color:l.color }));
    if (!leds.length) return;
    setDraft((items) => {
      const withoutEditing = editingId ? items.filter((x) => x.id !== editingId) : items;
      const additions = selectedDays.map((day) => ({ id: crypto.randomUUID(), day, time, leds: leds.map((l) => ({...l, color:[...l.color] as [number,number,number]})) }));
      return [...withoutEditing, ...additions].sort((a,b) => a.day-b.day || a.time.localeCompare(b.time));
    });
    resetForm();
  };

  const edit = (schedule:LedSchedule) => {
    setEditingId(schedule.id); setSelectedDays([schedule.day]); setTime(schedule.time);
    const next: FormLed[] = [1,2,3].map((id) => {
      const led=schedule.leds.find((x) => x.id===id);
      return led
        ? { ...led, speed:led.speed ?? 50, action:led.enabled ? 'on' : 'off', color:[...led.color] as [number,number,number] }
        : { id, action:'none', brightness:10, effect:0, speed:50, color:[0,0,255] };
    });
    setFormLeds(next);
    window.scrollTo({top:0,behavior:'smooth'});
  };

  const exportJson = async () => {
    try {
      const path = await save({
        title: 'Heti LED-időzítések mentése',
        defaultPath: 'weekly-led-schedules.json',
        filters: [{ name: 'JSON időzítés', extensions: ['json'] }]
      });
      if (!path) return;
      await tauriApi.exportSchedulesFile(path, draft);
      setFileMessage(`${draft.length} időzítés sikeresen elmentve: ${path}`);
    } catch (error) {
      setFileMessage(`Letöltési hiba: ${String(error)}`);
    }
  };

  const importJson = async () => {
    try {
      const selected = await open({
        title: 'Heti LED-időzítések megnyitása',
        multiple: false,
        directory: false,
        filters: [{ name: 'JSON időzítés', extensions: ['json'] }]
      });
      if (!selected || Array.isArray(selected)) return;
      const imported = await tauriApi.importSchedulesFile(selected);
      setDraft(imported);
      setFileMessage(`${imported.length} időzítés betöltve. Az Arduino frissítéséhez kattints a „Mentés az Arduino-ba” gombra.`);
    } catch (error) {
      setFileMessage(`Feltöltési hiba: ${String(error)}`);
    }
  };

  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">ARDUINO IDŐZÍTÉSEK</p><h2>Heti időzítés</h2><p className="muted">Több nap és több napi időpont is beállítható.</p></div><div className="page-actions">
      <button onClick={() => onSave(draft)} disabled={busy}><Save size={17}/> Mentés az Arduino-ba</button>
      <button className="secondary" onClick={() => void exportJson()} disabled={busy}><Download size={17}/> Letöltés</button>
      <button className="secondary" onClick={() => void importJson()} disabled={busy}><Upload size={17}/> Feltöltés</button>
      <button className="secondary" onClick={onSync} disabled={busy}><Download size={17}/> Beolvasás az Arduinóból</button>
    </div></div>
    {fileMessage && <section className="panel"><p className="notice-text">{fileMessage}</p></section>}

    <section className="panel schedule-editor">
      <div className="schedule-top-row"><label>Idő<input type="time" value={time} onChange={(e) => setTime(e.target.value)}/></label><div className="day-picker"><label className="select-all"><input type="checkbox" checked={selectedDays.length===7} onChange={(e) => setSelectedDays(e.target.checked?[1,2,3,4,5,6,7]:[])}/> Összes nap kijelölése</label><div className="day-buttons">{dayShort.map((name,index) => <button type="button" key={name} className={selectedDays.includes(index+1)?'day-active':'secondary'} onClick={() => toggleDay(index+1)}>{name}</button>)}</div></div></div>
      <div className="schedule-led-grid">{formLeds.map((led) => <article className="schedule-led-card" key={led.id}><h3>LED {led.id}</h3>
        <label>Művelet<select value={led.action} onChange={(e) => setFormLed(led.id,{action:e.target.value as Action})}><option value="none">Nincs módosítás</option><option value="on">Bekapcsolás</option><option value="off">Kikapcsolás</option></select></label>
        <label>Szín<div className="color-row"><input type="color" disabled={led.action==='none'} value={rgbToHex(led.color)} onChange={(e) => setFormLed(led.id,{color:hexToRgb(e.target.value)})}/><code>RGB({led.color.join(',')})</code></div></label>
        <label>Fényerő <b>{led.brightness}</b><input type="range" min="0" max="255" disabled={led.action==='none'} value={led.brightness} onChange={(e) => setFormLed(led.id,{brightness:Number(e.target.value)})}/></label>
        <label>Effekt<select disabled={led.action==='none'} value={led.effect} onChange={(e) => setFormLed(led.id,{effect:Number(e.target.value)})}>{effects.map((name,index) => <option value={index} key={name}>{name}</option>)}</select></label>
      </article>)}</div>
      <button className="schedule-add" disabled={busy || !selectedDays.length || formLeds.every((l) => l.action==='none')} onClick={addOrUpdate}>{editingId ? 'Időzítés módosítása' : 'Új időzítés mentése'}</button>
      {editingId && <button className="secondary" onClick={resetForm}>Szerkesztés megszakítása</button>}
      <p className="notice-text">Módosítás, törlés vagy fájl feltöltése után kattints a „Mentés az Arduino-ba” gombra. Ettől a heti program app nélkül is fut tovább.</p>
    </section>

    <section className="schedule-groups">{grouped.map((group) => group.items.length > 0 && <article className="panel day-group" key={group.day}><div className="day-group-title"><h3>{group.name}</h3><span>{group.items.length} esemény</span></div>{group.items.map((schedule) => <div className="schedule-summary" key={schedule.id}><button className="summary-main" onClick={() => edit(schedule)}><strong>{schedule.time}</strong><span>{[1,2,3].map((id) => { const led=schedule.leds.find((x)=>x.id===id); return led ? `LED ${id} ${led.enabled?'be':'ki'} · ${led.brightness} · RGB(${led.color.join(',')})` : `LED ${id} nincs módosítás`; }).join(' | ')}</span></button><button className="icon-button danger" title="Törlés" onClick={() => setDraft((items) => items.filter((x) => x.id !== schedule.id))}><Trash2 size={17}/></button></div>)}</article>)}</section>
    {!draft.length && <section className="panel empty"><h3>Nincs időzítés</h3><p>Állíts be egy időpontot, válassz napokat és legalább egy LED-műveletet, vagy tölts fel egy JSON-fájlt.</p></section>}
  </div>;
}
