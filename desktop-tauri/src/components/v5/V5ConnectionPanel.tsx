import {
  KeyRound,
  LogIn,
  LogOut,
  RefreshCw,
  Save,
  Server
} from 'lucide-react';

import {
  useEffect,
  useState
} from 'react';

import {
  V5StatusBadge
} from './V5StatusBadge';

export function V5ConnectionPanel({
  profile,
  connectivity,
  auth,
  busyAction,
  onSaveProfile,
  onLogin,
  onUseBearer,
  onLogout,
  onCheck
}: {
  profile: {
    id: string;
    label: string;
    baseUrl: string;
    authMode:
      'session' |
      'bearer';
  };
  connectivity: {
    status: string;
    online: boolean | null;
    consecutiveFailures: number;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
    lastError: {
      name: string;
      code: string | null;
      message: string;
    } | null;
  };
  auth: {
    mode?: string;
    authenticated?: boolean;
    principal?: unknown;
    csrfTokenPresent?: boolean;
    vault?: unknown;
  };
  busyAction: string | null;
  onSaveProfile:
    (
      profile: {
        id: string;
        label: string;
        baseUrl: string;
        authMode:
          'session' |
          'bearer';
      }
    ) => void;
  onLogin:
    (
      username: string,
      password: string
    ) => void;
  onUseBearer:
    (
      token: string
    ) => void;
  onLogout:
    () => void;
  onCheck:
    () => void;
}) {
  const [
    draft,
    setDraft
  ] =
    useState(profile);

  const [
    username,
    setUsername
  ] =
    useState('admin');

  const [
    password,
    setPassword
  ] =
    useState('');

  const [
    token,
    setToken
  ] =
    useState('');

  useEffect(
    () => {
      setDraft(profile);
    },
    [profile]
  );

  const online =
    connectivity.online ===
      true;

  const authenticated =
    auth.authenticated ===
      true;

  return (
    <section className="panel v5-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">
            V5 SZERVERKAPCSOLAT
          </p>
          <h2>
            API v2 kapcsolat és hitelesítés
          </h2>
        </div>

        <V5StatusBadge
          state={
            online
              ? (
                  authenticated
                    ? 'ok'
                    : 'warning'
                )
              : 'offline'
          }
          label={
            online
              ? (
                  authenticated
                    ? 'Kapcsolódva'
                    : 'Hitelesítés szükséges'
                )
              : 'Offline'
          }
        />
      </div>

      <div className="v5-form-grid">
        <label>
          Profil neve
          <input
            value={draft.label}
            onChange={
              (event) =>
                setDraft({
                  ...draft,
                  label:
                    event.target.value
                })
            }
          />
        </label>

        <label>
          Hitelesítési mód
          <select
            value={draft.authMode}
            onChange={
              (event) =>
                setDraft({
                  ...draft,
                  authMode:
                    event.target.value ===
                      'bearer'
                      ? 'bearer'
                      : 'session'
                })
            }
          >
            <option value="session">
              Session-cookie
            </option>
            <option value="bearer">
              Bearer token
            </option>
          </select>
        </label>

        <label className="wide">
          V5 szerver címe
          <input
            value={draft.baseUrl}
            onChange={
              (event) =>
                setDraft({
                  ...draft,
                  baseUrl:
                    event.target.value
                })
            }
            placeholder="http://127.0.0.1:3000"
          />
        </label>
      </div>

      <div className="v5-actions">
        <button
          className="secondary"
          disabled={
            busyAction !==
            null
          }
          onClick={onCheck}
        >
          <RefreshCw
            size={17}
          />
          Kapcsolat tesztelése
        </button>

        <button
          className="secondary"
          disabled={
            busyAction !==
            null
          }
          onClick={
            () =>
              onSaveProfile(
                draft
              )
          }
        >
          <Save size={17} />
          Profil mentése
        </button>
      </div>

      {draft.authMode ===
        'session' ? (
        <div className="v5-auth-box">
          <label>
            Felhasználónév
            <input
              value={username}
              onChange={
                (event) =>
                  setUsername(
                    event.target.value
                  )
              }
              autoComplete="username"
            />
          </label>

          <label>
            Jelszó
            <input
              type="password"
              value={password}
              onChange={
                (event) =>
                  setPassword(
                    event.target.value
                  )
              }
              autoComplete="current-password"
            />
          </label>

          <button
            disabled={
              busyAction !==
                null ||
              !username ||
              !password
            }
            onClick={
              () =>
                onLogin(
                  username,
                  password
                )
            }
          >
            <LogIn size={17} />
            Bejelentkezés
          </button>
        </div>
      ) : (
        <div className="v5-auth-box bearer">
          <label className="wide">
            API v2 Bearer token
            <input
              type="password"
              value={token}
              onChange={
                (event) =>
                  setToken(
                    event.target.value
                  )
              }
              autoComplete="off"
              placeholder="A token alapból csak a folyamat memóriájában él"
            />
          </label>

          <button
            disabled={
              busyAction !==
                null ||
              token.length < 16
            }
            onClick={
              () =>
                onUseBearer(
                  token
                )
            }
          >
            <KeyRound size={17} />
            Token használata
          </button>
        </div>
      )}

      <div className="v5-connection-meta">
        <span>
          <Server size={15} />
          {profile.baseUrl}
        </span>

        <span>
          Mód: {String(
            auth.mode ||
            draft.authMode
          )}
        </span>

        {authenticated && (
          <button
            className="danger"
            disabled={
              busyAction !==
              null
            }
            onClick={onLogout}
          >
            <LogOut size={16} />
            Kijelentkezés
          </button>
        )}
      </div>
    </section>
  );
}
