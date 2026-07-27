import { useCallback, useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { tauriApi } from '../services/tauriApi';
import type { ArduinoLog, ArduinoStatus, ConnectionConfig, FirmwareStatus, LedSchedule, LedStrip, NetworkLog, OtaProgressEvent, PageId } from '../types';
import type { LedTestPreset } from '../pages/LedsPage';

const fallbackConfig: ConnectionConfig = {
  arduinoIp: 'lexyguruhome.ddns.net',
  arduinoPort: 25666,
  localArduinoIp: '10.0.0.123',
  localArduinoPort: 80,
  preferLocal: true,
  arduinoApiPath: '',
  arduinoApiKey: ''
};

export function useController(activePage: PageId) {
  const [config, setConfig] = useState<ConnectionConfig>(fallbackConfig);
  const [status, setStatus] = useState<ArduinoStatus | null>(null);
  const [logs, setLogs] = useState<ArduinoLog[]>([]);
  const [networkLogs, setNetworkLogs] = useState<NetworkLog[]>([]);
  const [schedules, setSchedules] = useState<LedSchedule[]>([]);
  const [firmware, setFirmware] = useState<FirmwareStatus | null>(null);
  const [otaLogs, setOtaLogs] = useState<OtaProgressEvent[]>([]);
  const [otaProgress, setOtaProgress] = useState(0);
  const [otaStage, setOtaStage] = useState('Készen áll');
  const [otaPassword, setOtaPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [message, setMessage] = useState('Kapcsolatra vár…');
  const testSnapshot = useRef<LedStrip[] | null>(null);
  const lastConsoleId = useRef(0);
  const consoleRequestInFlight = useRef(false);
  const statusRequestInFlight = useRef(false);
  const statusHealthy = useRef(false);
  const consecutiveStatusFailures = useRef(0);
  const consolePausedUntil = useRef(0);
  const [consoleError, setConsoleError] = useState<string | null>(null);

  const refreshConsole = useCallback(async (force = false) => {
    if (consoleRequestInFlight.current || busy || !initialized) return;
    if (!force && document.visibilityState !== 'visible') return;
    if (!force && (!statusHealthy.current || Date.now() < consolePausedUntil.current)) return;

    consoleRequestInFlight.current = true;
    try {
      const previousLastId = lastConsoleId.current;
      const response = await tauriApi.logs(previousLastId);
      const incoming = Array.isArray(response?.logs) ? response.logs : [];
      const receivedLastId = incoming.reduce((maximum, entry) => Math.max(maximum, Number(entry.id) || 0), 0);
      const authoritativeLastId = Math.max(Number(response?.lastId) || 0, receivedLastId);
      const deviceRestarted = authoritativeLastId < previousLastId;

      if (deviceRestarted) {
        setLogs([...incoming].sort((a, b) => b.id - a.id).slice(0, 500));
      } else if (incoming.length) {
        setLogs((current) => {
          const merged = [...current, ...incoming];
          const unique = Array.from(new Map(merged.map((entry) => [entry.id, entry])).values());
          return unique.sort((a, b) => b.id - a.id).slice(0, 500);
        });
      }

      lastConsoleId.current = authoritativeLastId;
      setConsoleError(null);
      consolePausedUntil.current = 0;
    } catch (error) {
      const text = String(error);
      setConsoleError(text);
      // Egy sikertelen konzolkérés után nem ostromoljuk tovább az UNO R4-et.
      consolePausedUntil.current = Date.now() + 15_000;
    } finally {
      consoleRequestInFlight.current = false;
    }
  }, [busy, initialized]);

  const refresh = useCallback(async () => {
    if (statusRequestInFlight.current || busy || !initialized) return;
    statusRequestInFlight.current = true;
    try {
      const statusValue = await tauriApi.status();
      setStatus({ ...statusValue, connected: true });
      statusHealthy.current = true;
      consecutiveStatusFailures.current = 0;
      consolePausedUntil.current = 0;
      const target = statusValue.ipAddress
        ? `${statusValue.ipAddress}:${config.localArduinoPort || 80}`
        : `${config.localArduinoIp || config.arduinoIp}:${config.localArduinoPort || config.arduinoPort}`;
      setMessage(`Kapcsolódva: ${target}`);
    } catch (error) {
      consecutiveStatusFailures.current += 1;
      statusHealthy.current = false;
      const pause = Math.min(60_000, 10_000 * consecutiveStatusFailures.current);
      consolePausedUntil.current = Date.now() + pause;
      setStatus((current) => ({ ...(current ?? {}), connected: false } as ArduinoStatus));
      setMessage(`Arduino nem érhető el: ${String(error)}`);
    } finally {
      statusRequestInFlight.current = false;
      try {
        const values = await tauriApi.networkLogs();
        setNetworkLogs(values.slice().reverse());
      } catch {
        // A helyi hálózati napló hibája nem változtatja meg az Arduino állapotát.
      }
    }
  }, [busy, config.arduinoIp, config.arduinoPort, config.localArduinoIp, config.localArduinoPort, initialized]);

  const refreshFirmware = useCallback(async () => {
    setBusy(true);
    try {
      const value = await tauriApi.firmwareStatus();
      setFirmware(value);
      setMessage(value.message);
    } catch (error) {
      setMessage(`Firmware-ellenőrzési hiba: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    const unlistenPromise = listen<OtaProgressEvent>('ota-progress', (event) => {
      if (disposed) return;
      const entry = event.payload;
      setOtaLogs((current) => [...current, entry].slice(-300));
      setOtaStage(entry.stage || 'OTA');
      if (typeof entry.progress === 'number') {
        setOtaProgress(Math.max(0, Math.min(100, entry.progress)));
      }
      setFirmware((current) => current ? {
        ...current,
        state: entry.level === 'error' ? 'error' : entry.progress === 100 ? 'success' : 'updating',
        message: entry.message,
        progress: entry.progress ?? current.progress,
        phase: entry.stage
      } : current);
    });
    return () => {
      disposed = true;
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const saved = await tauriApi.loadConfig().catch(() => fallbackConfig);
      const merged = { ...fallbackConfig, ...saved };
      const localSchedules = await tauriApi.loadSchedules().catch(() => []);
      if (!active) return;
      setConfig(merged);
      setSchedules(localSchedules);
      // Nem olvassuk be automatikusan az összes Arduino-időzítést. 28 rekord
      // korábban induláskor több tucat HTTP-kérést és hosszú kérési sort okozott.
      setInitialized(true);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!initialized || busy) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(timer);
  }, [refresh, initialized, busy]);

  useEffect(() => {
    if (!initialized || busy || activePage !== 'logs') return;
    const starter = window.setTimeout(() => void refreshConsole(true), 1_500);
    const timer = window.setInterval(() => void refreshConsole(), 5_000);
    return () => {
      window.clearTimeout(starter);
      window.clearInterval(timer);
    };
  }, [refreshConsole, initialized, busy, activePage]);

  const saveConfig = async () => {
    setBusy(true);
    try {
      await tauriApi.saveConfig(config);
      if (otaPassword) {
        await tauriApi.saveOtaPassword(otaPassword);
        setOtaPassword('');
      }
      lastConsoleId.current = 0;
      setLogs([]);
      setConsoleError(null);
      statusHealthy.current = false;
      consecutiveStatusFailures.current = 0;
      consolePausedUntil.current = 0;
      setMessage('Kapcsolati és OTA-beállítások mentve.');
    } catch (error) {
      setMessage(`Mentési hiba: ${String(error)}`);
    } finally {
      setBusy(false);
    }
    window.setTimeout(() => void refresh(), 250);
  };

  const updateStrip = async (strip: LedStrip) => {
    setBusy(true);
    try {
      await tauriApi.setLed(strip);
      setMessage(`LED ${strip.id} beállítva.`);
    } catch (error) {
      setMessage(`LED ${strip.id} hiba: ${String(error)}`);
    } finally {
      setBusy(false);
    }
    window.setTimeout(() => void refresh(), 250);
  };

  const syncSchedulesFromArduino = async () => {
    setBusy(true);
    try {
      const remote = await tauriApi.loadSchedulesFromArduino();
      setSchedules(remote);
      setMessage(`${remote.length} időzítés beolvasva az Arduino memóriájából.`);
    } catch (error) {
      setMessage(`Beolvasási hiba: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const saveSchedules = async (next: LedSchedule[]) => {
    setBusy(true);
    try {
      const result = await tauriApi.saveSchedules(next);
      setSchedules(next);
      setMessage(`${result.count} időzítés feltöltve; visszaellenőrizve: ${result.verifiedCount}.`);
    } catch (error) {
      setMessage(`Időzítés-szinkron hiba: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const runLedTest = async (preset: LedTestPreset) => {
    setBusy(true);
    try {
      if (!testSnapshot.current) testSnapshot.current = (status?.strips ?? []).map((s) => ({ ...s, color: [...s.color] as [number, number, number] }));
      const presets: Record<LedTestPreset, Omit<LedStrip, 'id'> & { color: [number, number, number] }> = {
        night: { enabled: true, brightness: 40, effect: 0, speed: 50, color: [0, 0, 255] },
        rainbow: { enabled: true, brightness: 180, effect: 3, speed: 45, color: [255, 255, 255] },
        breathe: { enabled: true, brightness: 140, effect: 2, speed: 35, color: [80, 140, 255] }
      };
      for (const id of [1, 2, 3]) await tauriApi.setLed({ id, ...presets[preset] });
      setMessage(`LED teszt elindítva: ${preset === 'night' ? 'Éjszakai kék' : preset === 'rainbow' ? 'Szivárvány' : 'Lélegző'}.`);
    } catch (error) {
      setMessage(`LED teszthiba: ${String(error)}`);
    } finally {
      setBusy(false);
    }
    window.setTimeout(() => void refresh(), 250);
  };

  const stopLedTest = async () => {
    setBusy(true);
    try {
      const restore = testSnapshot.current;
      if (restore?.length) {
        for (const strip of restore) await tauriApi.setLed(strip);
      } else {
        for (const id of [1, 2, 3]) await tauriApi.setLed({ id, enabled: false, brightness: 0, effect: 0, speed: 50, color: [0, 0, 0] });
      }
      testSnapshot.current = null;
      setMessage('LED teszt leállítva; az előző kézi állapot visszaállítva.');
    } catch (error) {
      setMessage(`LED teszt leállítási hiba: ${String(error)}`);
    } finally {
      setBusy(false);
    }
    window.setTimeout(() => void refresh(), 250);
  };

  const updateFirmware = async () => {
    setBusy(true);
    setOtaLogs([]);
    setOtaProgress(0);
    setOtaStage('Indítás');
    try {
      const result = await tauriApi.firmwareUpdate();
      setFirmware(result);
      setOtaProgress(100);
      setOtaStage('Kész');
      setMessage(result.message);
    } catch (error) {
      const text = String(error);
      setOtaStage('Hiba');
      setOtaLogs((current) => current.at(-1)?.message === text ? current : [...current, {
        timestamp: Date.now(),
        stage: 'Hiba',
        level: 'error',
        message: text
      }].slice(-300));
      setMessage(`OTA-frissítési hiba: ${text}`);
    } finally {
      setBusy(false);
    }
    window.setTimeout(() => void refresh(), 1_500);
  };

  return { config, setConfig, status, logs, consoleError, networkLogs, schedules, firmware, otaLogs, otaProgress, otaStage, otaPassword, setOtaPassword, busy, message, refresh, refreshFirmware, saveConfig, updateStrip, runLedTest, stopLedTest, saveSchedules, syncSchedulesFromArduino, updateFirmware };
}
