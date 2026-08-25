import { I18nText } from "../i18n";
import { RefreshCw, ServerCog } from 'lucide-react';
import { V5ConnectionPanel } from '../components/v5/V5ConnectionPanel';
import { V5MaintenancePanel } from '../components/v5/V5MaintenancePanel';
import { V5MigrationPanel } from '../components/v5/V5MigrationPanel';
import { V5PreflightPanel } from '../components/v5/V5PreflightPanel';
import { V5ReleasePanel } from '../components/v5/V5ReleasePanel';
import { V5ReleaseGatePanel } from '../components/v5/V5ReleaseGatePanel';
import { V5ReleaseFinalizationPanel } from '../components/v5/V5ReleaseFinalizationPanel';
import { V5LxcOrchestrationPanel } from '../components/v5/V5LxcOrchestrationPanel';
import { V5SnapshotPanel } from '../components/v5/V5SnapshotPanel';
import { useV5System } from '../hooks/useV5System';
export function V5SystemPage() {
    const state = useV5System();
    return (<div className="page v5-system-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow"><I18nText k="legacyUi.modularis.v5.platform.f59bf9d3"/></p>
          <h2><I18nText k="legacyUi.szerver.es.kiadasi.kozpont.6f93dcb2"/></h2>
          <p className="muted"><I18nText k="legacyUi.api.v2.kapcsolat.karbantartas.snapshotok.preflig.c6e4818e"/></p>
        </div>

        <button className="secondary" disabled={state.busyAction !==
            null ||
            !state.authenticated} onClick={() => void state.refresh()}>
          <RefreshCw size={17} className={state.busyAction ===
            'refresh'
            ? 'spin'
            : ''}/><I18nText k="legacyUi.v5.adatok.frissitese.3ccbddfe"/></button>
      </div>

      {(state.notice ||
            state.error) && (<div className={state.error
                ? 'v5-message error'
                : 'v5-message success'}>
          <ServerCog size={18}/>
          <div>
            <strong>
              {state.error
                ? state.error.code
                : <I18nText k="appearance.custom.color.success"/>}
            </strong>
            <span>
              {state.error
                ? state.error.message
                : state.notice}
            </span>
          </div>
        </div>)}

      <V5ConnectionPanel profile={state.api.profile} connectivity={state.connectivity} auth={state.auth} busyAction={state.busyAction} onSaveProfile={(profile) => void state.operations
            .saveProfile(profile)} onLogin={(username, password) => void state.operations
            .login(username, password)} onUseBearer={(token) => void state.operations
            .useBearer(token)} onLogout={() => void state.operations
            .logout()} onCheck={() => void state.operations
            .checkConnection()}/>

      {state.authenticated ? (<>
          <div className="v5-two-column">
            <V5ReleasePanel release={state.release}/>

            <V5MaintenancePanel maintenance={state.maintenance} busyAction={state.busyAction} onEnable={(reason) => void state.operations
                .enableMaintenance(reason)} onDisable={() => void state.operations
                .disableMaintenance()}/>
          </div>

          <V5ReleaseGatePanel readiness={state.promotionReadiness} busyAction={state.busyAction} onVerify={() => void state.operations
                .verifyReleaseGate()} onApprove={() => void state.operations
                .approvePromotion()} onRevoke={() => void state.operations
                .revokePromotionApproval()}/>

          <V5LxcOrchestrationPanel orchestration={state.lxcOrchestration} busyAction={state.busyAction} onRefresh={() => void state.refresh()} onVerify={() => void state.operations
                .verifyLxcOrchestration()}/>

          <V5ReleaseFinalizationPanel readiness={state.finalizationReadiness} busyAction={state.busyAction} onVerify={() => void state.operations
                .verifyFinalization()} onApprove={() => void state.operations
                .approveFinalization()} onRevoke={() => void state.operations
                .revokeFinalizationApproval()}/>

          <V5PreflightPanel preflight={state.preflight}/>

          <div className="v5-two-column wide-left">
            <V5SnapshotPanel snapshots={state.snapshots} maintenanceEnabled={state.maintenance
                .enabled} busyAction={state.busyAction} onCreate={(label) => void state.operations
                .createSnapshot(label)} onVerify={(id) => void state.operations
                .verifySnapshot(id)} onRestore={(id) => void state.operations
                .restoreSnapshot(id)} onDelete={(id) => void state.operations
                .deleteSnapshot(id)}/>

            <V5MigrationPanel migrations={state.migrations} maintenanceEnabled={state.maintenance
                .enabled} busyAction={state.busyAction} onDryRun={() => void state.operations
                .dryRunMigrations()} onApply={() => void state.operations
                .applyMigrations()}/>
          </div>
        </>) : (<section className="panel v5-auth-required">
          <ServerCog size={42}/>
          <h3><I18nText k="legacyUi.hitelesites.szukseges.b8c4f37f"/></h3>
          <p><I18nText k="legacyUi.a.rendszeruzemeltetesi.adatokhoz.jelentkezz.be.s.4fde40fa"/></p>
        </section>)}
    </div>);
}
