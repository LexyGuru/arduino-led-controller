export interface UpdateCenterSharedLoaderOptions {
  refreshStatus?: () => unknown | Promise<unknown>;
  refreshFirmwareCatalog?: () => unknown | Promise<unknown>;
  selectApplication?: (status: unknown) => unknown;
  selectDevice?: (status: unknown) => unknown;
  selectOta?: (status: unknown) => unknown;
}

export function createUpdateCenterSharedLoaders(
  options?: UpdateCenterSharedLoaderOptions
): {
  application: () => Promise<unknown>;
  firmware?: () => Promise<unknown>;
  device: () => Promise<unknown>;
  ota: () => Promise<unknown>;
};

export function createUpdateCenterRefreshController(
  options?: UpdateCenterSharedLoaderOptions & {
    now?: () => string;
    initialState?: unknown;
  }
): {
  getState(): unknown;
  checkBoth(): Promise<unknown>;
};


export function runUpdateCenterCheckBoth(options?: {
  refreshStatus?: () => unknown | Promise<unknown>;
  refreshFirmwareCatalog?: () => unknown | Promise<unknown>;
}): Promise<Readonly<{
  status: PromiseSettledResult<unknown>;
  firmwareCatalog: PromiseSettledResult<unknown>;
  partialFailure: boolean;
}>>;
