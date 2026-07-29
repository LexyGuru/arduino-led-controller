'use strict';

const LIFECYCLE_STATES = Object.freeze({
  STARTING: 'starting',
  READY: 'ready',
  DRAINING: 'draining',
  STOPPED: 'stopped'
});

class LifecycleManager {
  constructor({
    clock = () => new Date()
  } = {}) {
    this.clock = clock;
    this.state = LIFECYCLE_STATES.STARTING;
    this.startedAt = this.clock().toISOString();
    this.readyAt = null;
    this.drainingAt = null;
    this.stoppedAt = null;
    this.reason = null;
  }

  markReady() {
    if (
      this.state === LIFECYCLE_STATES.DRAINING ||
      this.state === LIFECYCLE_STATES.STOPPED
    ) {
      return this.snapshot();
    }

    this.state = LIFECYCLE_STATES.READY;
    this.readyAt = this.clock().toISOString();
    return this.snapshot();
  }

  beginDrain(reason = 'shutdown') {
    if (this.state === LIFECYCLE_STATES.STOPPED) {
      return this.snapshot();
    }

    if (this.state !== LIFECYCLE_STATES.DRAINING) {
      this.state = LIFECYCLE_STATES.DRAINING;
      this.drainingAt = this.clock().toISOString();
      this.reason = String(reason || 'shutdown');
    }

    return this.snapshot();
  }

  markStopped(reason = this.reason || 'shutdown') {
    this.state = LIFECYCLE_STATES.STOPPED;
    this.stoppedAt = this.clock().toISOString();
    this.reason = String(reason || 'shutdown');
    return this.snapshot();
  }

  isReady() {
    return this.state === LIFECYCLE_STATES.READY;
  }

  isDraining() {
    return this.state === LIFECYCLE_STATES.DRAINING;
  }

  snapshot() {
    return {
      state: this.state,
      ready: this.isReady(),
      draining: this.isDraining(),
      startedAt: this.startedAt,
      readyAt: this.readyAt,
      drainingAt: this.drainingAt,
      stoppedAt: this.stoppedAt,
      reason: this.reason
    };
  }
}

module.exports = {
  LIFECYCLE_STATES,
  LifecycleManager
};
