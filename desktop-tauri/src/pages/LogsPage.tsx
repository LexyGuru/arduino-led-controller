import {
  Download,
  FileClock,
  Filter,
  Pause,
  Play,
  RadioTower,
  Search,
  TerminalSquare,
  Trash2
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { V5DataSourceBadge } from '../components/v5/V5DataSourceBadge';
import { V5LogToolbar } from '../components/v5/V5LogToolbar';
import { useTauriAudit } from '../hooks/useTauriAudit';
import { useV5Logs } from '../hooks/useV5Logs';
import { useI18n } from '../i18n';
import type {
  ArduinoLog,
  ArduinoStatus,
  ConnectionHealthState,
  NetworkLog
} from '../types';
import { createDiagnosticsZip } from '../utils/diagnosticsZip';
import {
  localizeAuditMessage,
  localizeNetworkMessage
} from '../utils/logLocalization';
import { localizeFirmwareEventMessage } from '../utils/firmwareEventCodes';

type LevelFilter = 'all' | 'info' | 'action' | 'success' | 'warning' | 'error';
type SourceFilter = 'all' | 'arduino' | 'audit' | 'network';

const match = (value: unknown, query: string) =>
  !query || String(value || '').toLowerCase().includes(query.toLowerCase());

async function saveNativeExport(
  name: string,
  bytes: Uint8Array,
  kind: 'zip' | 'log'
) {
  const path = await save({
    defaultPath: name,
    filters: [{ name: kind.toUpperCase(), extensions: [kind] }]
  });

  if (!path) return null;

  return invoke<string>('write_export_file', {
    path,
    bytes: Array.from(bytes),
    kind
  });
}

export function LogsPage({
  arduino,
  network,
  error,
  status,
  connectionHealth
}: {
  arduino: ArduinoLog[];
  network: NetworkLog[];
  error?: string | null;
  status: ArduinoStatus | null;
  connectionHealth: ConnectionHealthState;
}) {
  const { t, language } = useI18n();
  const state = useV5Logs({
    legacyArduino: arduino,
    legacyNetwork: network,
    legacyError: error
  });
  const local = useTauriAudit();
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<LevelFilter>('all');
  const [source, setSource] = useState<SourceFilter>('all');
  const [paused, setPaused] = useState(false);

  const locale = language === 'de' ? 'de-DE' : language === 'en' ? 'en-US' : 'hu-HU';

  const unified = useMemo(() => {
    const consoleRows = state.consoleLogs.map((item, index) => ({
      id: `arduino-${item.id ?? index}-${item.timestamp}`,
      timestamp: item.timestamp,
      sortTime: Date.parse(item.timestamp) || 0,
      level: item.type === 'error' ? 'error' : 'info',
      source: 'arduino',
      message: localizeFirmwareEventMessage(item.message, t)
    }));

    const auditRows = local.entries.map((item) => ({
      id: item.id,
      timestamp: new Date(item.timestamp).toISOString(),
      sortTime: item.timestamp,
      level: item.level,
      source: 'audit',
      message: `${item.source} · ${localizeAuditMessage(item, t)}`
    }));

    const networkRows = state.networkLogs.map((item, index) => ({
      id: `network-${item.timestamp}-${index}`,
      timestamp: new Date(item.timestamp * 1000).toISOString(),
      sortTime: item.timestamp * 1000,
      level: item.ok ? 'info' : 'error',
      source: 'network',
      message: `${item.endpoint} · ${localizeNetworkMessage(item.message, t)}`
    }));

    return [...consoleRows, ...auditRows, ...networkRows]
      .sort((a, b) => b.sortTime - a.sortTime)
      .filter((item) => level === 'all' || item.level === level)
      .filter((item) => source === 'all' || item.source === source)
      .filter((item) => match(`${item.level} ${item.source} ${item.message}`, query))
      .slice(0, 500);
  }, [language, level, local.entries, query, source, state.consoleLogs, state.networkLogs]);

  const visibleRows = paused ? unified.slice(0, 100) : unified;

  const exportDiagnostics =
    async () => {
      const createdAt =
        new Date().toISOString();

      const summary =
        JSON.stringify(
          {
            schemaVersion: 1,
            createdAt,
            status,
            connectionHealth,
            counts: {
              arduino:
                state.consoleLogs.length,
              audit:
                local.entries.length,
              network:
                state.networkLogs.length
            }
          },
          null,
          2
        );

      const arduinoText =
        state.consoleLogs
          .map(
            (item) =>
              `${item.timestamp}\t${item.type}\t${item.message}`
          )
          .join('\n');

      const networkText =
        state.networkLogs
          .map(
            (item) =>
              `${item.timestamp}\t${item.ok ? 'OK' : 'ERROR'}\t${item.endpoint}\t${item.message}`
          )
          .join('\n');

      const auditText =
        local.entries
          .map(
            (item) =>
              `${new Date(item.timestamp).toISOString()}\t${item.level}\t${item.source}\t${item.message}`
          )
          .join('\n');

      const bytes =
        createDiagnosticsZip([
          {
            name: 'diagnostics.json',
            content: summary
          },
          {
            name: 'arduino.log',
            content: arduinoText
          },
          {
            name: 'network.log',
            content: networkText
          },
          {
            name: 'audit.log',
            content: auditText
          }
        ]);

      await saveNativeExport(
        `arduino-led-controller-diagnostics-${Date.now()}.zip`,
        bytes,
        'zip'
      );
    };

  const exportLogs = async () => {
    const lines = unified.map((item) =>
      `${item.timestamp}\t${item.level}\t${item.source}\t${item.message}`
    );

    await saveNativeExport(
      `arduino-led-controller-activity-${Date.now()}.log`,
      new TextEncoder().encode(lines.join('\n')),
      'log'
    );
  };

  return (
    <div className="page v55-logs-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t('logs2.eyebrow')}</p>
          <h2>{t('logs2.title')}</h2>
          <p className="muted">{t('logs2.subtitle')}</p>
        </div>
        <V5DataSourceBadge source={state.source} />
      </div>

      <V5LogToolbar
        query={query}
        onQuery={setQuery}
        busy={state.busy}
        apiAvailable={!state.directFallback}
        onClear={() => {
          local.clear();
          void state.clearConsole();
        }}
      />

      <section className="v55-log-controlbar">
        <label>
          <Filter size={16}/>
          <span>{t('logs2.level')}</span>
          <select value={level} onChange={(event) => setLevel(event.target.value as LevelFilter)}>
            <option value="all">{t('logs2.all')}</option>
            <option value="info">INFO</option>
            <option value="action">ACTION</option>
            <option value="success">SUCCESS</option>
            <option value="warning">WARNING</option>
            <option value="error">ERROR</option>
          </select>
        </label>

        <label>
          <RadioTower size={16}/>
          <span>{t('logs2.source')}</span>
          <select value={source} onChange={(event) => setSource(event.target.value as SourceFilter)}>
            <option value="all">{t('logs2.all')}</option>
            <option value="arduino">Arduino</option>
            <option value="audit">Audit</option>
            <option value="network">Network</option>
          </select>
        </label>

        <div className="v55-log-control-actions">
          <button className="secondary" onClick={() => setPaused((value) => !value)}>
            {paused ? <Play size={16}/> : <Pause size={16}/>}
            {t(paused ? 'logs2.resume' : 'logs2.pause')}
          </button>
          <button
            className="secondary"
            onClick={() => void exportLogs().catch((error) =>
              console.error('Log export failed', error)
            )}
          >
            <Download size={16}/>
            {t('logs2.export')}
          </button>
          <button
            className="secondary"
            onClick={() => void exportDiagnostics().catch((error) =>
              console.error('Diagnostics export failed', error)
            )}
          >
            <Download size={16}/>
            {t('beta2.diagnostics.export')}
          </button>
          <button
            className="secondary danger"
            onClick={() => {
              local.clear();
              void state.clearConsole();
            }}
          >
            <Trash2 size={16}/>
            {t('common.delete')}
          </button>
        </div>
      </section>

      {state.error && (
        <p className="console-warning">
          {state.error.code}: {localizeNetworkMessage(state.error.message, t)}
        </p>
      )}

      <section className="v55-log-summary">
        <article>
          <span>{t('logs2.visible')}</span>
          <strong>{visibleRows.length}</strong>
        </article>
        <article>
          <span>{t('logs.summary.arduino')}</span>
          <strong>{state.consoleLogs.length}</strong>
        </article>
        <article>
          <span>{t('logs.summary.audit')}</span>
          <strong>{local.entries.length}</strong>
        </article>
        <article>
          <span>{t('logs.summary.network')}</span>
          <strong>{state.networkLogs.length}</strong>
        </article>
        <article>
          <span>{t('logs.summary.error')}</span>
          <strong className="bad">
            {unified.filter((item) => item.level === 'error').length}
          </strong>
        </article>
      </section>

      <section className="v5-log-grid v55-log-layout">
        <article className="panel v55-unified-log-panel tauri-audit-console-panel" aria-label={t('logs2.unified')}>
          <div className="panel-title">
            <div>
              <p className="eyebrow">{t('logs.tauriAudit')}</p>
              <h2>{t('logs.tauriAuditTitle')}</h2>
            </div>
            <TerminalSquare />
          </div>

          <div className="v55-unified-log tauri-audit-console" role="log" aria-live={paused ? 'off' : 'polite'}>
            {visibleRows.length ? visibleRows.map((item) => (
              <div className={`v55-unified-line ${item.level}`} key={item.id}>
                <time>
                  {new Date(item.sortTime).toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </time>
                <b>{item.level}</b>
                <code>{item.source}</code>
                <span>{item.message}</span>
              </div>
            )) : (
              <p className="muted">{t('logs.noTauriAudit')}</p>
            )}
          </div>
        </article>

        <div className="v55-log-side">
          <article className="panel">
            <div className="panel-title">
              <div>
                <p className="eyebrow">{t('logs.summary.arduino')}</p>
                <h2>{t('logs.consoleCache')}</h2>
              </div>
              <RadioTower />
            </div>
            <div className="log-list">
              {state.consoleLogs.slice(-40).reverse().map((item, index) => (
                <div key={item.id || `${item.timestamp}-${index}`}>
                  <time>{item.timestamp || '—'}</time>
                  <b>{(item.type || 'info').toUpperCase()}</b>
                  <span>{localizeFirmwareEventMessage(item.message, t)}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-title">
              <div>
                <p className="eyebrow">{t('logs.localAudit')}</p>
                <h2>{t('logs.recentActions')}</h2>
              </div>
              <FileClock />
            </div>
            <div className="v5-observability-list tauri-audit-list">
              {[...local.entries].reverse().slice(0, 30).map((item) => (
                <div key={item.id} className={`audit-entry ${item.level}`}>
                  <time>
                    {new Date(item.timestamp).toLocaleTimeString(locale, {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </time>
                  <b>{item.source}</b>
                  <span>{localizeAuditMessage(item, t)}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
