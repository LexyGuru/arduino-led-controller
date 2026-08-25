import { I18nText } from "../../i18n";
import { Activity, Clock3, Cpu, Database, Radio, RefreshCw, Wifi } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n';
import type { ArduinoDiagnosticsResult } from '../../types';
type JsonRecord = Record<string, unknown>;
type DiagnosticsTrendSample = {
    capturedAt: number;
    bootEpoch: string | null;
    rssi: number | null;
    httpTimeouts: number | null;
    httpRejected: number | null;
    httpServerErrors: number | null;
    httpMaxMs: number | null;
    schedulerMaxUs: number | null;
    renderMaxUs: number | null;
    statusMaxUs: number | null;
    eepromChangedBytes: number | null;
};
type DiagnosticsWarning = {
    id: string;
    message: string;
};
function record(value: unknown): JsonRecord {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as JsonRecord
        : {};
}
function numberValue(source: JsonRecord, key: string): number | null {
    const value = source[key];
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : null;
}
function booleanValue(source: JsonRecord, key: string): boolean | null {
    const value = source[key];
    return typeof value === 'boolean'
        ? value
        : null;
}
function metric(value: number | null, suffix = '') {
    return value == null ? '—' : `${value}${suffix}`;
}
function sampleFromDiagnostics(value: ArduinoDiagnosticsResult | null): DiagnosticsTrendSample | null {
    if (!value?.supported || !value.diagnostics)
        return null;
    const root = record(value.diagnostics), runtime = record(root.runtime), wifi = record(root.wifi), http = record(root.http), scheduler = record(root.scheduler), performance = record(root.performance), render = record(performance.render), status = record(performance.status), storage = record(root.storage);
    const rawBootId = runtime.bootId, rawBootGeneration = runtime.bootGeneration;
    const bootEpoch = typeof rawBootId === 'string' || typeof rawBootId === 'number' ? String(rawBootId) : typeof rawBootGeneration === 'string' || typeof rawBootGeneration === 'number' ? `generation:${rawBootGeneration}` : null;
    return { capturedAt: Date.now(), bootEpoch, rssi: numberValue(wifi, 'rssi'), httpTimeouts: numberValue(http, 'timeouts'), httpRejected: numberValue(http, 'rejected'), httpServerErrors: numberValue(http, 'serverErrors'), httpMaxMs: numberValue(http, 'maxMs'), schedulerMaxUs: numberValue(scheduler, 'maxUs'), renderMaxUs: numberValue(render, 'maxUs'), statusMaxUs: numberValue(status, 'maxUs'), eepromChangedBytes: numberValue(storage, 'eepromChangedBytes') };
}
function deltaLabel(previous: number | null, latest: number | null, suffix = '') { if (previous == null || latest == null)
    return '—'; const delta = latest - previous; return `${delta > 0 ? '+' : ''}${delta}${suffix}`; }
