import { Moon, Power, Sparkles, Square, Waves } from 'lucide-react';
import type { LedStrip } from '../types';

const effects = ['Statikus', 'Villogás', 'Lélegzés', 'Szivárvány', 'Futófény'];
const rgbToHex = ([r,g,b]: [number,number,number]) => `#${[r,g,b].map((n) => n.toString(16).padStart(2,'0')).join('')}`;
const hexToRgb = (hex: string): [number,number,number] => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];

export type LedTestPreset = 'night' | 'rainbow' | 'breathe';

export function LedsPage({ strips, busy, onUpdate, onTest, onStopTest }: { strips: LedStrip[]; busy: boolean; onUpdate: (strip: LedStrip) => void; onTest: (preset: LedTestPreset) => void; onStopTest: () => void }) {
  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">KÖZVETLEN VEZÉRLÉS</p><h2>LED-szalagok</h2></div></div>
    <section className="panel test-panel">
      <div><p className="eyebrow">GYORS ELLENŐRZÉS</p><h2>LED teszt és effektek</h2><p className="muted">Gyors ellenőrzés mindhárom szalagon. A teszt ideiglenesen felülírja az aktuális kézi LED-beállítást.</p></div>
      <div className="test-actions">
        <button className="secondary" disabled={busy} onClick={() => onTest('night')}><Moon size={17}/> Éjszakai kék</button>
        <button className="secondary" disabled={busy} onClick={() => onTest('rainbow')}><Sparkles size={17}/> Szivárvány teszt</button>
        <button className="secondary" disabled={busy} onClick={() => onTest('breathe')}><Waves size={17}/> Lélegző teszt</button>
        <button className="danger" disabled={busy} onClick={onStopTest}><Square size={16}/> Teszt leállítása</button>
      </div>
      <p className="test-help">Válassz egy mintát a LED-ek és a kapcsolat gyors ellenőrzéséhez.</p>
    </section>

    <section className="led-grid">{strips.map((strip) => <article className="panel led-card" key={strip.id}>
      <div className="led-card-head"><div><span>CSATORNA {strip.id}</span><h3>LED {strip.id}</h3></div><button className={`power ${strip.enabled ? 'on' : ''}`} disabled={busy} onClick={() => onUpdate({...strip, enabled: !strip.enabled})}><Power size={22}/></button></div>
      <div className="color-preview" style={{ background: rgbToHex(strip.color), opacity: strip.enabled ? 1 : .25 }} />
      <label>Szín<div className="color-row"><input type="color" value={rgbToHex(strip.color)} onChange={(e) => onUpdate({...strip, color: hexToRgb(e.target.value)})}/><code>{rgbToHex(strip.color).toUpperCase()}</code></div></label>
      <label>Fényerő <b>{strip.brightness}</b><input type="range" min="0" max="255" value={strip.brightness} onChange={(e) => onUpdate({...strip, brightness: Number(e.target.value)})}/></label>
      <label>Effekt<select value={strip.effect} onChange={(e) => onUpdate({...strip, effect: Number(e.target.value)})}>{effects.map((name,index) => <option key={name} value={index}>{name}</option>)}</select></label>
      <label>Effektsebesség <b>{strip.speed}</b><input type="range" min="1" max="100" value={strip.speed} onChange={(e) => onUpdate({...strip, speed: Number(e.target.value)})}/></label>
    </article>)}</section>
  </div>;
}
