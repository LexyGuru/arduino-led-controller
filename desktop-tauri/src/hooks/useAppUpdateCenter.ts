import { useCallback, useEffect, useRef, useState } from 'react';
import { tauriApi } from '../services/tauriApi';
import type { ConnectionConfig } from '../types';

export type AppUpdatePhase =
  | 'idle'
  | 'checking'
  | 'current'
  | 'available'
  | 'error';

export interface AppUpdateState {
  phase: AppUpdatePhase;
  currentVersion: string;
  latestVersion: string | null;
  channel: 'stable' | 'beta';
  updateAvailable: boolean;
  downloadUrl: string | null;
  releaseUrl: string | null;
  checkedAt: number | null;
  error: string | null;
  checking: boolean;
  checkNow: () => Promise<void>;
}

const LAST_CHECK_KEY = 'arduino-led-controller.app-update.last-check.v1';
const SIX_HOURS = 6 * 60 * 60 * 1000;

function versionParts(value: string) {
  const normalized = value.trim().replace(/^v/i, '');
  const [core, pre = ''] = normalized.split('-', 2);
  return {
    core: core.split('.').map((part) => Number(part) || 0),
    pre: pre.toLowerCase()
  };
}

function compareVersions(left: string, right: string) {
  const a = versionParts(left);
  const b = versionParts(right);
  const length = Math.max(a.core.length, b.core.length);

  for (let index = 0; index < length; index += 1) {
    const delta = (a.core[index] ?? 0) - (b.core[index] ?? 0);
    if (delta !== 0) return delta;
  }

  if (a.pre === b.pre) return 0;
  if (!a.pre) return 1;
  if (!b.pre) return -1;

  const parsePre = (value: string) => {
    const match = value.match(/^([a-z]+)[.-]?(\d+)?/);
    return {
      label: match?.[1] ?? value,
      number: Number(match?.[2] ?? 0)
    };
  };

  const pa = parsePre(a.pre);
  const pb = parsePre(b.pre);
  const rank = (label: string) =>
    label === 'alpha' ? 0 : label === 'beta' ? 1 : label === 'rc' ? 2 : 3;

  const rankDelta = rank(pa.label) - rank(pb.label);
  if (rankDelta !== 0) return rankDelta;
  return pa.number - pb.number;
}

function readLastCheck() {
  try {
    const value = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function storeLastCheck(value: number) {
  try {
    localStorage.setItem(LAST_CHECK_KEY, String(value));
  } catch {
    // Persistent timestamp is a convenience only.
  }
}

export function useAppUpdateCenter(
  config: Pick<ConnectionConfig, 'updateChannel' | 'autoCheckUpdates'>
): AppUpdateState {
  const mounted = useRef(true);
  const [phase, setPhase] = useState<AppUpdatePhase>('idle');
  const [currentVersion, setCurrentVersion] = useState('…');
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [releaseUrl, setReleaseUrl] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<number | null>(() => readLastCheck());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const checkNow = useCallback(async () => {
    setPhase('checking');
    setError(null);

    try {
      const [runtimeVersion, status] = await Promise.all([
        tauriApi.appVersion(),
        tauriApi.firmwareStatus()
      ]);

      if (!mounted.current) return;

      const current =
        status.appCurrentVersion?.trim() ||
        runtimeVersion.trim() ||
        '…';

      const artifact = status.availableApp;
      const latest =
        artifact?.version?.trim() ||
        artifact?.tag?.trim() ||
        null;

      const available =
        status.appUpdateAvailable === true ||
        Boolean(
          latest &&
          current !== '…' &&
          compareVersions(latest, current) > 0
        );

      const now = Date.now();
      setCurrentVersion(current);
      setLatestVersion(latest);
      setDownloadUrl(artifact?.downloadUrl || null);
      setReleaseUrl(artifact?.releaseUrl || null);
      setCheckedAt(now);
      storeLastCheck(now);
      setPhase(available ? 'available' : 'current');
    } catch (caught) {
      if (!mounted.current) return;
      try {
        const runtimeVersion = await tauriApi.appVersion();
        if (mounted.current) setCurrentVersion(runtimeVersion);
      } catch {
        // Keep last known current version.
      }
      setError(String(caught));
      setPhase('error');
    }
  }, [config.updateChannel]);

  useEffect(() => {
    if (!config.autoCheckUpdates) {
      void tauriApi.appVersion()
        .then((version) => {
          if (mounted.current) setCurrentVersion(version);
        })
        .catch(() => undefined);
      return;
    }

    void checkNow();
    const timer = window.setInterval(() => {
      void checkNow();
    }, SIX_HOURS);

    return () => window.clearInterval(timer);
  }, [checkNow, config.autoCheckUpdates]);

  return {
    phase,
    currentVersion,
    latestVersion,
    channel: config.updateChannel,
    updateAvailable: phase === 'available',
    downloadUrl,
    releaseUrl,
    checkedAt,
    error,
    checking: phase === 'checking',
    checkNow
  };
}
