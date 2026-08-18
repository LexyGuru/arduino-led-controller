import {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import type {
  ConnectionConfig,
  ConnectionHealthState,
  RuntimeCapabilities
} from '../types';

export type StartupCheckState = 'pending' | 'pass' | 'warn';
export type StartupCheckId =
  | 'shell'
  | 'theme'
  | 'version'
  | 'runtime'
  | 'config'
  | 'schedules'
  | 'storage'
  | 'arduino';

export interface StartupCheck {
  id: StartupCheckId;
  labelKey: string;
  state: StartupCheckState;
  detailKey?: string;
}

interface StartupGateOptions {
  initialized: boolean;
  appVersion: string;
  capabilities: RuntimeCapabilities;
  config: ConnectionConfig;
  scheduleCount: number;
  connectionHealth: ConnectionHealthState;
}

const MIN_VISIBLE_MS = 2200;
const SOFT_NETWORK_WAIT_MS = 3200;
const MAX_VISIBLE_MS = 4800;
const EXIT_MS = 420;

const INITIAL_CHECKS: StartupCheck[] = [
  { id: 'shell', labelKey: 'startup.check.shell', state: 'pending' },
  { id: 'theme', labelKey: 'startup.check.theme', state: 'pending' },
  { id: 'version', labelKey: 'startup.check.version', state: 'pending' },
  { id: 'runtime', labelKey: 'startup.check.runtime', state: 'pending' },
  { id: 'config', labelKey: 'startup.check.config', state: 'pending' },
  { id: 'schedules', labelKey: 'startup.check.schedules', state: 'pending' },
  { id: 'storage', labelKey: 'startup.check.storage', state: 'pending' },
  { id: 'arduino', labelKey: 'startup.check.arduino', state: 'pending' }
];

function hasConnectionTarget(config: ConnectionConfig) {
  return Boolean(config.localArduinoIp?.trim() || config.arduinoIp?.trim());
}

export function useAppStartupGate({
  initialized,
  appVersion,
  capabilities,
  config,
  scheduleCount,
  connectionHealth
}: StartupGateOptions) {
  const startedAt = useRef(Date.now());
  const [checks, setChecks] = useState<StartupCheck[]>(INITIAL_CHECKS);
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  const update = (id: StartupCheckId, state: StartupCheckState, detailKey?: string) => {
    setChecks((current) =>
      current.map((check) =>
        check.id === id ? { ...check, state, detailKey } : check
      )
    );
  };

  useEffect(() => {
    const shellTimer = window.setTimeout(() => update('shell', 'pass'), 80);

    try {
      const key = '__alc_v584_startup_probe__';
      globalThis.localStorage?.setItem(key, '1');
      globalThis.localStorage?.removeItem(key);
      update('storage', 'pass');
    } catch {
      update('storage', 'warn', 'startup.detail.storageFallback');
    }

    let themeAttempts = 0;
    const themeTimer = window.setInterval(() => {
      themeAttempts += 1;
      if (document.documentElement.dataset.themeEngine === '3.0') {
        update('theme', 'pass');
        window.clearInterval(themeTimer);
      } else if (themeAttempts >= 20) {
        update('theme', 'warn', 'startup.detail.themeFallback');
        window.clearInterval(themeTimer);
      }
    }, 50);

    return () => {
      window.clearTimeout(shellTimer);
      window.clearInterval(themeTimer);
    };
  }, []);

  useEffect(() => {
    if (!appVersion || appVersion === '…') return;
    const validRuntimeVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(appVersion);
    update(
      'version',
      validRuntimeVersion ? 'pass' : 'warn',
      validRuntimeVersion ? undefined : 'startup.detail.versionUnexpected'
    );
  }, [appVersion]);

  useEffect(() => {
    if (!initialized) return;

    update(
      'runtime',
      'pass',
      capabilities.platform === 'unknown' ? 'startup.detail.runtimeGeneric' : undefined
    );
    update(
      'config',
      'pass',
      hasConnectionTarget(config) ? undefined : 'startup.detail.configFirstRun'
    );
    update(
      'schedules',
      'pass',
      scheduleCount === 0 ? 'startup.detail.schedulesEmpty' : undefined
    );

    if (!hasConnectionTarget(config)) {
      update('arduino', 'warn', 'startup.detail.arduinoUnconfigured');
    }
  }, [initialized, capabilities.platform, config, scheduleCount]);

  useEffect(() => {
    if (!initialized || !hasConnectionTarget(config)) return;

    if (connectionHealth.state === 'healthy') {
      update('arduino', 'pass');
      return;
    }

    if (connectionHealth.state === 'offline') {
      update('arduino', 'warn', 'startup.detail.arduinoOffline');
      return;
    }

    const timer = window.setTimeout(() => {
      update(
        'arduino',
        connectionHealth.state === 'healthy' ? 'pass' : 'warn',
        connectionHealth.state === 'healthy'
          ? undefined
          : 'startup.detail.arduinoBackground'
      );
    }, SOFT_NETWORK_WAIT_MS);

    return () => window.clearTimeout(timer);
  }, [initialized, config, connectionHealth.state]);

  useEffect(() => {
    const maxTimer = window.setTimeout(() => {
      setChecks((current) =>
        current.map((check) =>
          check.state === 'pending'
            ? { ...check, state: 'warn', detailKey: 'startup.detail.backgroundContinue' }
            : check
        )
      );
    }, MAX_VISIBLE_MS);
    return () => window.clearTimeout(maxTimer);
  }, []);

  const complete = checks.every((check) => check.state !== 'pending');

  useEffect(() => {
    if (!complete || exiting || !visible) return;
    const elapsed = Date.now() - startedAt.current;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const exitTimer = window.setTimeout(() => {
      setExiting(true);
      window.setTimeout(() => setVisible(false), EXIT_MS);
    }, wait);
    return () => window.clearTimeout(exitTimer);
  }, [complete, exiting, visible]);

  const progress = useMemo(() => {
    const finished = checks.filter((check) => check.state !== 'pending').length;
    return Math.round((finished / checks.length) * 100);
  }, [checks]);

  const warningCount = checks.filter((check) => check.state === 'warn').length;

  return {
    checks,
    progress,
    warningCount,
    visible,
    exiting,
    blocking: visible && !exiting
  };
}
