import assert from "node:assert/strict";
import {
  createUpdateCenterRefreshController,
  createUpdateCenterSharedLoaders,
  runUpdateCenterCheckBoth,
} from "../desktop-tauri/src/utils/updateCenterRefreshOrchestrator.mjs";

let statusCalls = 0;
let catalogCalls = 0;

const status = {
  appCurrentVersion: "5.5.1-beta.2",
  availableApp: { tag: "5.5.1-beta.3" },
  installedVersion: "5.0.0-beta.9",
  arduinoOnline: true,
  otaConfigured: true,
  backupStoreConfigured: true,
};

const loaders = createUpdateCenterSharedLoaders({
  refreshStatus: async () => {
    statusCalls += 1;
    return status;
  },
  refreshFirmwareCatalog: async () => {
    catalogCalls += 1;
    return [{ firmwareVersion: "5.0.0-beta.10" }];
  },
  selectApplication: (value) => ({
    installedVersion: value.appCurrentVersion,
    availableVersion: value.availableApp?.tag,
  }),
  selectDevice: (value) => ({ online: value.arduinoOnline }),
  selectOta: (value) => ({
    configured: value.otaConfigured,
    backupConfigured: value.backupStoreConfigured,
  }),
});

const results = await Promise.all([
  loaders.application(),
  loaders.firmware(),
  loaders.device(),
  loaders.ota(),
]);

assert.equal(statusCalls, 1);
assert.equal(catalogCalls, 1);
assert.equal(results[0].availableVersion, "5.5.1-beta.3");
assert.equal(results[1][0].firmwareVersion, "5.0.0-beta.10");
assert.equal(results[2].online, true);
assert.equal(results[3].configured, true);

const readyController = createUpdateCenterRefreshController({
  refreshStatus: async () => status,
  refreshFirmwareCatalog: async () => [{ firmwareVersion: "5.0.0-beta.10" }],
  selectApplication: (value) => ({
    installedVersion: value.appCurrentVersion,
    availableVersion: value.availableApp?.tag,
  }),
  selectDevice: (value) => ({ online: value.arduinoOnline }),
  selectOta: (value) => ({
    configured: value.otaConfigured,
    backupConfigured: value.backupStoreConfigured,
  }),
  now: () => "2026-08-15T05:00:00Z",
});

const ready = await readyController.checkBoth();
assert.equal(ready.status, "ready");
for (const key of ["application", "firmware", "device", "ota"]) {
  assert.equal(ready.sources[key].status, "ready");
}

let failedSharedCalls = 0;
const partialController = createUpdateCenterRefreshController({
  initialState: ready,
  refreshStatus: async () => {
    failedSharedCalls += 1;
    throw new Error("device-offline");
  },
  refreshFirmwareCatalog: async () => [{ firmwareVersion: "5.0.0-beta.11" }],
  selectApplication: (value) => value,
  selectDevice: (value) => value,
  selectOta: (value) => value,
  now: () => "2026-08-15T05:01:00Z",
});

const partial = await partialController.checkBoth();
assert.equal(failedSharedCalls, 1);
assert.equal(partial.status, "partial-error");
assert.equal(partial.sources.firmware.status, "ready");
for (const key of ["application", "device", "ota"]) {
  assert.equal(partial.sources[key].status, "error");
  assert.deepEqual(partial.sources[key].data, ready.sources[key].data);
}

const catalogFailureController = createUpdateCenterRefreshController({
  initialState: ready,
  refreshStatus: async () => status,
  refreshFirmwareCatalog: async () => {
    throw new Error("catalog-offline");
  },
  selectApplication: (value) => value,
  selectDevice: (value) => value,
  selectOta: (value) => value,
  now: () => "2026-08-15T05:02:00Z",
});

const catalogPartial = await catalogFailureController.checkBoth();
assert.equal(catalogPartial.status, "partial-error");
assert.equal(catalogPartial.sources.firmware.status, "error");
assert.deepEqual(
  catalogPartial.sources.firmware.data,
  ready.sources.firmware.data,
);
for (const key of ["application", "device", "ota"]) {
  assert.equal(catalogPartial.sources[key].status, "ready");
}

console.log("BETA3_CHECK_BOTH_SHARED_STATUS_DEDUP=PASSED");
console.log("BETA3_CHECK_BOTH_FIRMWARE_CATALOG_INDEPENDENT=PASSED");
console.log("BETA3_CHECK_BOTH_PARTIAL_FAILURE_ISOLATION=PASSED");
console.log("BETA3_CHECK_BOTH_LAST_GOOD_PRESERVED=PASSED");
console.log("BETA3_UPDATE_CENTER_SHARED_REFRESH_ORCHESTRATION=PASSED");


let runtimeStatusCalls = 0;
let runtimeCatalogCalls = 0;
const runtimeOk = await runUpdateCenterCheckBoth({
  refreshStatus: async () => {
    runtimeStatusCalls += 1;
  },
  refreshFirmwareCatalog: async () => {
    runtimeCatalogCalls += 1;
  },
});
assert.equal(runtimeStatusCalls, 1);
assert.equal(runtimeCatalogCalls, 1);
assert.equal(runtimeOk.partialFailure, false);

const runtimePartial = await runUpdateCenterCheckBoth({
  refreshStatus: async () => {
    throw new Error("status-failed");
  },
  refreshFirmwareCatalog: async () => "catalog-ok",
});
assert.equal(runtimePartial.status.status, "rejected");
assert.equal(runtimePartial.firmwareCatalog.status, "fulfilled");
assert.equal(runtimePartial.partialFailure, true);

console.log("BETA3_CHECK_BOTH_RUNTIME_SINGLE_TRIGGER=PASSED");
console.log("BETA3_CHECK_BOTH_RUNTIME_PARTIAL_SETTLEMENT=PASSED");