function buildWarnings(history: DiagnosticsTrendSample[]): DiagnosticsWarning[] {
    const latest = history.at(-1), previous = history.at(-2);
    if (!latest)
        return [];
    const warnings: DiagnosticsWarning[] = [];
    if (latest.rssi != null && latest.rssi <= -75)
        warnings.push({ id: 'wifi', message: `Weak Wi-Fi: ${latest.rssi} dBm` });
    if (previous && latest.httpTimeouts != null && previous.httpTimeouts != null && latest.httpTimeouts > previous.httpTimeouts)
        warnings.push({ id: 'http-timeouts', message: 'HTTP timeout counter increased' });
    if (previous && latest.httpRejected != null && previous.httpRejected != null && latest.httpRejected > previous.httpRejected)
        warnings.push({ id: 'http-rejected', message: 'HTTP rejected counter increased' });
    if (previous && latest.httpServerErrors != null && previous.httpServerErrors != null && latest.httpServerErrors > previous.httpServerErrors)
        warnings.push({ id: 'http-server-errors', message: 'HTTP server-error counter increased' });
    if (latest.httpMaxMs != null && latest.httpMaxMs >= 500)
        warnings.push({ id: 'http-latency', message: `HTTP max latency ${latest.httpMaxMs} ms` });
    if (latest.schedulerMaxUs != null && latest.schedulerMaxUs >= 5000)
        warnings.push({ id: 'scheduler', message: `Scheduler peak ${latest.schedulerMaxUs} µs` });
    if (latest.renderMaxUs != null && latest.renderMaxUs >= 20000)
        warnings.push({ id: 'render', message: `Render peak ${latest.renderMaxUs} µs` });
    if (latest.statusMaxUs != null && latest.statusMaxUs >= 10000)
        warnings.push({ id: 'status-build', message: `Status build peak ${latest.statusMaxUs} µs` });
    if (previous && latest.eepromChangedBytes != null && previous.eepromChangedBytes != null && latest.eepromChangedBytes - previous.eepromChangedBytes >= 512)
        warnings.push({ id: 'eeprom', message: 'EEPROM changed-byte counter jumped by ≥512 B' });
    return warnings;
}
export function DiagnosticsPanel({ value, error, pollIntervalMs, busy, onRefresh }: {
    value: ArduinoDiagnosticsResult | null;
    error: string | null;
    pollIntervalMs: number;
    busy: boolean;
    onRefresh: () => void;
}) {
    const { t } = useI18n();
    const [history, setHistory] = useState<DiagnosticsTrendSample[]>([]);
    useEffect(() => {
        const sample = sampleFromDiagnostics(value);
        if (!sample)
            return;
        setHistory((current) => {
            const previous = current.at(-1);
            const bootChanged = previous?.bootEpoch != null &&
                sample.bootEpoch != null &&
                previous.bootEpoch !== sample.bootEpoch;
            if (bootChanged) {
                return [sample];
            }
            return [...current, sample].slice(-60);
        });
    }, [value]);
    const warnings = useMemo(() => buildWarnings(history), [history]);
    const previousWarnings = useMemo(() => buildWarnings(history.slice(0, -1)), [history]);
    const previousSample = history.at(-2) ?? null;
    const latestSample = history.at(-1) ?? null;
    const diagnosticsWarningText = (warning: DiagnosticsWarning) => {
        switch (warning.id) {
            case 'wifi': return t('diagnostics.warning.weakWifi', { rssi: latestSample?.rssi ?? '—' });
            case 'http-timeouts': return t('diagnostics.warning.httpTimeouts');
            case 'http-rejected': return t('diagnostics.warning.httpRejected');
            case 'http-server-errors': return t('diagnostics.warning.httpServerErrors');
            case 'http-latency': return t('diagnostics.warning.httpLatency', { value: latestSample?.httpMaxMs ?? '—' });
            case 'scheduler': return t('diagnostics.warning.scheduler', { value: latestSample?.schedulerMaxUs ?? '—' });
            case 'render': return t('diagnostics.warning.render', { value: latestSample?.renderMaxUs ?? '—' });
            case 'status-build': return t('diagnostics.warning.statusBuild', { value: latestSample?.statusMaxUs ?? '—' });
            case 'eeprom': return t('diagnostics.warning.eeprom');
            default: return warning.message;
        }
    };
    const diagnostics = record(value?.diagnostics);
    const wifi = record(diagnostics.wifi);
    const http = record(diagnostics.http);
    const scheduler = record(diagnostics.scheduler);
    const storage = record(diagnostics.storage);
    const performance = record(diagnostics.performance);
    const render = record(performance.render);
    const status = record(performance.status);
    const ota = record(diagnostics.ota);
    const supported = value?.supported ?? null;
    const timeoutCount = numberValue(http, 'timeouts');
    const rejectedCount = numberValue(http, 'rejected');
    const serverErrors = numberValue(http, 'serverErrors');
    const otaError = numberValue(ota, 'lastErrorCode');
    const wifiConnected = booleanValue(wifi, 'connected');
    const recoveryHold = warnings.length === 0 &&
        previousWarnings.length > 0;
    const degraded = supported === true && (warnings.length > 0 ||
        recoveryHold ||
        (otaError ?? 0) !== 0 ||
        wifiConnected === false);
    const stateLabel = supported == null
        ? '—'
        : !supported
            ? 'N/A'
            : degraded
                ? recoveryHold
                    ? 'RECOVERING'
                    : 'DEGRADED'
                : 'OK';
    const localizedStateLabel = supported !== true
        ? supported === false
            ? t('diagnostics.state.unsupported')
            : t('diagnostics.state.waiting')
        : recoveryHold
            ? t('diagnostics.state.recovering')
            : degraded
                ? t('diagnostics.state.degraded')
                : t('diagnostics.state.ok');
    return (<section className={`panel v791-diagnostics-panel ${degraded ? 'recovering' : ''}`} data-diagnostics-supported={supported == null ? 'unknown' : String(supported)} data-diagnostics-boot-epoch={latestSample?.bootEpoch ?? 'unknown'} data-diagnostics-window-health={supported == null
            ? 'unknown'
            : !supported
                ? 'unsupported'
                : recoveryHold
                    ? 'recovering'
                    : degraded
                        ? 'degraded'
                        : 'ok'}>
      <div className="panel-title">
        <div>
          <p className="eyebrow">Direct API 1.1</p>
          <h2>{t("diagnostics.title")}</h2>
        </div>
        <Activity className={degraded ? 'warning' : 'ok'}/>
      </div>

      <div className="beta2-health-state">
        <strong className={degraded ? 'warning' : supported ? 'ok' : ''}>
          {localizedStateLabel}
        </strong>
        <span>
          {error
            ? error
            : supported === false
                ? <I18nText k="legacyUi.firmware.diagnostics.unavailable.34f935de"/> : <I18nText k="diagnostics.subtitle"/>}
        </span>
      </div>

      <div className="beta2-health-grid v568-telemetry-grid">
        <div>
          <span><Wifi size={15}/>{t("diagnostics.metric.rssi")}</span>
          <strong>{metric(numberValue(wifi, 'rssi'), ' dBm')}</strong>
          <small>{wifiConnected == null ? '—' : wifiConnected ? 'online' : 'offline'}</small>
        </div>
        <div>
          <span><Radio size={15}/>{t("diagnostics.metric.http")}</span>
          <strong>{metric(numberValue(http, 'requests'))}</strong>
          <small>{t("diagnostics.metric.timeouts")}: {metric(timeoutCount)}</small>
        </div>
        <div>
          <span><Clock3 size={15}/>{t("diagnostics.metric.httpMax")}</span>
          <strong>{metric(numberValue(http, 'maxMs'), ' ms')}</strong>
          <small>{t("diagnostics.metric.rejected")}: {metric(rejectedCount)}</small>
        </div>
        <div>
          <span><Clock3 size={15}/>{t("diagnostics.metric.schedulerMax")}</span>
          <strong>{metric(numberValue(scheduler, 'maxUs'), ' µs')}</strong>
          <small>{t("diagnostics.metric.runs")}: {metric(numberValue(scheduler, 'runs'))}</small>
        </div>
        <div>
          <span><Cpu size={15}/>{t("diagnostics.metric.renderMax")}</span>
          <strong>{metric(numberValue(render, 'maxUs'), ' µs')}</strong>
          <small>{t("diagnostics.metric.average")}: {metric(numberValue(render, 'avgUs'), ' µs')}</small>
        </div>
        <div>
          <span><Cpu size={15}/>{t("diagnostics.metric.statusBuild")}</span>
          <strong>{metric(numberValue(status, 'maxUs'), ' µs')}</strong>
          <small>{t("diagnostics.metric.average")}: {metric(numberValue(status, 'avgUs'), ' µs')}</small>
        </div>
        <div>
          <span><Database size={15}/>{t("diagnostics.metric.eepromDelta")}</span>
          <strong>{metric(numberValue(storage, 'eepromChangedBytes'), ' B')}</strong>
          <small>{t("diagnostics.metric.writes")}: {metric(numberValue(storage, 'eepromWriteCalls'))}</small>
        </div>
        <div>
          <span><Activity size={15}/>{t("diagnostics.metric.ota")}</span>
          <strong>{booleanValue(ota, 'ready') == null ? '—' : booleanValue(ota, 'ready') ? 'READY' : 'BUSY'}</strong>
          <small>{t("diagnostics.metric.error")}: {metric(otaError)}</small>
        </div>
      </div>

      <div className="beta2-health-grid v568-telemetry-grid" data-history-samples={history.length}>
        <div><span>{t("diagnostics.metric.samples")}</span><strong>{history.length}/60</strong></div>
        <div><span>{t("diagnostics.metric.bootEpoch")}</span><strong>{latestSample?.bootEpoch ?? '—'}</strong></div>
        <div><span>{t("diagnostics.metric.httpMaxDelta")}</span><strong>{deltaLabel(previousSample?.httpMaxMs ?? null, latestSample?.httpMaxMs ?? null, ' ms')}</strong></div>
        <div><span>{t("diagnostics.metric.schedulerDelta")}</span><strong>{deltaLabel(previousSample?.schedulerMaxUs ?? null, latestSample?.schedulerMaxUs ?? null, ' µs')}</strong></div>
        <div><span>{t("diagnostics.metric.renderDelta")}</span><strong>{deltaLabel(previousSample?.renderMaxUs ?? null, latestSample?.renderMaxUs ?? null, ' µs')}</strong></div>
      </div>
      {warnings.length > 0 && (<div className="notice v792-diagnostics-warning-list" data-diagnostics-warnings={warnings.length}><Activity size={18}/><div><strong>{t("diagnostics.warning.title")}</strong>{warnings.map((warning) => <p key={warning.id}>{diagnosticsWarningText(warning)}</p>)}</div></div>)}

      <div className="beta2-health-actions">
        <div>
          <span>{t("diagnostics.metric.source")}</span>
          <code>{value?.capabilities?.apiVersion ?? value?.capabilities?.directApiVersion ?? '—'}</code>
        </div>
        <div>
          <span>{t("diagnostics.metric.pollingGovernor")}</span>
          <code>{Math.round(pollIntervalMs / 1000)}s</code>
        </div>
        <button className="secondary" disabled={busy} onClick={onRefresh}>
          <RefreshCw size={16} className={busy ? 'spin' : ''}/><I18nText k="common.refresh"/></button>
      </div>
    </section>);
}
