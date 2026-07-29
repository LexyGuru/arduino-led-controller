'use strict';

const crypto = require('crypto');
const {
  EventEmitter
} = require('events');

const EVENT_BUS_ALL =
  Symbol.for(
    'arduino-led-controller.event-bus-all'
  );

function normalizeTopic(value) {
  const topic =
    String(value || '')
      .trim()
      .toLowerCase();

  if (
    !/^[a-z0-9][a-z0-9._-]{1,95}$/
      .test(topic)
  ) {
    throw new TypeError(
      'Az eseménytéma formátuma érvénytelen.'
    );
  }

  return topic;
}

function positiveInteger(
  value,
  fallback,
  maximum
) {
  const parsed =
    Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1
  ) {
    return fallback;
  }

  return Math.min(
    parsed,
    maximum
  );
}

class EventBus {
  constructor({
    historyLimit = 200,
    logger = null
  } = {}) {
    this.emitter =
      new EventEmitter();

    this.emitter.setMaxListeners(
      100
    );

    this.historyLimit =
      positiveInteger(
        historyLimit,
        200,
        2000
      );

    this.logger = logger;
    this.history = [];
    this.publishedCount = 0;
  }

  publish(
    topic,
    payload = {},
    meta = {}
  ) {
    const normalizedTopic =
      normalizeTopic(topic);

    const event =
      Object.freeze({
        id:
          crypto.randomUUID(),
        topic:
          normalizedTopic,
        timestamp:
          new Date()
            .toISOString(),
        payload:
          payload &&
          typeof payload ===
            'object'
            ? payload
            : {
                value:
                  payload
              },
        meta:
          meta &&
          typeof meta ===
            'object'
            ? meta
            : {}
      });

    this.history.push(event);

    if (
      this.history.length >
      this.historyLimit
    ) {
      this.history.splice(
        0,
        this.history.length -
          this.historyLimit
      );
    }

    this.publishedCount += 1;

    this.emitter.emit(
      normalizedTopic,
      event
    );

    this.emitter.emit(
      EVENT_BUS_ALL,
      event
    );

    return event;
  }

  subscribe(
    topic,
    listener
  ) {
    const normalizedTopic =
      normalizeTopic(topic);

    this.emitter.on(
      normalizedTopic,
      listener
    );

    return () => {
      this.emitter.off(
        normalizedTopic,
        listener
      );
    };
  }

  subscribeAll(listener) {
    this.emitter.on(
      EVENT_BUS_ALL,
      listener
    );

    return () => {
      this.emitter.off(
        EVENT_BUS_ALL,
        listener
      );
    };
  }

  recent({
    limit = 50,
    topic = null
  } = {}) {
    const normalizedLimit =
      positiveInteger(
        limit,
        50,
        this.historyLimit
      );

    const normalizedTopic =
      topic
        ? normalizeTopic(topic)
        : null;

    const source =
      normalizedTopic
        ? this.history.filter(
            (event) =>
              event.topic ===
              normalizedTopic
          )
        : this.history;

    return source.slice(
      -normalizedLimit
    );
  }

  stats() {
    return {
      publishedCount:
        this.publishedCount,
      storedEvents:
        this.history.length,
      historyLimit:
        this.historyLimit,
      topics:
        [
          ...new Set(
            this.history.map(
              (event) =>
                event.topic
            )
          )
        ].sort()
    };
  }
}

module.exports = {
  EVENT_BUS_ALL,
  EventBus,
  normalizeTopic,
  positiveInteger
};
