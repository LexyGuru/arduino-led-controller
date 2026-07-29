'use strict';

const assert =
  require('assert');

async function main() {
  const {
    DesktopSystemApi
  } =
    await import(
      '../desktop-tauri/src/api/runtime/domain/system-api.mjs'
    );

  const operations = [];

  const client =
    new Proxy(
      {},
      {
        get(
          target,
          property
        ) {
          return async (
            options = {}
          ) => {
            operations.push({
              property,
              options
            });

            return {
              property
            };
          };
        }
      }
    );

  const runtime = {
    async read(
      key,
      operation
    ) {
      return operation();
    },

    async write(
      operation
    ) {
      return operation();
    }
  };

  const api =
    new DesktopSystemApi({
      client,
      runtime
    });

  await api
    .releaseGateStatus();

  await api
    .releaseMetadata();

  await api
    .promotionReadiness();

  await api
    .verifyReleaseGate();

  await api
    .approvePromotion();

  await api
    .revokePromotionApproval();

  for (
    const required
    of [
      'getReleaseGateStatus',
      'getInstalledReleaseMetadata',
      'getAlpha2PromotionReadiness',
      'verifyAlpha2ReleaseGate',
      'approveAlpha2Promotion',
      'revokeAlpha2PromotionApproval'
    ]
  ) {
    assert.strictEqual(
      operations.some(
        (item) =>
          item.property ===
          required
      ),
      true,
      `Hiányzó művelet: ${required}`
    );
  }

  const approval =
    operations.find(
      (item) =>
        item.property ===
        'approveAlpha2Promotion'
    );

  assert.strictEqual(
    approval.options
      .body.confirm,
    'APPROVE_ALPHA2_PROMOTION'
  );

  console.log(
    'OK: desktop release-gate és promóciós domain API'
  );
  console.log(
    'OK: kötelező promóciós megerősítés'
  );
}

main().catch(
  (error) => {
    console.error(
      `HIBA: ${error.message}`
    );
    process.exitCode = 1;
  }
);
