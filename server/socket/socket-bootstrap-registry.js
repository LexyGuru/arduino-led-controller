'use strict';

const DEFAULT_REGISTRY_KEY =
  Symbol.for(
    'arduino-led-controller.socket-bootstrap-registry'
  );

const DEFAULT_PATCH_KEY =
  Symbol.for(
    'arduino-led-controller.socket-factory-patched'
  );

function copyProperties(
  target,
  source
) {
  for (
    const key
    of Reflect.ownKeys(source)
  ) {
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
      // Platformfüggő tulajdonság.
    }
  }

  Object.assign(
    target,
    source
  );
}

class SocketBootstrapRegistry {
  constructor() {
    this.installers =
      new Map();
  }

  register(
    name,
    installer
  ) {
    const normalizedName =
      String(name || '')
        .trim();

    if (!normalizedName) {
      throw new TypeError(
        'A Socket.IO installer neve kötelező.'
      );
    }

    if (
      typeof installer !==
      'function'
    ) {
      throw new TypeError(
        `A Socket.IO installer nem függvény: ${normalizedName}`
      );
    }

    if (
      this.installers.has(
        normalizedName
      )
    ) {
      throw new Error(
        `A Socket.IO installer már regisztrálva van: ${normalizedName}`
      );
    }

    this.installers.set(
      normalizedName,
      installer
    );

    return this;
  }

  apply(io) {
    for (
      const [
        name,
        installer
      ] of this.installers
        .entries()
    ) {
      try {
        installer(io);
      } catch (error) {
        error.message =
          `Socket.IO installer hiba (${name}): ${error.message}`;

        throw error;
      }
    }

    return io;
  }

  createPatchedFactory(
    originalSocketIo
  ) {
    if (
      typeof originalSocketIo !==
      'function'
    ) {
      throw new TypeError(
        'Az eredeti Socket.IO factory nem függvény.'
      );
    }

    const registry = this;

    function patchedSocketIo(
      ...args
    ) {
      const io =
        originalSocketIo(
          ...args
        );

      registry.apply(io);

      return io;
    }

    copyProperties(
      patchedSocketIo,
      originalSocketIo
    );

    return patchedSocketIo;
  }
}

function getDefaultRegistry() {
  if (
    !globalThis[
      DEFAULT_REGISTRY_KEY
    ]
  ) {
    globalThis[
      DEFAULT_REGISTRY_KEY
    ] =
      new SocketBootstrapRegistry();
  }

  return globalThis[
    DEFAULT_REGISTRY_KEY
  ];
}

function registerSocketInstaller(
  name,
  installer
) {
  getDefaultRegistry()
    .register(
      name,
      installer
    );
}

function installSocketFactoryPatch() {
  if (
    globalThis[
      DEFAULT_PATCH_KEY
    ]
  ) {
    return;
  }

  const modulePath =
    require.resolve(
      'socket.io'
    );

  const originalSocketIo =
    require(modulePath);

  const patched =
    getDefaultRegistry()
      .createPatchedFactory(
        originalSocketIo
      );

  const cacheEntry =
    require.cache[modulePath];

  if (!cacheEntry) {
    throw new Error(
      'A Socket.IO modul gyorsítótár-bejegyzése nem található.'
    );
  }

  cacheEntry.exports = patched;

  globalThis[
    DEFAULT_PATCH_KEY
  ] = true;
}

function resetSocketRegistryForTests() {
  delete globalThis[
    DEFAULT_REGISTRY_KEY
  ];

  delete globalThis[
    DEFAULT_PATCH_KEY
  ];
}

module.exports = {
  SocketBootstrapRegistry,
  copyProperties,
  getDefaultRegistry,
  installSocketFactoryPatch,
  registerSocketInstaller,
  resetSocketRegistryForTests
};
