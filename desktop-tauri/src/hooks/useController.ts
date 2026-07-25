import { useCallback, useEffect, useRef, useState } from 'react';
import { tauriApi } from '../services/tauriApi';
import type { ArduinoLog, ArduinoStatus, ConnectionConfig, FirmwareStatus, LedSchedule, LedStrip, NetworkLog } from '../types';
import type { LedTestPreset } from '../pages/LedsPage';

const fallbackConfig: ConnectionConfig = {
  arduinoIp: '10.0.0.117', arduinoPort: 80, arduinoApiPath: '', arduinoApiKey: '',
  otaUploadPort: 65280
};

export function useController() {
  const [config, setConfig] = useState<ConnectionConfig>(fallbackConfig);
  const [status, setStatus] = useState<ArduinoStatus | null>(null);
  const [logs, setLogs] = useState<ArduinoLog[]>([]);
  const [networkLogs, setNetworkLogs] = useState<NetworkLog[]>([]);
  const [schedules, setSchedules] = useState<LedSchedule[]>([]);
  const [firmware, setFirmware] = useState<FirmwareStatus | null>(null);
  const [otaPassword, setOtaPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Kapcsolatra vár…');
  const testSnapshot = useRef<LedStrip[] | null>(null);

  const refresh = useCallback(async () => {
    const [statusResult, logResult, networkResult] = await Promise.allSettled([tauriApi.status(), tauriApi.logs(), tauriApi.networkLogs()]);
    if (statusResult.status === 'fulfilled') { setStatus({ ...statusResult.value, connected: true }); setMessage(`Kapcsolódva: ${config.arduinoIp}:${config.arduinoPort}`); }
    else { setStatus((current) => ({ ...(current ?? {}), connected: false })); setMessage(`Arduino nem érhető el: ${String(statusResult.reason)}`); }
    if (logResult.status === 'fulfilled') setLogs(logResult.value.slice().reverse());
    if (networkResult.status === 'fulfilled') setNetworkLogs(networkResult.value.slice().reverse());
  }, [config.arduinoIp, config.arduinoPort]);

  const refreshFirmware = useCallback(async () => {
    setBusy(true);
    try { const value = await tauriApi.firmwareStatus(); setFirmware(value); setMessage(value.message); }
    catch (error) { setMessage(`Firmware-ellenőrzési hiba: ${String(error)}`); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { void (async () => {
    const saved = await tauriApi.loadConfig().catch(() => fallbackConfig); setConfig(saved);
    setSchedules(await tauriApi.loadSchedules().catch(() => []));
    try { const remote = await tauriApi.loadSchedulesFromArduino(); setSchedules(remote); setMessage(`${remote.length} időzítés beolvasva az Arduinóból.`); } catch { /* local fallback */ }
  })(); }, []);
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 15_000); return () => window.clearInterval(timer); }, [refresh]);

  const saveConfig = async () => { setBusy(true); try { await tauriApi.saveConfig(config); if (otaPassword) { await tauriApi.saveOtaPassword(otaPassword); setOtaPassword(''); } setMessage('Kapcsolati és OTA-beállítások mentve.'); await refresh(); } catch (error) { setMessage(`Mentési hiba: ${String(error)}`); } finally { setBusy(false); } };
  const updateStrip = async (strip: LedStrip) => { setBusy(true); try { await tauriApi.setLed(strip); setMessage(`LED ${strip.id} beállítva.`); await refresh(); } catch (error) { setMessage(`LED ${strip.id} hiba: ${String(error)}`); } finally { setBusy(false); } };
  const syncSchedulesFromArduino = async () => { setBusy(true); try { const remote = await tauriApi.loadSchedulesFromArduino(); setSchedules(remote); setMessage(`${remote.length} időzítés beolvasva az Arduino memóriájából.`); } catch (error) { setMessage(`Beolvasási hiba: ${String(error)}`); } finally { setBusy(false); } };
  const saveSchedules = async (next: LedSchedule[]) => { setBusy(true); try { const result = await tauriApi.saveSchedules(next); setSchedules(next); setMessage(`${result.count} időzítés feltöltve; visszaellenőrizve: ${result.verifiedCount}.`); } catch (error) { setMessage(`Időzítés-szinkron hiba: ${String(error)}`); } finally { setBusy(false); } };

  const runLedTest = async (preset: LedTestPreset) => {
    setBusy(true);
    try {
      if (!testSnapshot.current) testSnapshot.current = (status?.strips ?? []).map((s) => ({...s, color:[...s.color] as [number,number,number]}));
      const presets: Record<LedTestPreset, Omit<LedStrip,'id'> & { color:[number,number,number] }> = {
        night: { enabled:true, brightness:40, effect:0, speed:50, color:[0,0,255] },
        rainbow: { enabled:true, brightness:180, effect:3, speed:45, color:[255,255,255] },
        breathe: { enabled:true, brightness:140, effect:2, speed:35, color:[80,140,255] }
      };
      for (const id of [1,2,3]) await tauriApi.setLed({id,...presets[preset]});
      setMessage(`LED teszt elindítva: ${preset === 'night' ? 'Éjszakai kék' : preset === 'rainbow' ? 'Szivárvány' : 'Lélegző'}.`);
      await refresh();
    } catch (error) { setMessage(`LED teszthiba: ${String(error)}`); }
    finally { setBusy(false); }
  };

  const stopLedTest = async () => {
    setBusy(true);
    try {
      const restore = testSnapshot.current;
      if (restore?.length) { for (const strip of restore) await tauriApi.setLed(strip); }
      else { for (const id of [1,2,3]) await tauriApi.setLed({id,enabled:false,brightness:0,effect:0,speed:50,color:[0,0,0]}); }
      testSnapshot.current = null;
      setMessage('LED teszt leállítva; az előző kézi állapot visszaállítva.');
      await refresh();
    } catch (error) { setMessage(`LED teszt leállítási hiba: ${String(error)}`); }
    finally { setBusy(false); }
  };

  const updateFirmware = async () => { setBusy(true); try { const result = await tauriApi.firmwareUpdate(); setFirmware(result); setMessage(result.message); await refresh(); } catch (error) { setMessage(`OTA-frissítési hiba: ${String(error)}`); } finally { setBusy(false); } };

  return { config, setConfig, status, logs, networkLogs, schedules, firmware, otaPassword, setOtaPassword, busy, message, refresh, refreshFirmware, saveConfig, updateStrip, runLedTest, stopLedTest, saveSchedules, syncSchedulesFromArduino, updateFirmware };
}
