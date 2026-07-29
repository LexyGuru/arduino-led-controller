export class DesktopSystemApi {
  constructor({
    client,
    runtime
  } = {}) {
    this.client = client;
    this.runtime = runtime;
  }

  release() {
    return this.runtime.read(
      'system:release',
      () =>
        this.client
          .getSystemRelease(),
      {
        ttlMs: 30000
      }
    );
  }

  releaseGateStatus() {
    return this.runtime.read(
      'release:gate-status',
      () =>
        this.client
          .getReleaseGateStatus(),
      {
        ttlMs: 5000
      }
    );
  }

  releaseMetadata() {
    return this.runtime.read(
      'release:installed-metadata',
      () =>
        this.client
          .getInstalledReleaseMetadata(),
      {
        ttlMs: 15000
      }
    );
  }

  promotionReadiness() {
    return this.runtime.read(
      'release:promotion-readiness',
      () =>
        this.client
          .getAlpha2PromotionReadiness(),
      {
        ttlMs: 5000
      }
    );
  }

  verifyReleaseGate() {
    return this.runtime.write(
      () =>
        this.client
          .verifyAlpha2ReleaseGate()
    );
  }

  approvePromotion() {
    return this.runtime.write(
      () =>
        this.client
          .approveAlpha2Promotion({
            body: {
              confirm:
                'APPROVE_ALPHA2_PROMOTION'
            }
          })
    );
  }

  revokePromotionApproval() {
    return this.runtime.write(
      () =>
        this.client
          .revokeAlpha2PromotionApproval()
    );
  }

  diagnostics() {
    return this.runtime.read(
      'system:diagnostics',
      () =>
        this.client
          .getDiagnostics(),
      {
        ttlMs: 10000
      }
    );
  }

  preflight() {
    return this.runtime.read(
      'system:preflight',
      () =>
        this.client
          .getSystemPreflight(),
      {
        ttlMs: 10000
      }
    );
  }

  maintenanceStatus() {
    return this.runtime.read(
      'system:maintenance',
      () =>
        this.client
          .getMaintenanceStatus(),
      {
        ttlMs: 5000
      }
    );
  }

  enableMaintenance(reason) {
    return this.runtime.write(
      () =>
        this.client
          .enableMaintenanceMode({
            body: {
              reason
            }
          })
    );
  }

  disableMaintenance() {
    return this.runtime.write(
      () =>
        this.client
          .disableMaintenanceMode()
    );
  }

  snapshots() {
    return this.runtime.read(
      'system:snapshots',
      () =>
        this.client
          .listSystemSnapshots(),
      {
        ttlMs: 10000
      }
    );
  }

  createSnapshot(label = '') {
    return this.runtime.write(
      () =>
        this.client
          .createSystemSnapshot({
            body: {
              label
            }
          })
    );
  }

  verifySnapshot(id) {
    return this.runtime.read(
      `system:snapshots:${id}:verify`,
      () =>
        this.client
          .verifySystemSnapshot({
            path: {
              id
            }
          }),
      {
        ttlMs: 0
      }
    );
  }

  restoreSnapshot(
    id,
    confirm =
      'RESTORE_SYSTEM_SNAPSHOT'
  ) {
    return this.runtime.write(
      () =>
        this.client
          .restoreSystemSnapshot({
            path: {
              id
            },
            body: {
              confirm
            }
          })
    );
  }

  deleteSnapshot(id) {
    return this.runtime.write(
      () =>
        this.client
          .deleteSystemSnapshot({
            path: {
              id
            }
          })
    );
  }

  migrations() {
    return this.runtime.read(
      'system:migrations',
      () =>
        this.client
          .getSystemMigrations(),
      {
        ttlMs: 10000
      }
    );
  }

  dryRunMigrations() {
    return this.runtime.write(
      () =>
        this.client
          .dryRunSystemMigrations()
    );
  }

  applyMigrations() {
    return this.runtime.write(
      () =>
        this.client
          .applySystemMigrations()
    );
  }
}
