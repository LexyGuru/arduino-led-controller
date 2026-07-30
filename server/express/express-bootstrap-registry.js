'use strict';

const DEFAULT_REGISTRY_KEY = Symbol.for(
  'arduino-led-controller.express-bootstrap-registry'
);

const DEFAULT_PATCH_KEY = Symbol.for(
  'arduino-led-controller.express-factory-patched'
);

function copyExpressProperties(target, source) {
  for (const key of Reflect.ownKeys(source)) {
    if (
      key === 'length' ||
      key === 'name' ||
      key === 'prototype' ||
      key === 'arguments' ||
      key === 'caller'
    ) {
      continue;
    }

    const descriptor =
      Object.getOwnPropertyDescriptor(
        source,
        key
      );

    if (!descriptor) continue;

    try {
      Object.defineProperty(
        target,
        key,
        descriptor
      );
    } catch (_) {
      // Egyes beépített függvénytulajdonságok
      // nem definiálhatók újra minden platformon.
    }
  }

  Object.assign(target, source);
}

class ExpressBootstrapRegistry {
  constructor() {
    this.installers = new Map();
  }

  register(name, installer) {
    const normalizedName =
      String(name || '').trim();

    if (!normalizedName) {
      throw new TypeError(
        'Az Express installer neve kötelező.'
      );
    }

    if (typeof installer !== 'function') {
      throw new TypeError(
        `Az Express installer nem függvény: ${normalizedName}`
      );
    }

    if (this.installers.has(normalizedName)) {
      throw new Error(
        `Az Express installer már regisztrálva van: ${normalizedName}`
      );
    }

    this.installers.set(
      normalizedName,
      installer
    );

    return this;
  }

  list() {
    return Array.from(
      this.installers.entries()
    ).map(([name, installer]) => ({
      name,
      installer
    }));
  }

  apply(app) {
    for (
      const [name, installer]
      of this.installers.entries()
    ) {
      try {
        installer(app);
      } catch (error) {
        error.message =
          `Express installer hiba (${name}): ${error.message}`;
        throw error;
      }
    }

    return app;
  }

  createPatchedFactory(originalExpress) {
    if (typeof originalExpress !== 'function') {
      throw new TypeError(
        'Az eredeti Express factory nem függvény.'
      );
    }

    const registry = this;

    function patchedExpress(...args) {
      const app = originalExpress(...args);
      registry.apply(app);
      return app;
    }

    copyExpressProperties(
      patchedExpress,
      originalExpress
    );

    return patchedExpress;
  }
}

function getDefaultRegistry() {
  if (!globalThis[DEFAULT_REGISTRY_KEY]) {
    globalThis[DEFAULT_REGISTRY_KEY] =
      new ExpressBootstrapRegistry();
  }

  return globalThis[DEFAULT_REGISTRY_KEY];
}

function registerExpressInstaller(
  name,
  installer
) {
  getDefaultRegistry().register(
    name,
    installer
  );
}

function installExpressFactoryPatch() {
  if (globalThis[DEFAULT_PATCH_KEY]) {
    return;
  }

  const expressModulePath =
    require.resolve('express');

  const originalExpress =
    require(expressModulePath);

  const patchedExpress =
    getDefaultRegistry()
      .createPatchedFactory(
        originalExpress
      );

  const cacheEntry =
    require.cache[expressModulePath];

  if (!cacheEntry) {
    throw new Error(
      'Az Express modul gyorsítótár-bejegyzése nem található.'
    );
  }

  cacheEntry.exports = patchedExpress;
  globalThis[DEFAULT_PATCH_KEY] = true;
}

function resetDefaultRegistryForTests() {
  delete globalThis[DEFAULT_REGISTRY_KEY];
  delete globalThis[DEFAULT_PATCH_KEY];
}

module.exports = {
  ExpressBootstrapRegistry,
  copyExpressProperties,
  getDefaultRegistry,
  installExpressFactoryPatch,
  registerExpressInstaller,
  resetDefaultRegistryForTests
};
