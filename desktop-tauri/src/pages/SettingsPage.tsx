import { Save, ShieldCheck } from 'lucide-react';
import type { ConnectionConfig } from '../types';

interface SettingsPageProps {
  otaSupported: boolean;
  config: ConnectionConfig;
  busy: boolean;
  onChange: (config: ConnectionConfig) => void;
  onSave: () => void;
  otaPassword: string;
  onOtaPasswordChange: (value: string) => void;
}

export function SettingsPage({
  otaSupported,
  config,
  busy,
  onChange,
  onSave,
  otaPassword,
  onOtaPasswordChange,
}: SettingsPageProps) {
  return (
    <div className="page">
      <section className="panel settings-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">KAPCSOLAT ÉS VÉDELEM</p>
            <h2>{otaSupported ? 'Arduino és OTA' : 'Arduino kapcsolat'}</h2>
          </div>
          <ShieldCheck />
        </div>

        <div className="form-grid">
          <label>
            Helyi Arduino IP-cím
            <input
              value={config.localArduinoIp}
              onChange={(event) => onChange({ ...config, localArduinoIp: event.target.value })}
              placeholder="10.0.0.123"
            />
          </label>
          <label>
            Helyi HTTP-port
            <input
              type="number"
              min="1"
              max="65535"
              value={config.localArduinoPort}
              onChange={(event) => onChange({ ...config, localArduinoPort: Number(event.target.value) })}
            />
          </label>
          <label>
            Távoli Arduino DDNS/IP
            <input
              value={config.arduinoIp}
              onChange={(event) => onChange({ ...config, arduinoIp: event.target.value })}
              placeholder="lexyguruhome.ddns.net"
            />
          </label>
          <label>
            Távoli HTTP-port
            <input
              type="number"
              min="1"
              max="65535"
              value={config.arduinoPort}
              onChange={(event) => onChange({ ...config, arduinoPort: Number(event.target.value) })}
            />
          </label>
          <label className="wide checkbox-label">
            <input
              type="checkbox"
              checked={config.preferLocal}
              onChange={(event) => onChange({ ...config, preferLocal: event.target.checked })}
            />
            Helyi HTTP-kapcsolat előnyben részesítése
          </label>

          {otaSupported && (
            <>
              <label>
                OTA cím (csak beépített módhoz)
                <input
                  value={config.otaAddress}
                  onChange={(event) => onChange({ ...config, otaAddress: event.target.value })}
                  placeholder="lexyguruhome.ddns.net"
                />
              </label>
              <label>
                OTA port (csak beépített módhoz)
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={config.otaPort}
                  onChange={(event) => onChange({ ...config, otaPort: Number(event.target.value) })}
                />
                <small>
                  Ez a router publikus portja, nem feltétlenül 65280. Példa: külső 25667 → belső
                  10.0.0.123:65280.
                </small>
              </label>
              <label>
                OTA feltöltési mód
                <select
                  value={config.otaUploadMode}
                  onChange={(event) => onChange({ ...config, otaUploadMode: event.target.value })}
                >
                  <option value="auto">Automatikus (macOS: Terminal, más desktop: beépített)</option>
                  <option value="terminal">macOS Terminal + arduinoOTA</option>
                  <option value="native">Beépített Tauri/Rust feltöltő</option>
                </select>
              </label>
              <label>
                arduinoOTA útvonala
                <input
                  value={config.otaToolPath}
                  onChange={(event) => onChange({ ...config, otaToolPath: event.target.value })}
                  placeholder="/usr/local/bin/arduinoOTA"
                />
              </label>
            </>
          )}

          <label className="wide">
            Titkos API-útvonal
            <input
              value={config.arduinoApiPath}
              onChange={(event) => onChange({ ...config, arduinoApiPath: event.target.value })}
              placeholder="/hosszu_veletlen_utvonal_2026"
            />
          </label>
          <label className="wide">
            API-kulcs
            <input
              type="password"
              value={config.arduinoApiKey}
              onChange={(event) => onChange({ ...config, arduinoApiKey: event.target.value })}
              placeholder="Legalább 24 karakter"
            />
          </label>
          {otaSupported && (
            <label>
              Új OTA-jelszó
              <input
                type="password"
                value={otaPassword}
                onChange={(event) => onOtaPasswordChange(event.target.value)}
                placeholder="Üresen hagyva nem változik"
              />
            </label>
          )}
        </div>

        {otaSupported ? (
          <div className="notice">
            <ShieldCheck size={18} />
            <p>
              <b>OTA célválasztás:</b> macOS Terminal módban az alkalmazás minden frissítés előtt lekéri az
              Arduino <code>/api/status</code> válaszát, és annak aktuális <code>ipAddress</code> +{' '}
              <code>otaPort</code> értékét adja át az arduinoOTA programnak. Az OTA cím/port mező a beépített
              desktop Rust feltöltő tartaléka.
            </p>
          </div>
        ) : (
          <div className="notice">
            <ShieldCheck size={18} />
            <p>
              <b>Mobil biztonsági korlátozás:</b> Androidon, iPhone-on és iPaden a firmware
              OTA-frissítés nem érhető el. A mobilalkalmazás vezérlésre, időzítésekre és naplókra
              használható; firmware-t Windows, macOS vagy Linux gépről frissíts.
            </p>
          </div>
        )}

        <button onClick={onSave} disabled={busy}>
          <Save size={17} /> Beállítások mentése
        </button>
      </section>
    </div>
  );
}
