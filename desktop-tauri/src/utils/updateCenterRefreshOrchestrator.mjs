import {
  createInitialUpdateCenterState,
  createRefreshingUpdateCenterState,
  refreshUpdateCenter,
} from "./updateCenterCore.mjs";

function asLoader(value) {
  return typeof value === "function" ? value : null;
}

function projectStatus(status, selector) {
  return typeof selector === "function" ? selector(status) : status;
}

export function createUpdateCenterSharedLoaders({
  refreshStatus,
  refreshFirmwareCatalog,
  selectApplication,
  selectDevice,
  selectOta,
} = {}) {
  const statusLoader = asLoader(refreshStatus);
  const catalogLoader = asLoader(refreshFirmwareCatalog);
  let sharedStatusPromise = null;

  const loadStatusOnce = () => {
    if (!statusLoader) {
      return Promise.reject(new Error("update-center-status-loader-missing"));
    }
    if (!sharedStatusPromise) {
      sharedStatusPromise = Promise.resolve().then(() => statusLoader());
    }
    return sharedStatusPromise;
  };

  return {
    application: async () =>
      projectStatus(await loadStatusOnce(), selectApplication),
    firmware: catalogLoader ? async () => catalogLoader() : undefined,
    device: async () =>
      projectStatus(await loadStatusOnce(), selectDevice),
    ota: async () =>
      projectStatus(await loadStatusOnce(), selectOta),
  };
}

export function createUpdateCenterRefreshController({
  refreshStatus,
  refreshFirmwareCatalog,
  selectApplication,
  selectDevice,
  selectOta,
  now,
  initialState = createInitialUpdateCenterState(),
} = {}) {
  let state = initialState;

  return {
    getState() {
      return state;
    },

    async checkBoth() {
      const previousState = state;
      state = createRefreshingUpdateCenterState(previousState);

      state = await refreshUpdateCenter(
        createUpdateCenterSharedLoaders({
          refreshStatus,
          refreshFirmwareCatalog,
          selectApplication,
          selectDevice,
          selectOta,
        }),
        previousState,
        now,
      );
      return state;
    },
  };
}


export async function runUpdateCenterCheckBoth({
  refreshStatus,
  refreshFirmwareCatalog,
} = {}) {
  const statusTask =
    typeof refreshStatus === "function"
      ? Promise.resolve().then(() => refreshStatus())
      : Promise.resolve(undefined);

  const catalogTask =
    typeof refreshFirmwareCatalog === "function"
      ? Promise.resolve().then(() => refreshFirmwareCatalog())
      : Promise.resolve(undefined);

  const [status, firmwareCatalog] =
    await Promise.allSettled([statusTask, catalogTask]);

  return Object.freeze({
    status,
    firmwareCatalog,
    partialFailure:
      status.status === "rejected" ||
      firmwareCatalog.status === "rejected",
  });
}
