import { I18nText, useI18n } from "../../i18n";
import { KeyRound, LogIn, LogOut, RefreshCw, Save, Server, ShieldCheck, ShieldOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { V5StatusBadge } from './V5StatusBadge';
export function V5ConnectionPanel({ profile, connectivity, auth, busyAction, onSaveProfile, onLogin, onUseBearer, onLogout, onCheck }: {
    profile: {
        id: string;
        label: string;
        baseUrl: string;
        authMode: 'session' | 'bearer';
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
    onSaveProfile: (profile: {
        id: string;
        label: string;
        baseUrl: string;
        authMode: 'session' | 'bearer';
    }) => void;
    onLogin: (username: string, password: string) => void;
    onUseBearer: (token: string) => void;
    onLogout: () => void;
    onCheck: () => void;
}) {
    const { t } = useI18n();
    const [draft, setDraft] = useState(profile);
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('');
    const [token, setToken] = useState('');
    useEffect(() => {
        setDraft(profile);
    }, [profile]);
    const online = connectivity.online ===
        true;
    const authenticated = auth.authenticated ===
        true;
    const vault = (auth.vault &&
        typeof auth.vault ===
            'object')
        ? auth.vault as {
            persistent?: boolean;
            available?: boolean | null;
            fallbackActive?: boolean;
            platformBackend?: string;
            backend?: string;
            bearerTokenPresent?: boolean | null;
            lastError?: {
                code?: string;
                message?: string;
            } | null;
        }
        : null;
    const nativeStoreActive = vault?.persistent ===
        true &&
        vault?.fallbackActive !==
            true;
    const vaultLabel = nativeStoreActive
        ? (vault?.platformBackend ||
            'Natív kulcstár')
        : 'Folyamatmemória';
    return (<section className="panel v5-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow"><I18nText k="legacyUi.v5.szerverkapcsolat.738ffe35"/></p>
          <h2><I18nText k="legacyUi.api.v2.kapcsolat.es.hitelesites.029e905c"/></h2>
        </div>

        <V5StatusBadge state={online
            ? (authenticated
                ? 'ok'
                : 'warning')
            : 'offline'} label={online
            ? (authenticated
                ? 'Kapcsolódva'
                : 'Hitelesítés szükséges')
            : 'Offline'}/>
      </div>

      <div className="v5-form-grid">
        <label><I18nText k="settings.profileName"/><input value={draft.label} onChange={(event) => setDraft({
            ...draft,
            label: event.target.value
        })}/>
        </label>

        <label><I18nText k="legacyUi.hitelesitesi.mod.4afe4f18"/><select value={draft.authMode} onChange={(event) => setDraft({
            ...draft,
            authMode: event.target.value ===
                'bearer'
                ? 'bearer'
                : 'session'
        })}>
            <option value="session">
              Session-cookie
            </option>
            <option value="bearer">
              Bearer token
            </option>
          </select>
        </label>

        <label className="wide"><I18nText k="legacyUi.v5.szerver.cime.5a34facd"/><input value={draft.baseUrl} onChange={(event) => setDraft({
            ...draft,
            baseUrl: event.target.value
        })} placeholder="http://127.0.0.1:3000"/>
        </label>
      </div>

      <div className="v5-actions">
        <button className="secondary" disabled={busyAction !==
            null} onClick={onCheck}>
          <RefreshCw size={17}/><I18nText k="settings.testConnection"/></button>

        <button className="secondary" disabled={busyAction !==
            null} onClick={() => onSaveProfile(draft)}>
          <Save size={17}/><I18nText k="settings.saveProfile"/></button>
      </div>

      {draft.authMode ===
            'session' ? (<div className="v5-auth-box">
          <label><I18nText k="legacyUi.felhasznalonev.fc62d7e2"/><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username"/>
          </label>

          <label><I18nText k="legacyUi.jelszo.5737d7a5"/><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password"/>
          </label>

          <button disabled={busyAction !==
                null ||
                !username ||
                !password} onClick={() => onLogin(username, password)}>
            <LogIn size={17}/><I18nText k="legacyUi.bejelentkezes.a8756ad6"/></button>
        </div>) : (<div className="v5-auth-box bearer">
          <label className="wide"><I18nText k="legacyUi.api.v2.bearer.token.95102af9"/><input type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" placeholder={t("legacyUi.a.token.alapbol.csak.a.folyamat.memoriajaban.el.70c97af2")}/>
          </label>

          <button disabled={busyAction !==
                null ||
                token.length < 16} onClick={() => onUseBearer(token)}>
            <KeyRound size={17}/><I18nText k="legacyUi.token.hasznalata.d4f5675e"/></button>
        </div>)}

      <div className="v5-connection-meta">
        <span>
          <Server size={15}/>
          {profile.baseUrl}
        </span>

        <span><I18nText k="legacyUi.mod.c3e77e26"/>{String(auth.mode ||
            draft.authMode)}
        </span>

        <span className={`v5-vault-state ${nativeStoreActive
            ? 'native'
            : 'memory'}`} title={vault?.lastError
            ?.message ||
            ''}>
          {nativeStoreActive
            ? (<ShieldCheck size={15}/>)
            : (<ShieldOff size={15}/>)}<I18nText k="legacyUi.titoktar.1f67f216"/>{' '}
          {vaultLabel}
        </span>

        {authenticated && (<button className="danger" disabled={busyAction !==
                null} onClick={onLogout}>
            <LogOut size={16}/><I18nText k="legacyUi.kijelentkezes.85309a6c"/></button>)}
      </div>
    </section>);
}
