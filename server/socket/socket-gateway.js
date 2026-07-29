'use strict';

const {
  EVENT_TOPICS
} = require('../events/topics');

class SocketGateway {
  constructor({
    eventBus,
    runtimeProvider,
    logger = null,
    recentLimit = 25
  } = {}) {
    if (
      !eventBus ||
      typeof eventBus.subscribeAll !==
        'function'
    ) {
      throw new TypeError(
        'A SocketGateway számára EventBus szükséges.'
      );
    }

    if (
      typeof runtimeProvider !==
      'function'
    ) {
      throw new TypeError(
        'A SocketGateway számára runtimeProvider szükséges.'
      );
    }

    this.eventBus =
      eventBus;
    this.runtimeProvider =
      runtimeProvider;
    this.logger = logger;
    this.recentLimit =
      Math.max(
        1,
        Math.min(
          100,
          Number(recentLimit) ||
          25
        )
      );

    this.io = null;
    this.clients =
      new Set();
    this.unsubscribe = null;
  }

  install(io) {
    if (!io) {
      throw new TypeError(
        'A SocketGateway számára Socket.IO példány szükséges.'
      );
    }

    if (this.io === io) {
      return this;
    }

    this.io = io;

    this.unsubscribe?.();

    this.unsubscribe =
      this.eventBus
        .subscribeAll(
          (event) => {
            io.emit(
              'v5:event',
              event
            );

            io.emit(
              event.topic,
              event
            );
          }
        );

    io.on(
      'connection',
      (socket) => {
        this.clients.add(
          socket.id
        );

        const runtime =
          this.runtimeProvider();

        socket.emit(
          'v5:ready',
          {
            service:
              runtime.config
                .service.name,
            version:
              runtime.config
                .service.version,
            connectedAt:
              new Date()
                .toISOString(),
            events:
              this.eventBus
                .recent({
                  limit:
                    this.recentLimit
                })
          }
        );

        socket.on(
          'v5:events:recent',
          (
            request = {},
            acknowledge
          ) => {
            const response = {
              events:
                this.eventBus
                  .recent({
                    limit:
                      request.limit,
                    topic:
                      request.topic
                  }),
              stats:
                this.eventBus
                  .stats()
            };

            if (
              typeof acknowledge ===
              'function'
            ) {
              acknowledge(response);
            } else {
              socket.emit(
                'v5:events:recent',
                response
              );
            }
          }
        );

        this.eventBus.publish(
          EVENT_TOPICS
            .SOCKET_CONNECTED,
          {
            clientId:
              socket.id,
            connectedClients:
              this.clients.size
          }
        );

        socket.on(
          'disconnect',
          (reason) => {
            this.clients.delete(
              socket.id
            );

            this.eventBus.publish(
              EVENT_TOPICS
                .SOCKET_DISCONNECTED,
              {
                clientId:
                  socket.id,
                reason:
                  String(
                    reason || ''
                  ),
                connectedClients:
                  this.clients.size
              }
            );
          }
        );
      }
    );

    return this;
  }

  getStatus() {
    return {
      installed:
        Boolean(this.io),
      connectedClients:
        this.clients.size,
      recentLimit:
        this.recentLimit
    };
  }

  close({
    timeoutMs = 5000
  } = {}) {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.clients.clear();

    const io =
      this.io;

    this.io = null;

    if (
      !io ||
      typeof io.close !==
        'function'
    ) {
      return Promise.resolve({
        closed: false,
        reason:
          'NOT_INSTALLED'
      });
    }

    return new Promise((resolve) => {
      let settled = false;

      const finish = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      };

      const timer =
        setTimeout(
          () =>
            finish({
              closed: false,
              timedOut: true
            }),
          Math.max(
            250,
            Number(timeoutMs) ||
            5000
          )
        );

      timer.unref?.();

      try {
        io.close(() => {
          finish({
            closed: true,
            timedOut: false
          });
        });
      } catch (error) {
        finish({
          closed: false,
          timedOut: false,
          error:
            error.message
        });
      }
    });
  }
}

module.exports = {
  SocketGateway
};
