import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  useDesktopApi
} from '../api';

import {
  readApiError,
  unwrapApiPayload
} from '../api/ui/api-payload.mjs';

import {
  normalizeMaintenance,
  normalizeMigrations,
  normalizePreflight,
  normalizeRelease,
  normalizeSnapshots
} from '../services/v5SystemModels.mjs';

import {
  normalizePromotionReadiness
} from '../services/v5ReleaseGateModels.mjs';

import {
  normalizeFinalizationReadiness
} from '../services/v5ReleaseExecutionModels.mjs';

import {
  normalizeLxcOrchestration
} from '../services/v5LxcOrchestrationModels.mjs';

export function useV5System() {
  const {
    api,
    connectivity,
    auth,
    realtime
  } =
    useDesktopApi();

  const [
    release,
    setRelease
  ] =
    useState(
      normalizeRelease(null)
    );

  const [
    promotionReadiness,
    setPromotionReadiness
  ] =
    useState(
      normalizePromotionReadiness(
        null
      )
    );

  const [
    lxcOrchestration,
    setLxcOrchestration
  ] =
    useState(
      normalizeLxcOrchestration(
        null
      )
    );

  const [
    finalizationReadiness,
    setFinalizationReadiness
  ] =
    useState(
      normalizeFinalizationReadiness(
        null
      )
    );

  const [
    preflight,
    setPreflight
  ] =
    useState(
      normalizePreflight(null)
    );

  const [
    maintenance,
    setMaintenance
  ] =
    useState(
      normalizeMaintenance(null)
    );

  const [
    snapshots,
    setSnapshots
  ] =
    useState(
      normalizeSnapshots(null)
    );

  const [
    migrations,
    setMigrations
  ] =
    useState(
      normalizeMigrations(null)
    );

  const [
    busyAction,
    setBusyAction
  ] =
    useState<string | null>(
      null
    );

  const [
    error,
    setError
  ] =
    useState<
      ReturnType<
        typeof readApiError
      > |
      null
    >(null);

  const [
    notice,
    setNotice
  ] =
    useState('');

  const authenticated =
    Boolean(
      auth.authenticated
    );

  const online =
    connectivity.online ===
      true;

  const refresh =
    useCallback(
      async () => {
        setBusyAction(
          'refresh'
        );
        setError(null);

        try {
          const [
            releaseValue,
            promotionReadinessValue,
            finalizationReadinessValue,
            lxcOrchestrationValue,
            preflightValue,
            maintenanceValue,
            snapshotsValue,
            migrationsValue
          ] =
            await Promise.all([
              api.system
                .release(),
              api.system
                .promotionReadiness(),
              api.system
                .finalizationReadiness(),
              api.system
                .lxcOrchestration(),
              api.system
                .preflight(),
              api.system
                .maintenanceStatus(),
              api.system
                .snapshots(),
              api.system
                .migrations()
            ]);

          setRelease(
            normalizeRelease(
              releaseValue
            )
          );

          setPromotionReadiness(
            normalizePromotionReadiness(
              promotionReadinessValue
            )
          );

          setFinalizationReadiness(
            normalizeFinalizationReadiness(
              finalizationReadinessValue
            )
          );

          setLxcOrchestration(
            normalizeLxcOrchestration(
              lxcOrchestrationValue
            )
          );

          setPreflight(
            normalizePreflight(
              preflightValue
            )
          );

          setMaintenance(
            normalizeMaintenance(
              maintenanceValue
            )
          );

          setSnapshots(
            normalizeSnapshots(
              snapshotsValue
            )
          );

          setMigrations(
            normalizeMigrations(
              migrationsValue
            )
          );

          setNotice(
            'A V5 rendszeradatok frissítve.'
          );
        } catch (requestError) {
          setError(
            readApiError(
              requestError
            )
          );
        } finally {
          setBusyAction(
            null
          );
        }
      },
      [api]
    );

  useEffect(
    () => {
      if (
        online &&
        authenticated
      ) {
        void refresh();
      }
    },
    [
      authenticated,
      online,
      refresh
    ]
  );

  const run =
    useCallback(
      async (
        action: string,
        operation:
          () =>
            Promise<unknown>,
        successMessage: string,
        {
          refreshAfter =
            true
        } = {}
      ) => {
        setBusyAction(action);
        setError(null);
        setNotice('');

        try {
          const result =
            await operation();

          setNotice(
            successMessage
          );

          if (refreshAfter) {
            await refresh();
          }

          return unwrapApiPayload(
            result
          );
        } catch (requestError) {
          setError(
            readApiError(
              requestError
            )
          );

          return null;
        } finally {
          setBusyAction(
            null
          );
        }
      },
      [refresh]
    );

  const operations =
    useMemo(
      () => ({
        async login(
          username: string,
          password: string
        ) {
          return run(
            'login',
            () =>
              api.auth.login({
                username,
                password
              }),
            'Session bejelentkezés sikeres.'
          );
        },

        async useBearer(
          token: string
        ) {
          return run(
            'bearer',
            () =>
              api.setBearerToken(
                token
              ),
            'Bearer token aktiválva.'
          );
        },

        async logout() {
          return run(
            'logout',
            () =>
              api.auth.logout(),
            'Kijelentkezés sikeres.',
            {
              refreshAfter:
                false
            }
          );
        },

        async saveProfile(
          profile: {
            id: string;
            label: string;
            baseUrl: string;
            authMode:
              'session' |
              'bearer';
          }
        ) {
          api.profileStore.save(
            profile
          );

          setNotice(
            'Szerverprofil mentve. Az alkalmazás újratöltődik.'
          );

          globalThis.setTimeout(
            () =>
              globalThis.location
                .reload(),
            250
          );
        },

        async checkConnection() {
          return run(
            'connection',
            () =>
              api.runtime
                .checkConnection(),
            'A V5 szerver elérhető.',
            {
              refreshAfter:
                false
            }
          );
        },

        async verifyReleaseGate() {
          return run(
            'release-gate-verify',
            () =>
              api.system
                .verifyReleaseGate(),
            'Az alpha.2 release-gate jelentés elfogadva.'
          );
        },

        async approvePromotion() {
          return run(
            'release-promotion-approve',
            () =>
              api.system
                .approvePromotion(),
            'Az alpha.2 promóció jóváhagyása létrejött.'
          );
        },

        async revokePromotionApproval() {
          return run(
            'release-promotion-revoke',
            () =>
              api.system
                .revokePromotionApproval(),
            'Az alpha.2 promóciós jóváhagyás visszavonva.'
          );
        },

        async verifyLxcOrchestration() {
          return run(
            'release-lxc-orchestration-verify',
            () =>
              api.system
                .verifyLxcOrchestration(),
            'Az alpha.2 LXC orchestration lánc érvényes.'
          );
        },

        async verifyFinalization() {
          return run(
            'release-finalization-verify',
            () =>
              api.system
                .verifyFinalization(),
            'Az alpha.2 execution receipt-lánc érvényes.'
          );
        },

        async approveFinalization() {
          return run(
            'release-finalization-approve',
            () =>
              api.system
                .approveFinalization(),
            'Az alpha.2 verziószinkron véglegesítése jóváhagyva.'
          );
        },

        async revokeFinalizationApproval() {
          return run(
            'release-finalization-revoke',
            () =>
              api.system
                .revokeFinalizationApproval(),
            'Az alpha.2 véglegesítési jóváhagyás visszavonva.'
          );
        },

        async enableMaintenance(
          reason: string
        ) {
          return run(
            'maintenance-enable',
            () =>
              api.system
                .enableMaintenance(
                  reason
                ),
            'Karbantartási mód aktiválva.'
          );
        },

        async disableMaintenance() {
          return run(
            'maintenance-disable',
            () =>
              api.system
                .disableMaintenance(),
            'Karbantartási mód kikapcsolva.'
          );
        },

        async createSnapshot(
          label: string
        ) {
          return run(
            'snapshot-create',
            () =>
              api.system
                .createSnapshot(
                  label
                ),
            'Rendszer-snapshot elkészült.'
          );
        },

        async verifySnapshot(
          id: string
        ) {
          return run(
            `snapshot-verify:${id}`,
            () =>
              api.system
                .verifySnapshot(id),
            'Snapshot integritás ellenőrizve.',
            {
              refreshAfter:
                false
            }
          );
        },

        async restoreSnapshot(
          id: string
        ) {
          return run(
            `snapshot-restore:${id}`,
            () =>
              api.system
                .restoreSnapshot(
                  id
                ),
            'Snapshot visszaállítva. A szervert újra kell indítani.'
          );
        },

        async deleteSnapshot(
          id: string
        ) {
          return run(
            `snapshot-delete:${id}`,
            () =>
              api.system
                .deleteSnapshot(id),
            'Snapshot törölve.'
          );
        },

        async dryRunMigrations() {
          return run(
            'migrations-dry-run',
            () =>
              api.system
                .dryRunMigrations(),
            'Migrációs dry-run elkészült.'
          );
        },

        async applyMigrations() {
          return run(
            'migrations-apply',
            () =>
              api.system
                .applyMigrations(),
            'A szükséges migrációk alkalmazva.'
          );
        }
      }),
      [
        api,
        run
      ]
    );

  return {
    api,
    connectivity,
    auth,
    realtime,
    authenticated,
    online,
    release,
    promotionReadiness,
    finalizationReadiness,
    lxcOrchestration,
    preflight,
    maintenance,
    snapshots,
    migrations,
    busyAction,
    error,
    notice,
    refresh,
    operations
  };
}
