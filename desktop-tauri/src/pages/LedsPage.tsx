import { useEffect, useRef, useState } from 'react';
import { Moon, Power, Sparkles, Square, Waves } from 'lucide-react';
import type { LedStrip } from '../types';

const effects = ['Statikus', 'Villogás', 'Lélegzés', 'Szivárvány', 'Futófény'];
const SEND_DELAY_MS = 4000;
const rgbToHex = ([r,g,b]: [number,number,number]) => `#${[r,g,b].map((n) => n.toString(16).padStart(2,'0')).join('')}`;
const hexToRgb = (hex: string): [number,number,number] => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export type LedTestPreset = 'night' | 'rainbow' | 'breathe';

type LedCardProps = { strip: LedStrip; busy: boolean; onUpdate: (strip: LedStrip) => void };

function LedCard({ strip, busy, onUpdate }: LedCardProps) {
  const [draft, setDraft] = useState<LedStrip>(strip);
  const [pendingField, setPendingField] = useState<'brightness' | 'speed' | null>(null);
  const timer = useRef<number | null>(null);
  const latest = useRef<LedStrip>(strip);

  useEffect(() => {
    latest.current = draft;
  }, [draft]);

  useEffect(() => {
    if (timer.current === null) {
      setDraft(strip);
      latest.current = strip;
    }
  }, [strip]);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  const sendNow = (next: LedStrip) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setPendingField(null);
    setDraft(next);
    latest.current = next;
    onUpdate(next);
  };

  const scheduleSend = (next: LedStrip, field: 'brightness' | 'speed') => {
    setDraft(next);
    latest.current = next;
    setPendingField(field);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setPendingField(null);
      onUpdate(latest.current);
    }, SEND_DELAY_MS);
  };

  const numberKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
      sendNow(latest.current);
    }
  };

  return <article className="panel led-card">
    <div className="led-card-head"><div><span>CSATORNA {draft.id}</span><h3>LED {draft.id}</h3></div><button className={`power ${draft.enabled ? 'on' : ''}`} disabled={busy} onClick={() => sendNow({...draft, enabled: !draft.enabled})}><Power size={22}/></button></div>
    <div className="color-preview" style={{ background: rgbToHex(draft.color), opacity: draft.enabled ? 1 : .25 }} />
    <label>Szín<div className="color-row"><input type="color" value={rgbToHex(draft.color)} onChange={(e) => sendNow({...draft, color: hexToRgb(e.target.value)})}/><code>{rgbToHex(draft.color).toUpperCase()}</code></div></label>

    <label>Fényerő
      <div className="slider-number-row">
        <input type="range" min="0" max="255" value={draft.brightness} onChange={(e) => scheduleSend({...draft, brightness: clamp(Number(e.target.value), 0, 255)}, 'brightness')}/>
        <input className="value-number" type="number" min="0" max="255" value={draft.brightness}
          onChange={(e) => scheduleSend({...draft, brightness: clamp(Number(e.target.value), 0, 255)}, 'brightness')}
          onBlur={() => sendNow(latest.current)} onKeyDown={numberKeyDown}/>
      </div>
      <span className="send-hint">{pendingField === 'brightness' ? 'Küldés 4 másodperc nyugalom után…' : '0–255 · Enterrel azonnal küldhető'}</span>
    </label>

    <label>Effekt<select value={draft.effect} onChange={(e) => sendNow({...draft, effect: Number(e.target.value)})}>{effects.map((name,index) => <option key={name} value={index}>{name}</option>)}</select></label>

    <label>Effektsebesség
      <div className="slider-number-row">
        <input type="range" min="1" max="100" value={draft.speed} onChange={(e) => scheduleSend({...draft, speed: clamp(Number(e.target.value), 1, 100)}, 'speed')}/>
        <input className="value-number" type="number" min="1" max="100" value={draft.speed}
          onChange={(e) => scheduleSend({...draft, speed: clamp(Number(e.target.value), 1, 100)}, 'speed')}
          onBlur={() => sendNow(latest.current)} onKeyDown={numberKeyDown}/>
      </div>
      <span className="send-hint">{pendingField === 'speed' ? 'Küldés 4 másodperc nyugalom után…' : '1–100 · Enterrel azonnal küldhető'}</span>
    </label>
  </article>;
}

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
    <section className="led-grid">{strips.map((strip) => <LedCard strip={strip} busy={busy} onUpdate={onUpdate} key={strip.id}/>)}</section>
  </div>;
}
