import {
  Globe2,
  PlugZap,
  Save,
  ShieldCheck,
  Wifi
} from 'lucide-react';

import type {
  ConnectionConfig
} from '../types';

interface SettingsPageProps {
  otaSupported: boolean;
  config: ConnectionConfig;
  busy: boolean;
  onChange:
    (
      config: ConnectionConfig
    ) => void;
  onSave: () => void;
  onTest: () => void;
  otaPassword: string;
  onOtaPasswordChange:
    (
      value: string
    ) => void;
}

function validHost(
  value: string
) {
  const host =
    value.trim();

  return (
    host.length > 0 &&
    host.length <= 253 &&
    !host.includes('://') &&
    !host.includes('/') &&
    !/\s/.test(host)
  );
}

function validPort(
  value: number
) {
  return (
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 65535
  );
}

function validApiPath(
  value: string
) {
  const path =
    value.trim();

  return (
    path.startsWith('/') &&
    path.length >= 18 &&
    !/\s/.test(path)
  );
}

function validDeviceKey(
  value: string
) {
  const key =
    value.trim();

  return (
    key.length >= 24 &&
    key.length <= 64 &&
    /^[\x21-\x7e]+$/.test(key)
  );
}

export function SettingsPage({
  otaSupported,
  config,
  busy,
  onChange,
  onSave,
  onTest,
  otaPassword,
  onOtaPasswordChange
}: SettingsPageProps) {
  const localReady =
    validHost(
      config.localArduinoIp
    ) &&
    validPort(
      config.localArduinoPort
    );

  const remoteReady =
    validHost(
      config.arduinoIp
    ) &&
    validPort(
      config.arduinoPort
    );

  const authReady =
    validApiPath(
      config.arduinoApiPath
    ) &&
    validDeviceKey(
      config.arduinoApiKey
    );

  const otaReady =
    !otaSupported ||
    (
      validHost(
        config.otaAddress ||
        config.localArduinoIp
      ) &&
      validPort(
        config.otaPort
      )
    );

  const canSave =
    (
      localReady ||
      remoteReady
    ) &&
    authReady &&
    otaReady;

  const loadBetaExample =
    () => {
      onChange({
        ...config,
        localArduinoIp:
          '10.0.0.117',
        localArduinoPort:
          80,
        arduinoIp:
          'beta-lexyguruhome.ddns.net',
        arduinoPort:
          25666,
        preferLocal:
          true,
        otaAddress:
          '10.0.0.117',
        otaPort:
          65280,
        otaUploadMode:
          'auto'
      });
    };

  const privatePrefix =
    config.arduinoApiPath
      .trim()
      .replace(/\/+$/, '');

  const localPreview =
    localReady
      ? `http://${config.localArduinoIp.trim()}:${config.localArduinoPort}${privatePrefix}/api/status`
      : 'Nincs érvényes helyi cím.';

  const remotePreview =
    remoteReady
      ? `http://${config.arduinoIp.trim()}:${config.arduinoPort}${privatePrefix}/api/status`
      : 'Nincs érvényes távoli cím.';

  return (
    <div className="page">
      <section className="panel settings-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">
              KÖZVETLEN ARDUINO KAPCSOLAT
            </p>
            <h2>
              Arduino UNO R4 WiFi
            </h2>
          </div>
          <ShieldCheck />
        </div>

        <div className="notice">
          <PlugZap size={18} />
          <p>
            <b>Nincs szükség V5/LXC szerverre.</b>{' '}
            Az alkalmazás közvetlenül az Arduino védett HTTP API-jához kapcsolódik.
            Itt nincs felhasználónév, session-cookie vagy Bearer token.
          </p>
        </div>

        <div className="notice">
          <ShieldCheck size={18} />
          <p>
            A <b>Titkos API-útvonal</b> a firmware
            <code> API_PRIVATE_PATH </code>
            értéke, az <b>Arduino eszközkulcs</b> pedig az
            <code> API_SHARED_SECRET </code>
            értéke. Ne add meg a Mac-, GitHub-, Wi-Fi- vagy DDNS-jelszavadat.
          </p>
        </div>

        <div className="panel-title">
          <div>
            <p className="eyebrow">
              HELYI HÁLÓZAT
            </p>
            <h3>
              <Wifi size={18} />
              Közvetlen LAN
            </h3>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Helyi Arduino IP vagy host
            <input
              value={
                config.localArduinoIp
              }
              onChange={
                (event) =>
                  onChange({
                    ...config,
                    localArduinoIp:
                      event.target.value
                  })
              }
              placeholder="10.0.0.117"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <small>
              Csak IP vagy hostnév, <b>http:// nélkül</b>.
            </small>
          </label>

          <label>
            Helyi HTTP-port
            <input
              type="number"
              min="1"
              max="65535"
              value={
                config.localArduinoPort
              }
              onChange={
                (event) =>
                  onChange({
                    ...config,
                    localArduinoPort:
                      Number(
                        event.target.value
                      )
                  })
              }
            />
          </label>
        </div>

        <div className="notice">
          <Wifi size={18} />
          <p>
            <b>Helyi végpont:</b>{' '}
            <code>{localPreview}</code>
          </p>
        </div>

        <div className="panel-title">
          <div>
            <p className="eyebrow">
              TÁVOLI ELÉRÉS
            </p>
            <h3>
              <Globe2 size={18} />
              DDNS vagy külső IP
            </h3>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Távoli Arduino DDNS vagy IP
            <input
              value={
                config.arduinoIp
              }
              onChange={
                (event) =>
                  onChange({
                    ...config,
                    arduinoIp:
                      event.target.value
                  })
              }
              placeholder="beta-lexyguruhome.ddns.net"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <small>
              Csak hostnév, protokoll és port nélkül.
            </small>
          </label>

          <label>
            Távoli HTTP-port
            <input
              type="number"
              min="1"
              max="65535"
              value={
                config.arduinoPort
              }
              onChange={
                (event) =>
                  onChange({
                    ...config,
                    arduinoPort:
                      Number(
                        event.target.value
                      )
                  })
              }
            />
            <small>
              Példa: külső 25666 → belső Arduino 80.
            </small>
          </label>

          <label className="wide checkbox-label">
            <input
              type="checkbox"
              checked={
                config.preferLocal
              }
              onChange={
                (event) =>
                  onChange({
                    ...config,
                    preferLocal:
                      event.target.checked
                  })
              }
            />
            Helyi kapcsolat próbálása elsőként, távoli DDNS csak tartalékként
          </label>
        </div>

        <div className="notice">
          <Globe2 size={18} />
          <p>
            <b>Távoli végpont:</b>{' '}
            <code>{remotePreview}</code>
          </p>
        </div>

        <div className="panel-title">
          <div>
            <p className="eyebrow">
              ARDUINO API-VÉDELEM
            </p>
            <h3>
              Privát útvonal és X-Device-Key
            </h3>
          </div>
        </div>

        <div className="form-grid">
          <label className="wide">
            Titkos API-útvonal
            <input
              value={
                config.arduinoApiPath
              }
              onChange={
                (event) =>
                  onChange({
                    ...config,
                    arduinoApiPath:
                      event.target.value
                  })
              }
              placeholder="/hosszu_veletlen_privat_utvonal"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <small>
              A <code>secrets.h</code> fájl
              <code> API_PRIVATE_PATH </code>
              értéke. Legalább 18 karakter, perjellel kezdődik.
            </small>
          </label>

          <label className="wide">
            Arduino eszközkulcs
            <input
              type="password"
              value={
                config.arduinoApiKey
              }
              onChange={
                (event) =>
                  onChange({
                    ...config,
                    arduinoApiKey:
                      event.target.value
                  })
              }
              placeholder="Legalább 24 karakter"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <small>
              A <code>secrets.h</code> fájl
              <code> API_SHARED_SECRET </code>
              értéke. HTTP-fejlécben
              <code> X-Device-Key </code>
              néven küldjük.
            </small>
          </label>
        </div>

        {otaSupported && (
          <>
            <div className="panel-title">
              <div>
                <p className="eyebrow">
                  DESKTOP OTA
                </p>
                <h3>
                  Helyi firmware-frissítés
                </h3>
              </div>
            </div>

            <div className="form-grid">
              <label>
                OTA helyi IP vagy host
                <input
                  value={
                    config.otaAddress
                  }
                  onChange={
                    (event) =>
                      onChange({
                        ...config,
                        otaAddress:
                          event.target.value
                      })
                  }
                  placeholder="10.0.0.117"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <small>
                  OTA-hoz helyi cím vagy VPN ajánlott. Ne nyisd ki az OTA-portot az internetre.
                </small>
              </label>

              <label>
                OTA port
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={
                    config.otaPort
                  }
                  onChange={
                    (event) =>
                      onChange({
                        ...config,
                        otaPort:
                          Number(
                            event.target.value
                          )
                      })
                  }
                />
              </label>

              <label>
                OTA feltöltési mód
                <select
                  value={
                    config.otaUploadMode
                  }
                  onChange={
                    (event) =>
                      onChange({
                        ...config,
                        otaUploadMode:
                          event.target.value
                      })
                  }
                >
                  <option value="auto">
                    Automatikus
                  </option>
                  <option value="terminal">
                    macOS Terminal + arduinoOTA
                  </option>
                  <option value="native">
                    Beépített Tauri/Rust feltöltő
                  </option>
                </select>
              </label>

              <label>
                arduinoOTA útvonala
                <input
                  value={
                    config.otaToolPath
                  }
                  onChange={
                    (event) =>
                      onChange({
                        ...config,
                        otaToolPath:
                          event.target.value
                      })
                  }
                  placeholder="/usr/local/bin/arduinoOTA"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </label>

              <label className="wide">
                Új OTA-jelszó
                <input
                  type="password"
                  value={
                    otaPassword
                  }
                  onChange={
                    (event) =>
                      onOtaPasswordChange(
                        event.target.value
                      )
                  }
                  placeholder="Üresen hagyva nem változik"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <small>
                  A firmware <code>OTA_PASSWORD</code> értéke. Nem az Arduino API-kulcs.
                </small>
              </label>
            </div>
          </>
        )}

        {!otaSupported && (
          <div className="notice">
            <ShieldCheck size={18} />
            <p>
              <b>Mobil korlátozás:</b>{' '}
              Androidon, iPhone-on és iPaden nincs firmware-OTA.
              Vezérlés és időzítés használható; firmware-t desktopról frissíts.
            </p>
          </div>
        )}

        {!canSave && (
          <div className="notice">
            <ShieldCheck size={18} />
            <p>
              A mentéshez adj meg legalább egy érvényes Arduino-címet,
              1–65535 közötti portot, legalább 18 karakteres privát útvonalat
              és 24–64 karakteres Arduino eszközkulcsot.
            </p>
          </div>
        )}

        <div className="form-grid">
          <button
            type="button"
            onClick={
              loadBetaExample
            }
            disabled={busy}
          >
            <Wifi size={17} />
            Beta Arduino címek betöltése
          </button>

          <button
            type="button"
            onClick={
              onSave
            }
            disabled={
              busy ||
              !canSave
            }
          >
            <Save size={17} />
            Beállítások mentése
          </button>

          <button
            type="button"
            onClick={
              onTest
            }
            disabled={
              busy ||
              !canSave
            }
          >
            <PlugZap size={17} />
            Mentés és Arduino teszt
          </button>
        </div>
      </section>
    </div>
  );
}
