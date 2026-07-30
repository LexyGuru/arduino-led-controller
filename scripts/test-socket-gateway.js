'use strict';

const assert = require('assert');

const {
  EventBus
} = require(
  '../server/events/event-bus'
);

const {
  SocketBootstrapRegistry
} = require(
  '../server/socket/socket-bootstrap-registry'
);

const {
  SocketGateway
} = require(
  '../server/socket/socket-gateway'
);

class FakeIo {
  constructor() {
    this.handlers =
      new Map();
    this.emitted = [];
  }

  on(
    name,
    handler
  ) {
    this.handlers.set(
      name,
      handler
    );
  }

  emit(
    name,
    payload
  ) {
    this.emitted.push({
      name,
      payload
    });
  }

  connect(socket) {
    this.handlers.get(
      'connection'
    )(socket);
  }
}

class FakeSocket {
  constructor(id) {
    this.id = id;
    this.handlers =
      new Map();
    this.emitted = [];
  }

  on(
    name,
    handler
  ) {
    this.handlers.set(
      name,
      handler
    );
  }

  emit(
    name,
    payload
  ) {
    this.emitted.push({
      name,
      payload
    });
  }

  trigger(
    name,
    ...args
  ) {
    return this.handlers
      .get(name)(
        ...args
      );
  }
}

async function main() {
  const registry =
    new SocketBootstrapRegistry();

  const bus =
    new EventBus();

  const gateway =
    new SocketGateway({
      eventBus:
        bus,
      runtimeProvider: () => ({
        config: {
          service: {
            name:
              'arduino-led-controller',
            version:
              '5.0.0-alpha.1'
          }
        }
      })
    });

  registry.register(
    'gateway',
    (io) =>
      gateway.install(io)
  );

  function fakeSocketIo() {
    return new FakeIo();
  }

  fakeSocketIo.Server =
    class FakeServer {};

  const patched =
    registry.createPatchedFactory(
      fakeSocketIo
    );

  const io = patched();

  assert.strictEqual(
    typeof patched.Server,
    'function'
  );

  const socket =
    new FakeSocket(
      'client-1'
    );

  io.connect(socket);

  assert.strictEqual(
    gateway.getStatus()
      .connectedClients,
    1
  );

  assert.strictEqual(
    socket.emitted[0]
      .name,
    'v5:ready'
  );

  bus.publish(
    'led.updated',
    {
      id: 1
    }
  );

  assert.strictEqual(
    io.emitted.some(
      (entry) =>
        entry.name ===
        'v5:event'
    ),
    true
  );

  let recent = null;

  socket.trigger(
    'v5:events:recent',
    {
      limit: 5
    },
    (response) => {
      recent = response;
    }
  );

  assert.strictEqual(
    Array.isArray(
      recent.events
    ),
    true
  );

  socket.trigger(
    'disconnect',
    'client namespace disconnect'
  );

  assert.strictEqual(
    gateway.getStatus()
      .connectedClients,
    0
  );

  gateway.close();

  console.log(
    'OK: Socket.IO factory-regiszter'
  );
  console.log(
    'OK: V5 realtime eseményközvetítés'
  );
  console.log(
    'OK: Socket.IO kliens- és történetkezelés'
  );
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
